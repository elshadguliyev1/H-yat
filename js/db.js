/* Storage layer (IndexedDB) — the only file that knows how lives are persisted.
   Stores (db "heyat-db"):
     meta          key -> value               (active life id, migration markers)
     lives         id  -> {id, name, g, age, alive, dream, updated, data}   one document per active/finished life
     event_history [lifeId, seq] -> {lifeId, seq, day, age, event, choice, result}
     archive       id  -> completed-life summary + epilogue (read-only after death)
   Schema changes go into MIGRATIONS (one function per version). If IndexedDB is unavailable (some private modes)
   everything falls back to an in-memory store mirrored to localStorage so the game still runs. */
"use strict";

const DB = (() => {
  const NAME = "heyat-db", VERSION = 1;
  const MIGRATIONS = {
    1(db) {
      db.createObjectStore("meta");
      const lives = db.createObjectStore("lives", { keyPath: "id" });
      lives.createIndex("updated", "updated");
      const h = db.createObjectStore("event_history", { keyPath: ["lifeId", "seq"] });
      h.createIndex("lifeId", "lifeId");
      db.createObjectStore("archive", { keyPath: "id" });
    }
    // 2(db, tx) { ... } — next schema version goes here
  };
  let db = null, fallback = null;

  function open() {
    return new Promise(resolve => {
      if (typeof indexedDB === "undefined") return resolve(useFallback());
      let req;
      try { req = indexedDB.open(NAME, VERSION); } catch (e) { return resolve(useFallback()); }
      req.onupgradeneeded = ev => { const d = req.result; for (let v = ev.oldVersion + 1; v <= VERSION; v++) MIGRATIONS[v](d, req.transaction); };
      req.onsuccess = () => { db = req.result; resolve(true); };
      req.onerror = () => resolve(useFallback());
      req.onblocked = () => resolve(useFallback());
    });
  }
  function useFallback() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("heyat-fallback-db") || "{}"); } catch (e) {}
    fallback = Object.assign({ meta: {}, lives: {}, event_history: {}, archive: {} }, saved);
    return false;
  }
  function persistFallback() { try { localStorage.setItem("heyat-fallback-db", JSON.stringify(fallback)); } catch (e) {} }
  const keyOf = (store, v) => store === "event_history" ? v.lifeId + "|" + v.seq : v.id;

  function tx(store, mode, fn) {
    if (fallback) {
      const s = fallback[store];
      const api = {
        put(v, k) { s[k != null ? k : keyOf(store, v)] = v; },
        get(k) { return s[Array.isArray(k) ? k.join("|") : k]; },
        del(k) { delete s[k]; },
        all() { return Object.values(s); }
      };
      const r = fn(api); if (mode === "readwrite") persistFallback(); return Promise.resolve(r);
    }
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, mode); const os = t.objectStore(store); let out;
      const api = {
        put(v, k) { k != null ? os.put(v, k) : os.put(v); },
        get(k) { return new Promise(r => { const q = os.get(k); q.onsuccess = () => r(q.result); q.onerror = () => r(undefined); }); },
        del(k) { os.delete(k); },
        all() { return new Promise(r => { const q = os.getAll(); q.onsuccess = () => r(q.result || []); q.onerror = () => r([]); }); },
        byIndex(ix, v) { return new Promise(r => { const q = os.index(ix).getAll(v); q.onsuccess = () => r(q.result || []); q.onerror = () => r([]); }); }
      };
      Promise.resolve(fn(api)).then(v => { out = v; });
      t.oncomplete = () => resolve(out); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
    });
  }

  // ---- public API ----
  const card = L => ({ id: L.id, name: L.name, g: L.g, age: L.age, alive: L.alive, dream: L.dream, updated: Date.now(), data: L });
  let pending = null, timer = null;
  function saveLife(L, now) {
    pending = JSON.parse(JSON.stringify(L));
    clearTimeout(timer);
    if (now) return flush();
    timer = setTimeout(flush, 250);
    return Promise.resolve();
  }
  function flush() { clearTimeout(timer); if (!pending) return Promise.resolve(); const L = pending; pending = null; return tx("lives", "readwrite", s => s.put(card(L))).catch(() => {}); }
  if (typeof addEventListener !== "undefined") { addEventListener("pagehide", flush); addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); }); }

  return {
    open, flush, saveLife,
    get usingFallback() { return !!fallback; },
    async listLives() { const all = await tx("lives", "readonly", s => s.all()); return all.map(x => ({ id: x.id, name: x.name, g: x.g, age: x.age, alive: x.alive, dream: x.dream, updated: x.updated })).sort((a, b) => b.updated - a.updated); },
    async loadLife(id) { const x = await tx("lives", "readonly", s => s.get(id)); return x ? x.data : null; },
    deleteLife(id) { return tx("lives", "readwrite", s => s.del(id)); },
    addHistory(row) { return tx("event_history", "readwrite", s => s.put(row)).catch(() => {}); },
    async history(lifeId) { return tx("event_history", "readonly", s => s.byIndex ? s.byIndex("lifeId", lifeId) : s.all().filter(r => r.lifeId === lifeId)); },
    archive(entry) { return tx("archive", "readwrite", s => s.put(entry)); },
    async listArchive() { const a = await tx("archive", "readonly", s => s.all()); return a.sort((x, y) => (y.when || 0) - (x.when || 0)); },
    getMeta(k) { return tx("meta", "readonly", s => s.get(k)); },
    setMeta(k, v) { return tx("meta", "readwrite", s => s.put(v, k)); },
    // one-time import of the V0.1 localStorage save + past-lives list
    async importLegacy(migrateLife) {
      if (await this.getMeta("legacyImported")) return null;
      let imported = null;
      try {
        const old = JSON.parse(localStorage.getItem("heyat-save-v1") || "null");
        if (old && old.name) { const L = migrateLife(old); await tx("lives", "readwrite", s => s.put(card(L))); imported = L.id; }
        const lives = JSON.parse(localStorage.getItem("heyat-lives") || "[]");
        for (const [i, l] of lives.entries()) await this.archive(Object.assign({ id: "legacy-" + i + "-" + (l.when || i) }, l, { legacy: true }));
      } catch (e) {}
      await this.setMeta("legacyImported", Date.now());
      return imported;
    }
  };
})();
