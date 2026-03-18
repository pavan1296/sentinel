// SENTINEL — Configuration
const Config = (() => {
  let _apiUrl = 'http://localhost:8000';
  let _wsUrl  = 'ws://localhost:8000/ws';
  let _cluster     = false;
  let _trails      = false;
  let _autoscroll  = true;

  return {
    get apiUrl()    { return _apiUrl; },
    get wsUrl()     { return _wsUrl; },
    get cluster()   { return _cluster; },
    get trails()    { return _trails; },
    get autoscroll(){ return _autoscroll; },

    setApiUrl(v)    { _apiUrl = v.replace(/\/$/, ''); },
    setWsUrl(v)     { _wsUrl = v; },
    setCluster(v)   { _cluster = v; },
    setTrails(v)    { _trails = v; },
    setAutoscroll(v){ _autoscroll = v; },

    init() {
      const saved = localStorage.getItem('sentinel_cfg');
      if (saved) {
        try {
          const c = JSON.parse(saved);
          if (c.apiUrl) _apiUrl = c.apiUrl;
          if (c.wsUrl)  _wsUrl  = c.wsUrl;
          document.getElementById('setting-api-url').value = _apiUrl;
          document.getElementById('setting-ws-url').value  = _wsUrl;
        } catch(e) {}
      }
    },

    save() {
      localStorage.setItem('sentinel_cfg', JSON.stringify({ apiUrl: _apiUrl, wsUrl: _wsUrl }));
    }
  };
})();
