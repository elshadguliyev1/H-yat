/* Justice system: offence → investigation → court → sentence → prison life → parole/release → criminal record.
   All numbers come from data/rules.json "justice" (a simplified game configuration, NOT the real criminal code).
   Crime is never a free win: getting caught has legal, money, family and career consequences that last. */
"use strict";

function legal() { return (P.legal = P.legal || { record: [], case: null, prison: null, history: [] }); }
const inPrison = () => !!(P.legal && P.legal.prison && !P.legal.prison.released);

// commit an offence (called from events). Returns {caught}
function commitCrime(type) {
  const J = RULES.justice, C = J.crimes[type]; if (!C) throw new Error("naməlum cinayət: " + type);
  const L = legal(); P.stats.crimes = (P.stats.crimes || 0) + 1;
  const caught = chance(C.caught + (L.record.length ? 0.1 : 0));
  L.history.push({ day: P.day, age: P.age, type, caught });
  if (caught) { L.case = { type, day: P.day, age: P.age }; endJobIfLaw(); log(`🚨 Cinayət işi açıldı: ${C.t}.`); }
  return { caught, title: C.t };
}
function endJobIfLaw() { if (P.job && ["law", "military", "aviation", "rescue", "education", "medicine"].includes(CAREERS[P.job.id].track)) { const t = jobTitle(); endJob("cinayət işi"); log(`📄 ${t} vəzifəsindən uzaqlaşdırıldı.`); } }

// the trial: lawyer quality, plea, prior record and evidence decide. Returns a human-readable verdict.
function trial(lawyer, plea) {
  const J = RULES.justice, L = legal(), cs = L.case; if (!cs) return "İş bağlanıb.";
  const C = J.crimes[cs.type];
  const cost = { dovlet: 0, ozel: C.lawyer_cost, yaxsi: C.lawyer_cost * 3 }[lawyer] || 0;
  P.money -= cost;
  const quality = { dovlet: 0, ozel: 0.12, yaxsi: 0.22 }[lawyer] || 0;
  const evidence = 0.55 + R() * 0.4 - quality;
  const juvenile = P.age < 18;
  let verdict, years = 0, suspended = false, fine = 0;
  if (!plea && evidence < 0.5) { verdict = "bəraət"; }
  else {
    const [lo, hi] = C.years;
    years = lo + (hi - lo) * clamp(evidence + (L.record.length ? 0.2 : 0) - (plea ? J.plea_discount : 0), 0, 1);
    years = Math.round(years * 2) / 2;
    fine = C.fine ? rnd(C.fine[0], C.fine[1]) : 0;
    suspended = juvenile || years <= J.suspended_max_years && !L.record.length && chance(plea ? 0.75 : 0.5);
    verdict = years <= 0 ? "cərimə" : suspended ? "şərti" : "həbs";
  }
  L.case = null;
  if (verdict === "bəraət") { log("⚖️ Məhkəmə bəraət verdi."); return `Məhkəmə sübutları yetərli saymadı: bəraət! ${cost ? "Vəkilə " + fmtMoney(cost) + " ödədin." : ""}`; }
  const X = J.expunge;
  const exp = verdict === "cərimə" ? X.fine : verdict === "şərti" ? years + X.suspended_after_probation : null; // prison: set on release
  L.record.push({ day: P.day, age: P.age, type: cs.type, verdict, years, expires: exp != null ? Cal.addMonths(P.day, Math.round(exp * 12)) : null });
  if (fine) P.money -= fine;
  if (verdict === "cərimə") { log(`⚖️ Məhkəmə: ${fmtMoney(fine)} cərimə.`); return `Cərimə: ${fmtMoney(fine)}. Məhkumluq qeydi 1 il qalacaq.`; }
  if (verdict === "şərti") { P.flags.probation = P.age; log(`⚖️ Məhkəmə: ${years} il şərti cəza${juvenile ? " (yetkinlik yaşına çatmayan)" : ""}.`); return `${years} il şərti cəza${fine ? " və " + fmtMoney(fine) + " cərimə" : ""}. Bu müddətdə yenidən səhv etsən, həbs olunacaqsan. Məhkumluq qeydi sınaq müddətindən sonra daha 1 il qalacaq.`; }
  imprison(years, cs.type);
  const L2 = L;
  return `${years} il azadlıqdan məhrumetmə (${Cal.fmt(L2.prison.start)} → ${Cal.fmt(L2.prison.end)}). Yaxşı davranışla müddətin 2/3-dən sonra şərti azad oluna bilərsən. Zalda anan huşunu itirdi. Qandalı taxanda pəncərədən son dəfə şəhərə baxdın.`;
}
function imprison(years, type) {
  const L = legal();
  if (P.job) endJob("həbs");
  if (P.edu.stage === "uni" || P.edu.stage === "magistr") { P.edu.stage = "bitdi"; log("🎓 Universitetdən xaric edildi."); }
  L.prison = { start: P.day, end: Cal.addMonths(P.day, Math.round(years * 12)), years, type, behavior: 50, released: false };
  (L.terms = L.terms || []).push(L.prison);
  P.flags.prison = P.age;
  log(`🔒 Həbsxanaya göndərildi: ${years} il.`);
  relAdd("ana", -6); relAdd("ata", -10); relAdd("həyat yoldaşı", -15); relAdd("sevgili", -20);
}
// yearly: behaviour, parole, release (time keeps flowing: family ages, kids grow)
function prisonTick() {
  const L = legal(), pr = L.prison; if (!pr || pr.released) return;
  pr.behavior = clamp(pr.behavior + rnd(-6, 6));
  const served = (P.day - pr.start) / (pr.end - pr.start);
  const J = RULES.justice;
  if (P.day >= pr.end || (served >= J.parole_fraction && pr.behavior >= J.parole_behavior && chance(0.6))) release(P.day < pr.end);
  else { apply({ happy: -6, health: -2 }); if (person("sevgili") && chance(0.35)) { const s = person("sevgili"); removeRole("sevgili", "gözləmədi"); log(`💔 ${s.name} gözləmədi.`); } }
}
function release(early) {
  const L = legal(), pr = L.prison; pr.released = true; pr.out = P.day;
  const X = RULES.justice.expunge, rec = [...L.record].reverse().find(r => r.verdict === "həbs" && !r.expires);
  if (rec) rec.expires = Cal.addYears(P.day, pr.years <= 3 ? X.prison_upto_3 : pr.years <= 10 ? X.prison_upto_10 : X.prison_over_10);
  delete P.flags.prison; P.flags.released = P.age;
  log(early ? `🕊️ Yaxşı davranışa görə şərti olaraq vaxtından əvvəl azad edildi.` : `🕊️ Cəza müddəti bitdi. Azadlığa çıxdı.`);
  apply({ happy: 15 });
}
// yearly: convictions expire after the configured period (the record is "cleared")
function expungeTick() {
  const L = P.legal; if (!L || !L.record) return;
  for (const r of L.record) if (!r.expunged && r.expires && P.day >= r.expires && !inPrison()) {
    r.expunged = P.day; log(`📜 Məhkumluq ödənildi: ${RULES.justice.crimes[r.type] ? RULES.justice.crimes[r.type].t.toLowerCase() : r.type} üzrə qeyd silindi.`);
    P.sched.push({ event: "mehkumluq_silindi", day: P.day }); P.sched.sort((a, b) => a.day - b.day);
  }
}
// prison activities (replace normal ones while inside)
const PRISON_ACTIONS = [
  { id: "p_kitab", t: "Kitabxanada oxu", icon: "📚", fx: () => ({ smarts: rnd(3, 6) }), r: () => pick(["Həbsxananın kitabxanasında Dostoyevskini bitirdin.", "Tarix kitabları oxuyursan. Zaman fərqli axır.", "Bir kitabı iki dəfə oxudun. İkincidə başqa şey gördün."]), b: 2 },
  { id: "p_idman", t: "Həyətdə idman et", icon: "🏋️", fx: () => ({ fitness: rnd(3, 6), health: 1 }), r: () => "Hər səhər həyətdə dartınma, qaçış. Bədən güclənir, ağıl sakitləşir.", b: 1 },
  { id: "p_emalat", t: "Emalatxanada işlə", icon: "🪚", fx: () => ({ money: rnd(300, 700) }), r: () => "Taxta emalatxanasında stul düzəldirsən. Az da olsa, qazanc var.", b: 4 },
  { id: "p_tehsil", t: "Peşə təhsili proqramına qatıl", icon: "🔧", fx: () => ({ smarts: 2 }), r: () => "Elektrik işi kursu. Müəllim deyir ki, əllərin bacarıqlıdır.", b: 4, after: () => { P.flags.prison_course = (P.flags.prison_course || 0) + 1; if (P.flags.prison_course >= 2) { P.flags.pese_kursu = P.age; log("🔧 Həbsxanada peşə sertifikatı aldı."); } } },
  { id: "p_gorus", t: "Ailə ilə görüş", icon: "🤝", fx: () => ({ happy: rnd(4, 9) }), r: () => person("ana") ? `Anan gəlmişdi. Şüşənin arxasından əlini ovcuna qoydu. Heç biriniz danışa bilmədiniz.` : person("həyat yoldaşı") ? `${who("həyat yoldaşı")} uşaqların şəklini gətirmişdi.` : "Heç kim gəlmədi. Görüş otağında tək oturdun.", b: 2, after: () => { relAdd("ana", 6); relAdd("ata", 4); relAdd("həyat yoldaşı", 6); relAdd("uşaq", 5); } },
  { id: "p_mektub", t: "Evə məktub yaz", icon: "✉️", fx: () => ({ happy: 2 }), r: () => "Uzun məktub yazdın: üzr, peşmançılıq, ümid.", b: 1, after: () => { relAdd("ana", 3); relAdd("həyat yoldaşı", 3); relAdd("uşaq", 3); } }
];
function doPrisonAction(a) { const ch = apply(a.fx()); if (a.after) a.after(); const pr = legal().prison; if (pr) pr.behavior = clamp(pr.behavior + a.b); return { text: a.r(), changes: ch }; }
