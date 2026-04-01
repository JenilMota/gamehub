/* ================================================
   PAC-MAN — Full Implementation v1.0
   Full maze, 4 AI ghosts (scatter/chase/frightened),
   Power pellets, Lives, Level progression
   ================================================ */
(function () {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
    #pm-wrap { width:100%;height:100%;position:relative;background:#060914;display:flex;align-items:center;justify-content:center; }
    #pm-canvas { display:block;border-radius:14px;box-shadow:0 0 60px rgba(255,217,61,0.15); }
    #pm-overlay {
      position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;
      background:rgba(6,9,20,0.90);backdrop-filter:blur(18px);z-index:10;border-radius:14px;
    }
    #pm-overlay h2 {
      font-size:2.2rem;font-weight:900;letter-spacing:-1px;font-family:Inter,sans-serif;
      background:linear-gradient(135deg,#ffd93d,#f59e42);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    #pm-overlay p { color:#8892b0;font-size:0.9rem;font-family:Inter,sans-serif;text-align:center; }
    #pm-overlay .pm-btn {
      padding:12px 36px;border:none;border-radius:999px;cursor:pointer;
      background:linear-gradient(135deg,#ffd93d,#f59e42);color:#060914;
      font-family:Inter,sans-serif;font-size:1rem;font-weight:900;letter-spacing:0.5px;
      box-shadow:0 4px 20px rgba(255,217,61,0.4);transition:transform 0.15s;
    }
    #pm-overlay .pm-btn:hover{transform:scale(1.06);}
  `;
    document.head.appendChild(style);

    // Classic Pac-Man maze (0=wall,1=dot,2=power,3=empty,4=ghost-house)
    const MAP = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 3, 0, 0, 3, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 3, 0, 4, 4, 4, 4, 4, 4, 0, 0, 3, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 3, 0, 4, 4, 4, 4, 4, 4, 0, 0, 3, 0, 1, 0, 0, 0, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 0, 0, 3, 0, 4, 4, 4, 4, 4, 4, 0, 0, 3, 0, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 3, 0, 0, 0, 3, 3, 3, 0, 0, 0, 3, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1, 0, 0, 0, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
        [0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2, 0],
        [0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        [0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];
    const ROWS = MAP.length, COLS = MAP[0].length;

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile }) {
        const R = container.getBoundingClientRect();
        const CELL = Math.min(Math.floor((R.width - 20) / COLS), Math.floor((R.height - 20) / ROWS));
        const CW = COLS * CELL, CH = ROWS * CELL;

        const wrap = document.createElement('div'); wrap.id = 'pm-wrap';
        const canvas = document.createElement('canvas'); canvas.id = 'pm-canvas';
        canvas.width = CW; canvas.height = CH;
        const ctx = canvas.getContext('2d');
        const overlay = document.createElement('div'); overlay.id = 'pm-overlay';
        wrap.appendChild(canvas); wrap.appendChild(overlay);
        container.appendChild(wrap);

        // State
        let map, score, lives, level, running, raf;
        let pac, ghosts, frightenTimer, ghostEatCount;
        let lastT = 0;

        const GHOST_COLORS = ['#f87171', '#f9a8d4', '#67e8f9', '#fbbf24'];
        const GHOST_NAMES = ['Blinky', 'Pinky', 'Inky', 'Clyde'];

        function cloneMap() { return MAP.map(r => [...r]); }

        function countDots(m) {
            let n = 0;
            for (const r of m) for (const c of r) if (c === 1 || c === 2) n++;
            return n;
        }

        function initPac() {
            return { x: 13.5, y: 23, dx: 1, dy: 0, nextDx: 1, nextDy: 0, speed: 0.1 + level * 0.008, mouth: 0, mouthDir: 1 };
        }

        function initGhosts() {
            const spd = 0.085 + level * 0.006;
            return [
                { x: 13.5, y: 11, dx: 1, dy: 0, mode: 'scatter', frightened: false, eaten: false, speed: spd, scatterX: 25, scatterY: 0 },
                { x: 11.5, y: 13, dx: 0, dy: -1, mode: 'house', frightened: false, eaten: false, speed: spd, scatterX: 2, scatterY: 0 },
                { x: 13.5, y: 13, dx: 0, dy: -1, mode: 'house', frightened: false, eaten: false, speed: spd, scatterX: 25, scatterY: 29 },
                { x: 15.5, y: 13, dx: 0, dy: 1, mode: 'house', frightened: false, eaten: false, speed: spd, scatterX: 2, scatterY: 29 },
            ];
        }

        function startGame() {
            map = cloneMap(); score = 0; lives = 3; level = 1; frightenTimer = 0; ghostEatCount = 0;
            pac = initPac(); ghosts = initGhosts(); running = true;
            scoreEl.textContent = '0';
            overlay.style.display = 'none';
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(doLoop);
        }

        function canMove(nx, ny, m) {
            const checks = [[nx - 0.35, ny - 0.35], [nx + 0.35, ny - 0.35], [nx - 0.35, ny + 0.35], [nx + 0.35, ny + 0.35]];
            for (const [cx, cy] of checks) {
                const col = Math.floor(cx), row = Math.floor(cy);
                if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return col < 0 || col >= COLS; // tunnel
                if (m[row][col] === 0) return false;
            }
            return true;
        }

        function canMoveGhost(nx, ny, m, ghost) {
            const col = Math.round(nx), row = Math.round(ny);
            if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true; // tunnel
            const cell = m[Math.floor(ny)][Math.floor(nx)];
            if (cell === 0) return false;
            if (cell === 4 && ghost.mode !== 'house' && ghost.mode !== 'exit') return false;
            return true;
        }

        function dist(ax, ay, bx, by) { return Math.abs(ax - bx) + Math.abs(ay - by); }

        function bestGhostDir(ghost, tx, ty) {
            const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
            let best = null, bestD = Infinity;
            for (const [dx, dy] of dirs) {
                if (-dx === ghost.dx && -dy === ghost.dy) continue; // no reverse
                const nx = ghost.x + dx * 0.5, ny = ghost.y + dy * 0.5;
                if (!canMoveGhost(nx, ny, map, ghost)) continue;
                const d = dist(ghost.x + dx, ghost.y + dy, tx, ty);
                if (d < bestD) { bestD = d; best = [dx, dy]; }
            }
            return best;
        }

        function moveGhost(g, dt) {
            const step = g.speed * dt * 60;

            if (g.mode === 'house') {
                // Bounce inside house
                g.y += g.dy * step * 0.5;
                if (g.y > 13.5) { g.y = 13.5; g.dy = -1; }
                if (g.y < 11.5) { g.y = 11.5; g.dy = 1; }
                return;
            }

            let tx, ty;
            if (g.frightened) {
                // Random walk
                if (Math.random() < 0.05) {
                    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) =>
                        !(-dx === g.dx && -dy === g.dy) && canMoveGhost(g.x + dx * 0.5, g.y + dy * 0.5, map, g));
                    if (dirs.length) { [g.dx, g.dy] = dirs[Math.floor(Math.random() * dirs.length)]; }
                }
            } else if (g.eaten) {
                tx = 13.5; ty = 11;
            } else if (g.mode === 'scatter') {
                tx = g.scatterX; ty = g.scatterY;
            } else {
                // Chase logic per ghost
                const pi = ghosts.indexOf(g);
                if (pi === 0) { tx = pac.x; ty = pac.y; } // Blinky: target pac
                else if (pi === 1) { tx = pac.x + pac.dx * 4; ty = pac.y + pac.dy * 4; } // Pinky: ahead
                else if (pi === 2) { tx = pac.x; ty = pac.y; } // Inky: simplified
                else { tx = dist(g.x, g.y, pac.x, pac.y) > 8 ? pac.x : g.scatterX; ty = dist(g.x, g.y, pac.x, pac.y) > 8 ? pac.y : g.scatterY; } // Clyde
            }

            if (!g.frightened && !g.eaten) {
                // Steer toward target
                if (Math.abs(g.x - Math.round(g.x)) < 0.1 && Math.abs(g.y - Math.round(g.y)) < 0.1) {
                    const best = bestGhostDir(g, tx, ty);
                    if (best) { [g.dx, g.dy] = best; }
                }
            }

            const nx = g.x + g.dx * step, ny = g.y + g.dy * step;
            // Wrap tunnel
            if (nx < -0.5) { g.x = COLS + 0.5; return; }
            if (nx > COLS + 0.5) { g.x = -0.5; return; }
            if (canMoveGhost(nx, ny, map, g)) { g.x = nx; g.y = ny; }
            else {
                // Try to steer
                const best = bestGhostDir(g, tx ?? pac.x, ty ?? pac.y);
                if (best) { [g.dx, g.dy] = best; }
            }

            // Return from eaten
            if (g.eaten && dist(g.x, g.y, 13.5, 11) < 0.5) { g.eaten = false; g.mode = 'scatter'; g.frightened = false; }
        }

        function frightenGhosts() {
            frightenTimer = 7000; ghostEatCount = 0;
            ghosts.forEach(g => { if (!g.eaten) { g.frightened = true; g.dx = -g.dx; g.dy = -g.dy; } });
        }

        function update(dt) {
            if (!running) return;

            // Frighten timer
            if (frightenTimer > 0) {
                frightenTimer -= dt * 60 * (1000 / 60);
                if (frightenTimer <= 0) ghosts.forEach(g => { g.frightened = false; });
            }

            // Ghost mode switch (scatter vs chase oscillation)
            // Simplified: just alternate every 7s
            const tick = Date.now();
            ghosts.forEach((g, i) => {
                if (!g.frightened && !g.eaten && g.mode !== 'house' && g.mode !== 'exit') {
                    g.mode = Math.floor((tick / 7000) + i) % 2 === 0 ? 'scatter' : 'chase';
                }
                moveGhost(g, dt);
            });

            // Pac movement
            pac.mouth += pac.mouthDir * dt * 3;
            if (pac.mouth > 0.4) pac.mouthDir = -1;
            if (pac.mouth < 0.02) pac.mouthDir = 1;

            // Try next direction
            const nxp = pac.x + pac.nextDx * pac.speed, nyp = pac.y + pac.nextDy * pac.speed;
            if ((pac.nextDx !== 0 || pac.nextDy !== 0) && canMove(nxp, nyp, map)) {
                pac.dx = pac.nextDx; pac.dy = pac.nextDy;
            }

            // Move
            const nxm = pac.x + pac.dx * pac.speed, nym = pac.y + pac.dy * pac.speed;
            // Tunnel wrap
            if (nxm < -0.5) { pac.x = COLS + 0.5; }
            else if (nxm > COLS + 0.5) { pac.x = -0.5; }
            else if (canMove(nxm, nym, map)) { pac.x = nxm; pac.y = nym; }

            // Eat dots
            const row = Math.round(pac.y), col = Math.round(pac.x);
            if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
                if (map[row][col] === 1) {
                    map[row][col] = 3; score += 10; scoreEl.textContent = score; setHighScore(score);
                    if (highScoreEl) highScoreEl.textContent = getHighScore();
                } else if (map[row][col] === 2) {
                    map[row][col] = 3; score += 50; scoreEl.textContent = score; frightenGhosts();
                }
            }

            // Ghost collision
            for (const g of ghosts) {
                if (dist(pac.x, pac.y, g.x, g.y) < 0.9) {
                    if (g.frightened && !g.eaten) {
                        ghostEatCount++;
                        const pts = 200 * Math.pow(2, ghostEatCount - 1);
                        score += pts; scoreEl.textContent = score; setHighScore(score);
                        g.eaten = true; g.frightened = false; g.dx = -g.dx; g.dy = -g.dy;
                    } else if (!g.eaten && !g.frightened) {
                        lives--;
                        if (lives <= 0) { running = false; gameOver(); return; }
                        pac = initPac();
                        ghosts = initGhosts();
                        return;
                    }
                }
            }

            // Level complete
            if (countDots(map) === 0) {
                level++;
                map = cloneMap();
                pac = initPac();
                ghosts = initGhosts();
                frightenTimer = 0;
            }
        }

        function drawMaze() {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cx = c * CELL, cy = r * CELL;
                    const cell = map[r][c];
                    if (cell === 0) {
                        // Wall
                        ctx.fillStyle = '#0e1a3a';
                        ctx.fillRect(cx, cy, CELL, CELL);
                        // Blue border glow
                        ctx.strokeStyle = '#1e3a8a';
                        ctx.lineWidth = 1.5;
                        ctx.strokeRect(cx + 0.75, cy + 0.75, CELL - 1.5, CELL - 1.5);
                    } else if (cell === 1) {
                        // Dot
                        ctx.fillStyle = '#ffd93d';
                        ctx.shadowColor = '#ffd93d'; ctx.shadowBlur = 4;
                        ctx.beginPath();
                        ctx.arc(cx + CELL / 2, cy + CELL / 2, CELL * 0.1, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    } else if (cell === 2) {
                        // Power pellet (pulsing)
                        const pulse = 0.12 + Math.sin(Date.now() * 0.005) * 0.04;
                        ctx.fillStyle = '#ffd93d';
                        ctx.shadowColor = '#ffd93d'; ctx.shadowBlur = 10;
                        ctx.beginPath();
                        ctx.arc(cx + CELL / 2, cy + CELL / 2, CELL * pulse, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }
                }
            }
        }

        function drawPac() {
            const px = pac.x * CELL, py = pac.y * CELL;
            const angle = Math.atan2(pac.dy, pac.dx) || 0;
            const mouth = pac.mouth * Math.PI;
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(angle);
            ctx.shadowColor = '#ffd93d'; ctx.shadowBlur = 18;
            ctx.fillStyle = '#ffd93d';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, CELL * 0.44, mouth, Math.PI * 2 - mouth);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        function drawGhost(g) {
            const gx = g.x * CELL, gy = g.y * CELL;
            const r = CELL * 0.44;
            let color = GHOST_COLORS[ghosts.indexOf(g)];
            if (g.frightened && !g.eaten) {
                color = frightenTimer < 2000 && Math.floor(Date.now() / 250) % 2 ? '#fff' : '#3b82f6';
            }
            if (g.eaten) color = 'rgba(255,255,255,0.2)';

            ctx.save();
            ctx.translate(gx, gy);
            if (!g.eaten) {
                ctx.shadowColor = color; ctx.shadowBlur = 14;
                ctx.fillStyle = color;
                // Body
                ctx.beginPath();
                ctx.arc(0, 0, r, Math.PI, 0);
                ctx.lineTo(r, r * 0.85);
                const waves = 3;
                for (let i = waves; i >= 0; i--) {
                    const wx = -r + (2 * r / waves) * i;
                    const wy = r * 0.85 - (i % 2 === 0 ? r * 0.25 : 0);
                    ctx.lineTo(wx, wy);
                }
                ctx.lineTo(-r, 0);
                ctx.closePath();
                ctx.fill();
                // Eyes
                if (!g.frightened) {
                    ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
                    ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#1e3a8a';
                    ctx.beginPath(); ctx.arc(-r * 0.3 + g.dx * r * 0.1, -r * 0.1 + g.dy * r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(r * 0.3 + g.dx * r * 0.1, -r * 0.1 + g.dy * r * 0.1, r * 0.12, 0, Math.PI * 2); ctx.fill();
                }
            } else {
                // Just eyes
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
        }

        function drawHUD() {
            // Lives
            for (let i = 0; i < lives; i++) {
                ctx.fillStyle = '#ffd93d';
                ctx.shadowColor = '#ffd93d'; ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(CELL * (0.8 + i * 1.4), CH - CELL * 0.7, CELL * 0.35, 0.3, Math.PI * 2 - 0.3);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        function draw() {
            ctx.fillStyle = '#060914';
            ctx.fillRect(0, 0, CW, CH);
            if (!map || !pac || !ghosts) return; // not yet started
            drawMaze();
            drawPac();
            ghosts.forEach(drawGhost);
            drawHUD();
        }

        function gameOver() {
            overlay.style.display = 'flex';
            overlay.innerHTML = `
        <h2>Game Over</h2>
        <p>Score: <strong style="color:#ffd93d;font-size:1.4rem">${score.toLocaleString()}</strong><br>
        Best: <strong style="color:#5b7fff">${getHighScore().toLocaleString()}</strong></p>
        <button class="pm-btn" id="pm-start">Play Again</button>
      `;
            document.getElementById('pm-start').addEventListener('click', startGame);
        }

        function doLoop(ts) {
            raf = requestAnimationFrame(doLoop);
            const dt = Math.min((ts - lastT) / 16.67, 3); lastT = ts;
            update(dt);
            draw();
        }

        // Controls
        function onKey(e) {
            switch (e.code) {
                case 'ArrowLeft': e.preventDefault(); pac.nextDx = -1; pac.nextDy = 0; break;
                case 'ArrowRight': e.preventDefault(); pac.nextDx = 1; pac.nextDy = 0; break;
                case 'ArrowUp': e.preventDefault(); pac.nextDx = 0; pac.nextDy = -1; break;
                case 'ArrowDown': e.preventDefault(); pac.nextDx = 0; pac.nextDy = 1; break;
            }
        }
        document.addEventListener('keydown', onKey);

        ['mc-left', 'mc-right', 'mc-up', 'mc-down'].forEach((id, i) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            btn.addEventListener('touchstart', e => {
                e.preventDefault(); pac.nextDx = dirs[i][0]; pac.nextDy = dirs[i][1];
            }, { passive: false });
        });

        // Swipe
        let stx, sty;
        canvas.addEventListener('touchstart', e => { stx = e.touches[0].clientX; sty = e.touches[0].clientY; }, { passive: true });
        canvas.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - stx, dy = e.changedTouches[0].clientY - sty;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 15) return;
            if (Math.abs(dx) > Math.abs(dy)) { pac.nextDx = dx < 0 ? -1 : 1; pac.nextDy = 0; }
            else { pac.nextDx = 0; pac.nextDy = dy < 0 ? -1 : 1; }
        }, { passive: true });

        // Start overlay
        overlay.innerHTML = `
      <h2>👻 Pac-Man</h2>
      <p>Eat all dots to complete the level.<br>Power pellets let you eat ghosts!</p>
      <button class="pm-btn" id="pm-start">Start Game</button>
    `;
        document.getElementById('pm-start').addEventListener('click', startGame);
        draw();
        raf = requestAnimationFrame(doLoop);

        window.currentGameCleanup = () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('keydown', onKey);
            style.remove();
        };
    };
})();
