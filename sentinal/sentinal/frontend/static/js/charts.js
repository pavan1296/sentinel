// SENTINEL — Charts (pure Canvas, no dependencies)
const Charts = (() => {
  let trafficData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 80 + 20));
  let lastUpdate = 0;

  function drawBarChart(canvasId, data, colors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const barW = Math.floor(w / data.length) - 1;
    const maxVal = Math.max(...data, 1);

    ctx.clearRect(0, 0, w, h);

    data.forEach((val, i) => {
      const barH = Math.floor((val / maxVal) * (h - 10));
      const x = i * (barW + 1);
      const y = h - barH;
      const color = Array.isArray(colors) ? colors[i % colors.length] : colors;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, barW, barH);
    });
  }

  function drawDistChart(canvasId, data) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const total = data.reduce((s, d) => s + d.value, 0) || 1;

    ctx.clearRect(0, 0, w, h);

    let x = 0;
    data.forEach(d => {
      const barW = Math.floor((d.value / total) * w);
      ctx.fillStyle = d.color;
      ctx.fillRect(x, 0, barW, h);
      x += barW + 1;
    });

    // Labels
    ctx.font = '9px Share Tech Mono, monospace';
    let lx = 4;
    data.forEach(d => {
      const barW = Math.floor((d.value / total) * w);
      if (barW > 30) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(d.label, lx + 4, h / 2 + 3);
      }
      lx += barW + 1;
    });
  }

  function updateAnalyticsGrid(state) {
    const grid = document.getElementById('analytics-grid');
    if (!grid) return;
    const s = state.stats || {};
    grid.innerHTML = [
      { label: 'MARITIME', value: s.maritime_count || 0, color: 'var(--blue)' },
      { label: 'AVIATION', value: s.aviation_count || 0, color: 'var(--green)' },
      { label: 'MILITARY', value: s.military_count || 0, color: 'var(--red)' },
      { label: 'INCIDENTS', value: s.incident_count || 0, color: 'var(--purple)' },
      { label: 'ALERTS', value: s.alert_count || 0, color: 'var(--amber)' },
      { label: 'THREAT', value: s.threat_score || 0, color: 'var(--orange)' },
      { label: 'ZONES', value: s.zone_count || 0, color: 'var(--amber)' },
      { label: 'UPTIME', value: formatUptime(s.uptime_s || 0), color: 'var(--cyan)' },
    ].map(item => `
      <div class="ag-cell">
        <div class="ag-label">${item.label}</div>
        <div class="ag-value" style="color:${item.color}">${item.value}</div>
      </div>`).join('');
  }

  function formatUptime(s) {
    if (s < 60)   return s + 's';
    if (s < 3600) return Math.floor(s/60) + 'm';
    return Math.floor(s/3600) + 'h ' + Math.floor((s%3600)/60) + 'm';
  }

  return {
    init() {
      // Initial draw
      drawBarChart('traffic-chart', trafficData,
        trafficData.map((v, i) => `hsl(${160 + i * 2},90%,${30 + v * 0.3}%)`));
    },
    update(state) {
      // Throttle chart updates to every 10s
      if (Date.now() - lastUpdate < 10000) {
        updateAnalyticsGrid(state);
        return;
      }
      lastUpdate = Date.now();

      // Shift traffic data
      trafficData.shift();
      const total = (state.maritime?.length||0) + (state.aviation?.length||0) + (state.military?.length||0);
      trafficData.push(Math.min(100, total));

      drawBarChart('traffic-chart', trafficData,
        trafficData.map((v, i) => `hsl(${160 + i * 2},90%,${30 + v * 0.25}%)`));

      const s = state.stats || {};
      drawDistChart('dist-chart', [
        { label: 'MARITIME', value: s.maritime_count||0, color: 'rgba(0,176,255,0.8)' },
        { label: 'AVIATION', value: s.aviation_count||0, color: 'rgba(0,230,118,0.8)' },
        { label: 'MILITARY', value: s.military_count||0, color: 'rgba(255,23,68,0.8)' },
        { label: 'INC', value: s.incident_count||0, color: 'rgba(170,0,255,0.8)' },
      ]);

      updateAnalyticsGrid(state);
    }
  };
})();
