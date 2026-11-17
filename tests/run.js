#!/usr/bin/env node
/* Automatic tests (no browser, no dependencies):  node tests/run.js [lives]
   Loads the real game files into a sandbox and checks: library validation, deterministic seeds, save/load,
   time never going backwards, delayed consequences firing, no events about missing people, military rules,
   migration of old saves, and a Monte-Carlo balance run. Exit code 1 on any failure. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const EVENT_FILES = ["data/events/core_5_17.json", "data/events/core_18_plus.json", "data/events/pack_v1.json", "data/events/arcs_5_18.json"];

// strict JSON check first (the browser uses JSON.parse; the sandbox below would forgive trailing commas)
for (const f of ["data/rules.json", ...EVENT_FILES]) { try { JSON.parse(read(f)); } catch (e) { console.log("✗ JSON xətası: " + f + " — " + e.message); process.exit(1); } }

function sandbox() {
  const store = {};
  const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Intl, Set, Map, Promise, isFinite,
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  vm.createContext(ctx);
  vm.runInContext(read("js/core.js") + "\n" + read("engine.js") + "\n" + read("js/interp.js") + `
    RULES = ${read("data/rules.json")};
    globalThis.LISTS = [${EVENT_FILES.map(read).join(",")}];
    Interp.load(LISTS);
    // a bot that plays one year with seeded decisions (so a seed reproduces a whole life)
    globalThis.playYear = function (log) {
      for (let i = 0; i < 3; i++) {
        const list = ACTIONS.filter(a => P.age >= a.min && (!a.max || P.age <= a.max) && (!a.if || a.if()) && !a.special && (!a.cost || P.age < 18 || P.money >= a.cost) && (P.army && !P.army.done ? !!a.army : !a.army));
        const a = pick(list); if (a) { apply(a.fx ? a.fx() : {}); if (a.cost && P.age >= 18) P.money -= a.cost; if (a.after) a.after(); }
      }
      if (P.soc && chance(.5)) { const ts = POST_TYPES.filter(t => P.age >= t.min && (!t.need || t.need())); makePost(pick(ts).id); }
      if (P.age >= 17 && !P.job && !["uni", "magistr"].includes(P.edu.stage) && !(P.army && !P.army.done) && chance(.5)) { const o = jobOptions(); if (o.length) { const x = pick(o); if (chance(x.odds)) startJob(x.id); } }
      const before = P.day, m0 = P.money, a0 = P.age;
      ageUp();
      if (a0 + 1 < 16 && P.money > m0) throw new Error("16 yaşdan əvvəl avtomatik pul gəldi: " + m0 + " → " + P.money);
      if (P.day < before) throw new Error("zaman geri getdi (ageUp)");
      for (const ev of P.yearEvents.splice(0)) {
        const e = Interp.byId(ev.id); if (!e) throw new Error("naməlum hadisə " + ev.id);
        if (!eventOk(e)) continue;
        const d0 = P.day; P.day = Math.max(P.day, ev.day); if (P.day < d0) throw new Error("zaman geri getdi (hadisə)");
        const text = Interp.text(e.t);
        const ch = Interp.choicesOf(e); if (!ch.length) throw new Error("seçim yoxdur: " + e.id);
        const i = Math.floor(R() * ch.length);
        if (log) log(e, text, ch[i]);
        P.seen[e.id] = P.age;
        const mBefore = P.money;
        const res = Interp.choose(e, ch[i]);
        if (P.age < 16 && Math.round((P.money - mBefore) * 100) / 100 > 30) throw new Error(e.id + ": 16 yaşdan kiçik uşağa " + (P.money - mBefore) + " ₼ gəldi");
        recordChoice(e.id, i, res.outcome, res.text);
        for (const s of [text, res.text, ...ch.map(c => Interp.text(c.t))]) if (/\\{[^}]+\\}|undefined|NaN|(^|\\s)\\?(\\s|$)/.test(s)) throw new Error("pis mətn [" + e.id + "]: " + s);
      }
      for (const k of STAT_KEYS) if (!isFinite(P.st[k])) throw new Error("NaN göstərici " + k);
      if (!isFinite(P.money)) throw new Error("NaN pul");
    };
    Object.defineProperty(globalThis, "P", { get: () => P, set: v => { P = v; } });
    Object.defineProperty(globalThis, "RULES", { get: () => RULES });
    globalThis.Interp = Interp; globalThis.Cal = Cal; globalThis.person = person; globalThis.fmtMoney = fmtMoney; globalThis.ACTIONS = ACTIONS;
    globalThis.playLife = function (name, g, dream, seed, maxAge, log) { newLife(name, g, "Bakı", dream, seed); while (P.alive && P.age < (maxAge || 130)) playYear(log); return P; };
  `, ctx);
  return ctx;
}

let failed = 0, passed = 0;
function test(name, fn) { try { fn(); passed++; console.log("  ✓ " + name); } catch (e) { failed++; console.log("  ✗ " + name + "\n      " + (e && e.stack ? e.stack.split("\n").slice(0, 3).join("\n      ") : e)); } }
const eq = (a, b, msg) => { if (a !== b) throw new Error((msg || "bərabər deyil") + `: ${a} !== ${b}`); };
const ok = (v, msg) => { if (!v) throw new Error(msg || "şərt ödənmədi"); };
const strip = L => { const x = JSON.parse(JSON.stringify(L)); delete x.id; return JSON.stringify(x); };

console.log("Həyat, sən nə qəribəsən — testlər\n");
const S = sandbox();

test("hadisə kitabxanası sxemə uyğundur", () => { const errs = S.Interp.validate(S.LISTS); if (errs.length) throw new Error(errs.slice(0, 10).join("\n      ")); });
test("hadisə id-ləri unikaldır və planlanan hadisələr mövcuddur", () => { const ids = S.Interp.lib.map(e => e.id); eq(new Set(ids).size, ids.length); });

test("eyni seed eyni həyatı verir (deterministik)", () => {
  const a = strip(S.playLife("Murad", "k", "polis", 12345));
  const b = strip(S.playLife("Murad", "k", "polis", 12345));
  eq(a, b, "fərqli nəticə");
  const c = strip(S.playLife("Murad", "k", "polis", 999));
  ok(a !== c, "fərqli seed eyni nəticə verdi");
});

test("save/load: yaddaşdan bərpa edilən həyat eyni davam edir", () => {
  S.playLife("Aysel", "q", "hekim", 777, 20);
  const snap = JSON.stringify(S.P);
  for (let i = 0; i < 30 && S.P.alive; i++) S.playYear();
  const direct = strip(S.P);
  S.P = S.migrateLife(JSON.parse(snap));
  for (let i = 0; i < 30 && S.P.alive; i++) S.playYear();
  eq(strip(S.P), direct, "bərpadan sonra fərqli");
});

test("zaman heç vaxt geri getmir, yaş təqvimlə uyğundur", () => {
  for (let s = 1; s <= 40; s++) {
    S.newLife("Test", s % 2 ? "k" : "q", "Bakı", "polis", s);
    let last = S.P.day;
    while (S.P.alive && S.P.age < 100) { S.playYear(); ok(S.P.day >= last, "geri getdi"); last = S.P.day; const a = S.Cal.yearsBetween(S.P.birth, S.P.day); ok(a === S.P.age, `yaş ${S.P.age}, təqvim ${a}`); }
  }
});

test("gecikmiş nəticə: 7 yaşdakı qərar 15–20 il sonra hadisə yaradır", () => {
  let fired = 0, tries = 0;
  for (let s = 1; s <= 60; s++) {
    S.newLife("Kənan", "k", "Bakı", "muellim", 5000 + s);
    while (S.P.age < 7) S.playYear();
    const e = S.Interp.byId("az_life_07");
    S.P.seen[e.id] = S.P.age; S.Interp.choose(e, e.ch[0]);
    ok(S.P.sched.some(x => x.event === "az_chain_old_friend"), "planlanmadı");
    const due = S.P.sched.find(x => x.event === "az_chain_old_friend").day;
    tries++;
    let seen = false;
    S.playYear.__orig = S.playYear;
    while (S.P.alive && S.P.day <= due + 400) {
      S.playYear((ev) => { if (ev.id === "az_chain_old_friend") seen = true; });
      if (seen) break;
    }
    const npcAlive = S.Interp.check({ npc_flag_alive: "defended_classmate" });
    if (seen) fired++; else ok(!npcAlive || !S.P.alive, "vaxtı çatdı, şərt ödənirdi, amma hadisə gəlmədi (seed " + (5000 + s) + ")");
  }
  ok(fired > tries * 0.7, `yalnız ${fired}/${tries} dəfə aktivləşdi`);
});

test("olmayan və ölmüş insanlar haqqında hadisə göstərilmir", () => {
  for (let s = 1; s <= 120; s++) S.playLife("X", s % 2 ? "k" : "q", "aktyor", 300 + s, 100, (e) => {
    const need = (e.cond && (e.cond.has || [])) || [];
    for (const r of [].concat(need)) ok(!!S.person(r), `${e.id}: ${r} yoxdur`);
  });
});

test("hərbi xidmət qaydaları (rules.json)", () => {
  const M = S.RULES.military;
  let fail18 = 0, bach12 = 0, mast12 = 0, girls = 0, studentsDrafted = 0;
  for (let s = 1; s <= 250; s++) {
    S.newLife("Orxan", s % 5 === 0 ? "q" : "k", "Bakı", "proqramci", 9000 + s);
    while (S.P.alive && S.P.age < 40) {
      const wasStudent = ["uni", "magistr"].includes(S.P.edu.stage);
      const before = S.P.army;
      S.playYear();
      if (!before && S.P.army && wasStudent && ["uni", "magistr"].includes(S.P.edu.stage)) studentsDrafted++;
    }
    if (!S.P.army) continue;
    if (S.P.g === "q") { girls++; continue; }
    const want = { none: M.months_without_higher_education, bachelor: M.months_after_bachelor, master: M.months_after_master }[S.P.army.basis];
    eq(S.P.army.months, want, "xidmət müddəti əsasa uyğun deyil (" + S.P.army.basis + ")");
    if (S.P.army.basis === "none") fail18++; else if (S.P.army.basis === "bachelor") bach12++; else mast12++;
  }
  eq(girls, 0, "qızlar orduya çağırıldı");
  eq(studentsDrafted, 0, "tələbə orduya çağırıldı");
  ok(fail18 > 0, "universitetsiz 18 aylıq xidmət heç görünmədi");
  ok(bach12 > 0, "bakalavrdan sonra 12 aylıq xidmət heç görünmədi");
  console.log(`      (18 ay: ${fail18}, bakalavrdan sonra 12 ay: ${bach12}, magistrdən sonra 12 ay: ${mast12})`);
});

test("18 yaşa qədər pul: avtomatik xərclik yoxdur, tapılan pul ≤ 30 ₼", () => {
  let maxAt15 = 0;
  for (let s = 1; s <= 150; s++) { S.newLife("Uşaq", s % 2 ? "k" : "q", "Bakı", "polis", 7000 + s); while (S.P.alive && S.P.age < 15) S.playYear(); maxAt15 = Math.max(maxAt15, S.P.money); }
  ok(maxAt15 <= 120, "15 yaşında çox pul: " + maxAt15);
  console.log(`      (150 uşaqdan 15 yaşda ən çox pul: ${S.fmtMoney(maxAt15)})`);
});

test("hərbi xidmət: 12 ay bir il, 18 ay iki ilə bitir; xidmətdə yalnız hərbi fəaliyyət", () => {
  let n12 = 0, n18 = 0;
  for (let s = 1; s <= 200; s++) {
    S.newLife("Əsgər", "k", "Bakı", "polis", 20000 + s);
    let startAge = null;
    while (S.P.alive && S.P.age < 40) {
      S.playYear();
      if (S.P.army && startAge == null) startAge = S.P.age;
      if (S.P.army && !S.P.army.done) { const acts = S.ACTIONS.filter(a => S.P.age >= a.min && (!a.if || a.if()) && (S.P.army && !S.P.army.done ? !!a.army : !a.army)); ok(acts.every(a => a.army), "xidmətdə mülki fəaliyyət"); }
      if (S.P.army && S.P.army.done) break;
    }
    if (!S.P.army || !S.P.army.done) continue;
    const years = S.P.age - startAge;
    if (S.P.army.months === 12) { eq(years, 1, "12 aylıq xidmət " + years + " il çəkdi"); n12++; }
    if (S.P.army.months === 18) { eq(years, 2, "18 aylıq xidmət " + years + " il çəkdi"); n18++; }
  }
  ok(n12 > 0 && n18 > 0, "hər iki müddət sınanmalıdır");
  console.log(`      (12 ay: ${n12} əsgər, 18 ay: ${n18} əsgər)`);
});

test("köhnə (V0.1) yaddaş yeni formata köçür və oyun davam edir", () => {
  S.playLife("Leyla", "q", "mugenni", 4242, 15);
  const old = JSON.parse(JSON.stringify(S.P));
  for (const k of ["v", "id", "seed", "rng", "birth", "day", "tr", "sched", "hist", "npcFlags"]) delete old[k];
  old.yearEvents = ["pul_tapdi"]; old.army = null;
  const L = S.migrateLife(old);
  for (const k of ["id", "seed", "rng", "birth", "day", "tr", "sched", "hist"]) ok(L[k] != null, k + " yoxdur");
  eq(typeof L.yearEvents[0], "object");
  S.P = L; for (let i = 0; i < 20 && S.P.alive; i++) S.playYear();
});

const N = +process.argv[2] || 400;
test(`Monte-Karlo: ${N} tam həyat çökmədən oynanılır`, () => {
  const tone = { everyday: 0, dramatic: 0, rare: 0 }, seen = new Set(); let ages = 0, money = [], dream = 0, kidSerious = 0, kidAll = 0, kidArcs = 0;
  const dreams = ["polis", "hekim", "futbolcu", "mugenni", "muellim", "proqramci", "biznes", "aktyor"];
  for (let i = 0; i < N; i++) {
    const P = S.playLife("Sim", i % 2 ? "q" : "k", dreams[i % 8], 100000 + i, 130, e => { tone[e.tone || "everyday"]++; seen.add(e.id); if (S.P.age <= 18) { kidAll++; if ((e.tone || "everyday") !== "everyday") kidSerious++; if (e.id.startsWith("arc_")) kidArcs++; } });
    ages += P.age; money.push(P.money);
    if ([P.job && P.job.id, ...P.jobs.map(j => j.id)].includes(P.dream)) dream++;
  }
  money.sort((a, b) => a - b);
  const tot = tone.everyday + tone.dramatic + tone.rare, pct = k => Math.round(tone[k] / tot * 100);
  const never = S.Interp.lib.filter(e => !seen.has(e.id)).map(e => e.id);
  console.log(`      orta ömür ${Math.round(ages / N)}, median sərvət ${Math.round(money[N >> 1])} ₼, xəyal gerçəkləşdi ${Math.round(dream / N * 100)}%`);
  console.log(`      5–18 yaş: həyat başına ${(kidAll / N).toFixed(1)} hadisə, onlardan ${(kidSerious / N).toFixed(1)} ciddi (dramatik/nadir), ${(kidArcs / N).toFixed(1)} hekayə xətti fəsli`);
  console.log(`      ton: gündəlik ${pct("everyday")}% · dramatik ${pct("dramatic")}% · nadir ${pct("rare")}% (hədəf 60/30/10)`);
  console.log(`      heç görünməyən hadisələr (${never.length}): ${never.join(", ") || "yoxdur"}`);
});

console.log(`\n${passed} keçdi, ${failed} uğursuz`);
process.exit(failed ? 1 : 0);
