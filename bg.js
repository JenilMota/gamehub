/* ========================================
   GameHub — Animated Background v3.0
   Aurora Orbs + Star Field
   ======================================== */
(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let orbs = [], stars = [];
  let animId;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    initOrbs();
    initStars();
  }

  function initOrbs() {
    const colors = [
      [91,127,255], [155,109,255], [244,114,182],
      [56,217,192], [245,158,66], [74,222,128]
    ];
    orbs = colors.map((c, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 200 + Math.random() * 250,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.10,
      color: c,
      phase: i * (Math.PI * 2 / colors.length),
    }));
  }

  function initStars() {
    stars = [];
    const count = Math.floor((W * H) / 6000);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.4 + Math.random() * 1.0,
        phase: Math.random() * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.012,
      });
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    const isDark = !document.body.classList.contains('light');
    const t = now * 0.001;

    if (isDark) {
      // Faint star field
      for (const s of stars) {
        s.phase += s.speed;
        const a = 0.15 + Math.sin(s.phase) * 0.12;
        ctx.fillStyle = `rgba(200,210,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Floating aurora orbs
    for (const o of orbs) {
      o.x += o.vx;
      o.y += o.vy;
      if (o.x < -o.r) o.x = W + o.r;
      if (o.x > W + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = H + o.r;
      if (o.y > H + o.r) o.y = -o.r;

      o.phase += 0.005;
      const pulse = 0.9 + Math.sin(o.phase) * 0.12;
      const alpha  = isDark ? 0.12 : 0.10;

      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * pulse);
      g.addColorStop(0, `rgba(${o.color[0]},${o.color[1]},${o.color[2]},${alpha})`);
      g.addColorStop(1, `rgba(${o.color[0]},${o.color[1]},${o.color[2]},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, o.r * pulse, o.r * pulse * 0.7, t * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    animId = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animId);
    resize();
    animId = requestAnimationFrame(draw);
  });

  resize();
  animId = requestAnimationFrame(draw);
})();
