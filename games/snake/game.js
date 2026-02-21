/* =============================================
   Snake — Neon Arcade v3.0
   Mobile-first with power-ups & particles
   ============================================= */
(function () {
    'use strict';

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const size = () => {
            const r = container.getBoundingClientRect();
            const avail = isMobile ? Math.min(r.width, window.innerHeight - 170) : Math.min(r.width - 32, r.height - 32, 460);
            return Math.max(200, avail);
        };

        const CELL = isMobile ? 18 : 20;
        let sz = size();
        let COLS = Math.floor(sz / CELL);
        let ROWS = COLS;
        let W = COLS * CELL;
        let H = ROWS * CELL;

        const wrapper = document.createElement('div');
        wrapper.className = 'game-canvas-wrapper';
        wrapper.style.position = 'relative';
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.display = 'block';
        canvas.style.borderRadius = isMobile ? '0' : '18px';
        canvas.style.touchAction = 'none';
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        const ctx = canvas.getContext('2d');

        // State
        let snake, dir, nextDir, food, bonus, score, state, speed;
        let particles = [], trails = [];
        let moveTimer = 0, lastTime = 0;
        let foodPulse = 0, eatFlash = 0;
        let touchStartX = 0, touchStartY = 0;

        // Power-up types
        const POWERUPS = [
            { type: 'star', color: '#ffd93d', emoji: '⭐', points: 50 },
            { type: 'boost', color: '#f87171', emoji: '🔥', effect: 'speed', duration: 5000 },
            { type: 'magnet', color: '#38d9c0', emoji: '🧲', effect: 'magnet', duration: 6000 },
        ];
        let activePowerup = null;
        let powerupTimer = 0;
        let magnetActive = false;
        let speedBoost = false;

        function reset() {
            const cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
            snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
            dir = { x: 1, y: 0 };
            nextDir = { x: 1, y: 0 };
            food = spawnFood();
            bonus = null;
            score = 0; speed = 130; moveTimer = 0;
            particles = []; trails = []; eatFlash = 0;
            activePowerup = null; powerupTimer = 0;
            magnetActive = false; speedBoost = false;
            state = 'ready';
            scoreEl.textContent = '0';
            highScoreEl.textContent = getHighScore();
            showOverlay('ready');
        }

        function spawnFood() {
            let pos;
            do { pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
            while (snake.some(s => s.x === pos.x && s.y === pos.y));
            return pos;
        }

        function spawnBonus() {
            const p = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
            let pos;
            do { pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
            while (snake.some(s => s.x === pos.x && s.y === pos.y));
            bonus = { ...p, ...pos, life: 8000 };
        }

        let overlayEl = null;
        function showOverlay(type) {
            removeOverlay();
            overlayEl = document.createElement('div');
            overlayEl.className = 'game-overlay';
            overlayEl.style.cssText = 'background:rgba(5,8,18,0.92);';
            if (type === 'ready') {
                overlayEl.innerHTML = `
          <h2 style="background:none;-webkit-text-fill-color:#4ade80;">🐍 Snake</h2>
          <p style="color:rgba(255,255,255,0.6);">Swipe / Arrow keys to move<br>Collect power-ups!</p>
          <button class="btn-primary" id="sn-go" style="background:linear-gradient(135deg,#4ade80,#22c55e);">Play</button>`;
            } else {
                const best = getHighScore();
                const isNew = score >= best && score > 0;
                overlayEl.innerHTML = `
          <h2 style="background:none;-webkit-text-fill-color:#fff;">Game Over</h2>
          <p class="score-big" style="color:#4ade80;">${score}</p>
          <p style="color:${isNew ? '#ffd93d' : 'rgba(255,255,255,0.5)'};font-weight:700;">${isNew ? '🏆 New High Score!' : 'Best: ' + best}</p>
          <button class="btn-primary" id="sn-go" style="background:linear-gradient(135deg,#4ade80,#22c55e);">Try Again</button>`;
            }
            wrapper.appendChild(overlayEl);
            setTimeout(() => {
                document.getElementById('sn-go')?.addEventListener('click', startPlaying);
            }, 30);
        }
        function removeOverlay() { overlayEl?.remove(); overlayEl = null; }

        function startPlaying() {
            removeOverlay();
            const cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
            snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
            dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 };
            food = spawnFood(); bonus = null; score = 0; speed = 130;
            moveTimer = 0; particles = []; trails = []; eatFlash = 0;
            activePowerup = null; powerupTimer = 0; magnetActive = false; speedBoost = false;
            scoreEl.textContent = '0'; state = 'playing'; lastTime = performance.now();
        }

        // Input
        function onKey(e) {
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
            if ((e.code === 'Space' || e.code === 'Enter') && state === 'ready') { startPlaying(); return; }
            if (state !== 'playing') return;
            if ((e.code === 'ArrowUp' || e.code === 'KeyW') && dir.y === 0) nextDir = { x: 0, y: -1 };
            if ((e.code === 'ArrowDown' || e.code === 'KeyS') && dir.y === 0) nextDir = { x: 0, y: 1 };
            if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && dir.x === 0) nextDir = { x: -1, y: 0 };
            if ((e.code === 'ArrowRight' || e.code === 'KeyD') && dir.x === 0) nextDir = { x: 1, y: 0 };
        }
        document.addEventListener('keydown', onKey);

        // Touch swipe
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            if (state === 'ready') { startPlaying(); return; }
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: false });
        canvas.addEventListener('touchend', e => {
            e.preventDefault();
            if (state !== 'playing') return;
            const dx = e.changedTouches[0].clientX - touchStartX;
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && dir.x === 0) nextDir = { x: 1, y: 0 };
                else if (dx < 0 && dir.x === 0) nextDir = { x: -1, y: 0 };
            } else {
                if (dy > 0 && dir.y === 0) nextDir = { x: 0, y: 1 };
                else if (dy < 0 && dir.y === 0) nextDir = { x: 0, y: -1 };
            }
        }, { passive: false });
        canvas.addEventListener('click', () => { if (state === 'ready') startPlaying(); });

        function spawnParticles(x, y, color, count = 8) {
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2;
                particles.push({
                    x, y,
                    vx: Math.cos(a) * (1.5 + Math.random() * 2.5),
                    vy: Math.sin(a) * (1.5 + Math.random() * 2.5),
                    life: 1, max: 1, r: 3 + Math.random() * 3, color,
                });
            }
        }

        function update(dt) {
            if (state !== 'playing') return;
            foodPulse += dt * 0.004;
            if (eatFlash > 0) eatFlash -= dt * 0.003;

            // Power-up timers
            if (activePowerup) {
                powerupTimer -= dt;
                if (powerupTimer <= 0) {
                    magnetActive = false; speedBoost = false; activePowerup = null;
                }
            }
            if (bonus) {
                bonus.life -= dt;
                if (bonus.life <= 0) bonus = null;
            }
            // Spawn bonus every ~15s
            if (!bonus && score > 0 && Math.random() < 0.0003 * dt) spawnBonus();

            // Move timer
            const spd = speedBoost ? speed * 0.55 : speed;
            moveTimer += dt;
            if (moveTimer < spd) return;
            moveTimer -= spd;

            dir = { ...nextDir };
            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
            // Wrap
            if (head.x < 0) head.x = COLS - 1; if (head.x >= COLS) head.x = 0;
            if (head.y < 0) head.y = ROWS - 1; if (head.y >= ROWS) head.y = 0;

            // Self collision
            if (snake.some(s => s.x === head.x && s.y === head.y)) { die(); return; }

            // Magnet: pull food towards head
            if (magnetActive) {
                const fdx = food.x - snake[0].x, fdy = food.y - snake[0].y;
                if (Math.abs(fdx) <= 2 && Math.abs(fdy) <= 2) {
                    food = { x: snake[0].x, y: snake[0].y };
                } else {
                    if (Math.abs(fdx) > Math.abs(fdy)) food.x -= Math.sign(fdx);
                    else food.y -= Math.sign(fdy);
                }
            }

            snake.unshift(head);

            // Eat food
            if (head.x === food.x && head.y === food.y) {
                score += 10;
                scoreEl.textContent = score;
                speed = Math.max(48, speed - 2); eatFlash = 1;
                spawnParticles(head.x * CELL + CELL / 2, head.y * CELL + CELL / 2, '#4ade80');
                vibrate(15);
                food = spawnFood();
                // Keep tail
            } else {
                // Pop trail
                trails.push({ x: snake[snake.length - 1].x, y: snake[snake.length - 1].y, a: 0.6 });
                snake.pop();
            }

            // Eat bonus
            if (bonus && head.x === bonus.x && head.y === bonus.y) {
                if (bonus.type === 'star') { score += bonus.points; scoreEl.textContent = score; }
                else { activePowerup = bonus.type; powerupTimer = bonus.duration; magnetActive = bonus.effect === 'magnet'; speedBoost = bonus.effect === 'speed'; }
                spawnParticles(bonus.x * CELL + CELL / 2, bonus.y * CELL + CELL / 2, bonus.color, 12);
                vibrate(30);
                bonus = null;
            }

            // Update particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx; p.y += p.vy; p.vy += 0.08;
                p.life -= 0.05;
                if (p.life <= 0) particles.splice(i, 1);
            }
            for (let i = trails.length - 1; i >= 0; i--) {
                trails[i].a -= 0.04;
                if (trails[i].a <= 0) trails.splice(i, 1);
            }
        }

        function die() {
            state = 'dead'; setHighScore(score);
            highScoreEl.textContent = getHighScore();
            for (const s of snake) spawnParticles(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, '#4ade80', 3);
            vibrate([40, 20, 40]);
            setTimeout(() => showOverlay('dead'), 600);
        }

        function draw() {
            // BG
            ctx.fillStyle = '#08101e';
            ctx.fillRect(0, 0, W, H);

            // Grid
            ctx.strokeStyle = 'rgba(74,222,128,0.03)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x <= W; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
            for (let y = 0; y <= H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

            // Trails
            for (const t of trails) {
                ctx.globalAlpha = t.a * 0.3;
                ctx.fillStyle = '#4ade80';
                ctx.beginPath();
                ctx.arc(t.x * CELL + CELL / 2, t.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Food
            const pulse = 1 + Math.sin(foodPulse) * 0.18;
            const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
            // Glow
            const grd = ctx.createRadialGradient(fx, fy, 0, fx, fy, CELL * 1.8);
            grd.addColorStop(0, 'rgba(248,113,113,0.20)');
            grd.addColorStop(1, 'rgba(248,113,113,0)');
            ctx.fillStyle = grd;
            ctx.fillRect(fx - CELL * 1.8, fy - CELL * 1.8, CELL * 3.6, CELL * 3.6);
            ctx.shadowColor = '#f87171'; ctx.shadowBlur = 16;
            ctx.fillStyle = '#f87171';
            ctx.beginPath(); ctx.arc(fx, fy, (CELL / 2 - 2) * pulse, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.40)';
            ctx.beginPath(); ctx.arc(fx - 2.5, fy - 3, 2.5, 0, Math.PI * 2); ctx.fill();

            // Bonus power-up
            if (bonus) {
                const bx = bonus.x * CELL + CELL / 2, by = bonus.y * CELL + CELL / 2;
                const bp = 1 + Math.sin(performance.now() * 0.005) * 0.15;
                ctx.save(); ctx.translate(bx, by); ctx.scale(bp, bp);
                ctx.shadowColor = bonus.color; ctx.shadowBlur = 18;
                ctx.fillStyle = bonus.color;
                ctx.beginPath(); ctx.arc(0, 0, CELL / 2 - 1, 0, Math.PI * 2); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.font = `${CELL * 0.55}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(bonus.emoji, 0, 1);
                // Fading indicator
                const pct = bonus.life / 8000;
                ctx.strokeStyle = `rgba(255,255,255,${0.3 * pct})`;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.arc(0, 0, CELL / 2 + 3, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }

            // Snake
            for (let i = snake.length - 1; i >= 0; i--) {
                const s = snake[i], t = i / snake.length;
                if (i === 0) {
                    // Head glow
                    ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 18;
                    ctx.fillStyle = '#4ade80';
                    ctx.beginPath(); ctx.arc(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2); ctx.fill();
                    ctx.shadowBlur = 0;
                    // Eyes
                    const ex = dir.x * 4, ey = dir.y * 4;
                    ctx.fillStyle = '#fff';
                    ctx.beginPath();
                    ctx.arc(s.x * CELL + CELL / 2 + ex - 3, s.y * CELL + CELL / 2 + ey - 2, 2.5, 0, Math.PI * 2);
                    ctx.arc(s.x * CELL + CELL / 2 + ex + 3, s.y * CELL + CELL / 2 + ey - 2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#08101e';
                    ctx.beginPath();
                    ctx.arc(s.x * CELL + CELL / 2 + ex - 3 + dir.x, s.y * CELL + CELL / 2 + ey - 2 + dir.y, 1.3, 0, Math.PI * 2);
                    ctx.arc(s.x * CELL + CELL / 2 + ex + 3 + dir.x, s.y * CELL + CELL / 2 + ey - 2 + dir.y, 1.3, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Gradient body
                    const hue = magnetActive ? 185 : (speedBoost ? 0 : 145);
                    const sat = magnetActive ? 70 : (speedBoost ? 65 : 65);
                    const lig = 48 - t * 16;
                    ctx.fillStyle = `hsl(${hue},${sat}%,${lig}%)`;
                    const r = (CELL / 2 - 1) * (1 - t * 0.25);
                    ctx.beginPath(); ctx.arc(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, r, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Particles
            for (const p of particles) {
                ctx.globalAlpha = p.life * 0.9;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Eat flash
            if (eatFlash > 0) {
                ctx.fillStyle = `rgba(74,222,128,${eatFlash * 0.06})`;
                ctx.fillRect(0, 0, W, H);
            }

            // HUD
            if (state === 'playing') {
                ctx.fillStyle = 'rgba(255,255,255,0.22)';
                ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'left';
                ctx.fillText(`Length: ${snake.length}`, 8, 18);
                if (magnetActive) { ctx.fillStyle = '#38d9c0'; ctx.fillText('🧲 MAGNET', 8, 34); }
                if (speedBoost) { ctx.fillStyle = '#f87171'; ctx.fillText('🔥 SPEED', 8, magnetActive ? 50 : 34); }
            }
        }

        let animId;
        function loop(now) {
            const dt = Math.min(now - lastTime, 50); lastTime = now;
            update(dt); draw();
            animId = requestAnimationFrame(loop);
        }

        reset(); lastTime = performance.now(); loop(lastTime);

        window.currentGameCleanup = function () {
            cancelAnimationFrame(animId);
            document.removeEventListener('keydown', onKey);
            window.initGame = null;
        };
    };
})();
