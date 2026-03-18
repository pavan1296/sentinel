// SENTINEL — Radar Animation
const Radar = (() => {
  let angle = 0;
  let canvas, ctx;
  let blips = [];
  let totalContacts = 0;

  function init() {
    canvas = document.getElementById('radar-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    animate();
  }

  function animate() {
    if (!ctx) return;
    draw();
    angle = (angle + 2.5) % 360;
    requestAnimationFrame(animate);
  }

  function draw() {
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 4;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(3,10,20,0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Grid circles
    [0.25, 0.5, 0.75, 1].forEach(scale => {
      ctx.strokeStyle = `rgba(0,176,255,${0.06 + scale * 0.04})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.strokeStyle = 'rgba(0,176,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let a = 0; a < 360; a += 45) {
      const rad = a * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(rad), cy + r * Math.sin(rad));
      ctx.stroke();
    }

    // Sweep
    const sweepRad = angle * Math.PI / 180;
    const trail = 60; // degrees
    const gradient = ctx.createConicalGradient
      ? null : buildSweepGradient(cx, cy, sweepRad, trail, r);
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(sweepRad);
    const g = ctx.createLinearGradient(0, 0, r, 0);
    g.addColorStop(0, 'rgba(0,230,118,0.7)');
    g.addColorStop(1, 'rgba(0,230,118,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, -trail * Math.PI / 180, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Blips
    blips.forEach(b => {
      const alpha = Math.max(0, 1 - (Date.now() - b.born) / 4000);
      if (alpha <= 0) return;
      ctx.fillStyle = `rgba(0,230,118,${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2);
      ctx.fill();

      if (alpha > 0.5) {
        ctx.strokeStyle = `rgba(0,230,118,${(alpha - 0.5) * 0.4})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 2 + (1 - alpha) * 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Clip to circle
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  function buildSweepGradient(cx, cy, sweepRad, trailDeg, r) {
    // Fallback for browsers without conical gradient
    return null;
  }

  function spawnBlips(count) {
    const canvas2 = document.getElementById('radar-canvas');
    if (!canvas2) return;
    const cx = canvas2.width / 2, cy = canvas2.height / 2, r = cx - 4;
    blips = blips.filter(b => Date.now() - b.born < 4000);

    for (let i = 0; i < Math.min(count, 8); i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r * 0.9;
      blips.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, born: Date.now() });
    }
  }

  return {
    init,
    update(state) {
      totalContacts = (state.maritime?.length || 0) + (state.aviation?.length || 0) + (state.military?.length || 0);
      const el = document.getElementById('radar-contacts');
      if (el) el.textContent = totalContacts + ' CONTACTS';
      spawnBlips(Math.floor(totalContacts / 10));
    }
  };
})();
