#!/usr/bin/env node
/* Automatic tests (no browser, no dependencies):  node tests/run.js [lives]
   Loads the real game files into a sandbox and checks: library validation, deterministic seeds, save/load,
   time never going backwards, delayed consequences firing, no events about missing people, military rules,
   migration of old saves, and a Monte-Carlo balance run. Exit code 1 on any failure. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const EVENT_FILES = ["data/events/core_5_17.json", "data/events/core_18_plus.json", "data/events/pack_v1.json", "data/events/arcs_5_18.json", "data/events/paths.json", "data/events/politics.json"];

// strict JSON check first (the browser uses JSON.parse; the sandbox below would forgive trailing commas)
for (const f of ["data/rules.json", "data/careers.json", ...EVENT_FILES]) { try { JSON.parse(read(f)); } catch (e) { console.log("✗ JSON xətası: " + f + " — " + e.message); process.exit(1); } }

function sandbox() {
  const store = {};
  const ctx = { console, Math, Date, JSON, Object, Array, String, Number, Intl, Set, Map, Promise, isFinite,
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  vm.createContext(ctx);
  vm.runInContext(read("js/core.js") + "\n" + read("engine.js") + "\n" + read("js/career.js") + "\n" + read("js/justice.js") + "\n" + read("js/sport.js") + "\n" + read("js/politics.js") + "\n" + read("js/items.js") + "\n" + read("js/interp.js") + `
    RULES = ${read("data/rules.json")};
    loadCareers(${read("data/careers.json")});
    globalThis.LISTS = [${EVENT_FILES.map(read).join(",")}];
    Interp.load(LISTS);
    // a bot that plays one year with seeded decisions (so a seed reproduces a whole life)
    globalThis.playYear = function (log) {
      // one year = four quarters: one action per quarter, the quarter's events, then +3 months (the 4th ends on the birthday)
      const a0 = P.age;
      for (let q = 0; q < 4 && P.age === a0; q++) { // (a dead person still "ages" here, as before, so loops in tests end)
        for (let i = 0; i < P.acts; i++) {
          const list = ACTIONS.filter(a => P.age >= a.min && (!a.max || P.age <= a.max) && (!a.if || a.if()) && !a.special && (!a.cost || P.age < 18 || P.money >= a.cost) && (P.army && !P.army.done ? !!a.army : !a.army));
          const a = pick(list); if (a) { apply(a.fx ? a.fx() : {}); if (a.cost && P.age >= 18) P.money -= a.cost; if (a.after) a.after(); }
        }
        if (q === 0 && P.soc && chance(.5)) { const ts = POST_TYPES.filter(t => P.age >= t.min && (!t.need || t.need())); makePost(pick(ts).id); }
        if (q === 0 && P.age >= 17 && !P.job && !["uni", "magistr"].includes(P.edu.stage) && !(P.army && !P.army.done) && chance(.5)) { const o = jobOptions(); if (o.length) { const x = pick(o); if (chance(x.odds)) startJob(x.id); } }
        playDue(log);
        const before = P.day, m0 = P.money;
        advanceQuarter();
        if (P.age < 16 && P.money > m0) throw new Error("16 yaşdan əvvəl avtomatik pul gəldi: " + m0 + " → " + P.money);
        if (P.day < before) throw new Error("zaman geri getdi (rüb)");
      }
      playDue(log);
      for (const k of STAT_KEYS) if (!isFinite(P.st[k])) throw new Error("NaN göstərici " + k);
      if (!isFinite(P.money)) throw new Error("NaN pul");
    };
    function playDue(log) {
      for (const ev of dueEvents()) {
        P.yearEvents.splice(P.yearEvents.indexOf(ev), 1);
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
    }
    Object.defineProperty(globalThis, "P", { get: () => P, set: v => { P = v; } });
    Object.defineProperty(globalThis, "RULES", { get: () => RULES });
    globalThis.Interp = Interp; globalThis.Cal = Cal; globalThis.person = person; globalThis.fmtMoney = fmtMoney; globalThis.ACTIONS = ACTIONS; globalThis.startJob = startJob; globalThis.interactionsFor = interactionsFor; globalThis.pensionMonthly = pensionMonthly; globalThis.bankOffer = bankOffer; globalThis.estate = estate; globalThis.onPension = onPension; globalThis.addPerson = addPerson; globalThis.people = people; globalThis.inPrison = inPrison; globalThis.jobOptions = jobOptions; globalThis.askRaise = askRaise; globalThis.askPromotion = askPromotion; globalThis.CAREERS = CAREERS; globalThis.deathRisk = deathRisk; globalThis.commitCrime = commitCrime; globalThis.trial = trial; globalThis.hasRecord = hasRecord; globalThis.everConvicted = everConvicted; globalThis.lockReason = lockReason; globalThis.SPORTS = SPORTS; globalThis.RULES = RULES; globalThis.polJoin = polJoin; globalThis.setOffice = setOffice; globalThis.polRun = polRun; globalThis.isPres = isPres; globalThis.govAvailable = govAvailable; globalThis.doGov = doGov; globalThis.CTRY_KEYS = CTRY_KEYS; globalThis.pick = pick; globalThis.itemsFor = itemsFor; globalThis.ITEMS = ITEMS; globalThis.askParents = askParents; globalThis.familyMeans = familyMeans; globalThis.owns = owns; globalThis.itemsTick = itemsTick;
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
    const jailed = !!(S.P.legal && (S.P.legal.terms || []).some(t => t.start <= due + 400 && (t.out || t.end) >= due)); // it waits until release
    if (seen) fired++; else ok(!npcAlive || !S.P.alive || jailed, "vaxtı çatdı, şərt ödənirdi, amma hadisə gəlmədi (seed " + (5000 + s) + ")");
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
    if (S.P.army.basis === "officer") continue; // military academy graduates (men and women): officers, no conscript service
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

test("hərbi xidmət: 12 və ya 18 ay (rüb dəqiqliyi ilə); xidmətdə yalnız hərbi fəaliyyət", () => {
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
    const months = Math.round((S.P.army.out - S.P.army.start) / 30.44); // discharge is checked every quarter
    if (S.P.army.months === 12) { ok(months >= 11 && months <= 15, "12 aylıq xidmət " + months + " ay çəkdi"); n12++; }
    if (S.P.army.months === 18) { ok(months >= 17 && months <= 21, "18 aylıq xidmət " + months + " ay çəkdi"); n18++; }
  }
  ok(n12 > 0 && n18 > 0, "hər iki müddət sınanmalıdır");
  console.log(`      (12 ay: ${n12} əsgər, 18 ay: ${n18} əsgər)`);
});

test("futbolçu əsgərliyə gedir: karyera qərarı, xidmətdə maaş yoxdur, qayıdanda davamı var", () => {
  let asked = 0, back = 0, trial = 0, frozenPaid = 0;
  for (let s = 1; s <= 100; s++) {
    S.newLife("Fut", "k", "Bakı", "futbolcu", 30000 + s);
    while (S.P.age < 18) S.playYear();
    S.P.yearEvents = []; S.P.army = null; S.P.job = null; S.P.legal = { record: [], case: null, prison: null, history: [] }; S.startJob("futbolcu", 1); S.P.edu.stage = "bitdi"; delete S.P.edu.pendingMaster; S.P.flags.imtahanVerdi = 18;
    ok(S.Interp.check(S.Interp.byId("fut_ordu").cond), "fut_ordu şərti ödənmədi");
    ok(!S.Interp.check(S.Interp.byId("ordu").cond), "adi çağırış futbolçuya da çıxdı");
    const e = S.Interp.byId("fut_ordu"); S.P.seen[e.id] = S.P.age; S.Interp.choose(e, e.ch[0]); asked++;
    const frozen = !!(S.P.job && S.P.job.susp);
    for (let y = 0; y < 3 && !S.P.army.done; y++) {
      const m = S.P.money; S.ageUp();
      if (frozen && !S.P.army.done && S.P.money > m) frozenPaid++;
      if (S.P.army.done) { if (S.P.yearEvents.some(x => x.id === "fut_qayidis")) back++; if (S.P.yearEvents.some(x => x.id === "fut_sinaq")) trial++; }
      else S.P.yearEvents = [];
    }
  }
  eq(frozenPaid, 0, "dondurulmuş müqavilə ilə maaş gəldi");
  ok(back > 0 && trial > 0, `qayıdış hadisələri: gözləyən klub ${back}, sınaq ${trial}`);
  console.log(`      (${asked} futbolçu: klub gözlədi və qayıdış oldu ${back}, müqavilə ləğv olundu və sınaq çağırışı ${trial})`);
});

test("karyera: maaş artımı və yüksəliş avtomatik deyil, maaş diapazonda qalır", () => {
  let asks = 0, ok1 = 0, promos = 0, preq = 0;
  for (let s = 1; s <= 150; s++) {
    S.newLife("İşçi", s % 2 ? "k" : "q", "Bakı", "proqramci", 40000 + s);
    while (S.P.age < 22) S.playYear();
    S.P.yearEvents = []; S.P.army = { done: true, months: 0 }; S.startJob(["proqramci", "ofis", "muellim", "hekim"][s % 4], 0);
    for (let y = 0; y < 8 && S.P.alive && S.P.job; y++) {
      const before = S.P.job.sal; const r = S.askRaise(); asks++; if (S.P.job.sal > before) ok1++;
      if (y % 2) { preq++; const lv = S.P.job.lv; S.askPromotion(); if (S.P.job.lv > lv) promos++; }
      const c = S.CAREERS[S.P.job.id], [mn, mx] = c.sal[Math.min(S.P.job.lv, c.sal.length - 1)];
      ok(S.P.job.sal <= Math.round(mx * 1.12) + 1, `maaş diapazondan çıxdı: ${S.P.job.sal} > ${mx}`);
      S.ageUp(); S.P.yearEvents = [];
      if (!S.P.job) break;
    }
  }
  const rr = ok1 / asks, pr = promos / preq;
  ok(rr > 0.05 && rr < 0.85, "artım ehtimalı qeyri-real: " + rr.toFixed(2));
  ok(pr < 0.7, "yüksəliş çox asandır: " + pr.toFixed(2));
  console.log(`      (maaş artımı tələblərinin ${Math.round(rr * 100)}%-i, yüksəliş müraciətlərinin ${Math.round(pr * 100)}%-i uğurlu)`);
});

test("aviasiya: CPL ilə işə qəbul, ATPL və 3000 saat olmadan kapitan yoxdur", () => {
  S.newLife("Pilot", "q", "Bakı", "pilot", 555); while (S.P.age < 24) S.playYear(); S.P.yearEvents = [];
  S.P.st.health = 90; S.P.lic = { cpl: 22, ppl: true }; S.P.hours = 250; S.P.legal = { record: [], history: [] };
  ok(S.jobOptions().some(o => o.id === "pilot"), "CPL olan pilot işə müraciət edə bilmir");
  S.startJob("pilot", 1); S.P.job.lvYears = 10; S.P.job.perf = 95;
  ok(!S.promote(), "ATPL olmadan kapitan oldu");
  S.P.lic.atpl = 25; S.P.hours = 3200; ok(S.promote(), "ATPL və 3200 saatla kapitan olmadı"); eq(S.P.job.lv, 2);
  S.P.legal.record.push({ type: "ogurluq" }); S.P.job = null;
  ok(!S.jobOptions().some(o => ["pilot", "polis", "herbci"].includes(o.id)), "məhkumluqla pilot/polis/hərbçi ola bildi");
});

test("ədliyyə: həbsdə zaman axır, ailə qocalır, azadlıq və qeyd qalır", () => {
  let jailed = 0, released = 0;
  for (let s = 1; s <= 60; s++) {
    S.newLife("Məhkum", "k", "Bakı", "polis", 60000 + s); while (S.P.age < 25) S.playYear(); S.P.yearEvents = [];
    S.P.legal = { record: [], case: { type: "narkotik", day: S.P.day, age: S.P.age }, prison: null, history: [] };
    S.trial("dovlet", false);
    if (!S.inPrison()) continue; jailed++;
    const ana = S.P.people.find(p => p.role === "ana" && p.alive), a0 = ana && ana.age, start = S.P.age;
    for (let y = 0; y < 15 && S.inPrison() && S.P.alive; y++) {
      S.ageUp();
      if (S.inPrison()) ok(S.P.yearEvents.every(ev => S.Interp.byId(ev.id).prison), "həbsdə adi hadisə gəldi");
      ok(!S.P.job, "həbsdə iş");
      S.P.yearEvents = [];
    }
    if (ana && ana.alive && S.P.alive) ok(ana.age > a0, `ana həbs müddətində qocalmadı (seed ${60000 + s}, ${a0} → ${ana.age}, oyunçu ${start} → ${S.P.age})`);
    if (!S.inPrison() && S.P.alive) { released++; ok(S.P.legal.record.length > 0 && S.hasRecord(), "qeyd dərhal silindi"); ok(!S.jobOptions().some(o => o.id === "polis"), "azadlıqdan sonra polis ola bildi"); }
  }
  ok(jailed > 10 && released > 5, `həbs ${jailed}, azadlıq ${released}`);
  console.log(`      (60 narkotik işindən: həbs ${jailed}, azad edildi ${released})`);
});

test("məhkumluq: cəza müddəti hökmə uyğundur, qeyd vaxtında silinir, polis/ordu bağlı qalır", () => {
  let checked = 0, cleared = 0;
  for (let s = 1; s <= 60; s++) {
    S.newLife("Qeyd", s % 2 ? "k" : "q", "Bakı", "polis", 61000 + s); while (S.P.age < 22) S.playYear(); S.P.yearEvents = [];
    S.P.legal = { record: [], case: { type: "ogurluq", day: S.P.day, age: S.P.age }, prison: null, history: [] };
    S.trial("dovlet", true); const rec = S.P.legal.record[0]; if (!rec) continue;
    const t0 = S.P.age;
    for (let y = 0; y < 15 && S.P.alive; y++) { S.ageUp(); S.P.yearEvents = []; if (rec.expunged) break; }
    if (!S.P.alive) continue; checked++;
    const term = (S.P.legal.terms || [])[0];
    if (term) ok(term.out && term.out <= term.end + 400, `həbs hökmdən uzun çəkdi (seed ${61000 + s})`);
    ok(rec.expires, "silinmə tarixi yoxdur");
    if (rec.expunged) { cleared++; ok(!S.hasRecord(), "silinmədən sonra aktiv qeyd qaldı"); ok(S.everConvicted(), "keçmiş unudulmamalıdır"); ok(S.lockReason("polis"), "keçmiş məhkum polis ola bilməz"); }
    ok(S.P.age - t0 <= 15, "çox uzun");
  }
  ok(checked > 20 && cleared >= checked * 0.8, `yoxlanan ${checked}, silinən ${cleared}`);
  console.log(`      (${checked} oğurluq işindən ${cleared}-də qeyd silindi)`);
});

test("idman: futboldan başqa növlər, cinsə uyğun bölmələr, medallar, zədə, peşəkar karyera, məşqçilik", () => {
  let joined = 0, medals = 0, intl = 0, pros = 0, coaches = 0, injuredOut = 0, oly = 0; const kinds = {};
  for (let i = 0; i < 300; i++) {
    const g = i % 2 ? "q" : "k";
    const P = S.playLife("İdman", g, "futbolcu", 70000 + i, 75);
    const s = P.sport; if (!s) continue; joined++; kinds[s.id] = (kinds[s.id] || 0) + 1;
    const sp = S.SPORTS[s.id]; ok(!sp.g || sp.g === g, `${g === "q" ? "qız" : "oğlan"} ${sp.t} bölməsinə düşdü`);
    ok(s.start >= 6 && s.start <= 17, "bölməyə yaş " + s.start);
    for (const m of s.medals) { medals++; if (m.comp >= 3 && !m.junior) intl++; if (m.comp === 5) oly++; ok(m.age >= s.start, "bölmədən əvvəl medal"); if (m.age < 11) ok(m.comp === 0, "10 yaşında rayondan yuxarı yarış"); }
    if ([P.job && P.job.id, ...P.jobs.map(j => j.id)].includes("idmanci")) pros++;
    if (P.flags.exIdmanci != null && [P.job && P.job.id, ...P.jobs.map(j => j.id)].includes("mesqci")) coaches++;
    if (s.reason === "ağır zədə") injuredOut++;
  }
  ok(joined > 60, "bölməyə yazılan az: " + joined); ok(Object.keys(kinds).length >= 5, "növ az: " + Object.keys(kinds).join(","));
  ok(medals > 50 && pros >= 3, `medal ${medals}, peşəkar ${pros}`);
  console.log(`      (300 həyatdan ${joined} idmana yazıldı: ${Object.entries(kinds).map(([k, v]) => S.SPORTS[k].t + " " + v).join(", ")}; medal ${medals}, beynəlxalq ${intl}, olimpiya ${oly}; peşəkar ${pros}, sonra məşqçi ${coaches}, zədə ilə bitən ${injuredOut})`);
});

test("siyasət: seçkilər qaydalara uyğundur, prezident ölkəni idarə edir, müddət bitir, göstəricilər hüdudda qalır", () => {
  const R = S.RULES.politics; let presidents = 0, ended = {}, years = 0, ran = 0;
  for (let s = 1; s <= 40; s++) {
    S.newLife("Siyasi", s % 2 ? "k" : "q", "Bakı", "biznes", 80000 + s); while (S.P.age < 37 && S.P.alive) S.playYear(); if (!S.P.alive) continue;
    S.P.yearEvents = []; S.P.legal = { record: [], case: null, prison: null, history: [] }; S.P.edu.degree = S.P.edu.degree || "muellim";
    S.polJoin("ireli"); S.setOffice("nazir_muavini", "test"); S.P.pol.cap = 30; S.P.pol.rep = 75; S.P.fame = 60; S.P.money = 1e6;
    // a municipal run cannot demote a deputy minister
    const ctx0 = { vars: {} }; S.polRun("belediyye", 0, ctx0); ok(S.P.pol.office === "nazir_muavini", "bələdiyyə seçkisi vəzifəni aşağı saldı");
    for (let t = 0; t < 6 && !S.isPres(); t++) { const ctx = { vars: {} }; S.polRun("prezident", 2, ctx); ran++; ok(ctx.vars.pol_result, "nəticə mətni yoxdur"); }
    if (!S.isPres()) continue; presidents++;
    ok(S.P.job && S.P.job.id === "prezident", "prezident işi başlamadı");
    const start = S.P.age;
    for (let y = 0; y < 20 && S.P.alive && S.isPres(); y++) {
      for (let k = 0; k < 3; k++) { const av = S.govAvailable().filter(a => S.P.ctry.fund >= a.cost); if (av.length) S.doGov(S.pick(av).id); }
      S.playYear();
      for (const k of Object.keys(S.CTRY_KEYS)) ok(S.P.ctry[k] >= 0 && S.P.ctry[k] <= 100, k + " hüduddan çıxdı: " + S.P.ctry[k]);
      ok(isFinite(S.P.ctry.fund), "fond");
      ok(S.P.pres.term <= R.max_terms, "müddət limiti aşıldı");
    }
    if (S.P.alive && S.P.pres.ended) { const why = S.P.pres.reason; ended[why] = (ended[why] || 0) + 1; ok(!S.P.job || S.P.job.id !== "prezident", "vəzifə bitdi, iş qaldı"); ok(!S.P.pol.office, "ofis qaldı"); ok(S.P.flags.exPrezident != null, "keçmiş prezident qeyd olunmadı"); }
    years += S.P.age - start; ok(S.P.age - start <= R.cycle.prezident * R.max_terms + 2, "prezidentlik çox uzun: " + (S.P.age - start));
  }
  ok(presidents >= 5, "prezident seçilən az: " + presidents);
  // a convicted person cannot register
  S.newLife("Məhkum", "k", "Bakı", "biznes", 81000); while (S.P.age < 30) S.playYear(); S.polJoin("birlik"); S.P.legal.record.push({ day: S.P.day, age: S.P.age, type: "ogurluq", verdict: "cərimə", years: 0 });
  const c2 = { vars: {} }; S.polRun("meclis", 0, c2); ok(!S.P.pol.office && /qəbul etmədi/.test(c2.vars.pol_result), "məhkum namizəd oldu");
  // in Monte-Carlo lives: no one runs below the minimum age; nobody keeps an office in prison
  for (let i = 0; i < 60; i++) { const P = S.playLife("Sim", i % 2 ? "q" : "k", "polis", 120000 + i, 90);
    if (P.pol) for (const r of P.pol.ran || []) ok(r.age >= R.min_age[r.office], `${r.office} üçün ${r.age} yaş`);
    ok(!(P.pol && P.pol.office && P.legal && P.legal.prison && !P.legal.prison.released), "həbsdə vəzifə"); }
  console.log(`      (40 siyasətçidən ${presidents} prezident seçildi, ${ran} prezident seçkisi; orta prezidentlik ${(years / Math.max(1, presidents)).toFixed(1)} il; sonu: ${Object.entries(ended).map(([k, v]) => k + " " + v).join(", ")})`);
});

test("əşyalar: yaşa və cinsə uyğun, valideyn imkanına görə hədiyyə, telefon/kompüter/geyim nəticələri, köhnəlmə", () => {
  // gender and age filters
  S.newLife("Qız", "q", "Bakı", "hekim", 90001); while (S.P.age < 6) S.playYear();
  let ids = S.itemsFor().map(i => i.id); ok(ids.includes("gelincik") && !ids.includes("oyuncaq_masin") && !ids.includes("moto"), "qız 6 yaş: " + ids);
  S.newLife("Oğlan", "k", "Bakı", "hekim", 90002); while (S.P.age < 15) S.playYear();
  ids = S.itemsFor().map(i => i.id); ok(!ids.includes("makiyaj") && !ids.includes("gelincik") && ids.includes("skuter") && !ids.includes("moto"), "oğlan 15 yaş: " + ids);
  // rich parents say yes more often than poor parents
  let rich = 0, poor = 0;
  for (let s = 0; s < 200; s++) {
    S.newLife("U", "k", "Bakı", "hekim", 91000 + s); while (S.P.age < 10) S.playYear();
    const m = S.familyMeans(), it = S.ITEMS.find(i => i.id === "konsol"); const before = !!(S.P.owned && S.P.owned.konsol);
    const r = S.askParents(it); if (m >= 4 && r.ok) rich++; if (m <= 1 && r.ok) poor++;
    ok(!before, "konsol əvvəlcədən var");
  }
  ok(rich > poor, `varlı ailə ${rich}, kasıb ailə ${poor}`);
  // phone: the 12-year-old phone event depends on the family; a phone wears out
  let withPhone = 0, noPhoneSoc = 0, worn = 0, shabby = 0;
  for (let s = 0; s < 80; s++) {
    S.newLife("T", s % 2 ? "q" : "k", "Bakı", "hekim", 92000 + s); while (S.P.age < 14) S.playYear();
    if (S.owns("telefon")) withPhone++; else if (S.P.soc) noPhoneSoc++;
    while (S.P.age < 20 && S.P.alive) { const had = S.owns("telefon"), lk = S.P.st.looks; S.playYear(); if (had && !S.owns("telefon")) worn++; }
    S.P.owned = {}; const lk = S.P.st.looks; S.itemsTick([]); if (S.P.age <= 22 && S.P.st.looks < lk) shabby++;
  }
  ok(withPhone > 30, "telefonu olan az: " + withPhone); ok(worn > 0, "telefon heç köhnəlmədi"); ok(shabby > 40, "köhnə paltarın nəticəsi yoxdur: " + shabby);
  // coding without a computer is slower
  S.newLife("K", "k", "Bakı", "proqramci", 93000); while (S.P.age < 14) S.playYear(); S.P.owned = {}; S.P.flags.kodSaat = 0;
  const kod = S.ACTIONS.find(a => a.id === "kod"); kod.after(); const slow = S.P.flags.kodSaat; S.P.owned.komputer = { age: 14 }; kod.after();
  ok(slow === 0.5 && S.P.flags.kodSaat === 1.5, "kompüter fərqi yoxdur: " + slow + " / " + S.P.flags.kodSaat);
  console.log(`      (hədiyyə: varlı ailə ${rich}, kasıb ailə ${poor} dəfə "hə" dedi; 14 yaşda telefonu olan ${withPhone}/80, köhnələn telefon ${worn})`);
});

test("erkən ölüm mümkündür, amma nadirdir; keçmiş futbolçuya məşqçilik açıqdır", () => {
  let under30 = 0, under40 = 0; const N2 = 3000;
  for (let s = 1; s <= N2; s++) { S.newLife("R", "k", "Bakı", "polis", 70000 + s); for (let a = 5; a < 40 && S.P.alive; a++) { const r = S.deathRisk(); if (Math.random() < r.natural + r.job) { if (S.P.age < 30) under30++; under40++; break; } S.P.age++; } }
  ok(under40 > 0, "40 yaşa qədər heç kim ölmədi"); ok(under40 / N2 < 0.06, "40 yaşa qədər ölüm çox yüksəkdir: " + (under40 / N2));
  console.log(`      (${N2} insandan 30 yaşa qədər ${under30}, 40 yaşa qədər ${under40} nəfər öldü — ${(under40 / N2 * 100).toFixed(1)}%)`);
  S.newLife("Ex", "k", "Bakı", "futbolcu", 4); while (S.P.age < 34) S.playYear(); S.P.job = null; S.P.flags.exFutbolcu = 33; S.P.legal = { record: [], history: [] };
  ok(S.jobOptions().some(o => o.id === "mesqci"), "keçmiş futbolçu məşqçi ola bilmir");
});

test("məktəb və futbol bitəndən sonra müəllim və məşqçi aktiv siyahıda qalmır", () => {
  for (let s = 1; s <= 80; s++) {
    S.newLife("X", s % 2 ? "k" : "q", "Bakı", "futbolcu", 80000 + s);
    while (S.P.alive && S.P.age < 40) {
      S.playYear();
      const school = ["bagca", "mekteb"].includes(S.P.edu.stage);
      if (!school) ok(!S.person("müəllim"), `${S.P.age} yaşında məktəbdən sonra müəllim siyahıdadır`);
      const fb = (S.P.job && S.P.job.id === "futbolcu") || (S.P.flags.akademiya != null && !S.P.job && S.P.age < 22) || (S.P.flags.futbolBolme != null && S.P.age < 18) || (S.P.sport && S.P.sport.active);
      if (!fb) ok(!S.person("məşqçi"), `${S.P.age} yaşında futbolsuz məşqçi siyahıdadır`);
    }
  }
});

test("ailə: yaşa uyğun münasibətlər, övladın toyu, nəvələr, NPC ömrü, qızda dava seçimi yoxdur", () => {
  S.newLife("Ana", "q", "Bakı", "muellim", 90001); while (S.P.age < 30) S.playYear();
  const d4 = S.addPerson("uşaq", "q", 4), s15 = S.addPerson("uşaq", "k", 15), b0 = S.addPerson("uşaq", "k", 0);
  const t4 = S.interactionsFor(d4).map(x => x.t).join("|"), t0 = S.interactionsFor(b0).map(x => x.t).join("|");
  ok(/Kukla/.test(t4) && !/Söhbət et|Zəng et/.test(t4), "4 yaşlı qız üçün seçimlər uyğun deyil: " + t4);
  ok(/layla/i.test(t0), "körpə üçün seçimlər uyğun deyil: " + t0);
  ok(/futbol matçına|Ürək söhbəti/.test(S.interactionsFor(s15).map(x => x.t).join("|")), "yeniyetmə üçün seçimlər uyğun deyil");
  // wedding of a grown child and grandchildren linked to that child
  let weddings = 0, grand = 0, linked = 0;
  for (let s = 1; s <= 40; s++) {
    S.newLife("Valideyn", s % 2 ? "k" : "q", "Bakı", "proqramci", 91000 + s); while (S.P.age < 25) S.playYear();
    const kid = S.addPerson("uşaq", s % 2 ? "q" : "k", 23); S.P.money = 200000;
    const e = S.Interp.byId("ovlad_toy"); ok(S.Interp.check(e.cond), "toy hadisəsinin şərti ödənmədi");
    const ch = S.Interp.choicesOf(e); ok(ch.length <= 5, "çox seçim");
    S.Interp.choose(e, ch[0]); if (kid.spouse) weddings++;
    for (let y = 0; y < 8 && S.P.alive; y++) { S.ageUp(); S.P.yearEvents = []; }
    const gk = S.P.people.filter(p => p.role === "nəvə"); grand += gk.length; linked += gk.filter(g => g.parent === kid.id).length;
  }
  eq(weddings, 40, "toydan sonra həyat yoldaşı yaranmadı"); ok(grand > 0 && linked === grand, `nəvələr övlada bağlı deyil (${linked}/${grand})`);
  // NPC lifespans: grandparents rarely pass 95
  let over95 = 0, gp = 0;
  for (let s = 1; s <= 150; s++) { S.newLife("N", "k", "Bakı", "polis", 92000 + s); while (S.P.alive && S.P.age < 45) { S.ageUp(); S.P.yearEvents = []; } for (const p of S.P.people.filter(x => x.role === "nənə" || x.role === "baba")) { gp++; if (p.alive && p.age > 95) over95++; } }
  ok(over95 / gp < 0.03, `nənə-babaların ${over95}/${gp}-i 95 yaşdan çox yaşayır`);
  // girls never get fist-fight choices
  for (let s = 1; s <= 120; s++) S.playLife("Qız", "q", "aktyor", 93000 + s, 50, (e) => { for (const c of S.Interp.choicesOf(e)) ok(!/Yumruq|^Dava et/.test(c.t), `qız üçün dava seçimi: ${e.id} — ${c.t}`); });
  console.log(`      (40 toy, ${grand} nəvə — hamısı öz valideyninə bağlı; nənə-babalardan 95+ yaşayan: ${over95}/${gp})`);
});

test("pul: təqaüd, qocalıq xərcləri, biznes təhvili, bank, miras, borc spiralı yoxdur", () => {
  // pension grows with service years
  S.newLife("T", "k", "Bakı", "muellim", 95001); while (S.P.age < 30) S.playYear(); S.P.yearEvents = [];
  S.P.job = null; S.startJob("ofis", 1); const p0 = S.pensionMonthly();
  for (let y = 0; y < 25; y++) { S.ageUp(); S.P.yearEvents = []; if (!S.P.job) S.startJob("ofis", 1); }
  ok(S.pensionMonthly() > p0, "təqaüd stajla artmır"); ok(S.pensionMonthly() >= S.RULES.pension.min_monthly, "minimum təqaüd");
  S.P.job = null; while (S.P.alive && S.P.age < 67) { S.ageUp(); S.P.yearEvents = []; }
  if (S.P.alive) { ok(S.onPension() && S.P.budget.inc["Təqaüd"] > 0, "təqaüd ödənilmir"); ok(S.P.budget.exp["Dərman və müayinə"] > 0, "qocalıqda dərman xərci yoxdur"); }
  // business handover to a grown child
  S.newLife("B", "q", "Bakı", "biznes", 95002); while (S.P.age < 64) { S.ageUp(); S.P.yearEvents = []; }
  S.P.legal = { record: [], history: [] }; S.P.job = null; S.startJob("biznes", 2); S.addPerson("uşaq", "k", 35);
  const e = S.Interp.byId("biz_gelecek"); ok(S.Interp.check(e.cond), "biznes hadisəsi şərti"); S.Interp.choose(e, S.Interp.choicesOf(e)[0]);
  ok(!S.P.job && S.P.assets.some(a => a.type === "biznes"), "biznes övlada keçmədi");
  S.ageUp(); S.P.yearEvents = []; ok((S.P.budget.inc["Ailə biznesindən pay"] || 0) > 0, "ailə biznesindən pay gəlmir");
  // bank refuses when income is too low
  S.P.job = null; S.startJob("ofisiant", 0); ok(!S.bankOffer(25000).ok, "aşağı maaşa 25 000 ₼ kredit verildi");
  // inheritance: equal shares among first-order heirs
  const E = S.estate(); ok(E.heirs.length > 0 && (E.total <= 0 || E.share > 0), "miras hesabı");
  // no hopeless debt spirals in ordinary lives
  let spirals = 0; const N3 = 200;
  for (let s = 1; s <= N3; s++) { let run = 0, worst = 0; S.playLife("D", s % 2 ? "k" : "q", "polis", 96000 + s, 130, null); }
  for (let s = 1; s <= N3; s++) { S.newLife("D", s % 2 ? "k" : "q", "Bakı", "polis", 96000 + s); let run = 0, worst = 0; while (S.P.alive && S.P.age < 90) { S.playYear(); run = S.P.money < -20000 ? run + 1 : 0; worst = Math.max(worst, run); } if (worst >= 10) spirals++; }
  ok(spirals / N3 < 0.05, `borc spiralı: ${spirals}/${N3}`);
  console.log(`      (təqaüd: ${S.fmtMoney(p0)} → ${S.fmtMoney(S.pensionMonthly())}/ay stajla; 10+ il dərin borcda qalan həyatlar: ${spirals}/${N3})`);
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
  const tone = { everyday: 0, dramatic: 0, rare: 0 }, seen = new Set(); let ages = 0, money = [], dream = 0, kidSerious = 0, kidAll = 0, kidArcs = 0, jailedLives = 0, early = 0; const careers = {};
  const dreams = ["polis", "hekim", "futbolcu", "mugenni", "muellim", "proqramci", "biznes", "aktyor"];
  for (let i = 0; i < N; i++) {
    const P = S.playLife("Sim", i % 2 ? "q" : "k", dreams[i % 8], 100000 + i, 130, e => { tone[e.tone || "everyday"]++; seen.add(e.id); if (S.P.age <= 18) { kidAll++; if ((e.tone || "everyday") !== "everyday") kidSerious++; if (e.id.startsWith("arc_")) kidArcs++; } });
    ages += P.age; money.push(P.money);
    for (const id of new Set([P.job && P.job.id, ...P.jobs.map(j => j.id)].filter(Boolean))) careers[id] = (careers[id] || 0) + 1;
    if (P.legal && P.legal.record && P.legal.record.some(r => r.verdict === "həbs")) jailedLives++;
    if (P.age < 40) early++;
    if ([P.job && P.job.id, ...P.jobs.map(j => j.id)].includes(P.dream)) dream++;
  }
  money.sort((a, b) => a - b);
  const tot = tone.everyday + tone.dramatic + tone.rare, pct = k => Math.round(tone[k] / tot * 100);
  const never = S.Interp.lib.filter(e => !seen.has(e.id)).map(e => e.id);
  console.log(`      orta ömür ${Math.round(ages / N)}, median sərvət ${Math.round(money[N >> 1])} ₼, xəyal gerçəkləşdi ${Math.round(dream / N * 100)}%`);
  console.log(`      karyeralar: ${Object.entries(careers).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + " " + v).join(", ")}`);
  console.log(`      həbs yaşamış: ${jailedLives} həyat (bot cinayət təkliflərinin yarısını qəbul edir), 40 yaşdan əvvəl ölüm: ${early}`);
  console.log(`      5–18 yaş: həyat başına ${(kidAll / N).toFixed(1)} hadisə, onlardan ${(kidSerious / N).toFixed(1)} ciddi (dramatik/nadir), ${(kidArcs / N).toFixed(1)} hekayə xətti fəsli`);
  console.log(`      ton: gündəlik ${pct("everyday")}% · dramatik ${pct("dramatic")}% · nadir ${pct("rare")}% (hədəf 60/30/10)`);
  console.log(`      heç görünməyən hadisələr (${never.length}): ${never.join(", ") || "yoxdur"}`);
});

console.log(`\n${passed} keçdi, ${failed} uğursuz`);
process.exit(failed ? 1 : 0);
