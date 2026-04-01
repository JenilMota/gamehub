/* ================================================
   CROSSY ROAD — Full Implementation v2.0
   Hop across roads, rivers (logs), rails (trains)
   Procedural infinite lanes, lives, neon glow
   FIXED: coordinate system — roads below frog
   ================================================ */
(function () {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
    #cr-wrap { width:100%;height:100%;position:relative;overflow:hidden;background:#060914; }
    #cr-canvas { display:block; }
    #cr-overlay {
      position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;
      background:rgba(6,9,20,0.90);backdrop-filter:blur(18px);z-index:10;
    }
    #cr-overlay h2 {
      font-size:2.2rem;font-weight:900;letter-spacing:-1px;font-family:Inter,sans-serif;
      background:linear-gradient(135deg,#4ade80,#38d9c0);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    #cr-overlay p { color:#8892b0;font-size:0.9rem;font-family:Inter,sans-serif;text-align:center; }
    #cr-overlay .cr-btn {
      padding:12px 36px;border:none;border-radius:999px;cursor:pointer;
      background:linear-gradient(135deg,#4ade80,#38d9c0);color:#060914;
      font-family:Inter,sans-serif;font-size:1rem;font-weight:900;
      box-shadow:0 4px 20px rgba(74,222,128,0.4);transition:transform 0.15s;
    }
    #cr-overlay .cr-btn:hover{transform:scale(1.06);}
    #cr-hint{font-size:0.7rem;color:#4a5270;font-family:Inter,sans-serif;margin-top:4px;}
  `;
    document.head.appendChild(style);

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile }) {
        const CR = container.getBoundingClientRect();
        const W = Math.floor(CR.width), H = Math.floor(CR.height);

        const wrap = document.createElement('div'); wrap.id = 'cr-wrap';
        const canvas = document.createElement('canvas'); canvas.id = 'cr-canvas';
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const overlay = document.createElement('div'); overlay.id = 'cr-overlay';
        wrap.appendChild(canvas); wrap.appendChild(overlay);
        container.appendChild(wrap);

        // Grid
        const COLS = 13;
        const CELL = Math.floor(W / COLS);
        const VISIBLE_ROWS = Math.ceil(H / CELL) + 2;

        // Lane types — row 0 = safe spawn, row > 0 = danger going down
        const LANE_TYPES = ['safe', 'road', 'road', 'river', 'river', 'rail', 'road', 'safe', 'river', 'road', 'rail'];

        // State
        let frog, lanes, cameraY, score, lives, raf, running, lastT = 0;
        let hopAnim = { active: false, progress: 0 };
        let deathAnim = { active: false, frame: 0 };

        function mkRng(seed) {
            let s = seed;
            return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
        }

        // Generate lanes: row 0 = safe spawn at top, positive rows go downward = danger
        function generateLanes(count) {
            const result = [];
            const rng = mkRng(12345);
            for (let row = 0; row < count; row++) {
                if (row === 0 || row === 1) {
                    result.push({ type: 'safe', row, color: '#1a3a2a', objs: [] });
                    continue;
                }
                const li = ((row - 2) % (LANE_TYPES.length - 1)) + 1; // skip 'safe' variants after row 1
                const type = LANE_TYPES[li % LANE_TYPES.length] === 'safe' ? 'road' : LANE_TYPES[li % LANE_TYPES.length];
                let color = '#1a3a2a';
                if (type === 'road') color = row % 2 === 0 ? '#1a1a2e' : '#10102a';
                if (type === 'river') color = row % 2 === 0 ? '#0c2a4a' : '#0a2040';
                if (type === 'rail') color = '#1a1a1a';
                const dir = rng() > 0.5 ? 1 : -1;
                const baseSpeed = type === 'road' ? CELL * 0.003 : type === 'rail' ? CELL * 0.008 : CELL * 0.0015;
                const speed = baseSpeed * (1 + row * 0.02);
                const objs = [];
                const objCount = type === 'rail' ? 1 : Math.floor(rng() * 3) + 1;
                for (let j = 0; j < objCount; j++) {
                    const ox = rng() * W * 1.5;
                    const ow = type === 'river' ? CELL * (Math.floor(rng() * 2) + 2) : CELL * (Math.floor(rng() * 2) + 1);
                    objs.push({ x: ox, w: ow });
                }
                result.push({ type, row, color, dir, speed, objs });
            }
            return result;
        }

        function getLane(row) {
            return lanes.find(l => l.row === row);
        }

        function initGame2() {
            frog = { col: Math.floor(COLS / 2), row: 0, alive: true };
            cameraY = 0; // camera offset in pixels (how far view has scrolled down)
            score = 0; lives = 3;
            lanes = generateLanes(VISIBLE_ROWS + 60);
            hopAnim = { active: false, progress: 0 };
            deathAnim = { active: false, frame: 0 };
            running = true;
            scoreEl.textContent = '0';
            overlay.style.display = 'none';
        }

        // Hop: dcol = left/right, drow = up(-1)/down(+1)
        // Score when hopping DOWN (forward into danger)
        function tryHop(dcol, drow) {
            if (!running || hopAnim.active || deathAnim.active || !frog.alive) return;
            const newCol = frog.col + dcol;
            const newRow = frog.row + drow;
            if (newCol < 0 || newCol >= COLS) return;
            if (newRow < 0) return; // can't go above spawn
            // Extend lanes if needed
            while (lanes.length <= newRow + 10) {
                const nextRow = lanes.length;
                generateMoreLanes(nextRow, 10);
            }
            hopAnim = { active: true, progress: 0, fromCol: frog.col, fromRow: frog.row, toCol: newCol, toRow: newRow };
            frog.col = newCol; frog.row = newRow;
            // Score when moving forward (down)
            if (drow > 0) {
                score++;
                scoreEl.textContent = score;
                setHighScore(score);
                if (highScoreEl) highScoreEl.textContent = getHighScore();
                // Move camera down to follow frog
                const frogScreenY = (frog.row * CELL) - cameraY;
                const targetScreenY = H * 0.6;
                if (frogScreenY > targetScreenY) {
                    cameraY = frog.row * CELL - targetScreenY;
                }
            }
        }

        function generateMoreLanes(fromRow, count) {
            const rng = mkRng(fromRow * 777 + 42);
            for (let i = 0; i < count; i++) {
                const row = fromRow + i;
                const li = ((row - 2) % (LANE_TYPES.length - 1)) + 1;
                const type = LANE_TYPES[li % LANE_TYPES.length] === 'safe' ? 'road' : LANE_TYPES[li % LANE_TYPES.length];
                let color = '#1a3a2a';
                if (type === 'road') color = row % 2 === 0 ? '#1a1a2e' : '#10102a';
                if (type === 'river') color = row % 2 === 0 ? '#0c2a4a' : '#0a2040';
                if (type === 'rail') color = '#1a1a1a';
                const dir = rng() > 0.5 ? 1 : -1;
                const baseSpeed = type === 'road' ? CELL * 0.003 : type === 'rail' ? CELL * 0.008 : CELL * 0.0015;
                const speed = baseSpeed * (1 + row * 0.02);
                const objs = [];
                const objCount = type === 'rail' ? 1 : Math.floor(rng() * 3) + 1;
                for (let j = 0; j < objCount; j++) {
                    const ox = rng() * W * 1.5;
                    const ow = type === 'river' ? CELL * (Math.floor(rng() * 2) + 2) : CELL * (Math.floor(rng() * 2) + 1);
                    objs.push({ x: ox, w: ow });
                }
                lanes.push({ type, row, color, dir, speed, objs });
            }
        }

        function checkDeath() {
            const lane = getLane(frog.row);
            if (!lane || lane.type === 'safe') return;
            const fx = frog.col * CELL + CELL / 2;

            if (lane.type === 'road' || lane.type === 'rail') {
                for (const obj of lane.objs) {
                    const ox = ((obj.x % (W + obj.w)) + W + obj.w) % (W + obj.w) - obj.w;
                    if (fx > ox && fx < ox + obj.w) {
                        killFrog(); return;
                    }
                }
            }
            if (lane.type === 'river') {
                let onLog = false;
                for (const obj of lane.objs) {
                    const ox = ((obj.x % (W + obj.w)) + W + obj.w) % (W + obj.w) - obj.w;
                    if (fx > ox + 4 && fx < ox + obj.w - 4) { onLog = true; }
                }
                if (!onLog) { killFrog(); }
            }
        }

        function killFrog() {
            if (deathAnim.active) return;
            deathAnim = { active: true, frame: 0 };
            lives--;
            if (lives <= 0) { running = false; setTimeout(showGameOver, 800); }
            else { setTimeout(() => { frog.row = 0; frog.col = Math.floor(COLS / 2); cameraY = 0; deathAnim = { active: false, frame: 0 }; }, 700); }
        }

        function showGameOver() {
            overlay.style.display = 'flex';
            overlay.innerHTML = `
        <h2>💥 Game Over</h2>
        <p>Score: <strong style="color:#4ade80;font-size:1.4rem">${score.toLocaleString()}</strong><br>
        Best: <strong style="color:#38d9c0">${getHighScore().toLocaleString()}</strong></p>
        <button class="cr-btn" id="cr-start">Play Again</button>
      `;
            document.getElementById('cr-start').addEventListener('click', () => { initGame2(); raf = requestAnimationFrame(loop); });
        }

        function update(dt) {
            if (!running) return;

            // Move objects in lanes
            for (const lane of lanes) {
                if (!lane.objs) continue;
                for (const obj of lane.objs) {
                    obj.x += lane.dir * lane.speed * dt * 60;
                }
            }

            // Hop animation
            if (hopAnim.active) {
                hopAnim.progress = Math.min(1, hopAnim.progress + dt * 0.25);
                if (hopAnim.progress >= 1) { hopAnim.active = false; checkDeath(); }
            } else {
                checkDeath();
            }

            // Death animation
            if (deathAnim.active) deathAnim.frame++;
        }

        function drawLane(lane) {
            const sy = lane.row * CELL - cameraY;
            if (sy < -CELL * 2 || sy > H + CELL * 2) return;

            ctx.fillStyle = lane.color;
            ctx.fillRect(0, sy, W, CELL);

            // Lane markings
            if (lane.type === 'road') {
                ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2; ctx.setLineDash([CELL * 0.4, CELL * 0.3]);
                ctx.beginPath(); ctx.moveTo(0, sy + CELL / 2); ctx.lineTo(W, sy + CELL / 2); ctx.stroke();
                ctx.setLineDash([]);
            } else if (lane.type === 'rail') {
                ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(0, sy + CELL * 0.25); ctx.lineTo(W, sy + CELL * 0.25); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, sy + CELL * 0.75); ctx.lineTo(W, sy + CELL * 0.75); ctx.stroke();
                ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
                for (let x = 0; x < W; x += CELL * 0.5) { ctx.beginPath(); ctx.moveTo(x, sy + CELL * 0.1); ctx.lineTo(x, sy + CELL * 0.9); ctx.stroke(); }
            } else if (lane.type === 'river') {
                ctx.strokeStyle = 'rgba(56,217,192,0.08)'; ctx.lineWidth = 1.5;
                for (let x = ((Date.now() * 0.02) % (CELL * 2)); x < W; x += CELL * 2) {
                    ctx.beginPath(); ctx.moveTo(x, sy + CELL * 0.5); ctx.quadraticCurveTo(x + CELL * 0.5, sy + CELL * 0.3, x + CELL, sy + CELL * 0.5); ctx.stroke();
                }
            }

            // Objects (cars, logs, trains)
            if (!lane.objs) return;
            for (const obj of lane.objs) {
                let ox = ((obj.x % (W + obj.w)) + W + obj.w) % (W + obj.w) - obj.w;
                while (ox < W + obj.w) {
                    if (lane.type === 'river') {
                        ctx.save();
                        ctx.shadowColor = '#78350f'; ctx.shadowBlur = 8;
                        ctx.fillStyle = '#92400e';
                        ctx.beginPath(); ctx.roundRect(ox, sy + CELL * 0.2, obj.w, CELL * 0.6, 6); ctx.fill();
                        ctx.fillStyle = 'rgba(255,255,255,0.08)';
                        for (let li = CELL * 0.3; li < obj.w - CELL * 0.2; li += CELL * 0.4) { ctx.beginPath(); ctx.arc(ox + li, sy + CELL * 0.5, 4, 0, Math.PI * 2); ctx.fill(); }
                        ctx.restore();
                    } else if (lane.type === 'road') {
                        ctx.save();
                        const carColors = ['#ef4444', '#3b82f6', '#facc15', '#a855f7', '#22c55e'];
                        const ci = (Math.abs(Math.floor(obj.x / 100))) % carColors.length;
                        ctx.shadowColor = carColors[ci]; ctx.shadowBlur = 10;
                        ctx.fillStyle = carColors[ci];
                        ctx.beginPath(); ctx.roundRect(ox + 2, sy + CELL * 0.15, obj.w - 4, CELL * 0.7, 5); ctx.fill();
                        ctx.fillStyle = 'rgba(200,240,255,0.6)';
                        ctx.beginPath(); ctx.roundRect(ox + obj.w * 0.2, sy + CELL * 0.2, obj.w * 0.25, CELL * 0.45, 3); ctx.fill();
                        ctx.beginPath(); ctx.roundRect(ox + obj.w * 0.55, sy + CELL * 0.2, obj.w * 0.25, CELL * 0.45, 3); ctx.fill();
                        ctx.fillStyle = 'rgba(255,255,200,0.9)';
                        const lx = lane.dir > 0 ? ox + obj.w - 6 : ox + 2;
                        ctx.beginPath(); ctx.arc(lx, sy + CELL * 0.3, 3, 0, Math.PI * 2); ctx.fill();
                        ctx.beginPath(); ctx.arc(lx, sy + CELL * 0.7, 3, 0, Math.PI * 2); ctx.fill();
                        ctx.restore();
                    } else if (lane.type === 'rail') {
                        ctx.save();
                        ctx.shadowColor = '#f87171'; ctx.shadowBlur = 14;
                        ctx.fillStyle = '#7f1d1d';
                        ctx.beginPath(); ctx.roundRect(ox + 2, sy + CELL * 0.1, obj.w - 4, CELL * 0.8, 4); ctx.fill();
                        ctx.fillStyle = '#ef4444';
                        ctx.beginPath(); ctx.roundRect(ox + 2, sy + CELL * 0.1, obj.w * 0.6, CELL * 0.8, 4); ctx.fill();
                        ctx.fillStyle = 'rgba(255,255,200,0.8)';
                        const tx2 = lane.dir > 0 ? ox + obj.w - 5 : ox + 3;
                        ctx.beginPath(); ctx.ellipse(tx2, sy + CELL / 2, 4, 6, 0, 0, Math.PI * 2); ctx.fill();
                        ctx.restore();
                    }
                    ox += W + obj.w * 1.5;
                }
            }
        }

        function drawFrog() {
            let fx, fy;
            if (hopAnim.active) {
                const t = hopAnim.progress;
                const et = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                fx = (hopAnim.fromCol + (frog.col - hopAnim.fromCol) * et) * CELL;
                fy = (hopAnim.fromRow + (frog.row - hopAnim.fromRow) * et) * CELL - cameraY;
                // Hop arc
                fy -= Math.sin(t * Math.PI) * CELL * 0.5;
            } else {
                fx = frog.col * CELL;
                fy = frog.row * CELL - cameraY;
            }

            const cx = fx + CELL / 2, cy = fy + CELL / 2;
            const r = CELL * 0.36;

            if (deathAnim.active) {
                ctx.save();
                ctx.globalAlpha = Math.max(0, 1 - deathAnim.frame / 20);
                const scale = 1 + deathAnim.frame * 0.06;
                ctx.translate(cx, cy); ctx.scale(scale, scale);
                ctx.fillStyle = '#f87171'; ctx.shadowColor = '#f87171'; ctx.shadowBlur = 20;
                ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
                ctx.restore(); return;
            }

            ctx.save();
            ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 18;
            ctx.fillStyle = '#166534';
            ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.1, r * 0.85, r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#22c55e';
            ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.3, r * 0.22, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#166534';
            ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.11, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 0.3, r * 0.11, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#166534'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(cx, cy + r * 0.05, r * 0.3, 0.2, Math.PI - 0.2); ctx.stroke();
            ctx.restore();
        }

        function drawHUD() {
            for (let i = 0; i < lives; i++) {
                ctx.save();
                ctx.fillStyle = '#22c55e'; ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(CELL * (0.5 + i * 1.2), 18, 8, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = `bold ${CELL * 0.45}px Inter,sans-serif`;
            ctx.textAlign = 'right'; ctx.fillText(`🏆 ${score}`, W - 10, 26);
            ctx.textAlign = 'left';
        }

        function draw() {
            ctx.fillStyle = '#060914'; ctx.fillRect(0, 0, W, H);
            // Draw all visible lanes
            const startRow = Math.floor(cameraY / CELL) - 1;
            const endRow = startRow + VISIBLE_ROWS + 2;
            lanes.filter(l => l.row >= startRow && l.row <= endRow).forEach(drawLane);
            drawFrog();
            drawHUD();
        }

        function loop(ts) {
            raf = requestAnimationFrame(loop);
            const dt = Math.min((ts - lastT) / 16.67, 3); lastT = ts;
            update(dt); draw();
        }

        // Controls
        function onKey(e) {
            switch (e.code) {
                case 'ArrowLeft': e.preventDefault(); tryHop(-1, 0); break;
                case 'ArrowRight': e.preventDefault(); tryHop(1, 0); break;
                case 'ArrowUp': e.preventDefault(); tryHop(0, 1); break;   // forward = down = positive row
                case 'ArrowDown': e.preventDefault(); tryHop(0, -1); break; // backward = up = negative row (safe)
                case 'KeyA': tryHop(-1, 0); break;
                case 'KeyD': tryHop(1, 0); break;
                case 'KeyW': tryHop(0, 1); break;
                case 'KeyS': tryHop(0, -1); break;
            }
        }
        document.addEventListener('keydown', onKey);

        ['mc-left', 'mc-right', 'mc-up', 'mc-down'].forEach((id, i) => {
            const btn = document.getElementById(id); if (!btn) return;
            const hops = [[-1, 0], [1, 0], [0, 1], [0, -1]];
            btn.addEventListener('touchstart', e => { e.preventDefault(); tryHop(...hops[i]); }, { passive: false });
        });

        let stx, sty;
        canvas.addEventListener('touchstart', e => { stx = e.touches[0].clientX; sty = e.touches[0].clientY; }, { passive: true });
        canvas.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - stx, dy = e.changedTouches[0].clientY - sty;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 15) return;
            if (Math.abs(dx) > Math.abs(dy)) tryHop(dx < 0 ? -1 : 1, 0);
            else tryHop(0, dy > 0 ? 1 : -1); // swipe down = hop forward
        }, { passive: true });

        // Start overlay
        overlay.innerHTML = `
      <h2>🐸 Crossy Road</h2>
      <p>Hop forward to score points!<br>Dodge cars, trains &amp; don't fall in the river!</p>
      <button class="cr-btn" id="cr-start">Start Game</button>
      <div id="cr-hint">Arrow keys / WASD · Up = forward</div>
    `;
        document.getElementById('cr-start').addEventListener('click', () => {
            initGame2(); raf = requestAnimationFrame(loop);
        });

        window.currentGameCleanup = () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('keydown', onKey);
            style.remove();
        };
    };
})();
