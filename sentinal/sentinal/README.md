# SENTINEL — Global Intelligence Dashboard

Real-time maritime, aviation, and military tracking platform with WebSocket live updates, REST API, and an interactive map dashboard.

---

## Architecture

```
sentinel/
├── backend/
│   ├── main.py           # FastAPI app — REST + WebSocket endpoints
│   ├── models.py         # Pydantic data models
│   ├── data_store.py     # In-memory data store + seed data
│   ├── simulator.py      # Live entity movement simulation
│   └── requirements.txt
├── frontend/
│   ├── templates/
│   │   └── index.html    # Main HTML shell
│   └── static/
│       ├── css/
│       │   └── main.css
│       └── js/
│           ├── config.js   # Configuration + settings
│           ├── api.js      # REST API client
│           ├── ws.js       # WebSocket client (auto-reconnect)
│           ├── map.js      # Leaflet map controller
│           ├── layers.js   # Marker layer management
│           ├── feed.js     # Intelligence feed + AppState
│           ├── ui.js       # UI controller
│           ├── radar.js    # Radar canvas animation
│           ├── charts.js   # Analytics charts (pure canvas)
│           └── boot.js     # Boot sequence + demo fallback
├── run.py                # Quick-start script
└── README.md
```

---

## Quick Start

### 1. Install & Run Backend

```bash
# Option A — use the run script (installs deps automatically)
python run.py

# Option B — manual
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Open the Dashboard

Visit: **http://localhost:8000**

The frontend is served directly by FastAPI. The WebSocket connects automatically at `ws://localhost:8000/ws`.

---

## REST API Reference

All endpoints return JSON. Base URL: `http://localhost:8000`

### System

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/status` | System status, uptime, connected clients |
| GET | `/api/v1/stats` | Live entity counts and threat score |

### Maritime

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/maritime` | All vessels (filterable) |
| GET | `/api/v1/maritime/{id}` | Single vessel by ID |

**Query params:** `flag`, `vessel_type`, `status`, `min_speed`, `max_speed`, `lat_min`, `lat_max`, `lon_min`, `lon_max`, `limit`

```bash
# Examples
curl "http://localhost:8000/api/v1/maritime?flag=US&min_speed=10"
curl "http://localhost:8000/api/v1/maritime?vessel_type=Tanker&limit=20"
curl "http://localhost:8000/api/v1/maritime?lat_min=20&lat_max=60&lon_min=-10&lon_max=40"
```

### Aviation

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/aviation` | All aircraft (filterable) |
| GET | `/api/v1/aviation/{id}` | Single aircraft by ID |

**Query params:** `aircraft_type`, `country`, `is_military`, `min_altitude`, `max_altitude`, `limit`

```bash
curl "http://localhost:8000/api/v1/aviation?is_military=true"
curl "http://localhost:8000/api/v1/aviation?country=USA&min_altitude=30000"
```

### Military

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/military` | All military units (filterable) |
| GET | `/api/v1/military/{id}` | Single unit by ID |

**Query params:** `country`, `unit_type`, `threat_level`, `limit`

```bash
curl "http://localhost:8000/api/v1/military?threat_level=CRITICAL"
curl "http://localhost:8000/api/v1/military?country=Russia"
```

### Incidents, Alerts, Zones, Naval Bases

```bash
curl "http://localhost:8000/api/v1/incidents?severity=HIGH"
curl "http://localhost:8000/api/v1/alerts"
curl "http://localhost:8000/api/v1/zones"
curl "http://localhost:8000/api/v1/naval-bases"
```

### Search

```bash
curl "http://localhost:8000/api/v1/search?q=Tanker"
curl "http://localhost:8000/api/v1/search?q=EAGLE&layer=military"
```

### Heatmap

```bash
curl "http://localhost:8000/api/v1/heatmap?layer=all"
curl "http://localhost:8000/api/v1/heatmap?layer=maritime"
```

---

## WebSocket API

Connect to: `ws://localhost:8000/ws`

### Server → Client Messages

**`init`** — Full state sent on connection:
```json
{
  "type": "init",
  "ts": 1720000000000,
  "maritime": [...],
  "aviation": [...],
  "military": [...],
  "incidents": [...],
  "zones": [...],
  "naval_bases": [...],
  "alerts": [...]
}
```

**`update`** — Broadcast every 3 seconds:
```json
{
  "type": "update",
  "ts": 1720000003000,
  "stats": { "maritime_count": 50, "threat_score": 4, ... },
  "maritime": [...],
  "aviation": [...],
  "military": [...],
  "incidents": [...],
  "alerts": [...]
}
```

### Client → Server Messages

**`ping`**:
```json
{ "type": "ping" }
```

**`pong`** (response):
```json
{ "type": "pong", "ts": 1720000000000 }
```

---

## Dashboard Features

### Map
- **4 tile styles**: Dark, Satellite, Topo, Terrain
- **Interactive markers** for all entity types — click for full popup
- **Exclusion zones** rendered as dashed circles with color coding
- **Fly-to animation** when selecting any entity
- **Live coordinate display** on mousemove
- **Density heatmap** toggle

### Layers (each toggleable)
| Layer | Color | Description |
|-------|-------|-------------|
| 🚢 Maritime / AIS | Blue | Vessels: cargo, tankers, warships |
| ✈️ Aviation / ADS-B | Green | Commercial + military aircraft |
| ⚔️ Military Assets | Red | Ground units, naval squadrons |
| 🔶 Exclusion Zones | Amber | Restricted / danger / patrol zones |
| ⚡ Incidents | Purple | Active events with severity |
| ⚓ Naval Bases | Orange | Fixed military installations |

### Intelligence Feed
- Live-updating scrolling feed with type badges
- Filter by layer: ALL / MARITIME / AVIATION / MILITARY / INCIDENTS
- Full-text search across all entities
- Click any feed item → fly to location + show detail panel

### Analytics Tab
- 24h traffic signal chart
- Asset distribution bar chart
- Live stats grid: counts, threat score, uptime

### Threat Assessment
- Dynamic 10-segment meter
- Score calculated from incident severity
- Labels: LOW / ELEVATED / HIGH / CRITICAL

### Settings Panel
- Configurable API URL and WebSocket URL
- Movement trail toggle
- Auto-scroll feed toggle
- Manual reconnect / refresh buttons

---

## Connecting Real Data

The simulator provides realistic demo data. To connect real data sources, replace the methods in `data_store.py`:

### AIS (Maritime)
- [MarineTraffic API](https://www.marinetraffic.com/en/ais-api-services)
- [AISHub](https://www.aishub.net/api)
- [VesselFinder](https://api.vesselfinder.com/)
- Self-hosted: run an AIS receiver (RTL-SDR + AIS decoder)

### ADS-B (Aviation)
- [OpenSky Network](https://opensky-network.org/apidoc/)
- [FlightAware AeroAPI](https://flightaware.com/commercial/aeroapi/)
- [ADS-B Exchange](https://www.adsbexchange.com/data/)
- Self-hosted: `dump1090` + RTL-SDR dongle

### Military / SIGINT
- [Global Conflict Tracker](https://www.cfr.org/global-conflict-tracker)
- [ACLED](https://acleddata.com/) — conflict event data
- OSINT aggregation (custom scrapers)

### Example: OpenSky Integration

```python
# In data_store.py, replace _seed_aviation() with:
import httpx

async def fetch_opensky(self):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://opensky-network.org/api/states/all",
            params={"lamin": -90, "lomin": -180, "lamax": 90, "lomax": 180},
            timeout=10
        )
        data = resp.json()
        for state in (data.get("states") or [])[:100]:
            if state[5] and state[6]:  # has lat/lon
                a = AviationAsset(
                    id=f"A-{state[0]}",
                    callsign=(state[1] or '').strip() or 'UNKNOWN',
                    aircraft_type="Unknown",
                    registration=state[0],
                    country=state[2] or 'Unknown',
                    lat=float(state[6]),
                    lon=float(state[5]),
                    altitude=int(state[7] or 0),
                    speed=int((state[9] or 0) * 1.944),  # m/s → knots
                    heading=int(state[10] or 0),
                    vertical_rate=int(state[11] or 0),
                    squawk=state[14] or '0000',
                    origin='?', destination='?',
                    is_military=False,
                )
                self._aviation[a.id] = a
```

---

## Production Deployment

```bash
# With gunicorn + uvicorn workers
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000

# With Docker
docker build -t sentinel .
docker run -p 8000:8000 sentinel

# With nginx reverse proxy (recommended for production)
# Point nginx → http://localhost:8000
# Enable WebSocket upgrade headers
```

### Environment Variables

```bash
SENTINEL_HOST=0.0.0.0
SENTINEL_PORT=8000
SENTINEL_RELOAD=false
SENTINEL_LOG_LEVEL=info
```

---

## Data Models

### MaritimeAsset
| Field | Type | Description |
|-------|------|-------------|
| id | str | Unique identifier |
| mmsi | str | Maritime Mobile Service Identity |
| vessel_name | str | Ship name |
| vessel_type | str | Cargo / Tanker / Frigate / etc |
| flag | str | Country code |
| lat / lon | float | Position |
| speed | float | Speed over ground (knots) |
| heading | int | True heading (0–359°) |
| draft | float | Draught (metres) |
| nav_status | str | UNDERWAY / ANCHORED / MOORED / DRIFTING |
| destination | str | Declared destination port |

### AviationAsset
| Field | Type | Description |
|-------|------|-------------|
| callsign | str | Flight callsign |
| aircraft_type | str | ICAO type code |
| altitude | int | Altitude (feet) |
| speed | int | Ground speed (knots) |
| squawk | str | Transponder code |
| is_military | bool | Military aircraft flag |

### MilitaryAsset
| Field | Type | Description |
|-------|------|-------------|
| unit_type | str | Armored Brigade / Special Forces / etc |
| country | str | Operating nation |
| strength | int | Personnel count |
| threat_level | str | LOW / MEDIUM / HIGH / CRITICAL |
| classification | str | FRIENDLY / HOSTILE / UNKNOWN / NEUTRAL |

---

## License

MIT — For educational, research, and demonstration purposes.
Use of this system with real sensitive data requires appropriate authorizations.
