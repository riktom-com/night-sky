'use strict';
/* ═══════════════════════════════════════════════════════════════════
   ASTRO — Celestial calculations for Georgia Night Sky Guide
   Pure functions, no external deps. Accuracy: sub-degree for sky map.
   ═══════════════════════════════════════════════════════════════════ */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/* ── Julian / Sidereal Time ──────────────────────────────────────── */
function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function gmst(jd) {
  // Greenwich Mean Sidereal Time in hours, 0–24
  const D = jd - 2451545.0;
  const T = D / 36525;
  let g = 18.697374558 + 24.06570982441908 * D;
  g = g + 0.000026 * T * T;
  return ((g % 24) + 24) % 24;
}

function lst(jd, lonDeg) {
  return ((gmst(jd) + lonDeg / 15) % 24 + 24) % 24;
}

/* ── Equatorial → Horizontal (alt/az) ────────────────────────────── */
function eqToAltAz(raHr, decDeg, latDeg, lstHr) {
  const H   = ((lstHr - raHr) * 15) * DEG;            // hour angle in rad
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const alt = Math.asin(Math.sin(dec)*Math.sin(lat) + Math.cos(dec)*Math.cos(lat)*Math.cos(H));
  let az    = Math.atan2(Math.sin(H), Math.cos(H)*Math.sin(lat) - Math.tan(dec)*Math.cos(lat));
  az = (az * RAD + 180 + 360) % 360;                   // 0=N, 90=E, etc.
  return { alt: alt * RAD, az };
}

/* ── Sun position (RA/Dec, J2000) ────────────────────────────────── */
function sunRaDec(jd) {
  const n = jd - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * DEG;
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2*g)) * DEG;
  const obl    = 23.439 * DEG;
  const ra     = Math.atan2(Math.cos(obl) * Math.sin(lambda), Math.cos(lambda));
  const dec    = Math.asin(Math.sin(obl) * Math.sin(lambda));
  return {
    ra:  ((ra * RAD / 15) + 24) % 24,
    dec: dec * RAD,
    eclLon: ((lambda * RAD) % 360 + 360) % 360,
  };
}

/* ── Moon position (Brown's series, simplified) ──────────────────── */
function moonRaDec(jd) {
  const T = (jd - 2451545.0) / 36525;
  // Mean elements (Meeus, simplified)
  let Lp = 218.3164477 + 481267.88123421 * T;           // mean longitude
  let D  = 297.8501921 + 445267.1114034 * T;            // mean elongation
  let M  = 357.5291092 + 35999.0502909 * T;             // sun mean anomaly
  let Mp = 134.9633964 + 477198.8675055 * T;            // moon mean anomaly
  let F  = 93.2720950 + 483202.0175233 * T;             // arg of latitude
  [Lp, D, M, Mp, F] = [Lp, D, M, Mp, F].map(x => ((x % 360) + 360) % 360);

  const Dr  = D * DEG, Mr = M * DEG, Mpr = Mp * DEG, Fr = F * DEG;
  // Largest periodic terms for longitude (in degrees)
  let lon = Lp
    + 6.289 * Math.sin(Mpr)
    - 1.274 * Math.sin(Mpr - 2*Dr)
    + 0.658 * Math.sin(2*Dr)
    - 0.186 * Math.sin(Mr)
    - 0.059 * Math.sin(2*Mpr - 2*Dr);
  // Latitude
  const lat = 5.128 * Math.sin(Fr)
    + 0.281 * Math.sin(Mpr + Fr)
    + 0.278 * Math.sin(Mpr - Fr)
    + 0.173 * Math.sin(2*Dr - Fr);

  lon = ((lon % 360) + 360) % 360;
  const lonR = lon * DEG, latR = lat * DEG;
  const obl  = 23.439 * DEG;
  // Ecliptic → equatorial
  const ra  = Math.atan2(Math.sin(lonR)*Math.cos(obl) - Math.tan(latR)*Math.sin(obl), Math.cos(lonR));
  const dec = Math.asin(Math.sin(latR)*Math.cos(obl) + Math.cos(latR)*Math.sin(obl)*Math.sin(lonR));
  return {
    ra:  ((ra * RAD / 15) + 24) % 24,
    dec: dec * RAD,
    eclLon: lon,
  };
}

/* ── Moon phase + illumination ──────────────────────────────────── */
function moonPhase(jd) {
  const sun  = sunRaDec(jd);
  const moon = moonRaDec(jd);
  const elong = ((moon.eclLon - sun.eclLon) % 360 + 360) % 360; // 0=new, 180=full
  const illum = (1 - Math.cos(elong * DEG)) / 2 * 100;
  const phase = elong / 360; // 0-1
  let name;
  if (phase < 0.03 || phase >= 0.97)       name = 'New Moon';
  else if (phase < 0.22)                   name = 'Waxing Crescent';
  else if (phase < 0.28)                   name = 'First Quarter';
  else if (phase < 0.47)                   name = 'Waxing Gibbous';
  else if (phase < 0.53)                   name = 'Full Moon';
  else if (phase < 0.72)                   name = 'Waning Gibbous';
  else if (phase < 0.78)                   name = 'Last Quarter';
  else                                     name = 'Waning Crescent';
  let icon;
  if (phase < 0.0625 || phase >= 0.9375) icon = '🌑';
  else if (phase < 0.1875)                icon = '🌒';
  else if (phase < 0.3125)                icon = '🌓';
  else if (phase < 0.4375)                icon = '🌔';
  else if (phase < 0.5625)                icon = '🌕';
  else if (phase < 0.6875)                icon = '🌖';
  else if (phase < 0.8125)                icon = '🌗';
  else                                    icon = '🌘';
  return { phase, illum, name, icon, elong };
}

/* ── Sun events (rise/set/twilight) ──────────────────────────────── */
// Returns local Date for the event today, or null if no event (polar)
function sunEventLocal(date, latDeg, lonDeg, altDeg) {
  // Bisect on time over the 24-hour local day to find sun altitude = altDeg
  const localMidnight = new Date(date);
  localMidnight.setHours(0, 0, 0, 0);
  // We want two events: morning (rising) and evening (setting).
  // Scan at coarse 30-min steps to find sign changes, then refine.
  const lat = latDeg;
  const events = { rise: null, set: null };
  let prevT  = null, prevAlt = null;
  for (let mins = 0; mins <= 24*60; mins += 15) {
    const t   = new Date(localMidnight.getTime() + mins*60000);
    const jd  = julianDay(t);
    const s   = sunRaDec(jd);
    const aa  = eqToAltAz(s.ra, s.dec, lat, lst(jd, lonDeg));
    const cur = aa.alt - altDeg;
    if (prevT !== null && Math.sign(cur) !== Math.sign(prevAlt)) {
      // bisect
      let lo = prevT, hi = t, lAlt = prevAlt;
      for (let i = 0; i < 12; i++) {
        const mid = new Date((lo.getTime() + hi.getTime()) / 2);
        const jdm = julianDay(mid);
        const sm  = sunRaDec(jdm);
        const mm  = eqToAltAz(sm.ra, sm.dec, lat, lst(jdm, lonDeg));
        const ma  = mm.alt - altDeg;
        if (Math.sign(ma) === Math.sign(lAlt)) { lo = mid; lAlt = ma; }
        else hi = mid;
      }
      const evt = new Date((lo.getTime() + hi.getTime()) / 2);
      if (prevAlt < 0) events.rise = evt; else events.set = evt;
    }
    prevT = t; prevAlt = cur;
  }
  return events;
}

function moonEventLocal(date, latDeg, lonDeg) {
  const localMidnight = new Date(date);
  localMidnight.setHours(0, 0, 0, 0);
  const events = { rise: null, set: null };
  let prevT = null, prevAlt = null;
  for (let mins = 0; mins <= 24*60; mins += 15) {
    const t   = new Date(localMidnight.getTime() + mins*60000);
    const jd  = julianDay(t);
    const m   = moonRaDec(jd);
    const aa  = eqToAltAz(m.ra, m.dec, latDeg, lst(jd, lonDeg));
    if (prevT !== null && Math.sign(aa.alt) !== Math.sign(prevAlt)) {
      let lo = prevT, hi = t, lAlt = prevAlt;
      for (let i = 0; i < 10; i++) {
        const mid  = new Date((lo.getTime() + hi.getTime()) / 2);
        const jdm  = julianDay(mid);
        const mm   = moonRaDec(jdm);
        const aa2  = eqToAltAz(mm.ra, mm.dec, latDeg, lst(jdm, lonDeg));
        if (Math.sign(aa2.alt) === Math.sign(lAlt)) { lo = mid; lAlt = aa2.alt; }
        else hi = mid;
      }
      const evt = new Date((lo.getTime() + hi.getTime()) / 2);
      if (prevAlt < 0) events.rise = evt; else events.set = evt;
    }
    prevT = t; prevAlt = aa.alt;
  }
  return events;
}

/* ── Planet positions (simplified Keplerian, J2000) ──────────────── */
const PLANET_ELEMENTS = {
  // a (AU), e, i (deg), L0 (mean lon deg), peri (long of perihelion deg), node (long of asc node deg),
  // rate of L per day (deg/day)
  mercury: { a:0.38710, e:0.20563, i:7.005,  L0:252.251, peri:77.456,  node:48.331,  rate:4.09233880 },
  venus:   { a:0.72333, e:0.00677, i:3.395,  L0:181.980, peri:131.560, node:76.681,  rate:1.60213034 },
  earth:   { a:1.00000, e:0.01671, i:0.000,  L0:100.466, peri:102.937, node:0.000,   rate:0.98560912 },
  mars:    { a:1.52366, e:0.09340, i:1.850,  L0:355.433, peri:336.041, node:49.578,  rate:0.52403304 },
  jupiter: { a:5.20336, e:0.04839, i:1.305,  L0:34.351,  peri:14.331,  node:100.464, rate:0.08308529 },
  saturn:  { a:9.53707, e:0.05415, i:2.486,  L0:50.078,  peri:93.057,  node:113.665, rate:0.03344414 },
};
const PLANET_INFO = {
  mercury: { name:'Mercury', color:'#9e9e9e', mag:-0.5, symbol:'☿' },
  venus:   { name:'Venus',   color:'#ffd54f', mag:-4.0, symbol:'♀' },
  mars:    { name:'Mars',    color:'#e57373', mag:0.5,  symbol:'♂' },
  jupiter: { name:'Jupiter', color:'#d7b07a', mag:-2.0, symbol:'♃' },
  saturn:  { name:'Saturn',  color:'#e0c79a', mag:0.5,  symbol:'♄' },
};

function solveKepler(M, e) {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 8; i++) {
    const dE = (E - e*Math.sin(E) - M) / (1 - e*Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

function planetHelio(name, jd) {
  // Returns heliocentric ecliptic (x,y,z) in AU
  const el = PLANET_ELEMENTS[name];
  const d  = jd - 2451545.0;
  const L  = ((el.L0 + el.rate * d) % 360 + 360) % 360;
  const M  = ((L - el.peri) % 360 + 360) % 360;
  const E  = solveKepler(M * DEG, el.e);
  const xv = el.a * (Math.cos(E) - el.e);
  const yv = el.a * Math.sqrt(1 - el.e*el.e) * Math.sin(E);
  const v  = Math.atan2(yv, xv);
  const r  = Math.sqrt(xv*xv + yv*yv);

  const w  = (el.peri - el.node) * DEG;
  const N  = el.node * DEG;
  const i  = el.i * DEG;
  const x = r * (Math.cos(N)*Math.cos(v + w) - Math.sin(N)*Math.sin(v + w)*Math.cos(i));
  const y = r * (Math.sin(N)*Math.cos(v + w) + Math.cos(N)*Math.sin(v + w)*Math.cos(i));
  const z = r * Math.sin(v + w) * Math.sin(i);
  return { x, y, z };
}

function planetRaDec(name, jd) {
  const p = planetHelio(name, jd);
  const e = planetHelio('earth', jd);
  // Geocentric ecliptic
  const gx = p.x - e.x, gy = p.y - e.y, gz = p.z - e.z;
  // Ecliptic → equatorial
  const obl = 23.439 * DEG;
  const xq  = gx;
  const yq  = gy*Math.cos(obl) - gz*Math.sin(obl);
  const zq  = gy*Math.sin(obl) + gz*Math.cos(obl);
  const ra  = Math.atan2(yq, xq);
  const dec = Math.atan2(zq, Math.sqrt(xq*xq + yq*yq));
  return {
    ra:  ((ra * RAD / 15) + 24) % 24,
    dec: dec * RAD,
    dist: Math.sqrt(gx*gx + gy*gy + gz*gz),
  };
}

/* ── Star catalog (bright stars visible from Georgia, J2000) ──────────
   [name, RA hours, Dec degrees, magnitude, color]
   Colors approximate spectral class: blue B '#aabfff', blue-white '#cdd9ff',
   white A '#eef3ff', yellow-white F '#f8f7ef', yellow G '#fde6bd',
   orange K '#ffcf9e', red M '#ff9e76'. Faint pattern stars keep unique keys. */
const STARS = [
  // Orion
  ['Betelgeuse', 5.9195,   7.4071,  0.50, '#ff9e76'],
  ['Rigel',      5.2422,  -8.2017,  0.13, '#cdd9ff'],
  ['Bellatrix',  5.4188,   6.3497,  1.64, '#aabfff'],
  ['Mintaka',    5.5334,  -0.2991,  2.23, '#aabfff'],
  ['Alnilam',    5.6036,  -1.2019,  1.69, '#aabfff'],
  ['Alnitak',    5.6793,  -1.9426,  1.70, '#aabfff'],
  ['Saiph',      5.7959,  -9.6696,  2.06, '#aabfff'],
  ['Meissa',     5.5854,   9.9340,  3.39, '#aabfff'],
  // Canis Major / Minor
  ['Sirius',     6.7525, -16.7161, -1.46, '#eef3ff'],
  ['Adhara',     6.9770, -28.9720,  1.50, '#aabfff'],
  ['Wezen',      7.1399, -26.3934,  1.83, '#f8f7ef'],
  ['Mirzam',     6.3783, -17.9559,  1.98, '#aabfff'],
  ['Aludra',     7.4015, -29.3031,  2.45, '#aabfff'],
  ['Furud',      6.3382, -30.0634,  3.02, '#aabfff'],
  ['Procyon',    7.6550,   5.2250,  0.34, '#f8f7ef'],
  ['Gomeisa',    7.4527,   8.2893,  2.89, '#aabfff'],
  // Taurus
  ['Aldebaran',  4.5987,  16.5093,  0.85, '#ffcf9e'],
  ['Elnath',     5.4382,  28.6075,  1.65, '#cdd9ff'],
  ['Alcyone',    3.7914,  24.1051,  2.87, '#aabfff'],
  ['ZetaTau',    5.6274,  21.1426,  2.97, '#aabfff'],
  ['LambdaTau',  4.0112,  12.4903,  3.41, '#aabfff'],
  // Gemini
  ['Pollux',     7.7553,  28.0262,  1.14, '#ffcf9e'],
  ['Castor',     7.5766,  31.8883,  1.58, '#eef3ff'],
  ['Alhena',     6.6285,  16.3993,  1.93, '#eef3ff'],
  ['Tejat',      6.3826,  22.5137,  2.88, '#ff9e76'],
  ['Mebsuta',    6.7323,  25.1311,  2.98, '#fde6bd'],
  ['Propus',     6.2479,  22.5067,  3.28, '#ff9e76'],
  ['Alzirr',     6.7547,  12.8956,  3.35, '#f8f7ef'],
  ['Wasat',      7.3353,  21.9822,  3.53, '#f8f7ef'],
  // Auriga
  ['Capella',    5.2782,  45.9981,  0.08, '#fde6bd'],
  ['Menkalinan', 5.9921,  44.9474,  1.90, '#eef3ff'],
  ['Mahasim',    5.9953,  37.2126,  2.62, '#eef3ff'],
  ['Hassaleh',   4.9499,  33.1661,  2.69, '#ffcf9e'],
  ['Almaaz',     5.0328,  43.8233,  2.99, '#f8f7ef'],
  // Ursa Major (Big Dipper)
  ['Dubhe',     11.0621,  61.7508,  1.79, '#ffcf9e'],
  ['Merak',     11.0307,  56.3824,  2.37, '#eef3ff'],
  ['Phecda',    11.8972,  53.6948,  2.44, '#eef3ff'],
  ['Megrez',    12.2571,  57.0326,  3.31, '#eef3ff'],
  ['Alioth',    12.9004,  55.9598,  1.77, '#eef3ff'],
  ['Mizar',     13.3987,  54.9254,  2.27, '#eef3ff'],
  ['Alkaid',    13.7923,  49.3133,  1.86, '#cdd9ff'],
  // Ursa Minor
  ['Polaris',    2.5303,  89.2641,  1.97, '#f8f7ef'],
  ['Kochab',    14.8451,  74.1555,  2.07, '#ffcf9e'],
  ['Pherkad',   15.3455,  71.8340,  3.00, '#eef3ff'],
  // Cassiopeia
  ['Schedar',    0.6751,  56.5373,  2.24, '#ffcf9e'],
  ['Caph',       0.1530,  59.1498,  2.28, '#f8f7ef'],
  ['Navi',       0.9451,  60.7167,  2.15, '#aabfff'],
  ['Ruchbah',    1.4304,  60.2353,  2.68, '#eef3ff'],
  ['Segin',      1.9066,  63.6701,  3.35, '#aabfff'],
  // Perseus
  ['Mirfak',     3.4054,  49.8612,  1.79, '#f8f7ef'],
  ['Algol',      3.1361,  40.9557,  2.12, '#cdd9ff'],
  ['GammaPer',   3.0799,  53.5064,  2.93, '#fde6bd'],
  ['DeltaPer',   3.7150,  47.7876,  3.01, '#aabfff'],
  ['EpsilonPer', 3.9644,  40.0103,  2.89, '#aabfff'],
  ['ZetaPer',    3.9020,  31.8836,  2.85, '#aabfff'],
  // Andromeda + Pegasus (Great Square)
  ['Alpheratz',  0.1398,  29.0905,  2.06, '#cdd9ff'],
  ['Mirach',     1.1622,  35.6206,  2.07, '#ff9e76'],
  ['Almach',     2.0650,  42.3297,  2.10, '#ffcf9e'],
  ['DeltaAnd',   0.6556,  30.8612,  3.27, '#ffcf9e'],
  ['Markab',    23.0793,  15.2053,  2.49, '#eef3ff'],
  ['Scheat',    23.0629,  28.0828,  2.42, '#ff9e76'],
  ['Algenib',    0.2206,  15.1836,  2.83, '#aabfff'],
  ['Enif',      21.7364,   9.8750,  2.39, '#ffcf9e'],
  // Aries
  ['Hamal',      2.1196,  23.4625,  2.00, '#ffcf9e'],
  ['Sheratan',   1.9105,  20.8080,  2.64, '#eef3ff'],
  // Leo
  ['Regulus',   10.1395,  11.9672,  1.36, '#cdd9ff'],
  ['Denebola',  11.8177,  14.5720,  2.11, '#eef3ff'],
  ['Algieba',   10.3329,  19.8415,  2.08, '#ffcf9e'],
  ['Zosma',     11.2351,  20.5237,  2.56, '#eef3ff'],
  ['EtaLeo',    10.1222,  16.7626,  3.48, '#eef3ff'],
  ['ThetaLeo',  11.2372,  15.4297,  3.33, '#eef3ff'],
  ['Adhafera',  10.2785,  23.4172,  3.43, '#f8f7ef'],
  ['EpsilonLeo', 9.7641,  23.7740,  2.97, '#fde6bd'],
  // Bootes + Corona Borealis
  ['Arcturus',  14.2611,  19.1825, -0.05, '#ffcf9e'],
  ['Izar',      14.7498,  27.0742,  2.37, '#ffcf9e'],
  ['Seginus',   14.5341,  38.3082,  3.03, '#eef3ff'],
  ['Nekkar',    15.0322,  40.3906,  3.49, '#fde6bd'],
  ['DeltaBoo',  15.2580,  33.3148,  3.47, '#fde6bd'],
  ['Muphrid',   13.9114,  18.3977,  2.68, '#fde6bd'],
  ['Alphecca',  15.5781,  26.7147,  2.22, '#eef3ff'],
  // Virgo + Corvus
  ['Spica',     13.4199, -11.1614,  0.97, '#aabfff'],
  ['Porrima',   12.6943,  -1.4494,  2.74, '#f8f7ef'],
  ['Vindemiatrix', 13.0362, 10.9591, 2.83, '#fde6bd'],
  ['GienahCrv', 12.2634, -17.5419,  2.59, '#aabfff'],
  ['Kraz',      12.5723, -23.3965,  2.65, '#fde6bd'],
  ['Algorab',   12.4979, -16.5151,  2.95, '#eef3ff'],
  ['EpsilonCrv', 12.1684, -22.6197, 3.02, '#ffcf9e'],
  ['Alphard',    9.4597,  -8.6586,  1.98, '#ffcf9e'],
  // Scorpius
  ['Antares',   16.4901, -26.4320,  0.96, '#ff9e76'],
  ['Shaula',    17.5601, -37.1038,  1.63, '#aabfff'],
  ['Sargas',    17.6219, -42.9978,  1.86, '#f8f7ef'],
  ['Dschubba',  16.0056, -22.6217,  2.29, '#aabfff'],
  ['Acrab',     16.0906, -19.8054,  2.50, '#aabfff'],
  ['PiSco',     15.9810, -26.1143,  2.89, '#aabfff'],
  ['TauSco',    16.5983, -28.2160,  2.82, '#aabfff'],
  ['EpsilonSco', 16.8361, -34.2933, 2.29, '#ffcf9e'],
  ['Lesath',    17.5121, -37.2958,  2.69, '#aabfff'],
  // Sagittarius (Teapot)
  ['KausAustralis', 18.4029, -34.3846, 1.85, '#cdd9ff'],
  ['Nunki',     18.9211, -26.2967,  2.05, '#aabfff'],
  ['Ascella',   19.0436, -29.8801,  2.60, '#eef3ff'],
  ['KausMedia', 18.3499, -29.8281,  2.70, '#ffcf9e'],
  ['KausBorealis', 18.4661, -25.4217, 2.81, '#ffcf9e'],
  ['PhiSgr',    18.7610, -26.9907,  3.17, '#aabfff'],
  ['Alnasl',    18.0966, -30.4239,  2.99, '#ffcf9e'],
  ['TauSgr',    19.1151, -27.6705,  3.32, '#ffcf9e'],
  // Lyra / Cygnus / Aquila (Summer Triangle)
  ['Vega',      18.6156,  38.7837,  0.03, '#eef3ff'],
  ['Sheliak',   18.8347,  33.3627,  3.52, '#aabfff'],
  ['Sulafat',   18.9824,  32.6896,  3.25, '#eef3ff'],
  ['Deneb',     20.6905,  45.2803,  1.25, '#eef3ff'],
  ['Sadr',      20.3705,  40.2567,  2.23, '#f8f7ef'],
  ['GienahCyg', 20.7704,  33.9703,  2.48, '#ffcf9e'],
  ['DeltaCyg',  19.7495,  45.1308,  2.87, '#eef3ff'],
  ['Albireo',   19.5121,  27.9597,  3.05, '#ffcf9e'],
  ['Altair',    19.8463,   8.8683,  0.77, '#eef3ff'],
  ['Tarazed',   19.7710,  10.6133,  2.72, '#ffcf9e'],
  ['Alshain',   19.9219,   6.4068,  3.71, '#fde6bd'],
  // Ophiuchus + Hercules anchors
  ['Rasalhague', 17.5822, 12.5600,  2.07, '#eef3ff'],
  ['Sabik',     17.1729, -15.7250,  2.43, '#eef3ff'],
  ['Cebalrai',  17.7243,   4.5673,  2.76, '#ffcf9e'],
  ['Kornephoros', 16.5036, 21.4896, 2.78, '#fde6bd'],
  // Lone bright southern star
  ['Fomalhaut', 22.9608, -29.6222,  1.16, '#eef3ff'],
];

/* ── Constellation asterism lines (keyed by star name) ────────────── */
const CONSTELLATIONS = [
  { name: 'Orion', lines: [['Betelgeuse','Bellatrix'],['Betelgeuse','Alnitak'],['Bellatrix','Mintaka'],['Mintaka','Alnilam'],['Alnilam','Alnitak'],['Alnitak','Saiph'],['Saiph','Rigel'],['Rigel','Mintaka'],['Betelgeuse','Meissa'],['Bellatrix','Meissa']] },
  { name: 'Canis Major', lines: [['Mirzam','Sirius'],['Sirius','Wezen'],['Wezen','Adhara'],['Adhara','Furud'],['Wezen','Aludra']] },
  { name: 'Canis Minor', lines: [['Procyon','Gomeisa']] },
  { name: 'Taurus', lines: [['ZetaTau','Aldebaran'],['Aldebaran','Elnath'],['Aldebaran','LambdaTau']] },
  { name: 'Gemini', lines: [['Castor','Pollux'],['Castor','Mebsuta'],['Mebsuta','Tejat'],['Tejat','Propus'],['Pollux','Wasat'],['Wasat','Alzirr'],['Wasat','Alhena']] },
  { name: 'Auriga', lines: [['Capella','Menkalinan'],['Menkalinan','Mahasim'],['Mahasim','Elnath'],['Elnath','Hassaleh'],['Hassaleh','Almaaz'],['Almaaz','Capella']] },
  { name: 'Big Dipper', lines: [['Dubhe','Merak'],['Merak','Phecda'],['Phecda','Megrez'],['Megrez','Dubhe'],['Megrez','Alioth'],['Alioth','Mizar'],['Mizar','Alkaid']] },
  { name: 'Little Dipper', lines: [['Kochab','Pherkad'],['Kochab','Polaris']] },
  { name: 'Cassiopeia', lines: [['Caph','Schedar'],['Schedar','Navi'],['Navi','Ruchbah'],['Ruchbah','Segin']] },
  { name: 'Perseus', lines: [['GammaPer','Mirfak'],['Mirfak','DeltaPer'],['DeltaPer','Algol'],['Algol','ZetaPer'],['DeltaPer','EpsilonPer']] },
  { name: 'Andromeda', lines: [['Alpheratz','DeltaAnd'],['DeltaAnd','Mirach'],['Mirach','Almach']] },
  { name: 'Pegasus', lines: [['Markab','Scheat'],['Scheat','Alpheratz'],['Alpheratz','Algenib'],['Algenib','Markab'],['Markab','Enif']] },
  { name: 'Aries', lines: [['Hamal','Sheratan']] },
  { name: 'Leo', lines: [['EpsilonLeo','Adhafera'],['Adhafera','Algieba'],['Algieba','EtaLeo'],['EtaLeo','Regulus'],['Algieba','Zosma'],['Zosma','Denebola'],['Denebola','ThetaLeo'],['ThetaLeo','Regulus']] },
  { name: 'Bootes', lines: [['Arcturus','Izar'],['Izar','Seginus'],['Seginus','Nekkar'],['Nekkar','DeltaBoo'],['DeltaBoo','Izar'],['Arcturus','Muphrid']] },
  { name: 'Virgo', lines: [['Spica','Porrima'],['Porrima','Vindemiatrix']] },
  { name: 'Corvus', lines: [['GienahCrv','Algorab'],['Algorab','Kraz'],['Kraz','EpsilonCrv'],['EpsilonCrv','GienahCrv']] },
  { name: 'Scorpius', lines: [['Acrab','Dschubba'],['Dschubba','PiSco'],['Dschubba','Antares'],['Antares','TauSco'],['TauSco','EpsilonSco'],['EpsilonSco','Sargas'],['Sargas','Shaula'],['Shaula','Lesath']] },
  { name: 'Sagittarius', lines: [['Alnasl','KausMedia'],['KausMedia','KausAustralis'],['KausMedia','KausBorealis'],['KausBorealis','PhiSgr'],['PhiSgr','Nunki'],['Nunki','TauSgr'],['TauSgr','Ascella'],['Ascella','KausAustralis'],['Ascella','PhiSgr']] },
  { name: 'Lyra', lines: [['Vega','Sheliak'],['Sheliak','Sulafat'],['Sulafat','Vega']] },
  { name: 'Cygnus', lines: [['Deneb','Sadr'],['Sadr','Albireo'],['DeltaCyg','Sadr'],['Sadr','GienahCyg']] },
  { name: 'Aquila', lines: [['Tarazed','Altair'],['Altair','Alshain']] },
];

/* Bright named stars worth labeling on the map (the famous ones). */
const STAR_LABELS = new Set(['Sirius','Arcturus','Vega','Capella','Rigel','Procyon','Betelgeuse','Altair','Aldebaran','Antares','Spica','Pollux','Fomalhaut','Deneb','Regulus','Castor','Polaris']);

/* ── Meteor showers (peak month-day) ──────────────────────────────── */
const METEOR_SHOWERS = [
  { name:'Quadrantids',    peak:'01-04', rate:80,  parent:'Asteroid 2003 EH1' },
  { name:'Lyrids',         peak:'04-22', rate:18,  parent:'Comet Thatcher' },
  { name:'Eta Aquariids',  peak:'05-06', rate:50,  parent:'Halley' },
  { name:'Delta Aquariids',peak:'07-30', rate:20,  parent:'Comet 96P/Machholz' },
  { name:'Perseids',       peak:'08-12', rate:100, parent:'Comet Swift-Tuttle' },
  { name:'Orionids',       peak:'10-21', rate:20,  parent:'Halley' },
  { name:'Leonids',        peak:'11-17', rate:15,  parent:'Comet Tempel-Tuttle' },
  { name:'Geminids',       peak:'12-14', rate:120, parent:'Asteroid Phaethon' },
  { name:'Ursids',         peak:'12-22', rate:10,  parent:'Comet Tuttle' },
];

/* ── Expose ──────────────────────────────────────────────────────── */
window.ASTRO = {
  DEG, RAD,
  julianDay, gmst, lst,
  eqToAltAz,
  sunRaDec, moonRaDec, moonPhase,
  sunEventLocal, moonEventLocal,
  planetRaDec,
  PLANET_INFO, STARS, CONSTELLATIONS, STAR_LABELS, METEOR_SHOWERS,
};
