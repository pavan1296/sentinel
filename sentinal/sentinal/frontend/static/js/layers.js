// SENTINEL — Layer Management
const Layers = (() => {
  const groups = {};
  const active = { maritime: true, aviation: true, military: true, zones: true, incidents: false, naval: false };

  const icons = {
    cargo:     mkIcon('🚢', 'mk-maritime', 28),
    tanker:    mkIcon('🛢️', 'mk-maritime', 28),
    warship:   mkIcon('⛵', 'mk-maritime', 28),
    aircraft:  mkIcon('✈️', 'mk-aviation', 26),
    mil_air:   mkIcon('🛩️', 'mk-aviation', 26),
    military:  mkIcon('🎯', 'mk-military', 26),
    naval:     mkIcon('⚓', 'mk-naval', 26),
    incident:  mkIcon('⚡', 'mk-incident', 26),
  };

  function mkIcon(emoji, cls, size) {
    return L.divIcon({
      html: `<div class="mk ${cls}" style="width:${size}px;height:${size}px">${emoji}</div>`,
      className: '', iconSize: [size, size],
      iconAnchor: [size/2, size/2], popupAnchor: [0, -size/2 - 2]
    });
  }

  function init(map) {
    ['maritime','aviation','military','zones','incidents','naval'].forEach(name => {
      groups[name] = L.layerGroup();
      if (active[name]) groups[name].addTo(map);
    });
  }

  function toggle(name) {
    const map = MapCtrl.map;
    active[name] = !active[name];
    const row = document.getElementById('lr-' + name);
    if (active[name]) {
      row.classList.add('active');
      groups[name].addTo(map);
    } else {
      row.classList.remove('active');
      map.removeLayer(groups[name]);
    }
  }

  function renderAll(data) {
    groups.maritime.clearLayers();
    groups.aviation.clearLayers();
    groups.military.clearLayers();
    groups.zones.clearLayers();
    groups.incidents.clearLayers();
    groups.naval.clearLayers();

    (data.maritime || []).forEach(v => {
      const ico = ['Frigate','Destroyer','Submarine'].includes(v.vessel_type) ? icons.warship
                : v.vessel_type === 'Tanker' ? icons.tanker : icons.cargo;
      L.marker([v.lat, v.lon], { icon: ico })
        .bindPopup(maritimePopup(v), { maxWidth: 260 })
        .on('click', () => { UI.showDetail(v, 'maritime'); MapCtrl.flyTo(v.lat, v.lon, 7); })
        .addTo(groups.maritime);
    });

    (data.aviation || []).forEach(a => {
      const ico = a.is_military ? icons.mil_air : icons.aircraft;
      L.marker([a.lat, a.lon], { icon: ico })
        .bindPopup(aviationPopup(a), { maxWidth: 260 })
        .on('click', () => { UI.showDetail(a, 'aviation'); MapCtrl.flyTo(a.lat, a.lon, 7); })
        .addTo(groups.aviation);
    });

    (data.military || []).forEach(m => {
      L.marker([m.lat, m.lon], { icon: icons.military })
        .bindPopup(militaryPopup(m), { maxWidth: 260 })
        .on('click', () => { UI.showDetail(m, 'military'); MapCtrl.flyTo(m.lat, m.lon, 7); })
        .addTo(groups.military);
    });

    (data.naval_bases || []).forEach(n => {
      L.marker([n.lat, n.lon], { icon: icons.naval })
        .bindPopup(navalPopup(n), { maxWidth: 240 })
        .on('click', () => UI.showDetail(n, 'naval'))
        .addTo(groups.naval);
    });

    (data.zones || []).forEach(z => {
      L.circle([z.lat, z.lon], {
        radius: z.radius_km * 1000,
        color: z.color, fillColor: z.color,
        fillOpacity: 0.05, weight: 1.5, dashArray: '8,6',
      })
      .bindPopup(zonePopup(z), { maxWidth: 240 })
      .addTo(groups.zones);
    });

    (data.incidents || []).forEach(i => {
      L.marker([i.lat, i.lon], { icon: icons.incident })
        .bindPopup(incidentPopup(i), { maxWidth: 260 })
        .on('click', () => { UI.showDetail(i, 'incidents'); MapCtrl.flyTo(i.lat, i.lon, 7); })
        .addTo(groups.incidents);
    });

    // Update counts
    updateCounts(data);
  }

  function updateCounts(data) {
    const counts = {
      maritime: (data.maritime || []).length,
      aviation: (data.aviation || []).length,
      military: (data.military || []).length,
      zones:    (data.zones || []).length,
      incidents:(data.incidents || []).length,
      naval:    (data.naval_bases || []).length,
    };
    Object.entries(counts).forEach(([k, v]) => {
      const el = document.getElementById('lc-' + k);
      if (el) el.textContent = v;
    });
    const total = counts.maritime + counts.aviation + counts.military;
    document.getElementById('hud-total').textContent = total;
    document.getElementById('sb-total').textContent  = total;
    document.getElementById('hud-maritime').textContent = counts.maritime;
    document.getElementById('hud-aviation').textContent = counts.aviation;
    document.getElementById('hud-military').textContent = counts.military;
    document.getElementById('sv-maritime').textContent  = counts.maritime;
    document.getElementById('sv-aviation').textContent  = counts.aviation;
    document.getElementById('sv-military').textContent  = counts.military;
    document.getElementById('sv-incidents').textContent = counts.incidents;
    document.getElementById('radar-contacts').textContent = total + ' CONTACTS';
  }

  // ── Popup templates ──────────────────────────────────────
  function row(k, v, highlight = false) {
    return `<div class="popup-row"><span class="popup-key">${k}</span><span class="popup-val${highlight?' style="color:var(--green)"':''}">${v}</span></div>`;
  }

  function maritimePopup(v) {
    return `<div class="popup-title" style="color:var(--blue)">🚢 ${v.vessel_name}</div>
      ${row('ID', v.id)} ${row('MMSI', v.mmsi)} ${row('Type', v.vessel_type)} ${row('Flag', v.flag)}
      ${row('Speed', v.speed + ' kts', true)} ${row('Heading', v.heading + '°')}
      ${row('Draft', v.draft + 'm')} ${row('Status', v.nav_status)} ${row('Destination', v.destination)}`;
  }

  function aviationPopup(a) {
    const mil = a.is_military ? ' <span style="color:var(--red)">[MIL]</span>' : '';
    return `<div class="popup-title" style="color:var(--green)">✈️ ${a.callsign}${mil}</div>
      ${row('ID', a.id)} ${row('Type', a.aircraft_type)} ${row('Country', a.country)}
      ${row('Altitude', a.altitude.toLocaleString() + ' ft', true)} ${row('Speed', a.speed + ' kts')}
      ${row('Heading', a.heading + '°')} ${row('Squawk', a.squawk)}
      ${row('Route', a.origin + ' → ' + a.destination)}`;
  }

  function militaryPopup(m) {
    const tc = { LOW:'var(--green)', MEDIUM:'var(--amber)', HIGH:'var(--orange)', CRITICAL:'var(--red)' };
    return `<div class="popup-title" style="color:var(--red)">⚔️ ${m.callsign}</div>
      ${row('ID', m.id)} ${row('Unit', m.unit_type)} ${row('Country', m.country)}
      ${row('Strength', m.strength.toLocaleString())} ${row('Equipment', m.equipment)}
      ${row('Status', m.operational_status)} <div class="popup-row"><span class="popup-key">THREAT</span>
      <span class="popup-val" style="color:${tc[m.threat_level]||'#fff'}">${m.threat_level}</span></div>
      ${row('Class.', m.classification)}`;
  }

  function navalPopup(n) {
    return `<div class="popup-title" style="color:var(--orange)">⚓ ${n.name}</div>
      ${row('Country', n.country)} ${row('Branch', n.branch)} ${row('Size', n.size)}
      ${row('Assets', n.assets_count || '?')}`;
  }

  function zonePopup(z) {
    return `<div class="popup-title" style="color:${z.color}">${z.name}</div>
      ${row('Type', z.zone_type)} ${row('Radius', z.radius_km + ' km')}
      ${row('Authority', z.issuing_authority)} ${row('Active', z.active ? 'YES' : 'NO')}`;
  }

  function incidentPopup(i) {
    const sc = { LOW:'var(--green)', MEDIUM:'var(--amber)', HIGH:'var(--orange)', CRITICAL:'var(--red)' };
    return `<div class="popup-title" style="color:var(--purple)">⚡ ${i.incident_type}</div>
      ${row('ID', i.id)} <div class="popup-row"><span class="popup-key">SEVERITY</span>
      <span class="popup-val" style="color:${sc[i.severity]||'#fff'}">${i.severity}</span></div>
      ${row('Status', i.status)} ${row('Reported by', i.reported_by)}
      <div class="popup-row"><span class="popup-key">DETAILS</span></div>
      <div style="font-size:10px;color:var(--text-dim);margin-top:4px;line-height:1.5">${i.description}</div>`;
  }

  return { init, toggle, renderAll, updateCounts };
})();

// HUD shortcuts
document.getElementById = document.getElementById.bind(document);
// Expose counts globally for HUD
window.getEl = (id) => document.getElementById(id);
