// SENTINEL — Feed & AppState
const AppState = (() => {
  let state = {
    maritime: [], aviation: [], military: [],
    incidents: [], zones: [], naval_bases: [], alerts: [],
    stats: {}, ts: 0,
  };
  let _lastAlertCount = 0;

  return {
    update(data) {
      if (data.maritime)    state.maritime    = data.maritime;
      if (data.aviation)    state.aviation    = data.aviation;
      if (data.military)    state.military    = data.military;
      if (data.incidents)   state.incidents   = data.incidents;
      if (data.zones)       state.zones       = data.zones;
      if (data.naval_bases) state.naval_bases = data.naval_bases;
      if (data.alerts)      state.alerts      = data.alerts;
      if (data.stats)       state.stats       = data.stats;
      state.ts = data.ts || Date.now();

      // Update all UI components
      Layers.renderAll(state);
      Feed.render(state);
      UI.updateStats(state);
      Radar.update(state);
      Charts.update(state);

      // Alert badge
      const newAlerts = (state.alerts || []).length;
      if (newAlerts > _lastAlertCount) {
        UI.notify(`⚠ ${newAlerts - _lastAlertCount} new alert(s)`, 'alert');
      }
      _lastAlertCount = newAlerts;

      // Tick display
      const el = document.getElementById('sb-tick');
      if (el) el.textContent = new Date(state.ts).toISOString().split('T')[1].slice(0, 8);
    },
    get() { return state; },
  };
})();

// ── Feed ──────────────────────────────────────────────────────
const Feed = (() => {
  let currentFilter = 'all';
  let searchQuery   = '';
  let feedItems     = [];

  function render(state) {
    feedItems = [];
    (state.maritime  || []).slice(0, 20).forEach(v => feedItems.push({ ...v, _layer: 'maritime' }));
    (state.aviation  || []).slice(0, 20).forEach(a => feedItems.push({ ...a, _layer: 'aviation' }));
    (state.military  || []).slice(0, 15).forEach(m => feedItems.push({ ...m, _layer: 'military' }));
    (state.incidents || []).forEach(i => feedItems.push({ ...i, _layer: 'incidents' }));
    feedItems.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    renderFeed();
    renderAlerts(state.alerts || []);
  }

  function renderFeed() {
    const list = document.getElementById('feed-list');
    if (!list) return;

    let items = feedItems;
    if (currentFilter !== 'all') items = items.filter(i => i._layer === currentFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => JSON.stringify(i).toLowerCase().includes(q));
    }

    const html = items.slice(0, 50).map(item => {
      const colorMap = { maritime: '#00b0ff', aviation: '#00e676', military: '#ff1744', incidents: '#aa00ff' };
      const color = colorMap[item._layer] || '#00b0ff';
      const id    = item.vessel_name || item.callsign || item.unit_name || item.id || '';
      const desc  = getDesc(item);
      const coords = item.lat ? `${item.lat.toFixed(2)}°, ${item.lon.toFixed(2)}°` : '';
      const ts     = item.timestamp ? timeAgo(item.timestamp) : '';

      return `<div class="feed-item" style="--item-c:${color}"
          onclick="Feed.selectItem(${JSON.stringify(item).replace(/"/g,'&quot;')})">
        <div class="fi-header">
          <div class="fi-badge ${item._layer}">${item._layer.toUpperCase()}</div>
          <div class="fi-id">${id}</div>
          <div class="fi-time">${ts}</div>
        </div>
        <div class="fi-desc">${desc}</div>
        <div class="fi-coords">${coords}</div>
      </div>`;
    }).join('');

    list.innerHTML = html || '<div style="padding:16px;font-family:Share Tech Mono,monospace;font-size:10px;color:var(--text-muted);text-align:center">No results</div>';

    if (Config.autoscroll && !searchQuery) {
      list.scrollTop = 0;
    }
  }

  function renderAlerts(alerts) {
    const list = document.getElementById('alerts-list');
    const badge = document.getElementById('tab-alert-cnt');
    const mainBadge = document.getElementById('alert-badge');
    if (!list) return;

    if (badge) badge.textContent = alerts.length;
    if (mainBadge) mainBadge.textContent = alerts.length;
    document.getElementById('alert-badge').style.display = alerts.length ? 'flex' : 'none';

    const sc = { LOW:'low', MEDIUM:'medium', HIGH:'high', CRITICAL:'critical' };
    list.innerHTML = alerts.length === 0
      ? '<div style="padding:16px;font-family:Share Tech Mono,monospace;font-size:10px;color:var(--text-muted);text-align:center">No active alerts</div>'
      : alerts.map(a => `
        <div class="alert-item ${sc[a.severity]||'medium'}">
          <div class="alert-title">${a.title || a.alert_type}</div>
          <div class="alert-desc">${a.description}</div>
          <div class="alert-meta">${a.id} &nbsp;|&nbsp; ${timeAgo(a.timestamp)}</div>
        </div>`).join('');
  }

  function getDesc(item) {
    if (item._layer === 'maritime') {
      return `${item.vessel_type || ''} | ${item.flag || ''} | ${item.speed || 0}kts → ${item.destination || ''}`;
    } else if (item._layer === 'aviation') {
      return `${item.aircraft_type || ''} | ALT:${(item.altitude||0).toLocaleString()}ft | SPD:${item.speed||0}kts`;
    } else if (item._layer === 'military') {
      return `${item.unit_type || ''} | ${item.country || ''} | ${item.operational_status || ''}`;
    } else {
      return item.description || 'Incident reported';
    }
  }

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5)  return 'just now';
    if (diff < 60) return diff + 's';
    if (diff < 3600) return Math.floor(diff/60) + 'm';
    return Math.floor(diff/3600) + 'h';
  }

  return {
    render,
    renderFeed,
    setFilter(f) {
      currentFilter = f;
      document.querySelectorAll('.qf-btn').forEach(b => b.classList.remove('active'));
      const btn = document.getElementById('qf-' + f);
      if (btn) btn.classList.add('active');
      renderFeed();
    },
    search(q) {
      searchQuery = q;
      document.getElementById('search-clear').style.display = q ? 'block' : 'none';
      renderFeed();
    },
    clearSearch() {
      searchQuery = '';
      document.getElementById('search-input').value = '';
      document.getElementById('search-clear').style.display = 'none';
      renderFeed();
    },
    selectItem(item) {
      UI.showDetail(item, item._layer);
      if (item.lat && item.lon) MapCtrl.flyTo(item.lat, item.lon, 7);
    }
  };
})();
