/* Həyat, sən nə qəribəsən — game engine: state, yearly loop, careers, people, social network.
   Events live in events.js (EVENTS array); UI lives in index.html. */
"use strict";

// ---------- helpers ----------
const R = () => RNG.next(); // seeded per life (js/core.js)
const rnd = (a, b) => a + Math.floor(R() * (b - a + 1));
const pick = a => a[Math.floor(R() * a.length)];
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const chance = p => R() < p;
// whole manats normally; small sums keep their qəpik (e.g. "1,40 ₼")
const fmtMoney = v => { const a = Math.abs(v); const s = a < 100 && Math.round(a * 100) % 100 ? a.toFixed(2).replace(".", ",") : Math.round(a).toLocaleString("az").replace(/,/g, " "); return (v < 0 ? "−" : "") + s + " ₼"; };
const ord = n => n + ([1,2,5,7,8].includes(n % 10) || n % 100 === 11 || n % 100 === 12 ? "-ci" : [3,4].includes(n % 10) || n % 100 === 100 ? "-cü" : n % 10 === 6 ? "-cı" : "-cu");
// Azerbaijani case suffixes on names (vowel harmony): gen("Orxan") → "Orxanın", dat("Leyla") → "Leylaya", acc("Ülvi") → "Ülvini"
const lastVowel = w => { const m = String(w).toLowerCase().match(/[aıoueəiöü](?=[^aıoueəiöü]*$)/); return m ? m[0] : "a"; };
const endsVowel = w => /[aıoueəiöü]$/i.test(w);
const H4 = v => ({ a: "ı", ı: "ı", o: "u", u: "u", e: "i", ə: "i", i: "i", ö: "ü", ü: "ü" }[v]);
const gen = w => w + (endsVowel(w) ? "n" : "") + H4(lastVowel(w)) + "n";
const acc = w => w + (endsVowel(w) ? "n" : "") + H4(lastVowel(w));
const dat = w => w + (endsVowel(w) ? "y" : "") + ("aıou".includes(lastVowel(w)) ? "a" : "ə");
const fmtNum = v => v >= 1e6 ? (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(".", ",") + " mln" : v >= 1e4 ? Math.round(v / 1e3) + " min" : String(Math.round(v));

const NAMES = {
  k: ["Murad","Elvin","Rauf","Kənan","Tural","Orxan","Fərid","Nihad","Ramil","Səbuhi","Anar","Elnur","Cavid","Rəşad","Vüqar","Toğrul","Emin","Nicat","Ülvi","Samir","Fuad","Rüstəm","Elçin","İlkin","Ruslan","Zaur","Fərhad","Kamran","Əli","Hüseyn"],
  q: ["Aysel","Leyla","Nərmin","Günay","Səbinə","Aytən","Lalə","Nigar","Fidan","Könül","Aynur","Səma","Zəhra","Ülkər","Röya","Nərgiz","Gülnar","Xəyalə","Aidə","Sevinc","Mələk","Aygün","Türkan","Şəbnəm","Lamiyə","Esmira","Gülşən","Arzu","Nurlana","Fatimə"]
};
const SURN = ["Məmmədov","Əliyev","Həsənov","Hüseynov","Quliyev","Kərimov","İsmayılov","Abbasov","Rzayev","Səfərov","Nəsirov","Cəfərov","Bayramov","Qasımov","Vəliyev","Orucov","Mustafayev","Babayev"];
const surname = (base, g) => g === "q" ? base + "a" : base;
const CITIES = ["Bakı","Gəncə","Sumqayıt","Lənkəran","Şəki","Mingəçevir","Quba","Naxçıvan","Şamaxı","Qəbələ"];

// careers: data/careers.json, logic: js/career.js
const DREAMS = [
  { id: "polis", t: "Polis", icon: "👮" }, { id: "hekim", t: "Həkim", icon: "🩺" }, { id: "futbolcu", t: "Futbolçu", icon: "⚽" },
  { id: "mugenni", t: "Müğənni", icon: "🎤" }, { id: "muellim", t: "Müəllim", icon: "📚" }, { id: "proqramci", t: "Proqramçı", icon: "💻" },
  { id: "biznes", t: "Biznesmen", icon: "💼" }, { id: "aktyor", t: "Aktyor", icon: "🎭" }, { id: "pilot", t: "Pilot", icon: "✈️" },
  { id: "herbci", t: "Hərbçi", icon: "🎖️" }, { id: "xilasedici", t: "Xilasedici", icon: "🚒" }, { id: "alim", t: "Alim", icon: "🔬" }
];
// university faculties → which career they open
const FACULTIES = {
  tibb:   { t: "Tibb Universiteti", need: 72, opens: "hekim", years: 6 },
  akad:   { t: "Polis Akademiyası", need: 50, opens: "polis", years: 4, fit: 55 },
  it:     { t: "İnformatika (ADA / Texniki Universitet)", need: 62, opens: "proqramci", years: 4 },
  ped:    { t: "Pedaqoji Universitet", need: 45, opens: "muellim", years: 4 },
  incesenet: { t: "Mədəniyyət və İncəsənət Universiteti", need: 40, opens: "aktyor", years: 4 },
  konserv:{ t: "Konservatoriya", need: 40, opens: "mugenni", years: 4, music: 55 },
  iqtisad:{ t: "İqtisad Universiteti", need: 55, opens: "biznes", years: 4 },
  aviasiya:{ t: "Milli Aviasiya Akademiyası (pilot)", need: 65, opens: "pilot", years: 4, fit: 50, med: true },
  herbi:  { t: "Hərbi Akademiya", need: 50, opens: "herbi", years: 4, fit: 60, med: true },
  pese:   { t: "Peşə məktəbi (kollec)", need: 15, opens: "usta", years: 2 }
};

// ---------- state ----------
let P = null;
let RULES = null; // data/rules.json (military, education)
const LIFE_VERSION = 8;
const TRAITS = { empathy: "Empatiya", honesty: "Dürüstlük", courage: "Cəsarət", discipline: "İntizam", independence: "Müstəqillik", family: "Ailəyə bağlılıq", social: "Ünsiyyətcillik" };

function newPerson(role, gender, age, extra = {}) {
  const used = new Set(P ? [P.name, ...P.people.map(x => x.name)] : []);
  const free = NAMES[gender].filter(n => !used.has(n));
  return Object.assign({ id: "n" + Math.floor(R() * 2176782336).toString(36), role, g: gender, name: pick(free.length ? free : NAMES[gender]), age, rel: rnd(55, 85), alive: true }, extra);
}
const BIRTH_YEAR_MIN = 1950, BIRTH_YEAR_MAX = 2002;
function newLife(name, gender, city, dream, seed, bdate) {
  seed = seed == null ? RNG.newSeed() : seed >>> 0;
  P = { rng: seed }; // so the very first draws are already seeded
  const fam = pick(SURN);
  const b = bdate || { y: rnd(1985, BIRTH_YEAR_MAX), m: rnd(1, 12), d: rnd(1, 28) };
  const t = { y: b.y + 5 };
  const birth = Cal.fromYMD(Math.min(BIRTH_YEAR_MAX, Math.max(BIRTH_YEAR_MIN, b.y)), b.m, b.d);
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
  const ana = newPerson("ana", "q", rnd(25, 36), { last: surname(famBase, "q"), job: pick(PARENT_JOBS.q) }); P.people.push(ana);
  const ata = newPerson("ata", "k", rnd(27, 40), { last: surname(famBase, "k"), job: pick(PARENT_JOBS.k) }); P.people.push(ata);
  addGrandparents();
  const sib = rnd(0, 2);
  for (let i = 0; i < sib; i++) { const g = pick(["k", "q"]); P.people.push(newPerson(g === "k" ? "qardaş" : "bacı", g, rnd(1, 12))); }
  log(`${name} ${city} şəhərində doğuldu. Anası ${who("ana")} (${person("ana").job.toLowerCase()}), atası ${who("ata")} (${person("ata").job.toLowerCase()}).`, 0);
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
  if (fx.money) { P.money = Math.round((P.money + fx.money) * 100) / 100; out.push(["money", fx.money]); }
  if (fx.fame) { const b = P.fame; P.fame = clamp(P.fame + fx.fame); if (P.fame !== b) out.push(["fame", P.fame - b]); }
  if (fx.followers && P.soc) { const b = P.soc.followers; P.soc.followers = Math.max(0, Math.round(P.soc.followers + (fx.followers > -1 && fx.followers < 1 && fx.followers !== 0 ? P.soc.followers * fx.followers : fx.followers))); if (P.soc.followers !== b) out.push(["followers", P.soc.followers - b]); }
  if (fx.rel) for (const [role, d] of Object.entries(fx.rel)) relAdd(role, d);
  if (fx.tal) for (const [k, d] of Object.entries(fx.tal)) P.tal[k] = clamp(P.tal[k] + d);
  if (fx.flag) for (const f of [].concat(fx.flag)) P.flags[f] = P.age;
  if (fx.unflag) for (const f of [].concat(fx.unflag)) delete P.flags[f];
  if (fx.perf && P.job) P.job.perf = clamp(P.job.perf + fx.perf);
  return out;
}

// parents' professions (NPCs) and the family's means: affects how often they can give pocket money
const PARENT_JOBS = {
  k: ["Mühəndis", "Sürücü", "Tikinti ustası", "Həkim", "Müəllim", "Polis", "Mühasib", "Bazarda satıcı", "Neftçi", "Elektrik ustası", "Kiçik dükan sahibi", "Proqramçı"],
  q: ["Müəllim", "Tibb bacısı", "Həkim", "Mühasib", "Bərbər", "Tikişçi", "Bank işçisi", "Evdar qadın", "Satıcı", "Bağça tərbiyəçisi", "Aptek işçisi", "Dərzi"]
};
const JOB_MEANS = { "Həkim": 3, "Proqramçı": 3, "Neftçi": 3, "Bank işçisi": 2, "Mühəndis": 2, "Kiçik dükan sahibi": 2, "Polis": 2, "Mühasib": 2, "Müəllim": 1, "Tibb bacısı": 1, "Sürücü": 1, "Tikinti ustası": 1, "Elektrik ustası": 1, "Bazarda satıcı": 1, "Satıcı": 1, "Bərbər": 1, "Tikişçi": 1, "Dərzi": 1, "Bağça tərbiyəçisi": 1, "Aptek işçisi": 1, "Evdar qadın": 0, "İşsiz": 0, "Təqaüdçü": 1 };
function familyMeans() { return ["ana", "ata"].map(r => person(r)).filter(Boolean).reduce((a, p) => a + (JOB_MEANS[p.job] ?? 1), 0); } // 0..6
function addGrandparents() {
  const ana = P.people.find(p => p.role === "ana"), base = ana ? ana.age : 30;
  for (const [role, g, a] of [["nənə", "q", base + rnd(22, 30)], ["baba", "k", base + rnd(24, 33)]])
    P.people.push(newPerson(role, g, a, { job: a >= 60 ? "Təqaüdçü" : pick(PARENT_JOBS[g].filter(j => j !== "Evdar qadın")) }));
  for (const p of P.people) if ((p.role === "nənə" || p.role === "baba") && p.age > 84) { p.alive = false; p.died = 0; }
}
// pocket money: under 18 the only money sources are family, things found on the street, and (16+) part-time work
const POCKET_MAX = { ana: 10, ata: 10, "nənə": 15, baba: 15 };
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
// ---------- quarters: the button moves time 3 months; the yearly tick (ageUp) runs on the birthday ----------
const QUARTER_ACTS = 1;
const quarterStart = q => Cal.addMonths(Cal.addYears(P.birth, P.age), 3 * q);
const quarterEnd = () => quarterStart((P.q || 0) + 1); // first day of the next quarter
const dueEvents = () => (P.yearEvents || []).filter(e => e.day < quarterEnd());
// returns {birthday, msgs}. Money for the finished quarter is booked here; the 4th quarter ends on the birthday.
function advanceQuarter() {
  if ((P.q || 0) >= 3) { const msgs = ageUp(); return { birthday: true, msgs }; }
  moneyTick(false);
  P.q = (P.q || 0) + 1; P.acts = QUARTER_ACTS;
  P.day = Math.max(P.day, quarterStart(P.q));
  const msgs = []; armyTick(msgs); familyTick();
  if (P.alive) { P.yearEvents.push(...Interp.takeScheduled(quarterEnd())); P.yearEvents.sort((a, b) => a.day - b.day); }
  save(); return { birthday: false, msgs };
}
// what the player is waiting for: scheduled story steps with a teaser, and running states
function openThreads() {
  const out = [], m = d => Math.max(0, Math.round((d - P.day) / 30.44));
  if (typeof pregnant === "function" && pregnant()) out.push({ icon: "🤰", text: P.preg.known ? `${P.preg.twins ? "Əkizlər" : P.preg.g === "k" ? "Oğlan" : "Qız"} gözlənilir` : "Oğlan, yoxsa qız?", months: m(P.preg.due) });
  if (P.army && !P.army.done) out.push({ icon: "🪖", text: "Tərxis", months: m(P.army.end) });
  if (inPrison()) out.push({ icon: "🔒", text: "Azadlıq", months: m(P.legal.prison.end) });
  if (P.dekret && !P.dekret.back) out.push({ icon: "👶", text: "İşə qayıdış", months: m(P.dekret.until) });
  if (P.pres && !P.pres.ended) out.push({ icon: "🏛️", text: "Prezidentlik müddətinin sonu", months: m(P.pres.until) });
  for (const s of P.sched) { const e = Interp.byId(s.event); if (e && e.teaser && s.day - P.day < 1100) out.push({ icon: e.icon || "⏳", text: Interp.text(e.teaser), months: m(s.day) }); }
  return out.sort((a, b) => a.months - b.months).slice(0, 6);
}
// discharge as soon as the service period is over (checked every quarter)
function armyTick() {
  if (P.army && !P.army.done && P.army.end <= P.day + 15) { P.army.done = true; P.army.out = P.day; log(`🏠 Hərbi xidmət (${P.army.months} ay) başa çatdı. Evə qayıtdı.`); apply({ fitness: 8, happy: 10, rel: { ana: 8 } }); }
}
function ageUp() {
  const msgs = [];
  P.age++; P.acts = QUARTER_ACTS; P.q = 0; P.yearDone = {};
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
  // discharge when the service period is over (service starts on a birthday: 12 months = one year, 18 months = two)
  armyTick();
  familyTick();
  // prison, licences, investments
  prisonTick();
  expungeTick();
  licenceTick();
  investTick();
  // money: allowance, salary, costs
  moneyTick(true);
  // job performance
  if (P.job) jobTick(msgs);
  sportTick(msgs);
  polTick(msgs);
  itemsTick(msgs);
  // family members aging / death
  peopleTick(msgs);
  npcLifeTick(msgs);
  // fame slowly fades without activity
  if (P.fame > 0 && (!P.job || !CAREERS[P.job.id].fame)) P.fame = clamp(P.fame - 1);
  if (P.job && CAREERS[P.job.id].fame) P.fame = clamp(P.fame + Math.round(CAREERS[P.job.id].fame * (P.job.lv + 1) / 4));
  feedTick();
  if (P.soc && !P.soc.posts.some(x => x.age === P.age - 1)) P.soc.followers = Math.round(P.soc.followers * 0.96); // quiet accounts slowly lose followers
  if (P.soc && P.fame > 20) { P.soc.followers += Math.round(P.fame * P.fame * rnd(1, 3)); P.stats.maxFollowers = Math.max(P.stats.maxFollowers, P.soc.followers); }
  // death check
  deathCheck();
  // events
  const n = P.age < 12 ? 2 : rnd(2, 3);
  // events happen on dates spread across the coming year; time only moves forward
  const ids = P.alive ? Interp.pickYear(n) : [];
  const next = Cal.addYears(P.birth, P.age + 1) - 1;
  const days = ids.map(() => rnd(P.day, next)).sort((a, b) => a - b);
  P.yearEvents = ids.map((id, i) => ({ id, day: days[i] }));
  if (P.alive) { P.yearEvents.push(...Interp.takeScheduled(quarterEnd())); P.yearEvents.sort((a, b) => a.day - b.day); } // story steps due in the first quarter
  save();
  return msgs;
}
function eduTick() {
  const e = P.edu;
  if (e.stage === "bagca" && P.age >= 6) { e.stage = "mekteb"; e.grade = 1; log("🎒 Birinci sinfə getdi! İlk müəllimi: " + addPerson("müəllim", pick(["q", "q", "k"]), rnd(28, 55)).name + " müəllim."); return; }
  if (e.stage === "mekteb") {
    const study = (P.flags["oxudu" + (P.age - 1)] ? 6 : 0) - (P.job ? 6 : 0); // working while at school costs grades
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
      else if (f.opens === "herbi") {
        P.army = { start: P.day, end: P.day, months: 0, basis: "officer", done: true, officer: true }; // officers don't do conscript service
        if (P.flags.pilot_secildi != null && medicalOk()) startJob("herbi_pilot", 0, "Hərbi pilot kimi təyinat aldı"); else startJob("herbci", 2, "Zabit kimi təyinat aldı");
      }
      else if (f.opens === "pilot") { if (medicalOk()) { P.lic = P.lic || {}; P.lic.ppl = true; P.lic.cpl = P.age; P.hours = Math.max(P.hours || 0, 250); log("🎫 PPL və CPL lisenziyaları alındı (250 uçuş saatı)."); } else { P.flags.medical_fail = P.age; log("🩺 Tibbi komissiya: sağlamlıq kommersiya pilotu üçün yetərli deyil."); } }
      else if (f.opens === "usta") P.flags.pese_mekteb = P.age;
      if (!["tibb", "herbi", "pese", "akad"].includes(e.fac)) { e.pendingMaster = true; P.flags.pendingMasterQ = P.age; }
    }
  }
}
// yearly budget: every income and expense line is recorded (P.budget) so the player can see where money goes
const BIZ_VALUE = [20000, 80000, 250000, 800000, 3000000];
function pensionMonthly() {
  const R_ = RULES.pension, w = P.work || { years: 0, salSum: 0 };
  const avg = w.years ? w.salSum / w.years : 0;
  let m = R_.base_monthly + avg * R_.per_year_pct * w.years;
  if (P.flags.military_pension != null) m = Math.max(m, (P.lastMilSal || avg) * R_.military_last_salary_pct);
  return Math.round(Math.min(R_.max_monthly || Infinity, Math.max(R_.min_monthly, m)));
}
const onPension = () => !P.job && (P.flags.teqaud != null || P.flags.military_pension != null || P.age >= RULES.pension.age);
// income and costs are yearly amounts; a quarter of the net is booked every 3 months.
// yearly=true (on the birthday): also work-years for the pension, asset values and the credit score move.
function moneyTick(yearly) {
  if (P.age < 16) { P.budget = null; return; }
  const inc = {}, exp = {}, add = (o, k, v) => { v = Math.round(v); if (v) o[k] = (o[k] || 0) + v; };
  if (inPrison()) { P.budget = { age: P.age, inc, exp, net: 0, note: "Həbsdə: gəlir və xərc yoxdur" }; return; }
  // income
  if (P.job && !P.job.susp) {
    const c = CAREERS[P.job.id];
    add(inc, P.job.id === "biznes" ? "Biznes gəliri" : "Maaş", c.unstable ? salaryMonthly() * (P.job.monthsWorked || 8) : salaryMonthly() * 12);
    P.work = P.work || { years: 0, salSum: 0 }; if (yearly) { P.work.years++; P.work.salSum += salaryMonthly(); }
    if (c.track === "military") P.lastMilSal = salaryMonthly();
  }
  if (onPension()) add(inc, "Təqaüd", pensionMonthly() * 12);
  if (P.dekret && !P.dekret.back) add(inc, P.day < P.dekret.paid ? "Analıq müavinəti" : "Uşağa qulluq müavinəti", P.day < P.dekret.paid ? P.dekret.sal * 12 : 600);
  for (const a of P.assets) {
    if (a.type === "mağaza") add(inc, "Kirayə gəliri", a.value * 0.06);
    if (a.type === "kiraye") add(inc, "Kirayə gəliri", a.value * 0.05);
    if (a.type === "biznes") add(inc, "Ailə biznesindən pay", a.value * 0.06);
  }
  { const earned = Object.values(inc).reduce((x, y) => x + y, 0); if (P.age >= 18 && earned < 6000 && P.money < 0 && !(["uni", "magistr"].includes(P.edu.stage)) && !(P.army && !P.army.done)) add(inc, "Sosial yardım", RULES.social.aid_yearly); }
  // expenses
  if (P.edu.stage === "uni" && P.flags.odenisli) add(exp, "Təhsil haqqı", 2500);
  const student = ["uni", "magistr"].includes(P.edu.stage) && P.age < 26, inArmy = P.army && !P.army.done;
  if (P.age >= 18 && !student && !inArmy) {
    // people adapt to what they earn: cheaper room, staying with parents, a tighter food budget
    const income = Object.values(inc).reduce((x, y) => x + y, 0), tight = P.money < 0 || income < 9000;
    const ownHouse = P.assets.some(a => (a.type === "ev" || a.home) && a.type !== "kiraye");
    const withParents = !ownHouse && !person("həyat yoldaşı") && (P.age < 30 || tight) && (person("ana") || person("ata"));
    if (withParents) add(exp, "Ailə büdcəsinə pay", tight ? 900 : 1500);
    else {
      if (!ownHouse) add(exp, tight ? "Kirayə (ucuz otaq)" : "Kirayə", tight ? 1800 : 3600);
      add(exp, "Ərzaq və məişət", tight ? Math.max(1500, income * 0.3) + (person("həyat yoldaşı") ? 800 : 0) : 2400 + (person("həyat yoldaşı") ? 1200 : 0));
      add(exp, "Kommunal", 600);
      add(exp, "Nəqliyyat", P.assets.some(a => a.type === "maşın") ? 0 : 360);
    }
    const kids = people("uşaq").filter(k => k.age < 18).length; if (kids) add(exp, "Uşaqlar (geyim, məktəb, dərnək)", kids * (tight ? 700 : 1500));
    const sal = salaryMonthly() * 12; if (sal > 0 && P.money > 0) add(exp, "Geyim və əyləncə", sal * 0.3);
  }
  if (P.age >= 55) add(exp, "Dərman və müayinə", (P.age - 50) * 40 + Math.max(0, 70 - P.st.health) * 15);
  for (const a of P.assets) {
    if (a.type === "maşın") add(exp, "Maşın (sığorta, yanacaq, təmir)", 400 + a.value * 0.03);
    else if (a.type === "ev") add(exp, "Ev saxlanması", a.value * 0.004 + 300);
    if (!yearly) continue;
    if (a.type === "maşın") a.value = Math.round(a.value * 0.9);
    else if (a.type === "ev") a.value = Math.round(a.value * (1.02 + R() * 0.05));
    else if (a.type === "torpaq") a.value = Math.round(a.value * (1.03 + R() * 0.06));
    else if (a.type === "mağaza") a.value = Math.round(a.value * (1.01 + R() * 0.04));
  }
  for (const l of P.loans || []) { const pay = Math.min(l.left * 4, l.yearly); add(exp, "Kredit ödənişi", pay); l.left -= Math.round(pay / 4 * (1 - (l.rate || LOAN.rate) * 0.5)); }
  const net = Object.values(inc).reduce((x, y) => x + y, 0) - Object.values(exp).reduce((x, y) => x + y, 0);
  P.money = Math.round((P.money + net / 4) * 100) / 100;
  // late payments: fee and a lower credit score
  P.credit = P.credit ?? 60;
  if ((P.loans || []).length && P.money < 0) { const fee = Math.round((P.loans || []).reduce((x, l) => x + l.yearly, 0) * RULES.bank.late_fee_pct / 4); P.money -= fee; exp["Gecikmə cəriməsi"] = fee * 4; P.credit = clamp(P.credit - 3); }
  else if ((P.loans || []).length && yearly) P.credit = clamp(P.credit + 3);
  if (P.loans && P.loans.some(l => l.left <= 0)) { for (const l of P.loans.filter(x => x.left <= 0)) log(`🏦 Kredit bağlandı: ${l.t}.`); P.loans = P.loans.filter(l => l.left > 0); }
  P.budget = { age: P.age, inc, exp, net: Math.round(net), q: Math.round(net / 4) };
  if (P.money < -5000 && !P.flags.borc) P.flags.borc = P.age;
}
// people who belong to a period of life leave the active list when that period ends
function contextTick() {
  const school = ["bagca", "mekteb"].includes(P.edu.stage);
  const football = (P.job && P.job.id === "futbolcu") || (P.flags.akademiya != null && !P.job && P.age < 22) || (P.flags.futbolBolme != null && P.age < 18) || sportActive();
  for (const p of P.people) {
    if (p.role === "müəllim" && !school) p.role = "keçmiş müəllim";
    if (p.role === "məşqçi" && !football) p.role = "keçmiş məşqçi";
  }
}
// grown-up children live their own lives: marriage is an event for the player; grandchildren come later
function kidsTick() {
  for (const k of P.people.filter(p => p.role === "uşaq" && p.alive && p.spouse)) {
    const sp = P.people.find(x => x.id === k.spouse && x.alive);
    const nGrand = P.people.filter(x => x.role === "nəvə" && x.parent === k.id).length;
    if (sp && nGrand < 3 && k.age < 42 && P.age - (k.married || 0) >= 1 && chance(nGrand ? 0.18 : 0.35)) {
      const g = pick(["k", "q"]), base = k.g === "k" ? P.fam : (sp.fam || pick(SURN)); // son's child: our surname; daughter's child: son-in-law's
      const gc = addPerson("nəvə", g, 0, { parent: k.id, last: surname(base, g) });
      P.lastGrand = { id: gc.id, name: gc.name, g, parent: k.name, parentG: k.g };
      P.sched.push({ event: "neve_xeber", day: P.day }); P.sched.sort((a, b) => a.day - b.day);
    }
  }
}
function peopleTick() {
  contextTick();
  kidsTick();
  for (const p of P.people) {
    if (!p.alive) continue;
    if ((p.role === "ana" || p.role === "ata") && p.job === "İşsiz" && p.age < 60 && chance(0.35)) { p.job = pick(PARENT_JOBS[p.g].filter(j => j !== "Evdar qadın")); log(`💼 ${p.role === "ana" ? "Anan" : "Atan"} yenidən işə düzəldi: ${p.job.toLowerCase()}.`); }
    if (["ana", "ata", "nənə", "baba"].includes(p.role) && p.age >= 63 && p.job && !["Təqaüdçü", "Evdar qadın"].includes(p.job)) { p.job = "Təqaüdçü"; log(`🏖️ ${{ ana: "Anan", ata: "Atan", "nənə": "Nənən", baba: "Baban" }[p.role]} təqaüdə çıxdı.`); }
    const risk = AGE_RISK.find(([lim]) => p.age < lim)[1] * (p.age >= 85 ? 1.3 : 1);
    if (chance(risk)) {
      p.alive = false; p.died = P.age;
      if (!p.role.startsWith("keçmiş")) {
        const close = ["ana", "ata", "həyat yoldaşı", "uşaq", "qardaş", "bacı", "nənə", "baba"].includes(p.role);
        if (p.role === "nənə" || p.role === "baba") log(`💐 Hər yay getdiyin o həyət artıq səssizdir.`);
        log(`🕯️ ${p.role[0].toUpperCase() + p.role.slice(1)} ${p.name} ${p.age} yaşında dünyasını dəyişdi.`);
        if (close) apply({ happy: -20, health: -3 });
      }
    }
  }
  // the kids grow up: children leave school etc. (flavour only)
}
// annual death risk: age, health, lifestyle, occupation, prison. Early death is possible but rare.
const AGE_RISK = [[15, 0.0002], [25, 0.0008], [35, 0.001], [45, 0.0018], [55, 0.004], [65, 0.01], [75, 0.025], [85, 0.075], [200, 0.2]];
function deathRisk() {
  const a = P.age, h = P.st.health;
  const base = AGE_RISK.find(([lim]) => a < lim)[1];
  const hf = h >= 70 ? 0.7 : h >= 50 ? 1 : h >= 30 ? 2 : h >= 15 ? 5 : 15;
  let life = 1;
  if (P.flags.siqaret != null && a > 35) life *= 1.6;
  if (P.flags.alkoqol != null) life *= 1.3;
  if (inPrison()) life *= 1.5;
  const job = P.job && !P.job.susp ? (CAREERS[P.job.id].risk || 0) : 0;
  const army = P.army && !P.army.done ? 0.0006 : 0;
  return { natural: base * hf * life, job: job + army };
}
const JOB_DEATH = { pilot: "uçuş qəzası", herbi_pilot: "təlim uçuşunda qəza", herbci: "xidmət zamanı", xilasedici: "yanğında insanları xilas edərkən", polis: "xidmət vəzifəsini yerinə yetirərkən", taksi: "yol qəzası", kuryer: "yol qəzası", fehle: "iş yerində bədbəxt hadisə", futbolcu: "meydanda qəfil ürək tutması" };
function deathCheck() {
  if (P.st.health <= 0) return die("ağır xəstəlik");
  const r = deathRisk();
  if (chance(r.job)) return die(P.army && !P.army.done ? "hərbi xidmət zamanı" : JOB_DEATH[P.job && P.job.id] || "bədbəxt hadisə");
  if (chance(r.natural)) {
    const a = P.age;
    const cause = P.st.health < 30 ? "uzun sürən xəstəlik" : a < 45 ? pick(["yol qəzası", "qəfil ürək tutması", "ağır xəstəlik"]) : a < 70 ? pick(["infarkt", "insult", "xərçəng"]) : pick(["qocalıq", "ürək çatışmazlığı", "insult"]);
    die(cause);
  }
}
function die(cause) {
  P.alive = false; P.cause = cause; P.deathDay = P.day;
  log(`🕊️ ${P.name} ${P.age} yaşında dünyasını dəyişdi (${cause}).`);
  if (typeof DB !== "undefined") DB.archive(Object.assign({ id: P.id, birth: P.birth, deathDay: P.day, city: P.city, log: P.log }, lifeSummary())).catch(() => {});
  save(true);
}
// "Geridə qalanlar": facts from the save only — no invented relatives or events
function survivors() {
  const out = [], alive = r => P.people.filter(p => p.role === r && p.alive), dead = r => P.people.filter(p => p.role === r && !p.alive);
  const sp = alive("həyat yoldaşı")[0];
  if (sp) out.push(`💍 ${sp.name} — həyat yoldaşı, ${sp.age} yaşında. ${P.flags.evli != null ? `${P.age - P.flags.evli} il birlikdə yaşadılar.` : ""}`.trim());
  for (const k of P.people.filter(p => p.role === "uşaq")) out.push(k.alive ? `${k.g === "k" ? "👦 Oğlu" : "👧 Qızı"} ${k.name} — ${k.age} yaşında.` : `🕯️ ${k.g === "k" ? "Oğlu" : "Qızı"} ${k.name} ondan əvvəl dünyasını dəyişmişdi.`);
  const gk = alive("nəvə"); if (gk.length) out.push(`👶 Nəvələri: ${gk.map(g => g.name).join(", ")}.`);
  for (const r of ["ana", "ata"]) for (const p of alive(r)) out.push(`${r === "ana" ? "👩 Anası" : "👨 Atası"} ${p.name} ${p.age} yaşında övladını itirdi.`);
  for (const r of ["qardaş", "bacı"]) for (const p of alive(r)) out.push(`${r === "qardaş" ? "👦 Qardaşı" : "👧 Bacısı"} ${p.name}, ${p.age} yaşında.`);
  const fr = alive("dost")[0]; if (fr) out.push(`🤝 Ən yaxın dostu ${fr.name} vida mərasimində ilk gələnlərdən oldu.`);
  if (!out.length) out.push("Arxasında yaxın ailə üzvü qalmadı. Onun izi başqa yaxınlarının xatirələrində qaldı.");
  const before = P.people.filter(p => !p.alive && ["ana", "ata", "həyat yoldaşı", "qardaş", "bacı", "nənə", "baba"].includes(p.role) && p.died != null && p.died > 0);
  const POSS = { ana: "anası", ata: "atası", "həyat yoldaşı": "həyat yoldaşı", "qardaş": "qardaşı", "bacı": "bacısı", "nənə": "nənəsi", baba: "babası" };
  return { now: out, before: before.map(p => `${p.name}, ${POSS[p.role]} — ${P.name} ${p.died} yaşında olanda dünyasını dəyişmişdi.`) };
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

// ---------- inheritance (facts only; simplified rule in rules.json) ----------
function estate() {
  const items = P.assets.map(a => ({ t: a.t, v: a.value })), biz = P.job && P.job.id === "biznes" ? BIZ_VALUE[P.job.lv] : 0;
  if (biz) items.push({ t: "Öz biznesi", v: biz });
  const debt = (P.loans || []).reduce((x, l) => x + l.left, 0);
  const total = Math.round(P.money + items.reduce((x, i) => x + i.v, 0) - debt);
  const alive = r => P.people.filter(p => p.role === r && p.alive);
  let heirs = [...alive("həyat yoldaşı"), ...alive("uşaq"), ...alive("ana"), ...alive("ata")];
  if (!heirs.length) heirs = [...alive("qardaş"), ...alive("bacı"), ...alive("nənə"), ...alive("baba")];
  return { total, items, debt, heirs, share: heirs.length && total > 0 ? Math.round(total / heirs.length) : 0 };
}
// ---------- bank ----------
function bankOffer(amount) {
  const B = RULES.bank, yearly = annuity(amount, B.cash_rate, B.cash_years);
  const current = (P.loans || []).reduce((x, l) => x + l.yearly, 0), cap = salaryMonthly() * 12 * B.max_payment_share + (onPension() ? pensionMonthly() * 12 * 0.3 : 0);
  const reasons = [];
  if (P.age < 18) reasons.push("18 yaşdan kiçiklərə kredit verilmir");
  if ((P.credit ?? 60) < 40) reasons.push("kredit tarixçən pisdir (gecikmələr)");
  if (current + yearly > cap) reasons.push(`gəlirin bu ödənişə çatmır (illik ${fmtMoney(current + yearly)}, imkan ${fmtMoney(cap)})`);
  if (hasRecord()) reasons.push("məhkumluq qeydi riskli sayılır");
  return { ok: !reasons.length || (reasons.length === 1 && hasRecord() && chance(0.4)), yearly, reasons };
}
function takeCashLoan(amount) { const o = bankOffer(amount); if (!o.ok) return o; P.money += amount; (P.loans = P.loans || []).push({ t: `Nağd kredit ${fmtMoney(amount)}`, left: Math.round(amount * (1 + RULES.bank.cash_rate * 0.6)), yearly: o.yearly, years: RULES.bank.cash_years, rate: RULES.bank.cash_rate, since: P.age }); log(`🏦 Bankdan ${fmtMoney(amount)} nağd kredit götürdü (ildə ${fmtMoney(o.yearly)}).`); return o; }
function restructure() { for (const l of P.loans || []) { l.years += RULES.bank.restructure_extra_years; l.yearly = Math.round(l.left / Math.max(1, l.years) * 1.15); } P.credit = clamp((P.credit ?? 60) - 8); log("🏦 Kreditlər restrukturizasiya olundu: illik ödəniş azaldı, müddət uzandı."); }
// ---------- side income (extra work) ----------
const SIDE_JOBS = [
  { id: "s_taksi", t: "Axşamlar taksi sür", icon: "🚕", if: () => P.age >= 18 && P.lic && P.lic.surucu && P.assets.some(a => a.type === "maşın"), money: [1200, 2500], fx: { happy: -2, health: -1 }, r: "Axşamlar sürdün, gecə yarısı evə qayıtdın." },
  { id: "s_kuryer", t: "Həftəsonu kuryerlik", icon: "🛵", if: () => P.age >= 16 && P.age <= 55, money: [600, 1300], fx: { happy: -2, fitness: 1 }, r: "Şənbə-bazar sifariş daşıdın." },
  { id: "s_repet", t: "Repetitorluq et", icon: "📚", if: () => P.age >= 18 && (P.edu.degree || P.st.smarts >= 65), money: [1500, 3500], fx: { happy: -1 }, r: "Üç şagirdə dərs verdin. Biri imtahanda yüksək bal topladı." },
  { id: "s_usta", t: "Usta sifarişləri götür", icon: "🔧", if: () => P.age >= 18 && (P.flags.pese_kursu != null || P.flags.pese_mekteb != null || (P.job && P.job.id === "usta")), money: [1000, 3000], fx: { happy: -1, health: -1 }, r: "Qonşulara elektrik, santexnika işləri gördün." },
  { id: "s_freel", t: "Freelance layihə et", icon: "💻", if: () => P.age >= 18 && (P.flags.kodYazir != null || (P.job && P.job.id === "proqramci") || P.edu.degree === "proqramci"), money: [2000, 6000], fx: { happy: -3, health: -1 }, r: "Gecələr xarici müştəri üçün sayt yazdın." },
  { id: "s_satis", t: "Onlayn satış et", icon: "📦", if: () => P.age >= 18, money: [300, 1800], fx: { happy: -1 }, r: "Pıçıltı-da kiçik mağaza açdın: əl işləri və aksesuarlar." }
];

// ---------- children's weddings ----------
// daughter: dowry (cehiz) and her share of the wedding; son: the couple's home and car, and the wedding itself
const WEDDING = {
  q: { full: { cost: 15000, rel: 15, t: "Cehizi tam hazırla, toy xərcinə də qoşul" }, part: { cost: 6000, rel: 7, t: "Cehizin əsas hissəsini al" }, toy: { cost: 2500, rel: 2, t: "Yalnız qızıl dəstini al" }, none: { cost: 0, rel: -10, t: "İmkanımız yoxdur, sadə olsun" } },
  k: { full: { cost: 95000, rel: 20, home: true, t: "Mənzil, maşın və toy: hamısı bizdən" }, part: { cost: 25000, rel: 10, t: "Toyu edək, mənzilin ilkin ödənişinə kömək edək" }, toy: { cost: 9000, rel: 4, t: "Toyun xərcini ödəyək, qalanını özü etsin" }, none: { cost: 0, rel: -12, t: "Özün qazan, özün qur" } }
};
function kidToMarry(minAge) { return P.people.find(p => p.role === "uşaq" && p.alive && !p.spouse && p.age >= minAge && p.age <= 40); }
function partnerName(k) { const g = k.g === "k" ? "q" : "k", list = NAMES[g]; let h = 0; for (const c of k.id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return list[h % list.length]; }

// ---------- interactions with people: depend on their role, age and gender, and on the player's age ----------
// each: { id, icon, t, rel, happy, cost?, texts[] }
function interactionsFor(p) {
  const a = p.age, me = P.age, girl = p.g === "q", n = p.name, L = [];
  const add = (id, icon, t, rel, happy, texts, cost) => L.push({ id, icon, t, rel, happy, texts, cost });
  if (p.role === "uşaq" || p.role === "nəvə") {
    if (a <= 2) {
      add("baby_hold", "🍼", "Qucağına al, layla çal", 9, 6, [`“Laylay, balam, laylay…” ${n} qucağında yuxuya getdi.`, `${n} barmağını bərk-bərk tutdu və güldü. Ürəyin əridi.`]);
      add("baby_walk", "🚼", "Uşaq arabasında gəzintiyə apar", 7, 4, [`Parkda gəzdiniz. ${n} göyərçinləri görüb əl çaldı.`, `Bulvarda gəzinti: ${n} dəniz küləyindən gözlərini qıyırdı.`]);
    } else if (a <= 6) {
      add("kid_play", "🧸", girl ? "Kukla oyunu oyna" : "Maşın və top oyna", 9, 6, girl ? [`${n} kuklalarına çay süfrəsi açdı, sən “qonaq” idin ☕`, `${n} ilə kuklaya paltar tikdiniz. “Ən gözəl kukla mənimkidir!”`] : [`Xalçanın üstündə maşın yarışı! ${n} hər dəfə “qalib” oldu 🏎️`, `Həyətdə top oynadınız, ${n} ilk dəfə “qapıya” vurdu ⚽`]);
      add("kid_park", "🛝", "Parka apar, yelləncəkdə yellə", 8, 5, [`“Daha yüksək!” — ${n} yelləncəkdə qışqırırdı.`, `Sürüşkəndən on dəfə düşdü, hər dəfə “bir də!” dedi.`]);
      add("kid_tale", "📖", "Yatmazdan əvvəl nağıl danış", 7, 4, [`“Biri vardı, biri yoxdu…” ${n} nağılın sonunu gözləmədən yuxuya getdi.`, `${n} “Cırtdan”ı üçüncü dəfə istədi. Sən də üçüncü dəfə danışdın.`]);
      add("kid_ice", "🍦", "Dondurmaya apar", 6, 4, [`${n} dondurmanı üz-gözünə yaxdı 😄`, `${n} iki top istədi, birinə razılaşdınız. Danışıqlar çətin keçdi 😅`], 5);
    } else if (a <= 12) {
      add("kid_hw", "✏️", "Dərsinə kömək et", 6, 1, [`${n} ilə riyaziyyat məsələsini birlikdə həll etdiniz. “Sən hər şeyi bilirsən!”`, `${gen(n)} inşasını oxudun, iki səhvini birlikdə düzəltdiniz.`]);
      add("kid_out", girl ? "🚲" : "⚽", girl ? "Velosiped sürməyi öyrət" : "Həyətdə futbol oyna", 8, 5, girl ? [`${n} ilk dəfə arxadan tutmadan sürdü! Sevincdən qışqırdı.`] : [`${n} sənə qol vurdu və bütün həyətə elan etdi 😄`]);
      add("kid_game", "🎮", "Birlikdə video oyun oyna", 7, 4, [`${n} səni yenə uddu və sevincini gizlətmədi.`, `İkiniz bir komandada oynadınız. “Sən yaxşı oyunçusan” — dedi.`]);
      add("kid_zoo", "🎡", "Attraksiona və ya zooparka apar", 9, 6, [`Zooparkda ${n} fili görəndə donub qaldı.`, `Attraksionda ${n} qorxdu, amma ikinci dəfə özü istədi.`], 30);
    } else if (a <= 17) {
      add("teen_talk", "💬", "Ürək söhbəti et", 8, 3, girl ? [`${n} bir sinif yoldaşından danışdı. Yanaqları qızardı. Sən sadəcə dinlədin.`, `${n} dedi ki, rəfiqələri ilə küsüb. Uzun danışdınız.`] : [`${n} məktəbdəki problemindən danışdı. İlk dəfə səndən məsləhət istədi.`, `${n} gələcək haqqında danışdı. Səsində qorxu da, ümid də vardı.`]);
      add("teen_out", girl ? "🎬" : "🏟️", girl ? "Birlikdə kinoya və alış-verişə get" : "Birlikdə futbol matçına get", 8, 5, girl ? [`Kinodan sonra ${n} ilə kafedə oturdunuz. Telefonunu bir saat əlinə almadı.`] : [`Tribunada ${n} ilə birlikdə qışqırdınız. Bu günü uzun müddət xatırlayacaq.`], 25);
      add("teen_money", "💵", "Cib xərcliyi ver", 5, 1, [`${n}: “Sağ ol!” Qapıdan çıxanda “yalnız kitaba xərclə” dedin. Gülümsədi.`], 20);
      add("teen_advice", "🧭", "Gələcəyi haqqında məsləhət ver", 5, 2, [`${n} ilə universitet və peşə haqqında danışdınız. Bəzi sözlərini qeyd etdi.`]);
    } else {
      add("ad_call", "📞", "Zəng et, hal-əhval tut", 5, 3, [`${n} işdən danışdı. Səsi yorğun idi, amma zəngindən sevindi.`, `${n}: “Yaxşı ki, zəng etdin. Səni darıxmışdım.”`]);
      add("ad_lunch", "🍽️", "Nahara dəvət et", 7, 5, [`${n} ilə köhnə restoranınızda nahar etdiniz. Uşaqlığından danışdınız.`], 40);
      add("ad_help", "💸", "Maddi kömək et (500 ₼)", 8, 2, [`${n} əvvəl götürmək istəmədi, sonra qucaqladı: “Qaytaracağam.”`], 500);
    }
  } else if (["ana", "ata", "nənə", "baba"].includes(p.role)) {
    const old = p.role === "nənə" || p.role === "baba";
    if (me < 18) {
      add("p_talk", "💬", old ? (p.role === "nənə" ? "Nənədən nağıl dinlə" : "Baba ilə nərd oyna") : "Söhbət et", 7, 3,
        old ? (p.role === "nənə" ? [`${n} nənə “Məlikməmməd” nağılını danışdı, sən də əzbər bilsən də dinlədin.`] : [`${n} baba ilə nərd oynadınız. Uddun! Baba bilərəkdən uduzmuşdu… bəlkə də.`])
          : [`${p.role === "ana" ? "Anan" : "Atan"} səndən məktəbi soruşdu, sən də hər şeyi danışdın.`]);
      add("p_help", "🧹", old ? "Həyətdə kömək et" : "Ev işlərinə kömək et", 7, 1, old ? [`${n} ilə bağda alma yığdınız.`] : [`Qab yudun, zibili atdın. ${p.role === "ana" ? "Anan" : "Atan"} təəccübləndi.`]);
    } else {
      add("p_call", "📞", "Zəng et", 4, 2, [`${n} səsini eşidəndə sevindi: “Bala, yaxşısan?”`]);
      add("p_visit", "🏘️", "Ziyarət et", 8, 4, [`${n} süfrə açdı, gecəyə qədər oturdunuz.`, `${n} ilə köhnə albomlara baxdınız.`]);
      add("p_gift", "🎁", "Hədiyyə al", 9, 3, [`${n} hədiyyəni gizlicə kövrələrək açdı.`], 80);
      if (a >= 60) {
        add("p_doc", "🏥", "Həkimə apar", 9, 1, [`${acc(n)} müayinəyə apardın. Həkim təzyiq dərmanı yazdı.`], 60);
        add("p_support", "💸", "Maddi dəstək ol (300 ₼)", 8, 2, [`${n}: “Bizə lazım deyil…” deyib pulu çəkinə-çəkinə götürdü.`], 300);
        add("p_memo", "📷", "Gəncliyindən danışmasını dinlə", 8, 4, [`${n} gəncliyini, ilk işini, toy gününü danışdı. Bu hekayələri əvvəllər heç eşitməmişdin.`]);
      }
    }
  } else if (p.role === "qardaş" || p.role === "bacı") {
    if (me < 18 && a < 18) {
      add("s_play", "🎲", "Birlikdə oyna", 7, 4, [`${n} ilə yastıq davası etdiniz, anan qışqırana qədər 😄`, `${n} ilə birlikdə multfilmə baxdınız.`]);
      add("s_secret", "🤫", "Sirr paylaş", 8, 3, [`${n}-ə sirrini dedin. “Heç kimə demərəm” — söz verdi.`]);
    } else {
      add("s_call", "📞", "Zəng et", 5, 3, [`${n} ilə uşaqlıq xatirələrinə güldünüz.`]);
      add("s_tea", "☕", "Çay içməyə get", 7, 4, [`${n} ilə gec saatlara qədər danışdınız.`]);
    }
  } else if (p.role === "dost") {
    if (me < 13) add("f_yard", "⚽", "Həyətdə oyna", 8, 6, [`${n} ilə həyətdə qaranlıq düşənə qədər oynadınız.`]);
    else if (me < 18) add("f_hang", "🎮", "Birlikdə oyun oyna, gəz", 8, 5, [`${n} ilə kompüter klubunda iki saat. Pulunuz çatmadı 😅`, `${n} ilə bulvarda gəzdiniz.`]);
    else { add("f_tea", "☕", "Çay içməyə get", 7, 4, [`${n} ilə çayxanada dərdləşdiniz.`]); add("f_match", "📺", "Birlikdə matça bax", 6, 5, [`${n} ilə matça baxdınız, komandanız uduzdu. Yenə də yaxşı gecə idi.`]); }
  } else if (p.role === "sevgili") {
    add("l_date", "🌹", "Görüşə çağır", 9, 6, [`${n} ilə bulvarda gəzdiniz, dəniz qaranlıqda parıldayırdı.`], 40);
    add("l_gift", "🎁", "Hədiyyə al", 10, 4, [`${n} hədiyyəni açanda gözləri parladı.`], 50);
  } else if (p.role === "həyat yoldaşı") {
    add("w_dinner", "🕯️", "Romantik şam yeməyi", 10, 6, [`${n} ilə şam yeməyi. Telefonları söndürdünüz, sadəcə danışdınız.`], 80);
    add("w_show", "📺", "Birlikdə serial izlə", 6, 4, [`${n} ilə yenə eyni serialı izlədiniz. Sonunu təxmin etdin, ${n} əsəbiləşdi 😄`]);
    add("w_house", "🧺", "Ev işlərində kömək et", 8, 2, [`Bu gün ev işlərini sən götürdün. ${n} təəccüblə gülümsədi.`]);
  } else {
    add("o_talk", "💬", "Söhbət et", 5, 2, [`${n} ilə söhbət etdiniz.`]);
  }
  return L;
}
function runInteraction(p, it) {
  const ch = [];
  if (it.cost && P.age >= 18) { P.money -= it.cost; ch.push(["money", -it.cost]); }
  p.rel = clamp(p.rel + it.rel + rnd(-2, 2));
  ch.push(...apply({ happy: it.happy }));
  return { text: pick(it.texts), changes: ch };
}

// ---------- activities (3 per year) ----------
const ACTIONS = [
  { id: "oxu", t: () => P.age < 18 ? "Dərs oxu" : "Kitab oxu", icon: "📖", min: 6, max: 45, fx: () => ({ smarts: rnd(2, 5), happy: -1 }), r: () => pick(["Saatlarla oxudun, beynin işləyir.", "Yeni bir kitab bitirdin.", "Riyaziyyat məsələləri artıq asan gəlir."]), after: () => { P.flags["oxudu" + P.age] = 1; } },
  { id: "sport_join", t: "İdman bölməsinə yazıl", icon: "🏅", min: 6, max: 14, special: "sport", if: () => !sportActive() },
  { id: "sport_train", t: "Məşqə get", icon: "🏅", min: 6, max: 70, if: () => sportActive() && !(P.army && !P.army.done) && !inPrison(), fx: () => { sportMsg = sportTrain(); return {}; }, r: () => sportMsg },
  { id: "idman", t: "İdmanla məşğul ol", icon: "🏃", min: 6, max: 25, fx: () => ({ fitness: rnd(3, 6), health: rnd(1, 3), happy: 1 }), r: () => pick(["Həyətdə top qovdun, tərlədin.", "Qaçışa çıxdın, nəfəsin açıldı.", "Zalda yaxşı məşq etdin."]), after: () => { if (P.age <= 17) P.tal.sport = clamp(P.tal.sport + 1); } },
  { id: "musiqi", t: "Musiqi ilə məşğul ol", icon: "🎸", min: 7, max: 35, fx: () => ({ happy: 3 }), r: () => P.tal.music > 65 ? "Müəllim deyir ki, səsin çox gözəldir!" : pick(["Gitarada yeni akkord öyrəndin.", "Mahnı oxudun, qonşular döyməyə başladı 😅", "Sintezatorda çalmağı öyrənirsən."]), after: () => { P.tal.music = clamp(P.tal.music + 2); } },
  { id: "dost", t: "Dostlarla vaxt keçir", icon: "🧑‍🤝‍🧑", min: 6, max: 25, fx: () => ({ happy: rnd(4, 8) }), r: () => person("dost") ? `${who("dost")} ilə gəzdiniz, çox güldünüz.` : "Həyətdə uşaqlarla oynadın.", after: () => { relAdd("dost", 8); if (!person("dost") && chance(0.6)) { const d = addPerson("dost", P.g, P.age + rnd(-1, 1)); log(`🤝 Yeni dost tapdı: ${d.name}.`); } } },
  { id: "aile", t: "Ailə ilə vaxt keçir", icon: "🏡", min: 5, max: 25, fx: () => ({ happy: 3 }), r: () => pick(["Ailəlikcə çay süfrəsi arxasında oturdunuz.", "Nənəgilə qonaq getdiniz.", "Atanla nərd oynadın.", "Anana mətbəxdə kömək etdin."]), after: () => { relAdd("ana", 6); relAdd("ata", 6); relAdd("qardaş", 4); relAdd("bacı", 4); relAdd("həyat yoldaşı", 8); relAdd("uşaq", 8); } },
  { id: "aktyor", t: "Teatr dərnəyinə get", icon: "🎭", min: 8, max: 25, fx: () => ({ happy: 2, looks: 1 }), r: () => P.tal.acting > 65 ? "Rejissor deyir ki, səhnədə doğulmusan!" : "Rol məşq etdin, sözləri unutdun 😅", after: () => { P.tal.acting = clamp(P.tal.acting + 2); } },
  { id: "kod", t: "Proqramlaşdırma öyrən", icon: "⌨️", min: 11, max: 40, fx: () => ({ smarts: owns("komputer") ? rnd(2, 4) : rnd(0, 2) }), r: () => owns("komputer") ? pick(["İlk oyununu yazdın!", "Bir saytı sıfırdan qurdun.", "Kod işləmədi, 3 saat xəta axtardın 😵"]) : pick(["Kompüter klubunda bir saat. Növbəti adam arxanda gözləyirdi.", "Telefonda kod yazmağa çalışdın. Barmaqların yoruldu.", "Məktəbin kompüter otağı bağlı idi. Dəftərə kod yazdın."]), after: () => { P.flags.kodSaat = (P.flags.kodSaat || 0) + (owns("komputer") ? 1 : 0.5); if (P.flags.kodSaat >= 4 && P.st.smarts > 55) P.flags.kodYazir = P.age; } },
  { id: "gorunus", t: "Özünə qulluq et", icon: "💅", min: 13, cost: 50, fx: () => ({ looks: rnd(2, 4), happy: 2 }), r: () => pick(["Bərbərə getdin, yeni görkəm!", "Yeni paltar aldın.", "Dəri baxımı etdin, parıldayırsan."]) },
  { id: "hekim", t: "Həkimə get", icon: "🏥", min: 5, max: 45, cost: 60, fx: () => ({ health: rnd(5, 12) }), r: () => P.st.health < 40 ? "Həkim müalicə yazdı, xeyli yaxşılaşdın." : "Müayinə oldun, hər şey qaydasındadır." },
  { id: "post", t: "Pıçıltı-da paylaş", icon: "📱", min: 12, special: "post" },
  { id: "is", t: "İş axtar", icon: "🔎", min: 16, special: "job", if: () => !isPres() },
  { id: "partiya", t: "Siyasətə qoşul", icon: "🏛️", min: 18, special: "party", if: () => !P.pol && !inPrison() },
  { id: "pol_gorus", t: "Seçicilərlə görüş", icon: "🤝", min: 18, if: () => !!P.pol && !isPres() && !inPrison() && !(P.army && !P.army.done), fx: () => ({ happy: rnd(-1, 3) }), r: () => pick(["Rayon mədəniyyət evində 200 nəfər. Biri yol, biri su, biri iş istədi. Hamısını dəftərə yazdın.", "Kənd meydanında çay içə-içə danışdınız. Qocalardan biri dedi: “Səndən əvvəlkilər də belə deyirdi.”", "Gənclərlə görüşdə suallar sərt idi, amma axırda əl sıxdılar."]), after: () => { P.pol.rep = clamp(P.pol.rep + Math.round((rnd(1, 4) + (P.tal.social > 60 ? 1 : 0)) * (1 - P.pol.rep / 110))); } },
  { id: "pol_cixis", t: "Partiya tədbirində çıxış et", icon: "🎤", min: 18, if: () => !!P.pol && P.pol.party !== "bitaraf" && !isPres() && !inPrison() && !(P.army && !P.army.done), fx: () => ({ fame: chance(0.3) ? 1 : 0 }), r: () => P.tal.social > 60 ? "Çıxışın üç dəfə alqışla kəsildi. Partiya sədri sonra əlini çiyninə qoydu." : "Çıxış uzun alındı, zalda kimsə əsnədi. Amma vacib adamlar səni gördü.", after: () => { P.pol.cap += 1; P.pol.rep = clamp(P.pol.rep + (P.tal.social > 60 ? 2 : 0)); } },
  { id: "sevgi", t: "Sevgili axtar", icon: "💘", min: 16, special: "love", if: () => !person("sevgili") && !person("həyat yoldaşı") },
  { id: "sevgili", t: "Sevgilinlə görüş", icon: "🌹", min: 16, if: () => !!person("sevgili"), cost: 40, fx: () => ({ happy: rnd(5, 9) }), r: () => `${who("sevgili")} ilə bulvarda gəzdiniz.`, after: () => relAdd("sevgili", 9) },
  { id: "yoldas", t: "Həyat yoldaşınla vaxt keçir", icon: "💑", min: 18, if: () => !!person("həyat yoldaşı"), fx: () => ({ happy: rnd(4, 8) }), r: () => `${who("həyat yoldaşı")} ilə restorana getdiniz.`, after: () => relAdd("həyat yoldaşı", 9) },
  { id: "isde", t: () => CAREERS[P.job.id].work || "İşdə çox çalış", icon: "⏱️", min: 16, if: () => !!P.job && !P.job.susp, fx: () => ({ happy: -2, health: -1 }),
    r: () => ({ futbolcu: "Hamı gedəndən sonra da meydanda qaldın, cərimə zərbələri vurdun. Məşqçi gördü.", mugenni: "Səhərə qədər studiyada yeni mahnı yazdın.", hekim: "İki növbə ardıcıl. Yorğunsan, amma xəstələr səni tanıyır." }[P.job.id] || "Gec saatlara qədər işlədin. Rəhbər bunu gördü."), after: () => { P.job.perf = clamp(P.job.perf + rnd(8, 15)); P.job.boss = clamp((P.job.boss || 50) + 2); } },
  { id: "seyahet", t: "Səyahətə çıx", icon: "✈️", min: 18, cost: 1500, fx: () => ({ happy: rnd(8, 14) }), r: () => { const c = pick(["Türkiyəyə", "Gürcüstana", "Dubaya", "İtaliyaya", "Misirə", "Fransaya", "Qəbələyə", "Şəkiyə"]); P.stats.countries++; return `${c} səyahət etdin, möhtəşəm idi!`; } },
  { id: "istek", t: "Valideyndən hədiyyə istə", icon: "🎁", min: 4, max: 17, special: "wish", if: () => !inPrison() },
  { id: "al_kicik", t: "Öz pulunla al", icon: "🛍️", min: 12, max: 17, special: "shop_small", if: () => P.money >= 15 },
  { id: "al", t: "Alış-veriş: əşya, maşın, ev", icon: "🔑", min: 18, special: "shop" },
  { id: "bank", t: "Banka get", icon: "🏦", min: 18, special: "bank" },
  { id: "elave", t: "Əlavə qazanc", icon: "💼", min: 16, special: "side", if: () => SIDE_JOBS.some(s => s.if()) },
  // ---- adulthood (26+): family, home, work, community
  { id: "q_valideyn", t: "Valideynlərini ziyarət et", icon: "🏘️", min: 26, if: () => !!(person("ana") || person("ata")), fx: () => ({ happy: 4 }), r: () => pick([`Ananın dolması, atanın köhnə hekayələri. Ev hələ də uşaqlığın kimi qoxuyur.`, "Atanla bağda alma ağaclarını budadınız.", "Anan yenə “arıqlamısan” dedi və bir çanta yemək qoydu."]), after: () => { relAdd("ana", 8); relAdd("ata", 8); } },
  { id: "q_piknik", t: "Ailəlikcə təbiətə çıx", icon: "🧺", min: 26, cost: 150, if: () => !!(person("həyat yoldaşı") || person("uşaq")), fx: () => ({ happy: rnd(6, 10) }), r: () => `${pick(["Quba meşəsində", "Qəbələdə göl kənarında", "Şamaxının dağlarında", "Nabranda dəniz kənarında"])} kabab, samovar, uşaqların səsi.`, after: () => { relAdd("həyat yoldaşı", 7); relAdd("uşaq", 7); } },
  { id: "q_usaq_oyna", t: "Övladınla oyna", icon: "🧸", min: 20, if: () => people("uşaq").some(k => k.age < 12), fx: () => ({ happy: rnd(5, 9) }), r: () => { const k = people("uşaq").filter(x => x.age < 12).sort(() => R() - .5)[0]; return `${k.name} ilə ${pick(["legodan qala tikdiniz", "həyətdə top oynadınız", "yastıq davası etdiniz", "rəsm çəkdiniz"])}. Gülüşü hələ də qulağındadır.`; }, after: () => relAdd("uşaq", 8) },
  { id: "q_usaq_ders", t: "Övladının dərsinə kömək et", icon: "✏️", min: 25, if: () => people("uşaq").some(k => k.age >= 7 && k.age <= 17), fx: () => ({ happy: 1 }), r: () => { const k = people("uşaq").find(x => x.age >= 7 && x.age <= 17); return `${k.name} ilə riyaziyyat məsələsini birlikdə həll etdiniz. “Sən hər şeyi bilirsən!” — dedi.`; }, after: () => { relAdd("uşaq", 6); P.tr.family = clamp(P.tr.family + 1); } },
  { id: "q_temir", t: "Evdə təmir et", icon: "🛠️", min: 22, cost: 2000, if: () => P.assets.some(a => a.home), fx: () => ({ happy: 6 }), r: () => "Yeni mətbəx, rənglənmiş divarlar. Ev təzələndi, qiyməti də artdı.", after: () => { const a = P.assets.find(x => x.home); a.value = Math.round(a.value * 1.06); } },
  { id: "q_kurs", t: "İxtisasartırma kursuna get", icon: "🎓", min: 22, cost: 300, if: () => !!P.job && !P.job.susp, fx: () => ({ smarts: rnd(2, 4) }), r: () => "Həftəsonları kurs, sonda sertifikat. Rəhbər bunu qeyd etdi.", after: () => { P.job.perf = clamp(P.job.perf + rnd(5, 10)); } },
  { id: "q_futbol", t: "Şənbə günü dostlarla futbol", icon: "⚽", min: 26, max: 55, fx: () => ({ fitness: rnd(2, 5), happy: rnd(3, 6) }), r: () => pick(["Mini-meydanda iki saat. Qol vurdun, sonra ayağın ağrıdı 😅", "Uduzan komanda çay pulunu ödədi. Siz uddunuz!", "Köhnə dostlar, eyni zarafatlar."]), after: () => relAdd("dost", 6) },
  { id: "q_zal", t: "İdman zalına get", icon: "🏋️", min: 26, max: 65, cost: 40, fx: () => ({ fitness: rnd(3, 5), health: rnd(1, 3) }), r: () => "Həftədə üç dəfə zal. Bel ağrıların azaldı." },
  { id: "q_qonaq", t: "Evə qonaq çağır", icon: "🍲", min: 26, cost: 100, fx: () => ({ happy: rnd(4, 7) }), r: () => pick(["Plov, dolma, gecə yarısına qədər söhbət.", "Qonşular da qoşuldu, süfrə uzandıqca uzandı.", "Uşaqlıq dostların gəldi, köhnə şəkillərə baxdınız."]), after: () => { relAdd("dost", 6); relAdd("həyat yoldaşı", 3); } },
  { id: "q_xeyriyye", t: "Xeyriyyəyə ianə et", icon: "🤲", min: 22, cost: 200, fx: () => ({ happy: 5 }), r: () => pick(["Uşaq evinə qış paltarları aldın.", "Xəstə uşağın müalicəsinə kömək etdin.", "Kənd məktəbinə kitab göndərdin."]), after: () => { P.tr.empathy = clamp(P.tr.empathy + 2); } },
  // ---- 46+
  { id: "q_muayine", t: "Tam tibbi müayinədən keç", icon: "🩺", min: 46, cost: 150, fx: () => ({ health: rnd(5, 10) }), r: () => P.st.health < 50 ? "Həkim təzyiq dərmanı yazdı və rejim verdi." : "Analizlər yaxşıdır. Həkim gülümsədi: “Belə davam edin.”" },
  { id: "q_kurort", t: "Müalicəvi istirahət (Naftalan / Qalaaltı)", icon: "♨️", min: 46, cost: 800, fx: () => ({ health: rnd(6, 10), happy: rnd(4, 7) }), r: () => pick(["Naftalanda on gün: oynaqların ağrısı azaldı.", "Qalaaltının suyu və meşə havası. Yuxun düzəldi.", "İstisu sanatoriyasında dincəldin."]) },
  { id: "q_bag", t: "Bağda işlə", icon: "🌳", min: 46, if: () => P.assets.some(a => ["torpaq", "bag"].includes(a.kind)), fx: () => ({ health: 2, happy: rnd(4, 7) }), r: () => pick(["Pomidor və bibər əkdin. Torpağın qoxusu ürəyini açdı.", "Üzüm tənəyini qaydaya saldın.", "Bağda çay içib quşlara qulaq asdın."]) },
  { id: "q_neve", t: "Nəvələrlə vaxt keçir", icon: "👶", min: 40, if: () => people("nəvə").length > 0, fx: () => ({ happy: rnd(7, 11) }), r: () => `${pick(people("nəvə")).name} ilə parkda göyərçinlərə yem verdiniz.`, after: () => relAdd("nəvə", 8) },
  { id: "q_mentor", t: "Gənclərə məsləhət ver", icon: "🧑‍🏫", min: 50, if: () => !!P.job, fx: () => ({ happy: 4 }), r: () => "Gənc həmkarına təcrübəni danışdın. O, qeyd dəftərçəsinə yazırdı.", after: () => { P.tr.social = clamp(P.tr.social + 2); if (P.job) P.job.perf = clamp(P.job.perf + 4); } },
  // ---- 61+
  { id: "q_nerd", t: "Parkda nərd və şahmat", icon: "🎲", min: 58, fx: () => ({ happy: rnd(4, 7), smarts: 1 }), r: () => pick(["“Şeşbeş!” — qonşu Rafiq yenə uduzdu.", "Şahmatda gənc bir oğlana məğlub oldun, sonra ona dərs verdin.", "Parkın köşkündə çay, nərd, siyasət söhbəti."]) },
  { id: "q_gezinti", t: "Səhər gəzintisi", icon: "🚶", min: 61, fx: () => ({ health: rnd(2, 4), happy: 2 }), r: () => "Bulvarda yavaş-yavaş gəzinti. Dəniz həmişəki kimidir." },
  { id: "q_xatire", t: "Xatirələrini yaz", icon: "📔", min: 60, fx: () => ({ happy: rnd(4, 8) }), r: () => `Dəftərə yazırsan: “${P.age - rnd(30, 50)} yaşım olanda…” Nəvələr bir gün oxuyacaq.`, after: () => { P.flags.memoir = (P.flags.memoir || 0) + 1; } },
  // during military service only these are available
  { id: "a_telim", army: true, t: "Ağır təlim keç", icon: "🪖", min: 18, fx: () => ({ fitness: rnd(4, 7), health: 1, happy: -1 }), r: () => pick(["Tam döyüş sursatı ilə 10 km yürüş. Ayaqların qan içində, amma bitirdin.", "Atıcılıq təlimində hədəfi vurdun. Komandir başını tərpətdi.", "Səngər qazdınız, yağış altında. Bu günü heç vaxt unutmayacaqsan."]) },
  { id: "a_mektub", army: true, t: "Evə məktub yaz", icon: "✉️", min: 18, fx: () => ({ happy: 3 }), r: () => person("ana") ? `Anana məktub yazdın: “Hər şey yaxşıdır, narahat olma.” Cavabında yazdı ki, hər gecə sənin üçün dua edir.` : "Evə məktub yazdın. Cavab gələndə çadırda üç dəfə oxudun.", after: () => { relAdd("ana", 5); relAdd("ata", 4); relAdd("sevgili", 6); relAdd("həyat yoldaşı", 6); } },
  { id: "a_yoldas", army: true, t: "Əsgər yoldaşları ilə vaxt keçir", icon: "🫡", min: 18, fx: () => ({ happy: rnd(3, 6) }), r: () => pick(["Gecə növbəsindən sonra çay, zarafat, evdən danışmaq.", "Bölükdə nərd turniri keçirdiniz, sən ikinci oldun.", "Bakılı, gəncəli, lənkəranlı — hamı bir süfrə arxasında."]), after: () => { if (!P.npcFlags.army_friend && chance(0.4)) { const d = addPerson("dost", P.g, P.age + rnd(-1, 1)); P.npcFlags.army_friend = d.id; log(`🫡 ${d.name} ilə əsgər dostu oldunuz.`); } } },
  { id: "a_novbe", army: true, t: "Növbətçilikdə nümunə ol", icon: "🧹", min: 18, fx: () => ({ happy: -1 }), r: () => "Komandir səni bölüyün qarşısında nümunə göstərdi.", after: () => { P.tr.discipline = clamp(P.tr.discipline + 3); P.flags.orduTerif = P.age; } },
  { id: "a_mezuniyyet", army: true, t: "Məzuniyyət istə", icon: "🏡", min: 18, if: () => !!P.army && !P.army.leave, fx: () => ({}), r: () => { P.army.leave = 1; if (chance(0.5)) { apply({ happy: 10 }); relAdd("ana", 10); relAdd("ata", 8); relAdd("sevgili", 10); relAdd("həyat yoldaşı", 10); return "10 günlük məzuniyyət verdilər! Qapını açanda anan əlindəki boşqabı yerə saldı."; } apply({ happy: -4 }); return "Komandir rədd etdi: “Hələ tezdir.” Bu dəfə alınmadı."; } },
  { id: "meditasiya", t: "Dincəl", icon: "🧘", min: 5, fx: () => ({ happy: rnd(3, 6), health: 1 }), r: () => pick(["Bütün günü yatdın.", "Dəniz kənarında oturdun.", "Serial izlədin, rahatladın."]) }
];
// shop: home items marked home:true remove rent; kind drives yearly effects (moneyTick)
const SHOP = [
  { id: "m1", cat: "masin", kind: "masin", type: "maşın", t: "İşlənmiş Lada (07)", price: 4500 }, { id: "m5", cat: "masin", kind: "masin", type: "maşın", t: "İşlənmiş Opel Astra", price: 12000 },
  { id: "m2", cat: "masin", kind: "masin", type: "maşın", t: "Toyota Corolla", price: 28000 }, { id: "m6", cat: "masin", kind: "masin", type: "maşın", t: "Hyundai Tucson", price: 42000 },
  { id: "m3", cat: "masin", kind: "masin", type: "maşın", t: "Mercedes E-klass", price: 75000 }, { id: "m4", cat: "masin", kind: "masin", type: "maşın", t: "Porsche 911", price: 260000 },
  { id: "e5", cat: "menzil", kind: "menzil", type: "ev", home: true, t: "Rayonda 2 otaqlı mənzil", price: 30000 }, { id: "e1", cat: "menzil", kind: "menzil", type: "ev", home: true, t: "Köhnə tikili, 2 otaq (Sumqayıt)", price: 55000 },
  { id: "e6", cat: "menzil", kind: "menzil", type: "ev", home: true, t: "Yeni tikili, 2 otaq (Gəncə)", price: 70000 }, { id: "e2", cat: "menzil", kind: "menzil", type: "ev", home: true, t: "Yeni tikili, 3 otaq (Bakı)", price: 140000 },
  { id: "e7", cat: "menzil", kind: "heyet", type: "ev", home: true, t: "Həyət evi (Bakı kəndləri)", price: 160000 }, { id: "e3", cat: "menzil", kind: "bag", type: "ev", home: true, t: "Bağ evi (Mərdəkan)", price: 220000 },
  { id: "e4", cat: "menzil", kind: "heyet", type: "ev", home: true, t: "Villa (Novxanı)", price: 900000 },
  { id: "t1", cat: "torpaq", kind: "torpaq", type: "torpaq", t: "6 sot torpaq sahəsi (rayon)", price: 9000 }, { id: "t2", cat: "torpaq", kind: "torpaq", type: "torpaq", t: "10 sot torpaq (Abşeron)", price: 45000 },
  { id: "b1", cat: "torpaq", kind: "magaza", type: "mağaza", t: "Kiçik mağaza (kirayə gəliri)", price: 80000 }, { id: "b2", cat: "torpaq", kind: "magaza", type: "mağaza", t: "Kommersiya obyekti (Bakı)", price: 250000 }
];
const SHOP_CATS = { esya: "Əşyalar", masin: "Nəqliyyat", menzil: "Mənzil və ev", torpaq: "Torpaq və biznes" };
const LOAN = { rate: 0.12, down: 0.2, years: { masin: 5, menzil: 15, torpaq: 10 } }; // simplified bank terms (game config)
function annuity(principal, rate, years) { const r = rate; return Math.round(principal * r / (1 - Math.pow(1 + r, -years))); }
// banks lend only if the yearly payment fits in 40% of the yearly salary
function loanAffordable(it) { const yrs = LOAN.years[it.cat] || 10; return annuity(it.price * (1 - LOAN.down), LOAN.rate, yrs) <= salaryMonthly() * 12 * 0.4; }
function canLoan() { return P.age >= 21 && !!P.job && !P.job.susp && !inPrison() && (P.loans || []).length < 3; }
function buyItem(it, credit) {
  const asset = { type: it.type || "əşya", kind: it.kind, home: !!it.home, t: it.t, value: it.price, since: P.age };
  if (credit) {
    const down = Math.round(it.price * LOAN.down), yrs = LOAN.years[it.cat] || 10;
    P.money -= down;
    (P.loans = P.loans || []).push({ t: it.t, left: it.price - down, yearly: annuity(it.price - down, LOAN.rate, yrs), years: yrs, since: P.age });
  } else P.money -= it.price;
  if (it.kind !== "esya") P.assets.push(asset);
  const ch = apply({ happy: it.happy || (it.home ? 15 : it.kind === "masin" ? 8 : 6), smarts: it.smarts || 0 });
  if (it.rel) relAdd(it.rel, 10);
  return ch;
}

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
  if (L.v < 3) {
    // v3: children no longer get a yearly family allowance; trim what the old rule had piled up
    if (L.age < 16) L.money = Math.min(L.money, Math.max(0, L.age - 9) * 25);
    L.v = 3;
  }
  if (L.v < 4) {
    // v4: parents get professions, grandparents exist, under-18 money only from family/finds/part-time work
    for (const p of L.people) if ((p.role === "ana" || p.role === "ata") && !p.job) p.job = pick(PARENT_JOBS[p.g]);
    if (!L.people.some(p => p.role === "nənə" || p.role === "baba")) { const keep = P; P = L; addGrandparents(); P = keep; }
    if (L.age < 18) L.money = Math.min(L.money, 30);
    L.v = 4;
  }
  if (L.v < 5) {
    // v5: military service is counted from the birthday of the year it started; discharge if already over
    if (L.army && !L.army.done && L.army.start != null) {
      const start = Cal.addYears(L.birth, Cal.yearsBetween(L.birth, L.army.start));
      L.army.start = start; L.army.end = Cal.addMonths(start, L.army.months || 18);
      if (L.army.end <= L.day + 31) { L.army.done = true; (L.log.find(y => y.age === L.age) || (L.log.push({ age: L.age, items: [] }), L.log[L.log.length - 1])).items.push(`🏠 Hərbi xidmət (${L.army.months} ay) başa çatdı. Evə qayıtdı.`); }
    }
    L.v = 5;
  }
  if (L.v < 6) {
    // v6: careers with salary bands, employer, boss, company; licences; legal record
    if (L.job) {
      const c = CAREERS[L.job.id];
      if (c && !L.job.sal) { const [a, b] = c.sal[Math.min(L.job.lv, c.sal.length - 1)]; L.job.sal = Math.round(((a + b) / 2) * (L.job.bonus || 1)); }
      L.job.lvYears = L.job.lvYears ?? Math.min(L.job.years || 0, 2); L.job.boss = L.job.boss ?? 55; L.job.company = L.job.company ?? 65;
      L.job.employer = L.job.employer || (c && c.employers ? c.employers[0] : "—");
    }
    L.lic = L.lic || {}; if (L.flags.vesiqe != null) L.lic.surucu = true;
    L.legal = L.legal || { record: [], case: null, prison: null, history: [] };
    if (L.flags.cinayet != null) L.legal.record.push({ day: L.day, age: L.flags.cinayet, type: "rusvet_alma", verdict: "şərti", years: 2 });
    L.careerHist = L.careerHist || [];
    L.v = 6;
  }
  if (L.v < 8) {
    // v8: convictions get an expunge date (prison: counted from release)
    const L8 = L.legal; if (L8 && L8.record) { const keep = P; P = L; for (const r of L8.record) if (!r.expires) { const X = RULES.justice.expunge; const term = (L8.terms || []).find(t => t.start >= r.day - 400) || (L8.prison && L8.prison.start >= r.day - 400 ? L8.prison : null); const base = r.verdict === "həbs" ? (term && term.out) : r.day; if (base != null) r.expires = Cal.addMonths(base, Math.round(12 * (r.verdict === "cərimə" ? X.fine : r.verdict === "şərti" ? (r.years || 1) + X.suspended_after_probation : r.years <= 3 ? X.prison_upto_3 : r.years <= 10 ? X.prison_upto_10 : X.prison_over_10))); } if (L8.prison && !(L8.terms || []).length) L8.terms = [L8.prison]; P = keep; }
  }
  if (L.v < 7) {
    // v7: teachers and coaches leave the active list once school / football is over
    const keep = P; P = L; contextTick(); P = keep;
    L.v = 7;
  }
  if (L.v < 8) L.v = 8;
  if (!L.owned) { L.owned = {}; if (L.soc) L.owned.telefon = { age: L.age, day: L.day }; if (L.flags && L.flags.kodYazir != null) L.owned.komputer = { age: L.age, day: L.day }; if (L.age >= 12) L.owned.geyim = { age: L.age, day: L.day }; }
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
  const extra = (f.med && !medicalOk()) ? "tibbi komissiyadan keçmədin" : (f.fit && P.st.fitness < f.fit) ? `fiziki hazırlıq yetərli deyil (${P.st.fitness}/${f.fit})` : (f.music && P.tal.music < f.music) ? "musiqi qabiliyyəti imtahanından keçmədin" : null;
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
    qardas: who("qardaş"), baci: who("bacı"), usaq: who("uşaq"), nene: who("nənə"), baba: who("baba")
  }[k] ?? m));
}
