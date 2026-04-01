/* =============================================
   COLOR FLOOD — Neon Edition
   Flood the grid with one color in limited moves!
   ============================================= */
(function () {
  'use strict';

  const CSS = `
    #cf-wrap {
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      align-items: center; justify-content: flex-start;
      padding: 12px 8px 8px; gap: 12px; background: #060914;
      box-sizing: border-box; overflow: hidden;
      font-family: Inter, sans-serif;
    }

    #cf-header {
      display: flex; align-items: center; justify-content: space-between;
      width: 100%; max-width: 340px;
      font-size: 0.85rem; font-weight: 700; color: #eef1fa;
    }
    #cf-header .cf-info {
      display: flex; align-items: center; gap: 12px;
    }
    #cf-moves-left {
      font-size: 1.4rem; font-weight: 900; color: #f87171;
      transition: color 0.3s;
    }
    #cf-moves-left.ok { color: #4ade80; }
    #cf-moves-left.warn { color: #fb923c; }
    #cf-moves-left.danger { color: #f87171; }

    #cf-grid {
      display: grid;
      gap: 2px;
      border-radius: 10px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .cf-cell {
      width: 100%; height: 100%;
      border-radius: 2px;
      transition: background-color 0.12s ease;
    }

    #cf-palette {
      display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center;
    }
    .cf-color-btn {
      width: 44px; height: 44px; border: 3px solid transparent;
      border-radius: 10px; cursor: pointer;
      transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
      position: relative;
    }
    .cf-color-btn:active { transform: scale(0.88); }
    .cf-color-btn.active {
      border-color: rgba(255,255,255,0.7);
      transform: scale(1.12);
      box-shadow: 0 0 16px rgba(255,255,255,0.35);
    }
    .cf-color-btn:disabled {
      opacity: 0.35; cursor: not-allowed; transform: none;
    }

    #cf-progress-bar-wrap {
      width: 100%; max-width: 340px; height: 6px;
      background: rgba(255,255,255,0.07); border-radius: 3px; overflow: hidden;
    }
    #cf-progress-bar {
      height: 100%; background: linear-gradient(90deg, #4ade80, #38d9c0);
      border-radius: 3px; transition: width 0.3s ease;
      box-shadow: 0 0 8px rgba(74,222,128,0.5);
    }

    #cf-overlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
      background: rgba(6,9,20,0.92); backdrop-filter: blur(20px); z-index: 10;
      border-radius: 12px; animation: cfFade 0.3s ease;
    }
    @keyframes cfFade { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
    #cf-overlay h2 {
      font-size: 2rem; font-weight: 900; font-family: Inter, sans-serif;
      background: linear-gradient(135deg, #34d399, #22d3ee);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      text-align: center;
    }
    #cf-overlay .cf-score-big {
      font-size: 3rem; font-weight: 900; font-family: Inter, sans-serif;
      color: #34d399; text-shadow: 0 0 28px rgba(52,211,153,0.6);
    }
    #cf-overlay p { color: #8892b0; font-family: Inter, sans-serif; font-size: 0.88rem; text-align: center; }
    .cf-btn {
      padding: 12px 36px; border: none; border-radius: 999px; cursor: pointer;
      background: linear-gradient(135deg, #34d399, #22d3ee); color: #060914;
      font-family: Inter, sans-serif; font-size: 1rem; font-weight: 900;
      box-shadow: 0 4px 20px rgba(52,211,153,0.45); transition: transform 0.15s, box-shadow 0.15s;
    }
    .cf-btn:hover { transform: scale(1.07); box-shadow: 0 6px 28px rgba(52,211,153,0.6); }

    .cf-difficulty-btns {
      display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
    }
    .cf-diff-btn {
      padding: 8px 20px; border: 1px solid rgba(255,255,255,0.15); border-radius: 999px;
      background: rgba(255,255,255,0.06); color: #eef1fa;
      font-family: Inter, sans-serif; font-size: 0.85rem; font-weight: 700;
      cursor: pointer; transition: all 0.15s;
    }
    .cf-diff-btn:hover, .cf-diff-btn.active {
      background: linear-gradient(135deg, #34d399, #22d3ee); color: #060914;
      border-color: transparent;
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  const PALETTE = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38d9c0', '#5b7fff'];

  const DIFFICULTIES = {
    easy:   { size: 10, maxMoves: 22 },
    medium: { size: 14, maxMoves: 28 },
    hard:   { size: 18, maxMoves: 30 },
  };

  window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
    let grid = [];         // 2D array of color indices
    let flooded = [];      // 2D boolean
    let gridSize = 0;
    let maxMoves = 0;
    let movesLeft = 0;
    let currentColor = 0; // color index of the flood region
    let gameActive = false;
    let movesTaken = 0;

    container.innerHTML = `
      <div id="cf-wrap" style="position:relative;">
        <div id="cf-header">
          <span>Moves left: <span id="cf-moves-left">—</span></span>
          <div class="cf-info">
            <span id="cf-pct">0% covered</span>
          </div>
        </div>
        <div id="cf-progress-bar-wrap"><div id="cf-progress-bar" style="width:0%"></div></div>
        <div id="cf-grid"></div>
        <div id="cf-palette"></div>
      </div>
    `;

    function buildGrid(size) {
      gridSize = size;
      grid = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => Math.floor(Math.random() * PALETTE.length))
      );
      flooded = Array.from({ length: size }, () => Array(size).fill(false));
      flooded[0][0] = true;
      currentColor = grid[0][0];
      expandFlood();
    }

    function expandFlood() {
      // BFS from (0,0) to mark all connected cells of currentColor
      const queue = [];
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (flooded[r][c]) queue.push([r, c]);
        }
      }
      const visited = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
      while (queue.length) {
        const [r, c] = queue.shift();
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
        if (visited[r][c]) continue;
        if (!flooded[r][c] && grid[r][c] !== currentColor) continue;
        visited[r][c] = true;
        flooded[r][c] = true;
        queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
      }
    }

    function applyColor(colorIdx) {
      if (!gameActive || colorIdx === currentColor) return;
      // Paint all flooded cells to new color
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (flooded[r][c]) grid[r][c] = colorIdx;
        }
      }
      currentColor = colorIdx;
      // Expand flood
      for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (flooded[r][c]) continue;
          if (grid[r][c] !== currentColor) continue;
          // Check adjacency
          const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
          if (adj.some(([nr,nc]) => nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && flooded[nr][nc])) {
            flooded[r][c] = true;
          }
        }
      }
      // Multiple BFS passes until stable
      let changed = true;
      while (changed) {
        changed = false;
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            if (flooded[r][c] || grid[r][c] !== currentColor) continue;
            const adj = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]];
            if (adj.some(([nr,nc]) => nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && flooded[nr][nc])) {
              flooded[r][c] = true;
              changed = true;
            }
          }
        }
      }

      movesLeft--;
      movesTaken++;
      renderGrid();
      updatePalette();
      updateHUD();
      checkWinLose();
      vibrate?.(10);
    }

    function countFlooded() {
      let n = 0;
      for (let r = 0; r < gridSize; r++)
        for (let c = 0; c < gridSize; c++)
          if (flooded[r][c]) n++;
      return n;
    }

    function isWon() {
      return countFlooded() === gridSize * gridSize;
    }

    function renderGrid() {
      const gridEl = document.getElementById('cf-grid');
      if (!gridEl) return;
      // Calculate cell size
      const wrapW = document.getElementById('cf-wrap')?.clientWidth || 340;
      const maxGridW = Math.min(wrapW - 16, 340);
      const cellSize = Math.floor((maxGridW - (gridSize - 1) * 2) / gridSize);
      gridEl.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
      gridEl.style.gridTemplateRows    = `repeat(${gridSize}, ${cellSize}px)`;
      gridEl.style.width  = `${cellSize * gridSize + (gridSize - 1) * 2}px`;
      gridEl.style.height = `${cellSize * gridSize + (gridSize - 1) * 2}px`;

      if (gridEl.children.length !== gridSize * gridSize) {
        // Full rebuild
        gridEl.innerHTML = '';
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            const cell = document.createElement('div');
            cell.className = 'cf-cell';
            cell.id = `cf-cell-${r}-${c}`;
            cell.style.backgroundColor = PALETTE[grid[r][c]];
            // Overlay for flooded cells
            if (flooded[r][c]) {
              cell.style.boxShadow = 'inset 0 0 0 2px rgba(255,255,255,0.3)';
            }
            gridEl.appendChild(cell);
          }
        }
      } else {
        // Update only colors
        for (let r = 0; r < gridSize; r++) {
          for (let c = 0; c < gridSize; c++) {
            const cell = document.getElementById(`cf-cell-${r}-${c}`);
            if (cell) {
              cell.style.backgroundColor = PALETTE[grid[r][c]];
              cell.style.boxShadow = flooded[r][c] ? 'inset 0 0 0 2px rgba(255,255,255,0.28)' : '';
            }
          }
        }
      }
    }

    function updatePalette() {
      const palEl = document.getElementById('cf-palette');
      if (!palEl) return;
      palEl.innerHTML = '';
      PALETTE.forEach((color, i) => {
        const btn = document.createElement('button');
        btn.className = 'cf-color-btn' + (i === currentColor ? ' active' : '');
        btn.style.backgroundColor = color;
        btn.style.boxShadow = `0 0 12px ${color}66`;
        if (i === currentColor) btn.disabled = true;
        btn.addEventListener('click', () => applyColor(i));
        palEl.appendChild(btn);
      });
    }

    function updateHUD() {
      const movesEl = document.getElementById('cf-moves-left');
      const pctEl = document.getElementById('cf-pct');
      const bar = document.getElementById('cf-progress-bar');
      if (!movesEl) return;

      movesEl.textContent = movesLeft;
      movesEl.className = movesLeft > maxMoves * 0.5 ? 'ok'
                        : movesLeft > maxMoves * 0.25 ? 'warn'
                        : 'danger';

      const flooded = countFlooded();
      const total = gridSize * gridSize;
      const pct = Math.round((flooded / total) * 100);
      if (pctEl) pctEl.textContent = `${pct}% covered`;
      if (bar) bar.style.width = pct + '%';
    }

    function checkWinLose() {
      if (isWon()) {
        gameActive = false;
        const bonus = movesLeft * 50;
        const final = 500 + bonus;
        scoreEl.textContent = final;
        setHighScore(final);
        setTimeout(() => showOverlay(true, final), 300);
      } else if (movesLeft <= 0) {
        gameActive = false;
        const flooded = countFlooded();
        const total = gridSize * gridSize;
        const partial = Math.round((flooded / total) * 200);
        scoreEl.textContent = partial;
        setHighScore(partial);
        setTimeout(() => showOverlay(false, partial), 300);
      }
    }

    function showOverlay(won, score, isStart = false) {
      const wrap = document.getElementById('cf-wrap');
      const old = document.getElementById('cf-overlay');
      if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'cf-overlay';
      if (isStart) {
        ov.innerHTML = `
          <h2>🎨 Color Flood</h2>
          <p>Flood the entire board with one color.<br>Click the palette to spread from the top-left corner.</p>
          <div class="cf-difficulty-btns">
            <button class="cf-diff-btn" data-diff="easy">Easy</button>
            <button class="cf-diff-btn active" data-diff="medium">Medium</button>
            <button class="cf-diff-btn" data-diff="hard">Hard</button>
          </div>
          <button class="cf-btn" id="cf-start">Start Game</button>
        `;
        wrap.appendChild(ov);
        let chosenDiff = 'medium';
        ov.querySelectorAll('.cf-diff-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            ov.querySelectorAll('.cf-diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            chosenDiff = btn.dataset.diff;
          });
        });
        document.getElementById('cf-start').addEventListener('click', () => {
          ov.remove();
          startGame(chosenDiff);
        });
      } else {
        ov.innerHTML = `
          <h2>${won ? '🎉 You Win!' : '💥 Out of Moves!'}</h2>
          <div class="cf-score-big">${score.toLocaleString()}</div>
          <p>${won ? `Flooded in ${movesTaken} moves · ${movesLeft} moves saved!` : `Covered ${Math.round((countFlooded() / (gridSize*gridSize)) * 100)}% of the board`}</p>
          <div class="cf-difficulty-btns">
            <button class="cf-diff-btn" data-diff="easy">Easy</button>
            <button class="cf-diff-btn active" data-diff="medium">Medium</button>
            <button class="cf-diff-btn" data-diff="hard">Hard</button>
          </div>
          <button class="cf-btn" id="cf-restart">Play Again</button>
        `;
        wrap.appendChild(ov);
        let chosenDiff = 'medium';
        ov.querySelectorAll('.cf-diff-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            ov.querySelectorAll('.cf-diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            chosenDiff = btn.dataset.diff;
          });
        });
        document.getElementById('cf-restart').addEventListener('click', () => {
          ov.remove();
          startGame(chosenDiff);
        });
      }
    }

    function startGame(diff = 'medium') {
      const cfg = DIFFICULTIES[diff] || DIFFICULTIES.medium;
      gridSize = cfg.size;
      maxMoves = cfg.maxMoves;
      movesLeft = maxMoves;
      movesTaken = 0;
      gameActive = true;
      scoreEl.textContent = 0;
      buildGrid(gridSize);
      renderGrid();
      updatePalette();
      updateHUD();
    }

    // Show start screen
    const wrap = document.getElementById('cf-wrap');
    showOverlay(false, 0, true);

    window.currentGameCleanup = () => {
      gameActive = false;
      styleEl.remove();
    };
  };
})();
