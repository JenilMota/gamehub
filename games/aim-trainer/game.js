/* =============================================
   AIM TRAINER — Neon Edition
   Click shrinking targets as fast as possible!
   60 seconds, combo multiplier, high score
   ============================================= */
(function () {
  'use strict';

  const CSS = `
    #at-wrap {
      width: 100%; height: 100%;
      position: relative; overflow: hidden;
      background: #060914; cursor: crosshair;
      user-select: none;
    }
    #at-canvas { display: block; width: 100%; height: 100%; }

    #at-hud {
      position: absolute; top: 12px; left: 0; right: 0;
      display: flex; align-items: center; justify-content: center; gap: 20px;
      pointer-events: none;
    }
    .at-hud-pill {
      background: rgba(6,9,20,0.75); backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.10); border-radius: 999px;
      padding: 5px 18px; font-family: Inter, sans-serif;
      font-size: 0.82rem; font-weight: 700; color: #eef1fa;
      display: flex; align-items: center; gap: 6px;
    }
    .at-hud-pill .val { font-size: 1.1rem; font-weight: 900; color: #f87171; }
    #at-timer-bar-wrap {
      position: absolute; bottom: 0; left: 0; right: 0; height: 4px;
      background: rgba(255,255,255,0.06);
    }
    #at-timer-bar {
      height: 100%; background: linear-gradient(90deg, #f87171, #fb923c);
      transition: width 0.1s linear;
      box-shadow: 0 0 8px rgba(248,113,113,0.6);
    }

    #at-overlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
      background: rgba(6,9,20,0.92); backdrop-filter: blur(20px);
      z-index: 20; cursor: default;
      animation: atFade 0.3s ease;
    }
    @keyframes atFade { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
    #at-overlay h2 {
      font-size: 2rem; font-weight: 900; font-family: Inter, sans-serif;
      background: linear-gradient(135deg, #f87171, #fb923c);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    #at-overlay .at-score-big {
      font-size: 3.5rem; font-weight: 900; font-family: Inter, sans-serif;
      color: #f87171; text-shadow: 0 0 30px rgba(248,113,113,0.6);
    }
    #at-overlay .at-stats {
      display: flex; gap: 24px; font-family: Inter, sans-serif;
    }
    #at-overlay .at-stat {
      text-align: center;
    }
    #at-overlay .at-stat .sval {
      display: block; font-size: 1.4rem; font-weight: 900; color: #eef1fa;
    }
    #at-overlay .at-stat .slbl {
      display: block; font-size: 0.75rem; color: #8892b0; margin-top: 2px;
    }
    #at-overlay p { color: #8892b0; font-family: Inter, sans-serif; font-size: 0.88rem; text-align: center; }
    .at-btn {
      padding: 12px 36px; border: none; border-radius: 999px; cursor: pointer;
      background: linear-gradient(135deg, #f87171, #fb923c); color: #fff;
      font-family: Inter, sans-serif; font-size: 1rem; font-weight: 900;
      box-shadow: 0 4px 20px rgba(248,113,113,0.45); transition: transform 0.15s, box-shadow 0.15s;
    }
    .at-btn:hover { transform: scale(1.07); box-shadow: 0 6px 28px rgba(248,113,113,0.65); }

    #at-combo-flash {
      position: absolute; top: 15%; left: 50%; transform: translateX(-50%);
      font-family: Inter, sans-serif; font-size: 1.4rem; font-weight: 900;
      color: #facc15; text-shadow: 0 0 20px rgba(250,204,21,0.7);
      pointer-events: none; opacity: 0; transition: opacity 0.25s;
      white-space: nowrap;
    }
    #at-combo-flash.show { opacity: 1; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
    const DURATION = 60;   // seconds
    const MAX_TARGETS = 8;
    const TARGET_COLORS = ['#f87171','#fb923c','#facc15','#4ade80','#38d9c0','#5b7fff','#a78bfa','#f472b6'];

    container.innerHTML = `
      <div id="at-wrap">
        <canvas id="at-canvas"></canvas>
        <div id="at-hud">
          <div class="at-hud-pill">🎯 <span class="val" id="at-hits">0</span> hits</div>
          <div class="at-hud-pill">⚡ <span class="val" id="at-combo">x1</span> combo</div>
          <div class="at-hud-pill">⏱ <span class="val" id="at-time">${DURATION}</span>s</div>
        </div>
        <div id="at-timer-bar-wrap"><div id="at-timer-bar" style="width:100%"></div></div>
        <div id="at-combo-flash"></div>
      </div>
    `;

    const wrap = document.getElementById('at-wrap');
    const canvas = document.getElementById('at-canvas');
    const ctx = canvas.getContext('2d');

    let W, H;
    function resize() {
      const r = wrap.getBoundingClientRect();
      W = canvas.width = r.width;
      H = canvas.height = r.height;
    }
    resize();

    let targets = [];
    let score = 0;
    let hits = 0;
    let combo = 0;
    let misses = 0;
    let timeLeft = DURATION;
    let gameActive = false;
    let animId = null;
    let lastTs = null;
    let comboFlashTimer = null;

    const hitsEl = document.getElementById('at-hits');
    const comboEl = document.getElementById('at-combo');
    const timeEl = document.getElementById('at-time');
    const timerBar = document.getElementById('at-timer-bar');
    const comboFlash = document.getElementById('at-combo-flash');

    function randBetween(a, b) { return a + Math.random() * (b - a); }

    function spawnTarget() {
      const minR = isMobile ? 20 : 16;
      const maxR = isMobile ? 48 : 42;
      const r = randBetween(minR, maxR);
      const margin = 60;
      const x = randBetween(margin + r, W - margin - r);
      const y = randBetween(60 + r, H - 20 - r);
      const color = TARGET_COLORS[Math.floor(Math.random() * TARGET_COLORS.length)];
      const lifespan = randBetween(1.8, 3.5);
      targets.push({ x, y, r, maxR: r, color, age: 0, lifespan, hit: false });
    }

    function drawTarget(t) {
      const progress = t.age / t.lifespan; // 0 = new, 1 = dead
      const currentR = t.r * (1 - progress * 0.7); // shrinks to 30% of original
      if (currentR <= 2) return;
      const alpha = 1 - progress * 0.3;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Outer glow ring
      ctx.beginPath();
      ctx.arc(t.x, t.y, currentR + 4, 0, Math.PI * 2);
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * 0.3;
      ctx.stroke();

      // Main circle
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(t.x, t.y, currentR, 0, Math.PI * 2);
      ctx.fillStyle = t.color + '33'; // 20% fill
      ctx.fill();
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(t.x, t.y, currentR * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Shrinking arc indicator
      ctx.beginPath();
      ctx.arc(t.x, t.y, currentR - 2, -Math.PI / 2, -Math.PI / 2 + (1 - progress) * Math.PI * 2);
      ctx.strokeStyle = t.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * 0.6;
      ctx.stroke();

      ctx.restore();
    }

    function spawnHitEffect(x, y, color) {
      // Small particle burst drawn immediately
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const len = 18 + Math.random() * 14;
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 2;
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
        ctx.stroke();
        ctx.restore();
      }
    }

    function updateHUD() {
      hitsEl.textContent = hits;
      comboEl.textContent = `x${Math.max(1, combo)}`;
      timeEl.textContent = Math.ceil(timeLeft);
      timerBar.style.width = (timeLeft / DURATION * 100) + '%';
      timerBar.style.background = timeLeft < 10
        ? 'linear-gradient(90deg,#f87171,#f87171)'
        : 'linear-gradient(90deg,#f87171,#fb923c)';
    }

    function showComboFlash(c) {
      if (c < 3) return;
      comboFlash.textContent = c >= 10 ? `🔥 ${c}x COMBO!` : c >= 5 ? `⚡ ${c}x COMBO!` : `✨ ${c}x COMBO`;
      comboFlash.classList.add('show');
      clearTimeout(comboFlashTimer);
      comboFlashTimer = setTimeout(() => comboFlash.classList.remove('show'), 800);
    }

    function loop(ts) {
      if (!gameActive) return;
      if (lastTs === null) lastTs = ts;
      const dt = Math.min((ts - lastTs) / 1000, 0.1);
      lastTs = ts;

      timeLeft -= dt;
      if (timeLeft <= 0) {
        timeLeft = 0;
        endGame();
        return;
      }

      // Spawn targets
      while (targets.length < MAX_TARGETS && Math.random() < 0.04) spawnTarget();
      if (targets.length === 0) spawnTarget();

      // Age & remove expired
      targets = targets.filter(t => {
        t.age += dt;
        if (t.age >= t.lifespan) {
          combo = 0;
          misses++;
          return false;
        }
        return true;
      });

      // Draw
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#060914';
      ctx.fillRect(0, 0, W, H);

      // Star field (subtle)
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let s = 0; s < 60; s++) {
        const sx = (s * 137.5 * W) % W;
        const sy = (s * 97.3 * H) % H;
        ctx.fillRect(sx, sy, 1, 1);
      }

      targets.forEach(t => drawTarget(t));
      updateHUD();
      animId = requestAnimationFrame(loop);
    }

    function handleClick(e) {
      if (!gameActive) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
      const my = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top;

      let hitSomething = false;
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i];
        const progress = t.age / t.lifespan;
        const currentR = t.r * (1 - progress * 0.7);
        const dist = Math.hypot(mx - t.x, my - t.y);
        if (dist <= currentR + 4) {
          // Hit!
          const sizeBonus = Math.floor((1 - progress) * 50);       // smaller remaining = more pts
          const comboBonus = Math.max(1, combo);
          const pts = (10 + sizeBonus) * comboBonus;
          score += pts;
          hits++;
          combo++;
          scoreEl.textContent = score;
          setHighScore(score);
          spawnHitEffect(t.x, t.y, t.color);
          targets.splice(i, 1);
          hitSomething = true;
          showComboFlash(combo);
          vibrate?.(8);

          // Score popup
          const pop = document.createElement('div');
          pop.style.cssText = `position:absolute;left:${mx-20}px;top:${my-20}px;font-family:Inter,sans-serif;
            font-weight:900;font-size:1rem;color:#facc15;pointer-events:none;
            text-shadow:0 0 12px rgba(250,204,21,0.7);animation:atPop 0.6s ease forwards;`;
          pop.textContent = '+' + pts;
          wrap.appendChild(pop);
          setTimeout(() => pop.remove(), 600);
          break;
        }
      }
      if (!hitSomething) {
        combo = 0;
        misses++;
      }
    }

    function endGame() {
      gameActive = false;
      cancelAnimationFrame(animId);
      const acc = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;
      showOverlay(score, hits, acc);
    }

    function showOverlay(finalScore, finalHits, acc) {
      const old = document.getElementById('at-overlay');
      if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'at-overlay';
      ov.innerHTML = `
        <h2>⏱️ Time's Up!</h2>
        <div class="at-score-big">${finalScore.toLocaleString()}</div>
        <div class="at-stats">
          <div class="at-stat"><span class="sval">${finalHits}</span><span class="slbl">Hits</span></div>
          <div class="at-stat"><span class="sval">${acc}%</span><span class="slbl">Accuracy</span></div>
          <div class="at-stat"><span class="sval">${misses}</span><span class="slbl">Misses</span></div>
        </div>
        <button class="at-btn" id="at-restart">Play Again</button>
      `;
      wrap.appendChild(ov);
      document.getElementById('at-restart').addEventListener('click', () => {
        ov.remove();
        startGame();
      });
    }

    function startGame() {
      targets = [];
      score = 0; hits = 0; combo = 0; misses = 0;
      timeLeft = DURATION;
      gameActive = true;
      scoreEl.textContent = 0;
      lastTs = null;
      animId = requestAnimationFrame(loop);
    }

    // Inject keyframe animation for score popups
    const animStyle = document.createElement('style');
    animStyle.textContent = `@keyframes atPop { 0% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-40px) scale(0.8); } }`;
    document.head.appendChild(animStyle);

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('touchstart', handleClick, { passive: false });

    showOverlay(0, 0, 0); // show start overlay
    // Override the overlay for "start" state
    const startOv = document.getElementById('at-overlay');
    if (startOv) {
      startOv.innerHTML = `
        <h2>🎯 Aim Trainer</h2>
        <p>Click the shrinking circles as fast as you can!<br>Smaller targets = more points · Combos = multiplier</p>
        <button class="at-btn" id="at-restart">Start — 60s</button>
      `;
      document.getElementById('at-restart').addEventListener('click', () => {
        startOv.remove();
        startGame();
      });
    }

    window.currentGameCleanup = () => {
      gameActive = false;
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('touchstart', handleClick);
      styleEl.remove();
      animStyle.remove();
    };
  };
})();
