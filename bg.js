/* ========================================
   GameHub — Animated Background v4.0
   Aurora Orbs + Star Field + Nebula Grid
   ======================================== */
(function () {
  'use strict';

  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let orbs = [], stars = [], grid = [];
  let animId;
  let t = 0;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);
    initOrbs();
    initStars();
    initGrid();
  }

  function initOrbs() {
    const configs = [
      { color: [91, 127, 255], r: 280, speed: 0.09 },
      { color: [155, 109, 255], r: 240, speed: 0.07 },
      { color: [244, 114, 182], r: 200, speed: 0.11 },
      { color: [56, 217, 192], r: 220, speed: 0.06 },
      { color: [245, 158, 66], r: 190, speed: 0.10 },
      { color: [74, 222, 128], r: 170, speed: 0.08 },
      { color: [91, 127, 255], r: 150, speed: 0.13 },
      { color: [244, 114, 182], r: 130, speed: 0.09 },
    ];
    orbs = configs.map((c, i) => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: c.r + Math.random() * 80,
      vx: (Math.random() - 0.5) * c.speed,
      vy: (Math.random() - 0.5) * c.speed * 0.8,
      color: c.color,
      phase: i * (Math.PI * 2 / configs.length) + Math.random() * 0.5,
      pulseSpeed: 0.003 + Math.random() * 0.004,
    }));
  }

  function initStars() {
    stars = [];
    const count = Math.floor((W * H) / 5500);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.3 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.004 + Math.random() * 0.010,
        bright: 0.08 + Math.random() * 0.18,
      });
    }
  }

  function initGrid() {
    // Sparse deep-space lattice for depth
    grid = [];
    const step = 80;
    for (let x = 0; x < W; x += step) {
      for (let y = 0; y < H; y += step) {
        grid.push({ x: x + (Math.random() - 0.5) * 20, y: y + (Math.random() - 0.5) * 20 });
      }
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    const isDark = !document.body.classList.contains('light');
    t = now * 0.001;

    if (isDark) {
      // Faint twinkle star field
      for (const s of stars) {
        s.phase += s.speed;
        const a = s.bright * (0.5 + Math.sin(s.phase) * 0.5);
        ctx.fillStyle = `rgba(200,215,255,${a})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sparse faint lattice grid for nebula depth
      ctx.strokeStyle = 'rgba(91,127,255,0.025)';
      ctx.lineWidth = 0.5;
      const gStep = 120;
      for (let x = 0; x < W; x += gStep) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += gStep) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    // Floating aurora orbs
    for (const o of orbs) {
      // Drift with gentle sinusoidal variation
      o.x += o.vx + Math.sin(t * 0.3 + o.phase) * 0.06;
      o.y += o.vy + Math.cos(t * 0.25 + o.phase * 1.3) * 0.05;

      // Wrap around
      if (o.x < -o.r) o.x = W + o.r;
      if (o.x > W + o.r) o.x = -o.r;
      if (o.y < -o.r) o.y = H + o.r;
      if (o.y > H + o.r) o.y = -o.r;

      o.phase += o.pulseSpeed;
      const pulse = 0.88 + Math.sin(o.phase) * 0.14;
      const alpha = isDark ? (0.10 + Math.sin(o.phase * 1.7) * 0.03) : 0.07;

      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r * pulse);
      g.addColorStop(0, `rgba(${o.color[0]},${o.color[1]},${o.color[2]},${alpha})`);
      g.addColorStop(0.45, `rgba(${o.color[0]},${o.color[1]},${o.color[2]},${alpha * 0.4})`);
      g.addColorStop(1, `rgba(${o.color[0]},${o.color[1]},${o.color[2]},0)`);

      ctx.fillStyle = g;
      ctx.beginPath();
      // Slight ellipse tilt for more organic look
      ctx.ellipse(o.x, o.y, o.r * pulse, o.r * pulse * 0.72, t * 0.06 + o.phase * 0.2, 0, Math.PI * 2);
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
