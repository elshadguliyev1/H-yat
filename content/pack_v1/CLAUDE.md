# Claude Code inteqrasiya təlimatı

1. Mövcud repozitoriyanı yoxla, mövcud framework və DB arxitekturasını qoru; yeni Flutter layihəsi yaratma, əgər layihə artıq mövcuddursa.
2. `events/*.json` fayllarını oxuyan adapter yarat; `schema.json` ilə validasiya et. Bu paketdəki event JSON-ları məzmun nümunəsidir; `conditions` və `effects` üçün tipli interpreter yaz.
3. `set_flag`, `stat_delta`, `relationship_delta`, `schedule_event` effektlərini implement et. Event seçərkən yaş, flags, NPC statusu və planlaşdırılmış tarixləri yoxla.
4. Eyni event_id təkrar gəlməsin (repeatable=false). Zaman irəliləyərkən gəlir/xərc və NPC vəziyyəti yenilə.
5. Epiloq generatoru yalnız faktiki DB məlumatlarını və epiloq şablonlarını istifadə etsin; uydurma övlad, nikah, ölüm yaratmasın.
6. Unit testlər: deterministik seed, save/load, ölmüş NPC hadisəsi yoxdur, zaman geriyə getmir, gecikmiş hadisə aktivləşir, epiloqda ailə məlumatları uyğundur.
7. Vizual promptları `visuals/ART_DIRECTION.md`-dən götür; şəkillər mövcud deyilsə placeholder istifadə et.
8. İlk iş: mövcud kod bazasının arxitekturasını xülasə et və faylları minimum dəyişikliklə inteqrasiya planı təqdim et.
