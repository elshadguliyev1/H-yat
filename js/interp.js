/* Event interpreter: JSON events → typed conditions, effects, delayed consequences.
   Event format (data/events/*.json, see docs/HADISE_FORMATI.md):
     { id, cat, tone: "everyday"|"dramatic"|"rare", age:[min,max], icon, visual, t, w, priority, force,
       once (default true) | cool (years between repeats), scheduled_only, cond:{…}, ch:[choice…] | choices_gen }
     choice: { t, cond, fx:{stat deltas…}, do:[actions…], r, odds:[{p, fx, do, r}…] }
   Everything is validated by Interp.validate(); unknown condition keys, actions or text variables are errors. */
"use strict";

const Interp = (() => {
  const num = v => typeof v === "number" && isFinite(v);
  const parentAlive = () => ["ana", "ata"].map(r => person(r)).filter(Boolean);

  // ---------------- conditions ----------------
  const C = {
    gender: v => P.g === v,
    stage: v => [].concat(v).includes(P.edu.stage),
    stage_not: v => ![].concat(v).includes(P.edu.stage),
    // a frozen (suspended) job counts as "no active job"
    job: v => { const j = P.job && !P.job.susp ? P.job : null; return v === true ? !!j : v === false ? !j : !!j && [].concat(v).includes(j.id); },
    job_not: v => !P.job || P.job.susp || ![].concat(v).includes(P.job.id),
    job_susp: v => !!P.job && !!P.job.susp && [].concat(v).includes(P.job.id),
    job_lv_gte: v => !!P.job && !P.job.susp && P.job.lv >= v,
    job_lv_lt: v => !!P.job && !P.job.susp && P.job.lv < v,
    job_perf_gt: v => !!P.job && !P.job.susp && P.job.perf > v,
    stat_gt: o => Object.entries(o).every(([k, v]) => P.st[k] > v),
    stat_lt: o => Object.entries(o).every(([k, v]) => P.st[k] < v),
    tal_gt: o => Object.entries(o).every(([k, v]) => P.tal[k] > v),
    trait_gt: o => Object.entries(o).every(([k, v]) => (P.tr[k] || 0) > v),
    trait_lt: o => Object.entries(o).every(([k, v]) => (P.tr[k] || 0) < v),
    money_gt: v => P.money > v,
    money_gte: v => P.money >= v,
    money_lt: v => P.money < v,
    fame_gt: v => P.fame > v,
    followers_gte: v => !!P.soc && P.soc.followers >= v,
    social: v => !!P.soc === v,
    flag: v => [].concat(v).every(f => P.flags[f] != null),
    no_flag: v => [].concat(v).every(f => P.flags[f] == null),
    flag_since_gte: o => Object.entries(o).every(([f, y]) => P.flags[f] != null && P.age - P.flags[f] >= y),
    has: v => [].concat(v).every(r => !!person(r)),
    has_any: v => [].concat(v).some(r => !!person(r)),
    has_not: v => [].concat(v).every(r => !person(r)),
    rel_gt: o => Object.entries(o).every(([r, v]) => !!person(r) && person(r).rel > v),
    count_lt: o => Object.entries(o).every(([r, v]) => people(r).length < v),
    kid_age_eq: v => people("uşaq").some(k => k.age === v),
    kid_age_gte: v => people("uşaq").some(k => k.age >= v),
    parent_age_gt: v => parentAlive().some(p => p.age > v),
    parent_died_last_year: v => P.people.some(p => ["ana", "ata"].includes(p.role) && !p.alive && p.died === P.age - 1) === v,
    faculty: v => P.edu.fac === v && ["uni", "magistr"].includes(P.edu.stage),
    legal_case: v => !!(P.legal && P.legal.case) === v,
    in_prison: v => inPrison() === v,
    record: v => hasRecord() === v,
    track: v => !!P.job && !P.job.susp && [].concat(v).includes(CAREERS[P.job.id].track),
    lic: v => !!(P.lic && P.lic[v]),
    no_lic: v => !(P.lic && P.lic[v]),
    hours_gte: v => (P.hours || 0) >= v,
    medical: v => medicalOk() === v,
    asset_type: v => P.assets.some(a => a.type === v),
    kid_unmarried: v => !!kidToMarry(v),
    adult_kid: v => P.people.some(p => p.role === "uşaq" && p.alive && p.age >= 22) === v,
    loans: v => ((P.loans || []).length > 0) === v,
    kid_m_g: v => (kidToMarry(22) || {}).g === v,
    npc_job: o => Object.entries(o).every(([r, j]) => !!person(r) && person(r).job === j),
    asset: v => P.assets.some(a => a.type === v),
    army: v => v === "none" ? !P.army : v === "active" ? !!P.army && !P.army.done : !!P.army && P.army.done,
    army_due: v => armyDue() === v,
    npc_flag_alive: f => { const id = P.npcFlags && P.npcFlags[f]; const p = id && P.people.find(x => x.id === id); return !!p && p.alive; },
    sport: v => v === true ? sportActive() : v === false ? !sportActive() : sportActive() && [].concat(v).includes(P.sport.id),
    sport_best_gte: v => !!P.sport && P.sport.best >= v,
    sport_level_gte: v => sportActive() && sportLevel() >= v,
    sport_ever: v => !!P.sport === v,
    pol: v => !!P.pol === v,
    pol_party: v => !!P.pol && [].concat(v).includes(P.pol.party),
    pol_office: v => !!P.pol && (v === true ? !!P.pol.office : v === false ? !P.pol.office : [].concat(v).includes(P.pol.office)),
    pol_rep_gte: v => !!P.pol && P.pol.rep >= v,
    ruling: v => !!P.pol && (P.pol.party === rulingParty()) === v,
    pres: v => isPres() === v,
    ex_pres: v => (P.flags.exPrezident != null) === v,
    ctry_gt: o => isPres() && Object.entries(o).every(([k, v]) => P.ctry[k] > v),
    ctry_lt: o => isPres() && Object.entries(o).every(([k, v]) => P.ctry[k] < v),
    means_gte: v => familyMeans() >= v,
    means_lt: v => familyMeans() < v,
    owns: v => owns(v),
    owns_not: v => !owns(v),
    any: list => list.some(c => check(c)),
    not: c => !check(c)
  };
  function check(cond) {
    if (!cond) return true;
    for (const [k, v] of Object.entries(cond)) { const f = C[k]; if (!f) throw new Error("naməlum şərt: " + k); if (!f(v)) return false; }
    return true;
  }
  // military rules (data/rules.json): who must serve now, and for how long
  function armyDue() {
    const M = RULES.military;
    if (P.g !== M.applies_to_gender || P.army || P.age < M.call_age) return false;
    if (inPrison()) return false;
    if (M.deferment_while_studying && ["uni", "magistr", "mekteb", "mezun"].includes(P.edu.stage)) return false;
    if (P.edu.stage === "bitdi" && P.edu.pendingMaster) return false;
    return true;
  }
  function armyMonths() { const M = RULES.military; return P.edu.master ? M.months_after_master : P.edu.degree ? M.months_after_bachelor : M.months_without_higher_education; }

  // ---------------- actions ----------------
  const A = {
    add_person(o, ctx) {
      if (o.unless_has && person(o.role)) { ctx.vars.new = person(o.role).name; return; }
      const g = o.g === "same" ? P.g : o.g === "other" ? (P.g === "k" ? "q" : "k") : o.g === "any" || !o.g ? pick(["k", "q"]) : o.g;
      const age = o.age_abs ? rnd(o.age_abs[0], o.age_abs[1]) : o.age === "self" ? P.age : Array.isArray(o.age) ? Math.max(0, P.age + rnd(o.age[0], o.age[1])) : num(o.age) ? o.age : P.age;
      const p = addPerson(o.role, g, Math.max(0, age), o.last ? { last: surname(P.fam, g) } : {});
      if (o.npc_flag) { P.npcFlags = P.npcFlags || {}; P.npcFlags[o.npc_flag] = p.id; }
      ctx.vars.new = p.name; ctx.vars.new_g = g;
      if (o.role === "uşaq") { P.stats.kids++; ctx.vars.child = g === "k" ? "Oğlunuz" : "Qızınız"; P.pendingName = p.id; } // the player names the baby
    },
    remove_role(o) { removeRole(o.role, o.note); },
    remove_if_low(o) { const p = person(o.role); if (p && p.rel < o.below) removeRole(o.role, o.note); },
    promote_role(o, ctx) { const p = person(o.from); if (!p) return; p.role = o.to; p.rel = clamp(p.rel + (o.rel || 0)); ctx.vars.new = p.name; },
    start_job(o) { startJob(o.id, o.lv || 0, o.note); },
    sport_join(id) { sportJoin(id); },
    own(k) { (P.owned = P.owned || {})[k] = { age: P.age, day: P.day }; },
    pol_join(party) { polJoin(party); },
    pol_run(o, ctx) { polRun(o.office, o.spend || 0, ctx); },
    pol_office(o) { setOffice(o, "təyinat"); },
    pol_leave(reason) { leaveOffice(reason); },
    pol_rep(n) { if (P.pol) P.pol.rep = clamp(P.pol.rep + n); },
    pol_cap(n) { if (P.pol) P.pol.cap += n; },
    ctry(o) { if (isPres()) ctryApply(o); },
    pres_end(reason) { presEnd(reason); },
    sport_end(reason) { sportEnd(reason); },
    sport_skill(n) { if (P.sport) P.sport.skill = clamp(P.sport.skill + n); },
    end_job(o) { endJob(o.reason || "bitdi"); },
    promote() { promote(); },
    // service is counted from the start of the current year of age, so 12 months = exactly one "+1 yaş"
    army_start(o, ctx) { const m = armyMonths(); const start = P.day; P.army = { start, end: Cal.addMonths(start, m), months: m, basis: P.edu.master ? "master" : P.edu.degree ? "bachelor" : "none", done: false }; if (P.job && !P.job.susp) endJob("hərbi xidmət"); ctx.vars.months = m; },
    // a better-paid offer: the salary really grows by this factor (and the offer text shows the exact figures)
    raise(o, ctx) { if (!P.job) return; const before = salaryMonthly(); P.job.bonus = Math.round((P.job.bonus || 1) * o.factor * 100) / 100; ctx.vars.sal_new = fmtMoney(salaryMonthly()); log(`💰 Maaş: ${fmtMoney(before)} → ${fmtMoney(salaryMonthly())}.`); },
    job_suspend() { if (P.job) { P.job.susp = true; log(`⏸️ ${jobTitle()}: müqavilə donduruldu.`); } },
    job_resume(o) { if (!P.job) return; P.job.susp = false; if (o && o.lv_delta) P.job.lv = Math.max(0, P.job.lv + o.lv_delta); P.job.perf = (o && o.perf) || 50; log(`▶️ İşə qayıtdı: ${jobTitle()}.`); },
    open_social() { socOpen(); },
    social_quiet() { socOpen(); P.soc.followers = 3; },
    dream_set(id) { P.dream = id; },
    money_rand(r, ctx) { const m = rnd(r[0], r[1]); P.money = Math.round((P.money + m) * 100) / 100; ctx.vars.amount = fmtMoney(m); ctx.changes.push(["money", m]); },
    // money in qəpik (e.g. coins found on the street)
    money_rand_q(r, ctx) { const q = rnd(r[0], r[1]); const m = q / 100; P.money = Math.round((P.money + m) * 100) / 100; ctx.vars.amount = fmtMoney(m); ctx.changes.push(["money", m]); },
    // a grown child's wedding: what the parents give depends on the choice (dowry for a daughter, home/car for a son)
    kid_wedding(help, ctx) {
      const k = kidToMarry(22); if (!k) return;
      const W = WEDDING[k.g][help]; P.money -= W.cost;
      const sp = addPerson(k.g === "k" ? "gəlin" : "kürəkən", k.g === "k" ? "q" : "k", k.age + rnd(-4, 2), { fam: pick(SURN), of: k.id });
      sp.name = partnerName(k); k.spouse = sp.id; k.married = P.age; k.rel = clamp(k.rel + W.rel);
      ctx.vars.kid_m = k.name; ctx.vars.kid_m_gen = gen(k.name); ctx.vars.kid_m_dat = dat(k.name); ctx.vars.kid_partner = sp.name; ctx.changes.push(["money", -W.cost]);
      log(`💍 ${k.g === "k" ? "Oğlu" : "Qızı"} ${k.name} ${sp.name} ilə evləndi.`);
    },
    biz_handover(o, ctx) { const k = P.people.find(p => p.role === "uşaq" && p.alive && p.age >= 22); if (!k || !P.job) return; const v = BIZ_VALUE[P.job.lv]; endJob("övlada təhvil verdi"); P.assets.push({ type: "biznes", t: `Ailə biznesi (${k.name} idarə edir)`, value: v, heir: k.id }); k.job = "Ailə biznesinin rəhbəri"; k.rel = clamp(k.rel + 12); P.flags.teqaud = P.age; ctx.vars.kid_b = k.name; log(`🤝 Biznesini ${dat(k.name)} təhvil verdi.`); },
    biz_sell(o, ctx) { if (!P.job) return; const v = Math.round(BIZ_VALUE[P.job.lv] * (0.7 + R() * 0.5)); P.money += v; endJob("biznesi satdı"); P.flags.teqaud = P.age; ctx.vars.amount = fmtMoney(v); ctx.changes.push(["money", v]); log(`💼 Biznesini ${fmtMoney(v)}-a satdı.`); },
    restructure() { restructure(); },
    npc_die(o, ctx) { const p = person(o.role); if (!p) return; p.alive = false; p.died = P.age; ctx.vars.dead = p.name; if (o.log !== false) log(`🕯️ ${o.role[0].toUpperCase() + o.role.slice(1)} ${p.name} ${p.age} yaşında dünyasını dəyişdi.`); },
    npc_note(o) { const p = person(o.role); if (p) p.note = o.note || undefined; },
    npc_job(o) { const p = person(o.role); if (p) p.job = o.job; },
    money_mul(f) { P.money = Math.round(P.money * f); },
    followers_rand(r, ctx) { if (!P.soc) return; const n = rnd(r[0], r[1]); P.soc.followers += n; P.stats.maxFollowers = Math.max(P.stats.maxFollowers, P.soc.followers); ctx.changes.push(["followers", n]); },
    add_asset(o) { P.assets.push({ type: o.type, t: o.t, value: o.value, since: P.age }); },
    sell_asset(type, ctx) { const i = P.assets.findIndex(a => a.type === type); if (i < 0) return; const a = P.assets.splice(i, 1)[0]; P.money += a.value; ctx.vars.asset = a.t; ctx.changes.push(["money", a.value]); },
    flag_inc(k) { P.flags[k] = (P.flags[k] || 0) + 1; },
    count(k) { P.stats[k] = (P.stats[k] || 0) + 1; },
    learn_code(n) { P.flags.kodSaat = (P.flags.kodSaat || 0) + n; if (P.flags.kodSaat >= 4 && P.st.smarts > 55) P.flags.kodYazir = P.age; },
    exam(fid, ctx) { ctx.vars.exam = examTry(fid); },
    skip_university() { P.flags.imtahanVerdi = P.age; P.edu.stage = "bitdi"; },
    master_start() { P.edu.stage = "magistr"; P.edu.uniYear = 0; delete P.edu.pendingMaster; },
    master_skip() { delete P.edu.pendingMaster; },
    // schedule a follow-up event N years later (delayed consequence); it fires only if its own conditions still hold then
    schedule(o) { const yrs = Array.isArray(o.after_years) ? rnd(o.after_years[0], o.after_years[1]) : (o.after_years || 0); const day = Cal.addMonths(Cal.addYears(P.day, yrs), o.after_months || 0); P.sched.push({ event: o.event, day, from: P.curEvent || null, set: P.day }); P.sched.sort((a, b) => a.day - b.day); },
    move_city(v, ctx) { const to = v === "random" ? pick(CITIES.filter(c => c !== P.city)) : v; ctx.vars.city_from = P.city; P.city = to; ctx.vars.city = to; log(`🚚 ${to} şəhərinə köçdü.`); },
    allow_retake() { delete P.flags.imtahanVerdi; P.edu.stage = "mezun"; },
    crime(type, ctx) { const r = commitCrime(type); ctx.vars.crime = r.title; ctx.vars.caught = r.caught ? "Polis artıq məsələni araşdırır." : "Hələlik heç kim bilmir…"; if (!r.caught) P.flags["got_away_" + type] = P.age; },
    trial(o, ctx) { ctx.vars.verdict = trial(o.lawyer, !!o.plea); },
    set_lic(k) { P.lic = P.lic || {}; P.lic[k] = P.age; },
    phd_start() { P.flags.phd_basladi = P.age; },
    flight_school() { P.flags.flight_school = P.age; },
    military_retire(o) { endJob("hərbi təqaüd"); P.flags.military_pension = P.age; P.flags.ex_herbci = P.age; },
    asset_mul(o) { for (const a of P.assets) if (a.type === o.type) a.value = Math.round(a.value * o.f); },
    // a rare fatal outcome inside a dangerous situation (kept small on purpose)
    die_chance(o) { if (chance(o.p)) die(o.cause); },
    trait(o) { for (const [k, v] of Object.entries(o)) P.tr[k] = clamp((P.tr[k] || 50) + v); }
  };
  function run(list, ctx) { for (const step of list || []) for (const [k, v] of Object.entries(step)) { const f = A[k]; if (!f) throw new Error("naməlum əməliyyat: " + k); f(v, ctx); } }

  // ---------------- text ----------------
  const COUNTRIES = ["Türkiyənin", "Rusiyanın", "Portuqaliyanın", "Belçikanın", "Almaniyanın", "İngiltərənin"];
  const TV = {
    sick_parent: () => person("ata") && person("ata").age > 62 ? "Atan" : "Anan",
    party: () => P.pol ? PARTIES[P.pol.party].t : "partiya",
    office: () => P.pol && P.pol.office ? OFFICES[P.pol.office].t : "",
    ruling_party: () => PARTIES[rulingParty()].t,
    camp_b1: () => fmtMoney(RULES.politics.campaign.belediyye[1]), camp_b2: () => fmtMoney(RULES.politics.campaign.belediyye[2]),
    camp_m1: () => fmtMoney(RULES.politics.campaign.meclis[1]), camp_m2: () => fmtMoney(RULES.politics.campaign.meclis[2]),
    camp_p1: () => fmtMoney(RULES.politics.campaign.prezident[1]), camp_p2: () => fmtMoney(RULES.politics.campaign.prezident[2]),
    pres_term: () => P.pres ? String(P.pres.term) : "1",
    approval: () => P.ctry ? P.ctry.approval + "%" : "",
    sport: () => sportName(),
    sport_l: () => sportName().toLowerCase(),
    sport_icon: () => P.sport ? SPORTS[P.sport.id].icon : "🏅",
    kid6: () => (people("uşaq").find(k => k.age === 6) || {}).name || "Övladın",
    fac: () => P.edu.fac ? FACULTIES[P.edu.fac].t : "Universitet",
    gpa: () => (2 + P.edu.gpa / 33.4).toFixed(1),
    country: () => pick(COUNTRIES),
    debt: () => fmtMoney(-P.money),
    job_now: () => jobTitle() || "işsizsən",
    became: () => (P.jobs.concat(P.job ? [{ title: jobTitle() }] : []).filter(j => j.title).pop() || { title: "başqa yollara" }).title.toLowerCase(),
    dream_twist: () => P.dream !== "futbolcu" ? ` Halbuki xəyalın ${dreamName()} idi… Həyat, sən nə qəribəsən!` : "",
    singer_twist: () => P.dream !== "mugenni" ? `Xəyalın ${dreamName()} idi, amma indi müğənnisən. Həyat, sən nə qəribəsən!` : "Xəyalın gerçəkləşdi!",
    sib: () => { const s = P.people.find(p => p.alive && (p.role === "qardaş" || p.role === "bacı")); return s ? s.name : "?"; },
    sib_word: () => { const s = P.people.find(p => p.alive && (p.role === "qardaş" || p.role === "bacı")); return s ? (s.role === "qardaş" ? "qardaşın" : "bacın") : "?"; },
    case_title: () => P.legal && P.legal.case ? RULES.justice.crimes[P.legal.case.type].t.toLowerCase() : "iş",
    lawyer_cost: () => P.legal && P.legal.case ? fmtMoney(RULES.justice.crimes[P.legal.case.type].lawyer_cost) : "",
    lawyer_cost3: () => P.legal && P.legal.case ? fmtMoney(RULES.justice.crimes[P.legal.case.type].lawyer_cost * 3) : "",
    prison_left: () => P.legal && P.legal.prison ? Math.max(0, Math.ceil((P.legal.prison.end - P.day) / 365)) + " il" : "",
    kid_m: () => (kidToMarry(22) || {}).name || "Övladın",
    kid_b: () => { const k = P.people.find(p => p.role === "uşaq" && p.alive && p.age >= 22); return k ? k.name : "övladın"; },
    biz_value: () => fmtMoney(P.job && P.job.id === "biznes" ? BIZ_VALUE[P.job.lv] : 0),
    kid_m_gen: () => gen((kidToMarry(22) || {}).name || "Övladın"),
    kid_m_dat: () => dat((kidToMarry(22) || {}).name || "Övlad"),
    yoldas_dat: () => person("həyat yoldaşı") ? dat(person("həyat yoldaşı").name) : "həyat yoldaşına",
    kid_m_word: () => (kidToMarry(22) || {}).g === "q" ? "Qızın" : "Oğlun",
    kid_partner: () => { const k = kidToMarry(22); return k ? partnerName(k) : "?"; },
    granny_word: () => P.g === "q" ? "nənə" : "baba",
    grand_name: () => (P.lastGrand || {}).name || "?",
    grand_word: () => (P.lastGrand || {}).g === "q" ? "qızı" : "oğlu",
    grand_parent: () => (P.lastGrand || {}).name ? `${P.lastGrand.parentG === "q" ? "Qızın" : "Oğlun"} ${P.lastGrand.parent}` : "Övladın",
    sal_now: () => fmtMoney(salaryMonthly()),
    offer_city: () => fmtMoney(Math.round(salaryMonthly() * 1.6)),
    offer_remote: () => fmtMoney(Math.round(salaryMonthly() * 2.5)),
    army_months: () => armyMonths(),
    army_job_note: () => P.job && !P.job.susp ? ` ${jobTitle()} işindən ayrılmalı olacaqsan; qayıdanda yenidən iş axtarmalısan.` : "",
    handle: () => P.soc ? P.soc.handle : "",
    npc_old_friend: () => { const id = P.npcFlags && P.npcFlags.defended_classmate; const p = id && P.people.find(x => x.id === id); return p ? p.name : "köhnə sinif yoldaşın"; }
  };
  function text(t, ctx) {
    let s = String(t ?? "").replace(/\{(\w+)\}/g, (m, k) => ctx && ctx.vars && ctx.vars[k] != null ? ctx.vars[k] : TV[k] ? TV[k]() : m);
    return fill(s);
  }
  const KNOWN_PLACEHOLDERS = new Set(["ad", "ana", "ata", "dost", "sevgili", "yoldaş", "şəhər", "müəllim", "məşqçi", "müdir", "rəqib", "xəyal", "iş", "new", "child", "pol_result", "amount", "asset", "months", "exam", "city", "city_from", "dead", "nene", "baba", "sal_new", "kid_m", "kid_b", "biz_value", "kid_m_gen", "kid_m_dat", "yoldas_dat", "kid_m_word", "kid_partner", "grand_name", "grand_word", "grand_parent", "granny_word", "wcost_full", "wcost_part", "wcost_toy", "crime", "caught", "verdict", ...Object.keys(TV)]);

  // ---------------- dynamic choice lists ----------------
  const GEN = {
    dream_change: () => [{ t: `Yenə də ${dreamName()}!`, fx: { happy: 2 }, r: "Xəyalın dəyişməyib. Müəllim gülümsədi." },
      ...DREAMS.filter(d => d.id !== P.dream).sort(() => R() - .5).slice(0, 3).map(d => ({ t: `İndi ${d.t.toLowerCase()} olmaq istəyirəm`, r: `Artıq yeni xəyalın var: ${d.t.toLowerCase()}.`, do: [{ dream_set: d.id }] }))],
    faculties: () => [...Object.entries(FACULTIES).map(([id, f]) => ({ t: `${f.t}${f.opens === P.dream ? " ⭐" : ""}`, r: "{exam}", do: [{ exam: id }] })),
      { t: "Universitetə getmirəm, işləyəcəyəm", r: "Oxumaq əvəzinə iş həyatına başladın. (Fəaliyyət → İş axtar)", do: [{ skip_university: true }] }]
  };

  // ---------------- event selection ----------------
  let LIB = [], BY_ID = {};
  function load(lists) { LIB = [].concat(...lists).map(normalize); BY_ID = Object.fromEntries(LIB.map(e => [e.id, e])); return LIB; }
  function normalize(e) { const x = Object.assign({}, e); if (!x.age && x.age_min != null) x.age = [x.age_min, x.age_max]; if (x.repeatable === true) x.once = false; return x; }
  function ok(e) {
    if (!!e.prison !== inPrison()) return false; // in prison only prison events, outside never
    if (e.age && (P.age < e.age[0] || P.age > e.age[1])) return false;
    if (e.once !== false && P.seen[e.id] != null) return false;
    if (e.cool && P.seen[e.id] != null && P.age - P.seen[e.id] < e.cool) return false;
    try { return check(e.cond); } catch (err) { return false; }
  }
  // re-check right before showing (an earlier event this year may have changed things)
  function stillOk(e) { try { return check(e.cond); } catch (err) { return false; } }
  // delayed consequences that fall due during the coming quarter (between birthdays)
  function takeScheduled(until) {
    const out = [], keep = [];
    for (const s of P.sched) {
      const e = BY_ID[s.event];
      if (s.day >= until || !e) { keep.push(s); continue; }
      if (!!e.prison !== inPrison()) { keep.push(s); continue; }
      if (check(e.cond) && (!e.age || (P.age >= e.age[0] && P.age <= e.age[1] + 3))) out.push({ id: e.id, day: Math.max(P.day, s.day) });
    }
    P.sched = keep;
    return out;
  }
  function pickYear(n) {
    const out = [];
    // 1) delayed consequences that are due now (they ignore age windows only if the event itself allows it)
    const later = [];
    while (P.sched.length && P.sched[0].day <= P.day) {
      const s = P.sched.shift(); const e = BY_ID[s.event];
      if (e && !!e.prison !== inPrison()) { later.push(s); continue; } // waits until the person is out (or in)
      if (e && check(e.cond) && (!e.age || (P.age >= e.age[0] && P.age <= e.age[1] + 3))) out.push(e.id);
    }
    for (const s of later) { s.day = Cal.addYears(P.day, 1); P.sched.push(s); }
    P.sched.sort((a, b) => a.day - b.day);
    const pool = LIB.filter(e => !e.scheduled_only && ok(e) && (e.p == null || R() < e.p)); // p: chance per year for rare offers
    // 2) forced milestones, 3) weighted random by priority
    for (const e of pool) if (e.force && !out.includes(e.id)) out.push(e.id);
    let rest = pool.filter(e => !e.force && !out.includes(e.id));
    const serious = rest.filter(e => e.tone && e.tone !== "everyday");
    if (!out.some(id => (BY_ID[id].tone || "everyday") !== "everyday") && serious.length && R() < 0.3) {
      const tot = serious.reduce((a, e) => a + (e.w || 1) * (1 + (e.priority || 0)), 0); let r = R() * tot, pickE = serious[0];
      for (const x of serious) { r -= (x.w || 1) * (1 + (x.priority || 0)); if (r <= 0) { pickE = x; break; } }
      out.push(pickE.id); rest = rest.filter(x => x !== pickE);
    }
    while (out.length < n && rest.length) {
      const tot = rest.reduce((a, e) => a + (e.w || 1) * (1 + (e.priority || 0)), 0);
      let r = R() * tot, e = rest[0];
      for (const x of rest) { r -= (x.w || 1) * (1 + (x.priority || 0)); if (r <= 0) { e = x; break; } }
      out.push(e.id); rest = rest.filter(x => x !== e);
    }
    return out;
  }
  function choicesOf(e) { const list = e.choices_gen ? GEN[e.choices_gen]() : e.ch || [{ t: "Davam" }]; return list.filter(c => { try { return check(c.cond); } catch (err) { return false; } }); }
  function prob(p) {
    if (num(p)) return p;
    if (p && p.of === "job.lv") return (P.job ? P.job.lv : 0) / (p.div || 1) + (p.add || 0);
    if (p && p.of) { const [grp, key] = p.of.split("."); const base = grp === "st" ? P.st[key] : grp === "tal" ? P.tal[key] : grp === "tr" ? (P.tr[key] || 50) : grp === "ctry" ? (P.ctry ? P.ctry[key] : 0) : grp === "pol" ? (P.pol ? P.pol[key] : 0) : 0; return base / (p.div || 100) + (p.add || 0); }
    return 0.5;
  }
  // apply a choice: returns {text, changes}
  function choose(e, c) {
    const ctx = { vars: {}, changes: [] };
    P.curEvent = e.id;
    let o = c;
    if (c.odds) {
      const ps = c.odds.map(x => Math.max(0, prob(x.p))); let roll = R();
      if (ps.length === 2) o = roll < clamp(ps[0], 0.03, 0.97) ? c.odds[0] : c.odds[1];
      else { const s = ps.reduce((a, b) => a + b, 0); for (let i = 0; i < ps.length; i++) { roll -= ps[i] / s; if (roll <= 0 || i === ps.length - 1) { o = c.odds[i]; break; } } }
    }
    if (o !== c) { ctx.changes.push(...apply(c.fx)); run(c.do, ctx); }
    ctx.changes.push(...apply(o.fx));
    run(o.do, ctx);
    if (o.trait || c.trait) A.trait(Object.assign({}, c.trait || {}, o.trait || {}));
    P.curEvent = null;
    if (typeof contextTick === "function") contextTick(); // e.g. leaving football mid-year
    const parts = [o.r, o !== c ? c.r : null].filter(Boolean);
    return { text: parts.map(t => text(t, ctx)).join(" "), changes: ctx.changes, outcome: c.odds ? c.odds.indexOf(o) : -1 };
  }

  // ---------------- validation ----------------
  const EVENT_KEYS = new Set(["prison", "p", "id", "cat", "tone", "age", "age_min", "age_max", "icon", "visual", "t", "title", "description", "location", "w", "weight", "priority", "force", "once", "repeatable", "cool", "scheduled_only", "cond", "conditions", "ch", "choices", "choices_gen", "g", "note"]);
  const CHOICE_KEYS = new Set(["t", "cond", "fx", "do", "r", "odds", "trait", "id", "text", "result_text", "effects"]);
  const FX_KEYS = new Set([...STAT_KEYS, "money", "fame", "followers", "rel", "tal", "flag", "unflag", "perf"]);
  function validate(lists) {
    const errs = [], ids = new Set(), all = [].concat(...lists).map(normalize);
    const known = new Set(all.map(e => e.id));
    const placeholders = t => [...String(t || "").matchAll(/\{(\w+)\}/g)].map(m => m[1]).filter(k => !KNOWN_PLACEHOLDERS.has(k) && !["qardas", "baci", "usaq"].includes(k));
    const vCond = (c, where) => { if (!c) return; for (const [k, v] of Object.entries(c)) { if (!C[k]) errs.push(`${where}: naməlum şərt "${k}"`); if (k === "any") v.forEach((x, i) => vCond(x, where + ".any" + i)); if (k === "not") vCond(v, where + ".not"); } };
    const vFx = (fx, where) => { if (!fx) return; for (const k of Object.keys(fx)) if (!FX_KEYS.has(k)) errs.push(`${where}: naməlum effekt "${k}"`); };
    const vDo = (list, where) => { for (const step of list || []) for (const [k, v] of Object.entries(step)) { if (!A[k]) errs.push(`${where}: naməlum əməliyyat "${k}"`); if (k === "schedule" && !known.has(v.event)) errs.push(`${where}: planlanan hadisə tapılmadı "${v.event}"`); if (k === "start_job" && !CAREERS[v.id]) errs.push(`${where}: naməlum peşə "${v.id}"`); } };
    // a text that names a person ({dost}, {müəllim}…) must be guarded by a "has" condition for that role
    const ROLE_PH = { "{nene}": "nənə", "{baba}": "baba", "{dost}": "dost", "{sevgili}": "sevgili", "{yoldaş}": "həyat yoldaşı", "{müəllim}": "müəllim", "{məşqçi}": "məşqçi", "{ana}": "ana", "{ata}": "ata" };
    const guarded = (cond, role) => !!cond && ([].concat(cond.has || []).includes(role) || (cond.rel_gt && cond.rel_gt[role] != null));
    const sibGuard = conds => conds.some(c => c && [].concat(c.has_any || [], c.has || []).some(r => r === "qardaş" || r === "bacı"));
    const vRoles = (t, conds, where) => { if (/\{sib(_word)?\}/.test(String(t || "")) && !sibGuard(conds)) errs.push(`${where}: "{sib}" işlənir, amma qardaş/bacı şərti yoxdur`); for (const [ph, role] of Object.entries(ROLE_PH)) if (String(t || "").includes(ph) && !conds.some(c => guarded(c, role))) errs.push(`${where}: "${ph}" işlənir, amma şərtdə "has":["${role}"] yoxdur`); };
    for (const e of all) {
      const w = e.id || "(id yoxdur)";
      vRoles(e.t, [e.cond], w);
      (e.ch || []).forEach((c, i) => { vRoles(c.t, [e.cond, c.cond], `${w}.ch${i}`); vRoles(c.r, [e.cond, c.cond], `${w}.ch${i}`); (c.odds || []).forEach((o, j) => vRoles(o.r, [e.cond, c.cond], `${w}.ch${i}.odds${j}`)); });
      if (!e.id) errs.push("id olmayan hadisə");
      if (ids.has(e.id)) errs.push(`${w}: təkrar id`); ids.add(e.id);
      for (const k of Object.keys(e)) if (!EVENT_KEYS.has(k)) errs.push(`${w}: naməlum sahə "${k}"`);
      if (!e.age || e.age[0] > e.age[1]) errs.push(`${w}: yaş aralığı səhvdir`);
      if (!e.t) errs.push(`${w}: mətn yoxdur`);
      if (placeholders(e.t).length) errs.push(`${w}: naməlum dəyişən ${placeholders(e.t)}`);
      if (e.tone && !["everyday", "dramatic", "rare"].includes(e.tone)) errs.push(`${w}: ton səhvdir`);
      vCond(e.cond, w);
      if (e.choices_gen) { if (!GEN[e.choices_gen]) errs.push(`${w}: naməlum choices_gen`); continue; }
      // at most 5 choices visible at once; variants that are exclusive by gender (player's or the child's) count separately
      const vis = ["k", "q"].map(g => (e.ch || []).filter(c => !c.cond || ((c.cond.gender || g) === g && (c.cond.kid_m_g || g) === g)).length);
      if (!Array.isArray(e.ch) || e.ch.length < 1 || Math.max(...vis) > 5) errs.push(`${w}: görünən seçim sayı 1–5 olmalıdır`);
      (e.ch || []).forEach((c, i) => {
        const cw = `${w}.ch${i}`;
        for (const k of Object.keys(c)) if (!CHOICE_KEYS.has(k)) errs.push(`${cw}: naməlum sahə "${k}"`);
        if (!c.t) errs.push(`${cw}: seçim mətni yoxdur`);
        if (!c.r && !c.odds && !(c.do || []).length) errs.push(`${cw}: nəticə mətni yoxdur`);
        [c.t, c.r].forEach(t => { if (placeholders(t).length) errs.push(`${cw}: naməlum dəyişən ${placeholders(t)}`); });
        vCond(c.cond, cw); vFx(c.fx, cw); vDo(c.do, cw);
        (c.odds || []).forEach((o, j) => { vFx(o.fx, cw + ".odds" + j); vDo(o.do, cw + ".odds" + j); if (!o.r && !(o.do || []).length) errs.push(`${cw}.odds${j}: nəticə mətni yoxdur`); if (placeholders(o.r).length) errs.push(`${cw}.odds${j}: naməlum dəyişən ${placeholders(o.r)}`); if (o.p == null) errs.push(`${cw}.odds${j}: ehtimal yoxdur`); });
      });
    }
    return errs;
  }

  return { load, check, run, text, pickYear, takeScheduled, choicesOf, choose, stillOk, validate, armyDue, armyMonths, get lib() { return LIB; }, byId: id => BY_ID[id] };
})();
