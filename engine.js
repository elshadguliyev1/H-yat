/* Həyat, sən nə qəribəsən — game engine: state, yearly loop, careers, people, social network.
   Events live in events.js (EVENTS array); UI lives in index.html. */
"use strict";

// ---------- helpers ----------
const R = () => RNG.next(); // seeded per life (js/core.js)
const rnd = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = a => a[Math.floor(R() * a.length)];
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const chance = p => R() < p;
const fmtMoney = v => (v < 0 ? "−" : "") + Math.round(Math.abs(v)).toLocaleString("az").replace(/,/g, " ") + " ₼";
const ord = n => n + ([1,2,5,7,8].includes(n % 10) || n % 100 === 11 || n % 100 === 12 ? "-ci" : [3,4].includes(n % 10) || n % 100 === 100 ? "-cü" : n % 10 === 6 ? "-cı" : "-cu");
const fmtNum = v => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(".", ",") + " mln" : v >= 1e4 ? Math.round(v / 1e3) + " min" : String(Math.round(v));

const NAMES = {
  k: ["Murad","Elvin","Rauf","Kənan","Tural","Orxan","Fərid","Nihad","Ramil","Səbuhi","Anar","Elnur","Cavid","Rəşad","Vüqar","Toğrul","Emin","Nicat","Ülvi","Samir","Fuad","Rüstəm","Elçin","İlkin","Ruslan","Zaur","Fərhad","Kamran","Əli","Hüseyn"],
  q: ["Aysel","Leyla","Nərmin","Günay","Səbinə","Aytən","Lalə","Nigar","Fidan","Könül","Aynur","Səma","Zəhra","Ülkər","Röya","Nərgiz","Gülnar","Xəyalə","Aidə","Sevinc","Mələk","Aygün","Türkan","Şəbnəm","Lamiyə","Esmira","Gülşən","Arzu","Nurlana","Fatimə"]
};
const SURN = ["Məmmədov","Əliyev","Həsənov","Hüseynov","Quliyev","Kərimov","İsmayılov","Abbasov","Rzayev","Səfərov","Nəsirov","Cəfərov","Bayramov","Qasımov","Vəliyev","Orucov","Mustafayev","Babayev"];
const surname = (base, g) => g === "q" ? base + "a" : base;
const CITIES = ["Bakı","Gəncə","Sumqayıt","Lənkəran","Şəki","Mingəçevir","Quba","Naxçıvan","Şamaxı","Qəbələ"];

// ---------- careers ----------
// level titles, monthly salary per level, how they are entered (see events / job search)
const CAREERS = {
  polis:     { t: "Polis", icon: "👮", lv: ["Leytenant","Baş leytenant","Kapitan","Mayor","Polkovnik"], sal: [700, 900, 1200, 1700, 2600], key: "fitness", fame: 0 },
  hekim:     { t: "Həkim", icon: "🩺", lv: ["Rezident həkim","Həkim","Baş həkim","Şöbə müdiri","Professor"], sal: [600, 1100, 1800, 2800, 4200], key: "smarts", fame: 0 },
  futbolcu:  { t: "Futbolçu", icon: "⚽", lv: ["Gənclər komandası","Əsas heyət","Klubun ulduzu","Avropa klubu","Dünya ulduzu"], sal: [500, 2500, 8000, 40000, 150000], key: "fitness", fame: 6, sport: true },
  mugenni:   { t: "Müğənni", icon: "🎤", lv: ["Toy müğənnisi","Yeni səs","Tanınan müğənni","Məşhur müğənni","Səhnə ulduzu"], sal: [600, 1200, 3500, 9000, 25000], key: "looks", fame: 7 },
  muellim:   { t: "Müəllim", icon: "📚", lv: ["Gənc müəllim","Müəllim","Baş müəllim","Direktor müavini","Məktəb direktoru"], sal: [500, 650, 800, 1000, 1400], key: "smarts", fame: 0 },
  proqramci: { t: "Proqramçı", icon: "💻", lv: ["Junior proqramçı","Middle proqramçı","Senior proqramçı","Komanda rəhbəri","Texniki direktor"], sal: [700, 1300, 2200, 3200, 4500], key: "smarts", fame: 0 },
  biznes:    { t: "Biznesmen", icon: "💼", lv: ["Kiçik dükan sahibi","Şirkət sahibi","Uğurlu biznesmen","Holdinq rəhbəri","Milyonçu"], sal: [0, 0, 0, 0, 0], key: "smarts", fame: 2 },
  aktyor:    { t: "Aktyor", icon: "🎭", lv: ["Teatr aktyoru","Serial aktyoru","Tanınan aktyor","Kino ulduzu","Xalq artisti"], sal: [450, 1100, 3000, 8000, 15000], key: "looks", fame: 6 },
  // ordinary jobs (no degree)
  kuryer:    { t: "Kuryer", icon: "🛵", lv: ["Kuryer","Baş kuryer"], sal: [550, 700], key: "fitness", fame: 0, plain: true },
  ofisiant:  { t: "Ofisiant", icon: "🍽️", lv: ["Ofisiant","Baş ofisiant"], sal: [450, 650], key: "looks", fame: 0, plain: true },
  satici:    { t: "Satıcı", icon: "🛒", lv: ["Satıcı","Mağaza müdiri"], sal: [500, 900], key: "looks", fame: 0, plain: true },
  taksi:     { t: "Taksi sürücüsü", icon: "🚕", lv: ["Taksi sürücüsü"], sal: [800], key: "health", fame: 0, plain: true },
  ofis:      { t: "Ofis işçisi", icon: "🗂️", lv: ["Ofis işçisi","Şöbə rəhbəri"], sal: [700, 1300], key: "smarts", fame: 0, plain: true }
};
const DREAMS = [
  { id: "polis", t: "Polis", icon: "👮" }, { id: "hekim", t: "Həkim", icon: "🩺" }, { id: "futbolcu", t: "Futbolçu", icon: "⚽" },
  { id: "mugenni", t: "Müğənni", icon: "🎤" }, { id: "muellim", t: "Müəllim", icon: "📚" }, { id: "proqramci", t: "Proqramçı", icon: "💻" },
  { id: "biznes", t: "Biznesmen", icon: "💼" }, { id: "aktyor", t: "Aktyor", icon: "🎭" }
];
// university faculties → which career they open
const FACULTIES = {
  tibb:   { t: "Tibb Universiteti", need: 72, opens: "hekim", years: 6 },
  akad:   { t: "Polis Akademiyası", need: 50, opens: "polis", years: 4, fit: 55 },
  it:     { t: "İnformatika (ADA / Texniki Universitet)", need: 62, opens: "proqramci", years: 4 },
  ped:    { t: "Pedaqoji Universitet", need: 45, opens: "muellim", years: 4 },
  incesenet: { t: "Mədəniyyət və İncəsənət Universiteti", need: 40, opens: "aktyor", years: 4 },
  konserv:{ t: "Konservatoriya", need: 40, opens: "mugenni", years: 4, music: 55 },
  iqtisad:{ t: "İqtisad Universiteti", need: 55, opens: "biznes", years: 4 }
};

// ---------- state ----------
let P = null;
let RULES = null; // data/rules.json (military, education)
const LIFE_VERSION = 2;
const TRAITS = { empathy: "Empatiya", honesty: "Dürüstlük", courage: "Cəsarət", discipline: "İntizam", independence: "Müstəqillik", family: "Ailəyə bağlılıq", social: "Ünsiyyətcillik" };

function newPerson(role, gender, age, extra = {}) {
  const used = new Set(P ? [P.name, ...P.people.map(x => x.name)] : []);
  const free = NAMES[gender].filter(n => !used.has(n));
  return Object.assign({ id: "n" + Math.floor(R() * 2176782336).toString(36), role, g: gender, name: pick(free.length ? free : NAMES[gender]), age, rel: rnd(55, 85), alive: true }, extra);
}
function newLife(name, gender, city, dream, seed) {
  seed = seed == null ? RNG.newSeed() : seed >>> 0;
  P = { rng: seed }; // so the very first draws are already seeded
  const fam = pick(SURN);
  const t = Cal.toYMD(Cal.today());
  const birth = Cal.fromYMD(t.y - 5, rnd(1, 12), rnd(1, 28));
  P = {
    v: LIFE_VERSION, id: "L" + Date.now().toString(36) + seed.toString(36), seed, rng: seed,
    birth, day: Cal.addYears(birth, 5), tr: Object.fromEntries(Object.keys(TRAITS).map(k => [k, 50])), sched: [], hist: [], npcFlags: {},
    name, g: gender, city, fam, dream, born: t.y - 5, age: 5, alive: true, cause: null,
    st: { health: rnd(70, 95), happy: rnd(65, 90), smarts: rnd(25, 70), fitness: rnd(25, 70), looks: rnd(25, 80) },
    money: 0, fame: 0,
    tal: { sport: rnd(5, 95), music: rnd(5, 95), acting: rnd(5, 95), science: rnd(5, 95), social: rnd(5, 95) },
    edu: { stage: "bagca", grade: 0, gpa: 70, fac: null, uniYear: 0, degree: null },
    job: null, jobs: [], army: null,
    people: [], soc: null, log: [], flags: {}, seen: {}, assets: [], acts: 3, yearEvents: [],
    stats: { posts: 0, maxFollowers: 0, kids: 0, jobsHad: 0, countries: 0, crimes: 0 }
  };
  const famBase = fam;
  P.people.push(newPerson("ana", "q", rnd(25, 36), { last: surname(famBase, "q") }));
  P.people.push(newPerson("ata", "k", rnd(27, 40), { last: surname(famBase, "k") }));
  const sib = rnd(0, 2);
  for (let i = 0; i < sib; i++) { const g = pick(["k", "q"]); P.people.push(newPerson(g === "k" ? "qardaş" : "bacı", g, rnd(1, 12))); }
  log(`${name} ${city} şəhərində doğuldu. Ailəsi: anası ${who("ana")}, atası ${who("ata")}.`, 0);
  log(`İndi ${name} 5 yaşındadır və bağçaya gedir. Böyüyəndə ${dreamName()} olmaq istəyir.`);
  save();
}
const dreamName = () => (DREAMS.find(d => d.id === P.dream) || {}).t?.toLowerCase() || "?";

// ---------- people ----------
const person = role => P.people.find(p => p.role === role && p.alive);
const people = role => P.people.filter(p => p.role === role && p.alive);
const who = role => { const p = person(role); return p ? p.name : "?"; };
function relAdd(role, d) { for (const p of people(role)) p.rel = clamp(p.rel + d); }
function addPerson(role, gender, age, extra) { const p = newPerson(role, gender, age, extra); P.people.push(p); return p; }
function removeRole(role, note) { for (const p of people(role)) { p.role = "keçmiş " + role; if (note) p.note = note; } }

// ---------- log ----------
function log(text, age = P.age) {
  let y = P.log.find(l => l.age === age);
  if (!y) { y = { age, items: [] }; P.log.push(y); }
  y.items.push(text);
}

// ---------- stats ----------
const STAT_KEYS = ["health", "happy", "smarts", "fitness", "looks"];
const STAT_NAMES = { health: "Sağlamlıq", happy: "Xoşbəxtlik", smarts: "Ağıl", fitness: "İdman", looks: "Görünüş", money: "Pul", fame: "Şöhrət", followers: "İzləyici" };
const STAT_ICONS = { health: "❤️", happy: "😊", smarts: "🧠", fitness: "💪", looks: "✨", money: "💰", fame: "⭐", followers: "👥" };
// apply an effect object; returns list of human-readable changes
function apply(fx) {
  const out = [];
  if (!fx) return out;
  for (const k of STAT_KEYS) if (fx[k]) { const before = P.st[k]; P.st[k] = clamp(P.st[k] + fx[k]); const d = P.st[k] - before; if (d) out.push([k, d]); }
  if (fx.money) { P.money += fx.money; out.push(["money", fx.money]); }
  if (fx.fame) { const b = P.fame; P.fame = clamp(P.fame + fx.fame); if (P.fame !== b) out.push(["fame", P.fame - b]); }
  if (fx.followers && P.soc) { const b = P.soc.followers; P.soc.followers = Math.max(0, Math.round(P.soc.followers + (fx.followers > -1 && fx.followers < 1 && fx.followers !== 0 ? P.soc.followers * fx.followers : fx.followers))); if (P.soc.followers !== b) out.push(["followers", P.soc.followers - b]); }
  if (fx.rel) for (const [role, d] of Object.entries(fx.rel)) relAdd(role, d);
  if (fx.tal) for (const [k, d] of Object.entries(fx.tal)) P.tal[k] = clamp(P.tal[k] + d);
  if (fx.flag) for (const f of [].concat(fx.flag)) P.flags[f] = P.age;
  if (fx.unflag) for (const f of [].concat(fx.unflag)) delete P.flags[f];
  if (fx.perf && P.job) P.job.perf = clamp(P.job.perf + fx.perf);
  return out;
}

// ---------- jobs ----------
function jobTitle() { if (!P.job) return null; const c = CAREERS[P.job.id]; return c.lv[Math.min(P.job.lv, c.lv.length - 1)]; }
function startJob(id, lv = 0, note) {
  if (P.job) endJob("dəyişdi");
  P.job = { id, lv, years: 0, perf: 60, since: P.age };
  P.stats.jobsHad++;
  const c = CAREERS[id];
  log(`${c.icon} ${note || "İşə başladı"}: ${c.lv[lv]} (${fmtMoney(c.sal[Math.min(lv, c.sal.length - 1)])}/ay).`);
}
function endJob(reason) {
  if (!P.job) return;
  const c = CAREERS[P.job.id];
  P.jobs.push({ id: P.job.id, title: jobTitle(), from: P.job.since, to: P.age, reason });
  P.job = null;
  return c;
}
function promote() {
  const c = CAREERS[P.job.id]; if (P.job.lv >= c.lv.length - 1) return false;
  P.job.lv++; P.job.perf = 55;
  log(`📈 Vəzifə artımı: ${jobTitle()}!`); return true;
}
function salaryMonthly() {
  if (!P.job) return 0;
  const c = CAREERS[P.job.id];
  if (P.job.id === "biznes") return P.job.income || 0;
  return c.sal[Math.min(P.job.lv, c.sal.length - 1)];
}
// what jobs can the player apply to right now
function jobOptions() {
  const o = [];
  const s = P.st, deg = P.edu.degree;
  if (P.age < 16) return o;
  o.push({ id: "kuryer", odds: 0.85 }, { id: "ofisiant", odds: 0.7 + s.looks / 500 }, { id: "satici", odds: 0.75 });
  if (P.age >= 18 && P.flags.vesiqe) o.push({ id: "taksi", odds: 0.85 });
  if (P.age >= 18 && (deg || s.smarts > 60)) o.push({ id: "ofis", odds: deg ? 0.7 : 0.35 });
  if (deg === "polis" || (P.army && P.army.done && s.fitness >= 60 && P.age <= 30)) o.push({ id: "polis", odds: deg === "polis" ? 0.9 : 0.4 });
  if (deg === "hekim") o.push({ id: "hekim", odds: 0.85 });
  if (deg === "muellim") o.push({ id: "muellim", odds: 0.9 });
  if (deg === "proqramci" || P.flags.kodYazir) o.push({ id: "proqramci", odds: deg === "proqramci" ? 0.75 : 0.35 + s.smarts / 400 });
  if (deg === "aktyor" || P.tal.acting > 70) o.push({ id: "aktyor", odds: deg === "aktyor" ? 0.6 : 0.2 });
  if (deg === "mugenni" || P.tal.music > 70) o.push({ id: "mugenni", odds: deg === "mugenni" ? 0.6 : 0.25 });
  return o.filter(x => !P.job || P.job.id !== x.id);
}

// ---------- social network ("Pıçıltı") ----------
function socOpen() { if (!P.soc) P.soc = { handle: "@" + P.name.toLowerCase().replace(/[^a-zəığöşüç0-9]/g, "") + "_" + rnd(10, 99), followers: rnd(8, 40), posts: [], verified: false, feed: [] }; }
const POST_TYPES = [
  { id: "selfi", t: "Selfi", icon: "🤳", min: 12, q: () => P.st.looks, txt: ["Bu günün əhvalı ☀️", "Yeni saç düzümü, necədir? 💇", "Güzgü, güzgü… 😎", "Səhər-səhər 📸"] },
  { id: "gundelik", t: "Gündəlik həyat", icon: "☕", min: 12, q: () => 45, txt: ["Çay, kitab və yağış ☕🌧️", "Bu gün nə qədər yorğunam 😴", "Bakının küləyi yenə başladı 🌬️", "Bazar günü planı: heç nə 🛋️"] },
  { id: "idman", t: "İdman", icon: "🏋️", min: 13, q: () => P.st.fitness, txt: ["Məşq bitdi 💪", "Bu gün 10 km qaçdım 🏃", "Zalda yeni rekord 🏋️", "İdman həyatdır ⚽"] },
  { id: "mahni", t: "Mahnı oxu", icon: "🎶", min: 12, q: () => P.tal.music, txt: ["Bir parça oxudum, qulaq asın 🎤", "Gecə yarısı gitara ilə 🎸", "Muğamdan bir parça 🎶"] },
  { id: "is", t: "İşdən paylaşım", icon: "💼", min: 18, need: () => !!P.job, q: () => 40 + P.job.lv * 10, txt: () => [`İş günü başladı ${CAREERS[P.job.id].icon}`, `Komandamla fəxr edirəm 🙌`, `${jobTitle()} kimi daha bir gün`] },
  { id: "aile", t: "Ailə fotosu", icon: "👨‍👩‍👧", min: 14, q: () => 55, txt: ["Ailəmlə 💛", "Anamın dolması dünyada birincidir 🍇", "Bayram süfrəsi 🎉"] },
  { id: "mubahise", t: "Mübahisəli fikir", icon: "🔥", min: 15, risky: true, q: () => 50, txt: ["Hamı səhv edir, mən deyəndir! 🔥", "Bu ölkədə futbol niyə inkişaf etmir? Səbəbi aydındır…", "Toyları qısaldın, artıq bəsdir!", "Plov yox, dolma milli yeməkdir 😤"] },
  { id: "klub", t: "Gecə əyləncəsi", icon: "🪩", min: 18, risky: true, q: () => P.st.looks, txt: ["Gecə hələ təzə başlayır 🪩", "Dostlarla səhərə qədər 🎉", "Bu gecəni unutmayacağam 🥂"] },
  { id: "reklam", t: "Reklam (pul)", icon: "💸", min: 16, need: () => P.soc && P.soc.followers >= 10000, q: () => 30, txt: ["Bu kremi hamıya məsləhət görürəm ✨ #reklam", "Ən dadlı şaurma burdadır 🌯 #reklam", "Yeni telefonum 📱 #reklam"] }
];
const COMM_POS = ["Əla! 👏", "Çox gözəl 😍", "Afərin 🔥", "Ürəyimə yatdı ❤️", "Super!", "Davam et 💪", "Qəşəng", "Maşallah 🧿", "Bu lap başqadır", "Ən yaxşısı sənsən"];
const COMM_NEG = ["Bu nədir belə? 😒", "Heç xoşuma gəlmədi", "Özünü nə sanırsan?", "Boş-boş şeylər 🙄", "Ayıb olsun", "Səndən gözləməzdim", "Kim maraqlanır?", "Biabırçılıq"];
const COMM_FUN = ["Hahaha 😂", "Mən də istəyirəm", "Haradır bura?", "Bizi də çağır 😅", "Nənəm də belə deyirdi", "Kim gəlir bura?"];
function makePost(typeId) {
  socOpen();
  const T = POST_TYPES.find(x => x.id === typeId);
  const texts = typeof T.txt === "function" ? T.txt() : T.txt;
  const text = pick(texts);
  const f = P.soc.followers;
  const quality = clamp(T.q() * 0.6 + P.st.looks * 0.2 + P.tal.social * 0.2 + rnd(-15, 15));
  let viral = chance(0.02 + quality / 2500 + (T.risky ? 0.03 : 0));
  let likes = Math.round(f * (0.04 + quality / 600) * (0.6 + R() * 0.8) + rnd(0, 6));
  let gain = Math.round(f * (quality - 40) / 900 * (0.3 + P.fame / 100) + quality / 8 + P.fame * 2 + rnd(-3, 6));
  if (viral) { const m = rnd(8, 40); likes = Math.round(likes * m + rnd(500, 3000)); gain = Math.round(gain * m / 2 + rnd(800, 6000)); }
  const comments = [];
  const nC = Math.min(4, 1 + Math.floor(likes / 40) + (viral ? 2 : 0));
  const negShare = T.risky ? 0.45 : quality < 35 ? 0.35 : 0.12;
  const commenters = P.people.filter(p => p.alive && p.age >= 12 && !p.role.startsWith("keçmiş"));
  for (let i = 0; i < nC; i++) {
    const fromFriend = commenters.length && chance(0.4);
    const author = fromFriend ? pick(commenters) : { name: pick(NAMES[pick(["k", "q"])]), role: null };
    const neg = !fromFriend && chance(negShare);
    comments.push({ a: author.name + (author.role ? ` (${author.role})` : ""), t: neg ? pick(COMM_NEG) : chance(0.3) ? pick(COMM_FUN) : pick(COMM_POS), neg });
  }
  P.soc.followers = Math.max(0, f + gain);
  P.stats.posts++; P.stats.maxFollowers = Math.max(P.stats.maxFollowers, P.soc.followers);
  const post = { age: P.age, type: T.id, icon: T.icon, text, likes: Math.max(0, likes), gain, viral, comments };
  P.soc.posts.unshift(post); P.soc.posts = P.soc.posts.slice(0, 60);
  // consequences
  const extra = [];
  if (viral) { P.fame = clamp(P.fame + rnd(3, 8)); extra.push("🔥 Paylaşım viral oldu! Hər kəs səndən danışır."); }
  if (T.id === "reklam") { const pay = Math.round(P.soc.followers * (0.004 + R() * 0.006)); P.money += pay; extra.push(`💸 Reklamdan ${fmtMoney(pay)} qazandın.`); if (chance(0.25)) { P.soc.followers = Math.round(P.soc.followers * 0.97); extra.push("Bəzi izləyicilər çox reklamdan bezib getdi."); } }
  if (T.risky) {
    if (P.job && ["polis", "muellim", "hekim"].includes(P.job.id) && chance(0.3)) { P.job.perf = clamp(P.job.perf - 25); extra.push(`⚠️ Müdiriyyət paylaşımını görüb sənə xəbərdarlıq etdi. ${P.job.id === "muellim" ? "Valideynlər şikayət yazıb." : ""}`); P.flags.xeberdarliq = (P.flags.xeberdarliq || 0) + 1; }
    else if (P.job && ["futbolcu", "mugenni", "aktyor"].includes(P.job.id) && chance(0.25)) { const fine = Math.round(salaryMonthly() * 0.5); P.money -= fine; P.fame = clamp(P.fame + 2); extra.push(`⚠️ Skandal! Mətbuat yazdı, ${fmtMoney(fine)} cərimə ödədin, amma adın daha çox eşidildi.`); }
    else if (chance(0.2)) { P.st.happy = clamp(P.st.happy - 8); extra.push("Şərhlərdə böyük mübahisə düşdü, əsəbləşdin."); }
    if (P.age < 18 && chance(0.4)) { relAdd("ana", -6); relAdd("ata", -6); extra.push("Valideynlərin paylaşımı görüb əsəbləşdi."); }
  }
  if (!P.soc.verified && P.soc.followers >= 100000) { P.soc.verified = true; extra.push("✔️ Hesabın təsdiqləndi (mavi nişan)!"); }
  if (P.soc.followers >= 50000 && P.fame < 30) P.fame = clamp(P.fame + 2);
  post.extra = extra;
  log(`${T.icon} Pıçıltı-da paylaşdı: "${text}" — ${fmtNum(post.likes)} bəyənmə${viral ? ", viral oldu!" : "."}`);
  return post;
}
// friends' posts shown in the feed each year
function feedTick() {
  if (!P.soc) return;
  const ppl = P.people.filter(p => p.alive && p.age >= 13 && !p.role.startsWith("keçmiş"));
  const lines = {
    any: ["Bu gün çox gözəl gün idi ☀️", "Kim çaya gəlir? ☕", "Yeni telefon aldım 📱", "Dəniz kənarında 🌊", "Həftəsonu Qəbələdə 🏔️", "Yemək bişirdim, özüm də təəccüblənirəm 🍲"],
    ana: ["Övladlarım mənim fəxrimdir 💛", "Yeni xörək resepti öyrəndim 🍲", "Bağımızda gilas yetişdi 🍒"],
    ata: ["Futbola baxıram, yenə uduzduq 😤", "Maşını təmir etdim, usta lazım deyil 🔧", "Nərdə turniri: yenə qalib! 🎲"],
    dost: ["Səni darıxdım, nə vaxt görüşürük? 🤝", "Yeni işə başladım! 🎉", "Bu gecə matç var, gəlirsən? ⚽"],
    sevgili: ["Onunla hər gün bayramdır 💕", "Ən gözəl hədiyyə ❤️"],
    "həyat yoldaşı": ["Ailəmizlə 💛", "Ildönümümüz mübarək 💍"]
  };
  P.soc.feed = ppl.sort(() => R() - 0.5).slice(0, 3).map(p => ({ who: p.name, role: p.role, t: pick((lines[p.role] || []).concat(lines.any)), likes: rnd(3, 120) }));
}

// ---------- year loop ----------
// event selection lives in js/interp.js; this re-check is used by the UI right before showing an event
const eventOk = e => Interp.stillOk(e);
function ageUp() {
  const msgs = [];
  P.age++; P.acts = 3; P.yearDone = {};
  P.day = Math.max(P.day, Cal.addYears(P.birth, P.age));
  for (const p of P.people) if (p.alive) p.age++;
  // natural stat drift
  if (P.age > 45) P.st.health = clamp(P.st.health - rnd(0, Math.ceil((P.age - 40) / 12)));
  if (P.age > 35) P.st.fitness = clamp(P.st.fitness - rnd(0, 2));
  if (P.age > 50) P.st.looks = clamp(P.st.looks - rnd(0, 2));
  if (P.age < 20) P.st.smarts = clamp(P.st.smarts + rnd(0, 2));
  P.st.happy = clamp(P.st.happy + Math.round((60 - P.st.happy) / 12));
  // relationships fade without attention
  for (const p of P.people) if (p.alive && !p.role.startsWith("keçmiş")) p.rel = clamp(p.rel - rnd(0, 3));
  // education
  eduTick(msgs);
  // army
  if (P.army && !P.army.done) { if (P.day >= P.army.end) { P.army.done = true; log("🎖️ Hərbi xidməti bitirib evə qayıtdı."); apply({ fitness: 8, happy: 10, rel: { ana: 8 } }); } }
  // money: allowance, salary, costs
  moneyTick(msgs);
  // job performance
  if (P.job) jobTick(msgs);
  // family members aging / death
  peopleTick(msgs);
  // fame slowly fades without activity
  if (P.fame > 0 && (!P.job || !CAREERS[P.job.id].fame)) P.fame = clamp(P.fame - 1);
  if (P.job && CAREERS[P.job.id].fame) P.fame = clamp(P.fame + Math.round(CAREERS[P.job.id].fame * (P.job.lv + 1) / 4));
  feedTick();
  if (P.soc && !P.soc.posts.some(x => x.age === P.age - 1)) P.soc.followers = Math.round(P.soc.followers * 0.96); // quiet accounts slowly lose followers
  if (P.soc && P.fame > 20) { P.soc.followers += Math.round(P.fame * P.fame * rnd(1, 3)); P.stats.maxFollowers = Math.max(P.stats.maxFollowers, P.soc.followers); }
  // death check
  deathCheck();
  // events
  const n = P.age < 12 ? rnd(1, 2) : rnd(2, 3);
  // events happen on dates spread across the coming year; time only moves forward
  const ids = P.alive ? Interp.pickYear(n) : [];
  const next = Cal.addYears(P.birth, P.age + 1) - 1;
  const days = ids.map(() => rnd(P.day, next)).sort((a, b) => a - b);
  P.yearEvents = ids.map((id, i) => ({ id, day: days[i] }));
  save();
  return msgs;
}
function eduTick() {
  const e = P.edu;
  if (e.stage === "bagca" && P.age >= 6) { e.stage = "mekteb"; e.grade = 1; log("🎒 Birinci sinfə getdi! İlk müəllimi: " + addPerson("müəllim", pick(["q", "q", "k"]), rnd(28, 55)).name + " müəllim."); return; }
  if (e.stage === "mekteb") {
    const study = P.flags["oxudu" + (P.age - 1)] ? 6 : 0;
    e.gpa = clamp(Math.round(e.gpa * 0.6 + (P.st.smarts * 0.8 + rnd(-10, 15) + study) * 0.4));
    if (e.grade >= 11) { e.stage = "mezun"; log(`🎓 Orta məktəbi bitirdi. Orta qiyməti: ${(2 + e.gpa / 33.4).toFixed(1)} / 5.`); return; }
    e.grade++;
    if (e.grade === 5) { const m = person("müəllim"); if (m) m.role = "keçmiş müəllim"; addPerson("müəllim", pick(["q", "k"]), rnd(26, 58)); }
  }
  if (e.stage === "magistr") {
    e.uniYear++;
    if (e.uniYear >= RULES.education.master_years) { e.stage = "bitdi"; e.master = true; log("🎓 Magistraturanı bitirdi!"); apply({ happy: 10, smarts: 4 }); }
    return;
  }
  if (e.stage === "uni") {
    e.uniYear++;
    e.gpa = clamp(Math.round(e.gpa * 0.6 + (P.st.smarts * 0.8 + rnd(-10, 15)) * 0.4));
    const f = FACULTIES[e.fac];
    if (e.uniYear >= f.years) {
      e.stage = "bitdi"; e.degree = f.opens; log(`🎓 ${f.t}-ni bitirdi! Diplom aldı.`); P.flags.diplom = P.age; apply({ happy: 12, smarts: 5, rel: { ana: 6, ata: 6 } });
      if (f.opens === "polis" && !P.job) startJob("polis", 0, "Akademiyadan sonra təyinat aldı");
      else if (e.fac !== "tibb") { e.pendingMaster = true; P.flags.pendingMasterQ = P.age; }
    }
  }
}
function moneyTick() {
  const sal = salaryMonthly() * 12;
  if (P.age < 16) { const fam = 50 + rnd(0, 100); P.money += fam; return; }
  if (P.job) P.money += sal;
  if (P.edu.stage === "uni" && P.flags.odenisli) P.money -= 2500;
  if (P.age >= 18 && !(["uni", "magistr"].includes(P.edu.stage) && P.age < 26) && !(P.army && !P.army.done)) {
    const ownHouse = P.assets.some(a => a.type === "ev");
    const living = 3000 + (ownHouse ? 0 : 3600) + (person("həyat yoldaşı") ? 1500 : 0) + people("uşaq").filter(k => k.age < 18).length * 1800;
    const livingWithParents = !ownHouse && P.age < 30 && !person("həyat yoldaşı") && person("ana");
    const lifestyle = Math.round(sal * 0.35); // people spend more as they earn more
    P.money -= (livingWithParents ? 1500 : living) + lifestyle;
  }
  for (const a of P.assets) if (a.type === "maşın") { P.money -= 600; a.value = Math.round(a.value * 0.9); }
  for (const a of P.assets) if (a.type === "ev") a.value = Math.round(a.value * (1.02 + R() * 0.05));
  if (P.age >= 63 && !P.job && P.flags.teqaud) P.money += 4200;
  if (P.money < -5000 && !P.flags.borc) { P.flags.borc = P.age; }
}
function jobTick() {
  const j = P.job, c = CAREERS[j.id];
  j.years++;
  const key = c.key === "health" ? P.st.health : P.st[c.key];
  j.perf = clamp(Math.round(j.perf * 0.5 + (key * 0.6 + rnd(0, 40)) * 0.5));
  if (j.id === "biznes") { const base = [800, 3000, 9000, 25000, 80000][j.lv]; j.income = Math.round(base * (0.3 + R() * 1.4) * (P.st.smarts / 70)); if (chance(0.12)) { j.income = -Math.round(base * 0.8); log("📉 Biznes bu il ziyana düşdü."); } }
  if (j.id === "futbolcu" && P.age >= 33 && chance((P.age - 32) / 5)) { endJob("təqaüdə çıxdı"); log("⚽ Futbol karyerasını bitirdi. Stadion ayaq üstə alqışladı."); P.flags.exFutbolcu = P.age; return; }
  if (j.perf >= 75 && j.years >= 2 && chance(0.45)) promote();
  else if (j.perf < 25 && chance(0.4)) { const t = jobTitle(); endJob("işdən çıxarıldı"); log(`📉 ${t} işindən çıxarıldı.`); apply({ happy: -15 }); }
  if (P.age >= 63 && !c.sport && chance(0.35)) { endJob("təqaüd"); P.flags.teqaud = P.age; log("🏖️ Təqaüdə çıxdı."); }
}
function peopleTick() {
  for (const p of P.people) {
    if (!p.alive) continue;
    const risk = p.age > 60 ? ((p.age - 60) / 35) ** 2 * 0.5 : 0.001;
    if (chance(risk)) {
      p.alive = false; p.died = P.age;
      if (!p.role.startsWith("keçmiş")) {
        const close = ["ana", "ata", "həyat yoldaşı", "uşaq", "qardaş", "bacı", "nənə", "baba"].includes(p.role);
        log(`🕯️ ${p.role[0].toUpperCase() + p.role.slice(1)} ${p.name} ${p.age} yaşında dünyasını dəyişdi.`);
        if (close) apply({ happy: -20, health: -3 });
      }
    }
  }
  // the kids grow up: children leave school etc. (flavour only)
}
function deathCheck() {
  let p = 0;
  if (P.age > 60) p = ((P.age - 60) / 40) ** 2.2 * 0.6;
  if (P.st.health < 15) p += 0.25;
  if (P.st.health <= 0) p = 1;
  if (chance(p)) die(P.st.health < 20 ? "xəstəlik" : "qocalıq");
}
function die(cause) {
  P.alive = false; P.cause = cause; P.deathDay = P.day;
  log(`🕊️ ${P.name} ${P.age} yaşında dünyasını dəyişdi (${cause}).`);
  if (typeof DB !== "undefined") DB.archive(Object.assign({ id: P.id, birth: P.birth, deathDay: P.day, city: P.city, log: P.log }, lifeSummary())).catch(() => {});
  save(true);
}
function lifeSummary() {
  const dream = DREAMS.find(d => d.id === P.dream);
  const careers = P.jobs.concat(P.job ? [{ id: P.job.id, title: jobTitle() }] : []);
  const main = careers.filter(c => !CAREERS[c.id].plain).pop() || careers.pop();
  const none = P.age < 18 ? "məktəbli" : P.edu.stage === "uni" ? "tələbə" : "işsiz";
  return { name: P.name + " " + surname(P.fam, P.g), g: P.g, age: P.age, dream: dream && dream.t, became: main ? main.title : none, becameId: main && main.id,
    money: Math.round(P.money + P.assets.reduce((a, x) => a + x.value, 0)), followers: P.soc ? P.soc.followers : 0, kids: people("uşaq").length + P.people.filter(p => p.role === "uşaq" && !p.alive).length,
    married: !!P.people.find(p => p.role === "həyat yoldaşı"), cause: P.cause, when: Date.now() };
}

// ---------- activities (3 per year) ----------
const ACTIONS = [
  { id: "oxu", t: "Dərs oxu / kitab oxu", icon: "📖", min: 6, fx: () => ({ smarts: rnd(2, 5), happy: -1 }), r: () => pick(["Saatlarla oxudun, beynin işləyir.", "Yeni bir kitab bitirdin.", "Riyaziyyat məsələləri artıq asan gəlir."]), after: () => { P.flags["oxudu" + P.age] = 1; } },
  { id: "idman", t: "İdmanla məşğul ol", icon: "🏃", min: 6, fx: () => ({ fitness: rnd(3, 6), health: rnd(1, 3), happy: 1 }), r: () => pick(["Həyətdə top qovdun, tərlədin.", "Qaçışa çıxdın, nəfəsin açıldı.", "Zalda yaxşı məşq etdin."]), after: () => { if (P.age <= 17) P.tal.sport = clamp(P.tal.sport + 1); } },
  { id: "musiqi", t: "Musiqi ilə məşğul ol", icon: "🎸", min: 7, fx: () => ({ happy: 3 }), r: () => P.tal.music > 65 ? "Müəllim deyir ki, səsin çox gözəldir!" : pick(["Gitarada yeni akkord öyrəndin.", "Mahnı oxudun, qonşular döyməyə başladı 😅", "Sintezatorda çalmağı öyrənirsən."]), after: () => { P.tal.music = clamp(P.tal.music + 2); } },
  { id: "dost", t: "Dostlarla vaxt keçir", icon: "🧑‍🤝‍🧑", min: 6, fx: () => ({ happy: rnd(4, 8) }), r: () => person("dost") ? `${who("dost")} ilə gəzdiniz, çox güldünüz.` : "Həyətdə uşaqlarla oynadın.", after: () => { relAdd("dost", 8); if (!person("dost") && chance(0.6)) { const d = addPerson("dost", P.g, P.age + rnd(-1, 1)); log(`🤝 Yeni dost tapdı: ${d.name}.`); } } },
  { id: "aile", t: "Ailə ilə vaxt keçir", icon: "🏡", min: 5, fx: () => ({ happy: 3 }), r: () => pick(["Ailəlikcə çay süfrəsi arxasında oturdunuz.", "Nənəgilə qonaq getdiniz.", "Atanla nərd oynadın.", "Anana mətbəxdə kömək etdin."]), after: () => { relAdd("ana", 6); relAdd("ata", 6); relAdd("qardaş", 4); relAdd("bacı", 4); relAdd("həyat yoldaşı", 8); relAdd("uşaq", 8); } },
  { id: "aktyor", t: "Teatr dərnəyinə get", icon: "🎭", min: 8, max: 25, fx: () => ({ happy: 2, looks: 1 }), r: () => P.tal.acting > 65 ? "Rejissor deyir ki, səhnədə doğulmusan!" : "Rol məşq etdin, sözləri unutdun 😅", after: () => { P.tal.acting = clamp(P.tal.acting + 2); } },
  { id: "kod", t: "Proqramlaşdırma öyrən", icon: "⌨️", min: 11, fx: () => ({ smarts: rnd(2, 4) }), r: () => pick(["İlk oyununu yazdın!", "Bir saytı sıfırdan qurdun.", "Kod işləmədi, 3 saat xəta axtardın 😵"]), after: () => { P.flags.kodSaat = (P.flags.kodSaat || 0) + 1; if (P.flags.kodSaat >= 4 && P.st.smarts > 55) P.flags.kodYazir = P.age; } },
  { id: "gorunus", t: "Özünə qulluq et", icon: "💅", min: 13, cost: 50, fx: () => ({ looks: rnd(2, 4), happy: 2 }), r: () => pick(["Bərbərə getdin, yeni görkəm!", "Yeni paltar aldın.", "Dəri baxımı etdin, parıldayırsan."]) },
  { id: "hekim", t: "Həkimə get", icon: "🏥", min: 5, cost: 60, fx: () => ({ health: rnd(5, 12) }), r: () => P.st.health < 40 ? "Həkim müalicə yazdı, xeyli yaxşılaşdın." : "Müayinə oldun, hər şey qaydasındadır." },
  { id: "post", t: "Pıçıltı-da paylaş", icon: "📱", min: 12, special: "post" },
  { id: "is", t: "İş axtar", icon: "🔎", min: 16, special: "job" },
  { id: "sevgi", t: "Sevgili axtar", icon: "💘", min: 16, special: "love", if: () => !person("sevgili") && !person("həyat yoldaşı") },
  { id: "sevgili", t: "Sevgilinlə görüş", icon: "🌹", min: 16, if: () => !!person("sevgili"), cost: 40, fx: () => ({ happy: rnd(5, 9) }), r: () => `${who("sevgili")} ilə bulvarda gəzdiniz.`, after: () => relAdd("sevgili", 9) },
  { id: "yoldas", t: "Həyat yoldaşınla vaxt keçir", icon: "💑", min: 18, if: () => !!person("həyat yoldaşı"), fx: () => ({ happy: rnd(4, 8) }), r: () => `${who("həyat yoldaşı")} ilə restorana getdiniz.`, after: () => relAdd("həyat yoldaşı", 9) },
  { id: "isde", t: "İşdə çox çalış", icon: "⏱️", min: 16, if: () => !!P.job, fx: () => ({ happy: -2, health: -1 }), r: () => "Gec saatlara qədər işlədin. Rəhbər bunu gördü.", after: () => { P.job.perf = clamp(P.job.perf + rnd(8, 15)); } },
  { id: "seyahet", t: "Səyahətə çıx", icon: "✈️", min: 18, cost: 1500, fx: () => ({ happy: rnd(8, 14) }), r: () => { const c = pick(["Türkiyəyə", "Gürcüstana", "Dubaya", "İtaliyaya", "Misirə", "Fransaya", "Qəbələyə", "Şəkiyə"]); P.stats.countries++; return `${c} səyahət etdin, möhtəşəm idi!`; } },
  { id: "al", t: "Maşın / ev al", icon: "🔑", min: 18, special: "shop" },
  { id: "meditasiya", t: "Dincəl", icon: "🧘", min: 5, fx: () => ({ happy: rnd(3, 6), health: 1 }), r: () => pick(["Bütün günü yatdın.", "Dəniz kənarında oturdun.", "Serial izlədin, rahatladın."]) }
];
const SHOP = [
  { id: "m1", type: "maşın", t: "İşlənmiş Lada (07)", price: 4500 }, { id: "m2", type: "maşın", t: "Toyota Corolla", price: 28000 },
  { id: "m3", type: "maşın", t: "Mercedes E-klass", price: 75000 }, { id: "m4", type: "maşın", t: "Porsche 911", price: 260000 },
  { id: "e1", type: "ev", t: "Köhnə tikili, 2 otaq (Sumqayıt)", price: 55000 }, { id: "e2", type: "ev", t: "Yeni tikili, 3 otaq (Bakı)", price: 140000 },
  { id: "e3", type: "ev", t: "Bağ evi (Mərdəkan)", price: 220000 }, { id: "e4", type: "ev", t: "Villa (Novxanı)", price: 900000 }
];

// ---------- save / load (js/db.js) ----------
function save(now) { if (P && typeof DB !== "undefined") DB.saveLife(P, now); }
async function loadLife(id) { const L = await DB.loadLife(id); P = L ? migrateLife(L) : null; return P; }
// bring an older save up to the current life format (never loses data)
function migrateLife(L) {
  if (!L.v || L.v < 2) {
    const seed = RNG.newSeed();
    L.id = L.id || "L" + Date.now().toString(36) + seed.toString(36);
    L.seed = seed; L.rng = seed;
    const born = L.born || (new Date().getFullYear() - L.age);
    L.birth = Cal.fromYMD(born, 6, 15); L.day = Cal.addYears(L.birth, L.age);
    L.tr = L.tr || Object.fromEntries(Object.keys(TRAITS).map(k => [k, 50]));
    L.sched = L.sched || []; L.hist = L.hist || []; L.npcFlags = L.npcFlags || {};
    if (L.army && L.army.left != null) { L.army = { start: L.day, end: Cal.addMonths(L.day, Math.max(0, L.army.left) * 12), months: 18, done: !!L.army.done }; }
    L.yearEvents = (L.yearEvents || []).map(x => typeof x === "string" ? { id: x, day: L.day } : x);
    // legacy event ids that were renamed during the JSON move
    if (L.seen && L.seen["fırıldaq"] != null) L.seen.firildaq = L.seen["fırıldaq"];
    L.v = 2;
  }
  return L;
}
// record a decision (event_history)
function recordChoice(eventId, choiceIdx, outcome, text) {
  const row = { day: P.day, age: P.age, e: eventId, c: choiceIdx, o: outcome };
  P.hist.push(row);
  if (typeof DB !== "undefined") DB.addHistory(Object.assign({ lifeId: P.id, seq: P.hist.length, result: text }, row));
}
// university entrance exam (from the "imtahan" event)
function examTry(fid) {
  const f = FACULTIES[fid];
  P.flags.imtahanVerdi = P.age;
  const score = P.st.smarts * 0.6 + P.edu.gpa * 0.3 + (P.flags.repetitor ? 8 : 0) + (P.flags.olimpiada ? 6 : 0) + rnd(-10, 10);
  const extra = (f.fit && P.st.fitness < f.fit) ? `fiziki hazırlıq yetərli deyil (${P.st.fitness}/${f.fit})` : (f.music && P.tal.music < f.music) ? "musiqi qabiliyyəti imtahanından keçmədin" : null;
  if (score >= f.need && !extra) {
    P.edu.stage = "uni"; P.edu.fac = fid; P.edu.uniYear = 0;
    const free = score >= f.need + 12;
    if (!free) P.flags.odenisli = 1; else delete P.flags.odenisli;
    apply({ happy: 15, rel: { ana: 10, ata: 10 } });
    log(`🎓 ${f.t}-nə qəbul oldu (${free ? "dövlət sifarişi" : "ödənişli"}).`);
    return `Təbriklər! ${f.t}-nə qəbul oldun${free ? ", özü də pulsuz (dövlət sifarişi)!" : ". Ödənişli əsaslarla: ildə 2 500 ₼."}`;
  }
  P.edu.stage = "bitdi";
  apply({ happy: -12 });
  log(`📝 ${f.t}-nə qəbul ola bilmədi.`);
  const M = RULES.military;
  return `Təəssüf, ${extra || "bal çatmadı"}. Universitetə düşmədin.${P.g === M.applies_to_gender ? ` Qaydaya görə ${M.months_without_higher_education} aylıq hərbi xidmət gözləyir.` : " İndi yeni plan qurmaq vaxtıdır."}`;
}

// text placeholders: {ad} {ana} {ata} {dost} {sevgili} {yoldaş} {şəhər} {müəllim} {məşqçi} {müdir} {rəqib} {iş} {xəyal}
function fill(t) {
  return String(t).replace(/\{(\w+|yoldaş|şəhər|müəllim|məşqçi|müdir|rəqib|xəyal|iş)\}/g, (m, k) => ({
    ad: P.name, ana: who("ana"), ata: who("ata"), dost: who("dost"), sevgili: who("sevgili"), "yoldaş": who("həyat yoldaşı"), "şəhər": P.city,
    "müəllim": who("müəllim"), "məşqçi": who("məşqçi"), "müdir": who("müdir"), "rəqib": who("rəqib"), "xəyal": dreamName(), "iş": jobTitle() || "işsiz",
    qardas: who("qardaş"), baci: who("bacı"), usaq: who("uşaq")
  }[k] ?? m));
}
