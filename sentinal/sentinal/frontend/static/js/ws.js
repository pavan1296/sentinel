// SENTINEL — WebSocket Module
const WS = (() => {
  let ws = null;
  let reconnectTimer = null;
  let reconnectDelay = 2000;
  let pingInterval = null;
  let connected = false;

  function setStatus(s) {
    connected = s === 'connected';
    const el = document.getElementById('hud-ws');
    const chip = document.getElementById('chip-ws');
    const pill = document.getElementById('hud-ws-pill');
    if (el) el.textContent = s.toUpperCase();
    if (chip) {
      const dot = chip.querySelector('.dot');
      dot.className = 'dot blink ' + (connected ? 'green' : 'amber');
      chip.innerHTML = `<span class="dot ${connected ? 'green' : 'amber'} ${connected ? '' : 'blink'}"></span>${connected ? 'LIVE' : s.toUpperCase()}`;
    }
  }

  function connect() {
    try {
      ws = new WebSocket(Config.wsUrl);
    } catch(e) {
      setStatus('offline');
      scheduleReconnect();
      return;
    }

    setStatus('connecting');

    ws.onopen = () => {
      setStatus('connected');
      reconnectDelay = 2000;
      clearTimeout(reconnectTimer);
      UI.notify('WebSocket connected — live feed active', 'system');

      // Keep-alive ping
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        handleMessage(msg);
      } catch(e) { /* ignore */ }
    };

    ws.onclose = () => {
      setStatus('offline');
      clearInterval(pingInterval);
      scheduleReconnect();
    };

    ws.onerror = () => {
      setStatus('error');
      ws.close();
    };
  }

  function handleMessage(msg) {
    if (msg.type === 'pong') return;

    if (msg.type === 'init' || msg.type === 'update') {
      AppState.update(msg);
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
      connect();
    }, reconnectDelay);
    setStatus('reconnecting');
  }

  return {
    connect,
    reconnect() {
      if (ws) ws.close();
      reconnectDelay = 2000;
      connect();
      UI.notify('Reconnecting WebSocket...', 'system');
    },
    get connected() { return connected; }
  };
})();
