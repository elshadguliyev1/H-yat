# Həyat, sən nə qəribəsən… — Analiz və inteqrasiya planı (V1.0 tapşırığı üzrə)

Tarix: 2026-11-17 · Əsas: mövcud repo (`H-yat`, V0.1) + `heyat_content_pack_v1`

---

## 1. Mövcud layihənin xülasəsi

| Sahə | Vəziyyət |
|---|---|
| Platforma | Statik PWA: `index.html` + `engine.js` + `events.js`, framework yoxdur. GitHub Pages, service worker ilə tam offline, ana ekrana əlavə olunur. |
| Yaddaş | `localStorage`, tək slot (`heyat-save-v1`) + keçmiş həyatların qısa siyahısı. |
| Zaman | Yalnız illik addım (`+1 yaş`). Hər il 3 fəaliyyət. Təqvim və tarix yoxdur. |
| Göstəricilər | 5 əsas (sağlamlıq, xoşbəxtlik, ağıl, idman, görünüş) + pul, şöhrət, 5 gizli istedad. |
| Təhsil | Bağça → 1–11-ci sinif → qəbul imtahanı → 7 fakültə → diplom. |
| Hərbi xidmət | Oğlanlar üçün 18 yaşdan sonra, universitetə düşməyəndə. Qayda kodun içindədir. |
| Karyera | 13 peşə: 8 əsas + 5 adi iş. Vəzifə pillələri, maaş, yüksəliş və işdən çıxarılma var. |
| İnsanlar | Ad, rol, yaş və **tək** münasibət göstəricisi. NPC-lər müstəqil yaşamır, yalnız qocalır və ölür. |
| Sevgi/ailə | Sevgili → evlilik → uşaq. Uşaqlar böyümür, öz həyatları yoxdur. |
| Əmlak | 8 məhsullu mağaza: alış və satış. Kredit, təmir və tarixçə yoxdur. |
| Hadisələr | JS içində **~106 hadisə**. Şərtlər: yaş, `once/cool`, `force`, `need`, `job`, `stage`, `if`. Ehtimallı nəticələr var. |
| Sosial şəbəkə | "Pıçıltı": paylaşımlar, şərhlər, viral olma, riskli paylaşımın işə təsiri. |
| Son | Ölüm, "Xəyal → Oldu" ekranı, həyat jurnalı. |
| Testlər | Repo-da yoxdur. Sessiyada Node simulyasiyası ilə 1600+ həyat sınanıb, nəticə: 0 çökmə. |

**Qorunacaqlar:** PWA arxitekturası və offline iş, vizual üslub, mövcud mexanikalar (təhsil, karyera, Pıçıltı, istedadlar) və bütün mövcud hadisə mətnləri. Hadisələr silinməyəcək, yeni JSON formatına köçürüləcək.

## 2. Content pack-in qiymətləndirilməsi

- **Sənədlər** (`GAME_DESIGN`, `STORY_BIBLE`, `ART_DIRECTION`, `consequences`): tapşırıqla tam uyğundur, qaydalar kimi qəbul edilir.
- **`starter_events.json`:** 21 hadisə (5–26 yaş). Konfliktlər yaxşıdır və real həyatdandır.
  - Bütün `result_text`-lər eyni yer tutucudur.
  - 63 effektin hamısı `stat_delta` və ya `set_flag`-dır. `relationship_delta` və `schedule_event` heç yerdə istifadə olunmayıb.
  - 21 müxtəlif açar (`empathy`, `honesty`, `courage`, `discipline`…) mövcud göstəricilərə uyğun gəlmir.
- **`schema.json`:** çox minimaldır: yalnız id, yaş, başlıq, mətn və seçimlər.
- **`archetypes.json`** (4 arxetip) və **`epilogues/templates.json`** (5 şablon) başlanğıc kimi yararlıdır.

**Qərar:**
- Pack-in formatı genişləndirilmiş sxemlə JSON kitabxanasının əsası olacaq.
- 21 hadisəyə real nəticə mətnləri və gecikmiş toxumlar yazılacaq.
- Pack-in açarları yeni **xarakter xüsusiyyətləri** sisteminə çevriləcək: empatiya, dürüstlük, cəsarət, intizam, müstəqillik, ailəyə bağlılıq. Bunlar gələcək hadisələrin şərtlərində istifadə olunacaq.

## 3. Tapşırığa görə çatışmayan modullar

| § | Tələb | Mövcud | Çatışmayan |
|---|---|---|---|
| 3 | Dinamik zaman, vahid təqvim | İllik addım | Gün əsaslı təqvim, hadisənin `time_cost`-u, planlaşdırılmış hadisələr, kredit cədvəli |
| 4 | 4 növ nəticə | Dərhal + flag | Gecikmiş hadisə planlayıcısı (`scheduled_events`), `event_history`, sosial nəticələr |
| 6 | Məkan sistemi | Şəhər adı | Hər məkan üçün xərclər, işlər, təhsil, mənzil, yerli hadisələr, fon; köçmək |
| 7 | Tam NPC | Ad, yaş, 1 münasibət | Soyad, doğum tarixi, yer, təhsil, iş, sağlamlıq, pul, xarakter, məqsəd, tarixçə; 4 münasibət ölçüsü; NPC-nin müstəqil həyatı |
| 8 | Sevgi və övladlar | Sadə | Nişan, boşanma, barışıq; övladların böyüməsi, təhsili, işi, ailəsi; övlada dəstək |
| 9 | Əmlak | Al-sat | Torpaq, mağaza, biznes; kredit, borc, təmir, saxlama xərci, dəyər dəyişməsi, mülkiyyət tarixçəsi |
| 10 | İqtisadiyyat | Kobud illik balans | Kirayə, ərzaq, nəqliyyat, kommunal, təhsil xərcləri; qənaət, kredit; konfiqurasiya cədvəli |
| 11 | JSON kitabxana, 150 hadisə (5–25) | JS içində, 5–25 üçün ~60 | JSON + sxem + interpretator; ~70–90 yeni hadisə |
| 12 | 20–30 illüstrasiya | Emoji | Bütün illüstrasiyalar |
| 13 | Yekun hekayə, "Geridə Qalanlar" | Qısa xülasə | Tam epiloq, ölüm anı ilə sonrakı illərin ayrılması, məhdud post-simulyasiya, yalnız faktlar |
| 14 | DB, çox slot, seed, miqrasiya, testlər | localStorage, 1 slot | Bunların hamısı |
| 15 | 8 ekran | 5 ekran | Ailə ağacı, maliyyə ekranı, ətraflı arxiv |

## 4. Texniki qərarlar (təsdiq gözləyir)

1. **Platforma:** PWA olaraq qalır, Flutter-ə köçürülmür (tapşırığın §0 bəndinə uyğun). Gələcəkdə eyni kod Capacitor ilə Android/iOS tətbiqinə, Electron/Tauri ilə PC-yə bükülə bilər.
2. **Verilənlər bazası:**
   - **Tövsiyə:** brauzerin daxili bazası **IndexedDB**. Versiyalı miqrasiyalar, çox slot, tam offline; əlavə yükləmə yoxdur.
   - **Alternativ:** SQLite (`sql.js`, WebAssembly, ~1.2 MB). Tapşırıqda adı çəkilir, amma brauzerdə yaddaşı yenə IndexedDB-yə yazmalıdır. Yəni yalnız əlavə qat olur.
   - **Plan:** DB qatı ayrıca modul (`db.js`) olacaq, gələcəkdə native SQLite-a keçid yalnız bu faylı dəyişəcək.
3. **Təsadüfilik:** bütün `Math.random()` çağırışları **seed-li RNG**-yə (mulberry32) keçir. Həyatın seed-i saxlanılır, testlər deterministik olur.
4. **Hüquqi qaydalar:** hərbi xidmət, təhsil və təqaüd qaydaları ayrıca versiyalı `rules.json`-a çıxarılır və hər qaydanın mənbə qeydi olur. Hazırkı kodda olan "18 ay xidmət" qaydası təsdiqlənənə qədər `yoxlanılmalı` kimi işarələnir. Ali təhsilli üçün fərqli müddət kimi təsdiqlənməmiş qaydalar əlavə edilmir.
5. **İllüstrasiyalar:** təsdiq lazımdır, bax §7.

## 5. Verilənlər bazası strukturu (IndexedDB, `heyat-db` v1)

| Store | Açar | Əsas sahələr |
|---|---|---|
| `meta` | key | db versiyası, aktiv slot |
| `lives` | lifeId | slot, seed, doğum tarixi, cari tarix, məkan, status, ölüm tarixi/səbəbi, versiya |
| `people` | [lifeId, npcId] | ad, soyad, cins, doğum tarixi, ölüm tarixi, məkan, təhsil, iş, sağlamlıq, pul, xarakter (arxetip + traits), məqsədlər, valideyn/həyat yoldaşı id-ləri |
| `relations` | [lifeId, a, b] | trust, closeness, conflict, attachment, növ (ana, dost, həyat yoldaşı…), başlama/bitmə tarixi |
| `event_history` | [lifeId, seq] | tarix, event_id, seçim, nəticə, effektlər |
| `scheduled` | [lifeId, id] | aktivləşmə tarixi, event_id, şərtlər, mənbə (hansı qərardan) |
| `flags` | [lifeId, key] | dəyər, qoyulduğu tarix |
| `assets` | [lifeId, assetId] | növ (mənzil, həyət evi, torpaq, maşın, mağaza, biznes), məkan, alış qiyməti/tarixi, cari dəyər, saxlama xərci, vəziyyət, sahiblik tarixçəsi |
| `loans` | [lifeId, loanId] | məbləğ, faiz, müddət, aylıq ödəniş, qalıq, gecikmələr |
| `ledger` | [lifeId, seq] | tarix, kateqoriya (maaş, kirayə, ərzaq…), məbləğ |
| `careers` | [lifeId, seq] | şəxs (oyunçu və ya NPC), işəgötürən, vəzifə, başlama/bitmə, səbəb |
| `memories` | [lifeId, seq] | tarix, mətn, vizual id, əhəmiyyət, ölüm anı/sonrası |
| `archive` | lifeId | tamamlanmış həyatın yekun epiloqu (oxumaq üçün) |

Miqrasiyalar `db.js` içində versiya-versiya saxlanılır. Mövcud `localStorage` yaddaşı birinci açılışda yeni bazaya köçürülür: aktiv həyat davam edir.

## 6. Hadisə sxemi (genişləndirilmiş, pack-lə uyğun)

```json
{
  "id": "az_life_07", "category": "school", "tone": "everyday|dramatic|rare",
  "age_min": 7, "age_max": 8, "location": ["any"], "visual": "school_yard",
  "title": "Yeni sinif yoldaşı", "description": "…",
  "repeatable": false, "cooldown_days": 0, "weight": 50, "priority": 0,
  "conditions": { "all": [ {"flag": "x"}, {"npc_alive": "role:dost"}, {"stat": "smarts", "gte": 50}, {"location_type": "city"} ] },
  "time_cost": {"days": 0},
  "choices": [ {
    "id": "c1", "text": "…", "result_text": "…",
    "conditions": {},
    "effects": [
      {"type": "stat_delta", "key": "empathy", "value": 3},
      {"type": "relationship_delta", "target": "new:classmate", "trust": 10, "closeness": 8},
      {"type": "set_flag", "key": "defended_classmate"},
      {"type": "schedule_event", "event": "old_friend_returns", "after_years": [15, 20], "if": {"npc_alive": "flag_npc:defended_classmate"}}
    ],
    "outcomes": [ {"p": 0.7, "effects": [], "result_text": "…"} ]
  } ]
}
```

İnterpretator effekt və şərtləri **tipli** yoxlayır. Naməlum tip və ya açar validasiya xətasıdır.

## 7. Vizual resurslar: seçim lazımdır

| Variant | Üstünlük | Çatışmazlıq |
|---|---|---|
| **A. Mənim çəkdiyim SVG illüstrasiyalar** | Bütöv üslub, kiçik ölçü, offline, dərhal mümkündür | "Əl ilə çəkilmiş painterly" deyil, daha sadə və düz təsvirlərdir |
| **B. Süni intellektlə yaradılmış şəkillər** (`ART_DIRECTION` promptları ilə; bu sessiyada Canva-nın şəkil generatoru qoşuludur) | Painterly üsluba ən yaxın | Xarici xidmətdən istifadə edir. Hər şəkil Azərbaycan detallarının düzgünlüyünə görə yoxlanmalıdır. Üslub tam eyni olmaya bilər. |
| **C. Rəssam və ya özünüzün hazırladığı şəkillər** | Ən yüksək keyfiyyət | Vaxt və büdcə tələb edir |

**Tövsiyə:** əvvəlcə A ilə 25 yer tutucu fon (oyun bütöv görünür), sonra təsdiqinizlə B ilə əvəz etmək. Kodda hər hadisə yalnız `visual` id-yə istinad edir, şəkli dəyişmək kod dəyişikliyi tələb etmir.

## 8. Mərhələli plan

| Mərhələ | Nə edilir | Test | Nəticə |
|---|---|---|---|
| **1. Analiz** | Bu sənəd | — | ✅ hazırdır |
| **2. DB, zaman, qərar mühərriki** ✅ | `db.js` (IndexedDB + miqrasiya + slotlar), `rng.js` (seed), `calendar.js` (gün əsaslı təqvim, `time_cost`), `scheduler.js`, `events/*.json` + validator + interpretator; mövcud 106 hadisənin JSON-a köçürülməsi; köhnə save miqrasiyası | Deterministik seed, save/load, zaman geri getmir, gecikmiş hadisə vaxtında aktivləşir, sxem validasiyası | Oyun eyni görünür, amma yeni mühərriklə işləyir |
| **3. Ailə və NPC** | NPC modeli, 4 ölçülü münasibətlər, arxetiplər, NPC illik həyat tiki (təhsil, iş, evlilik, xəstəlik, köçmə), ailə ağacı ekranı | Ölmüş NPC hadisədə görünmür, yaş/qohumluq ziddiyyəti yoxdur | Canlı ailə |
| **4. Əmlak, maliyyə, karyera, övladlar** | Məkan konfiqurasiyası, xərc cədvəli, ledger, kredit, əmlak növləri, övladların müstəqil həyatı və onlara dəstək, maliyyə ekranı | Balans (Monte-Karlo 1000 həyat), kredit hesablamaları | Real iqtisadiyyat |
| **5. Ssenarilər, məkanlar, vizual** | 5–25 yaş üçün ≥150 əlaqəli hadisə (mövcud ~60 + pack 21 + ~70–90 yeni), məkan hadisələri, 25 illüstrasiya | Hər hadisənin əlçatanlığı, ton balansı (60/30/10) | **İlk tam prototip (5–25)** |
| **6. Ölüm, epiloq, arxiv** | Epiloq generatoru (yalnız faktlar), "Geridə Qalanlar", post-ölüm məhdud simulyasiya, arxiv ekranı | Epiloqda olmayan ailə üzvü yoxdur | Tam həyat dövrü |
| **7. Testlər, balans, performans** | `tests/` (Node, brauzer lazım deyil), ziddiyyət yoxlayıcısı, 26+ yaş hadisələrinin genişləndirilməsi, performans | CI-sız lokal test skripti | V1.0 |

## 9. Vəziyyət

- **2026-11-17 · 2-ci mərhələ hazırdır.** IndexedDB (5 slot, arxiv, qərar tarixçəsi, köhnə yaddaşın köçürülməsi), seed-li RNG, gün əsaslı təqvim, JSON hadisə kitabxanası (127 hadisə) + validator + interpretator, 9 gecikmiş nəticə zənciri, `rules.json` (hərbi xidmət 18/12/12 ay — oyunçunun verdiyi qayda, rəsmi mənbə ilə yoxlanılmalı), magistratura, xarakter xüsusiyyətləri. `tests/run.js`: 10/10 test keçir.

- **2026-11-18 · Həyat yolları sistemi (4-cü mərhələnin karyera hissəsi + yeni yollar).** `data/careers.json` (22 karyera: pillələr, maaş diapazonları, qəbul şərtləri, risk, təqaüd), `js/career.js` (illik qiymətləndirmə, rəhbər və şirkət vəziyyəti, maaş artımı/yüksəliş müraciəti, iş yerini dəyişmək, öz biznesi, investisiya, lisenziyalar və uçuş saatları, hərbi rütbələr), `js/justice.js` (cinayət → istintaq → məhkəmə → cəza → həbs həyatı → şərti azadlıq → məhkumluq qeydi; cəzalar `rules.json`-da sadələşdirilmiş oyun konfiqurasiyasıdır), ölüm riski modeli (yaş, sağlamlıq, həyat tərzi, peşə, həbs), yekun ekranda “Geridə qalanlar”. `data/events/paths.json`: 50+ hadisə. Testlər: 17/17.

**Həcm haqqında dürüst qiymət:** bu, bir neçə iş sessiyası tələb edən işdir. Hər mərhələnin sonunda oyun işlək vəziyyətdə GitHub-a yüklənəcək, aralıq vəziyyət olmayacaq.
