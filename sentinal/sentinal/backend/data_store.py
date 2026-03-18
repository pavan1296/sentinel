"""
SENTINEL — In-memory data store with initial seed data
"""

import random
import time
from typing import Dict, List, Optional

from models import (
    Alert, AviationAsset, ExclusionZone, IncidentAsset,
    MaritimeAsset, MilitaryAsset, NavalBase
)


class DataStore:
    def __init__(self):
        self._maritime: Dict[str, MaritimeAsset] = {}
        self._aviation: Dict[str, AviationAsset] = {}
        self._military: Dict[str, MilitaryAsset] = {}
        self._incidents: Dict[str, IncidentAsset] = {}
        self._alerts: Dict[str, Alert] = {}
        self.naval_bases: List[NavalBase] = []
        self.zones: List[ExclusionZone] = []
        self._start_time = time.time()
        self._tick_count = 0

    # ── Getters ───────────────────────────────────────────────
    def get_maritime(self) -> List[MaritimeAsset]:
        return list(self._maritime.values())

    def get_aviation(self) -> List[AviationAsset]:
        return list(self._aviation.values())

    def get_military(self) -> List[MilitaryAsset]:
        return list(self._military.values())

    def get_incidents(self) -> List[IncidentAsset]:
        return sorted(self._incidents.values(), key=lambda x: x.timestamp, reverse=True)

    def get_active_alerts(self) -> List[Alert]:
        return sorted(
            [a for a in self._alerts.values() if not a.acknowledged],
            key=lambda x: x.timestamp, reverse=True
        )

    def get_by_id(self, layer: str, asset_id: str):
        stores = {
            "maritime": self._maritime,
            "aviation": self._aviation,
            "military": self._military,
            "incidents": self._incidents,
        }
        return stores.get(layer, {}).get(asset_id)

    # ── Setters ───────────────────────────────────────────────
    def add_maritime(self, v: MaritimeAsset):
        self._maritime[v.id] = v

    def add_aviation(self, a: AviationAsset):
        self._aviation[a.id] = a

    def add_military(self, m: MilitaryAsset):
        self._military[m.id] = m

    def add_incident(self, i: IncidentAsset):
        self._incidents[i.id] = i
        # Generate alert for HIGH/CRITICAL
        if i.severity in ("HIGH", "CRITICAL"):
            alert = Alert(
                id=f"ALT-{i.id}",
                alert_type="INCIDENT",
                severity=i.severity,
                title=f"{i.incident_type} — {i.severity}",
                description=i.description,
                lat=i.lat,
                lon=i.lon,
                asset_id=i.id,
                layer="incidents",
            )
            self._alerts[alert.id] = alert

    def update_maritime(self, v: MaritimeAsset):
        self._maritime[v.id] = v

    def update_aviation(self, a: AviationAsset):
        self._aviation[a.id] = a

    def update_military(self, m: MilitaryAsset):
        self._military[m.id] = m

    # ── Search ────────────────────────────────────────────────
    def search(self, query: str, layer: Optional[str] = None) -> list:
        q = query.lower()
        results = []

        def matches(obj) -> bool:
            return any(
                q in str(v).lower()
                for v in obj.dict().values()
                if isinstance(v, (str, int, float))
            )

        if layer in (None, "maritime"):
            results += [{"layer": "maritime", **v.dict()} for v in self._maritime.values() if matches(v)]
        if layer in (None, "aviation"):
            results += [{"layer": "aviation", **a.dict()} for a in self._aviation.values() if matches(a)]
        if layer in (None, "military"):
            results += [{"layer": "military", **m.dict()} for m in self._military.values() if matches(m)]
        if layer in (None, "incidents"):
            results += [{"layer": "incidents", **i.dict()} for i in self._incidents.values() if matches(i)]

        return results[:100]

    # ── Stats ─────────────────────────────────────────────────
    def get_stats(self) -> dict:
        critical_count = len([i for i in self._incidents.values() if i.severity == "CRITICAL"])
        high_count = len([i for i in self._incidents.values() if i.severity == "HIGH"])
        threat_score = min(10, critical_count * 3 + high_count)

        return {
            "maritime_count": len(self._maritime),
            "aviation_count": len(self._aviation),
            "military_count": len(self._military),
            "incident_count": len(self._incidents),
            "alert_count": len(self.get_active_alerts()),
            "naval_base_count": len(self.naval_bases),
            "zone_count": len(self.zones),
            "threat_score": threat_score,
            "tick": self._tick_count,
            "uptime_s": int(time.time() - self._start_time),
        }

    def uptime(self) -> int:
        return int(time.time() - self._start_time)

    def tick(self):
        self._tick_count += 1

    # ── Initialization ────────────────────────────────────────
    def initialize(self):
        self._seed_naval_bases()
        self._seed_zones()
        self._seed_maritime(50)
        self._seed_aviation(40)
        self._seed_military(22)
        self._seed_incidents(7)

    def _seed_naval_bases(self):
        self.naval_bases = [
            NavalBase(id="NB-001", name="Naval Station Norfolk", country="USA", lat=36.94, lon=-76.32, size="MAJOR", branch="NAVY", assets_count=75),
            NavalBase(id="NB-002", name="HNLMS Den Helder", country="NLD", lat=52.96, lon=4.76, size="MEDIUM", branch="NAVY", assets_count=18),
            NavalBase(id="NB-003", name="Rota Naval Base", country="ESP/USA", lat=36.63, lon=-6.35, size="MAJOR", branch="JOINT", assets_count=32),
            NavalBase(id="NB-004", name="Changi Naval Base", country="SGP", lat=1.37, lon=104.00, size="MAJOR", branch="NAVY", assets_count=28),
            NavalBase(id="NB-005", name="Vladivostok Pacific Fleet", country="RUS", lat=43.10, lon=131.90, size="MAJOR", branch="NAVY", assets_count=55),
            NavalBase(id="NB-006", name="Tartus Naval Facility", country="RUS", lat=34.90, lon=35.87, size="MEDIUM", branch="NAVY", assets_count=12),
            NavalBase(id="NB-007", name="RNAS Culdrose", country="GBR", lat=50.08, lon=-5.26, size="MEDIUM", branch="AIR_FORCE", assets_count=22),
            NavalBase(id="NB-008", name="Yokosuka Naval Base", country="USA/JPN", lat=35.29, lon=139.67, size="MAJOR", branch="JOINT", assets_count=48),
            NavalBase(id="NB-009", name="Karachi Naval Base", country="PAK", lat=24.84, lon=66.98, size="MAJOR", branch="NAVY", assets_count=30),
            NavalBase(id="NB-010", name="Diego Garcia", country="GBR/USA", lat=-7.31, lon=72.41, size="MAJOR", branch="JOINT", assets_count=60),
        ]

    def _seed_zones(self):
        self.zones = [
            ExclusionZone(id="EZ-001", name="South China Sea — Zone Alpha", lat=14.0, lon=114.0, radius_km=450, zone_type="RESTRICTED", color="#ff3344", issuing_authority="PLAN"),
            ExclusionZone(id="EZ-002", name="Black Sea Exclusion Zone", lat=43.0, lon=33.0, radius_km=300, zone_type="DANGER", color="#ff6644", issuing_authority="RUS-NAVY"),
            ExclusionZone(id="EZ-003", name="Gulf of Aden Patrol Zone", lat=12.0, lon=45.0, radius_km=380, zone_type="PATROL", color="#ffaa00", issuing_authority="CTF-151"),
            ExclusionZone(id="EZ-004", name="Arctic Operations Zone", lat=75.0, lon=15.0, radius_km=600, zone_type="MILITARY", color="#aa44ff", issuing_authority="NATO"),
            ExclusionZone(id="EZ-005", name="Persian Gulf Watch Zone", lat=26.0, lon=55.0, radius_km=280, zone_type="WATCH", color="#ffaa00", issuing_authority="NAVCENT"),
            ExclusionZone(id="EZ-006", name="Taiwan Strait Buffer Zone", lat=24.0, lon=120.5, radius_km=200, zone_type="RESTRICTED", color="#ff3344", issuing_authority="ROCN"),
            ExclusionZone(id="EZ-007", name="North Korean Maritime Exclusion", lat=39.0, lon=127.5, radius_km=250, zone_type="DANGER", color="#ff6644", issuing_authority="KPN"),
        ]

    def _seed_maritime(self, count: int):
        vessel_types = ["Cargo", "Tanker", "Container", "Bulk Carrier", "RoRo", "Passenger", "Frigate", "Destroyer", "Submarine", "Coast Guard"]
        flags = ["US", "CN", "RU", "GB", "FR", "DE", "JP", "SG", "NO", "GR", "PAN", "LBR", "MHL", "BHS", "CYP"]
        statuses = ["UNDERWAY", "ANCHORED", "MOORED", "DRIFTING"]
        destinations = ["ROTTERDAM", "SINGAPORE", "SHANGHAI", "LOS ANGELES", "DUBAI", "HAMBURG", "ANTWERP", "HONG KONG", "BUSAN", "TOKYO"]

        for i in range(count):
            v = MaritimeAsset(
                id=f"V-{uuid.uuid4().hex[:8].upper()}",
                mmsi=str(random.randint(100000000, 999999999)),
                vessel_name=f"{random.choice(['MV', 'SS', 'HMS', 'USNS', 'CNS'])} {self._random_name()}",
                vessel_type=random.choice(vessel_types),
                flag=random.choice(flags),
                lat=random.uniform(-60, 70),
                lon=random.uniform(-170, 170),
                speed=round(random.uniform(0, 22), 1),
                heading=random.randint(0, 359),
                course=random.randint(0, 359),
                draft=round(random.uniform(3, 18), 1),
                length=random.randint(80, 400),
                nav_status=random.choice(statuses),
                destination=random.choice(destinations),
                imo=f"IMO{random.randint(1000000, 9999999)}",
                callsign=f"{random.choice(['WA','9V','LARA','D5','LW'])}{random.randint(1000,9999)}",
            )
            self._maritime[v.id] = v

    def _seed_aviation(self, count: int):
        types_civil = ["B737", "A320", "B777", "A380", "B787", "A350", "B747", "E175", "CRJ900"]
        types_mil = ["C-130", "F-16", "F-35", "MQ-9", "P-8", "E-3", "KC-135", "B-52", "AC-130", "U-2", "RC-135"]
        countries = ["USA", "UK", "Russia", "China", "France", "Germany", "Turkey", "Israel", "India", "Japan", "Australia"]
        airports = ["JFK", "LHR", "CDG", "DXB", "SIN", "PEK", "FRA", "AMS", "HND", "SYD", "ORD", "LAX", "ATL"]
        mil_airports = ["KMCF", "EGVN", "KDOV", "LFRJ", "ETAD", "UUEE", "ZYHB", "VABB"]
        airlines = ["American", "Delta", "United", "British Airways", "Lufthansa", "Emirates", "Singapore Air", "Air France", "KLM", "JAL"]

        for i in range(count):
            is_mil = random.random() < 0.3
            atype = random.choice(types_mil if is_mil else types_civil)
            country = random.choice(countries)
            origin_pool = mil_airports if is_mil else airports
            dest_pool = mil_airports if is_mil else airports

            a = AviationAsset(
                id=f"A-{uuid.uuid4().hex[:8].upper()}",
                callsign=f"{'REACH' if is_mil else random.choice(['UAL','DAL','BAW','DLH','UAE'])}{random.randint(100, 9999)}",
                aircraft_type=atype,
                registration=f"{random.choice(['N','G-','F-','D-','JA'])}{random.randint(10000, 99999)}",
                country=country,
                lat=random.uniform(-55, 75),
                lon=random.uniform(-170, 170),
                altitude=random.randint(1000, 45000),
                speed=random.randint(150, 900),
                heading=random.randint(0, 359),
                vertical_rate=random.randint(-2000, 2000),
                squawk=str(random.randint(1000, 7777)).zfill(4),
                origin=random.choice(origin_pool),
                destination=random.choice(dest_pool),
                is_military=is_mil,
                airline=None if is_mil else random.choice(airlines),
            )
            self._aviation[a.id] = a

    def _seed_military(self, count: int):
        unit_types = ["Armored Brigade", "Infantry Battalion", "Special Forces", "Artillery Unit", "Air Defense Battery", "Naval Squadron", "Carrier Strike Group", "Rapid Reaction Force"]
        countries = ["USA", "UK", "Russia", "China", "France", "NATO", "Turkey", "Israel", "Iran", "India", "DPRK"]
        statuses = ["ACTIVE", "STANDBY", "DEPLOYED", "RETURNING", "EXERCISE"]
        threats = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        classifications = ["FRIENDLY", "HOSTILE", "UNKNOWN", "NEUTRAL"]
        equipment = ["M1A2 Abrams", "T-90A", "Type 99", "Challenger 2", "Leopard 2A7", "F-35B", "Su-57", "J-20", "Patriot PAC-3", "S-400"]

        for i in range(count):
            country = random.choice(countries)
            threat = random.choices(threats, weights=[30, 40, 20, 10])[0]
            classification = "FRIENDLY" if country in ("USA", "UK", "France", "NATO") else random.choice(classifications)
            m = MilitaryAsset(
                id=f"M-{uuid.uuid4().hex[:8].upper()}",
                callsign=f"{random.choice(['EAGLE','SHARK','RAVEN','HAWK','COBRA','VIPER','GHOST','TITAN'])}-{random.randint(1,9)}",
                unit_name=f"{country} {random.choice(unit_types)}",
                unit_type=random.choice(unit_types),
                country=country,
                lat=random.uniform(-50, 70),
                lon=random.uniform(-150, 160),
                strength=random.randint(50, 5000),
                equipment=random.choice(equipment),
                operational_status=random.choice(statuses),
                threat_level=threat,
                classification=classification,
            )
            self._military[m.id] = m

    def _seed_incidents(self, count: int):
        inc_types = ["Piracy", "Collision", "Distress Call", "Interception", "Exclusion Zone Violation", "Armed Engagement", "Suspicious Vessel", "Emergency"]
        severities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        descriptions = [
            "Vessel broadcasting emergency distress signal — coast guard dispatched",
            "Unauthorized entry into restricted maritime exclusion zone",
            "Suspicious aircraft behavior — squawking 7700",
            "Surface contact lost — investigation ongoing",
            "Unidentified vessel refusing AIS identification requests",
            "Armed boarding attempt reported — vessel requests assistance",
            "Collision between two commercial vessels — oil spill risk",
            "Military aircraft intercepted civilian airspace without clearance",
            "Group of fast-moving small craft approaching convoy",
            "Vessel reporting engine failure in high-risk corridor",
        ]

        for _ in range(count):
            sev = random.choices(severities, weights=[20, 40, 25, 15])[0]
            inc = IncidentAsset(
                id=f"INC-{uuid.uuid4().hex[:8].upper()}",
                incident_type=random.choice(inc_types),
                severity=sev,
                lat=random.uniform(-50, 70),
                lon=random.uniform(-150, 160),
                description=random.choice(descriptions),
                reported_by=random.choice(["NAVCOORD", "COASTWATCH", "AIS-NET", "SIGINT", "HUMINT", "CTF-151"]),
                status=random.choice(["ACTIVE", "INVESTIGATING"]),
            )
            self._incidents[inc.id] = inc
            if sev in ("HIGH", "CRITICAL"):
                alert = Alert(
                    id=f"ALT-{inc.id}",
                    alert_type="INCIDENT",
                    severity=sev,
                    title=f"{inc.incident_type} — {sev}",
                    description=inc.description,
                    lat=inc.lat,
                    lon=inc.lon,
                    asset_id=inc.id,
                    layer="incidents",
                )
                self._alerts[alert.id] = alert

    # ── Utilities ─────────────────────────────────────────────
    @staticmethod
    def _random_name():
        names = ["ATLANTIC EAGLE", "PACIFIC STAR", "NORDIC WIND", "OCEAN TITAN",
                 "MERIDIAN", "CORAL SEA", "ZEPHYR", "POLARIS", "ENDEAVOUR",
                 "NAVIGATOR", "HORIZON", "ALBATROSS", "NEPTUNE", "TRITON",
                 "LEVIATHAN", "KRAKEN", "TEMPEST", "AURORA", "SOVEREIGN"]
        return random.choice(names)


# Import uuid at module level
import uuid
