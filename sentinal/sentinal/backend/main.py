"""
SENTINEL Intelligence Dashboard — FastAPI Backend
Real-time maritime, aviation, and military tracking platform.
"""

import asyncio
import json
import math
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Optional
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi import Request

from data_store import DataStore
from models import (
    Alert, Asset, AviationAsset, FilterParams,
    IncidentAsset, MilitaryAsset, MaritimeAsset,
    NavalBase, ExclusionZone
)
from simulator import EntitySimulator

# ── Resolve paths relative to this file (works from any cwd) ─
BASE_DIR     = Path(__file__).resolve().parent          # …/backend
FRONTEND_DIR = BASE_DIR.parent / "frontend"             # …/frontend
STATIC_DIR   = FRONTEND_DIR / "static"                  # …/frontend/static
TEMPLATES_DIR= FRONTEND_DIR / "templates"               # …/frontend/templates

# ── App Setup ────────────────────────────────────────────────
app = FastAPI(
    title="SENTINEL Intelligence Dashboard",
    description="Real-time global maritime, aviation, and military tracking API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files & templates — absolute paths so the server works
# regardless of which directory uvicorn is launched from.
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# Global state
store = DataStore()
simulator = EntitySimulator(store)
connection_manager: "ConnectionManager" = None


# ── WebSocket Connection Manager ─────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active = [c for c in self.active if c != ws]

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    @property
    def count(self):
        return len(self.active)


manager = ConnectionManager()


# ── Background Tasks ─────────────────────────────────────────
async def simulation_loop():
    """Main simulation tick — updates positions and broadcasts to clients."""
    while True:
        await asyncio.sleep(3)
        store.tick()
        simulator.step()

        # Occasionally generate new entities / incidents
        if random.random() < 0.15:
            simulator.spawn_random()

        if random.random() < 0.06:
            inc = simulator.generate_incident()
            store.add_incident(inc)

        # Build broadcast payload (deltas only for efficiency)
        payload = {
            "type": "update",
            "ts": int(time.time() * 1000),
            "stats": store.get_stats(),
            "maritime": [a.dict() for a in store.get_maritime()[:60]],
            "aviation": [a.dict() for a in store.get_aviation()[:50]],
            "military": [a.dict() for a in store.get_military()[:30]],
            "incidents": [a.dict() for a in store.get_incidents()],
            "alerts": [a.dict() for a in store.get_active_alerts()],
        }
        if manager.count > 0:
            await manager.broadcast(payload)


@app.on_event("startup")
async def startup():
    store.initialize()
    asyncio.create_task(simulation_loop())


# ── HTML Route ────────────────────────────────────────────────
@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


# ── REST API ─────────────────────────────────────────────────
@app.get("/api/v1/status")
async def status():
    return {
        "status": "operational",
        "version": "2.0.0",
        "uptime_s": store.uptime(),
        "connected_clients": manager.count,
        "stats": store.get_stats(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/v1/maritime")
async def get_maritime(
    flag: Optional[str] = None,
    vessel_type: Optional[str] = None,
    status: Optional[str] = None,
    min_speed: Optional[float] = None,
    max_speed: Optional[float] = None,
    lat_min: Optional[float] = None,
    lat_max: Optional[float] = None,
    lon_min: Optional[float] = None,
    lon_max: Optional[float] = None,
    limit: int = Query(default=100, le=500),
):
    vessels = store.get_maritime()
    if flag:
        vessels = [v for v in vessels if v.flag.upper() == flag.upper()]
    if vessel_type:
        vessels = [v for v in vessels if vessel_type.lower() in v.vessel_type.lower()]
    if status:
        vessels = [v for v in vessels if v.nav_status.upper() == status.upper()]
    if min_speed is not None:
        vessels = [v for v in vessels if v.speed >= min_speed]
    if max_speed is not None:
        vessels = [v for v in vessels if v.speed <= max_speed]
    if lat_min is not None:
        vessels = [v for v in vessels if v.lat >= lat_min]
    if lat_max is not None:
        vessels = [v for v in vessels if v.lat <= lat_max]
    if lon_min is not None:
        vessels = [v for v in vessels if v.lon >= lon_min]
    if lon_max is not None:
        vessels = [v for v in vessels if v.lon <= lon_max]
    return {"count": len(vessels[:limit]), "data": [v.dict() for v in vessels[:limit]]}


@app.get("/api/v1/maritime/{asset_id}")
async def get_vessel(asset_id: str):
    v = store.get_by_id("maritime", asset_id)
    if not v:
        return JSONResponse(status_code=404, content={"error": "Vessel not found"})
    return v.dict()


@app.get("/api/v1/aviation")
async def get_aviation(
    aircraft_type: Optional[str] = None,
    country: Optional[str] = None,
    is_military: Optional[bool] = None,
    min_altitude: Optional[int] = None,
    max_altitude: Optional[int] = None,
    limit: int = Query(default=100, le=500),
):
    aircraft = store.get_aviation()
    if aircraft_type:
        aircraft = [a for a in aircraft if aircraft_type.lower() in a.aircraft_type.lower()]
    if country:
        aircraft = [a for a in aircraft if a.country.upper() == country.upper()]
    if is_military is not None:
        aircraft = [a for a in aircraft if a.is_military == is_military]
    if min_altitude is not None:
        aircraft = [a for a in aircraft if a.altitude >= min_altitude]
    if max_altitude is not None:
        aircraft = [a for a in aircraft if a.altitude <= max_altitude]
    return {"count": len(aircraft[:limit]), "data": [a.dict() for a in aircraft[:limit]]}


@app.get("/api/v1/aviation/{asset_id}")
async def get_aircraft(asset_id: str):
    a = store.get_by_id("aviation", asset_id)
    if not a:
        return JSONResponse(status_code=404, content={"error": "Aircraft not found"})
    return a.dict()


@app.get("/api/v1/military")
async def get_military(
    country: Optional[str] = None,
    unit_type: Optional[str] = None,
    threat_level: Optional[str] = None,
    limit: int = Query(default=100, le=200),
):
    units = store.get_military()
    if country:
        units = [u for u in units if u.country.upper() == country.upper()]
    if unit_type:
        units = [u for u in units if unit_type.lower() in u.unit_type.lower()]
    if threat_level:
        units = [u for u in units if u.threat_level.upper() == threat_level.upper()]
    return {"count": len(units[:limit]), "data": [u.dict() for u in units[:limit]]}


@app.get("/api/v1/military/{asset_id}")
async def get_military_unit(asset_id: str):
    m = store.get_by_id("military", asset_id)
    if not m:
        return JSONResponse(status_code=404, content={"error": "Unit not found"})
    return m.dict()


@app.get("/api/v1/incidents")
async def get_incidents(
    severity: Optional[str] = None,
    incident_type: Optional[str] = None,
    limit: int = Query(default=50, le=200),
):
    incidents = store.get_incidents()
    if severity:
        incidents = [i for i in incidents if i.severity.upper() == severity.upper()]
    if incident_type:
        incidents = [i for i in incidents if incident_type.lower() in i.incident_type.lower()]
    return {"count": len(incidents[:limit]), "data": [i.dict() for i in incidents[:limit]]}


@app.get("/api/v1/alerts")
async def get_alerts():
    return {"count": len(store.get_active_alerts()), "data": [a.dict() for a in store.get_active_alerts()]}


@app.get("/api/v1/zones")
async def get_zones():
    return {"count": len(store.zones), "data": [z.dict() for z in store.zones]}


@app.get("/api/v1/naval-bases")
async def get_naval_bases():
    return {"count": len(store.naval_bases), "data": [b.dict() for b in store.naval_bases]}


@app.get("/api/v1/search")
async def search(
    q: str = Query(..., min_length=1),
    layer: Optional[str] = None,
    limit: int = Query(default=50, le=200),
):
    results = store.search(q, layer)
    return {"count": len(results[:limit]), "query": q, "data": results[:limit]}


@app.get("/api/v1/stats")
async def get_stats():
    return store.get_stats()


@app.get("/api/v1/heatmap")
async def get_heatmap(layer: str = "all"):
    """Return aggregated grid-cell counts for density heatmap."""
    points = []
    if layer in ("all", "maritime"):
        points += [[v.lat, v.lon, 0.5] for v in store.get_maritime()]
    if layer in ("all", "aviation"):
        points += [[a.lat, a.lon, 0.3] for a in store.get_aviation()]
    if layer in ("all", "military"):
        points += [[m.lat, m.lon, 1.0] for m in store.get_military()]
    return {"count": len(points), "data": points}


# ── WebSocket ─────────────────────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        # Send initial full state on connection
        await ws.send_json({
            "type": "init",
            "ts": int(time.time() * 1000),
            "stats": store.get_stats(),
            "maritime": [a.dict() for a in store.get_maritime()],
            "aviation": [a.dict() for a in store.get_aviation()],
            "military": [a.dict() for a in store.get_military()],
            "incidents": [a.dict() for a in store.get_incidents()],
            "zones": [z.dict() for z in store.zones],
            "naval_bases": [b.dict() for b in store.naval_bases],
            "alerts": [a.dict() for a in store.get_active_alerts()],
        })
        while True:
            # Keep alive, handle any client messages
            msg = await ws.receive_text()
            data = json.loads(msg)
            if data.get("type") == "ping":
                await ws.send_json({"type": "pong", "ts": int(time.time() * 1000)})
            elif data.get("type") == "subscribe":
                # Client can subscribe to specific layers
                pass
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)