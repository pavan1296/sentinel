// SENTINEL — Map Controller
const MapCtrl = (() => {
  let map, tileLayer, heatLayer;
  let heatmapActive = false;

  const tileDefs = {
    dark:      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    topo:      'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    terrain:   'https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.png',
  };

  function init() {
    map = L.map('map', {
      center: [20, 0], zoom: 3,
      zoomControl: true,
      attributionControl: false,
    });

    map.zoomControl.setPosition('bottomright');

    tileLayer = L.tileLayer(tileDefs.dark, { maxZoom: 18 }).addTo(map);

    // Coords
    map.on('mousemove', (e) => {
      const lat = e.latlng.lat.toFixed(4);
      const lon = e.latlng.lng.toFixed(4);
      document.getElementById('coord-lat').textContent = lat + '°';
      document.getElementById('coord-lon').textContent = lon + '°';
    });

    // Zoom HUD
    map.on('zoomend', () => {
      document.getElementById('hud-zoom').textContent = map.getZoom();
    });

    return map;
  }

  function setTile(name, btn) {
    if (!tileDefs[name]) return;
    map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(tileDefs[name], { maxZoom: 18 }).addTo(map);
    document.querySelectorAll('.tile-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
  }

  function resetView() {
    map.setView([20, 0], 3, { animate: true });
  }

  function flyTo(lat, lon, zoom = 7) {
    map.flyTo([lat, lon], zoom, { duration: 1.2 });
  }

  async function toggleHeatmap() {
    const btn = document.getElementById('btn-heat');
    heatmapActive = !heatmapActive;

    if (heatmapActive) {
      btn.classList.add('active');
      try {
        const data = await API.heatmap('all');
        // Simple density circles since leaflet.heat may not be loaded
        if (!heatLayer) {
          heatLayer = L.layerGroup();
          data.data.forEach(([lat, lon, intensity]) => {
            L.circle([lat, lon], {
              radius: 80000,
              color: 'transparent',
              fillColor: intensity > 0.8 ? '#ff1744' : intensity > 0.5 ? '#ffc400' : '#00e676',
              fillOpacity: 0.06,
            }).addTo(heatLayer);
          });
        }
        heatLayer.addTo(map);
        UI.notify('Density heatmap enabled', 'system');
      } catch(e) {
        UI.notify('Heatmap fetch failed', 'alert');
      }
    } else {
      btn.classList.remove('active');
      if (heatLayer) map.removeLayer(heatLayer);
      UI.notify('Heatmap disabled', 'system');
    }
  }

  return { init, setTile, resetView, flyTo, toggleHeatmap, get map() { return map; } };
})();
