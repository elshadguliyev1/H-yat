/* Career engine — ladders, salary bands, hiring requirements, annual review, boss & company, raise / promotion
   requests, switching employer, licences (driving, aviation), flight hours, military rank history, transitions.
   Career definitions live in data/careers.json (loaded into CAREERS). Nothing here succeeds automatically:
   skill (stats), experience (years at level), performance, the boss, the company's finances and vacancies all count. */
"use strict";

let CAREERS = {}; // filled from data/careers.json
function loadCareers(json) { CAREERS = Object.fromEntries(Object.entries(json).filter(([k]) => !k.startsWith("_"))); }

const bandOf = (c, lv) => c.sal[Math.min(lv, c.sal.length - 1)];
const inBand = (c, lv, pos) => { const [a, b] = bandOf(c, lv); return Math.round(a + (b - a) * pos); };

// ---------- requirements ----------
function hasRecord() { return !!(P.legal && P.legal.record && P.legal.record.length); }
function medicalOk() { return P.st.health >= 65 && !P.flags.medical_fail; }
// does the player meet one hiring path / level requirement?
function reqOk(r) {
  if (!r) return true;
  if (r.deg && P.edu.degree !== r.deg) return false;
  if (r.any_degree && !P.edu.degree) return false;
  if (r.master && !P.edu.master) return false;
  if (r.flag && P.flags[r.flag] == null) return false;
  if (r.lic && !(P.lic && P.lic[r.lic])) return false;
  if (r.medical && !medicalOk()) return false;
  if (r.army_done && !(P.army && P.army.done)) return false;
  if (r.age && (P.age < r.age[0] || P.age > r.age[1])) return false;
  if (r.stat && !Object.entries(r.stat).every(([k, v]) => P.st[k] >= v)) return false;
  if (r.tal && !Object.entries(r.tal).every(([k, v]) => P.tal[k] >= v)) return false;
  if (r.money_gte && P.money < r.money_gte) return false;
  if (r.hours_gte && (P.hours || 0) < r.hours_gte) return false;
  return true;
}
// why a career is closed (shown to the player instead of silently hiding it)
function lockReason(id) {
  const c = CAREERS[id];
  if (c.record_ok === false && hasRecord()) return "məhkumluq qeydi olduğu üçün qəbul edilmir";
  const p = (c.paths || [])[0]; if (!p) return "bu yola yalnız hadisə ilə düşmək olar";
  if (p.deg) return `${(Object.values(FACULTIES).find(f => f.opens === p.deg) || {}).t || "uyğun"} diplomu lazımdır`;
  if (p.lic === "cpl") return "kommersiya pilotu lisenziyası (CPL) və tibbi uyğunluq lazımdır";
  if (p.lic === "surucu") return "sürücülük vəsiqəsi lazımdır";
  if (p.master) return "magistr dərəcəsi lazımdır";
  if (p.flag === "akademiya") return "futbol akademiyasından keçmək lazımdır";
  if (p.flag === "pese_mekteb" || p.flag === "pese_kursu") return "peşə məktəbi və ya peşə kursu lazımdır";
  if (p.stat) return "fiziki hazırlıq kifayət deyil";
  return "şərtlər ödənmir";
}

// ---------- jobs ----------
function jobTitle() { if (!P.job) return null; const c = CAREERS[P.job.id]; return c.lv[Math.min(P.job.lv, c.lv.length - 1)]; }
function startJob(id, lv, note, opts = {}) {
  const c = CAREERS[id];
  if (P.job) endJob("dəyişdi");
  if (lv == null) lv = ((c.paths || []).find(reqOk) || {}).lv || 0;
  P.job = { id, lv, years: 0, lvYears: 0, perf: 60, since: P.age, sal: opts.sal || inBand(c, lv, 0.15 + R() * 0.35),
    employer: opts.employer || pick(c.employers || ["—"]), boss: rnd(45, 65), company: rnd(40, 90) };
  P.stats.jobsHad++;
  careerLog(`${note || "İşə başladı"}: ${c.lv[lv]}`, "start");
  log(`${c.icon} ${note || "İşə başladı"}: ${c.lv[lv]} — ${P.job.employer} (${fmtMoney(P.job.sal)}/ay).`);
}
function careerLog(text, kind) { (P.careerHist = P.careerHist || []).push({ day: P.day, age: P.age, id: P.job ? P.job.id : null, title: jobTitle(), sal: P.job ? P.job.sal : 0, kind, text }); }
function endJob(reason) {
  if (!P.job) return;
  const c = CAREERS[P.job.id];
  careerLog(`İşdən ayrıldı (${reason})`, "end");
  P.jobs.push({ id: P.job.id, title: jobTitle(), from: P.job.since, to: P.age, reason, employer: P.job.employer });
  if (P.job.id === "futbolcu") P.flags.exFutbolcu = P.flags.exFutbolcu || P.age;
  P.job = null;
  return c;
}
// promotion to the next level, if the level's own requirement is met; salary moves into the new band
function promote(force) {
  const j = P.job, c = CAREERS[j.id];
  if (j.lv >= c.lv.length - 1) return false;
  const need = c.reqLv && c.reqLv[j.lv + 1];
  if (!force && need && !reqOk(need)) return false;
  j.lv++; j.lvYears = 0; j.perf = 55;
  j.sal = Math.max(j.sal, inBand(c, j.lv, 0.1 + R() * 0.4));
  careerLog(`Vəzifə: ${jobTitle()}`, "promo");
  log(`📈 ${c.track === "military" || c.track === "law" ? "Yeni rütbə" : "Vəzifə artımı"}: ${jobTitle()} (${fmtMoney(j.sal)}/ay)!`);
  return true;
}
function salaryMonthly() {
  if (!P.job || P.job.susp) return 0;
  if (P.job.id === "biznes") return P.job.income || 0;
  const s = P.job.sal || 0;
  return P.age < 18 && CAREERS[P.job.id].plain ? Math.round(s / 2) : s; // under 18: part-time only
}
// what the player can apply to now (only careers whose requirements are met)
function jobOptions() {
  const out = [];
  if (P.age < 16) return out;
  for (const [id, c] of Object.entries(CAREERS)) {
    if (P.job && P.job.id === id) continue;
    if (c.record_ok === false && hasRecord()) continue;
    if (P.age < 18 && !c.plain) continue;
    const path = (c.paths || []).find(reqOk); if (!path) continue;
    let odds = path.hire;
    const k = c.key === "health" ? P.st.health : P.st[c.key]; odds += (k - 50) / 400;
    if (hasRecord()) odds *= 0.5;
    out.push({ id, odds: clamp(odds, 0.05, 0.95), lv: path.lv || 0 });
  }
  return out;
}
// careers the player knows about but cannot enter yet (for the job screen)
function lockedJobs() { return Object.keys(CAREERS).filter(id => !jobOptions().some(o => o.id === id) && (!P.job || P.job.id !== id) && id !== "biznes"); }

// ---------- annual review ----------
function jobTick() {
  const j = P.job, c = CAREERS[j.id];
  if (j.susp) return;
  j.years++; j.lvYears = (j.lvYears || 0) + 1;
  const key = c.key === "health" ? P.st.health : P.st[c.key];
  j.perf = clamp(Math.round(j.perf * 0.5 + (key * 0.5 + (j.boss - 50) * 0.2 + rnd(0, 40)) * 0.5));
  j.boss = clamp(j.boss + rnd(-4, 3) + (j.perf > 70 ? 2 : j.perf < 35 ? -3 : 0));
  j.company = clamp(j.company + rnd(-12, 10));
  if (c.track === "aviation") P.hours = (P.hours || 0) + rnd(600, 850);
  if (c.unstable) { const months = rnd(5, 11); j.monthsWorked = months; }
  if (j.id === "biznes") { const base = [800, 3000, 9000, 25000, 80000][j.lv]; j.income = Math.round(base * (0.3 + R() * 1.4) * (P.st.smarts / 70)); if (chance(0.12)) { j.income = -Math.round(base * 0.8); log("📉 Biznes bu il ziyana düşdü."); } }
  if (j.id === "futbolcu" && P.age >= 33 && chance((P.age - 32) / 5)) { endJob("təqaüdə çıxdı"); log("⚽ Futbol karyerasını bitirdi. Stadion ayaq üstə alqışladı."); return; }
  // company in crisis → layoffs
  if (j.company < 18 && !["military", "law", "rescue"].includes(c.track) && chance(0.35)) { const t = jobTitle(); endJob("ixtisar"); log(`📉 ${t}: şirkət böhrana düşdü, ixtisara düşdün.`); apply({ happy: -12 }); return; }
  // military & police: promotions by years of service (if not a poor performer)
  const minY = (c.minYears || [])[j.lv] ?? 99;
  if (["military", "law", "rescue"].includes(c.track)) { if (j.lvYears >= minY && j.perf >= 45 && chance(0.6)) promote(); }
  // everyone else: promotion needs performance, experience, a vacancy (company health) and the boss's support
  else if (j.perf >= 70 && j.lvYears >= minY && chance(0.15 + j.company / 400 + j.boss / 400)) promote();
  else if (j.perf >= 55 && j.company >= 40 && chance(0.4)) { const [, mx] = bandOf(c, j.lv); const cap = Math.round(mx * 1.12), inc = Math.round(j.sal * (0.02 + R() * 0.05)); if (j.sal < cap) j.sal = Math.min(cap, j.sal + inc); }
  if (j.perf < 25 && chance(0.4)) { const t = jobTitle(); endJob("işdən çıxarıldı"); log(`📉 ${t} işindən çıxarıldı.`); apply({ happy: -15 }); return; }
  const retire = c.retire || 63;
  if (P.age >= retire && !c.sport && chance(P.age >= retire + 2 ? 1 : 0.5)) { endJob("təqaüd"); P.flags.teqaud = P.age; log("🏖️ Təqaüdə çıxdı."); }
}
// licences that come from experience
function licenceTick() {
  P.lic = P.lic || {};
  if (P.flags.vesiqe != null && P.flags.vesiqe <= P.age) P.lic.surucu = true;
  if (P.lic.cpl && !P.lic.atpl && (P.hours || 0) >= RULES.aviation.atpl_hours && P.age >= RULES.aviation.atpl_min_age && chance(P.st.smarts / 110)) { P.lic.atpl = P.age; log("🎫 ATPL (hava xətti pilotu) lisenziyasını aldı!"); }
  if (P.job && CAREERS[P.job.id].track === "aviation" && !medicalOk() && !P.job.susp) { P.job.susp = true; P.flags.grounded = P.age; log("🩺 Tibbi komissiyadan keçmədi: uçuşdan kənarlaşdırıldı."); }
  if (P.job && P.job.susp && P.flags.grounded != null && medicalOk() && !(P.army && !P.army.done)) { P.job.susp = false; delete P.flags.grounded; log("✈️ Tibbi komissiyadan keçdi, uçuşlara qayıtdı."); }
  if (P.flags.flight_school != null && P.age - P.flags.flight_school >= 2 && !P.lic.cpl) { P.lic.ppl = true; P.lic.cpl = P.age; P.hours = Math.max(P.hours || 0, 220); delete P.flags.flight_school; log("🎫 Uçuş məktəbini bitirdi: PPL və CPL lisenziyaları alındı (220 uçuş saatı)."); }
  if (P.flags.phd_basladi != null && P.age - P.flags.phd_basladi >= 3) { if (chance(P.st.smarts / 100)) { P.flags.phd = P.age; log("🎓 Dissertasiyanı müdafiə etdi: fəlsəfə doktoru!"); } else log("📄 Dissertasiyanın müdafiəsi bir il təxirə salındı."); if (P.flags.phd != null || P.age - P.flags.phd_basladi >= 5) delete P.flags.phd_basladi; }
  if (P.flags.pese_kurs_basladi != null && P.age - P.flags.pese_kurs_basladi >= 1) { P.flags.pese_kursu = P.age; delete P.flags.pese_kurs_basladi; log("🔧 Peşə kursunu bitirdi: sertifikat aldı."); }
}

// ---------- player actions at work ----------
// each returns {text, changes}
function askRaise() {
  const j = P.job, c = CAREERS[j.id], [, mx] = bandOf(c, j.lv);
  if (j.sal >= mx * 1.12) { j.boss = clamp(j.boss - 3); return { text: "Rəhbər: “Bu vəzifə üçün maaşın onsuz da ən yüksək həddədir. Artım istəyirsənsə, yüksəliş lazımdır.”" }; }
  const p = clamp(0.12 + (j.perf - 50) / 120 + (j.boss - 50) / 150 + (j.company - 50) / 200 + Math.min(j.lvYears, 4) * 0.04, 0.03, 0.85);
  if (chance(p)) { const before = j.sal; j.sal = Math.min(Math.round(mx * 1.12), Math.round(j.sal * (1.05 + R() * 0.1))); careerLog(`Maaş artımı: ${fmtMoney(before)} → ${fmtMoney(j.sal)}`, "raise"); return { text: `Rəhbər razılaşdı. Maaşın ${fmtMoney(before)} → ${fmtMoney(j.sal)}.`, changes: apply({ happy: 6 }) }; }
  j.boss = clamp(j.boss - (j.perf < 50 ? 10 : 5));
  return { text: j.company < 40 ? "Rəhbər: “Şirkətin vəziyyəti ağırdır, indi heç kimə artım verə bilmirik.”" : j.perf < 50 ? "Rəhbər: “Əvvəlcə nəticə göstər, sonra danışarıq.” Münasibətiniz bir az soyudu." : "Rəhbər: “Gələn il baxarıq.” Bu dəfə alınmadı.", changes: apply({ happy: -4 }) };
}
function askPromotion() {
  const j = P.job, c = CAREERS[j.id];
  if (j.lv >= c.lv.length - 1) return { text: "Artıq bu sahədə ən yüksək vəzifədəsən." };
  const need = c.reqLv && c.reqLv[j.lv + 1];
  if (need && !reqOk(need)) return { text: `${c.lv[j.lv + 1]} vəzifəsi üçün əlavə şərt var: ${need.lic === "atpl" ? "ATPL lisenziyası və 3000 uçuş saatı" : need.flag === "phd" ? "fəlsəfə doktoru dərəcəsi" : need.deg ? "müvafiq ali hərbi təhsil" : need.money_gte ? fmtMoney(need.money_gte) + " kapital" : need.hours_gte ? need.hours_gte + " uçuş saatı" : "daha yüksək ixtisas"}.` };
  const minY = (c.minYears || [])[j.lv] ?? 3;
  if (j.lvYears < minY - 1) return { text: `Rəhbər: “Bu vəzifədə cəmi ${j.lvYears} ildir işləyirsən. Hələ tezdir.”`, changes: apply({ happy: -2 }) };
  const vacancy = j.company > 35 && chance(0.4 + j.company / 250);
  const p = clamp(0.08 + (j.perf - 60) / 100 + (j.boss - 50) / 200 + (j.lvYears - minY) * 0.05, 0.03, 0.8);
  if (vacancy && chance(p) && promote()) return { text: `Təbriklər! ${jobTitle()} vəzifəsinə təyin olundun.`, changes: apply({ happy: 12 }) };
  j.boss = clamp(j.boss - 4);
  return { text: !vacancy ? "Hazırda boş vəzifə yoxdur. Rəhbər dedi ki, yer açılanda adını yadda saxlayacaq." : "Komissiya başqa namizədi seçdi.", changes: apply({ happy: -5 }) };
}
function improveBoss() { const j = P.job; const d = rnd(6, 13); j.boss = clamp(j.boss + d); return { text: pick(["Rəhbərlə nahar etdiniz, iş planlarını müzakirə etdiniz.", "Layihədə rəhbərin ən çətin tapşırığını öz üzərinə götürdün.", "Rəhbərin ad gününü komanda ilə birlikdə təbrik etdin."]) }; }
function switchEmployer() {
  const j = P.job, c = CAREERS[j.id];
  if (["military", "law", "rescue"].includes(c.track)) return { text: "Dövlət xidmətində iş yeri öz istəyinlə dəyişmir — yalnız təyinatla." };
  const p = clamp(0.2 + (j.perf - 50) / 150 + (P.st.smarts - 50) / 300 + Math.min(j.years, 6) * 0.04, 0.05, 0.75);
  if (!chance(p)) return { text: "Müsahibələrə getdin, amma təklif gəlmədi. Hələlik köhnə yerindəsən.", changes: apply({ happy: -3 }) };
  const others = (c.employers || []).filter(e => e !== j.employer);
  const up = j.perf >= 75 && j.lvYears >= ((c.minYears || [])[j.lv] ?? 99) && j.lv < c.lv.length - 1 && chance(0.4);
  const before = j.sal, lv = j.lv + (up ? 1 : 0);
  const sal = Math.max(Math.round(j.sal * (1.08 + R() * 0.2)), inBand(c, lv, 0.2));
  const keepYears = j.years;
  startJob(j.id, lv, `Yeni iş yerinə keçdi${up ? " (daha yüksək vəzifəyə)" : ""}`, { sal, employer: others.length ? pick(others) : j.employer });
  P.job.years = keepYears;
  return { text: `${P.job.employer} səni götürdü: ${jobTitle()}, maaş ${fmtMoney(before)} → ${fmtMoney(P.job.sal)}.`, changes: apply({ happy: 8 }) };
}

// ---------- investments ----------
const INVEST = {
  depozit: { t: "Bank depoziti", icon: "🏦", min: 500, note: "Təhlükəsiz, illik ~7%" },
  sehm: { t: "Səhmlər", icon: "📈", min: 1000, note: "Riskli: il ərzində −30%…+40%" },
  kiraye: { t: "Kirayə üçün mənzil", icon: "🏢", min: 60000, note: "Hər il kirayə gəliri, dəyəri yavaş artır" }
};
function invest(kind, amount) {
  const I = INVEST[kind]; if (!I || amount < I.min || amount > P.money) return null;
  P.money -= amount; P.assets.push({ type: kind, t: I.t, value: amount, since: P.age, cost: amount });
  return `${I.icon} ${I.t}: ${fmtMoney(amount)} yatırıldı.`;
}
function investTick() {
  for (const a of P.assets) {
    if (a.type === "depozit") a.value = Math.round(a.value * (1.05 + R() * 0.04));
    if (a.type === "sehm") a.value = Math.max(0, Math.round(a.value * (0.7 + R() * 0.7)));
    if (a.type === "kiraye") { a.value = Math.round(a.value * (1.01 + R() * 0.04)); P.money += Math.round(a.value * 0.05); }
  }
}
