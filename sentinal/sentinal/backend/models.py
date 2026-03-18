"""
SENTINEL — Pydantic data models
"""

from typing import Optional, List
from pydantic import BaseModel, Field
import time


class MaritimeAsset(BaseModel):
    id: str
    mmsi: str
    vessel_name: str
    vessel_type: str
    flag: str
    lat: float
    lon: float
    speed: float          # knots
    heading: int          # 0-359 degrees
    course: int           # COG
    draft: float          # metres
    length: Optional[int] = None
    nav_status: str       # UNDERWAY / ANCHORED / MOORED / DRIFTING
    destination: str
    eta: Optional[str] = None
    imo: Optional[str] = None
    callsign: Optional[str] = None
    layer: str = "maritime"
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))


class AviationAsset(BaseModel):
    id: str
    callsign: str
    aircraft_type: str
    registration: str
    country: str
    lat: float
    lon: float
    altitude: int         # feet
    speed: int            # knots
    heading: int          # 0-359
    vertical_rate: int    # ft/min
    squawk: str
    origin: str
    destination: str
    is_military: bool = False
    airline: Optional[str] = None
    layer: str = "aviation"
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))


class MilitaryAsset(BaseModel):
    id: str
    callsign: str
    unit_name: str
    unit_type: str        # Armored / Infantry / Naval / Air / Special Forces
    country: str
    lat: float
    lon: float
    strength: int
    equipment: str
    operational_status: str   # ACTIVE / STANDBY / DEPLOYED / RETURNING
    threat_level: str         # LOW / MEDIUM / HIGH / CRITICAL
    classification: str       # FRIENDLY / HOSTILE / UNKNOWN / NEUTRAL
    layer: str = "military"
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))


class IncidentAsset(BaseModel):
    id: str
    incident_type: str    # Piracy / Collision / Distress / Interception / Violation
    severity: str         # LOW / MEDIUM / HIGH / CRITICAL
    lat: float
    lon: float
    description: str
    involved_assets: List[str] = []
    reported_by: str
    status: str = "ACTIVE"  # ACTIVE / INVESTIGATING / RESOLVED
    layer: str = "incidents"
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))


class NavalBase(BaseModel):
    id: str
    name: str
    country: str
    lat: float
    lon: float
    size: str             # MINOR / MEDIUM / MAJOR
    branch: str           # NAVY / AIR_FORCE / JOINT
    assets_count: Optional[int] = None
    layer: str = "naval"


class ExclusionZone(BaseModel):
    id: str
    name: str
    lat: float
    lon: float
    radius_km: float
    zone_type: str        # RESTRICTED / DANGER / PATROL / MILITARY / WATCH
    color: str
    active: bool = True
    issuing_authority: str
    layer: str = "zones"


class Alert(BaseModel):
    id: str
    alert_type: str
    severity: str
    title: str
    description: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    asset_id: Optional[str] = None
    layer: Optional[str] = None
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))
    acknowledged: bool = False


class Asset(BaseModel):
    """Generic union placeholder."""
    pass


class FilterParams(BaseModel):
    layer: Optional[str] = None
    country: Optional[str] = None
    threat_level: Optional[str] = None
    lat_min: Optional[float] = None
    lat_max: Optional[float] = None
    lon_min: Optional[float] = None
    lon_max: Optional[float] = None
