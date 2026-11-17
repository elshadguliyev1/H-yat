# Hadisə formatı (data/events/*.json)

Yeni hadisə əlavə etmək üçün uyğun fayla obyekt əlavə edin və `node tests/run.js` işlədin. Validator naməlum sahəni, şərti, əməliyyatı və dəyişəni xəta kimi göstərir.

```json
{
  "id": "unikal_id", "cat": "school|family|friends|love|career|money|health|social|military|life",
  "tone": "everyday|dramatic|rare", "age": [7, 9], "icon": "🎒", "visual": "school_yard",
  "t": "Hadisənin mətni. {dost}, {ana}, {xəyal} kimi dəyişənlər işlənə bilər.",
  "w": 1, "priority": 0, "force": false, "once": true, "cool": 0, "scheduled_only": false,
  "cond": { "has": ["dost"], "stat_gt": { "smarts": 50 } },
  "ch": [
    { "t": "Seçim", "r": "Nəticə mətni", "fx": { "happy": 3, "rel": { "dost": 5 } }, "trait": { "empathy": 2 },
      "do": [ { "schedule": { "event": "davam_hadisesi", "after_years": [10, 15] } } ] },
    { "t": "Riskli seçim", "odds": [ { "p": { "of": "st.fitness", "div": 120 }, "fx": {}, "r": "Uğur" }, { "p": 0.5, "r": "Uğursuzluq" } ] }
  ]
}
```

- **Şərtlər:** `gender`, `stage`, `stage_not`, `job`, `job_not`, `job_lv_gte`, `job_lv_lt`, `job_perf_gt`, `stat_gt`, `stat_lt`, `tal_gt`, `trait_gt`, `trait_lt`, `money_gt`, `money_gte`, `money_lt`, `fame_gt`, `followers_gte`, `social`, `flag`, `no_flag`, `flag_since_gte`, `has`, `has_any`, `has_not`, `rel_gt`, `count_lt`, `kid_age_eq`, `kid_age_gte`, `parent_age_gt`, `parent_died_last_year`, `asset`, `army`, `army_due`, `npc_flag_alive`, `npc_job`, `faculty`, `legal_case`, `in_prison`, `record`, `track`, `lic`, `no_lic`, `hours_gte`, `medical`, `asset_type`, `job_susp`, `any`, `not`.
- **Effektlər (`fx`):** `health`, `happy`, `smarts`, `fitness`, `looks`, `money`, `fame`, `followers`, `rel`, `tal`, `flag`, `unflag`, `perf`.
- **Əməliyyatlar (`do`):** `add_person`, `remove_role`, `remove_if_low`, `promote_role`, `start_job`, `end_job`, `promote`, `army_start`, `open_social`, `social_quiet`, `dream_set`, `money_rand`, `money_mul`, `followers_rand`, `add_asset`, `sell_asset`, `flag_inc`, `count`, `learn_code`, `exam`, `skip_university`, `allow_retake`, `master_start`, `master_skip`, `move_city`, `schedule`, `trait`, `raise`, `job_suspend`, `job_resume`, `npc_die`, `npc_note`, `npc_job`, `money_rand_q`, `crime`, `trial`, `set_lic`, `phd_start`, `flight_school`, `military_retire`, `asset_mul`, `die_chance`.
- **Həbs hadisələri:** `"prison": true` olan hadisələr yalnız həbsdə, qalanları yalnız azadlıqda çıxır.
- **Karyeralar:** `data/careers.json` — pillələr, maaş diapazonları, qəbul yolları (`paths`), pillə şərtləri (`reqLv`), risk, təqaüd yaşı.
- **Gecikmiş nəticə:** `schedule` hədəf hadisəni gələcək tarixə qoyur. Hədəf hadisədə `"scheduled_only": true` olsun. Vaxtı çatanda öz şərtləri yenidən yoxlanılır, məsələn, NPC sağdırmı.
