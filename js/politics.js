/* Politics: party → municipal council → parliament → government → presidency, then running the country and its army.
   The country, parties and every politician are fictional; numbers come from data/rules.json "politics"
   (a simplified game configuration, not a description of any real state or constitution). */
"use strict";

const PARTIES = {
  ireli: { t: "İrəli Partiyası", d: "hakim partiya: resurs çox, sual vermək az" },
  birlik: { t: "Vətəndaş Birliyi", d: "əsas müxalifət: ideya çox, pul az" },
  merkez: { t: "Mərkəz Alyansı", d: "mötədil, kiçik, amma hamı ilə danışır" },
  yasil: { t: "Yaşıl Gələcək", d: "gənclər və ekologiya partiyası" },
  bitaraf: { t: "Bitərəf namizəd", d: "partiyasız: heç kimə borclu deyilsən, heç kim də kömək etmir" }
};
const OFFICES = { belediyye: { t: "Bələdiyyə üzvü", lv: 0 }, meclis: { t: "Millət vəkili", lv: 1 }, komite: { t: "Komitə sədri", lv: 2 }, nazir_muavini: { t: "Nazir müavini", lv: 3 }, nazir: { t: "Nazir", lv: 4 }, prezident: { t: "Prezident" } };
const CTRY_KEYS = { econ: ["İqtisadiyyat", "📈"], approval: ["Xalqın dəstəyi", "🗳️"], stability: ["Sabitlik", "⚖️"], army: ["Ordunun gücü", "🪖"], loyalty: ["Ordunun sədaqəti", "🎖️"], edu: ["Təhsil", "🎓"], health: ["Səhiyyə", "🏥"], foreign: ["Xarici nüfuz", "🌍"], corruption: ["Korrupsiya", "🕳️"] };

const polRules = () => RULES.politics;
const pol = () => P.pol;
const isPres = () => !!(P.pres && !P.pres.ended);
function partyStrength(id) { const s = (P.parties || {})[id]; return s != null ? s : (polRules().party_strength[id] || 8); }
function rulingParty() { return Object.keys(polRules().party_strength).filter(k => k !== "bitaraf").sort((a, b) => partyStrength(b) - partyStrength(a))[0]; }
function electionYear(office, y = Cal.toYMD(P.day).y) { const R = polRules(); return (y + R.offset[office]) % R.cycle[office] === 0; }
function polJoin(party) {
  P.pol = P.pol || { party: null, rep: 35 + Math.round(P.tal.social / 5), cap: 0, office: null, since: null, joined: P.age, hist: [], terms: 0 };
  P.pol.party = party; P.pol.hist.push({ age: P.age, t: party === "bitaraf" ? "Bitərəf siyasətçi kimi fəaliyyətə başladı" : PARTIES[party].t + " sıralarına qoşuldu" });
  log(`🏛️ ${party === "bitaraf" ? "Bitərəf siyasətçi oldu" : PARTIES[party].t + " üzvü oldu"}.`);
}
function setOffice(office, how) {
  const L = pol();
  if (office === "prezident" && P.job) endJob("prezident seçildi"); // first: ending the old job also closes the old office
  L.office = office; L.since = P.age; L.hist.push({ age: P.age, t: OFFICES[office].t + (how ? " (" + how + ")" : "") });
  if (office === "prezident") { startJob("prezident", 0, "Andiçmə mərasimi"); return; }
  const lv = OFFICES[office].lv;
  if (P.job && P.job.id === "siyasetci") { P.job.lv = lv; P.job.employer = CAREERS.siyasetci.employers[lv]; P.job.lvYears = 0; P.job.sal = Math.max(P.job.sal, inBand(CAREERS.siyasetci, lv, 0.3)); careerLog(OFFICES[office].t, "promo"); log(`🏛️ ${OFFICES[office].t}.`); }
  else startJob("siyasetci", lv, how || "Seçildi", { employer: CAREERS.siyasetci.employers[lv] });
}
function leaveOffice(reason) {
  const L = pol(); if (!L || !L.office) return;
  L.hist.push({ age: P.age, t: OFFICES[L.office].t + " vəzifəsini tərk etdi: " + reason }); L.office = null;
  if (P.job && ["siyasetci", "prezident"].includes(P.job.id)) endJob(reason);
}
// who may register as a candidate
function canRun(office) {
  const R = polRules(), L = pol();
  if (!L) return "partiyaya qoşulmaq və ya bitərəf namizəd olmaq lazımdır";
  if (P.age < R.min_age[office]) return `ən azı ${R.min_age[office]} yaş lazımdır`;
  if (hasRecord()) return "aktiv məhkumluğu olanlar namizəd ola bilməz";
  if (inPrison()) return "həbsdədir";
  if (office === "prezident" && R.president_needs_degree && !P.edu.degree) return "ali təhsil lazımdır";
  if (L.office && OFFICES[L.office].lv > (OFFICES[office].lv ?? 9)) return "hazırda daha yüksək vəzifədəsən";
  if (office === "prezident" && P.age > R.max_age_president && !isPres()) return "yaş həddi keçib";
  if (office === "prezident" && isPres() && P.pres.term >= R.max_terms) return "Konstitusiya iki müddətdən artıq icazə vermir";
  if (office === "prezident" && !isPres() && !(L.office && OFFICES[L.office].lv >= 3 && L.cap >= 25) && !(P.fame >= 90 && L.office)) return "partiya yalnız hökumətdə təcrübəsi olanı (nazir müavini və yuxarı) və ya çox tanınan adamı namizəd göstərir";
  return null;
}
// an election: party machine + reputation + fame + campaign money + charisma + luck → vote share
function polRun(office, spend, ctx) {
  const L = pol(), R = polRules(), why = canRun(office);
  if (why) { ctx.vars.pol_result = "Mərkəzi Seçki Komissiyası sənədlərini qəbul etmədi: " + why + "."; return; }
  const cost = (R.campaign[office] || [0, 0, 0])[spend] || 0; P.money -= cost;
  const party = L.party === "bitaraf" ? 0 : partyStrength(L.party);
  const incumbent = L.office === office || (office === "prezident" && isPres());
  let score = office === "prezident" ? party * 0.35 + L.rep * 0.22 + P.fame * 0.2 + P.tal.social * 0.05 + [0, 4, 8][spend] + rnd(-10, 10) - 8
    : party * 0.45 + L.rep * 0.35 + P.fame * 0.15 + P.tal.social * 0.08 + [0, 6, 12][spend] + (incumbent ? 6 : 0) + rnd(-10, 10) - (office === "meclis" ? 4 : 0);
  if (office === "prezident" && isPres()) score = P.ctry.approval * 0.75 + party * 0.2 + [0, 4, 8][spend] + rnd(-8, 8);
  const pct = clamp(Math.round(score), 3, 88), win = office === "prezident" ? pct >= 50 : pct >= R.threshold[office];
  L.ran = L.ran || []; L.ran.push({ age: P.age, office, pct, win });
  if (!win) {
    ctx.vars.pol_result = `Səslərin ${pct}%-ni topladın. ${office === "prezident" ? "Prezident seçkisində" : "Seçkidə"} məğlub oldun.${cost ? " Kampaniyaya " + fmtMoney(cost) + " xərclədin." : ""}`;
    L.rep = clamp(L.rep - 3); if (incumbent) { if (office === "prezident") presEnd("seçkidə məğlub oldu"); else leaveOffice("seçkini uduzdu"); }
    apply({ happy: -10 }); return;
  }
  L.rep = clamp(L.rep + 4); P.fame = clamp(P.fame + { belediyye: 1, meclis: 3, prezident: 25 }[office]); apply({ happy: 15 });
  if (office === "prezident") {
    if (isPres()) { P.pres.term++; P.pres.until = Cal.addYears(P.pres.until, R.cycle.prezident); L.terms++; ctx.vars.pol_result = `Səslərin ${pct}%-i ilə yenidən prezident seçildin. ${P.pres.term}-ci müddət başlayır.`; log(`🗳️ Yenidən prezident seçildi (${pct}%).`); return; }
    presStart(); ctx.vars.pol_result = `Səslərin ${pct}%-i! Sən ölkənin prezidentisən. Andiçmə mərasimində əlini Konstitusiyanın üstünə qoyanda zal susdu.`; log(`🗳️ Prezident seçildi (${pct}%).`); return;
  }
  if (incumbent) { ctx.vars.pol_result = `Səslərin ${pct}%-i ilə mandatını qorudun.`; return; }
  setOffice(office, `seçki, ${pct}%`); ctx.vars.pol_result = `Səslərin ${pct}%-i ilə qalib gəldin! ${OFFICES[office].t} seçildin.`;
}

// ---------- the country (only while president) ----------
function presStart() {
  const R = polRules();
  P.pres = { start: P.day, startAge: P.age, until: Cal.addYears(P.day, R.cycle.prezident), term: 1, ended: null };
  P.ctry = P.ctry || { econ: 50, approval: 58, stability: 60, army: 50, loyalty: 55, edu: 50, health: 48, foreign: 50, corruption: 55, fund: 40, oil: 75, conscript: 18, acts: 3, hist: [] };
  P.ctry.acts = 3; P.flags.prezident = P.flags.prezident || P.age; pol().terms++;
  setOffice("prezident");
}
function presEnd(reason) {
  if (!isPres()) return;
  P.pres.ended = P.day; P.pres.reason = reason; P.pres.years = Math.round((P.day - P.pres.start) / 365.25);
  log(`🏛️ Prezidentlik başa çatdı: ${reason}.`); leaveOffice(reason); P.flags.exPrezident = P.age;
}
function ctryApply(fx) {
  const C = P.ctry, out = [];
  for (const [k, v] of Object.entries(fx)) {
    if (k === "fund") { C.fund = Math.round((C.fund + v) * 10) / 10; out.push(["fund", v]); }
    else if (k === "conscript") C.conscript = v;
    else if (CTRY_KEYS[k]) { const b = C[k]; C[k] = clamp(C[k] + v); if (C[k] !== b) out.push([k, C[k] - b]); }
  }
  return out;
}
// yearly: oil, budget, economy, the army and public mood move; term end; crises
function presTick(msgs) {
  if (!isPres()) return;
  const C = P.ctry, R = polRules();
  C.acts = 3;
  C.oil = clamp(C.oil + rnd(-14, 14), 35, 130);
  const revenue = 14 + C.econ * 0.22 + (C.oil - 60) * 0.18, spend = 16 + C.army * 0.05 + (C.edu + C.health) * 0.03;
  C.fund = Math.round((C.fund + revenue - spend) * 10) / 10;
  ctryApply({ econ: Math.round((C.oil - 75) / 15 - (C.corruption - 50) / 25 + rnd(-3, 3)), army: -2, edu: -1, health: -1, corruption: 1 });
  const target = C.econ * 0.35 + C.edu * 0.1 + C.health * 0.15 + C.stability * 0.15 + (100 - C.corruption) * 0.15 + C.foreign * 0.1;
  C.approval = clamp(Math.round(C.approval * 0.6 + target * 0.4 + (C.fund < 0 ? -6 : 0)));
  C.stability = clamp(Math.round(C.stability * 0.6 + (C.approval * 0.6 + C.loyalty * 0.4) * 0.4));
  C.loyalty = clamp(Math.round(C.loyalty * 0.85 + C.army * 0.15 + (C.fund < 0 ? -5 : 0)));
  C.hist.push({ age: P.age, approval: C.approval, econ: C.econ, army: C.army });
  apply({ happy: C.approval > 60 ? 2 : -3, health: -2 }); // the job wears you out
  msgs.push(`🏛️ Ölkə: dəstək ${C.approval}%, iqtisadiyyat ${C.econ}, ordu ${C.army}, ehtiyat fondu ${C.fund} mlrd ₼, neft ${C.oil}$.`);
  const sch = ev => { if (P.sched.some(s => s.event === ev)) return; P.sched.push({ event: ev, day: Cal.addMonths(P.day, rnd(1, 6)) }); P.sched.sort((a, b) => a.day - b.day); };
  if (C.approval < 25 && C.stability < 35) sch("pres_etiraz");
  if (C.loyalty < 30) sch("pres_generallar");
  if (P.day >= P.pres.until) {
    if (P.pres.term >= R.max_terms) presEnd("səlahiyyət müddəti bitdi");
    else sch("pres_yeniden");
  }
}
// decisions a president can take (3 a year)
const GOV_ACTIONS = [
  { id: "g_modern", cat: "Ordu", icon: "🛡️", t: "Ordunu modernləşdir (yeni texnika)", cost: 4, fx: { army: 9, foreign: -1 }, r: "Yeni hava hücumundan müdafiə sistemləri və zirehli texnika alındı. Generallar razıdır." },
  { id: "g_maas", cat: "Ordu", icon: "🎖️", t: "Hərbçilərin maaşını artır", cost: 2, fx: { loyalty: 12, army: 2 }, r: "Zabitlərin maaşı 20% artdı. Kazarmalarda əhval yaxşılaşdı." },
  { id: "g_telim", cat: "Ordu", icon: "🎯", t: "Böyük hərbi təlim keçir", cost: 1, fx: { army: 4, loyalty: 3, foreign: -3 }, r: "Üç gün davam edən təlimi tribunadan izlədin. Qonşu paytaxtlarda narahat bəyanatlar səsləndi." },
  { id: "g_pesekar", cat: "Ordu", icon: "🪖", t: "Peşəkar orduya keçid mərhələsi", cost: 3, if: () => P.ctry.conscript > 0, fx: () => ({ conscript: P.ctry.conscript > 12 ? 12 : 0, approval: 6, army: -3, loyalty: 2 }), r: () => P.ctry.conscript ? `Müddətli xidmət ${P.ctry.conscript} aya endirildi. Valideynlər sevinir, generallar narahatdır.` : "Müddətli xidmət ləğv edildi: ordu tam peşəkar oldu." },
  { id: "g_sulh", cat: "Ordu", icon: "🕊️", t: "Sülhməramlı missiyaya bölük göndər", cost: 1, fx: { foreign: 7, army: 2 }, r: "Bölük BMT mandatı ilə yola düşdü. Beynəlxalq mətbuat ölkənin adını hörmətlə çəkir." },
  { id: "g_senaye", cat: "Ordu", icon: "🏭", t: "Hərbi sənayeni inkişaf etdir", cost: 5, fx: { army: 4, econ: 3 }, r: "Yeni zavod açıldı: həm iş yeri, həm də öz istehsalımız olan dronlar." },
  { id: "g_vergi", cat: "İqtisadiyyat", icon: "💸", t: "Vergiləri azalt", cost: 3, fx: { approval: 7, econ: 3 }, r: "Kiçik biznes üçün vergi dərəcəsi endirildi. Bazarlarda adını xoş sözlə çəkirlər." },
  { id: "g_qeyrineft", cat: "İqtisadiyyat", icon: "🌾", t: "Qeyri-neft sektorunu dəstəklə", cost: 4, fx: { econ: 6, approval: 2 }, r: "Kənd təsərrüfatı və İT üçün güzəştli kreditlər açıldı. Nəticə illər sonra görünəcək." },
  { id: "g_invest", cat: "İqtisadiyyat", icon: "🤝", t: "Beynəlxalq investisiya forumu", cost: 1, fx: { foreign: 5, econ: 3 }, r: "Forumda 40 ölkədən şirkət iştirak etdi. Üç böyük müqavilə imzalandı." },
  { id: "g_infra", cat: "İqtisadiyyat", icon: "🚇", t: "Yollar və metro tikintisi", cost: 6, fx: { econ: 5, approval: 5, corruption: 3 }, r: "Yeni metro xətti və regionlara magistral yol. Podratçılar arasında isə şübhəli adlar var." },
  { id: "g_pensiya", cat: "Sosial", icon: "👵", t: "Pensiya və maaşları artır", cost: 4, fx: { approval: 9 }, r: "Pensiyalar 15% artdı. Növbəti ayın xəbərlərində ancaq bu danışılır." },
  { id: "g_tehsil", cat: "Sosial", icon: "🏫", t: "Təhsil islahatı və yeni məktəblər", cost: 3, fx: { edu: 8, approval: 3 }, r: "120 yeni məktəb, müəllimlərə yeni maaş sistemi. Bəhrəsini 10 ildən sonra görəcəksən." },
  { id: "g_sehiyye", cat: "Sosial", icon: "🏥", t: "Regionlarda xəstəxanalar tik", cost: 3, fx: { health: 8, approval: 3 }, r: "Rayonlarda müasir xəstəxanalar açıldı. İnsanlar artıq paytaxta getmək məcburiyyətində deyil." },
  { id: "g_korrupsiya", cat: "İdarəetmə", icon: "🧹", t: "Antikorrupsiya kampaniyası", cost: 0, fx: { corruption: -10, loyalty: -4, approval: 5, stability: -3 }, r: "Üç nazir müavini həbs olundu. Xalq alqışlayır, köhnə elitalar isə səndən küsüb." },
  { id: "g_media", cat: "İdarəetmə", icon: "🎤", t: "Böyük mətbuat konfransı", cost: 0, fx: () => ({ approval: P.tal.social > 60 ? 5 : rnd(-4, 4) }), r: () => P.tal.social > 60 ? "Üç saat sual-cavab. Ən çətin suala zarafatla cavab verdin, zal güldü." : "Jurnalistlərin sualları ağır idi. Bir cavabın sosial şəbəkədə məsxərəyə çevrildi." },
  { id: "g_sefer", cat: "İdarəetmə", icon: "✈️", t: "Rəsmi xarici səfər", cost: 0, fx: { foreign: 5, approval: 1 }, r: "Qırmızı xalça, fəxri qarovul, beş saziş. Təyyarədə geri qayıdanda ilk dəfə yorğunluğu hiss etdin." },
  { id: "g_azad", cat: "İdarəetmə", icon: "📰", t: "Mətbuat azadlığını genişləndir", cost: 0, fx: { corruption: -4, approval: 3, foreign: 4, stability: -4 }, r: "Müstəqil qəzetlərə lisenziya verildi. İlk tənqidi məqalələr elə sənin haqqında oldu." },
  { id: "g_hokumet", cat: "İdarəetmə", icon: "🔄", t: "Hökumətdə dəyişiklik et", cost: 0, fx: { approval: 4, stability: -2 }, r: "Beş nazir yeniləndi. Yeni üzlər, köhnə problemlər. Amma insanlar dəyişiklik gördü." }
];
const govAvailable = () => isPres() ? GOV_ACTIONS.filter(a => !a.if || a.if()) : [];
function doGov(id) {
  const a = GOV_ACTIONS.find(x => x.id === id), C = P.ctry;
  if (!a || C.acts <= 0) return null; if (C.fund < a.cost) return { text: "Ehtiyat fondunda bu qədər vəsait yoxdur.", changes: [] };
  C.acts--; const ch = ctryApply(Object.assign({ fund: -a.cost }, typeof a.fx === "function" ? a.fx() : a.fx));
  const text = typeof a.r === "function" ? a.r() : a.r; log(`${a.icon} ${a.t}.`); C.hist.push({ age: P.age, act: a.id });
  return { text, changes: ch.filter(([k, v]) => k !== "fund" || v) };
}

// ---------- yearly: careers before the presidency ----------
function polTick(msgs) {
  const L = pol(); if (!L) return;
  // small parties grow and shrink between elections
  P.parties = P.parties || Object.assign({}, polRules().party_strength);
  for (const k of Object.keys(P.parties)) if (k !== "bitaraf") P.parties[k] = clamp(P.parties[k] + rnd(-2, 2), 3, 60);
  if (inPrison()) { if (L.office) leaveOffice("həbs olundu, mandatdan məhrum edildi"); if (isPres()) presEnd("həbs"); return; }
  if (isPres()) { presTick(msgs); return; }
  L.rep = clamp(L.rep + (L.office ? rnd(-3, 3) : rnd(-2, 1)));
  if (L.office) L.cap += OFFICES[L.office].lv + 1;
  const sch = ev => { if (!P.sched.some(s => s.event === ev)) { P.sched.push({ event: ev, day: Cal.addMonths(P.day, rnd(2, 10)) }); P.sched.sort((a, b) => a.day - b.day); } };
  const office = L.office, lv = office ? OFFICES[office].lv : -1;
  if (electionYear("belediyye") && lv <= 0 && !canRun("belediyye")) sch("secki_belediyye");
  if (electionYear("meclis") && lv <= 1 && !canRun("meclis") && (lv >= 0 || L.rep >= 45 || P.fame >= 40)) sch("secki_meclis");
  if (electionYear("prezident") && !canRun("prezident")) sch("secki_prezident");
  if (office === "meclis" && L.cap >= 8 && chance(0.25)) sch("pol_komite");
  if ((office === "meclis" || office === "komite") && L.party === rulingParty() && L.cap >= 10 && chance(0.2)) sch("pol_nazir_teklif");
  if (office === "nazir_muavini" && L.cap >= 20 && L.rep >= 50 && chance(0.25)) sch("pol_nazir");
  if ((office === "nazir_muavini" || office === "nazir") && chance(0.08)) { leaveOffice("prezident fərmanı ilə vəzifədən azad edildi"); msgs.push("📜 Fərman çıxdı: vəzifədən azad olundun. Səbəb göstərilmədi."); }
}
