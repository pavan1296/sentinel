// SENTINEL — Boot Sequence & App Init
(async () => {
  const logEl   = document.getElementById('boot-log');
  const barEl   = document.getElementById('boot-bar');
  const bootEl  = document.getElementById('boot-screen');
  const appEl   = document.getElementById('app');

  const lines = [
    { text: 'Initializing SENTINEL core systems...', cls: 'wait', delay: 200 },
    { text: 'Loading cryptographic modules...', cls: 'wait', delay: 300 },
    { text: 'Connecting to intelligence feed servers...', cls: 'wait', delay: 400 },
    { text: 'AIS maritime receiver: ONLINE', cls: 'ok', delay: 300 },
    { text: 'ADS-B aviation receiver: ONLINE', cls: 'ok', delay: 250 },
    { text: 'Military SIGINT feed: ONLINE', cls: 'ok', delay: 300 },
    { text: 'Exclusion zone database loaded (7 zones)', cls: 'ok', delay: 200 },
    { text: 'Naval base registry loaded (10 bases)', cls: 'ok', delay: 200 },
    { text: 'Threat assessment engine: READY', cls: 'ok', delay: 300 },
    { text: 'WebSocket relay: CONNECTING...', cls: 'wait', delay: 200 },
    { text: 'Map renderer: INITIALIZED', cls: 'ok', delay: 250 },
    { text: 'All systems nominal. Launching dashboard...', cls: 'ok', delay: 100 },
  ];

  let progress = 0;
  for (let i = 0; i < lines.length; i++) {
    const { text, cls, delay } = lines[i];
    await sleep(delay);
    const div = document.createElement('div');
    div.className = 'boot-log-line ' + cls;
    div.textContent = text;
    logEl.appendChild(div);
    logEl.scrollTop = logEl.scrollHeight;
    progress = Math.round(((i + 1) / lines.length) * 100);
    barEl.style.width = progress + '%';
  }

  await sleep(400);

  // Fade out boot screen
  bootEl.style.transition = 'opacity 0.5s';
  bootEl.style.opacity = '0';
  await sleep(500);
  bootEl.style.display = 'none';
  appEl.style.display = 'flex';
  appEl.style.opacity = '0';
  appEl.style.transition = 'opacity 0.4s';
  requestAnimationFrame(() => { appEl.style.opacity = '1'; });

  // ── Initialize App ──────────────────────────────────────
  Config.init();
  UI.initClock();

  // Init map
  const map = MapCtrl.init();

  // Init layers (attach to map)
  Layers.init(map);

  // Init radar animation
  Radar.init();

  // Init charts
  Charts.init();

  // Connect WebSocket
  WS.connect();

  // Fallback: load via REST if WS doesn't connect within 4s
  setTimeout(async () => {
    if (!WS.connected) {
      UI.notify('WS offline — fetching via REST API', 'alert');
      await API.fetchAll();
    }
  }, 4000);

  // Periodically refresh analytics
  setInterval(() => {
    Charts.update(AppState.get());
  }, 15000);

  // API status check
  try {
    const status = await API.status();
    const el = document.getElementById('sb-api-status');
    if (el) el.innerHTML = `API <span class="sb-val" style="color:var(--green)">ONLINE</span>`;
    const clients = document.getElementById('sb-clients');
    if (clients && status.connected_clients !== undefined) {
      clients.textContent = status.connected_clients;
    }
  } catch(e) {
    const el = document.getElementById('sb-api-status');
    if (el) el.innerHTML = `API <span class="sb-val" style="color:var(--red)">OFFLINE</span>`;
    UI.notify('Backend API unreachable — running in demo mode', 'alert');

    // Load demo data when API is offline
    setTimeout(loadDemoData, 500);
  }

  // Periodic API status ping
  setInterval(async () => {
    try {
      const st = await API.status();
      const el = document.getElementById('sb-api-status');
      if (el) el.innerHTML = `API <span class="sb-val" style="color:var(--green)">ONLINE</span>`;
    } catch(e) {}
  }, 30000);

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
})();

// ── Demo data (used when API is offline for standalone preview) ────
function loadDemoData() {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri  = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = arr => arr[ri(0, arr.length - 1)];

  const maritime = Array.from({ length: 40 }, (_, i) => ({
    id: 'V-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
    mmsi: String(ri(100000000, 999999999)),
    vessel_name: `MV ${pick(['ATLANTIC EAGLE','PACIFIC STAR','NORDIC WIND','CORAL SEA','HORIZON','ALBATROSS'])}`,
    vessel_type: pick(['Cargo','Tanker','Container','Frigate','Destroyer']),
    flag: pick(['US','CN','RU','GB','FR','DE','JP','SG']),
    lat: rnd(-60, 70), lon: rnd(-170, 170),
    speed: +rnd(2, 20).toFixed(1), heading: ri(0, 359),
    course: ri(0, 359), draft: +rnd(3, 18).toFixed(1),
    nav_status: pick(['UNDERWAY','ANCHORED']),
    destination: pick(['ROTTERDAM','SINGAPORE','DUBAI','HAMBURG']),
    timestamp: Date.now() - ri(0, 60000),
  }));

  const aviation = Array.from({ length: 35 }, (_, i) => ({
    id: 'A-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
    callsign: pick(['UAL','DAL','BAW','DLH']) + ri(100, 9999),
    aircraft_type: pick(['B737','A320','B777','C-130','F-16','F-35','P-8']),
    registration: 'N' + ri(10000, 99999),
    country: pick(['USA','UK','France','Germany','Russia','China']),
    lat: rnd(-55, 75), lon: rnd(-170, 170),
    altitude: ri(5000, 42000), speed: ri(250, 850), heading: ri(0, 359),
    vertical_rate: ri(-500, 500), squawk: String(ri(1000, 7777)).padStart(4, '0'),
    origin: pick(['JFK','LHR','CDG','DXB']), destination: pick(['SIN','FRA','HND','SYD']),
    is_military: Math.random() < 0.3,
    timestamp: Date.now() - ri(0, 60000),
  }));

  const military = Array.from({ length: 18 }, () => ({
    id: 'M-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
    callsign: pick(['EAGLE','SHARK','RAVEN','HAWK','COBRA']) + '-' + ri(1, 9),
    unit_name: pick(['USA Armored Brigade','RUS Naval Squadron','GBR Special Forces','CHN Air Defense']),
    unit_type: pick(['Armored Brigade','Infantry Battalion','Special Forces','Naval Squadron']),
    country: pick(['USA','UK','Russia','China','France','Iran']),
    lat: rnd(-50, 70), lon: rnd(-150, 160),
    strength: ri(100, 5000),
    equipment: pick(['M1A2 Abrams','T-90A','Challenger 2','Type 99']),
    operational_status: pick(['ACTIVE','STANDBY','DEPLOYED']),
    threat_level: pick(['LOW','MEDIUM','HIGH','CRITICAL']),
    classification: pick(['FRIENDLY','HOSTILE','UNKNOWN','NEUTRAL']),
    timestamp: Date.now() - ri(0, 60000),
  }));

  const incidents = Array.from({ length: 6 }, () => ({
    id: 'INC-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
    incident_type: pick(['Piracy','Distress Call','Zone Violation','Interception']),
    severity: pick(['LOW','MEDIUM','HIGH','CRITICAL']),
    lat: rnd(-50, 70), lon: rnd(-150, 160),
    description: pick(['Vessel requesting emergency assistance', 'Unauthorized zone entry detected', 'Suspicious aircraft behavior', 'Armed boarding attempt reported']),
    reported_by: pick(['NAVCOORD','CTF-151','COASTWATCH','AIS-NET']),
    status: 'ACTIVE',
    timestamp: Date.now() - ri(0, 120000),
  }));

  const zones = [
    { id:'EZ-001', name:'South China Sea — Zone Alpha', lat:14, lon:114, radius_km:450, zone_type:'RESTRICTED', color:'#ff1744', active:true, issuing_authority:'PLAN' },
    { id:'EZ-002', name:'Black Sea Exclusion Zone', lat:43, lon:33, radius_km:300, zone_type:'DANGER', color:'#ff6d00', active:true, issuing_authority:'RUS-NAVY' },
    { id:'EZ-003', name:'Gulf of Aden Patrol Zone', lat:12, lon:45, radius_km:380, zone_type:'PATROL', color:'#ffc400', active:true, issuing_authority:'CTF-151' },
    { id:'EZ-004', name:'Persian Gulf Watch Zone', lat:26, lon:55, radius_km:280, zone_type:'WATCH', color:'#ffc400', active:true, issuing_authority:'NAVCENT' },
    { id:'EZ-005', name:'Arctic Operations Zone', lat:75, lon:15, radius_km:600, zone_type:'MILITARY', color:'#aa00ff', active:true, issuing_authority:'NATO' },
  ];

  const naval_bases = [
    { id:'NB-001', name:'Naval Station Norfolk', country:'USA', lat:36.94, lon:-76.32, size:'MAJOR', branch:'NAVY', assets_count:75 },
    { id:'NB-002', name:'Yokosuka Naval Base', country:'USA/JPN', lat:35.29, lon:139.67, size:'MAJOR', branch:'JOINT', assets_count:48 },
    { id:'NB-003', name:'Diego Garcia', country:'GBR/USA', lat:-7.31, lon:72.41, size:'MAJOR', branch:'JOINT', assets_count:60 },
    { id:'NB-004', name:'Changi Naval Base', country:'SGP', lat:1.37, lon:104.00, size:'MAJOR', branch:'NAVY', assets_count:28 },
    { id:'NB-005', name:'Vladivostok Pacific Fleet', country:'RUS', lat:43.10, lon:131.90, size:'MAJOR', branch:'NAVY', assets_count:55 },
    { id:'NB-006', name:'Tartus Naval Facility', country:'RUS', lat:34.90, lon:35.87, size:'MEDIUM', branch:'NAVY', assets_count:12 },
    { id:'NB-007', name:'Rota Naval Base', country:'ESP/USA', lat:36.63, lon:-6.35, size:'MAJOR', branch:'JOINT', assets_count:32 },
    { id:'NB-008', name:'RNAS Culdrose', country:'GBR', lat:50.08, lon:-5.26, size:'MEDIUM', branch:'AIR_FORCE', assets_count:22 },
  ];

  const alerts = incidents.filter(i => ['HIGH','CRITICAL'].includes(i.severity)).map(i => ({
    id: 'ALT-' + i.id, alert_type: 'INCIDENT', severity: i.severity,
    title: i.incident_type + ' — ' + i.severity, description: i.description,
    lat: i.lat, lon: i.lon, asset_id: i.id, layer: 'incidents',
    timestamp: i.timestamp, acknowledged: false,
  }));

  const criticals = incidents.filter(i => i.severity === 'CRITICAL').length;
  const highs     = incidents.filter(i => i.severity === 'HIGH').length;

  AppState.update({
    maritime, aviation, military, incidents, zones, naval_bases, alerts,
    stats: {
      maritime_count: maritime.length, aviation_count: aviation.length,
      military_count: military.length, incident_count: incidents.length,
      alert_count: alerts.length, naval_base_count: naval_bases.length,
      zone_count: zones.length,
      threat_score: Math.min(10, criticals * 3 + highs),
      tick: 0, uptime_s: 0,
    }
  });

  // Simulate live updates in demo mode
  setInterval(() => {
    maritime.forEach(v => {
      const r = v.heading * Math.PI / 180;
      v.lat += Math.cos(r) * v.speed * 0.00005;
      v.lon += Math.sin(r) * v.speed * 0.00005;
      v.heading = (v.heading + (Math.random() * 6 - 3)) % 360;
      v.timestamp = Date.now();
    });
    aviation.forEach(a => {
      const r = a.heading * Math.PI / 180;
      a.lat += Math.cos(r) * a.speed * 0.0001;
      a.lon += Math.sin(r) * a.speed * 0.0001;
      a.heading = (a.heading + (Math.random() * 8 - 4)) % 360;
      a.timestamp = Date.now();
    });
    AppState.update({ maritime, aviation, military, incidents, zones, naval_bases, alerts,
      stats: { maritime_count: maritime.length, aviation_count: aviation.length, military_count: military.length,
        incident_count: incidents.length, alert_count: alerts.length, naval_base_count: naval_bases.length,
        zone_count: zones.length, threat_score: Math.min(10, criticals * 3 + highs), tick: Date.now(), uptime_s: 0 }
    });
  }, 3000);

  UI.notify('Demo mode — running with simulated data', 'system');
}
