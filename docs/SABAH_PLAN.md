# Növbəti iş günü üçün siyahı

Vəziyyət: son işlək versiya `fddf1f6`, 18/18 test keçir. Aşağıdakılar hələ edilməyib.

## A. Oyunçunun konkret iradları (düzəldilməyib)

1. **İnsanlarla münasibət yaşa, qohumluğa və cinsə uyğun deyil.** 4 yaşlı uşaq "həyatından əhvalat danışır".
   - Körpə: qucağa almaq, layla, gəzinti.
   - 3–6 yaş: kukla oyunu və ya maşın-top oyunu, park, nağıl, dondurma.
   - 7–12 yaş: dərs, futbol və ya velosiped, video oyun, zoopark.
   - 13–17 yaş: ürək söhbəti, matç və ya kino, cib xərcliyi, məsləhət.
   - Böyük övlad: zəng, nahar, maddi kömək.
   - Valideyn, nənə-baba, qardaş-bacı, dost, sevgili, həyat yoldaşı üçün ayrıca seçimlər.
2. **86–90 yaşlı nənə-baba çox uzun yaşayır.** NPC-lər üçün real ölüm cədvəli lazımdır (oyunçunun risk modeli ilə eyni). Başlanğıc yaşlar da yoxlanmalıdır.
3. **"Övladın evlənmək istəyir"** hadisəsində hansı övladın olduğu yazılmır.
   - Övladın adı yazılmalıdır.
   - Gəlin və ya kürəkən NPC kimi əlavə olunmalıdır.
   - Nəvə məhz o övladın uşağı olmalıdır.
4. **Təqaüd və 60 yaşdan sonrakı həyat.**
   - Təqaüd iş stajı və maaşa görə hesablanmalı, "Mən" bölməsində görünməlidir.
   - Qocalıqda xərclər olmalıdır: dərman, kommunal, nəvələrə kömək.
   - Biznes avtomatik bağlanmamalıdır. Seçim olmalıdır: davam et, övlada təhvil ver, sat.
   - Miras: ölümdən sonra əmlak, biznes və pul kimə qalır. Bu, epiloqda faktlarla göstərilməlidir.

5. **Övladların toyu və nəvələr:**
   - **Nəvələr:** nəvə çıxmır. Övladlar evlənəndən sonra nəvə olmalıdır və o, konkret həmin övladın uşağı olmalıdır.
   - **Qızın toyu:** cehiz hazırlamaq (mebel, məişət əşyaları, qızıl), toy xərcləri, el adətlərinə uyğun səhnələr.
   - **Oğulun toyu:** ev (mənzil) və maşın almaq, toy xərcləri; imkan çatmasa, kredit və ya ailədən borc.
   - **Valideynin seçimi:** kömək etmək, qismən kömək etmək və ya imtina. Bu, övladla münasibətə və ailə büdcəsinə təsir etməlidir.

6. **İdmanda yalnız futbol var.** Digər idman növləri lazımdır: güləş, cüdo, boks, voleybol, basketbol, gimnastika, şahmat, üzgüçülük, atletika. Hər birinin öz akademiya və klub yolu, yarışları (çempionat, Avropa, Olimpiya), zədələri və məşqçilik keçidi olmalıdır. Uşaqlıqda istedad hansı idmana uyğundursa, o yol açılmalıdır.

7. **Həbs müddəti:** oyunçu 3,5 il cəza aldığını, amma 10 ildir həbsdə qaldığını bildirir.
   - Təmiz simulyasiyada 3,5 illik cəza 4-cü ildə bitir (ilkin yoxlama, 5 seed).
   - Səbəb oyunçunun öz yaddaşında axtarılmalıdır: təkrar məhkəmə və ya yeni iş açılıbmı, köhnə versiyadan qalan vəziyyətdirmi.
   - Status sətrində qalan müddət düzgün göstərilməlidir.
8. **Məhkumluğun ödənilməsi:** qanunda göstərilən müddətdən sonra məhkumluq "addan silinməlidir". Bundan sonra adi işlər açılmalıdır, polis, pilot kimi xüsusi peşələr isə qaydaya görə açılmalıdır. Müddət `rules.json`-da oyun konfiqurasiyası kimi saxlanılmalıdır.
9. **Bank:** banka ayrıca müraciət etmək imkanı olmalıdır. Nağd kredit, depozit, kredit tarixçəsi; gəlirə görə təsdiq və ya rədd; gecikmə və cərimələr.
10. **Xərclər görünməlidir:** gəlirlə yanaşı xərclər də rəqəmlə göstərilməlidir: kirayə, kommunal, ərzaq, nəqliyyat, uşaq, kredit, maşın. Hər dövr üçün balans (gəlir − xərc).
11. **Zaman addımı:** oyun 1 il yox, **3 ay** (rüb) irəliləməlidir: "+3 ay" düyməsi.
   - Hadisələr, maaş və xərclər rüblərə bölünməlidir.
   - Yaş ad günündə artır.
   - Fəaliyyət nöqtələri hər rüb üçün olmalıdır.

12. **Əlavə qazanc və passiv gəlir:** borc yığılıb oyunçunu "boğmamalıdır".
   - **Əlavə iş yolları, hər yaşda əlçatan:** taksi və kuryer kimi part-time, freelance, repetitorluq, usta sifarişləri, satış, kirayəyə vermək.
   - **Daimi passiv gəlir, əldən çıxmayan:** kirayə mənzil və mağaza, depozit faizi, kiçik biznesin gəliri, təqaüd. Bu gəlirlər hər dövr avtomatik gəlməlidir.
   - **Borcdan çıxış yolu:** borc böyüyəndə restrukturizasiya, əmlak satmaq, ailədən kömək, əlavə iş kimi seçimlər görünməlidir.
   - **Balans testi:** adi həyatda oyunçu çıxılmaz borc spiralına düşməməlidir.

13. **Qız və oğlan həyatı fərqli olmalıdır:**
   - Ssenarilər, fəaliyyətlər və ailə gözləntiləri cinsə görə fərqlənməlidir. Uşaqlıq oyunları, yeniyetməlikdə ailə nəzarəti, elçilik və toy (qız tərəfi / oğlan tərəfi), cehiz və ev-maşın, hamiləlik və analıq, əsgərlik (yalnız oğlanlar).
   - Hər iki tərəf üçün eyni dərinlik olmalıdır. Stereotipləri məcburi etmək yox, mühitin real təzyiqlərini və oyunçunun onlara qarşı seçim imkanını göstərmək lazımdır.
   - Hadisələrdə `gender` şərti və fərqli versiyalar; test: hər cins üçün xüsusi hadisələrin payı.

## B. KRİTİK: dramaturgiya (növbəti işin əsası)

**Niyə hazırkı mühərrik maraqlı hekayə yaratmır (qısa diaqnoz):**
- **Seçim tamamilə təsadüfidir.** Hadisələr çəkiyə görə seçilir, hekayənin vəziyyəti və tempi nəzərə alınmır.
- **Hadisələr bir-birindən qopuqdur.** Zəncirlər azdır, əksəriyyəti 2–3 fəsildən ibarətdir və başlanğıc–inkişaf–dönüş–nəticə strukturu yoxdur.
- **Mərcin qiyməti kiçikdir.** Nəticələrin çoxu ±2–10 göstəricidir, ağır və geri dönməz nəticə azdır.
- **Pul çox asandır.** Real büdcə yoxdur: kirayə, ərzaq, nəqliyyat, uşaq xərcləri, gözlənilməz xərclər, borc.
- **Uğurun qiyməti yoxdur.** Karyera ailəni, sağlamlığı və münasibətləri zəiflətmir.
- **NPC-lər passivdir.** Öz qərarları, məqsədləri və problemləri yoxdur, yalnız qocalır və ölürlər.
- **Nəticələr bir cümlədir.** Səhnə, dialoq və davam yoxdur.
- **Keçmiş qərarlar nadir hallarda xatırlanır.** Emosional yaddaş yoxdur.

**Ediləcəklər:**
1. **Narrative Director:**
   - Hekayə vəziyyəti: yaş və həyat mərhələsi, ailə, məqsədlər, travmalar və xatirələr, açıq münaqişələr, NPC məqsədləri, həll olunmamış problemlər.
   - Son illərin emosional balansı və "həyat çox asan gedir" ölçüsü.
   - Seçim: davam edən zəncirlər prioritetdir; uzun sakit dövrdən sonra mütləq ciddi hadisə; ardıcıl çox mənfi hadisədən sonra nəfəs dərmək.
2. **Uzunmüddətli zəncirlər:** 5–30 yaş üçün ən azı 5 böyük zəncir, hər birində başlanğıc, inkişaf, dönüş, nəticə, gələcək təsir və alternativ yollar.
   Mövzular: yoxsullaşma, valideynlərin ayrılması, bullinq, dostluğun pozulması, ilk sevgi, universitetə düşməmək, işsizlik və borc, həyat yoldaşı ilə böhran, övladla soyuqluq, işdə haqsızlıq, hərbi çətinliklər, idman zədəsi, cinayət və həbs, yaxın insanın ölümü, erkən ölüm.
3. **Səhnə strukturu:** məkan və zaman, illüstrasiya, emosional təsvir, personajlar arası dialoq, seçimlər, davam səhnəsi, dərhal və gecikmiş nəticə, növbəti səhnəyə bağlantı.
4. **Emosional yaddaş:**
   - Hər xatirədə: id, tarix, iştirakçılar, emosional təsir, münasibət nəticəsi, nə vaxt xatırlanacağı.
   - Xatirələr sonrakı dialoqlarda və yeni ssenarilərdə istifadə olunur.
5. **Müstəqil NPC həyatı:** iş yeri bağlanır, qohum köçür, qardaş evlənir, dost xəstələnir. Səbəbli, amma oyunçudan asılı olmayan hadisələr.
6. **Uğurun qiyməti və çətinlik:**
   - Real aylıq büdcə, gözlənilməz xərclər və borc.
   - Karyera ilə ailə və sağlamlıq arasında ziddiyyət.
   - Bütün göstəriciləri maksimuma çıxarmaq çətin olmalıdır.
7. **Testlər:**
   - ardıcıl yalnız müsbət hadisələr;
   - həddindən artıq mənfi hadisə yığılması;
   - uzun sakit dövrlər;
   - yarımçıq qalan zəncirlər;
   - unudulan qərarlar;
   - hər seçimin eyni nəticə verməsi;
   - passiv NPC-lər.

## C. V1.0 tapşırığından qalanlar

- **İllüstrasiyalar:** 20–30 ədəd SVG storybook üslubunda. Oyunçu "özün çək, amma təsirli" seçib.
- **NPC-lər:** tam qeydlər və 4 ölçülü münasibət (etibar, yaxınlıq, münaqişə, bağlılıq), ailə ağacı ekranı.
- **Övladların müstəqil həyatı:** təhsil, iş, evlilik. Onlara dəstək: toy, ev, biznes.
- **Məkan sistemi:** şəhər və rayonlara görə xərclər, işlər və yerli hadisələr.
- **Ölümdən sonrakı məhdud ailə simulyasiyası:** "sonrakı illərdə" bölməsi.
- **Hərbi xidmət qaydası:** rəsmi mənbə ilə yoxlanılmalıdır (`rules.json`, `verified: false`).
