/* Becoming a parent over time (not instantly): pregnancy across quarters with check-ups and an open question
   ("boy or girl?"), the birth as its own scene, maternity leave and its cost for a career, a father's choices.
   The quarter loop (advanceQuarter / ageUp) calls familyTick. */
"use strict";

const pregnant = () => !!(P.preg && !P.preg.done);
// starts a pregnancy with the spouse (self = the player carries the child)
function pregStart() {
  const sp = person("həyat yoldaşı"); if (!sp || pregnant()) return false;
  P.preg = { start: P.day, due: P.day + 270, self: P.g === "q", g: chance(0.51) ? "k" : "q", twins: chance(0.02), known: false, checks: 0, risk: false, done: false, spouse: sp.id };
  log(`🤰 ${P.preg.self ? "Hamilə olduğunu öyrəndin" : sp.name + " hamilədir"}. Doqquz ay sonra…`);
  return true;
}
const pregMonth = () => pregnant() ? Math.max(1, Math.round((P.day - P.preg.start) / 30.4)) : 0;
const babyWord = () => !P.preg ? "körpə" : P.preg.twins ? "əkizlər" : P.preg.g === "k" ? "oğlan" : "qız";
// every quarter: check-ups, a possible complication, the birth when it's due; the end of maternity leave
function familyTick() {
  const sch = (ev, months) => { if (P.sched.some(s => s.event === ev)) return; P.sched.push({ event: ev, day: Math.min(Cal.addMonths(P.day, months || 0) , P.preg && !P.preg.done ? P.preg.due : Infinity) }); P.sched.sort((a, b) => a.day - b.day); };
  if (pregnant()) {
    const m = pregMonth();
    if (m >= 3 && P.preg.checks === 0) { P.preg.checks = 1; sch("hamile_skrininq", 1); }
    else if (m >= 5 && P.preg.checks === 1) { P.preg.checks = 2; if (chance(0.12)) { P.preg.risk = true; sch("hamile_risk", 1); } }
    if (P.day >= P.preg.due - 95 && !P.sched.some(s => s.event === "dogum")) { P.sched.push({ event: "dogum", day: P.preg.due }); P.sched.sort((a, b) => a.day - b.day); }
  }
  if (P.dekret && !P.dekret.back && P.day >= P.dekret.until) sch("dekret_qayit", 0);
}
// the birth itself (from the "dogum" event)
function giveBirth() {
  const pr = P.preg; if (!pr || pr.done) return "";
  pr.done = true; P.flags.lastBirth = P.age;
  const kids = [];
  const k = addPerson("uşaq", pr.g, 0, { last: surname(P.fam, pr.g) }); kids.push(k); P.stats.kids++;
  if (pr.twins) { const g2 = chance(0.5) ? pr.g : (pr.g === "k" ? "q" : "k"); const k2 = addPerson("uşaq", g2, 0, { last: surname(P.fam, g2) }); kids.push(k2); P.stats.kids++; }
  P.pendingName = kids[0].id; // the twin gets the name the family had chosen
  P.money -= 1500; apply({ happy: 18, health: pr.self ? -6 : 0 });
  const sp = person("həyat yoldaşı"); if (sp) sp.rel = clamp(sp.rel + 10);
  log(`🍼 ${pr.twins ? "Əkizlər" : pr.g === "k" ? "Oğlu" : "Qızı"} dünyaya gəldi.`);
  // what comes next: a working mother chooses the length of her leave; a working father has his own dilemma
  if (pr.self && P.job && !P.job.susp) P.sched.push({ event: "dekret_secim", day: P.day + 14 });
  else if (!pr.self && P.job && !P.job.susp) P.sched.push({ event: "ata_mezuniyyet", day: P.day + 14 });
  P.sched.sort((a, b) => a.day - b.day);
  return pr.twins ? "Əkizlər!" : pr.g === "k" ? "Oğlan!" : "Qız!";
}
// maternity leave: the job is frozen; paid for 126 days, then a small childcare allowance until the chosen end
function dekretStart(months) {
  if (!P.job || P.job.susp) return;
  P.job.susp = true; P.dekret = { start: P.day, paid: Cal.addMonths(P.day, 4), until: Cal.addMonths(P.day, months), months, sal: salaryMonthlyRaw(), back: false };
  log(`👶 Analıq məzuniyyəti: ${months} ay.`);
}
function salaryMonthlyRaw() { return P.job ? P.job.sal || 0 : 0; }
function dekretEnd() {
  const d = P.dekret; if (!d || d.back) return; d.back = true;
  if (!P.job) return;
  P.job.susp = false; P.job.perf = clamp(55 - Math.max(0, d.months - 6)); P.job.boss = clamp((P.job.boss || 50) - Math.max(0, (d.months - 6) / 2));
  P.job.lvYears = Math.max(0, (P.job.lvYears || 0) - Math.round(d.months / 12)); // the promotion clock was paused
  log(`▶️ Analıq məzuniyyətindən işə qayıtdı: ${jobTitle()}.`);
}

// ---------- NPCs live their own lives (yearly): friends and siblings marry, move away, fall ill ----------
// Close ones turn into scenes for the player; distant ones are only a line in the life log.
function npcLifeTick(msgs) {
  const sch = (ev, p, flag) => { (P.npcFlags = P.npcFlags || {})[flag] = p.id; if (!P.sched.some(s => s.event === ev)) { P.sched.push({ event: ev, day: Cal.addMonths(P.day, rnd(1, 10)) }); P.sched.sort((a, b) => a.day - b.day); } };
  for (const p of P.people.filter(x => x.alive && ["dost", "qardaş", "bacı", "keçmiş sevgili"].includes(x.role) && x.age >= 20)) {
    if (!p.married && p.age >= 22 && p.age <= 40 && chance(0.06)) {
      p.married = P.age;
      if (p.rel >= 40 && !inPrison()) sch("npc_toy", p, "toy"); else { msgs.push(`💍 ${p.name} evləndi. Səni toya çağırmadılar.`); log(`💍 ${p.name} evləndi.`); }
    } else if (!p.moved && p.age >= 22 && chance(0.015)) {
      p.moved = pick(["Almaniyaya", "Kanadaya", "Dubaya", "Moskvaya", "İstanbula", "rayona"]);
      if (p.rel >= 45 && !inPrison()) sch("npc_kocur", p, "kocur"); else { msgs.push(`🧳 ${p.name} ${p.moved} köçdü.`); log(`🧳 ${p.name} ${p.moved} köçdü.`); }
    } else if (p.age >= 35 && chance(0.02) && p.rel >= 35) sch("npc_xeste", p, "xeste");
    if (p.moved) p.rel = clamp(p.rel - rnd(0, 2)); // distance cools friendships
  }
}
const npcMovedTo = () => { const id = P.npcFlags && P.npcFlags.kocur; const p = id && P.people.find(x => x.id === id); return p && p.moved ? p.moved : "uzağa"; };
