/* =============================================
   Dino Run — v3.0
   Speed scaling, dust particles, new obstacles
   ============================================= */
(function () {
    'use strict';

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const bodyR = container.getBoundingClientRect();
        const W = isMobile ? Math.floor(bodyR.width) : Math.min(500, Math.floor(bodyR.width - 16));
        const H = isMobile ? 240 : 220;

        const wrapper = document.createElement('div');
        wrapper.className = 'game-canvas-wrapper';
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.cssText = `display:block;border-radius:${isMobile ? '0' : '18px'};touch-action:none;`;
        wrapper.appendChild(canvas); container.appendChild(wrapper);
        const ctx = canvas.getContext('2d');

        // Constants
        const GROUND_Y = H - 44;
        const DINO_W = 32, DINO_H = 42, DINO_X = 72;
        const JUMP_V = -0.72, GRAVITY = 0.0035, DUCK_H = 24;

        let dino, obstacles, clouds, particles, score, state, lastTime, speed;
        let groundX = 0, spawnTimer = 0, frameTimer = 0, animFrame = 0;
        let doubleJump = false;
        let bgStars = [];

        function resetStars() {
            bgStars = [];
            for (let i = 0; i < 15; i++) bgStars.push({ x: Math.random() * W, y: 10 + Math.random() * (GROUND_Y - 40), r: 0.8 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2 });
        }

        function reset() {
            dino = { x: DINO_X, y: GROUND_Y - DINO_H, vy: 0, onGround: true, ducking: false, jumpCount: 0 };
            obstacles = []; clouds = []; particles = [];
            score = 0; speed = 0.18; spawnTimer = 0; groundX = 0;
            for (let i = 0; i < 3; i++) clouds.push({ x: 60 + i * (W / 3), y: 15 + Math.random() * 40, w: 40 + Math.random() * 30 });
            scoreEl.textContent = '0'; highScoreEl.textContent = getHighScore();
            state = 'ready'; showOverlay('ready');
        }

        let overlayEl = null;
        function showOverlay(type) {
            removeOverlay();
            overlayEl = document.createElement('div');
            overlayEl.className = 'game-overlay';
            if (type === 'ready') {
                overlayEl.innerHTML = `<h2>🦖 Dino Run</h2><p>Jump/Duck to dodge cacti & birds<br>Double jump: press Jump twice!</p><button class="btn-primary" id="dr-go">Run!</button>`;
            } else {
                const best = getHighScore(), isNew = score >= best && score > 0;
                overlayEl.innerHTML = `
          <h2>💥 Game Over</h2>
          <p class="score-big">${score}</p>
          <p style="color:${isNew ? '#ffd93d' : 'rgba(255,255,255,0.5)'};font-weight:700;">${isNew ? '🏆 New High Score!' : 'Best: ' + best}</p>
          <button class="btn-primary" id="dr-go">Try Again</button>`;
            }
            wrapper.appendChild(overlayEl);
            setTimeout(() => document.getElementById('dr-go')?.addEventListener('click', startPlaying), 30);
        }
        function removeOverlay() { overlayEl?.remove(); overlayEl = null; }

        function startPlaying() {
            removeOverlay();
            dino = { x: DINO_X, y: GROUND_Y - DINO_H, vy: 0, onGround: true, ducking: false, jumpCount: 0 };
            obstacles = []; particles = []; score = 0; speed = 0.18; spawnTimer = 0;
            scoreEl.textContent = '0'; state = 'playing'; lastTime = performance.now();
        }

        function jump() {
            if (state === 'ready') { startPlaying(); return; }
            if (state !== 'playing') return;
            if (dino.jumpCount < 2) { dino.vy = JUMP_V; dino.onGround = false; dino.jumpCount++; vibrate(8); dustPuff(); }
        }
        function duck(on) { if (state === 'playing') dino.ducking = on; }

        function onKey(e) {
            if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) e.preventDefault();
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') jump();
            if (e.code === 'ArrowDown' || e.code === 'KeyS') duck(e.type === 'keydown');
        }
        document.addEventListener('keydown', onKey);
        document.addEventListener('keyup', onKey);
        canvas.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });
        canvas.addEventListener('click', jump);

        function dustPuff() {
            for (let i = 0; i < 5; i++) {
                particles.push({ x: dino.x - 5, y: GROUND_Y, vx: -0.03 - Math.random() * 0.04, vy: -0.01 - Math.random() * 0.03, life: 350, r: 3 + Math.random() * 3 });
            }
        }

        function spawnObstacle() {
            const roll = Math.random();
            if (roll < 0.55) {
                // Cactus group
                const n = 1 + (score > 300 ? Math.floor(Math.random() * 3) : 0);
                const h = 30 + Math.random() * 18;
                obstacles.push({ type: 'cactus', x: W + 20, y: GROUND_Y - h, w: 18 + n * 6, h, n });
            } else if (score > 100) {
                // Flying pterodactyl
                const yOff = Math.random() < 0.5 ? 30 : 0;
                obstacles.push({ type: 'ptero', x: W + 20, y: GROUND_Y - DINO_H - yOff - 10, w: 40, h: 24, phase: 0 });
            } else {
                const h = 30 + Math.random() * 18;
                obstacles.push({ type: 'cactus', x: W + 20, y: GROUND_Y - h, w: 20, h, n: 1 });
            }
        }

        function update(dt) {
            // Ground + clouds
            groundX += speed * dt;
            if (groundX > 28) groundX = 0;
            for (const c of clouds) { c.x -= 0.025 * dt; if (c.x + c.w < 0) c.x = W + 20; }

            if (state !== 'playing') return;
            score += dt * 0.012; scoreEl.textContent = Math.floor(score);
            speed = Math.min(0.55, 0.18 + score * 0.0002);

            // Dino gravity
            if (!dino.onGround) { dino.vy += GRAVITY * dt; dino.y += dino.vy * dt; }
            if (dino.y >= GROUND_Y - (dino.ducking ? DUCK_H : DINO_H)) {
                dino.y = GROUND_Y - (dino.ducking ? DUCK_H : DINO_H);
                if (!dino.onGround) dustPuff();
                dino.onGround = true; dino.vy = 0; dino.jumpCount = 0;
            }

            // Spawn
            spawnTimer += dt;
            const gap = Math.max(900, 2000 - score * 2.5);
            if (spawnTimer > gap) { spawnTimer = 0; spawnObstacle(); }

            // Move obstacles
            for (let i = obstacles.length - 1; i >= 0; i--) {
                const o = obstacles[i];
                o.x -= speed * dt;
                if (o.type === 'ptero') o.phase += 0.01 * dt;
                if (o.x + o.w < -10) { obstacles.splice(i, 1); continue; }

                // Hit box (generous)
                const dx = DINO_X, dy = dino.y, dw = DINO_W - 8, dh = dino.ducking ? DUCK_H : DINO_H - 4;
                if (dx + dw > o.x + 4 && dx + 4 < o.x + o.w - 4 && dy + dh > o.y + 4 && dy + 4 < o.y + o.h - 4) {
                    die(); return;
                }
            }

            // Anim frame
            frameTimer += dt;
            if (frameTimer > 160) { frameTimer = 0; animFrame = 1 - animFrame; }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].x += particles[i].vx * dt;
                particles[i].y += particles[i].vy * dt;
                particles[i].vy += 0.00005 * dt;
                particles[i].life -= dt;
                if (particles[i].life <= 0) particles.splice(i, 1);
            }

            // Stars twinkle
            for (const s of bgStars) s.phase += 0.01;
        }

        function die() {
            state = 'dead'; setHighScore(Math.floor(score));
            highScoreEl.textContent = getHighScore();
            vibrate([50, 30, 80]);
            setTimeout(() => showOverlay('dead'), 500);
        }

        function draw() {
            // Sky
            const nightVal = Math.min(1, score / 800);
            const r = Math.round(18 - nightVal * 10), g = Math.round(22 - nightVal * 16), b = Math.round(38 + nightVal * 14);
            ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(0, 0, W, H);

            // Stars
            if (score > 300) {
                const sa = Math.min(1, (score - 300) / 300);
                for (const s of bgStars) {
                    ctx.fillStyle = `rgba(200,210,255,${sa * (0.2 + Math.sin(s.phase) * 0.1)})`;
                    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Clouds
            for (const c of clouds) {
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w / 2, c.w / 7, 0, 0, Math.PI * 2); ctx.fill();
            }

            // Ground
            ctx.fillStyle = '#294a3a'; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
            ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, GROUND_Y, W, 2);
            // Ground dashes
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            for (let x = -groundX; x < W; x += 28) ctx.fillRect(x, GROUND_Y + 12, 16, 2);

            // Obstacles
            for (const o of obstacles) {
                if (o.type === 'cactus') {
                    ctx.fillStyle = '#22c55e'; ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 8;
                    ctx.fillRect(o.x + o.w / 2 - 6, o.y, 12, o.h);
                    for (let i = 0; i < (o.n || 1); i++) {
                        ctx.fillRect(o.x + i * 12, o.y + 8, 10, o.h - 8);
                    }
                    ctx.shadowBlur = 0;
                } else {
                    // Pterodactyl
                    ctx.strokeStyle = '#38d9c0'; ctx.lineWidth = 2.5; ctx.shadowColor = '#38d9c0'; ctx.shadowBlur = 10;
                    const wingY = Math.sin(o.phase) * 5;
                    ctx.beginPath();
                    ctx.moveTo(o.x, o.y + 12 + wingY);
                    ctx.lineTo(o.x + 20, o.y + 8);
                    ctx.lineTo(o.x + 40, o.y + 12 + wingY);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(o.x + 20, o.y + 8);
                    ctx.lineTo(o.x + 20, o.y + 22);
                    ctx.stroke();
                    ctx.shadowBlur = 0;
                }
            }

            // Dust particles
            for (const p of particles) {
                const a = p.life / 350;
                ctx.fillStyle = `rgba(180,200,180,${a * 0.5})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); ctx.fill();
            }

            // Dino
            ctx.save(); ctx.translate(dino.x, dino.y);
            const dh = dino.ducking ? DUCK_H : DINO_H;
            const dw = dino.ducking ? DINO_W + 12 : DINO_W;
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(dw / 2, dh + 3, dw / 2 - 2, 5, 0, 0, Math.PI * 2); ctx.fill();
            // Body
            ctx.fillStyle = '#4ade80'; ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 12;
            ctx.fillRect(0, 0, dw, dh);
            ctx.shadowBlur = 0;
            if (!dino.ducking) {
                // Eyes
                ctx.fillStyle = '#fff'; ctx.fillRect(dw - 8, 4, 8, 8);
                ctx.fillStyle = '#111'; ctx.fillRect(dw - 6, 6, 5, 5);
                // Legs
                ctx.fillStyle = '#22c55e';
                ctx.fillRect(4, dh - 2, 7, animFrame === 0 ? 8 : 4);
                ctx.fillRect(14, dh - 2, 7, animFrame === 0 ? 4 : 8);
            }
            ctx.restore();

            // Score
            if (state === 'playing') {
                ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = '700 13px Inter'; ctx.textAlign = 'right';
                ctx.fillText(Math.floor(score), W - 12, 22);
            }
        }

        let animId;
        function loop(now) {
            const dt = Math.min(now - lastTime, 33); lastTime = now;
            update(dt); draw(); animId = requestAnimationFrame(loop);
        }

        resetStars(); reset(); lastTime = performance.now(); loop(lastTime);

        window.currentGameCleanup = function () {
            cancelAnimationFrame(animId);
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('keyup', onKey);
            window.initGame = null;
        };
    };
})();
