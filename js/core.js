/* Core utilities shared by engine, UI and tests:
   - RNG: seeded mulberry32. The state lives inside the life (P.rng) so a saved game continues the same sequence
     and a given seed + the same choices always reproduce the same life (deterministic tests).
   - Cal: one game calendar. Dates are day numbers (days since 1970-01-01, UTC); time only moves forward. */
"use strict";

const RNG = {
  // returns a float in [0,1). Uses the current life's state when a life is loaded, otherwise Math.random (menus).
  next() {
    if (typeof P === "undefined" || !P || P.rng == null) return Math.random();
    let t = (P.rng = (P.rng + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  newSeed() { return (Math.random() * 4294967296) >>> 0; }
};

const Cal = {
  MONTHS: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"],
  fromYMD(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 864e5); },
  toYMD(day) { const d = new Date(day * 864e5); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; },
  addYears(day, n) { const x = Cal.toYMD(day); const lastFeb = x.m === 2 && x.d === 29; return Cal.fromYMD(x.y + n, x.m, lastFeb ? 28 : x.d); },
  addMonths(day, n) { const x = Cal.toYMD(day); const m0 = x.m - 1 + n; const y = x.y + Math.floor(m0 / 12); const m = ((m0 % 12) + 12) % 12 + 1; const dim = new Date(Date.UTC(y, m, 0)).getUTCDate(); return Cal.fromYMD(y, m, Math.min(x.d, dim)); },
  // completed years between two day numbers
  yearsBetween(a, b) { const A = Cal.toYMD(a), B = Cal.toYMD(b); let n = B.y - A.y; if (B.m < A.m || (B.m === A.m && B.d < A.d)) n--; return n; },
  fmt(day) { const x = Cal.toYMD(day); return `${x.d} ${Cal.MONTHS[x.m - 1]} ${x.y}`; },
  fmtMonth(day) { const x = Cal.toYMD(day); return `${Cal.MONTHS[x.m - 1][0].toUpperCase() + Cal.MONTHS[x.m - 1].slice(1)} ${x.y}`; },
  today() { return Math.floor(Date.now() / 864e5); }
};

if (typeof module !== "undefined") module.exports = { RNG, Cal };
