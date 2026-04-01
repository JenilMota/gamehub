/* =============================================
   STACKER — Neon Edition
   Stack the moving block with perfect timing!
   ============================================= */
(function () {
  'use strict';

  const CSS = `
    #st-wrap {
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: #060914; position: relative; overflow: hidden;
    }
    #st-canvas { display: block; border-radius: 12px; touch-action: none; }

    #st-overlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 14px;
      background: rgba(6,9,20,0.92); backdrop-filter: blur(20px);
      z-index: 10; border-radius: 12px;
      animation: stFade 0.3s ease;
    }
    @keyframes stFade { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
    #st-overlay h2 {
      font-size: 2rem; font-weight: 900; font-family: Inter, sans-serif;
      background: linear-gradient(135deg, #fb923c, #facc15);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    #st-overlay .st-score-big {
      font-size: 3.5rem; font-weight: 900; font-family: Inter, sans-serif;
      color: #facc15; text-shadow: 0 0 30px rgba(250,204,21,0.6);
    }
    #st-overlay p { color: #8892b0; font-family: Inter, sans-serif; font-size: 0.9rem; text-align: center; }
    .st-btn {
      padding: 12px 36px; border: none; border-radius: 999px; cursor: pointer;
      background: linear-gradient(135deg, #fb923c, #facc15); color: #060914;
      font-family: Inter, sans-serif; font-size: 1rem; font-weight: 900;
      box-shadow: 0 4px 20px rgba(251,146,60,0.5); transition: transform 0.15s, box-shadow 0.15s;
    }
    .st-btn:hover { transform: scale(1.07); box-shadow: 0 6px 28px rgba(251,146,60,0.65); }

    #st-hint {
      position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
      font-family: Inter, sans-serif; font-size: 0.78rem; color: rgba(255,255,255,0.3);
      white-space: nowrap; pointer-events: none;
    }
    #st-perfect {
      position: absolute; top: 20%; left: 50%; transform: translateX(-50%);
      font-family: Inter, sans-serif; font-size: 1.6rem; font-weight: 900;
      color: #facc15; text-shadow: 0 0 24px rgba(250,204,21,0.8);
      pointer-events: none; opacity: 0; transition: opacity 0.3s;
      white-space: nowrap;
    }
    #st-perfect.show { opacity: 1; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
    container.innerHTML = `
      <div id="st-wrap">
        <canvas id="st-canvas"></canvas>
        <div id="st-hint">SPACE / TAP to place block</div>
        <div id="st-perfect">✨ PERFECT!</div>
      </div>
    `;

    const wrap = document.getElementById('st-wrap');
    const canvas = document.getElementById('st-canvas');
    const ctx = canvas.getContext('2d');
    const perfectEl = document.getElementById('st-perfect');

    const COLS = 9;
    const VISIBLE_ROWS = 14;
    const CELL = Math.min(Math.floor(Math.min(container.clientWidth * 0.75, container.clientHeight * 0.75) / COLS), 42);
    canvas.width = COLS * CELL;
    canvas.height = VISIBLE_ROWS * CELL;

    const COLORS = [
      '#5b7fff','#9b6dff','#f472b6','#38d9c0',
      '#fb923c','#facc15','#4ade80','#f87171',
      '#22d3ee','#a78bfa'
    ];

    let placed = [];       // [{col, width}] bottom = index 0
    let mover = { pos: 0, width: 0, dir: 1 }; // pos = float column
    let speed = 0.04;      // cells per frame at 60fps
    let score = 0;
    let gameActive = false;
    let animId = null;
    let lastTs = 0;
    let perfectTimer = null;

    function startGame() {
      placed = [];
      score = 0;
      speed = 0.04;
      gameActive = true;
      scoreEl.textContent = 0;
      // Place first anchor block at center bottom
      const w = 4;
      placed.push({ col: Math.floor((COLS - w) / 2), width: w });
      spawnMover();
      lastTs = performance.now();
      animId = requestAnimationFrame(loop);
    }

    function spawnMover() {
      const w = placed[placed.length - 1].width;
      mover = { pos: 0, width: w, dir: 1 };
    }

    function getColor(idx) {
      return COLORS[idx % COLORS.length];
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background
      ctx.fillStyle = '#060914';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid lines (subtle)
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, canvas.height); ctx.stroke();
      }
      for (let r = 0; r <= VISIBLE_ROWS; r++) {
        ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(canvas.width, r * CELL); ctx.stroke();
      }

      // Draw placed blocks (placed[0] = bottom row = VISIBLE_ROWS-1)
      const numPlaced = placed.length;
      for (let i = 0; i < numPlaced; i++) {
        const visualRow = VISIBLE_ROWS - 1 - i;
        if (visualRow < 0) continue;
        const b = placed[i];
        const color = getColor(i);
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = color;
        ctx.fillRect(b.col * CELL + 1, visualRow * CELL + 1, b.width * CELL - 2, CELL - 2);
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(b.col * CELL + 2, visualRow * CELL + 2, b.width * CELL - 4, 4);
        ctx.restore();
      }

      // Draw moving block (one row above the top placed block)
      if (gameActive) {
        const movingRow = VISIBLE_ROWS - 1 - numPlaced;
        if (movingRow >= 0) {
          const color = getColor(numPlaced);
          const px = mover.pos * CELL;
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 18;
          ctx.globalAlpha = 0.88;
          ctx.fillStyle = color;
          ctx.fillRect(px + 1, movingRow * CELL + 1, mover.width * CELL - 2, CELL - 2);
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fillRect(px + 2, movingRow * CELL + 2, mover.width * CELL - 4, 4);
          ctx.restore();
        }
      }

      // Danger warning if only 1-2 wide
      if (placed.length > 1 && placed[placed.length - 1].width <= 2) {
        ctx.fillStyle = 'rgba(248,113,113,0.06)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }

    function loop(ts) {
      const dt = Math.min(ts - lastTs, 50);
      lastTs = ts;

      // Move mover
      mover.pos += mover.dir * speed * (dt / 16.67);

      // Bounce off walls
      if (mover.pos + mover.width > COLS) {
        mover.pos = COLS - mover.width;
        mover.dir = -1;
      }
      if (mover.pos < 0) {
        mover.pos = 0;
        mover.dir = 1;
      }

      draw();
      if (gameActive) animId = requestAnimationFrame(loop);
    }

    function placeBlock() {
      if (!gameActive) return;

      const prev = placed[placed.length - 1];
      const snapPos = Math.round(mover.pos * 10) / 10; // slight sub-cell precision
      const bLeft = snapPos;
      const bRight = snapPos + mover.width;
      const pLeft = prev.col;
      const pRight = prev.col + prev.width;

      const overlapLeft = Math.max(bLeft, pLeft);
      const overlapRight = Math.min(bRight, pRight);
      const overlapWidth = Math.round((overlapRight - overlapLeft) * 10) / 10;

      if (overlapWidth <= 0.2) {
        // Miss!
        gameActive = false;
        cancelAnimationFrame(animId);
        draw();
        showOverlay(false);
        return;
      }

      const newCol = Math.round(overlapLeft);
      const newWidth = Math.round(overlapWidth);

      // Perfect detection (within 0.4 cells)
      const isPerfect = Math.abs(bLeft - pLeft) <= 0.4 && Math.abs(mover.width - prev.width) <= 0.1;
      if (isPerfect) {
        placed.push({ col: prev.col, width: prev.width });
        flashPerfect();
      } else {
        placed.push({ col: Math.max(0, newCol), width: Math.max(1, newWidth) });
      }

      score++;
      scoreEl.textContent = score;
      setHighScore(score);
      vibrate?.(15);

      // Check win (filled all VISIBLE_ROWS)
      if (placed.length >= VISIBLE_ROWS) {
        gameActive = false;
        cancelAnimationFrame(animId);
        draw();
        showOverlay(true);
        return;
      }

      // Increase speed
      speed = Math.min(0.04 + score * 0.003, 0.18);
      spawnMover();
    }

    function flashPerfect() {
      perfectEl.classList.add('show');
      clearTimeout(perfectTimer);
      perfectTimer = setTimeout(() => perfectEl.classList.remove('show'), 900);
    }

    function showOverlay(won) {
      const old = document.getElementById('st-overlay');
      if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'st-overlay';
      ov.innerHTML = `
        <h2>${won ? '🏆 You Win!' : '💥 Game Over'}</h2>
        <div class="st-score-big">${score}</div>
        <p>${won ? 'Perfect stack — you reached the top!' : `You stacked ${score} block${score !== 1 ? 's' : ''}`}</p>
        <button class="st-btn" id="st-restart">Play Again</button>
      `;
      wrap.appendChild(ov);
      document.getElementById('st-restart').addEventListener('click', () => {
        ov.remove();
        startGame();
      });
    }

    // Input
    const onKey = e => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault();
        placeBlock();
      }
    };
    const onTap = e => { e.preventDefault(); placeBlock(); };

    document.addEventListener('keydown', onKey);
    canvas.addEventListener('click', onTap);
    canvas.addEventListener('touchstart', onTap, { passive: false });

    startGame();

    window.currentGameCleanup = () => {
      gameActive = false;
      cancelAnimationFrame(animId);
      document.removeEventListener('keydown', onKey);
      canvas.removeEventListener('click', onTap);
      canvas.removeEventListener('touchstart', onTap);
      styleEl.remove();
    };
  };
})();
