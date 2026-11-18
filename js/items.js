/* Personal belongings by age and gender: toys, gadgets, clothes, transport. Children ask their parents (who may say no);
   from 12 one can buy with one's own money. Some things matter: no phone → no Pıçıltı, no computer → coding is slow,
   worn-out clothes → teasing at school. Things wear out after `life` years. */
"use strict";

const ITEMS = [
  { id: "oyuncaq_masin", t: "Pultlu oyuncaq maşın", icon: "🚙", price: 45, age: [3, 9], g: "k", fx: { happy: 6 } },
  { id: "gelincik", t: "Gəlincik və evcik", icon: "🪆", price: 50, age: [3, 9], g: "q", fx: { happy: 6 } },
  { id: "nagil", t: "Nağıl kitabları", icon: "📚", price: 20, age: [3, 10], fx: { smarts: 2, happy: 2 } },
  { id: "konstruktor", t: "Konstruktor (LEGO)", icon: "🧱", price: 90, age: [5, 13], fx: { smarts: 2, happy: 5 } },
  { id: "top", t: "Futbol topu", icon: "⚽", price: 35, age: [5, 16], fx: { fitness: 2, happy: 3 } },
  { id: "rezin", t: "Rəngli rezin və saç aksesuarları", icon: "🎀", price: 15, age: [5, 12], g: "q", fx: { happy: 3, looks: 1 } },
  { id: "velosiped", t: "Velosiped", icon: "🚲", price: 250, age: [6, 70], own: "velosiped", life: 7, fx: { fitness: 3, happy: 6 } },
  { id: "konsol", t: "Oyun konsolu", icon: "🎮", price: 900, age: [9, 45], own: "konsol", life: 6, fx: { happy: 8, smarts: -1 } },
  { id: "telefon", t: "Smartfon", icon: "📱", price: 600, age: [11, 99], own: "telefon", life: 4, fx: { happy: 5 }, need: "Telefon olmadan Pıçıltı-da paylaşım etmək olmur." },
  { id: "komputer", t: "Noutbuk", icon: "💻", price: 1500, age: [11, 99], own: "komputer", life: 6, fx: { happy: 4, smarts: 1 }, need: "Kompütersiz proqramlaşdırma və dərslər çətin gedir." },
  { id: "geyim", t: "Yeni paltar və ayaqqabı", icon: "👕", price: 220, age: [12, 99], own: "geyim", life: 2, fx: { looks: 3, happy: 3 }, need: "Köhnə paltarlar sinifdə (və işdə) gözə çarpır." },
  { id: "idman_ayaq", t: "Brend idman ayaqqabısı", icon: "👟", price: 180, age: [10, 60], fx: { fitness: 1, happy: 3, looks: 1 } },
  { id: "makiyaj", t: "Makiyaj dəsti", icon: "💄", price: 120, age: [14, 99], g: "q", fx: { looks: 3, happy: 3 } },
  { id: "canta", t: "Çanta və aksesuarlar", icon: "👜", price: 180, age: [13, 99], g: "q", fx: { looks: 2, happy: 3 } },
  { id: "etir", t: "Ətir", icon: "🌸", price: 140, age: [15, 99], fx: { looks: 1, happy: 2 } },
  { id: "saat", t: "Ağıllı saat", icon: "⌚", price: 350, age: [14, 80], fx: { happy: 3, fitness: 1 } },
  { id: "skuter", t: "Elektrik skuter", icon: "🛴", price: 700, age: [14, 50], own: "skuter", life: 4, fx: { happy: 6 } },
  { id: "moto", t: "Motosiklet", icon: "🏍️", price: 4500, age: [18, 60], own: "moto", life: 10, fx: { happy: 9 } },
  { id: "zerg", t: "Qızıl sırğa", icon: "💛", price: 900, age: [16, 99], g: "q", fx: { looks: 2, happy: 4 } },
  { id: "mebel", t: "Yeni mebel dəsti", icon: "🛋️", price: 4000, age: [20, 99], fx: { happy: 6 } },
  { id: "bilerzik", t: "Qızıl bilərzik (həyat yoldaşına)", icon: "💍", price: 2500, age: [20, 99], spouse: true, fx: { happy: 4 }, rel: "həyat yoldaşı" }
];
const owns = k => !!(P.owned && P.owned[k]);
const itemsFor = () => ITEMS.filter(it => P.age >= it.age[0] && P.age <= it.age[1] && (!it.g || it.g === P.g) && (!it.spouse || person("həyat yoldaşı")) && !(it.own && owns(it.own)));
function giveItem(it, how) {
  if (it.own) (P.owned = P.owned || {})[it.own] = { age: P.age, day: P.day };
  if (it.id === "telefon" && P.age >= 12 && !P.soc) socOpen();
  const ch = apply(it.fx || {}); if (it.rel) relAdd(it.rel, 10);
  log(`${it.icon} ${it.t}${how ? " (" + how + ")" : ""}.`);
  return ch;
}
// a child asks: parents (or grandparents) decide by the family's means, the price and how close you are
function askParents(it) {
  const parent = person("ana") || person("ata") || person("nənə") || person("baba");
  if (!parent) return { ok: false, text: "Səndən başqa soruşacaq adam yoxdur. Bu arzu gözləyəcək." , changes: apply({ happy: -2 }) };
  const means = familyMeans(), afford = [40, 120, 400, 900, 2000, 4000, 8000][Math.min(6, means)];
  const p = it.price > afford * 1.5 ? 0.05 : clamp(Math.round((0.35 + parent.rel / 250 + (it.need ? 0.25 : 0) - it.price / (afford * 4)) * 100)) / 100;
  const who = parent.role === "ana" ? "Anan" : parent.role === "ata" ? "Atan" : parent.role === "nənə" ? "Nənən" : "Baban";
  if (chance(p)) { const ch = giveItem(it, "hədiyyə"); relAdd(parent.role, 3); return { ok: true, text: `${who} gülümsədi: “Yaxşı, amma dərslərin də əla olsun!” ${it.t} artıq sənindir.`, changes: ch }; }
  relAdd(parent.role, -1);
  return { ok: false, text: it.price > afford * 1.5 ? `${who} ah çəkdi: “Bala, bu, bizim bir aylıq pulumuzdur. İmkanımız yoxdur.”` : pick([`${who} dedi: “Pul ağacda bitmir.”`, `${who}: “Ad gününə qədər gözlə, baxarıq.”`, `${who}: “Əvvəlcə qiymətlərini düzəlt.”`]), changes: apply({ happy: -3 }) };
}
function buyOwn(it) { if (P.money < it.price) return null; P.money -= it.price; const ch = giveItem(it, "öz pulunla"); return [["money", -it.price], ...ch]; }
// yearly: things wear out; missing essentials have consequences
function itemsTick(msgs) {
  for (const [k, v] of Object.entries(P.owned || {})) {
    const it = ITEMS.find(x => x.own === k); if (!it || !it.life) continue;
    if (P.age - v.age >= it.life && chance(0.5)) { delete P.owned[k]; msgs.push(`${it.icon} ${it.t} köhnəldi və sıradan çıxdı.`); log(`${it.icon} ${it.t} sıradan çıxdı.`); }
  }
  // parents with some means keep buying a child's clothes; in poorer families the teenager has to ask or earn
  if (P.age < 18 && !owns("geyim") && familyMeans() >= 2 && (person("ana") || person("ata"))) (P.owned = P.owned || {}).geyim = { age: P.age, day: P.day };
  if (P.age >= 13 && P.age <= 22 && !inPrison() && !(P.army && !P.army.done) && !owns("geyim")) { apply({ looks: -2, happy: -2 }); if (chance(0.5)) msgs.push(pick(["👕 Paltarların köhnəlib. Sinifdə kimsə pıçıldayıb güldü.", "👟 Ayaqqabının altı açılıb. Yağışlı gündə ayaqların islandı."])); }
}
