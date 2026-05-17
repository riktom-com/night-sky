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

/* ── Star catalog (brightest visible from Georgia, J2000) ─────────── */
const STARS = [
  // [name, RA hours, Dec degrees, magnitude]
  ['Sirius',     6.7525,  -16.7161, -1.46],
  ['Arcturus',  14.2611,   19.1825, -0.05],
  ['Vega',      18.6156,   38.7837,  0.03],
  ['Capella',    5.2782,   45.9981,  0.08],
  ['Rigel',      5.2422,   -8.2017,  0.13],
  ['Procyon',    7.6550,    5.2250,  0.34],
  ['Betelgeuse', 5.9195,    7.4071,  0.50],
  ['Altair',    19.8463,    8.8683,  0.77],
  ['Aldebaran',  4.5987,   16.5093,  0.85],
  ['Antares',   16.4901,  -26.4320,  0.96],
  ['Spica',     13.4199,  -11.1614,  0.97],
  ['Pollux',     7.7553,   28.0262,  1.14],
  ['Fomalhaut', 22.9608,  -29.6222,  1.16],
  ['Deneb',     20.6905,   45.2803,  1.25],
  ['Regulus',   10.1395,   11.9672,  1.36],
  ['Castor',     7.5766,   31.8883,  1.58],
  ['Bellatrix',  5.4188,    6.3497,  1.64],
  ['Alnilam',    5.6036,   -1.2019,  1.69],
  ['Alnitak',    5.6793,   -1.9426,  1.70],
  ['Mintaka',    5.5334,   -0.2991,  2.23],
  ['Saiph',      5.7959,   -9.6696,  2.06],
  ['Polaris',    2.5303,   89.2641,  1.97],
  ['Mizar',     13.3987,   54.9254,  2.27],
  ['Dubhe',     11.0621,   61.7508,  1.79],
  ['Merak',     11.0307,   56.3824,  2.37],
  ['Phecda',    11.8972,   53.6948,  2.44],
  ['Megrez',    12.2571,   57.0326,  3.31],
  ['Alioth',    12.9004,   55.9598,  1.77],
  ['Alkaid',    13.7923,   49.3133,  1.86],
  ['Hamal',      2.1196,   23.4625,  2.00],
  ['Algol',      3.1361,   40.9557,  2.12],
  ['Schedar',    0.6751,   56.5373,  2.24],
  ['Caph',       0.1530,   59.1498,  2.28],
];

/* ── Constellation asterism lines (indices into STARS array) ──────── */
const CONSTELLATIONS = [
  { name: 'Big Dipper', lines: [[23,24],[24,25],[25,26],[26,27],[27,22],[22,28],[26,27]] },
  { name: 'Orion',      lines: [[6,16],[16,19],[19,18],[18,17],[17,20],[20,4]] },
];

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
  PLANET_INFO, STARS, CONSTELLATIONS, METEOR_SHOWERS,
};
