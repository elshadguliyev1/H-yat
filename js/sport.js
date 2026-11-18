/* Sports beyond football: a childhood section → competitions every year (district → Olympics) → injuries →
   a choice at 15–17 (professional sport or studies) → the "idmanci" career → retirement → coaching.
   Football keeps its own academy path (events). Numbers are a game configuration, not real federation rules. */
"use strict";

const SPORTS = {
  gules: { t: "Sərbəst güləş", icon: "🤼", g: "k", retire: 32 },
  cudo: { t: "Cüdo", icon: "🥋", retire: 32 },
  boks: { t: "Boks", icon: "🥊", g: "k", retire: 33 },
  taekvondo: { t: "Taekvondo", icon: "🦵", retire: 31 },
  voleybol: { t: "Voleybol", icon: "🏐", retire: 33, team: true },
  basketbol: { t: "Basketbol", icon: "🏀", retire: 34, team: true },
  gimnastika: { t: "Bədii gimnastika", icon: "🤸", g: "q", retire: 24 },
  uzguculuk: { t: "Üzgüçülük", icon: "🏊", retire: 29 },
  atletika: { t: "Yüngül atletika", icon: "🏃", retire: 33 },
  sahmat: { t: "Şahmat", icon: "♟️", retire: 65, mind: true }
};
// competition ladder: [name, minimum score to take part]
const SPORT_COMP = [["Rayon birinciliyi", 30], ["Bakı birinciliyi", 45], ["Azərbaycan çempionatı", 58], ["Avropa çempionatı", 72], ["Dünya çempionatı", 82], ["Olimpiya Oyunları", 90]];
const MEDAL = ["🥇 qızıl", "🥈 gümüş", "🥉 bürünc"];

let sportMsg = ""; // text of the last training session (the action shows it)
const sportsFor = g => Object.entries(SPORTS).filter(([, s]) => !s.g || s.g === g).map(([id]) => id);
const sportActive = () => !!(P.sport && P.sport.active);
const sportName = () => P.sport ? SPORTS[P.sport.id].t : "idman";
// how good the athlete is today: trained skill + natural talent (+ smarts for chess) + body
function sportLevel() {
  const s = P.sport, S = SPORTS[s.id];
  const base = S.mind ? P.st.smarts * 0.45 + P.tal.science * 0.15 : P.st.fitness * 0.3 + P.tal.sport * 0.25 + P.st.health * 0.05;
  const age = S.mind ? 0 : P.age > S.retire - 4 ? -(P.age - (S.retire - 4)) * 3 : 0;
  return clamp(Math.round(s.skill * 0.55 + base + age - (s.inj ? 12 : 0)));
}
function sportJoin(id) {
  if (!SPORTS[id]) throw new Error("naməlum idman: " + id);
  if (P.sport && P.sport.active) P.sport.active = false;
  P.sport = { id, start: P.age, skill: 8 + Math.round(P.tal.sport / 8), best: -1, medals: [], inj: 0, active: true, trained: 0 };
  if (!person("məşqçi")) { const c = addPerson("məşqçi", SPORTS[id].g || pick(["k", "q"]), rnd(35, 58)); c.job = "mesqci"; }
  log(`${SPORTS[id].icon} ${SPORTS[id].t} bölməsinə yazıldı.`);
}
function sportEnd(reason) {
  const s = P.sport; if (!s || !s.active) return;
  s.active = false; s.ended = P.age; s.reason = reason;
  if (P.job && P.job.id === "idmanci") endJob(reason);
  if (s.best >= 3 || (P.flags.idmanPro != null && s.best >= 2)) P.flags.exIdmanci = P.flags.exIdmanci || P.age;
  log(`${SPORTS[s.id].icon} ${SPORTS[s.id].t} ilə yollar ayrıldı: ${reason}.`);
}
// a training session (action). Returns the text to show.
function sportTrain() {
  const s = P.sport, S = SPORTS[s.id]; s.trained++;
  const gain = rnd(2, 4) + (P.tal.sport > 70 && !S.mind ? 1 : 0) + (S.mind && P.st.smarts > 70 ? 1 : 0);
  s.skill = clamp(s.skill + gain);
  if (!S.mind) apply({ fitness: rnd(2, 4), health: 1 }); else apply({ smarts: rnd(1, 3) });
  if (!S.mind && chance(0.03)) { s.inj = 1; apply({ health: -6, happy: -4 }); return "Məşqdə zədə aldın. Həkim bir neçə həftə fasilə dedi."; }
  return pick(S.mind ? ["Məşqçi ilə köhnə partiyaları təhlil etdiniz. Bir gambiti əzbərlədin.", "Onlayn turnirdə 30 partiya oynadın.", "Endşpil kitabını axıra qədər işlədin."]
    : S.team ? ["Komanda ilə iki saatlıq məşq. Ötürmələr getdikcə dəqiqləşir.", "Məşqçi səni əsas heyətlə oynatdı.", "Fiziki hazırlıq günü: qaçış, ştanq, yenə qaçış."]
    : ["Məşqdən sonra əzələlərin od tutub yanır, amma texnika yerinə oturur.", "Məşqçi hərəkəti on dəfə təkrarlatdı. On birincidə “Hə, bax belə!” dedi.", "Səhər tezdən zala ilk sən gəldin."]);
}
// yearly: growth, one main competition, injuries, the professional career and its end
function sportTick(msgs) {
  const s = P.sport; if (!s || !s.active) return;
  const S = SPORTS[s.id];
  if (inPrison()) { sportEnd("həbs"); return; }
  if (P.army && !P.army.done) { s.skill = clamp(s.skill - 3); s.trained = 0; return; }
  s.skill = clamp(s.skill + (s.trained ? 1 : -2) + (P.age <= 16 ? 2 : 0)); s.trained = 0;
  if (s.inj) { s.inj = chance(0.6) ? 0 : 1; }
  const pro = P.job && P.job.id === "idmanci";
  // hobbyists drift away as adults; children whose results stall may quit
  if (!pro && P.age >= 19 && P.flags.idmanPro == null && chance(0.35)) { sportEnd("həvəskar idman kimi qaldı"); return; }
  if (P.age >= S.retire && chance((P.age - S.retire + 1) / 4)) { sportEnd(pro ? "idman karyerasını bitirdi" : "yaş öz sözünü dedi"); if (pro) msgs.push(`${S.icon} Son yarışdan sonra ${sportName()}la vidalaşdın. Zalda hamı ayağa qalxıb alqışladı.`); return; }
  // the competition of the year
  const lvl = sportLevel(), score = lvl + rnd(-10, 10);
  let top = -1; SPORT_COMP.forEach(([, min], i) => { if (score >= min) top = i; });
  if (P.age < 11) top = Math.min(top, 0); else if (P.age < 14) top = Math.min(top, 1); else if (P.age < 17) top = Math.min(top, 3);
  if (top === 5 && Cal.toYMD(P.day).y % 4 !== 0) top = 4; // Olympics only every four years
  if (top >= 0) {
    const [name, min] = SPORT_COMP[top], margin = score - min;
    const place = margin >= 7 ? 0 : margin >= 3 ? 1 : margin >= 0 && chance(0.6) ? 2 : -1;
    const junior = P.age < 18 && top >= 3 ? " (gənclər arasında)" : "";
    if (place >= 0) {
      s.medals.push({ age: P.age, comp: top, place, junior: !!junior });
      if (top > s.best || (top === s.best && !junior)) s.best = top;
      P.fame = clamp(P.fame + [0, 1, 2, 5, 9, 15][top] * (place === 0 ? 1 : 0.6)); apply({ happy: 4 + top * 2 });
      msgs.push(`${S.icon} ${name}${junior}: ${MEDAL[place]} medal!`); log(`${MEDAL[place].split(" ")[0]} ${S.t}, ${name}${junior}: ${MEDAL[place].split(" ")[1]} medal.`);
      if (top >= 3 && !junior && pro) P.money += [0, 0, 0, 3000, 8000, 50000][top] * (place === 0 ? 1 : 0.5); // federation prize
    } else if (P.age >= 10) msgs.push(`${S.icon} ${name}: medal olmadı. Məşqçi dedi ki, gələn il.`);
  }
  // injuries: contact and high-load sports
  if (!S.mind && chance(0.05 + (P.age > 25 ? 0.03 : 0))) {
    if (chance(0.2) && P.age >= 16) { apply({ health: -18, happy: -12 }); msgs.push(`🩼 Ağır zədə. Həkimlər idmana qayıtmağı qadağan etdi.`); sportEnd("ağır zədə"); return; }
    s.inj = 1; apply({ health: -8 }); msgs.push(`🩹 Zədə: bir neçə ay məşq edə bilmədin.`);
  }
  // professional: results lift the career ladder (no automatic salary growth beyond the normal review)
  if (pro && !P.job.susp) {
    const target = s.best >= 5 ? 4 : s.best >= 4 ? 3 : s.best >= 3 ? 2 : s.best >= 2 ? 1 : 0;
    if (P.job.lv < target) promote(true);
  }
}
