/* Life events. Each event: { id, age:[min,max], icon, t (text, may use {ad} {ana} … placeholders), ch: [choices] }
   choice: { t, if?, fx?, r? (result text), go?(P) -> optional extra text, odds?: [{p, fx, r, go}] }
   flags on the event: w (weight), force (always fires when eligible), once (default true), cool (years between repeats),
   g ("k"/"q"), job (career id or list), stage (education stage), need (list of roles that must exist), if(P). */
"use strict";
const lose = () => P.st.happy < 30;
const EVENTS = [
// ===================== UŞAQLIQ 5–11 =====================
{ id: "bagca_oyuncaq", age: [5, 6], icon: "🧸", t: "Bağçada bir uşaq ən sevdiyin oyuncağını əlindən aldı.", ch: [
  { t: "Geri al", odds: [{ p: .6, fx: { happy: 4 }, r: "Oyuncağını geri aldın. Tərbiyəçi ikinizi də küncə qoydu, amma dəyərdi." }, { p: .4, fx: { happy: -4, health: -2 }, r: "Dava düşdü, dizin sıyrıldı. Ağlaya-ağlaya evə getdin." }] },
  { t: "Tərbiyəçiyə de", fx: { happy: 1, smarts: 1 }, r: "Tərbiyəçi oyuncağı qaytardı və ikinizi barışdırdı." },
  { t: "Başqa oyuncaqla oyna", fx: { happy: -1 }, r: "Kubiklərdən qala tikdin. Heç pis olmadı." }] },
{ id: "bagca_seir", age: [5, 6], icon: "🎤", t: "Bağçanın Novruz şənliyində şeir demək lazımdır. Hamı sənə baxır.", ch: [
  { t: "Ucadan, ürəklə de", odds: [{ p: .7, fx: { happy: 6, rel: { ana: 6 } }, r: "Hamı alqışladı, anan kövrəldi.", go: () => { P.tal.acting += 3; } }, { p: .3, fx: { happy: -5 }, r: "Ortasında unutdun, donub qaldın. Sonra hamı güldü…" }] },
  { t: "Utanıb anamın arxasında gizlən", fx: { happy: -2 }, r: "Şeiri başqa uşaq dedi. Sən səməni yedin." }] },
{ id: "dis_cixdi", age: [5, 7], icon: "🦷", t: "Ön dişin laxlayıb. Atan deyir ki, sap bağlayıb qapını çırpaq.", ch: [
  { t: "Razıyam!", fx: { happy: 3 }, r: "Diş çıxdı! Onu damın üstünə atdın: “Köhnə dişi al, təzəsini ver.”" },
  { t: "Yox! Özü düşsün", fx: { happy: 1 }, r: "Bir həftə sonra dişi alma yeyəndə düşdü." }] },
{ id: "pisik", age: [5, 10], icon: "🐱", t: "Həyətdə ac, balaca bir pişik tapdın. Evə aparmaq istəyirsən.", ch: [
  { t: "Anamdan icazə istə", odds: [{ p: .5, fx: { happy: 10, rel: { ana: 3 } }, r: "Anan razılaşdı! Adını “Mestan” qoydun.", go: () => { P.flags.pisik = P.age; } }, { p: .5, fx: { happy: -4 }, r: "Anan icazə vermədi. Hər gün ona həyətdə yemək apardın." }] },
  { t: "Gizlicə otağına apar", odds: [{ p: .4, fx: { happy: 8 }, r: "Üç gün heç kim bilmədi. Sonra pişik nənənin yun yumağını dağıtdı 😅", go: () => { P.flags.pisik = P.age; } }, { p: .6, fx: { happy: -3, rel: { ana: -5 } }, r: "Anan tapdı və bərk danladı." }] },
  { t: "Ona süd ver, həyətdə qalsın", fx: { happy: 3 }, r: "Pişik hər gün qapıda səni gözləyir." }] },
{ id: "velosiped", age: [6, 10], icon: "🚲", t: "Atan sənə velosiped alıb! Amma hələ sürə bilmirsən.", need: ["ata"], ch: [
  { t: "Atam öyrətsin", fx: { fitness: 3, happy: 6, rel: { ata: 8 } }, r: "Atan arxadan tutdu, sonra gizlicə buraxdı. Sən artıq tək sürürsən!" },
  { t: "Özüm öyrənərəm", odds: [{ p: .5, fx: { fitness: 4, happy: 5 }, r: "Bir neçə yıxılmadan sonra öyrəndin!" }, { p: .5, fx: { health: -6, happy: -2 }, r: "Bordürə dəydin, qolun sıyrıldı. Yaşıl məlhəm vaxtıdır." }] }] },
{ id: "sinif_dava", age: [7, 11], icon: "🥊", t: "Sinif yoldaşın teneffüsdə səni hər gün ələ salır.", ch: [
  { t: "Müəllimə de", fx: { happy: 2, rel: { "müəllim": 4 } }, r: "{müəllim} müəllim onunla danışdı, ələ salmaq dayandı." },
  { t: "Dava et", odds: [{ p: P => P.st.fitness / 120, fx: { happy: 6, fitness: 1 }, r: "Bir daha sənə toxunmadı. Amma valideynlərin məktəbə çağırıldı." }, { p: .5, fx: { happy: -6, health: -5 }, r: "Davada uduzdun, gözünün altı göyərdi." }] },
  { t: "Məhəl qoyma", fx: { happy: -3, smarts: 1 }, r: "Bir müddət sonra sənə məhəl qoymayanda o da bezdi." },
  { t: "Zarafatla cavab ver", odds: [{ p: .55, fx: { happy: 5 }, r: "Bütün sinif güldü, o özü utandı. İndi dostsunuz.", go: () => { P.tal.social += 3; } }, { p: .45, fx: { happy: -3 }, r: "Zarafatın alınmadı, daha çox güldülər." }] }] },
{ id: "ilk_dost", age: [6, 9], icon: "🤝", if: () => !person("dost"), t: "Sinifdə yanında oturan uşaq səninlə çörəyini bölüşdü.", ch: [
  { t: "Dost ol", fx: { happy: 6 }, go: () => { const d = addPerson("dost", P.g, P.age); return `${d.name} ilə ən yaxın dost oldunuz!`; } },
  { t: "Utan, danışma", fx: { happy: -2 }, r: "Danışmadın. Bəlkə növbəti dəfə…" }] },
{ id: "olimpiada", age: [9, 16], icon: "🏅", if: () => P.st.smarts > 60, t: "Müəllimin səni riyaziyyat olimpiadasına yazmaq istəyir.", ch: [
  { t: "Hazırlaş və iştirak et", odds: [{ p: P => P.st.smarts / 130, fx: { smarts: 5, happy: 8, rel: { ana: 6, ata: 6 } }, r: "Rayon olimpiadasında birinci yer! Adın məktəbin divar qəzetində." , go: () => { P.flags.olimpiada = P.age; } }, { p: .4, fx: { smarts: 3, happy: -2 }, r: "Yer tuta bilmədin, amma çox şey öyrəndin." }] },
  { t: "İstəmirəm", fx: { happy: 1 }, r: "Olimpiadaya başqası getdi." }] },
{ id: "bedden_muellim", age: [8, 13], icon: "🏃", if: () => P.tal.sport > 60, t: "Bədən tərbiyəsi müəllimi deyir: “Sən çox sürətlisən! İdman məktəbinə get.”", ch: [
  { t: "Futbol bölməsinə yazıl", fx: { fitness: 6, happy: 4 }, go: () => { P.flags.futbolBolme = P.age; P.tal.sport += 5; const m = addPerson("məşqçi", "k", rnd(35, 55)); return `${m.name} məşqçi səni komandaya götürdü.`; } },
  { t: "Güləşə get", fx: { fitness: 7, health: 2 }, r: "Güləş məşqləri səni möhkəmlətdi." },
  { t: "Dərslərimə fikir verim", fx: { smarts: 2 }, r: "İdmanı sonraya saxladın." }] },
{ id: "musiqi_mekteb", age: [6, 12], icon: "🎹", if: () => P.tal.music > 55, t: "Musiqi müəllimi valideynlərinə deyir ki, səsin və eşitmə qabiliyyətin çox yaxşıdır.", ch: [
  { t: "Musiqi məktəbinə get", fx: { happy: 3 }, go: () => { P.tal.music += 8; P.flags.musiqiMekteb = P.age; return "Hər axşam pianino… Barmaqların artıq özü çalır."; } },
  { t: "Vaxtım yoxdur", fx: { happy: 1 }, r: "Musiqi hobbi olaraq qaldı." }] },
{ id: "xeyal_10", age: [10, 10], force: true, icon: "💭", t: "Müəllim sinifdə soruşur: “Böyüyəndə kim olmaq istəyirsən?” Sən 5 yaşında {xəyal} demişdin.", ch: () => [
  { t: `Yenə də ${dreamName()}!`, fx: { happy: 2 }, r: "Xəyalın dəyişməyib. Müəllim gülümsədi." },
  ...DREAMS.filter(d => d.id !== P.dream).sort(() => R() - .5).slice(0, 3).map(d => ({ t: `İndi ${d.t.toLowerCase()} olmaq istəyirəm`, r: `Artıq yeni xəyalın var: ${d.t.toLowerCase()}.`, go: () => { P.dream = d.id; } }))] },
{ id: "pul_tapdi", age: [7, 14], icon: "💵", t: "Yolda yerə düşmüş 20 manat tapdın.", ch: [
  { t: "Özümə saxlayım", fx: { money: 20, happy: 4 }, r: "Dondurma və saqqız aldın. Vicdanın bir az narahatdır." },
  { t: "Sahibini axtar", odds: [{ p: .5, fx: { happy: 6 }, r: "Pulu itirən qoca qadın tapıldı, sənə dua etdi." }, { p: .5, fx: { happy: 2 }, r: "Sahibi tapılmadı, pulu məscidin ianə qutusuna saldın." }] }] },
{ id: "nenegil", age: [5, 12], icon: "🏡", t: "Yay tətilində kənddə nənəgildəsən. Nənən deyir: “Get, toyuqlara dən ver.”", ch: [
  { t: "Gedirəm", fx: { happy: 4, health: 2 }, r: "Xoruz səni qovdu, amma yumurtaları topladın! 🐓" },
  { t: "Ağaca dırmaş, gilas ye", odds: [{ p: .7, fx: { happy: 6 }, r: "Ağzın-üzün gilas oldu 🍒" }, { p: .3, fx: { health: -8 }, r: "Budaq sındı, yıxıldın. Qolun bir ay sarğıda qaldı." }] }] },
{ id: "xestelik_usaq", age: [5, 12], icon: "🤒", t: "Qızdırmanız var, boğazın ağrıyır.", ch: [
  { t: "Dərman iç, yat", fx: { health: -3 }, r: "Bir həftə məktəbə getmədin, multfilm izlədin." },
  { t: "Nənənin üsulu: moruq mürəbbəli çay", fx: { health: -1, happy: 3 }, r: "Ertəsi gün durub gəzirdin." }] },
{ id: "qardas_dava", age: [6, 15], icon: "😤", if: () => person("qardaş") || person("bacı"), t: "Bacı/qardaşınla televizorun pultu üstündə dava düşdü.", ch: [
  { t: "Güzəştə get", fx: { happy: -1, rel: { "qardaş": 5, "bacı": 5 } }, r: "Onun istədiyinə baxdınız. Sonra sənə şokolad verdi." },
  { t: "Pultu zorla al", fx: { happy: 2, rel: { "qardaş": -6, "bacı": -6 } }, r: "Pult səndə, amma bir həftə danışmadınız." },
  { t: "Anama şikayət et", fx: { rel: { "qardaş": -3, "bacı": -3 } }, r: "Anan televizoru söndürdü: “İkiniz də dərsə!”" }] },
{ id: "seir_yarisi", age: [8, 14], icon: "✍️", t: "Məktəbdə “Vətən” mövzusunda inşa müsabiqəsi var.", ch: [
  { t: "Yaz", odds: [{ p: P => P.st.smarts / 120, fx: { smarts: 3, happy: 5 }, r: "İnşan birinci oldu, radioda oxundu!" }, { p: .4, fx: { smarts: 2 }, r: "Fəxri fərman aldın." }] },
  { t: "Yazma", r: "Bu dəfə yazmadın." }] },
{ id: "itdi", age: [6, 10], icon: "🛒", t: "Anan ilə bazarda gəzirdin və birdən onu itirdin…", ch: [
  { t: "Olduğum yerdə dayanım", fx: { smarts: 1 }, r: "Anan 5 dəqiqə sonra səni tapdı və bərk qucaqladı." },
  { t: "Ağla", fx: { happy: -3 }, r: "Bir satıcı səni sakitləşdirdi, anonsla ananı çağırdılar." },
  { t: "Tək evə getməyə çalış", odds: [{ p: .5, fx: { happy: 2 }, r: "Yolu tapdın! Anan isə qorxudan az qala ürəyi dayandı." }, { p: .5, fx: { happy: -6 }, r: "Azdın. Polis səni evə gətirdi." }] }] },
{ id: "komputer", age: [8, 13], icon: "🎮", t: "Doğum günündə kompüter oyunu hədiyyə etdilər. Saatlarla oynamaq istəyirsən.", ch: [
  { t: "Gecə yarısına qədər oyna", fx: { happy: 6, smarts: -2, health: -2 }, r: "Səviyyələri bitirdin, amma səhər dərsdə yatdın." },
  { t: "Gündə 1 saat", fx: { happy: 3 }, r: "Həm oyun, həm dərs. Valideynlərin razıdır.", go: () => { relAdd("ana", 3); } }] },
{ id: "teatr_usaq", age: [7, 12], icon: "🎭", if: () => P.tal.acting > 55, t: "Məktəb tamaşasında baş rol üçün sınaq var.", ch: [
  { t: "Sınağa get", odds: [{ p: P => P.tal.acting / 110, fx: { happy: 8, looks: 2 }, r: "Baş rolu aldın! Tamaşadan sonra hamı səni təbrik etdi.", go: () => { P.tal.acting += 6; P.flags.tamasa = P.age; } }, { p: .4, fx: { happy: -3 }, r: "Ağac rolunu aldın 🌳 Amma çox gözəl ağac idin." }] },
  { t: "Getmirəm", r: "Tamaşaya tamaşaçı kimi baxdın." }] },
{ id: "pisik_oldu", age: [9, 18], icon: "🐾", if: () => P.flags.pisik && P.age - P.flags.pisik > 3, t: "Pişiyin Mestan qocalıb, çox xəstədir.", ch: [
  { t: "Baytara apar", fx: { money: -40, happy: -6 }, r: "Baytar əlindən gələni etdi. Mestan sakitcə yuxuya getdi. Onu həyətdə basdırdın." },
  { t: "Yanında otur", fx: { happy: -8 }, r: "Son gecəsini qucağında keçirdi." }] },

// ===================== YENİYETMƏLİK 12–17 =====================
{ id: "telefon", age: [12, 13], force: true, icon: "📱", t: "Valideynlərin sənə ilk smartfonunu aldı! Bütün sinif “Pıçıltı” sosial şəbəkəsindədir.", ch: [
  { t: "Pıçıltı-da hesab aç", fx: { happy: 8 }, go: () => { socOpen(); return `Hesabın hazırdır: ${P.soc.handle}. Artıq paylaşım edə bilərsən (Fəaliyyət → Pıçıltı).`; } },
  { t: "Sosial şəbəkə mənlik deyil", fx: { smarts: 2 }, go: () => { socOpen(); P.soc.followers = 3; return "Hesabı sonra açdın, amma demək olar ki, girmirsən."; } }] },
{ id: "ilk_sevgi", age: [13, 16], icon: "💌", t: "Paralel sinifdən biri ilə gözlər tez-tez toqquşur…", ch: [
  { t: "Məktub yaz", odds: [{ p: P => .3 + P.st.looks / 200, fx: { happy: 12 }, r: "Cavab gəldi: “Mən də…” 🥰 Teneffüslərdə birlikdəsiniz.", go: () => { const g = P.g === "k" ? "q" : "k"; addPerson("sevgili", g, P.age); } }, { p: .5, fx: { happy: -10 }, r: "Məktubu bütün sinfə göstərdi. Bir həftə məktəbə getmək istəmədin." }] },
  { t: "Heç nə etmə", fx: { happy: -2 }, r: "Bu, sənin sirrin olaraq qaldı." }] },
{ id: "siqaret", age: [13, 17], icon: "🚬", t: "Böyük sinif uşaqları məktəbin arxasında sənə siqaret uzatdı: “Kişi ol!”", ch: [
  { t: "Yox, sağ ol", fx: { health: 1 }, r: "Bir az güldülər, amma sonra hörmət etdilər." },
  { t: "Bir dənə çəkim", odds: [{ p: .6, fx: { health: -4, happy: 1 }, r: "Öskürdün, başın gicəlləndi. Bir də istəmədin." }, { p: .4, fx: { health: -6 }, r: "Atan qoxunu bildi. Evdə böyük söhbət oldu.", go: () => { relAdd("ata", -10); P.flags.siqaret = P.age; } }] }] },
{ id: "repetitor", age: [14, 16], icon: "📚", t: "Valideynlərin qəbul imtahanı üçün sənə repetitor tutmaq istəyir. Bahalıdır.", ch: [
  { t: "Razıyam, ciddi oxuyacağam", fx: { smarts: 8, happy: -4, rel: { ana: 4, ata: 4 } }, r: "Hər gün dərs, hər gün test. Amma nəticə görünür.", go: () => { P.flags.repetitor = P.age; } },
  { t: "Özüm hazırlaşaram", odds: [{ p: P => P.st.smarts / 140, fx: { smarts: 5 }, r: "İnternetdəki videolarla əla hazırlaşırsan." }, { p: .5, fx: { smarts: 1, happy: 3 }, r: "Planın idi… amma futbola baxmaq daha maraqlı idi." }] }] },
{ id: "skaut", age: [13, 18], icon: "🔭", if: () => P.tal.sport > 62 && P.st.fitness > 50 && !P.flags.akademiya, w: 3, t: "Məhəllə turnirində oynayırdın. Matçdan sonra bir nəfər yaxınlaşdı: “Mən klub skautuyam. Akademiyamıza gəl.”", ch: [
  { t: "Razıyam! Futbol mənim həyatımdır", fx: { happy: 12, fitness: 5 }, go: () => { P.flags.akademiya = P.age; P.tal.sport += 5; if (!person("məşqçi")) addPerson("məşqçi", "k", rnd(38, 58)); return `Futbol akademiyasına qəbul olundun!${P.dream !== "futbolcu" ? ` Halbuki xəyalın ${dreamName()} idi… Həyat, sən nə qəribəsən!` : ""}`; } },
  { t: "Dərsə mane olar, yox", fx: { smarts: 2 }, r: "Skaut vizit kartını qoyub getdi. Bəlkə də səhv edirsən…" }] },
{ id: "akademiya_mac", age: [14, 18], icon: "⚽", if: () => P.flags.akademiya && !P.job, once: false, cool: 2, t: "Akademiyada vacib matçdır. Məşqçi {məşqçi} sənə güvənir.", ch: [
  { t: "Bütün gücünlə oyna", odds: [{ p: P => P.st.fitness / 110, fx: { fitness: 3, happy: 8, fame: 1 }, r: "İki qol vurdun! Kluba xəbər çatdı.", go: () => { P.flags.akademiyaQol = (P.flags.akademiyaQol || 0) + 1; } }, { p: .35, fx: { health: -10 }, r: "Zədə aldın, bir ay oynamayacaqsan." }] },
  { t: "Komanda üçün oyna, ötürmə ver", fx: { happy: 4 }, r: "Üç məhsuldar ötürmə! Məşqçi səni ayrıca təriflədi.", go: () => { relAdd("məşqçi", 8); } }] },
{ id: "futbol_muqavile", age: [17, 21], force: true, icon: "✍️", if: () => P.flags.akademiya && !P.job && P.st.fitness > 55, t: "Klub səninlə ilk peşəkar müqaviləni imzalamaq istəyir!", ch: [
  { t: "İmzala", fx: { happy: 15 }, go: () => { startJob("futbolcu", 0, "Peşəkar futbolçu oldu"); return "Artıq peşəkar futbolçusan! ⚽"; } },
  { t: "Təhsil daha vacibdir", fx: { smarts: 2 }, go: () => { delete P.flags.akademiya; return "Futbolu buraxdın. Bəlkə nə vaxtsa peşman olacaqsan…"; } }] },
{ id: "ses_yarisi", age: [15, 30], icon: "🎙️", if: () => P.tal.music > 60 && (!P.job || P.job.id !== "mugenni"), w: 2, t: "Televiziyada “Səs Azərbaycan” yarışmasına seçim elan olunub.", ch: [
  { t: "Qatıl", odds: [{ p: P => P.tal.music / 140 + P.st.looks / 500, fx: { happy: 15, fame: 12 }, r: "Finala çıxdın! Bütün ölkə səni tanıdı.", go: () => { if (P.soc) P.soc.followers += rnd(15000, 60000); if (P.age >= 16) { startJob("mugenni", 1, "Səhnəyə çıxdı"); return P.dream !== "mugenni" ? `Xəyalın ${dreamName()} idi, amma indi müğənnisən. Həyat, sən nə qəribəsən!` : "Xəyalın gerçəkləşdi!"; } } }, { p: .6, fx: { happy: -6, fame: 2 }, r: "Münsiflər “növbəti dəfə” dedi. Amma videon yayıldı." }] },
  { t: "Cəsarətim çatmır", fx: { happy: -2 }, r: "Yarışmanı evdən izlədin və hər mahnını özün də oxudun." }] },
{ id: "dost_xeyanet", age: [13, 22], icon: "💔", need: ["dost"], t: "Eşitdin ki, ən yaxın dostun {dost} sənin sirrini başqalarına danışıb.", ch: [
  { t: "Üzünə de, danış", odds: [{ p: .6, fx: { happy: 2, rel: { dost: 6 } }, r: "Səhv başa düşülmüş imiş. Barışdınız." }, { p: .4, fx: { happy: -6, rel: { dost: -20 } }, r: "Mübahisə böyüdü. Artıq dost deyilsiniz.", go: () => { if (person("dost") && person("dost").rel < 30) removeRole("dost", "küsülü"); } }] },
  { t: "Danışmadan uzaqlaş", fx: { happy: -5 }, go: () => { removeRole("dost", "uzaqlaşdı"); return "Səssizcə uzaqlaşdın. Bəzən belə olur."; } }] },
{ id: "mezun_gecesi", age: [17, 17], force: true, icon: "🎉", stage: "mezun", t: "Buraxılış gecəsi! Hamı ən gözəl paltarındadır.", ch: [
  { t: "Səhərə qədər rəqs et", fx: { happy: 10, looks: 1 }, r: "Dəniz kənarında günəşin doğuşunu qarşıladınız 🌅" },
  { t: "Erkən evə get", fx: { happy: 2 }, r: "Fotolar çəkdirdin və evə qayıtdın." }] },
{ id: "imtahan", age: [17, 19], force: true, icon: "📝", if: () => P.edu.stage === "mezun" && !P.flags.imtahanVerdi, t: () => `Qəbul imtahanı vaxtıdır! Orta qiymətin ${(2 + P.edu.gpa / 33.4).toFixed(1)}. Hansı ixtisasa sənəd verirsən? (Xəyalın: ${dreamName()})`, ch: () => [
  ...Object.entries(FACULTIES).map(([id, f]) => ({ t: `${f.t}${FACULTIES[id].opens === P.dream ? " ⭐" : ""}`, go: () => examTry(id) })),
  { t: "Universitetə getmirəm, işləyəcəyəm", go: () => { P.flags.imtahanVerdi = P.age; P.edu.stage = "bitdi"; return "Oxumaq əvəzinə iş həyatına başladın. (Fəaliyyət → İş axtar)"; } }] },
{ id: "ordu", age: [18, 25], force: true, g: "k", if: () => !P.army && P.edu.stage !== "uni" && !P.flags.akademiya && !(P.job && P.job.id === "futbolcu") && P.flags.imtahanVerdi, icon: "🎖️", t: "Hərbi komissarlıqdan çağırış vərəqəsi gəldi. Vətən borcunu ödəmək vaxtıdır.", ch: [
  { t: "Xidmətə get", fx: { happy: -4 }, go: () => { P.army = { left: 2, done: false }; endJob("hərbi xidmət"); return "18 aylıq hərbi xidmətə yola düşdün. Anan suyu arxanca atdı 💧"; } }] },
{ id: "ordu_hadise", age: [18, 27], icon: "🪖", if: () => P.army && !P.army.done, t: "Hərbi hissədə komandir səni növbətçi təyin etdi, amma çox yorğunsan.", ch: [
  { t: "Ayıq qal, növbəni çək", fx: { fitness: 3, smarts: 1 }, r: "Komandir intizamını təriflədi, məzuniyyət verdi!", go: () => { P.flags.orduTerif = P.age; } },
  { t: "Bir az mürgülə", odds: [{ p: .5, fx: {}, r: "Heç kim görmədi, şanslısan." }, { p: .5, fx: { happy: -8, fitness: 2 }, r: "Tutuldun. Bir həftə kartof soydun 🥔" }] }] },

// ===================== UNİVERSİTET =====================
{ id: "uni_ilk", age: [17, 20], icon: "🏛️", stage: "uni", t: () => `${FACULTIES[P.edu.fac].t}-də ilk gün! Tələbə həyatı başlayır.`, ch: [
  { t: "Tələbə təşkilatına qoşul", fx: { happy: 5 }, go: () => { P.tal.social += 5; const d = addPerson("dost", pick(["k", "q"]), P.age); return `Yeni dost: ${d.name}.`; } },
  { t: "Kitabxanada otur", fx: { smarts: 5 }, r: "Müəllimlər adını tez öyrəndi." }] },
{ id: "uni_sessiya", age: [18, 24], icon: "📚", stage: "uni", once: false, cool: 2, t: "Sessiyadır. Sabah çətin imtahan var, amma dostlar ad gününə çağırır.", ch: [
  { t: "Oxu", fx: { smarts: 4, happy: -3 }, r: "Əla aldın!" },
  { t: "Ad gününə get", odds: [{ p: .5, fx: { happy: 6 }, r: "Bilet şanslı gəldi, “4” aldın 😅" }, { p: .5, fx: { happy: -6 }, r: "Kəsildin. Yay tətilində yenidən verəcəksən." }] },
  { t: "Müəllimə “hədiyyə” apar", odds: [{ p: .3, fx: { money: -200 }, r: "Qiymət yazıldı, amma özündən utandın." }, { p: .7, fx: { money: -200, happy: -12 }, r: "Müəllim hədiyyəni rədd etdi və dekana bildirdi. Töhmət aldın!" }] }] },
{ id: "uni_tecrube", age: [19, 24], icon: "🧑‍💼", stage: "uni", t: "Böyük şirkət tələbələr üçün təcrübə proqramı elan edib.", ch: [
  { t: "Müraciət et", odds: [{ p: P => P.st.smarts / 120, fx: { smarts: 4, money: 600, happy: 5 }, r: "Qəbul olundun! Yay boyu ödənişli təcrübə.", go: () => { P.flags.tecrube = P.age; } }, { p: .4, fx: { happy: -3 }, r: "Bu dəfə alınmadı." }] },
  { t: "Yayı dincəlməyə sərf et", fx: { happy: 6 }, r: "Bütün yay Nabranda!" }] },

// ===================== GƏNC / YETKİN =====================
{ id: "vesiqe", age: [18, 30], icon: "🚗", if: () => !P.flags.vesiqe, t: "Sürücülük vəsiqəsi almaq istəyirsən. Kurs 400 ₼-dır.", ch: [
  { t: "Kursa yazıl", odds: [{ p: .7, fx: { money: -400, happy: 6 }, r: "İmtahanı ilk dəfədən verdin! 🎉", go: () => { P.flags.vesiqe = P.age; } }, { p: .3, fx: { money: -400, happy: -4 }, r: "Parkovkada dirəyə dəydin. Bir də verəcəksən.", go: () => { P.flags.vesiqe = P.age + 1; } }] },
  { t: "Lazım deyil, metro var", r: "Hələlik piyada və metro." }] },
{ id: "sevgili_tanis", age: [18, 40], icon: "☕", if: () => !person("sevgili") && !person("həyat yoldaşı"), w: 2, t: "Kafedə yanındakı masada oturan biri gülümsədi.", ch: [
  { t: "Yaxınlaş, tanış ol", odds: [{ p: P => .25 + P.st.looks / 200 + P.tal.social / 400, fx: { happy: 10 }, go: () => { const s = addPerson("sevgili", P.g === "k" ? "q" : "k", P.age + rnd(-3, 3)); return `${s.name} ilə nömrə dəyişdiniz. Görüşməyə başladınız 💕`; } }, { p: .5, fx: { happy: -4 }, r: "Nişanlı imiş 😅" }] },
  { t: "Utan, kofeni iç", r: "Bu da bir hekayə olaraq qaldı." }] },
{ id: "sevgili_dava", age: [16, 50], icon: "😠", need: ["sevgili"], once: false, cool: 3, t: "{sevgili} deyir ki, ona az vaxt ayırırsan.", ch: [
  { t: "Haqlısan, dəyişəcəyəm", fx: { rel: { sevgili: 8 }, happy: 1 }, r: "Romantik şam yeməyi təşkil etdin." },
  { t: "Mənim də işim var!", odds: [{ p: .5, fx: { rel: { sevgili: -12 } }, r: "Küsdü, amma iki gün sonra barışdınız." }, { p: .5, fx: { happy: -10 }, go: () => { removeRole("sevgili", "ayrıldı"); return "Ayrıldınız. 💔"; } }] }] },
{ id: "evlilik", age: [20, 50], icon: "💍", need: ["sevgili"], if: () => person("sevgili").rel > 62, w: 3, t: "{sevgili} ilə münasibətiniz çox ciddidir. Evlilik təklifi etmək vaxtı deyilmi?", ch: [
  { t: "Elçi göndər, toy et!", fx: { money: -8000, happy: 18 }, go: () => { const s = person("sevgili"); s.role = "həyat yoldaşı"; s.rel = clamp(s.rel + 10); P.flags.evli = P.age; return `🎉 Toyunuz oldu! 400 qonaq, səhərə qədər “Uzundərə”. ${s.name} artıq həyat yoldaşındır.`; } },
  { t: "Kiçik nikah, toysuz", fx: { money: -1000, happy: 12 }, go: () => { const s = person("sevgili"); s.role = "həyat yoldaşı"; P.flags.evli = P.age; relAdd("ana", -5); return `Sadə nikah. Qohumlar bir az incidi, amma ${s.name} ilə xoşbəxtsiniz.`; } },
  { t: "Hələ tezdir", fx: { rel: { sevgili: -8 } }, r: "Gözləyəcəksiniz…" }] },
{ id: "usaq", age: [21, 45], icon: "👶", need: ["həyat yoldaşı"], once: false, cool: 3, if: () => people("uşaq").length < 4, w: 2, t: "Ailənizə yeni üzv gəlir! Uşaq istəyirsinizmi?", ch: [
  { t: "Bəli! 🍼", fx: { happy: 15, money: -1500 }, go: () => { const g = pick(["k", "q"]); const k = addPerson("uşaq", g, 0, { last: surname(P.fam, g) }); P.stats.kids++; return `${g === "k" ? "Oğlunuz" : "Qızınız"} dünyaya gəldi! Adını ${k.name} qoydunuz.`; } },
  { t: "Hələ yox", r: "Bir az gözləyəcəksiniz." }] },
{ id: "usaq_mekteb", age: [27, 60], icon: "🎒", if: () => people("uşaq").some(k => k.age === 6), t: () => `${people("uşaq").find(k => k.age === 6).name} birinci sinfə gedir! Səni də valideyn iclasına çağırırlar.`, ch: [
  { t: "Valideyn komitəsinə qoşul", fx: { happy: 3, rel: { "uşaq": 8 } }, r: "İndi bütün sinif valideynlərinin WhatsApp qrupundasan 😅" },
  { t: "Sadəcə çiçək al, apar", fx: { happy: 2, rel: { "uşaq": 4 } }, r: "Ən gözəl buket sizinki idi 💐" }] },
{ id: "valideyn_xeste", age: [25, 60], icon: "🏥", if: () => (person("ana") && person("ana").age > 62) || (person("ata") && person("ata").age > 62), t: () => `${person("ata") && person("ata").age > 62 ? "Atan" : "Anan"} xəstələnib, xəstəxanaya yerləşdirilib. Müalicə bahalıdır.`, ch: [
  { t: "Bütün xərcləri ödə", fx: { money: -4000, happy: -3, rel: { ana: 10, ata: 10 } }, r: "Vaxtında müalicə edildi və sağaldı. Sənə dua edir." },
  { t: "Qardaş-bacılarla böl", if: () => person("qardaş") || person("bacı"), fx: { money: -1500, rel: { ana: 6, ata: 6 } }, r: "Hamı birləşdi, müalicə uğurlu oldu." },
  { t: "Pulum yoxdur", fx: { happy: -10, rel: { ana: -4, ata: -4 } }, r: "Qohumlar kömək etdi, amma özünü çox pis hiss edirsən." }] },
{ id: "dost_borc", age: [18, 60], icon: "💸", need: ["dost"], if: () => P.money > 1000, t: "Dostun {dost} 1000 ₼ borc istəyir: “Bir aya qaytaracağam, söz verirəm.”", ch: [
  { t: "Ver", odds: [{ p: .55, fx: { rel: { dost: 10 } }, r: "Söz verdiyi kimi qaytardı və sənə şirniyyat gətirdi." }, { p: .45, fx: { money: -1000, rel: { dost: -15 }, happy: -6 }, r: "Bir il keçdi, pul yoxdur. Telefonunu da açmır." }] },
  { t: "Yarısını ver", fx: { money: -500, rel: { dost: 3 } }, r: "Başqasından tamamladı. Pul qayıtmadı, amma dostluq qaldı." },
  { t: "Bağışla, ola bilməz", fx: { rel: { dost: -8 } }, r: "Başa düşdü… deyəsən." }] },
{ id: "lotereya", age: [18, 80], icon: "🎟️", once: false, cool: 6, t: "Köşkdə lotereya bileti satırlar. 2 manatdır.", ch: [
  { t: "Bir dənə al", odds: [{ p: .03, fx: { money: 50000, happy: 25 }, r: "İNANILMAZ! 50 000 ₼ uddun! 🎉" }, { p: .17, fx: { money: 18, happy: 3 }, r: "20 manat uddun!" }, { p: .8, fx: { money: -2 }, r: "Heç nə çıxmadı." }] },
  { t: "Almaram", r: "Pulunu cibində saxladın." }] },
{ id: "fırıldaq", age: [18, 75], icon: "📞", t: "Zəng gəlir: “Təbriklər! Siz maşın qazandınız. Sadəcə 300 ₼ vergi köçürün.”", ch: [
  { t: "Köçür!", fx: { money: -300, happy: -10 }, r: "Təbii ki, maşın yox idi. Fırıldaqçılar 300 ₼-nı apardı." },
  { t: "Dəstəyi qoy", fx: { smarts: 1 }, r: "Ağıllı qərar. Bu, fırıldaq idi." },
  { t: "Polisə xəbər ver", fx: { happy: 4 }, r: "Polis bu nömrəni artıq axtarırmış. Təşəkkür etdilər." }] },
{ id: "qonsu", age: [20, 80], icon: "🔊", once: false, cool: 8, t: "Qonşu gecə saat 2-də yenə ucadan musiqi qoyub.", ch: [
  { t: "Qapısını döy", odds: [{ p: .6, r: "Üzr istədi, səsini azaltdı." }, { p: .4, fx: { happy: -5 }, r: "Söz-söhbət oldu. İndi bir-birinizə salam vermirsiniz." }] },
  { t: "Mən də ucadan musiqi qoyum", fx: { happy: 3 }, r: "Səhərə qədər səs yarışı 😅" },
  { t: "Qulaqlıq tax, yat", fx: { happy: -2 }, r: "Pis yatdın." }] },
{ id: "idman_zal", age: [18, 55], icon: "🏋️", t: "Yaxınlıqda yeni idman zalı açılıb, illik abunə 600 ₼.", ch: [
  { t: "Abunə ol, hər gün get", fx: { money: -600, fitness: 10, health: 5, looks: 3 }, r: "Bir ildə tanınmaz oldun! 💪" },
  { t: "Abunə ol… və getmə", fx: { money: -600, happy: -2 }, r: "Klassik. İki dəfə getdin 😅" },
  { t: "Parkda qaçaram", fx: { fitness: 5, health: 3 }, r: "Pulsuz və təmiz hava!" }] },
{ id: "xestelik", age: [25, 90], icon: "🩺", once: false, cool: 7, t: "Son vaxtlar tez-tez başın ağrıyır, yorğunsan.", ch: [
  { t: "Tam müayinədən keç", fx: { money: -300, health: 8 }, r: "Vaxtında tapıldı, müalicə başladı. Həkim sənə rejim yazdı." },
  { t: "Keçər, işim çoxdur", odds: [{ p: .5, fx: { health: -6 }, r: "Keçdi… amma yorğunluq qaldı." }, { p: .5, fx: { health: -18 }, r: "Bir gün işdə huşunu itirdin. Xəstəxanaya düşdün." }] }] },
{ id: "qeza", age: [18, 80], icon: "🚑", if: () => P.assets.some(a => a.type === "maşın"), t: "Yağışlı gecədə maşın sürürdün, qabaqdakı qəfil əyləc basdı.", ch: [
  { t: "Kəskin əyləc bas", odds: [{ p: .6, fx: { happy: -2 }, r: "Son anda dayandın. Ürəyin ağzına gəldi." }, { p: .4, fx: { money: -2500, health: -10 }, r: "Toqquşdunuz. Maşın təmirdə, sən isə 2 həftə xəstəxanada." }] },
  { t: "Yan tərəfə dön", odds: [{ p: .5, r: "Ustalıqla yan keçdin! 🏎️" }, { p: .5, fx: { money: -4000, health: -15 }, r: "Səki kənarına çıxdın. Ağır qəza…" }] }] },
{ id: "miras", age: [30, 75], icon: "📜", if: () => P.people.some(p => (p.role === "ata" || p.role === "ana") && !p.alive && p.died === P.age - 1), t: "Valideyninin vəsiyyəti açıldı. Kənddəki ev və bir az pul sənə qalıb.", ch: [
  { t: "Evi sat, pulu götür", fx: { money: 25000 }, r: "Ev satıldı. Amma uşaqlığın o evdə qaldı…" },
  { t: "Evi saxla, yay evi olsun", go: () => { P.assets.push({ type: "ev", t: "Kənddəki ata evi", value: 30000 }); return "Hər yay uşaqlarınla ora gedəcəksən 🏡"; } }] },
{ id: "pul_investisiya", age: [22, 70], icon: "📈", if: () => P.money > 5000, once: false, cool: 5, t: "Tanışın kriptovalyutaya pul qoymağı təklif edir: “Bir ayda iki qat!”", ch: [
  { t: "5000 ₼ qoy", odds: [{ p: .3, fx: { money: 7000, happy: 10 }, r: "Qiymət qalxdı! 12 000 ₼ ilə çıxdın." }, { p: .7, fx: { money: -5000, happy: -12 }, r: "Bazar çökdü. Pul getdi." }] },
  { t: "Bankda depozit aç", fx: { money: 400 }, r: "Sakit və etibarlı: illik 8%." },
  { t: "Heç nə etmə", r: "Pulun yerində qaldı." }] },
{ id: "heyat_bohran", age: [38, 50], icon: "🤔", t: () => `Bir səhər oyandın və düşündün: “Mən həyatımda nə edirəm?” Uşaqkən ${dreamName()} olmaq istəyirdin. İndi isə: ${jobTitle() || "işsizsən"}.`, ch: [
  { t: "Yeni bir hobbi tap", fx: { happy: 8 }, r: "Rəssamlıq kursuna yazıldın. Ruhun dincəldi 🎨" },
  { t: "Bahalı maşın al", if: () => P.money > 60000, fx: { money: -60000, happy: 10, looks: 2 }, go: () => { P.assets.push({ type: "maşın", t: "Qırmızı kabriolet", value: 60000 }); return "Qırmızı kabriolet! Klassik “orta yaş böhranı” 😎"; } },
  { t: "Həyatım yaxşıdır, şükür", fx: { happy: 5 }, r: "Bəzən hər şeyin qədrini bilmək kifayətdir." }] },
{ id: "mezun_gorus", age: [27, 50], icon: "🍽️", once: false, cool: 10, t: "Sinif yoldaşları ilə 10 illik görüş! Hamı uğurlarından danışır.", ch: [
  { t: "Get və danış", fx: { happy: 5 }, go: () => P.job ? `“${jobTitle()}” olduğunu eşidəndə hamı təəccübləndi.` : "İşsiz olduğunu deyəndə bir az utandın, amma köhnə dostlarla gülüşdünüz." },
  { t: "Getmə", r: "Fotolara Pıçıltı-dan baxdın." }] },
{ id: "nevr", age: [25, 70], icon: "🧓", if: () => people("uşaq").some(k => k.age >= 22) && !P.flags.neve, t: "Övladın deyir ki, ailə qurmaq istəyir!", ch: [
  { t: "Xeyir-dua ver, toy et", fx: { money: -6000, happy: 15 }, go: () => { P.flags.neve = P.age; return "Gözəl toy oldu. Tezliklə nəvə gələcək!"; } },
  { t: "Hələ tezdir, oxusun", fx: { rel: { "uşaq": -8 } }, r: "Övladın səndən incidi." }] },
{ id: "neve_geldi", age: [40, 90], icon: "👶", if: () => P.flags.neve && P.age - P.flags.neve >= 1 && !P.flags.neveGeldi, t: "Nəvən dünyaya gəldi! Səni “baba/nənə” çağıracaq.", ch: [
  { t: "Sevincdən uç!", fx: { happy: 20 }, go: () => { P.flags.neveGeldi = P.age; addPerson("nəvə", pick(["k", "q"]), 0); return "Həyatın ən gözəl anlarından biri 💛"; } }] },

// ===================== PEŞƏ HADİSƏLƏRİ =====================
// --- polis ---
{ id: "polis_rusvet", age: [18, 65], job: "polis", icon: "💰", t: "Yol polisi postundasan. Sürət həddini aşan sürücü qovluğa 200 ₼ qoyub uzadır.", ch: [
  { t: "Protokol yaz", fx: { perf: 10, happy: 3 }, r: "Qanun hamı üçün birdir. Rəhbərlik səni təriflədi." },
  { t: "Pulu götür", odds: [{ p: .6, fx: { money: 200, happy: -4 }, r: "Heç kim bilmədi… hələlik.", go: () => { P.flags.rusvet = (P.flags.rusvet || 0) + 1; P.stats.crimes++; } }, { p: .4, fx: { happy: -25 }, go: () => { endJob("rüşvət"); P.flags.cinayet = P.age; P.stats.crimes++; return "Gizli kamera imiş! İşdən çıxarıldın və məhkəmə şərti cəza verdi."; } }] }] },
{ id: "polis_qacaq", age: [18, 60], job: "polis", icon: "🚓", t: "Bank soyğunu! Şübhəli qaçır, sən təqib edirsən.", ch: [
  { t: "Arxasınca qaç", odds: [{ p: P => P.st.fitness / 110, fx: { perf: 20, fame: 4, happy: 10 }, r: "Tutdun! Xəbərlərdə adın çəkildi.", go: () => { if (P.soc) P.soc.followers += rnd(500, 4000); } }, { p: .4, fx: { health: -8 }, r: "Hasardan atlayanda ayağını burxdun, qaçdı." }] },
  { t: "Yoldaşlara xəbər ver, mühasirə et", fx: { perf: 12, smarts: 2 }, r: "Plan işlədi, şübhəli tutuldu." }] },
{ id: "polis_usaq", age: [18, 60], job: "polis", icon: "🧒", t: "Parkda azmış balaca bir uşaq ağlayır.", ch: [
  { t: "Ailəsini tap", fx: { happy: 8, perf: 5 }, r: "Anası səni qucaqlayıb ağladı. Bu iş üçün dəyər." },
  { t: "Növbətçi hissəyə apar", fx: { perf: 3 }, r: "Ailə yarım saat sonra tapıldı." }] },
// --- həkim ---
{ id: "hekim_novbe", age: [22, 65], job: "hekim", icon: "🚨", t: "Gecə növbəsi. Eyni anda iki ağır xəstə gətirildi.", ch: [
  { t: "Daha ağır olanı əvvəl", odds: [{ p: P => P.st.smarts / 110, fx: { perf: 15, happy: 8 }, r: "İkisini də xilas etdin. Səhər evə yorğun, amma xoşbəxt getdin." }, { p: .3, fx: { happy: -12 }, r: "Birini xilas edə bilmədin. Bu peşənin ən ağır anı…" }] },
  { t: "Başqa həkimi çağır", fx: { perf: 5 }, r: "Komanda işi. Hər şey yaxşı bitdi." }] },
{ id: "hekim_hediyye", age: [22, 65], job: "hekim", icon: "🎁", t: "Sağalan xəstənin ailəsi sənə zərf uzadır: “Zəhmətinizə görə.”", ch: [
  { t: "Qəbul etmə", fx: { happy: 4, perf: 4 }, r: "Təşəkkür etdin və bir qutu şokoladı götürdün." },
  { t: "Götür", odds: [{ p: .7, fx: { money: 500 }, r: "Zərfdə 500 ₼ var idi." }, { p: .3, fx: { money: 500, perf: -30 }, r: "Kimsə şikayət yazdı. Xəbərdarlıq aldın." }] }] },
{ id: "hekim_ad", age: [28, 65], job: "hekim", icon: "🏆", if: () => P.job.lv >= 2, t: "Mürəkkəb əməliyyatı uğurla etdin. Jurnalistlər müsahibə istəyir.", ch: [
  { t: "Müsahibə ver", fx: { fame: 8, happy: 6 }, go: () => { if (P.soc) P.soc.followers += rnd(2000, 15000); return "İndi səni “qızıl əllər” deyə tanıyırlar."; } },
  { t: "Təvazökar ol, imtina et", fx: { perf: 6 }, r: "Sənin üçün xəstənin sağlığı kifayətdir." }] },
// --- futbolçu ---
{ id: "fut_derbi", age: [17, 36], job: "futbolcu", icon: "🏟️", once: false, cool: 2, t: "Böyük derbi! Stadion doludur, son dəqiqədə penalti sənə tapşırıldı.", ch: [
  { t: "Küncə vur", odds: [{ p: P => .45 + P.st.fitness / 300, fx: { fame: 6, happy: 15, perf: 15 }, r: "QOOOL! Stadion partladı! 🔥", go: () => { if (P.soc) P.soc.followers += rnd(5000, 40000); } }, { p: .35, fx: { happy: -12, fame: -2, perf: -10 }, r: "Qapıçı tutdu… Azarkeşlər səni fit səsləri ilə yola saldı." }] },
  { t: "Ortaya, “Panenka”", odds: [{ p: .45, fx: { fame: 10, happy: 18 }, r: "Panenka! Bu qolu illərlə xatırlayacaqlar.", go: () => { if (P.soc) P.soc.followers += rnd(20000, 90000); } }, { p: .55, fx: { fame: -4, happy: -18, perf: -15 }, r: "Qapıçı yerində qaldı və topu asanca tutdu. Mem oldun 😬" }] }] },
{ id: "fut_transfer", age: [19, 31], job: "futbolcu", icon: "✈️", if: () => P.job.lv >= 1 && P.job.lv < 4 && P.job.perf > 60, w: 2, t: () => `${pick(["Türkiyənin", "Rusiyanın", "Portuqaliyanın", "Belçikanın", "Almaniyanın", "İngiltərənin"])} klubu səninlə maraqlanır. Transfer təklifi gəldi!`, ch: [
  { t: "Qəbul et, xaricə get", odds: [{ p: .7, fx: { happy: 12, fame: 8 }, go: () => { promote(); return "Yeni klub, yeni ölkə! Ailən səninlə fəxr edir."; } }, { p: .3, fx: { happy: -8 }, r: "Tibbi yoxlamadan keçmədin. Transfer baş tutmadı." }] },
  { t: "Öz klubumda qalıram", fx: { rel: { "məşqçi": 10 }, fame: 3 }, r: "Azarkeşlər sadiqliyini unutmayacaq." }] },
{ id: "fut_zede", age: [17, 36], job: "futbolcu", icon: "🩼", t: "Məşqdə ağır zədə aldın: ön çarpaz bağ qırılıb.", ch: [
  { t: "Əməliyyat və uzun bərpa", fx: { health: -10, fitness: -10, money: -3000 }, r: "8 ay meydandan uzaq qaldın, amma tam sağaldın." },
  { t: "Ağrıkəsici ilə oyna", odds: [{ p: .4, fx: { perf: 10 }, r: "Dişini sıxıb oynadın, komanda qazandı." }, { p: .6, fx: { health: -25, fitness: -20 }, r: "Zədə ağırlaşdı. Karyeran təhlükədədir…" }] }] },
{ id: "fut_milli", age: [19, 33], job: "futbolcu", icon: "🇦🇿", if: () => P.job.lv >= 1 && P.st.fitness > 65, t: "Milli komandaya çağırış aldın!", ch: [
  { t: "Fəxrlə qəbul et", fx: { fame: 10, happy: 15, rel: { ata: 10 } }, r: "Himn çalınanda gözlərin doldu. Atan tribunada ağlayırdı. 🇦🇿", go: () => { P.flags.milli = P.age; if (P.soc) P.soc.followers += rnd(10000, 50000); } }] },
// --- müğənni ---
{ id: "mug_toy", age: [16, 60], job: "mugenni", icon: "💃", once: false, cool: 2, t: "Böyük bir toya dəvət olunmusan. Toy sahibi “bir mahnı da, bir mahnı da” deyir, saat artıq gecə 2-dir.", ch: [
  { t: "Oxumağa davam et", fx: { money: 1500, health: -3, happy: 2 }, r: "Pullar başına yağdı 💸" },
  { t: "Nəzakətlə bitir", fx: { money: 600 }, r: "Səsini qorudun, sabah konsert var." }] },
{ id: "mug_klip", age: [16, 55], job: "mugenni", icon: "🎬", t: "Yeni mahnına klip çəkmək istəyirsən. Prodüser 10 000 ₼ istəyir.", ch: [
  { t: "Çək", if: () => P.money >= 10000, odds: [{ p: .5, fx: { money: -10000, fame: 12, happy: 10 }, go: () => { promote(); if (P.soc) P.soc.followers += rnd(30000, 150000); return "Klip trendlərdə 1-ci oldu!"; } }, { p: .5, fx: { money: -10000, happy: -8 }, r: "Klipə heç kim baxmadı. Pul getdi." }] },
  { t: "Telefonla özüm çəkərəm", odds: [{ p: .3, fx: { fame: 6 }, r: "Səmimiliyi bəyənildi, viral oldu!", go: () => { if (P.soc) P.soc.followers += rnd(10000, 50000); } }, { p: .7, fx: { happy: -2 }, r: "Pis çıxdı, silmək məcburiyyətində qaldın." }] }] },
{ id: "mug_reqib", age: [18, 55], job: "mugenni", icon: "🎤", if: () => P.fame > 25, t: "Başqa bir müğənni Pıçıltı-da səni “səsi yoxdur” deyə ələ salıb.", ch: [
  { t: "Cavab ver, dava et", odds: [{ p: .5, fx: { fame: 6, happy: 3 }, r: "Mübahisə bütün ölkəni bölüb. Mahnılarına baxış iki qat artdı!" }, { p: .5, fx: { fame: -4, happy: -8 }, r: "Səni “qaba” adlandırdılar, konsert ləğv olundu." }] },
  { t: "Mahnı ilə cavab ver", fx: { fame: 4, happy: 5 }, r: "Yeni mahnın hamıya cavab oldu 🎶" },
  { t: "Səssiz qal", fx: { smarts: 2 }, r: "Böyüklük göstərdin." }] },
// --- müəllim ---
{ id: "mue_sagird", age: [21, 65], job: "muellim", icon: "🧑‍🎓", t: "Sinifdə çox istedadlı, amma kasıb ailədən olan bir şagird var. Repetitorluğa pulu yoxdur.", ch: [
  { t: "Pulsuz dərs ver", fx: { happy: 10, perf: 5 }, r: "İllər sonra o şagird universitetə ən yüksək balla qəbul oldu və sənə zəng etdi ❤️", go: () => { P.flags.sagirdUgur = P.age; } },
  { t: "Normal dərsdə kömək et", fx: { perf: 3 }, r: "Əlindən gələni etdin." }] },
{ id: "mue_valideyn", age: [21, 65], job: "muellim", icon: "😤", t: "Bir valideyn qiymətə görə müdirə şikayət edib: “Mənim uşağım əlaçıdır!”", ch: [
  { t: "Qiyməti dəyişmə, sübut göstər", fx: { perf: 8 }, r: "Direktor səni müdafiə etdi." },
  { t: "Qiyməti qaldır", fx: { perf: -5, happy: -5 }, r: "Problem qapandı, amma vicdanın narahatdır." }] },
// --- proqramçı ---
{ id: "proq_bug", age: [18, 65], job: "proqramci", icon: "🐛", t: "Cümə axşamı saat 18:00. Serverlər çökdü, şirkət hər dəqiqə pul itirir.", ch: [
  { t: "Gecə qal, düzəlt", odds: [{ p: P => P.st.smarts / 105, fx: { perf: 18, happy: 4, health: -3 }, r: "Səhər 4-də tapdın: bir vergül! Hamı səni qəhrəman adlandırdı." }, { p: .3, fx: { perf: -5, health: -5 }, r: "Səhərə qədər tapa bilmədin, başqası düzəltdi." }] },
  { t: "Mənim növbəm deyil", fx: { perf: -10 }, r: "Rəhbər bunu yadda saxladı." }] },
{ id: "proq_startap", age: [22, 50], job: "proqramci", icon: "🚀", if: () => P.job.lv >= 1, t: "Dostunla öz startapınızı qurmaq istəyirsiniz. Bunun üçün işdən çıxmalısan.", ch: [
  { t: "Risk et!", odds: [{ p: .35, fx: { happy: 15, fame: 5 }, go: () => { startJob("biznes", 1, "Startap qurdu"); P.money += 20000; return "İnvestor tapıldı! Şirkətin dəyəri artır."; } }, { p: .65, fx: { happy: -12, money: -5000 }, go: () => { endJob("startap"); return "Bir il sonra startap bağlandı. Yenidən iş axtarmalısan."; } }] },
  { t: "Stabil iş daha yaxşıdır", fx: { happy: -2 }, r: "Dostun tək başladı…" }] },
{ id: "proq_xarici", age: [22, 45], job: "proqramci", icon: "🌍", if: () => P.job.lv >= 2, t: "Avropada böyük texnologiya şirkəti sənə uzaqdan iş təklif edir. Maaş indikindən 3 dəfə çoxdur.", ch: [
  { t: "Qəbul et", fx: { happy: 12 }, go: () => { promote(); P.job.perf = 70; return "Evdən işləyirsən, maaş avro ilə!"; } },
  { t: "Komandamı tərk etmərəm", fx: { perf: 10 }, r: "Rəhbər bunu bilib maaşını artırdı.", go: () => { P.money += 3000; } }] },
// --- biznes ---
{ id: "biz_vergi", age: [20, 75], job: "biznes", icon: "🧾", t: "Vergi yoxlaması gəldi. Mühasibin “bir az düzəliş edək” deyir.", ch: [
  { t: "Hər şey qanuni olsun", fx: { money: -3000 }, r: "Bir az cərimə ödədin, amma rahat yatırsan." },
  { t: "Düzəliş et", odds: [{ p: .5, fx: { money: 2000 }, r: "Yoxlama heç nə tapmadı." }, { p: .5, fx: { money: -25000, happy: -15 }, r: "Tapdılar! Böyük cərimə və şirkətin adı xəbərlərdə." }] }] },
{ id: "biz_genislen", age: [22, 70], job: "biznes", icon: "🏬", if: () => P.money > 30000 && P.job.lv < 4, t: "Biznesini genişləndirmək üçün ikinci filial açmaq olar. 30 000 ₼ lazımdır.", ch: [
  { t: "Aç", odds: [{ p: P => .4 + P.st.smarts / 300, fx: { money: -30000, happy: 10 }, go: () => { promote(); return "Filial uğurlu oldu, gəlirlər artdı!"; } }, { p: .4, fx: { money: -30000, happy: -10 }, r: "Yeri pis seçildi, filial bağlandı." }] },
  { t: "Gözlə", r: "Ehtiyatlı olmaq da strategiyadır." }] },
// --- aktyor ---
{ id: "akt_rol", age: [17, 70], job: "aktyor", icon: "🎬", once: false, cool: 3, t: "Yeni serialda rol təklif olunur, amma ssenari çox zəifdir.", ch: [
  { t: "Razılaş, pul lazımdır", fx: { money: 5000, fame: 4, happy: -2 }, r: "Serial çox baxıldı, amma tənqidçilər səni ələ saldı." },
  { t: "Yaxşı rolu gözlə", odds: [{ p: .4, fx: { fame: 10, happy: 12 }, go: () => { promote(); return "Kino rejissoru səni baş rola çağırdı!"; } }, { p: .6, fx: { happy: -6, money: -1000 }, r: "Bir il heç bir təklif gəlmədi…" }] }] },
{ id: "akt_festival", age: [20, 70], job: "aktyor", icon: "🏆", if: () => P.job.lv >= 2, t: "Filmin beynəlxalq kinofestivala seçilib!", ch: [
  { t: "Qırmızı xalçaya çıx", odds: [{ p: .35, fx: { fame: 18, happy: 20 }, r: "Ən yaxşı aktyor mükafatı! 🏆", go: () => { promote(); if (P.soc) P.soc.followers += rnd(50000, 300000); } }, { p: .65, fx: { fame: 6, happy: 8 }, r: "Mükafat almadın, amma bütün dünya səni gördü." }] }] },
// --- adi işlər ---
{ id: "is_musteri", age: [16, 65], job: ["ofisiant", "satici", "kuryer", "taksi"], icon: "😡", t: "Əsəbi bir müştəri səni hamının qarşısında təhqir edir.", ch: [
  { t: "Səbirli ol", fx: { happy: -3, perf: 8 }, r: "Müdir səbrini gördü və təriflədi." },
  { t: "Cavab ver", odds: [{ p: .5, fx: { happy: 4 }, r: "Haqqını müdafiə etdin." }, { p: .5, fx: { perf: -25 }, r: "Müdir səni danladı, xəbərdarlıq aldın." }] }] },
{ id: "is_gecikme", age: [18, 65], icon: "⏰", if: () => !!P.job, once: false, cool: 4, t: "Səhər yatıb qaldın, işə 1 saat gecikirsən.", ch: [
  { t: "Taksi tut, tez çat", fx: { money: -15 }, r: "Cəmi 20 dəqiqə gecikdin." },
  { t: "Rəhbərə doğrusunu de", fx: { perf: -3 }, r: "Rəhbər başa düşdü, amma bir daha olmasın dedi." },
  { t: "Bəhanə uydur", odds: [{ p: .6, r: "“Tıxac idi” — inandı." }, { p: .4, fx: { perf: -12 }, r: "Rəhbər Pıçıltı-da səhər çəkdiyin selfini gördü 😬" }] }] },
{ id: "issiz", age: [20, 60], icon: "😔", if: () => !P.job && P.edu.stage !== "uni" && !(P.army && !P.army.done) && !P.flags.teqaud, once: false, cool: 3, t: "Uzun müddətdir işsizsən. Pul azalır, ailə narahatdır.", ch: [
  { t: "Kuryer kimi müvəqqəti işlə", go: () => { startJob("kuryer"); return "Ən azından gəlir var."; } },
  { t: "Kurs keç, yeni peşə öyrən", fx: { money: -500, smarts: 6 }, go: () => { P.flags.kodSaat = (P.flags.kodSaat || 0) + 2; if (P.st.smarts > 55) P.flags.kodYazir = P.age; return "Proqramlaşdırma kursunu bitirdin. İndi daha çox imkanın var."; } },
  { t: "Gözlə, yaxşı iş tapılar", fx: { happy: -5 }, r: "Bir il də keçdi…" }] },

{ id: "borc_bank", age: [18, 90], icon: "🏦", once: false, cool: 3, if: () => P.money < -3000, t: () => `Bankdan zəng: “Borcunuz ${fmtMoney(-P.money)}-dır. Ödəniş gecikir!”`, ch: [
  { t: "Əlavə iş götür", fx: { happy: -6, health: -3 }, go: () => { const m = rnd(2000, 5000); P.money += m; return `Gecələr də işlədin, ${fmtMoney(m)} qaytardın.`; } },
  { t: "Valideynlərdən kömək istə", if: () => person("ana") || person("ata"), go: () => { const m = rnd(1000, 4000); P.money += m; relAdd("ana", -4); relAdd("ata", -4); return `Valideynlərin ${fmtMoney(m)} verdi. “Axırıncı dəfədir!”`; } },
  { t: "Maşını sat", if: () => P.assets.some(a => a.type === "maşın"), go: () => { const i = P.assets.findIndex(a => a.type === "maşın"); const a = P.assets.splice(i, 1)[0]; P.money += a.value; return `${a.t} satıldı, borcun bir hissəsi bağlandı.`; } },
  { t: "Zəngləri cavabsız qoy", fx: { happy: -10 }, r: "Problem yox olmadı, faizlər artdı.", go: () => { P.money = Math.round(P.money * 1.1); } }] },

// ===================== QOCALIQ =====================
{ id: "teqaud_heyat", age: [63, 90], icon: "🌳", if: () => P.flags.teqaud, t: "Təqaüddəsən. Səhərlər parkda yaşıdların nərd oynayır.", ch: [
  { t: "Qoşul, nərd oyna", fx: { happy: 8 }, r: "Hər gün “Şeşbeş!” səsləri. Həyat gözəldir 🎲" },
  { t: "Bağ sal, pomidor ək", fx: { happy: 6, health: 4 }, r: "Ən dadlı pomidorlar səninkidir 🍅" },
  { t: "Nəvələrlə vaxt keçir", if: () => P.flags.neveGeldi, fx: { happy: 10 }, r: "Onlara nağıl danışdın: “Bir varmış, bir yoxmuş…”" }] },
{ id: "xatire", age: [65, 100], icon: "📷", t: () => `Köhnə fotoalbomu vərəqləyirsən. 5 yaşında ${dreamName()} olmaq istəyirdin. Həyat isə səni ${(P.jobs.concat(P.job ? [{ title: jobTitle() }] : []).filter(j => j.title).pop() || { title: "başqa yollara" }).title.toLowerCase()} etdi.`, ch: [
  { t: "Gülümsə: Həyat, sən nə qəribəsən!", fx: { happy: 10 }, r: "Hər şeyin bir səbəbi var idi." },
  { t: "Kədərlən", fx: { happy: -5 }, r: "Bəzi qapılar açılmadı… amma başqaları açıldı." }] },
{ id: "qoca_saglik", age: [65, 100], icon: "💊", once: false, cool: 3, t: "Təzyiqin qalxıb. Həkim deyir ki, duz və şirniyyatı azaltmalısan.", ch: [
  { t: "Həkimin sözünə bax", fx: { health: 8, happy: -3 }, r: "Rejim çətindir, amma özünü yaxşı hiss edirsən." },
  { t: "Bu yaşda nəyi azaldım?", fx: { health: -8, happy: 5 }, r: "Bayram şəkərbürası dəyərdi 😋" }] }
];

// University exam (called from the "imtahan" event)
function examTry(fid) {
  const f = FACULTIES[fid];
  P.flags.imtahanVerdi = P.age;
  const score = P.st.smarts * 0.6 + P.edu.gpa * 0.3 + (P.flags.repetitor ? 8 : 0) + (P.flags.olimpiada ? 6 : 0) + rnd(-10, 10);
  const extra = (f.fit && P.st.fitness < f.fit) ? `fiziki hazırlıq yetərli deyil (${P.st.fitness}/${f.fit})` : (f.music && P.tal.music < f.music) ? "musiqi qabiliyyəti imtahanından keçmədin" : null;
  if (score >= f.need && !extra) {
    P.edu.stage = "uni"; P.edu.fac = fid; P.edu.uniYear = 0;
    const free = score >= f.need + 12;
    if (!free) P.flags.odenisli = 1;
    apply({ happy: 15, rel: { ana: 10, ata: 10 } });
    log(`🎓 ${f.t}-nə qəbul oldu (${free ? "dövlət sifarişi" : "ödənişli"}).`);
    return `Təbriklər! ${f.t}-nə qəbul oldun${free ? ", özü də pulsuz (dövlət sifarişi)!" : ". Ödənişli əsaslarla: ildə 2 500 ₼."}`;
  }
  P.edu.stage = "bitdi";
  apply({ happy: -12 });
  log(`📝 ${f.t}-nə qəbul ola bilmədi.`);
  return `Təəssüf, ${extra || "bal çatmadı"}. Universitetə düşmədin. İndi işləmək və ya ${P.g === "k" ? "hərbi xidmət" : "yeni plan"} vaxtıdır.`;
}
