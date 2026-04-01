/* ================================================
   2048 — Full Implementation v1.0
   DOM/CSS based, smooth tile animations,
   Swipe support, Undo, Win/Continue flow
   ================================================ */
(function () {
  'use strict';

  const style = document.createElement('style');
  style.textContent = `
    #g2048-root {
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      width:100%;height:100%;padding:16px;box-sizing:border-box;
      font-family:'Inter',sans-serif;user-select:none;
    }
    #g2048-header {
      display:flex;align-items:center;justify-content:space-between;
      width:100%;max-width:440px;margin-bottom:12px;
    }
    #g2048-title {
      font-size:2rem;font-weight:900;letter-spacing:-1px;
      background:linear-gradient(135deg,#818cf8,#c084fc);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    #g2048-btns { display:flex;gap:8px; }
    .g2-btn {
      padding:7px 16px;border:none;border-radius:999px;
      font-family:inherit;font-size:0.78rem;font-weight:800;
      cursor:pointer;transition:transform 0.12s;
    }
    .g2-btn:hover { transform:scale(1.06); }
    .g2-undo { background:rgba(255,255,255,0.09);color:#8892b0;border:1px solid rgba(255,255,255,0.1); }
    .g2-new  { background:linear-gradient(135deg,#f59e42,#f87171);color:#fff; }
    #g2048-board-wrap {
      position:relative;width:100%;max-width:440px;aspect-ratio:1;
      background:rgba(5,10,30,0.92);border:1px solid rgba(99,102,241,0.2);
      border-radius:16px;padding:10px;box-sizing:border-box;
      box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 60px rgba(99,102,241,0.08);
    }
    #g2048-grid {
      display:grid;grid-template-columns:repeat(4,1fr);
      grid-template-rows:repeat(4,1fr);gap:10px;width:100%;height:100%;
    }
    .g2-cell { background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(99,102,241,0.1); }
    #g2048-tiles { position:absolute;inset:10px;pointer-events:none; }
    .g2-tile {
      position:absolute;display:flex;align-items:center;justify-content:center;
      border-radius:10px;font-weight:900;
      transition:left 0.1s ease,top 0.1s ease;
      box-shadow:0 4px 20px rgba(0,0,0,0.5);
      border:1px solid rgba(255,255,255,0.07);
    }
    .g2-tile.shimmer::after{
      content:'';position:absolute;inset:0;border-radius:10px;
      background:linear-gradient(105deg,transparent 30%,rgba(255,255,255,0.15) 50%,transparent 70%);
      background-size:200% 100%;animation:tileShimmer 2s infinite;
    }
    @keyframes tileShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    .g2-tile.new  { animation:tileIn 0.18s ease-out; }
    .g2-tile.bump { animation:tileBump 0.22s ease-out; }
    @keyframes tileIn   { from{transform:scale(0)}to{transform:scale(1)} }
    @keyframes tileBump { 0%{transform:scale(1)}50%{transform:scale(1.18)}100%{transform:scale(1)} }
    #g2048-ov {
      position:absolute;inset:0;display:none;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;
      background:rgba(6,9,20,0.85);backdrop-filter:blur(16px);
      border-radius:16px;z-index:20;animation:ovIn 0.3s ease;
    }
    #g2048-ov.show { display:flex; }
    @keyframes ovIn { from{opacity:0}to{opacity:1} }
    #g2048-ov h2 { font-size:2.2rem;font-weight:900;color:#ffd93d;letter-spacing:-1px; }
    #g2048-ov p  { color:#8892b0;font-size:0.95rem; }
    #g2048-ov .g2-btn { padding:12px 32px;font-size:0.95rem; }
    #g2048-hint { color:#4a5270;font-size:0.65rem;margin-top:10px; }
  `;
  document.head.appendChild(style);

  // Neon dark-mode color palette
  const COLORS = {
    2: { bg: 'rgba(30,41,59,0.95)', fg: '#94a3b8', gl: null },
    4: { bg: 'rgba(30,58,82,0.95)', fg: '#7dd3fc', gl: null },
    8: { bg: 'rgba(20,78,92,0.95)', fg: '#22d3ee', gl: '#22d3ee55' },
    16: { bg: 'rgba(6,60,95,0.95)', fg: '#38bdf8', gl: '#38bdf866' },
    32: { bg: 'rgba(30,58,138,0.95)', fg: '#818cf8', gl: '#818cf866' },
    64: { bg: 'rgba(46,16,101,0.95)', fg: '#a78bfa', gl: '#a78bfa77' },
    128: { bg: 'rgba(74,4,78,0.95)', fg: '#e879f9', gl: '#e879f988' },
    256: { bg: 'rgba(86,4,62,0.95)', fg: '#f472b6', gl: '#f472b688' },
    512: { bg: 'rgba(127,29,29,0.95)', fg: '#f87171', gl: '#f8717188' },
    1024: { bg: 'rgba(120,53,15,0.95)', fg: '#fb923c', gl: '#fb923c99' },
    2048: { bg: 'rgba(113,63,18,0.95)', fg: '#fbbf24', gl: '#fbbf24cc', shimmer: true },
  };

  window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore }) {
    const root = document.createElement('div'); root.id = 'g2048-root';
    root.innerHTML = `
      <div id="g2048-header">
        <div id="g2048-title">2048</div>
        <div id="g2048-btns">
          <button class="g2-btn g2-undo" id="g2-undo">↩ Undo</button>
          <button class="g2-btn g2-new"  id="g2-new">New Game</button>
        </div>
      </div>
      <div id="g2048-board-wrap">
        <div id="g2048-grid"></div>
        <div id="g2048-tiles"></div>
        <div id="g2048-ov"></div>
      </div>
      <div id="g2048-hint">Arrow keys / WASD / Swipe to merge tiles · C = Undo</div>
    `;
    container.appendChild(root);

    const gridEl = document.getElementById('g2048-grid');
    const tilesEl = document.getElementById('g2048-tiles');
    const ov = document.getElementById('g2048-ov');

    for (let i = 0; i < 16; i++) { const d = document.createElement('div'); d.className = 'g2-cell'; gridEl.appendChild(d); }

    let board, prev, prevScore, score, won;

    function clone(b) { return b.map(r => [...r]); }

    function spawn(b) {
      const empty = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (!b[r][c]) empty.push([r, c]);
      if (!empty.length) return;
      const [r, c] = empty[Math.floor(Math.random() * empty.length)];
      b[r][c] = Math.random() < 0.9 ? 2 : 4;
    }

    function isOver(b) {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        if (!b[r][c]) return false;
        if (c < 3 && b[r][c] === b[r][c + 1]) return false;
        if (r < 3 && b[r][c] === b[r + 1][c]) return false;
      }
      return true;
    }

    function rot(b) { return b[0].map((_, i) => b.map(r => r[i]).reverse()); }
    function rotb(b) { return b[0].map((_, i) => b.map(r => r[r.length - 1 - i])); }

    function slideLeft(b) {
      let moved = false;
      const nb = b.map(row => {
        const r = row.filter(x => x), m = [];
        let i = 0;
        while (i < r.length) {
          if (i + 1 < r.length && r[i] === r[i + 1]) { const v = r[i] * 2; m.push(v); score += v; if (v === 2048) won = true; i += 2; }
          else { m.push(r[i]); i++; }
        }
        while (m.length < 4) m.push(0);
        if (m.join() !== row.join()) moved = true;
        return m;
      });
      return { nb, moved };
    }

    function move(dir) {
      prev = clone(board); prevScore = score;
      let b = clone(board);
      if (dir === 'up') b = rot(rot(rot(b)));
      if (dir === 'right') b = rot(rot(b));
      if (dir === 'down') b = rot(b);
      const { nb, moved } = slideLeft(b);
      if (dir === 'up') board = rot(nb);
      else if (dir === 'right') board = rotb(rotb(nb));
      else if (dir === 'down') board = rotb(nb);
      else board = nb;
      if (moved) {
        scoreEl.textContent = score;
        setHighScore(score);
        if (highScoreEl) highScoreEl.textContent = getHighScore();
        spawn(board);
        render();
        if (won) { showOv('🎉 You Win!', '<p>You reached <b>2048!</b></p>', true); }
        else if (isOver(board)) { showOv('Game Over', `<p>Score: <b>${score.toLocaleString()}</b></p>`, false); }
      }
    }

    function showOv(title, body, cont) {
      ov.classList.add('show');
      ov.innerHTML = `<h2>${title}</h2>${body}
        ${cont ? '<button class="g2-btn g2-new" id="ov-cont">Keep Going</button>' : ''}
        <button class="g2-btn g2-new" id="ov-ng">New Game</button>`;
      document.getElementById('ov-ng').onclick = newGame;
      if (cont) document.getElementById('ov-cont').onclick = () => { won = false; ov.classList.remove('show'); };
    }

    function render() {
      tilesEl.innerHTML = '';
      const cells = gridEl.querySelectorAll('.g2-cell');
      const lr = tilesEl.getBoundingClientRect();
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const v = board[r][c]; if (!v) continue;
        const cr = cells[r * 4 + c].getBoundingClientRect();
        const t = document.createElement('div');
        t.className = 'g2-tile new';
        const l = cr.left - lr.left, tp = cr.top - lr.top;
        const fs = cr.width / (v >= 1000 ? 4.8 : v >= 100 ? 3.8 : 3.2);
        t.style.cssText = `left:${l}px;top:${tp}px;width:${cr.width}px;height:${cr.height}px;font-size:${fs}px;`;
        const col = COLORS[Math.min(v, 2048)] || COLORS[2048];
        t.style.background = col.bg; t.style.color = col.fg;
        if (col.gl) t.style.boxShadow = `0 4px 20px rgba(0,0,0,0.5),0 0 24px ${col.gl}`;
        if (col.shimmer) t.classList.add('shimmer');
        t.textContent = v;
        tilesEl.appendChild(t);
      }
    }

    function newGame() {
      board = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
      prev = null; prevScore = 0; score = 0; won = false;
      scoreEl.textContent = '0';
      ov.classList.remove('show');
      spawn(board); spawn(board);
      render();
    }

    const DIRS = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' };
    function onKey(e) {
      const d = DIRS[e.code];
      if (d) { e.preventDefault(); if (!ov.classList.contains('show') || !won) move(d); }
      if (e.code === 'KeyC') { document.getElementById('g-undo')?.click(); }
    }
    document.addEventListener('keydown', onKey);

    let tx, ty;
    const bw = document.getElementById('g2048-board-wrap');
    bw.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    bw.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      Math.abs(dx) > Math.abs(dy) ? move(dx < 0 ? 'left' : 'right') : move(dy < 0 ? 'up' : 'down');
    }, { passive: true });

    document.getElementById('g2-new').onclick = newGame;
    document.getElementById('g2-undo').onclick = () => {
      if (!prev) return;
      board = prev; score = prevScore; prev = null; won = false;
      scoreEl.textContent = score; ov.classList.remove('show'); render();
    };

    const ro = new ResizeObserver(render); ro.observe(bw);
    newGame();

    window.currentGameCleanup = () => {
      document.removeEventListener('keydown', onKey);
      ro.disconnect(); style.remove();
    };
  };
})();
