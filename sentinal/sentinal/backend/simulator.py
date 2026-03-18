"""
SENTINEL — Entity Simulator
Drives realistic position/heading updates for all tracked assets.
"""

import math
import random
import uuid
import time

from models import AviationAsset, IncidentAsset, MaritimeAsset, MilitaryAsset


def _clamp_lat(lat: float) -> float:
    return max(-85.0, min(85.0, lat))


def _wrap_lon(lon: float) -> float:
    if lon > 180:
        return lon - 360
    if lon < -180:
        return lon + 360
    return lon


def _drift_heading(heading: int, max_drift: int = 5) -> int:
    return (heading + random.randint(-max_drift, max_drift)) % 360


class EntitySimulator:
    def __init__(self, store):
        self.store = store

    def step(self):
        """Advance all asset positions by one tick."""
        self._step_maritime()
        self._step_aviation()
        self._step_military()

    def _step_maritime(self):
        for v in self.store.get_maritime():
            if v.nav_status in ("ANCHORED", "MOORED"):
                # Drift slightly
                v.lat += random.uniform(-0.0001, 0.0001)
                v.lon += random.uniform(-0.0001, 0.0001)
            else:
                speed_factor = v.speed * 0.00005  # knots → deg/tick
                rad = math.radians(v.heading)
                v.lat += math.cos(rad) * speed_factor
                v.lon += math.sin(rad) * speed_factor
                v.heading = _drift_heading(v.heading, 3)

            v.lat = _clamp_lat(v.lat)
            v.lon = _wrap_lon(v.lon)
            v.timestamp = int(time.time() * 1000)
            self.store.update_maritime(v)

    def _step_aviation(self):
        for a in self.store.get_aviation():
            speed_factor = a.speed * 0.0001
            rad = math.radians(a.heading)
            a.lat += math.cos(rad) * speed_factor
            a.lon += math.sin(rad) * speed_factor
            a.heading = _drift_heading(a.heading, 4)

            # Altitude changes
            a.altitude = max(1000, min(45000, a.altitude + a.vertical_rate // 60))
            if random.random() < 0.05:
                a.vertical_rate = random.randint(-500, 500)

            a.lat = _clamp_lat(a.lat)
            a.lon = _wrap_lon(a.lon)
            a.timestamp = int(time.time() * 1000)
            self.store.update_aviation(a)

    def _step_military(self):
        for m in self.store.get_military():
            if m.operational_status in ("DEPLOYED", "ACTIVE"):
                speed = 0.0003
                rad = math.radians(random.randint(0, 359))
                m.lat += math.cos(rad) * speed
                m.lon += math.sin(rad) * speed
                m.lat = _clamp_lat(m.lat)
                m.lon = _wrap_lon(m.lon)
                m.timestamp = int(time.time() * 1000)
                self.store.update_military(m)

    def spawn_random(self):
        """Spawn a new random entity."""
        r = random.random()
        if r < 0.45:
            self._spawn_vessel()
        elif r < 0.75:
            self._spawn_aircraft()
        else:
            self._spawn_military()

    def _spawn_vessel(self):
        vessel_types = ["Cargo", "Tanker", "Container", "Bulk Carrier", "Frigate", "Destroyer"]
        flags = ["US", "CN", "RU", "GB", "FR", "DE", "JP", "SG", "NO", "GR"]
        v = MaritimeAsset(
            id=f"V-{uuid.uuid4().hex[:8].upper()}",
            mmsi=str(random.randint(100000000, 999999999)),
            vessel_name=f"MV {random.choice(['NOVA','APEX','CREST','DELTA','ECHO','FORTE','GRACE'])}",
            vessel_type=random.choice(vessel_types),
            flag=random.choice(flags),
            lat=random.uniform(-60, 70),
            lon=random.uniform(-170, 170),
            speed=round(random.uniform(5, 20), 1),
            heading=random.randint(0, 359),
            course=random.randint(0, 359),
            draft=round(random.uniform(4, 16), 1),
            nav_status="UNDERWAY",
            destination=random.choice(["ROTTERDAM", "SINGAPORE", "DUBAI", "HAMBURG"]),
        )
        self.store.add_maritime(v)
        # Prune oldest if over limit
        vessels = self.store.get_maritime()
        if len(vessels) > 70:
            oldest = min(vessels, key=lambda x: x.timestamp)
            del self.store._maritime[oldest.id]

    def _spawn_aircraft(self):
        types = ["B737", "A320", "B777", "C-130", "F-16", "F-35", "MQ-9"]
        is_mil = random.random() < 0.3
        a = AviationAsset(
            id=f"A-{uuid.uuid4().hex[:8].upper()}",
            callsign=f"{'SWORD' if is_mil else 'UAL'}{random.randint(100, 999)}",
            aircraft_type=random.choice(types),
            registration=f"N{random.randint(10000, 99999)}",
            country=random.choice(["USA", "UK", "France", "Germany", "Russia", "China"]),
            lat=random.uniform(-55, 75),
            lon=random.uniform(-170, 170),
            altitude=random.randint(5000, 40000),
            speed=random.randint(250, 850),
            heading=random.randint(0, 359),
            vertical_rate=random.randint(-200, 200),
            squawk=str(random.randint(1000, 7777)).zfill(4),
            origin=random.choice(["JFK", "LHR", "CDG", "DXB"]),
            destination=random.choice(["SIN", "FRA", "AMS", "HND"]),
            is_military=is_mil,
        )
        self.store.add_aviation(a)
        aircraft = self.store.get_aviation()
        if len(aircraft) > 60:
            oldest = min(aircraft, key=lambda x: x.timestamp)
            del self.store._aviation[oldest.id]

    def _spawn_military(self):
        unit_types = ["Special Forces", "Armored Brigade", "Infantry Battalion", "Air Defense"]
        countries = ["USA", "UK", "Russia", "China", "France", "Iran", "Turkey"]
        threats = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        country = random.choice(countries)
        m = MilitaryAsset(
            id=f"M-{uuid.uuid4().hex[:8].upper()}",
            callsign=f"{random.choice(['RAPTOR','LANCE','STEEL','IRON'])}-{random.randint(1,9)}",
            unit_name=f"{country} {random.choice(unit_types)}",
            unit_type=random.choice(unit_types),
            country=country,
            lat=random.uniform(-50, 70),
            lon=random.uniform(-150, 160),
            strength=random.randint(100, 3000),
            equipment=random.choice(["M1A2", "T-90", "Challenger 2", "Leclerc", "Type 99"]),
            operational_status="DEPLOYED",
            threat_level=random.choices(threats, weights=[25, 40, 25, 10])[0],
            classification="UNKNOWN",
        )
        self.store.add_military(m)
        units = self.store.get_military()
        if len(units) > 40:
            oldest = min(units, key=lambda x: x.timestamp)
            del self.store._military[oldest.id]

    def generate_incident(self) -> IncidentAsset:
        inc_types = ["Piracy", "Collision", "Distress Call", "Interception", "Zone Violation", "Suspicious Activity"]
        severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        descriptions = [
            "Vessel broadcasting emergency distress signal",
            "Unauthorized entry into restricted maritime exclusion zone",
            "Suspicious aircraft squawking 7700 — no response on comms",
            "Surface contact lost in high-risk corridor",
            "Unidentified vessel refusing AIS identification",
            "Armed boarding attempt — vessel requests immediate assistance",
            "Collision risk between two commercial vessels",
            "Military aircraft entering civilian airspace without clearance",
            "Fast-moving unidentified contacts approaching carrier group",
        ]
        sev = random.choices(severities, weights=[20, 40, 25, 15])[0]
        return IncidentAsset(
            id=f"INC-{uuid.uuid4().hex[:8].upper()}",
            incident_type=random.choice(inc_types),
            severity=sev,
            lat=random.uniform(-50, 70),
            lon=random.uniform(-150, 160),
            description=random.choice(descriptions),
            reported_by=random.choice(["NAVCOORD", "COASTWATCH", "AIS-NET", "SIGINT", "CTF-151"]),
            status="ACTIVE",
        )
