# night-sky — Georgia Night Sky Guide

**Subdomain:** https://sky.riktom.com
**Stack:** Pure static HTML/CSS/JS — no backend
**VPS path:** `/opt/night-sky/`
**nginx config:** `/etc/nginx/sites-available/sky.riktom.com`
**GitHub:** https://github.com/riktom-com/night-sky

## What It Does
Localized night-sky planner for Georgia outdoorspeople. Picks a Georgia location (dark-sky site or town) and gives a tonight-only viewing score in three modes:
- **🔭 Skywatch** — clouds + moon brightness + light pollution (Bortle) + twilight
- **🎣 Night Fish** — moon phase + solunar + wind + weather safety
- **🔥 Campfire** — temp + wind + precip + fire-weather alerts

Plus:
- Tonight's schedule (sunset, civil/nautical/astronomical twilight, moonrise/set, sunrise)
- Moon phase + illumination % + current altitude
- Visible planets tonight (Mercury, Venus, Mars, Jupiter, Saturn) with alt/azimuth
- **Canvas sky map** — live stereographic projection from zenith, ~30 brightest stars, Big Dipper + Orion asterism lines, all 5 naked-eye planets, moon (with phase shading), sun (if up)
- Next 4 upcoming meteor showers with peak dates + ZHR rates
- 8 curated Georgia dark-sky sites sorted by distance, with Bortle ratings

## Astronomical Calculations
All client-side in `js/astro.js` (no external libs):
- Julian Date, GMST, LST
- Sun position (low-precision Meeus formula)
- Moon position (Brown's series, top 5 longitude terms)
- Planet positions (mean Keplerian elements at J2000 + linear rates, Kepler's equation solved iteratively)
- Equatorial → horizontal coordinate transform
- Sun/moon rise/set/twilight via bisection search

Accuracy target: sub-degree for moon/planets, sufficient for "is Jupiter up tonight" use. Not suitable for telescope go-to.

## Data Sources
| Source | Endpoint | CORS |
|--------|----------|------|
| NWS hourly forecast | `api.weather.gov/points/{lat,lon}` → forecastHourly | ✅ |
| NWS alerts | `api.weather.gov/alerts/active?point={lat,lon}` | ✅ |
| Astronomy | computed client-side from Date object | — |

Cloud cover is estimated by parsing NWS `shortForecast` strings ("Mostly Clear" → 15%, "Overcast" → 95%, etc.) since hourly cloudCover isn't always populated by NWS.

## Locations (12 presets)
8 dark-sky sites (Bortle 2–4):
- Stephen C. Foster SP (B2, IDA-certified Dark Sky Park)
- Okefenokee NWR — Suwannee Canal (B2)
- Cumberland Island NS (B2)
- Black Rock Mountain SP (B2)
- Tallulah Gorge SP (B3)
- Cloudland Canyon SP (B3)
- Sapelo Island (B3)
- General Coffee SP (B3)
- Reed Bingham SP (B4 — closest to Hahira/Valdosta)
- Banks Lake NWR (B4)

2 towns (for reference):
- Hahira (B5)
- Valdosta (B6)

Plus GPS button for custom location (assumed Bortle 5).

## Deploy
```bash
rsync -az --delete -e "ssh -i ~/.ssh/riktom_vps" /tmp/night-sky/ root@72.62.83.12:/opt/night-sky/
```

## nginx Config
Standard static site config with Let's Encrypt SSL. Listen 80 + 443, root `/opt/night-sky`, index `index.html`.

## Future Enhancements
- ISS pass predictions (need TLE data + SGP4 — would require external API or backend)
- Real-time satellite tracking
- More accurate planet positions (full VSOP87)
- Push notifications for meteor shower peaks and bright planet visibility
- Light pollution overlay using lightpollutionmap.info API
- "Tonight's photography exposure calculator"
- Integration with Hunt & Fish Forecast for combined "outdoor night" planning
