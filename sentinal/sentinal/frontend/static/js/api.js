// SENTINEL — REST API Module
const API = (() => {
  async function get(path) {
    const res = await fetch(Config.apiUrl + path);
    if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
    return res.json();
  }

  return {
    async status()       { return get('/api/v1/status'); },
    async maritime(q='') { return get('/api/v1/maritime' + q); },
    async aviation(q='') { return get('/api/v1/aviation' + q); },
    async military(q='') { return get('/api/v1/military' + q); },
    async incidents()    { return get('/api/v1/incidents'); },
    async alerts()       { return get('/api/v1/alerts'); },
    async zones()        { return get('/api/v1/zones'); },
    async navalBases()   { return get('/api/v1/naval-bases'); },
    async stats()        { return get('/api/v1/stats'); },
    async search(q, layer='') {
      return get(`/api/v1/search?q=${encodeURIComponent(q)}${layer ? '&layer='+layer : ''}`);
    },
    async heatmap(layer='all') { return get(`/api/v1/heatmap?layer=${layer}`); },

    async fetchAll() {
      try {
        const [maritime, aviation, military, incidents, zones, naval, alerts] = await Promise.all([
          this.maritime(), this.aviation(), this.military(),
          this.incidents(), this.zones(), this.navalBases(), this.alerts()
        ]);
        AppState.update({
          maritime: maritime.data,
          aviation: aviation.data,
          military: military.data,
          incidents: incidents.data,
          zones: zones.data,
          naval_bases: naval.data,
          alerts: alerts.data,
        });
        UI.notify('Data refreshed via REST API', 'system');
      } catch(e) {
        console.error('fetchAll failed:', e);
        UI.notify('REST fetch failed — check API URL', 'alert');
      }
    }
  };
})();
