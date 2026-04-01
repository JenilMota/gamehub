/* =============================================
   SNAKE — Neon Reborn v4.0
   Smooth interpolated movement, neon trail,
   particle bursts, power-ups, combo system
   ============================================= */
(function () {
    'use strict';

    const CSS = `
    #sn-wrap{width:100%;height:100%;position:relative;background:#060914;display:flex;align-items:center;justify-content:center;}
    #sn-canvas{display:block;border-radius:16px;}
    #sn-overlay{
      position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:16px;
      background:rgba(6,9,20,0.92);backdrop-filter:blur(20px);z-index:10;border-radius:16px;
      animation:snFade 0.3s ease-out;
    }
    @keyframes snFade{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
    #sn-overlay h2{
      font-size:2.4rem;font-weight:900;font-family:Inter,sans-serif;letter-spacing:-1px;
      background:linear-gradient(135deg,#4ade80,#38bdf8);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    #sn-overlay p{color:#64748b;font-family:Inter,sans-serif;font-size:0.9rem;text-align:center;line-height:1.6;}
    #sn-overlay .sn-big{font-size:2rem;font-weight:800;color:#4ade80;font-family:Inter,sans-serif;}
    .sn-btn{
      padding:13px 40px;border:none;border-radius:999px;cursor:pointer;
      background:linear-gradient(135deg,#4ade80,#38bdf8);color:#060914;
      font-family:Inter,sans-serif;font-size:1rem;font-weight:900;
      box-shadow:0 4px 24px rgba(74,222,128,0.4);transition:transform 0.15s,box-shadow 0.15s;
    }
    .sn-btn:hover{transform:scale(1.07);box-shadow:0 6px 32px rgba(74,222,128,0.55);}
    #sn-combo{
      position:absolute;top:14px;left:50%;transform:translateX(-50%);
      font-family:Inter,sans-serif;font-weight:900;font-size:1.1rem;
      color:#fbbf24;text-shadow:0 0 12px #fbbf24;pointer-events:none;
      opacity:0;transition:opacity 0.4s;z-index:5;
    }
  `;
    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const R = container.getBoundingClientRect();
        const SIZE = Math.min(R.width, R.height) - 20;
        const GRID = 20;
        const CELL = Math.floor(SIZE / GRID);
        const W = CELL * GRID, H = CELL * GRID;

        const wrap = document.createElement('div'); wrap.id = 'sn-wrap';
        const canvas = document.createElement('canvas'); canvas.id = 'sn-canvas';
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const overlay = document.createElement('div'); overlay.id = 'sn-overlay';
        const comboEl = document.createElement('div'); comboEl.id = 'sn-combo';
        wrap.appendChild(canvas); wrap.appendChild(overlay); wrap.appendChild(comboEl);
        container.appendChild(wrap);

        // State
        let snake, dir, nextDir, food, bonus, particles, score, combo, running, raf, lastT = 0, tick = 0;
        let moveTimer = 0, MOVE_INTERVAL = 0.14;
        let interpProgress = 0;
        let deadAnim = 0;
        let comboTimeout;

        function rndCell() { return { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }; }

        function spawnFood() {
            let f;
            do { f = rndCell(); } while (onSnake(f.x, f.y));
            food = { ...f, pulse: 0, type: Math.random() < 0.15 ? 'golden' : 'normal' };
        }

        function spawnBonus() {
            if (bonus || Math.random() > 0.2) return;
            let f;
            do { f = rndCell(); } while (onSnake(f.x, f.y) || (f.x === food.x && f.y === food.y));
            bonus = { ...f, ttl: 8, pulse: 0 };
        }

        function onSnake(x, y) { return snake.some(s => s.x === x && s.y === y); }

        function spawnParticles(cx, cy, color, n = 12) {
            for (let i = 0; i < n; i++) {
                const angle = (Math.PI * 2 * i) / n + Math.random() * 0.3;
                const spd = 1.5 + Math.random() * 3;
                particles.push({ x: cx, y: cy, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, color });
            }
        }

        function reset() {
            const mid = Math.floor(GRID / 2);
            snake = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
            dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
            particles = []; score = 0; combo = 0;
            bonus = null; running = true; deadAnim = 0;
            moveTimer = 0; interpProgress = 0;
            MOVE_INTERVAL = 0.14;
            spawnFood();
            scoreEl.textContent = '0';
            if (highScoreEl) highScoreEl.textContent = getHighScore();
        }

        function showOverlay(type) {
            overlay.style.display = 'flex';
            if (type === 'start') {
                overlay.innerHTML = `
          <h2>🐍 Snake</h2>
          <p>Eat food to grow. Don't hit the walls or yourself!<br>Golden apples give bonus points & speed boost.</p>
          <button class="sn-btn" id="sn-start">Play</button>
        `;
            } else {
                const best = getHighScore();
                overlay.innerHTML = `
          <h2>Game Over</h2>
          <div class="sn-big">${score.toLocaleString()}</div>
          <p>Length: ${snake.length} · Best: ${best.toLocaleString()}</p>
          <button class="sn-btn" id="sn-start">Try Again</button>
        `;
            }
            document.getElementById('sn-start').addEventListener('click', () => {
                overlay.style.display = 'none';
                reset();
                if (!raf) raf = requestAnimationFrame(loop);
            });
        }

        function showCombo(n) {
            if (n < 3) return;
            comboEl.textContent = `${n}x COMBO! +${n * 5}`;
            comboEl.style.opacity = '1';
            clearTimeout(comboTimeout);
            comboTimeout = setTimeout(() => { comboEl.style.opacity = '0'; }, 1400);
        }

        // Input
        const DIRS = {
            ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 }, A: { x: -1, y: 0 },
            ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 }, D: { x: 1, y: 0 },
            ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 }, W: { x: 0, y: -1 },
            ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 }, S: { x: 0, y: 1 },
        };
        function onKey(e) {
            const d = DIRS[e.key];
            if (d && !(d.x === -dir.x && d.y === -dir.y)) {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
                nextDir = d;
            }
        }
        document.addEventListener('keydown', onKey);

        // Mobile swipe
        let tx0, ty0;
        canvas.addEventListener('touchstart', e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
        canvas.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0;
            if (Math.max(Math.abs(dx), Math.abs(dy)) < 15) return;
            const d = Math.abs(dx) > Math.abs(dy)
                ? (dx < 0 ? { x: -1, y: 0 } : { x: 1, y: 0 })
                : (dy < 0 ? { x: 0, y: -1 } : { x: 0, y: 1 });
            if (!(d.x === -dir.x && d.y === -dir.y)) nextDir = d;
        }, { passive: true });

        // Mobile buttons
        [['mc-up', { x: 0, y: -1 }], ['mc-down', { x: 0, y: 1 }], ['mc-left', { x: -1, y: 0 }], ['mc-right', { x: 1, y: 0 }]].forEach(([id, d]) => {
            document.getElementById(id)?.addEventListener('touchstart', e => { e.preventDefault(); if (!(d.x === -dir.x && d.y === -dir.y)) nextDir = d; }, { passive: false });
        });

        function update(dt) {
            if (!running) { if (deadAnim < 1) { deadAnim += dt * 2; } return; }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx; p.y += p.vy; p.vx *= 0.88; p.vy *= 0.88; p.life -= dt * 1.5;
                if (p.life <= 0) particles.splice(i, 1);
            }

            // Food pulse
            food.pulse += dt * 4;
            if (bonus) { bonus.pulse += dt * 4; bonus.ttl -= dt; if (bonus.ttl <= 0) bonus = null; }

            // Snake move tick
            interpProgress = Math.min(1, interpProgress + dt / MOVE_INTERVAL);
            moveTimer += dt;
            if (moveTimer < MOVE_INTERVAL) return;
            moveTimer -= MOVE_INTERVAL;
            interpProgress = 0;

            dir = { ...nextDir };
            const head = snake[0];
            const nx = (head.x + dir.x + GRID) % GRID;
            const ny = (head.y + dir.y + GRID) % GRID;

            // Wall collision (no wrap — die)
            if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID || onSnake(nx, ny)) {
                running = false;
                spawnParticles(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2, '#f87171', 20);
                vibrate?.([50, 30, 80]);
                setHighScore(score);
                setTimeout(() => showOverlay('dead'), 700);
                return;
            }

            snake.unshift({ x: nx, y: ny });
            tick++;

            // Eat food
            if (nx === food.x && ny === food.y) {
                const pts = food.type === 'golden' ? 50 : 10;
                combo++;
                score += pts + (combo >= 3 ? combo * 5 : 0);
                scoreEl.textContent = score;
                setHighScore(score);
                if (highScoreEl) highScoreEl.textContent = getHighScore();
                spawnParticles(nx * CELL + CELL / 2, ny * CELL + CELL / 2, food.type === 'golden' ? '#fbbf24' : '#4ade80', 14);
                showCombo(combo);
                if (food.type === 'golden') MOVE_INTERVAL = Math.max(0.06, MOVE_INTERVAL - 0.01);
                MOVE_INTERVAL = Math.max(0.06, MOVE_INTERVAL - 0.002);
                spawnFood();
                spawnBonus();
            } else if (bonus && nx === bonus.x && ny === bonus.y) {
                score += 30; combo++;
                scoreEl.textContent = score; setHighScore(score);
                spawnParticles(nx * CELL + CELL / 2, ny * CELL + CELL / 2, '#a78bfa', 10);
                bonus = null;
            } else {
                snake.pop();
                combo = 0;
            }
        }

        function draw() {
            // Background
            ctx.fillStyle = '#060914'; ctx.fillRect(0, 0, W, H);

            // Grid lines
            ctx.strokeStyle = 'rgba(74,222,128,0.04)'; ctx.lineWidth = 0.5;
            for (let x = 0; x <= GRID; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, H); ctx.stroke(); }
            for (let y = 0; y <= GRID; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(W, y * CELL); ctx.stroke(); }

            // Particles
            for (const p of particles) {
                ctx.save(); ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            // Bonus
            if (bonus) {
                const bx = bonus.x * CELL + CELL / 2, by = bonus.y * CELL + CELL / 2;
                const pulse = 0.18 + Math.sin(bonus.pulse) * 0.05;
                ctx.save();
                ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 20;
                ctx.font = `${CELL * 1.1}px serif`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.scale(1 + pulse * 0.2, 1 + pulse * 0.2);
                ctx.fillText('⭐', bx / (1 + pulse * 0.2), by / (1 + pulse * 0.2));
                ctx.restore();
                // TTL ring
                ctx.save();
                ctx.strokeStyle = 'rgba(167,139,250,0.4)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(bx, by, CELL * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (bonus.ttl / 8));
                ctx.stroke(); ctx.restore();
            }

            // Food
            if (food) {
                const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
                const ps = Math.sin(food.pulse) * CELL * 0.06;
                const isGolden = food.type === 'golden';
                ctx.save();
                ctx.shadowColor = isGolden ? '#fbbf24' : '#4ade80'; ctx.shadowBlur = 22;
                ctx.fillStyle = isGolden ? '#fbbf24' : '#4ade80';
                ctx.beginPath();
                ctx.arc(fx, fy, CELL * 0.38 + ps, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = isGolden ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.4)';
                ctx.beginPath(); ctx.arc(fx - CELL * 0.1, fy - CELL * 0.1, CELL * 0.12, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            // Snake — draw tail to head with interpolation on head
            const ip = interpProgress;
            for (let i = snake.length - 1; i >= 0; i--) {
                const seg = snake[i];
                const sx = seg.x * CELL, sy = seg.y * CELL;
                const t = 1 - i / snake.length;
                const green = Math.round(180 + t * 75);

                ctx.save();
                ctx.shadowColor = `rgb(0,${green},100)`; ctx.shadowBlur = i === 0 ? 20 : 10;
                ctx.fillStyle = `rgb(${Math.round(t * 30)},${green},${Math.round(t * 80 + 50)})`;

                let rx = sx, ry = sy;
                if (i === 0 && running) {
                    rx = sx + dir.x * CELL * ip - dir.x * CELL * (1 - ip);
                    ry = sy + dir.y * CELL * ip - dir.y * CELL * (1 - ip);
                    rx = snake[0].x * CELL - dir.x * CELL * (1 - ip) + dir.x * CELL * ip;
                    ry = snake[0].y * CELL - dir.y * CELL * (1 - ip) + dir.y * CELL * ip;
                }

                const pad = i === 0 ? 1 : 2;
                ctx.beginPath();
                ctx.roundRect(rx + pad, ry + pad, CELL - pad * 2, CELL - pad * 2, i === 0 ? 6 : 4);
                ctx.fill();

                // Eyes on head
                if (i === 0) {
                    ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
                    const ex = i === 0 ? (rx + CELL / 2) : (sx + CELL / 2);
                    const ey = i === 0 ? (ry + CELL / 2) : (sy + CELL / 2);
                    const eyeR = CELL * 0.12;
                    const ex1 = ex + (dir.y !== 0 ? -CELL * 0.2 : dir.x * CELL * 0.1) + (dir.y * CELL * 0.2);
                    const ey1 = ey + (dir.x !== 0 ? -CELL * 0.2 : dir.y * CELL * 0.1) + (dir.x * CELL * 0.2);
                    const ex2 = ex - (dir.y !== 0 ? -CELL * 0.2 : 0) - (dir.y * CELL * 0.2);
                    const ey2 = ey - (dir.x !== 0 ? -CELL * 0.2 : 0) - (dir.x * CELL * 0.2);
                    ctx.beginPath(); ctx.arc(ex1, ey1, eyeR, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = '#060914';
                    ctx.beginPath(); ctx.arc(ex1 + dir.x * 2, ey1 + dir.y * 2, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.arc(ex2 + dir.x * 2, ey2 + dir.y * 2, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }

            // Score display
            ctx.fillStyle = 'rgba(74,222,128,0.25)';
            ctx.font = `bold ${CELL * 0.7}px Inter,sans-serif`;
            ctx.textAlign = 'right'; ctx.textBaseline = 'top';
            ctx.fillText(`${snake.length - 3}`, W - 8, 8);
            ctx.textAlign = 'left';
        }

        function loop(now) {
            raf = requestAnimationFrame(loop);
            const dt = Math.min((now - lastT) / 1000, 0.1); lastT = now;
            update(dt); draw();
        }

        showOverlay('start');
        raf = requestAnimationFrame(loop);

        window.currentGameCleanup = () => {
            cancelAnimationFrame(raf); raf = null;
            document.removeEventListener('keydown', onKey);
            clearTimeout(comboTimeout);
            styleEl.remove();
        };
    };
})();
