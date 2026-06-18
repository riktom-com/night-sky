'use strict';
/* ═══════════════════════════════════════════════════════════════════
   Georgia Night Sky Guide — main app
   ═══════════════════════════════════════════════════════════════════ */

/* ── Georgia Dark-Sky Locations (Bortle scale: 1=darkest, 9=urban) ── */
const LOCATIONS = [
  { id:'stephen-foster',  name:'Stephen C. Foster State Park',     county:'Charlton', lat:30.8295, lon:-82.3618, bortle:2, type:'darksky', note:'IDA-certified International Dark Sky Park in the Okefenokee Swamp — the darkest skies in Georgia.', amenities:['camping','remote','primitive'] },
  { id:'okefenokee-suwannee', name:'Okefenokee NWR — Suwannee Canal', county:'Charlton', lat:30.7409, lon:-82.1281, bortle:2, type:'darksky', note:'Eastern entrance to Okefenokee Swamp. Excellent dark sky access from the boat dock area.', amenities:['day-use','boardwalk','restrooms'] },
  { id:'cumberland-island', name:'Cumberland Island National Seashore', county:'Camden', lat:30.8530, lon:-81.4540, bortle:2, type:'darksky', note:'Pristine barrier island. Ferry-only access with virtually no light pollution.', amenities:['camping','ferry-required','primitive'] },
  { id:'black-rock-mtn',  name:'Black Rock Mountain State Park',   county:'Rabun', lat:34.9098, lon:-83.4116, bortle:2, type:'darksky', note:'Georgia\'s highest state park (3,640 ft). Cool summer nights, excellent transparency.', amenities:['camping','cabins','restrooms'] },
  { id:'tallulah-gorge',  name:'Tallulah Gorge State Park',        county:'Rabun', lat:34.7398, lon:-83.3934, bortle:3, type:'darksky', note:'Rim overlooks make great viewing platforms. North Georgia mountains shield from city light.', amenities:['camping','day-use','restrooms'] },
  { id:'cloudland-canyon',name:'Cloudland Canyon State Park',      county:'Dade', lat:34.8347, lon:-85.4926, bortle:3, type:'darksky', note:'Northwest Georgia. West Rim has dark views toward Tennessee.', amenities:['camping','cabins','restrooms'] },
  { id:'sapelo-island',   name:'Sapelo Island',                    county:'McIntosh', lat:31.4485, lon:-81.2700, bortle:3, type:'darksky', note:'Ferry-access barrier island. Coastal viewing with low horizon and Atlantic Ocean horizon to the east.', amenities:['ferry-required','camping','primitive'] },
  { id:'general-coffee',  name:'General Coffee State Park',        county:'Coffee', lat:31.5128, lon:-82.8137, bortle:3, type:'darksky', note:'Quiet South Georgia state park with good open-field viewing.', amenities:['camping','cabins','restrooms'] },
  { id:'reed-bingham',    name:'Reed Bingham State Park',          county:'Cook', lat:31.1620, lon:-83.5500, bortle:4, type:'darksky', note:'Lake Alapaha shoreline gives clear southern horizon. Closest dark-sky spot to Hahira/Valdosta.', amenities:['camping','day-use','restrooms'] },
  { id:'banks-lake',      name:'Banks Lake NWR',                   county:'Lanier', lat:31.0831, lon:-83.0278, bortle:4, type:'darksky', note:'Federal refuge — excellent for both fishing and stargazing in one trip.', amenities:['day-use','boat-ramp'] },
  { id:'hahira',          name:'Hahira (Home Base)',               county:'Lowndes', lat:30.9921, lon:-83.3724, bortle:5, type:'town', note:'Suburban Bortle 5 sky. Bright planets and brightest stars visible; need to drive out for deep-sky.', amenities:['everything'] },
  { id:'valdosta',        name:'Valdosta',                         county:'Lowndes', lat:30.8327, lon:-83.2785, bortle:6, type:'town', note:'Urban skies. Plan to drive 20–30 minutes east toward Lakeland or south toward Hahira for darker views.', amenities:['everything'] },
];

/* ── State ─────────────────────────────────────────────────────────── */
const S = {
  loc:        LOCATIONS[0],
  mode:       'sky',           // 'sky' | 'fish' | 'camp'
  now:        new Date(),
  weather:    null,            // NWS hourly forecast
  alerts:     [],
  cloudPct:   null,
  scoreData:  null,
};

/* ── Init ──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  buildLocSelect();
  document.getElementById('loc-select').addEventListener('change', e => setLocation(e.target.value));
  document.getElementById('gps-btn').addEventListener('click', useGPS);
  document.getElementById('refresh-btn').addEventListener('click', () => loadAll());
  document.querySelectorAll('.mode-btn').forEach(b =>
    b.addEventListener('click', () => setMode(b.dataset.mode)));

  // Restore last used location
  const last = localStorage.getItem('sky_last_loc');
  if (last && LOCATIONS.find(l => l.id === last)) {
    S.loc = LOCATIONS.find(l => l.id === last);
    document.getElementById('loc-select').value = last;
  }

  loadAll();
  setupSkyControls();
  // Refresh sky map every minute, full data every 10 minutes
  setInterval(() => { S.now = new Date(); renderAll(); }, 60_000);
  setInterval(() => loadAll(), 10 * 60 * 1000);
});

function buildLocSelect() {
  const sel = document.getElementById('loc-select');
  sel.innerHTML = '';
  const og1 = document.createElement('optgroup'); og1.label = '✨ Dark Sky Locations';
  LOCATIONS.filter(l => l.type === 'darksky').forEach(l => og1.appendChild(opt(l)));
  const og2 = document.createElement('optgroup'); og2.label = '🏘️ Towns (More Light)';
  LOCATIONS.filter(l => l.type === 'town').forEach(l => og2.appendChild(opt(l)));
  sel.appendChild(og1); sel.appendChild(og2);
  sel.value = S.loc.id;
}
function opt(l) {
  const o = document.createElement('option');
  o.value = l.id;
  o.textContent = `${l.name} (Bortle ${l.bortle})`;
  return o;
}

function setLocation(id) {
  const l = LOCATIONS.find(x => x.id === id);
  if (!l) return;
  S.loc = l;
  localStorage.setItem('sky_last_loc', id);
  loadAll();
}

function setMode(m) {
  S.mode = m;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
  renderAll();
}

function useGPS() {
  if (!navigator.geolocation) { toast('GPS not available in this browser.'); return; }
  toast('📍 Getting your location...');
  navigator.geolocation.getCurrentPosition(pos => {
    S.loc = {
      id: 'gps', name: 'My GPS Location', county: 'Current Position',
      lat: pos.coords.latitude, lon: pos.coords.longitude,
      bortle: 5, type: 'gps',
      note: 'Bortle class estimated as 5 (suburban). Move to a designated dark-sky site for better viewing.',
      amenities: [],
    };
    document.getElementById('loc-select').value = '';
    loadAll();
  }, err => toast('GPS error: ' + err.message));
}

/* ── Data loading ─────────────────────────────────────────────────── */
async function loadAll() {
  S.now = new Date();
  showSkeletons();
  await fetchWeather();
  renderAll();
}

async function fetchWeather() {
  try {
    const pt = await (await fetch(`https://api.weather.gov/points/${S.loc.lat},${S.loc.lon}`)).json();
    const props = pt.properties;
    const [fcHourly, alertsRes] = await Promise.all([
      fetch(props.forecastHourly),
      fetch(`https://api.weather.gov/alerts/active?point=${S.loc.lat},${S.loc.lon}`),
    ]);
    if (fcHourly.ok) S.weather = (await fcHourly.json()).properties;
    if (alertsRes.ok) S.alerts = (await alertsRes.json()).features || [];

    // Extract tonight's cloud cover from hourly forecast (sunset → midnight period)
    if (S.weather?.periods) {
      const tonightSun = ASTRO.sunEventLocal(S.now, S.loc.lat, S.loc.lon, -0.83);
      const sunsetTime = tonightSun.set?.getTime();
      const nightPeriods = S.weather.periods.filter(p => {
        const t = new Date(p.startTime).getTime();
        if (!sunsetTime) return false;
        return t >= sunsetTime && t <= sunsetTime + 6 * 3600_000; // 6 hours after sunset
      });
      if (nightPeriods.length) {
        // NWS doesn't always include cloudCover in hourly. Estimate from shortForecast.
        let cloudSum = 0, n = 0;
        for (const p of nightPeriods) {
          const c = estimateCloudFromForecast(p.shortForecast);
          if (c !== null) { cloudSum += c; n++; }
        }
        S.cloudPct = n ? Math.round(cloudSum / n) : null;
      }
    }
  } catch {
    S.weather = null; S.alerts = []; S.cloudPct = null;
  }
}

function estimateCloudFromForecast(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('clear'))                return 5;
  if (t.includes('mostly clear'))         return 15;
  if (t.includes('mostly sunny'))         return 20;
  if (t.includes('sunny'))                return 10;
  if (t.includes('partly sunny'))         return 50;
  if (t.includes('partly cloudy'))        return 50;
  if (t.includes('mostly cloudy'))        return 80;
  if (t.includes('cloudy'))               return 90;
  if (t.includes('overcast'))             return 95;
  if (t.includes('rain') || t.includes('shower') || t.includes('storm')) return 90;
  if (t.includes('fog') || t.includes('haze')) return 70;
  return null;
}

/* ── Score calculations (mode-specific) ───────────────────────────── */
function computeScore() {
  // Use a representative observing time: 1 hour after sunset, or now if already night.
  const sun = ASTRO.sunEventLocal(S.now, S.loc.lat, S.loc.lon, -0.83);
  const evalTime = sun.set ? new Date(sun.set.getTime() + 60 * 60_000) : S.now;
  const jd = ASTRO.julianDay(evalTime);
  const moonRD = ASTRO.moonRaDec(jd);
  const moonAA = ASTRO.eqToAltAz(moonRD.ra, moonRD.dec, S.loc.lat, ASTRO.lst(jd, S.loc.lon));
  const ph = ASTRO.moonPhase(jd);

  if (S.mode === 'sky') return scoreSky(ph, moonAA);
  if (S.mode === 'fish') return scoreFish(ph, moonAA);
  return scoreCamp();
}

function scoreSky(ph, moonAA) {
  let s = 50;
  const f = [];

  // Cloud cover (dominant factor)
  if (S.cloudPct !== null) {
    if (S.cloudPct <= 20)      { s += 25; f.push({ icon:'🌌', text:`Clear tonight (${S.cloudPct}% clouds)`,    impact:+25 }); }
    else if (S.cloudPct <= 50) { s += 5;  f.push({ icon:'⛅', text:`Partial clouds (${S.cloudPct}%)`,           impact:+5  }); }
    else if (S.cloudPct <= 80) { s -= 20; f.push({ icon:'☁️', text:`Mostly cloudy (${S.cloudPct}%)`,            impact:-20 }); }
    else                       { s -= 35; f.push({ icon:'☁️', text:`Overcast (${S.cloudPct}%) — sky obscured`, impact:-35 }); }
  } else                       {           f.push({ icon:'❓', text:'Cloud forecast unavailable',               impact:0   }); }

  // Moon brightness
  if (moonAA.alt > 0) {
    if (ph.illum > 80)         { s -= 25; f.push({ icon:'🌕', text:`Bright moon up (${Math.round(ph.illum)}%) — washes sky`, impact:-25 }); }
    else if (ph.illum > 40)    { s -= 10; f.push({ icon:'🌗', text:`Moderate moon up (${Math.round(ph.illum)}%)`,             impact:-10 }); }
    else                       {           f.push({ icon:ph.icon, text:`${ph.name} up (${Math.round(ph.illum)}%)`,            impact:0   }); }
  } else                       { s += 15; f.push({ icon:'🌑', text:'Moon below horizon — dark sky!',                          impact:+15 }); }

  // Light pollution
  const b = S.loc.bortle;
  if (b <= 2)      { s += 20; f.push({ icon:'✨', text:`Excellent dark site (Bortle ${b})`, impact:+20 }); }
  else if (b <= 4) { s += 5;  f.push({ icon:'🌃', text:`Rural sky (Bortle ${b})`,            impact:+5  }); }
  else if (b <= 6) { s -= 10; f.push({ icon:'🏘️', text:`Suburban light pollution (Bortle ${b})`, impact:-10 }); }
  else             { s -= 25; f.push({ icon:'🏙️', text:`Urban sky (Bortle ${b}) — only bright objects visible`, impact:-25 }); }

  s = Math.max(0, Math.min(100, Math.round(s)));
  return packageScore(s, f, 'Skywatching');
}

function scoreFish(ph, moonAA) {
  let s = 55;
  const f = [];

  // Solunar — night fishing benefits from major periods near dusk
  const jd = ASTRO.julianDay(S.now);
  const moonNow = ASTRO.eqToAltAz(ASTRO.moonRaDec(jd).ra, ASTRO.moonRaDec(jd).dec, S.loc.lat, ASTRO.lst(jd, S.loc.lon));

  // Moon position — full or new moon strong for night fishing
  if (ph.illum > 80) { s += 20; f.push({ icon:'🌕', text:'Full moon — peak feeding activity',     impact:+20 }); }
  else if (ph.illum < 15) { s += 15; f.push({ icon:'🌑', text:'New moon — major feeding period', impact:+15 }); }
  else if (ph.illum > 40 && ph.illum < 60) { s -= 5; f.push({ icon:'🌗', text:'Quarter moon — slower bite', impact:-5 }); }

  if (moonAA.alt > 30) { s += 10; f.push({ icon:'🎣', text:'Moon high in sky — active feeding',  impact:+10 }); }

  // Weather
  if (S.cloudPct !== null) {
    if (S.cloudPct >= 40 && S.cloudPct <= 80) { s += 5; f.push({ icon:'⛅', text:'Overcast — fish active',     impact:+5  }); }
  }

  // Severe alerts kill it
  if (S.alerts.some(a => /Tornado|Severe Thunderstorm|Flash Flood/.test(a.properties.event))) {
    s -= 50; f.push({ icon:'⚠️', text:'Severe weather alert — stay home', impact:-50 });
  }

  // Wind from NWS first period
  if (S.weather?.periods?.[0]) {
    const w = S.weather.periods[0].windSpeed || '';
    const wmax = Math.max(...(w.match(/\d+/g)?.map(Number) || [0]));
    if (wmax > 20) { s -= 10; f.push({ icon:'💨', text:`Windy: ${w} — rough water`, impact:-10 }); }
    else if (wmax < 8) { s += 5; f.push({ icon:'🍃', text:`Calm winds: ${w}`,         impact:+5  }); }
  }

  s = Math.max(0, Math.min(100, Math.round(s)));
  return packageScore(s, f, 'Night Fishing');
}

function scoreCamp() {
  let s = 60;
  const f = [];

  if (!S.weather?.periods?.length) { f.push({ icon:'❓', text:'Weather unavailable', impact:0 }); }
  else {
    // Find tonight's overnight period
    const tonight = S.weather.periods.find(p => /night|tonight/i.test(p.name)) || S.weather.periods[1] || S.weather.periods[0];
    const lowTemp = tonight.temperature ?? 65;
    const precip  = tonight.probabilityOfPrecipitation?.value ?? 0;
    const wind    = (tonight.windSpeed || '').match(/\d+/g)?.map(Number) || [0];
    const wmax    = Math.max(...wind);

    if (precip > 50) { s -= 35; f.push({ icon:'🌧️', text:`Rain likely (${precip}%) — bad for campfire`, impact:-35 }); }
    else if (precip > 20) { s -= 10; f.push({ icon:'🌦️', text:`Some rain risk (${precip}%)`,             impact:-10 }); }
    else { s += 5; f.push({ icon:'☀️', text:'Dry tonight',                                                 impact:+5  }); }

    if (wmax > 15) { s -= 15; f.push({ icon:'💨', text:`High winds ${tonight.windSpeed} — fire hazard`, impact:-15 }); }
    else if (wmax < 8) { s += 10; f.push({ icon:'🍃', text:`Calm: ${tonight.windSpeed}`,                impact:+10 }); }

    if (lowTemp >= 50 && lowTemp <= 75) { s += 10; f.push({ icon:'🌡️', text:`Comfortable low: ${lowTemp}°F`, impact:+10 }); }
    else if (lowTemp < 35)              { s -= 10; f.push({ icon:'🥶', text:`Cold: ${lowTemp}°F low`,         impact:-10 }); }
    else if (lowTemp > 85)              { s -= 10; f.push({ icon:'🥵', text:`Hot: ${lowTemp}°F low`,          impact:-10 }); }
  }

  // Fire danger alerts
  if (S.alerts.some(a => /Red Flag|Fire Weather/.test(a.properties.event))) {
    s -= 40; f.push({ icon:'🔥', text:'Red Flag / Fire Weather — no campfire allowed', impact:-40 });
  }

  s = Math.max(0, Math.min(100, Math.round(s)));
  return packageScore(s, f, 'Campfire Night');
}

function packageScore(value, factors, modeName) {
  let label, color, emoji, subtitle;
  if      (value >= 82) { label='EXCELLENT'; color='#43a047'; emoji='✨'; subtitle = `Top conditions for ${modeName}`; }
  else if (value >= 65) { label='GOOD';      color='#7cb342'; emoji='👍'; subtitle = `Good ${modeName} night`; }
  else if (value >= 50) { label='FAIR';      color='#fdd835'; emoji='⚡'; subtitle = `Marginal ${modeName} conditions`; }
  else if (value >= 35) { label='POOR';      color='#fb8c00'; emoji='⚠️'; subtitle = `Poor for ${modeName}`; }
  else                  { label='STAY IN';   color='#e53935'; emoji='❌'; subtitle = `Not a ${modeName} night`; }
  return { value, label, color, emoji, subtitle, factors, modeName };
}

/* ── Render ────────────────────────────────────────────────────────── */
function renderAll() {
  updateLocHeader();
  S.scoreData = computeScore();
  renderScore();
  renderSchedule();
  renderMoon();
  renderWeather();
  renderPlanets();
  renderSkyMap();
  renderMeteors();
  renderDarkSky();
  document.getElementById('last-updated').textContent =
    `Updated ${new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}`;
}

function updateLocHeader() {
  document.getElementById('loc-name').textContent = S.loc.name;
  const date = S.now.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  document.getElementById('loc-meta').innerHTML =
    `${esc(S.loc.county)} County · Bortle ${S.loc.bortle} · ${date}`;
}

function renderScore() {
  const el = document.getElementById('score-card');
  const s  = S.scoreData;
  el.innerHTML = `
    <div class="card-title">${({'sky':'🔭','fish':'🎣','camp':'🔥'})[S.mode]} ${esc(s.modeName)} Tonight</div>
    <div class="score-hero">
      <div class="score-ring" style="border-color:${s.color};color:${s.color}">${s.value}</div>
      <div>
        <div class="score-label" style="color:${s.color}">${s.emoji} ${s.label}</div>
        <div class="score-sub">${esc(s.subtitle)}</div>
      </div>
    </div>
    <div class="factors">
      ${s.factors.slice(0,6).map(f => `
        <div class="factor ${f.impact > 0 ? 'pos' : f.impact < 0 ? 'neg' : ''}">
          <span class="f-icon">${f.icon}</span>
          <span class="f-text">${esc(f.text)}</span>
          <span class="f-impact">${f.impact > 0 ? '+' : ''}${f.impact !== 0 ? f.impact : ''}</span>
        </div>`).join('')}
    </div>`;
}

function fmtTime(d) {
  if (!d) return '—';
  return d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
}

function renderSchedule() {
  const el  = document.getElementById('schedule-card');
  const lat = S.loc.lat, lon = S.loc.lon;
  const civil = ASTRO.sunEventLocal(S.now, lat, lon, -6);
  const naut  = ASTRO.sunEventLocal(S.now, lat, lon, -12);
  const astro = ASTRO.sunEventLocal(S.now, lat, lon, -18);
  const sun   = ASTRO.sunEventLocal(S.now, lat, lon, -0.83);
  const moon  = ASTRO.moonEventLocal(S.now, lat, lon);

  el.innerHTML = `
    <div class="card-title">🌅 Tonight's Schedule</div>
    <div class="sched-grid">
      <div class="sched-row"><span>☀️ Sunset</span>          <span>${fmtTime(sun.set)}</span></div>
      <div class="sched-row"><span>🌆 Civil twilight ends</span> <span>${fmtTime(civil.set)}</span></div>
      <div class="sched-row"><span>🌃 Nautical twilight ends</span><span>${fmtTime(naut.set)}</span></div>
      <div class="sched-row hl"><span>🌌 <strong>Astronomical dark</strong></span><span><strong>${fmtTime(astro.set)}</strong></span></div>
      <div class="sched-row"><span>🌙 Moonrise</span>          <span>${fmtTime(moon.rise)}</span></div>
      <div class="sched-row"><span>🌙 Moonset</span>           <span>${fmtTime(moon.set)}</span></div>
      <div class="sched-row"><span>🌌 Dawn begins (astro.)</span><span>${fmtTime(astro.rise)}</span></div>
      <div class="sched-row"><span>☀️ Sunrise</span>          <span>${fmtTime(sun.rise)}</span></div>
    </div>`;
}

function renderMoon() {
  const el = document.getElementById('moon-card');
  const jd = ASTRO.julianDay(S.now);
  const ph = ASTRO.moonPhase(jd);
  const rd = ASTRO.moonRaDec(jd);
  const aa = ASTRO.eqToAltAz(rd.ra, rd.dec, S.loc.lat, ASTRO.lst(jd, S.loc.lon));
  el.innerHTML = `
    <div class="card-title">🌙 Moon</div>
    <div class="moon-main">
      <div class="moon-icon">${ph.icon}</div>
      <div>
        <div class="moon-name">${ph.name}</div>
        <div class="moon-illum">${Math.round(ph.illum)}% illuminated</div>
        <div class="moon-pos">${aa.alt > 0 ? `Above horizon · ${Math.round(aa.alt)}° altitude` : 'Below horizon'}</div>
      </div>
    </div>`;
}

function renderWeather() {
  const el = document.getElementById('weather-card');
  if (!S.weather?.periods?.length) {
    el.innerHTML = `<div class="card-title">🌤️ Weather</div><p class="muted">Forecast unavailable.</p>`;
    return;
  }
  const tonight = S.weather.periods.find(p => /night|tonight/i.test(p.name)) || S.weather.periods[1] || S.weather.periods[0];
  el.innerHTML = `
    <div class="card-title">🌤️ Tonight's Weather</div>
    <div class="wx-temp">${tonight.temperature}°F low</div>
    <div class="wx-desc">${esc(tonight.shortForecast)}</div>
    <div class="wx-row"><span>💨 Wind</span><span>${esc(tonight.windDirection || '')} ${esc(tonight.windSpeed || '—')}</span></div>
    <div class="wx-row"><span>🌧️ Precip</span><span>${tonight.probabilityOfPrecipitation?.value ?? '—'}%</span></div>
    ${S.cloudPct !== null ? `<div class="wx-row"><span>☁️ Cloud cover</span><span>${S.cloudPct}%</span></div>` : ''}`;
}

function renderPlanets() {
  const el = document.getElementById('planets-card');
  const jd = ASTRO.julianDay(S.now);
  const sun = ASTRO.sunRaDec(jd);
  const sunAA = ASTRO.eqToAltAz(sun.ra, sun.dec, S.loc.lat, ASTRO.lst(jd, S.loc.lon));
  const isDarkNow = sunAA.alt < -6;

  // Evaluate planets at a representative night time
  const evalT  = isDarkNow ? S.now : new Date(S.now.getTime() + (sunAA.alt > 0 ? 9 : 1) * 3600_000);
  const ejd    = ASTRO.julianDay(evalT);
  const elst   = ASTRO.lst(ejd, S.loc.lon);
  const planets = ['mercury','venus','mars','jupiter','saturn'].map(name => {
    const rd = ASTRO.planetRaDec(name, ejd);
    const aa = ASTRO.eqToAltAz(rd.ra, rd.dec, S.loc.lat, elst);
    return { name, alt: aa.alt, az: aa.az, info: ASTRO.PLANET_INFO[name] };
  });
  const visible = planets.filter(p => p.alt > 5);

  el.innerHTML = `
    <div class="card-title">🪐 Planets Tonight</div>
    ${visible.length === 0
      ? `<p class="muted">No bright planets above horizon tonight at ${fmtTime(evalT)}.</p>`
      : `<div class="planet-list">${visible.map(p => `
          <div class="planet-row">
            <span class="planet-dot" style="background:${p.info.color}">${p.info.symbol}</span>
            <span class="planet-name">${p.info.name}</span>
            <span class="planet-pos">${Math.round(p.alt)}° alt · ${compass(p.az)}</span>
          </div>`).join('')}
        </div>
        <div class="muted small">Positions at ${fmtTime(evalT)}</div>`
    }`;
}

function compass(az) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(az / 22.5) % 16];
}

function renderMeteors() {
  const el = document.getElementById('meteors-card');
  const now = S.now;
  const year = now.getFullYear();
  // Build list of upcoming peaks (look ahead one year)
  const upcoming = ASTRO.METEOR_SHOWERS.map(sh => {
    const [m, d] = sh.peak.split('-').map(Number);
    let peakDate = new Date(year, m - 1, d, 22, 0); // 10 PM local on peak night
    if (peakDate < now) peakDate = new Date(year + 1, m - 1, d, 22, 0);
    return { ...sh, peakDate, daysAway: Math.ceil((peakDate - now) / 86400000) };
  }).sort((a, b) => a.peakDate - b.peakDate).slice(0, 4);

  el.innerHTML = `
    <div class="card-title">☄️ Upcoming Meteor Showers</div>
    <div class="meteor-grid">
      ${upcoming.map(s => `
        <div class="meteor-row">
          <div class="meteor-name">${esc(s.name)}</div>
          <div class="meteor-peak">${s.peakDate.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}</div>
          <div class="meteor-stats">${s.rate}/hr peak · ${s.daysAway === 0 ? 'Tonight!' : s.daysAway === 1 ? 'Tomorrow' : `in ${s.daysAway} days`}</div>
          <div class="meteor-parent muted small">Parent: ${esc(s.parent)}</div>
        </div>`).join('')}
    </div>`;
}

function renderDarkSky() {
  const el = document.getElementById('darksky-card');
  const sorted = LOCATIONS.filter(l => l.type === 'darksky')
    .map(l => ({ ...l, dist: haversine(S.loc.lat, S.loc.lon, l.lat, l.lon) }))
    .sort((a, b) => a.dist - b.dist);
  el.innerHTML = `
    <div class="card-title">🗺️ Georgia Dark-Sky Locations Near You</div>
    <div class="darksky-grid">
      ${sorted.slice(0, 6).map(l => `
        <div class="darksky-row" onclick="setLocation('${l.id}')">
          <div class="darksky-head">
            <span class="bortle-pill b${l.bortle}">Bortle ${l.bortle}</span>
            <span class="darksky-name">${esc(l.name)}</span>
          </div>
          <div class="darksky-meta">${esc(l.county)} County · ${Math.round(l.dist)} mi away</div>
          <div class="darksky-note">${esc(l.note)}</div>
        </div>`).join('')}
    </div>`;
}

function haversine(lat1, lon1, lat2, lon2) {
  const toR = x => x * Math.PI / 180;
  const R = 3959; // miles
  const dLat = toR(lat2 - lat1), dLon = toR(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toR(lat1))*Math.cos(toR(lat2))*Math.sin(dLon/2)**2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ── Sky map (canvas) ─────────────────────────────────────────────── */
let skyMode = 'now';        // 'now' | 'tonight'
let skyHits = [];           // [{x,y,r,label,sub}] for tap-to-identify

function skyTonightTime() {
  const lat = S.loc.lat, lon = S.loc.lon;
  const astro = ASTRO.sunEventLocal(S.now, lat, lon, -18);
  if (astro.set) return astro.set;
  const naut = ASTRO.sunEventLocal(S.now, lat, lon, -12);
  if (naut.set) return naut.set;
  const sun = ASTRO.sunEventLocal(S.now, lat, lon, -0.83);
  if (sun.set) return new Date(sun.set.getTime() + 90 * 60000);
  return S.now;
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(f, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function altAzStr(alt, az) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  const d = dirs[Math.round(((az % 360) / 45)) % 8];
  return `${Math.round(alt)}° up · ${d}`;
}

function renderSkyMap() {
  const cv = document.getElementById('skymap');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const wrap = cv.parentElement;
  // Display size is driven by CSS (width:100% + aspect-ratio:1/1); we only set the
  // backing store. Reading clientWidth (not an inline px width) avoids a feedback loop.
  const W = Math.round(cv.clientWidth || wrap.clientWidth);
  const H = W;   // square dome
  if (!W) return;
  cv.width = W * devicePixelRatio;
  cv.height = H * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const tip = document.getElementById('sky-tooltip');
  if (tip) tip.hidden = true;

  const cx = W / 2, cy = H / 2;
  const R = Math.min(W, H) / 2 - 22;

  const mapTime = (skyMode === 'tonight') ? skyTonightTime() : S.now;
  const jd = ASTRO.julianDay(mapTime);
  const lstHr = ASTRO.lst(jd, S.loc.lon);
  const sunRD = ASTRO.sunRaDec(jd);
  const sunAA = ASTRO.eqToAltAz(sunRD.ra, sunRD.dec, S.loc.lat, lstHr);
  const sunAlt = sunAA.alt;
  const isTwi = sunAlt <= -0.83 && sunAlt > -18;

  const dayNote = document.getElementById('sky-daynote');
  if (dayNote) dayNote.hidden = !(skyMode === 'now' && sunAlt > 0);

  // Background: darkness scales with how far the Sun is below the horizon
  const dark = Math.max(0, Math.min(1, (-sunAlt) / 12));
  const mix = (a, b, t) => [0,1,2].map(i => Math.round(a[i] + (b[i] - a[i]) * t));
  const cen = mix([126,168,214], [10,20,40], dark);
  const edg = mix([150,186,224], [2,6,17], dark);
  const bg = ctx.createRadialGradient(cx, cy, R * 0.25, cx, cy, R);
  bg.addColorStop(0, `rgb(${cen[0]},${cen[1]},${cen[2]})`);
  bg.addColorStop(1, `rgb(${edg[0]},${edg[1]},${edg[2]})`);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  if (isTwi) {
    const glow = Math.max(0, 1 - (-sunAlt) / 18);
    const ga = sunAA.az * Math.PI / 180;
    const gx = cx - R * Math.sin(ga) * 0.96, gy = cy - R * Math.cos(ga) * 0.96;
    const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 0.9);
    gg.addColorStop(0, `rgba(255,150,60,${0.30 * glow})`);
    gg.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gg; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  const project = (alt, az) => {
    if (alt < 0) return null;
    const r = (90 - alt) / 90 * R;
    const a = az * Math.PI / 180;
    return { x: cx - r * Math.sin(a), y: cy - r * Math.cos(a) };
  };

  // Grid + cardinal letters + azimuth ticks
  ctx.strokeStyle = 'rgba(90,143,191,0.16)'; ctx.lineWidth = 1;
  [60, 30].forEach(a => { const r = (90 - a) / 90 * R; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); });
  ctx.strokeStyle = 'rgba(90,143,191,0.32)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(90,143,191,0.30)'; ctx.lineWidth = 1;
  for (let az = 0; az < 360; az += 30) {
    const a = az * Math.PI / 180, len = (az % 90 === 0) ? 10 : 6;
    ctx.beginPath();
    ctx.moveTo(cx - R * Math.sin(a), cy - R * Math.cos(a));
    ctx.lineTo(cx - (R - len) * Math.sin(a), cy - (R - len) * Math.cos(a));
    ctx.stroke();
  }
  ctx.fillStyle = '#7fb0df'; ctx.font = 'bold 14px -apple-system, system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - R - 11);
  ctx.fillText('S', cx, cy + R + 12);
  ctx.fillText('E', cx - R - 12, cy);
  ctx.fillText('W', cx + R + 12, cy);

  skyHits = [];
  const star = ASTRO.STARS.map(([name, ra, dec, mag, color]) => {
    const aa = ASTRO.eqToAltAz(ra, dec, S.loc.lat, lstHr);
    return { name, mag, color: color || '#ffffff', alt: aa.alt, az: aa.az, p: project(aa.alt, aa.az) };
  });
  const byName = {}; star.forEach(s => { byName[s.name] = s; });

  // Constellation lines + name at centroid
  ctx.strokeStyle = `rgba(130,180,240,${0.12 + 0.20 * dark})`; ctx.lineWidth = 1;
  ASTRO.CONSTELLATIONS.forEach(con => {
    con.lines.forEach(([a, b]) => {
      const A = byName[a], B = byName[b];
      if (A && B && A.p && B.p) { ctx.beginPath(); ctx.moveTo(A.p.x, A.p.y); ctx.lineTo(B.p.x, B.p.y); ctx.stroke(); }
    });
    const pts = [...new Set(con.lines.flat())].map(n => byName[n]).filter(s => s && s.p);
    if (pts.length >= 2) {
      const mx = pts.reduce((s, p) => s + p.p.x, 0) / pts.length;
      const my = pts.reduce((s, p) => s + p.p.y, 0) / pts.length;
      ctx.fillStyle = `rgba(150,185,230,${0.05 + 0.40 * dark})`;
      ctx.font = '10px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(con.name.toUpperCase(), mx, my);
    }
  });

  // Stars
  const starDim = sunAlt > 0 ? 0.45 : 1;
  star.forEach(s => {
    if (!s.p) return;
    const size = Math.max(1.1, 4.4 - s.mag * 0.9);
    if (s.mag < 1.6) {
      const g = ctx.createRadialGradient(s.p.x, s.p.y, 0, s.p.x, s.p.y, size * 3.2);
      g.addColorStop(0, hexA(s.color, 0.5 * starDim)); g.addColorStop(1, hexA(s.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.p.x, s.p.y, size * 3.2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = Math.max(0.3, 1 - s.mag * 0.14) * starDim;
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(s.p.x, s.p.y, size, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    skyHits.push({ x: s.p.x, y: s.p.y, r: Math.max(8, size + 5), label: s.name, sub: altAzStr(s.alt, s.az) });
    if (ASTRO.STAR_LABELS.has(s.name)) {
      ctx.fillStyle = `rgba(210,226,255,${0.45 + 0.45 * starDim})`;
      ctx.font = '10px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(s.name, s.p.x + size + 4, s.p.y);
    }
  });

  // Planets
  ['mercury','venus','mars','jupiter','saturn'].forEach(name => {
    const rd = ASTRO.planetRaDec(name, jd);
    const aa = ASTRO.eqToAltAz(rd.ra, rd.dec, S.loc.lat, lstHr);
    const p = project(aa.alt, aa.az); if (!p) return;
    const info = ASTRO.PLANET_INFO[name];
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 11);
    g.addColorStop(0, hexA(info.color, 0.55)); g.addColorStop(1, hexA(info.color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = info.color; ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe082'; ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(info.name, p.x + 8, p.y);
    skyHits.push({ x: p.x, y: p.y, r: 12, label: info.name, sub: altAzStr(aa.alt, aa.az) });
  });

  // Moon (with phase)
  const moonRD = ASTRO.moonRaDec(jd);
  const moonAA = ASTRO.eqToAltAz(moonRD.ra, moonRD.dec, S.loc.lat, lstHr);
  const mp = project(moonAA.alt, moonAA.az);
  if (mp) {
    const ph = ASTRO.moonPhase(jd);
    ctx.fillStyle = '#fff8e1'; ctx.beginPath(); ctx.arc(mp.x, mp.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(8,14,28,0.92)';
    const k = (1 - 2 * ph.illum / 100);
    ctx.beginPath(); ctx.ellipse(mp.x, mp.y, 9 * Math.abs(k), 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffeb3b'; ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Moon', mp.x + 12, mp.y);
    skyHits.push({ x: mp.x, y: mp.y, r: 12, label: `Moon · ${ph.illum}% lit`, sub: altAzStr(moonAA.alt, moonAA.az) });
  }

  // Sun (only when above the horizon)
  const sp = project(sunAA.alt, sunAA.az);
  if (sp) {
    const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, 18);
    g.addColorStop(0, 'rgba(255,213,79,0.85)'); g.addColorStop(1, 'rgba(255,213,79,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sp.x, sp.y, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(sp.x, sp.y, 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff9800'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#5b4a00'; ctx.font = 'bold 11px -apple-system, system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('Sun', sp.x + 12, sp.y);
    skyHits.push({ x: sp.x, y: sp.y, r: 14, label: 'Sun', sub: altAzStr(sunAA.alt, sunAA.az) });
  }
}

function setupSkyControls() {
  document.querySelectorAll('[data-skymode]').forEach(b => {
    b.addEventListener('click', () => {
      skyMode = b.dataset.skymode;
      document.querySelectorAll('.sky-mode').forEach(x => x.classList.toggle('active', x.dataset.skymode === skyMode));
      renderSkyMap();
    });
  });
  const cv = document.getElementById('skymap');
  if (cv) cv.addEventListener('click', onSkyTap);
}

function onSkyTap(e) {
  const cv = e.currentTarget, tip = document.getElementById('sky-tooltip');
  if (!tip) return;
  const rect = cv.getBoundingClientRect();
  const x = e.clientX - rect.left, y = e.clientY - rect.top;
  let best = null, bestD = Infinity;
  skyHits.forEach(h => {
    const d = Math.hypot(h.x - x, h.y - y);
    if (d <= h.r && d < bestD) { best = h; bestD = d; }
  });
  if (best) {
    tip.innerHTML = `<b>${best.label}</b><br>${best.sub}`;
    tip.style.left = best.x + 'px';
    tip.style.top = best.y + 'px';
    tip.hidden = false;
  } else {
    tip.hidden = true;
  }
}

/* ── Utilities ──────────────────────────────────────────────────── */
function showSkeletons() {
  ['score-card','schedule-card','moon-card','weather-card','planets-card','meteors-card','darksky-card']
    .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = '<div class="skeleton-card"></div>'; });
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tm);
  t._tm = setTimeout(() => t.classList.remove('show'), 3000);
}

// Expose for inline click handlers
window.setLocation = setLocation;
window.addEventListener('resize', () => { renderSkyMap(); });
