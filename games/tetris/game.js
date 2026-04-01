/* ================================================
   TETRIS — Full Implementation v1.0
   Ghost piece, Hold, Next Queue, Wall Kicks,
   Level scaling, Neon glow, Line-clear flash
   ================================================ */
(function () {
    'use strict';

    // ---- Inject CSS ----
    const style = document.createElement('style');
    style.textContent = `
    #tetris-wrap {
      display: flex; gap: 16px; align-items: flex-start; justify-content: center;
      width: 100%; height: 100%; padding: 12px; box-sizing: border-box;
      font-family: 'Inter', sans-serif;
    }
    #tetris-side-left, #tetris-side-right {
      display: flex; flex-direction: column; gap: 12px; min-width: 90px;
    }
    #tetris-panel {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 14px; padding: 10px 12px;
      color: #eef1fa; font-size: 0.72rem; font-weight: 700;
      letter-spacing: 0.5px; text-transform: uppercase;
    }
    #tetris-panel .label { color: #4a5270; margin-bottom: 5px; font-size: 0.60rem; }
    #tetris-panel canvas { display: block; border-radius: 6px; margin-top: 6px; }
    #tetris-main-canvas { border-radius: 14px; box-shadow: 0 0 60px rgba(91,127,255,0.2); }
    #tetris-overlay {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 14px;
      background: rgba(6,9,20,0.88); backdrop-filter: blur(18px);
      border-radius: 14px; z-index: 10; animation: fadeIn 0.3s ease-out;
    }
    #tetris-overlay h2 {
      font-size: 2rem; font-weight: 900; letter-spacing: -1px;
      background: linear-gradient(135deg, #ffd93d, #f59e42);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    #tetris-overlay p { color: #8892b0; font-size: 0.9rem; text-align: center; }
    #tetris-overlay .tet-btn {
      padding: 12px 36px; border: none; border-radius: 999px;
      background: linear-gradient(135deg, #5b7fff, #9b6dff);
      color: #fff; font-family: inherit; font-size: 0.95rem;
      font-weight: 800; cursor: pointer; letter-spacing: 0.5px;
      box-shadow: 0 4px 20px rgba(91,127,255,0.4);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    #tetris-overlay .tet-btn:hover { transform: scale(1.06); box-shadow: 0 6px 28px rgba(91,127,255,0.6); }
    .tet-controls-hint { color: #4a5270; font-size: 0.65rem; text-align: center; margin-top: 6px; line-height: 1.6; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes lineClear { 0% { filter: brightness(1); } 50% { filter: brightness(3); } 100% { filter: brightness(0); } }
  `;
    document.head.appendChild(style);

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile }) {
        const r = container.getBoundingClientRect();
        const avail_h = r.height - 24;
        const avail_w = r.width - 24;

        const COLS = 10, ROWS = 20;
        const CELL = Math.floor(Math.min(avail_h / ROWS, (avail_w * 0.55) / COLS));
        const CW = COLS * CELL, CH = ROWS * CELL;
        const PREVIEW_CELL = Math.max(16, Math.floor(CELL * 0.7));

        // Build layout
        const wrap = document.createElement('div');
        wrap.id = 'tetris-wrap';
        wrap.style.position = 'relative';

        const sideL = document.createElement('div');
        sideL.id = 'tetris-side-left';

        const sideR = document.createElement('div');
        sideR.id = 'tetris-side-right';

        // Main canvas
        const mainCanvas = document.createElement('canvas');
        mainCanvas.id = 'tetris-main-canvas';
        mainCanvas.width = CW; mainCanvas.height = CH;
        const ctx = mainCanvas.getContext('2d');

        // Hold panel
        const holdPanel = document.createElement('div');
        holdPanel.id = 'tetris-panel';
        holdPanel.innerHTML = '<div class="label">Hold</div>';
        const holdCanvas = document.createElement('canvas');
        holdCanvas.width = PREVIEW_CELL * 5; holdCanvas.height = PREVIEW_CELL * 4;
        const holdCtx = holdCanvas.getContext('2d');
        holdPanel.appendChild(holdCanvas);
        sideL.appendChild(holdPanel);

        // Stats panel
        const statsPanel = document.createElement('div');
        statsPanel.id = 'tetris-panel';
        statsPanel.innerHTML = `<div class="label">Level</div><div id="tet-level">1</div><br><div class="label">Lines</div><div id="tet-lines">0</div>`;
        sideL.appendChild(statsPanel);

        // Controls hint (desktop)
        if (!isMobile) {
            const hint = document.createElement('div');
            hint.className = 'tet-controls-hint';
            hint.innerHTML = '← → Move<br>↑ Rotate<br>↓ Soft drop<br>Space Hard drop<br>C Hold';
            sideL.appendChild(hint);
        }

        // Next queue (right)
        const nextPanels = [];
        for (let i = 0; i < 3; i++) {
            const p = document.createElement('div');
            p.id = 'tetris-panel';
            p.innerHTML = `<div class="label">${i === 0 ? 'Next' : ''}</div>`;
            const nc = document.createElement('canvas');
            nc.width = PREVIEW_CELL * 5; nc.height = PREVIEW_CELL * 4;
            p.appendChild(nc);
            nextPanels.push(nc);
            sideR.appendChild(p);
        }

        // Overlay
        const overlay = document.createElement('div');
        overlay.id = 'tetris-overlay';
        overlay.innerHTML = `
      <h2>🟨 Tetris</h2>
      <p>Stack & clear lines<br>Build combos to score big!</p>
      <button class="tet-btn" id="tet-start-btn">Start Game</button>
      <div class="tet-controls-hint">← → Move &nbsp; ↑ Rotate &nbsp; Space Drop &nbsp; C Hold</div>
    `;

        const canvasWrap = document.createElement('div');
        canvasWrap.style.cssText = 'position:relative;flex-shrink:0;';
        canvasWrap.appendChild(mainCanvas);
        canvasWrap.appendChild(overlay);

        wrap.appendChild(sideL);
        wrap.appendChild(canvasWrap);
        wrap.appendChild(sideR);
        container.appendChild(wrap);

        // ---- Tetromino Definitions ----
        const PIECES = {
            I: { cells: [[0, 1], [1, 1], [2, 1], [3, 1]], color: '#22d3ee' },
            O: { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], color: '#ffd93d' },
            T: { cells: [[1, 0], [0, 1], [1, 1], [2, 1]], color: '#9b6dff' },
            S: { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], color: '#4ade80' },
            Z: { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], color: '#f87171' },
            J: { cells: [[0, 0], [0, 1], [1, 1], [2, 1]], color: '#5b7fff' },
            L: { cells: [[2, 0], [0, 1], [1, 1], [2, 1]], color: '#f59e42' },
        };
        const PIECE_KEYS = Object.keys(PIECES);

        // Wall kick data (SRS)
        const KICKS = {
            normal: [[[0, 0], [-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]],
            [[0, 0], [1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1]]],
            I: [[[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
            [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]]
        };

        // ---- State ----
        let board, piece, nextQueue, held, holdUsed, score, lines, level, dropTimer, dropInterval, animFrame;
        let running = false;
        let clearAnimRows = [], clearAnimFrame = 0;

        function newBoard() { return Array.from({ length: ROWS }, () => Array(COLS).fill(null)); }

        function randomBag() {
            const bag = [...PIECE_KEYS];
            for (let i = bag.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [bag[i], bag[j]] = [bag[j], bag[i]];
            }
            return bag;
        }

        let bag = [];
        function nextPiece() {
            if (bag.length < 4) bag = [...bag, ...randomBag()];
            const key = bag.shift();
            const def = PIECES[key];
            return { key, cells: def.cells.map(c => [...c]), color: def.color, x: 3, y: 0, rot: 0 };
        }

        function rotate(cells, dir = 1) {
            // Get bounding box
            const maxX = Math.max(...cells.map(c => c[0]));
            const maxY = Math.max(...cells.map(c => c[1]));
            return cells.map(([x, y]) => dir === 1 ? [maxY - y, x] : [y, maxX - x]);
        }

        function validPos(cells, ox, oy) {
            for (const [x, y] of cells) {
                const bx = x + ox, by = y + oy;
                if (bx < 0 || bx >= COLS || by >= ROWS) return false;
                if (by >= 0 && board[by][bx]) return false;
            }
            return true;
        }

        function ghostY() {
            let gy = piece.y;
            while (validPos(piece.cells, piece.x, gy + 1)) gy++;
            return gy;
        }

        function lockPiece() {
            for (const [x, y] of piece.cells) {
                if (y + piece.y < 0) { gameOver(); return; }
                board[y + piece.y][x + piece.x] = piece.color;
            }
            // Check cleared lines
            const cleared = [];
            for (let r = ROWS - 1; r >= 0; r--) {
                if (board[r].every(c => c !== null)) cleared.push(r);
            }
            if (cleared.length > 0) {
                clearAnimRows = cleared;
                clearAnimFrame = 8;
                const pts = [0, 100, 300, 500, 800][cleared.length] * level;
                score += pts;
                lines += cleared.length;
                level = Math.floor(lines / 10) + 1;
                dropInterval = Math.max(80, 500 - (level - 1) * 40);
                scoreEl.textContent = score;
                setHighScore(score);
                document.getElementById('tet-level').textContent = level;
                document.getElementById('tet-lines').textContent = lines;
            }
            holdUsed = false;
            spawnPiece();
        }

        function removeClearedLines() {
            const rows = clearAnimRows.sort((a, b) => b - a);
            for (const r of rows) { board.splice(r, 1); board.unshift(Array(COLS).fill(null)); }
            clearAnimRows = [];
        }

        function spawnPiece() {
            piece = nextQueue.shift();
            nextQueue.push(nextPiece());
            if (!validPos(piece.cells, piece.x, piece.y)) { gameOver(); return; }
        }

        function hold() {
            if (holdUsed) return;
            if (!held) {
                held = { key: piece.key, cells: PIECES[piece.key].cells.map(c => [...c]), color: piece.color };
                spawnPiece();
            } else {
                const tmp = { key: piece.key, cells: PIECES[piece.key].cells.map(c => [...c]), color: piece.color };
                piece = { key: held.key, cells: PIECES[held.key].cells.map(c => [...c]), color: held.color, x: 3, y: 0, rot: 0 };
                held = tmp;
            }
            holdUsed = true;
        }

        function tryRotate(dir) {
            const rotated = rotate(piece.cells, dir);
            const kicks = piece.key === 'I' ? KICKS.I : KICKS.normal;
            const kickSet = dir === 1 ? kicks[0] : kicks[1];
            for (const [dx, dy] of kickSet) {
                if (validPos(rotated, piece.x + dx, piece.y + dy)) {
                    piece.cells = rotated;
                    piece.x += dx; piece.y += dy;
                    return true;
                }
            }
            return false;
        }

        function startGame() {
            board = newBoard();
            bag = randomBag();
            nextQueue = [nextPiece(), nextPiece(), nextPiece()];
            held = null; holdUsed = false;
            score = 0; lines = 0; level = 1;
            dropInterval = 500; dropTimer = 0;
            clearAnimRows = []; clearAnimFrame = 0;
            scoreEl.textContent = '0';
            document.getElementById('tet-level').textContent = '1';
            document.getElementById('tet-lines').textContent = '0';
            spawnPiece();
            running = true;
            overlay.style.display = 'none';
        }

        function gameOver() {
            running = false;
            overlay.style.display = 'flex';
            overlay.innerHTML = `
        <h2>Game Over</h2>
        <p>Score: <strong style="color:#ffd93d;font-size:1.4rem">${score.toLocaleString()}</strong></p>
        <p>Best: <strong style="color:#5b7fff">${getHighScore().toLocaleString()}</strong></p>
        <button class="tet-btn" id="tet-start-btn">Play Again</button>
      `;
            document.getElementById('tet-start-btn').addEventListener('click', startGame);
        }

        // ---- Drawing ----
        function drawCell(c, x, y, size, glow, ctx2 = ctx) {
            if (!c) return;
            ctx2.save();
            if (glow) { ctx2.shadowColor = c; ctx2.shadowBlur = 12; }
            const g = ctx2.createLinearGradient(x, y, x + size, y + size);
            g.addColorStop(0, c + 'ee'); g.addColorStop(1, c + '88');
            ctx2.fillStyle = g;
            ctx2.beginPath();
            ctx2.roundRect(x + 1, y + 1, size - 2, size - 2, 3);
            ctx2.fill();
            ctx2.strokeStyle = 'rgba(255,255,255,0.25)';
            ctx2.lineWidth = 1;
            ctx2.stroke();
            ctx2.restore();
        }

        function drawPreview(p, canvas, pctx) {
            pctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!p) return;
            const pc = PREVIEW_CELL;
            const cells = p.cells;
            const minX = Math.min(...cells.map(c => c[0]));
            const minY = Math.min(...cells.map(c => c[1]));
            const maxX = Math.max(...cells.map(c => c[0]));
            const maxY = Math.max(...cells.map(c => c[1]));
            const w = (maxX - minX + 1) * pc; const h = (maxY - minY + 1) * pc;
            const ox = Math.floor((canvas.width - w) / 2);
            const oy = Math.floor((canvas.height - h) / 2);
            for (const [x, y] of cells) {
                drawCell(p.color, ox + (x - minX) * pc, oy + (y - minY) * pc, pc, true, pctx);
            }
        }

        function draw() {
            ctx.clearRect(0, 0, CW, CH);
            // Grid background
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fillRect(0, 0, CW, CH);
            // Grid lines
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, CH); ctx.stroke(); }
            for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(CW, r * CELL); ctx.stroke(); }

            // Board
            for (let r = 0; r < ROWS; r++) {
                const isClear = clearAnimRows.includes(r);
                for (let c = 0; c < COLS; c++) {
                    if (board[r][c]) {
                        if (isClear) {
                            const alpha = clearAnimFrame / 8;
                            ctx.save();
                            ctx.globalAlpha = alpha;
                            ctx.fillStyle = '#fff';
                            ctx.shadowColor = '#fff'; ctx.shadowBlur = 20;
                            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
                            ctx.restore();
                        } else {
                            drawCell(board[r][c], c * CELL, r * CELL, CELL, false);
                        }
                    }
                }
            }

            if (running && piece) {
                // Ghost
                const gY = ghostY();
                if (gY !== piece.y) {
                    ctx.save(); ctx.globalAlpha = 0.22;
                    for (const [x, y] of piece.cells) drawCell(piece.color, (x + piece.x) * CELL, (y + gY) * CELL, CELL, false);
                    ctx.restore();
                }
                // Active piece
                ctx.save(); ctx.shadowColor = piece.color; ctx.shadowBlur = 18;
                for (const [x, y] of piece.cells) {
                    if (y + piece.y >= 0) drawCell(piece.color, (x + piece.x) * CELL, (y + piece.y) * CELL, CELL, true);
                }
                ctx.restore();
            }

            // Previews
            drawPreview(held, holdCanvas, holdCtx);
            for (let i = 0; i < 3; i++) {
                const nc = nextPanels[i].getContext('2d');
                drawPreview(nextQueue[i], nextPanels[i], nc);
            }
        }

        // ---- Game Loop ----
        let lastTime = 0;
        function loop(ts) {
            animFrame = requestAnimationFrame(loop);
            const dt = ts - lastTime; lastTime = ts;
            if (!running) { draw(); return; }

            if (clearAnimFrame > 0) {
                clearAnimFrame--;
                if (clearAnimFrame === 0) removeClearedLines();
                draw(); return;
            }

            dropTimer += dt;
            if (dropTimer >= dropInterval) {
                dropTimer = 0;
                if (validPos(piece.cells, piece.x, piece.y + 1)) piece.y++;
                else lockPiece();
            }
            draw();
        }
        animFrame = requestAnimationFrame(loop);

        // ---- Controls ----
        let softDropping = false;
        function keyDown(e) {
            if (!running) return;
            switch (e.code) {
                case 'ArrowLeft': e.preventDefault(); if (validPos(piece.cells, piece.x - 1, piece.y)) piece.x--; break;
                case 'ArrowRight': e.preventDefault(); if (validPos(piece.cells, piece.x + 1, piece.y)) piece.x++; break;
                case 'ArrowDown': e.preventDefault();
                    if (validPos(piece.cells, piece.x, piece.y + 1)) { piece.y++; score += 1; scoreEl.textContent = score; }
                    break;
                case 'ArrowUp': e.preventDefault(); tryRotate(1); break;
                case 'KeyZ': tryRotate(-1); break;
                case 'KeyX': tryRotate(1); break;
                case 'Space':
                    e.preventDefault();
                    let dropped = 0;
                    while (validPos(piece.cells, piece.x, piece.y + 1)) { piece.y++; dropped++; }
                    score += dropped * 2; scoreEl.textContent = score;
                    lockPiece(); break;
                case 'KeyC': hold(); break;
            }
        }
        document.addEventListener('keydown', keyDown);

        // Mobile controls via left/right buttons
        function bindMobileBtn(id, action) {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.addEventListener('touchstart', e => { e.preventDefault(); action(); }, { passive: false });
        }
        bindMobileBtn('mc-left', () => { if (running && validPos(piece.cells, piece.x - 1, piece.y)) piece.x--; });
        bindMobileBtn('mc-right', () => { if (running && validPos(piece.cells, piece.x + 1, piece.y)) piece.x++; });
        bindMobileBtn('mc-up', () => { if (running) tryRotate(1); });
        bindMobileBtn('mc-down', () => {
            if (running) {
                while (validPos(piece.cells, piece.x, piece.y + 1)) piece.y++;
                lockPiece();
            }
        });

        // Swipe on canvas
        let touchStartX, touchStartY;
        mainCanvas.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; }, { passive: true });
        mainCanvas.addEventListener('touchend', e => {
            if (!running) return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx < -20 && validPos(piece.cells, piece.x - 1, piece.y)) piece.x--;
                else if (dx > 20 && validPos(piece.cells, piece.x + 1, piece.y)) piece.x++;
            } else {
                if (dy < -20) tryRotate(1);
                else if (dy > 20) { while (validPos(piece.cells, piece.x, piece.y + 1)) piece.y++; lockPiece(); }
            }
        }, { passive: true });

        // Start button
        document.getElementById('tet-start-btn').addEventListener('click', startGame);

        // Cleanup
        window.currentGameCleanup = () => {
            document.removeEventListener('keydown', keyDown);
            cancelAnimationFrame(animFrame);
            style.remove();
        };
    };
})();
