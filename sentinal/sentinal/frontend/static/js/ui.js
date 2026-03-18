// SENTINEL — UI Controller
const UI = (() => {
  let settingsOpen = false;
  let currentTab = 'feed';
  let notifQueue = [];

  return {
    updateStats(state) {
      const stats = state.stats || {};

      // Threat meter
      const score = stats.threat_score || 0;
      const meter = document.getElementById('threat-meter');
      if (meter) {
        meter.innerHTML = '';
        for (let i = 0; i < 10; i++) {
          const seg = document.createElement('div');
          seg.className = 'threat-seg';
          if (i < score) {
            if (score <= 3)      seg.classList.add('lit-green');
            else if (score <= 5) seg.classList.add('lit-amber');
            else if (score <= 8) seg.classList.add('lit-orange');
            else                  seg.classList.add('lit-red');
          }
          meter.appendChild(seg);
        }
      }

      // Threat labels
      const labelEl   = document.getElementById('threat-score-label');
      const bannerEl  = document.getElementById('threat-text');
      let label = 'LOW';
      let color = 'var(--green)';
      if (score > 8)      { label = 'CRITICAL'; color = 'var(--red)'; }
      else if (score > 5) { label = 'HIGH';     color = 'var(--orange)'; }
      else if (score > 2) { label = 'ELEVATED'; color = 'var(--amber)'; }

      if (labelEl)  { labelEl.textContent = label; labelEl.style.color = color; }
      if (bannerEl) { bannerEl.textContent = label; bannerEl.style.color = color; }

      // Status bar
      const clients = document.getElementById('sb-clients');
      if (clients && stats.uptime_s !== undefined) {
        clients.textContent = WS.connected ? '1' : '0';
      }
    },

    showDetail(item, layer) {
      const body = document.getElementById('detail-body');
      if (!body) return;

      const skip = ['_layer', 'layer'];
      const highlight = ['speed', 'altitude', 'threat_level', 'severity'];
      const formatKey = k => k.replace(/_/g, ' ').toUpperCase();

      const rows = Object.entries(item)
        .filter(([k]) => !skip.includes(k) && typeof item[k] !== 'object')
        .map(([k, v]) => {
          const isHighlight = highlight.includes(k);
          return `<div class="detail-row">
            <span class="detail-key">${formatKey(k)}</span>
            <span class="detail-val ${isHighlight ? 'detail-highlight' : ''}">${v}</span>
          </div>`;
        }).join('');

      const layerColors = { maritime:'var(--blue)', aviation:'var(--green)', military:'var(--red)', incidents:'var(--purple)', naval:'var(--orange)' };
      const color = layerColors[layer] || 'var(--cyan)';
      const name = item.vessel_name || item.callsign || item.unit_name || item.name || item.id;

      body.innerHTML = `
        <div style="padding:6px 12px 8px;border-bottom:1px solid var(--border2)">
          <div style="font-family:Orbitron,sans-serif;font-size:11px;font-weight:600;color:${color}">${name}</div>
          <div style="font-family:Share Tech Mono,monospace;font-size:9px;color:var(--text-muted);margin-top:2px">${(layer||'').toUpperCase()}</div>
        </div>
        ${rows}`;
    },

    clearDetail() {
      const body = document.getElementById('detail-body');
      if (body) body.innerHTML = '<div class="detail-empty">Click a marker or feed item to inspect</div>';
    },

    switchTab(tab) {
      currentTab = tab;
      ['feed', 'alerts', 'stats'].forEach(t => {
        const btn = document.getElementById('tab-' + t);
        const panel = document.getElementById(t === 'feed' ? 'feed-list' : t === 'alerts' ? 'alerts-list' : 'stats-panel');
        if (btn)   btn.classList.toggle('active', t === tab);
        if (panel) panel.style.display = t === tab ? 'block' : 'none';
      });
    },

    openAlerts() {
      const body = document.getElementById('modal-alerts-body');
      const alerts = AppState.get().alerts || [];
      const sc = { LOW:'low', MEDIUM:'medium', HIGH:'high', CRITICAL:'critical' };

      body.innerHTML = alerts.length === 0
        ? '<p style="font-family:Share Tech Mono,monospace;color:var(--text-muted);font-size:11px">No active alerts</p>'
        : alerts.map(a => `
          <div class="alert-item ${sc[a.severity]||'medium'}" style="margin-bottom:10px">
            <div class="alert-title">${a.title}</div>
            <div class="alert-desc">${a.description}</div>
            ${a.lat ? `<div class="alert-meta">📍 ${a.lat.toFixed(2)}°, ${a.lon.toFixed(2)}° &nbsp;|&nbsp; ${a.id}</div>` : ''}
          </div>`).join('');

      document.getElementById('modal-alerts').style.display = 'flex';
    },

    closeModal(id, event) {
      if (event.target.id === id) document.getElementById(id).style.display = 'none';
    },

    toggleSettings() {
      settingsOpen = !settingsOpen;
      const panel = document.getElementById('settings-panel');
      panel.style.display = settingsOpen ? 'flex' : 'none';
    },

    notify(msg, type = 'system', duration = 4500) {
      const area = document.getElementById('notif-area');
      const el = document.createElement('div');
      el.className = `notif ${type}`;
      el.textContent = msg;
      area.appendChild(el);

      setTimeout(() => {
        el.classList.add('notif-out');
        setTimeout(() => el.remove(), 400);
      }, duration);
    },

    exportData() {
      const state = AppState.get();
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sentinel-export-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
      a.click();
      this.notify('📦 Data exported', 'system');
    },

    initClock() {
      const tick = () => {
        const el = document.getElementById('clock-utc');
        if (el) el.textContent = new Date().toUTCString().split(' ')[4] + ' UTC';
      };
      tick();
      setInterval(tick, 1000);
    },
  };
})();
