/* =============================================
   Pulse Ball — v3.0
   Slingshot physics, gravity, bounce chain scoring
   ============================================= */
(function () {
    'use strict';

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const bodyR = container.getBoundingClientRect();
        const W = isMobile ? Math.floor(bodyR.width) : Math.min(400, Math.floor(bodyR.width - 16));
        const H = isMobile ? Math.floor(window.innerHeight - 170) : Math.min(580, Math.floor(bodyR.height - 16));

        const wrapper = document.createElement('div');
        wrapper.className = 'game-canvas-wrapper';
        wrapper.style.position = 'relative';
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.cssText = `display:block;border-radius:${isMobile ? '0' : '18px'};touch-action:none;`;
        wrapper.appendChild(canvas); container.appendChild(wrapper);
        const ctx = canvas.getContext('2d');

        // Launch zone
        const SLING_X = W / 2, SLING_Y = H - 60;
        const BALL_R = 14, GRAVITY = 0.0006, BOUNCE = 0.62;
        const MAX_DRAG = 80;

        let balls = [], targets = [], particles = [], score, state, lastTime;
        let dragging = false, dragX = SLING_X, dragY = SLING_Y;
        let shotsLeft = 5;

        function reset() {
            balls = []; particles = []; score = 0; shotsLeft = 5;
            scoreEl.textContent = '0'; highScoreEl.textContent = getHighScore();
            spawnTargets(); state = 'ready'; showOverlay('ready');
        }

        function spawnTargets() {
            targets = [];
            const rows = Math.ceil((W > 350 ? 3 : 2));
            for (let r = 0; r < rows; r++) {
                const count = 4 + r;
                for (let c = 0; c < count; c++) {
                    targets.push({
                        x: (W / (count + 1)) * (c + 1), y: 80 + r * 65,
                        r: 16 + Math.floor(Math.random() * 10), hp: 1 + r,
                        hue: Math.random() * 360, hit: 0,
                    });
                }
            }
        }

        let overlayEl = null;
        function showOverlay(type) {
            removeOverlay();
            overlayEl = document.createElement('div');
            overlayEl.className = 'game-overlay';
            if (type === 'ready') {
                overlayEl.innerHTML = `<h2>⚡ Pulse Ball</h2><p>Drag & release to slingshot!<br>Chain bounces for bonus points</p><button class="btn-primary" id="pb-go">Play</button>`;
            } else if (type === 'win') {
                overlayEl.innerHTML = `<h2>🎉 Cleared!</h2><p class="score-big" style="color:#5b7fff;">${score}</p><button class="btn-primary" id="pb-go">Next</button>`;
            } else {
                const best = getHighScore(), isNew = score >= best && score > 0;
                overlayEl.innerHTML = `<h2>Out!</h2><p class="score-big" style="color:#5b7fff;">${score}</p><p style="color:${isNew ? '#ffd93d' : 'rgba(255,255,255,0.5)'};font-weight:700;">${isNew ? '🏆 New High Score!' : 'Best: ' + best}</p><button class="btn-primary" id="pb-go">Try Again</button>`;
            }
            wrapper.appendChild(overlayEl);
            setTimeout(() => {
                document.getElementById('pb-go')?.addEventListener('click', () => {
                    removeOverlay();
                    if (type === 'win') { score += shotsLeft * 50; setHighScore(score); scoreEl.textContent = score; spawnTargets(); state = 'playing'; }
                    else { score = 0; shotsLeft = 5; balls = []; particles = []; spawnTargets(); state = 'playing'; scoreEl.textContent = '0'; }
                    lastTime = performance.now();
                });
            }, 30);
        }
        function removeOverlay() { overlayEl?.remove(); overlayEl = null; }

        // Input
        function getCanvasPos(e) {
            const r = canvas.getBoundingClientRect();
            const src = e.touches ? e.touches[0] : e;
            return { x: (src.clientX - r.left) * (W / r.width), y: (src.clientY - r.top) * (H / r.height) };
        }

        canvas.addEventListener('mousedown', e => { if (state === 'playing') { dragging = true; const p = getCanvasPos(e); dragX = p.x; dragY = p.y; } });
        canvas.addEventListener('mousemove', e => { if (dragging) { const p = getCanvasPos(e); dragX = p.x; dragY = p.y; } });
        canvas.addEventListener('mouseup', () => { if (dragging) { release(); dragging = false; } });
        canvas.addEventListener('touchstart', e => { e.preventDefault(); if (state === 'ready') { removeOverlay(); state = 'playing'; lastTime = performance.now(); return; } dragging = true; const p = getCanvasPos(e); dragX = p.x; dragY = p.y; }, { passive: false });
        canvas.addEventListener('touchmove', e => { e.preventDefault(); if (dragging) { const p = getCanvasPos(e); dragX = p.x; dragY = p.y; } }, { passive: false });
        canvas.addEventListener('touchend', e => { e.preventDefault(); if (dragging) { release(); dragging = false; } }, { passive: false });
        canvas.addEventListener('click', () => { if (state === 'ready') { removeOverlay(); state = 'playing'; lastTime = performance.now(); } });

        function release() {
            if (shotsLeft <= 0) return;
            let dx = SLING_X - dragX, dy = SLING_Y - dragY;
            const dist = Math.hypot(dx, dy);
            if (dist < 10) return;
            const clamp = Math.min(dist, MAX_DRAG);
            const nx = dx / dist, ny = dy / dist;
            const spd = clamp * 0.009;
            balls.push({ x: SLING_X, y: SLING_Y, vx: nx * spd, vy: ny * spd, bounces: 0 });
            shotsLeft--; vibrate(10);
        }

        function spawnParticles(x, y, hue, n = 6) {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;
                particles.push({ x, y, vx: Math.cos(a) * (0.05 + Math.random() * 0.1), vy: Math.sin(a) * (0.05 + Math.random() * 0.1), life: 400, max: 400, r: 3 + Math.random() * 4, hue });
            }
        }

        function update(dt) {
            if (state !== 'playing') return;

            // Balls
            for (let i = balls.length - 1; i >= 0; i--) {
                const b = balls[i];
                b.vy += GRAVITY * dt;
                b.x += b.vx * dt;
                b.y += b.vy * dt;

                // Wall bounces
                if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx = Math.abs(b.vx) * BOUNCE; b.bounces++; vibrate(4); }
                if (b.x + BALL_R > W) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx) * BOUNCE; b.bounces++; vibrate(4); }
                if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy) * BOUNCE; b.bounces++; }
                if (b.y + BALL_R > H) { balls.splice(i, 1); break; }

                // Target collisions
                for (let j = targets.length - 1; j >= 0; j--) {
                    const t = targets[j]; const d = Math.hypot(b.x - t.x, b.y - t.y);
                    if (d < BALL_R + t.r) {
                        // Reflect
                        const nx = (b.x - t.x) / d, ny = (b.y - t.y) / d;
                        const dot = b.vx * nx + b.vy * ny;
                        b.vx = (b.vx - 2 * dot * nx) * BOUNCE;
                        b.vy = (b.vy - 2 * dot * ny) * BOUNCE;
                        b.x = t.x + (BALL_R + t.r + 1) * nx; b.y = t.y + (BALL_R + t.r + 1) * ny;
                        b.bounces++; t.hp--; t.hit = 1;
                        const pts = (b.bounces + 1) * 10;
                        score += pts; scoreEl.textContent = score;
                        spawnParticles(t.x, t.y, t.hue);
                        vibrate(10);
                        if (t.hp <= 0) targets.splice(j, 1);
                    }
                }
            }

            // Targets hit flash
            for (const t of targets) { if (t.hit > 0) t.hit -= 0.08; }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
                if (p.life <= 0) particles.splice(i, 1);
            }

            // All cleared
            if (targets.length === 0) { state = 'won'; setHighScore(score); highScoreEl.textContent = getHighScore(); setTimeout(() => showOverlay('win'), 350); return; }
            // No shots + balls gone
            if (shotsLeft === 0 && balls.length === 0) { state = 'dead'; setHighScore(score); highScoreEl.textContent = getHighScore(); setTimeout(() => showOverlay('dead'), 350); }
        }

        function draw() {
            ctx.fillStyle = '#07111f'; ctx.fillRect(0, 0, W, H);

            // Targets
            for (const t of targets) {
                const grd = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, t.r);
                const lig = 36 + t.hit * 20;
                grd.addColorStop(0, `hsl(${t.hue},70%,${lig + 14}%)`);
                grd.addColorStop(1, `hsl(${t.hue},60%,${lig}%)`);
                ctx.fillStyle = grd;
                ctx.shadowColor = `hsl(${t.hue},80%,55%)`; ctx.shadowBlur = t.hit > 0 ? 18 : 8;
                ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                if (t.hp > 1) {
                    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '600 10px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(t.hp, t.x, t.y);
                }
            }

            // Slingshot visual
            ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(SLING_X, SLING_Y, 8, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath(); ctx.arc(SLING_X, SLING_Y, 4, 0, Math.PI * 2); ctx.fill();

            // Drag preview
            if (dragging && state === 'playing') {
                let dx = SLING_X - dragX, dy = SLING_Y - dragY;
                const dist = Math.hypot(dx, dy);
                const clamp = Math.min(dist, MAX_DRAG); const factor = clamp / Math.max(dist, 1);
                const px = dragX + (dx * (1 - factor)), py = dragY + (dy * (1 - factor));
                // Rubber band lines
                ctx.strokeStyle = 'rgba(91,127,255,0.4)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(SLING_X, SLING_Y); ctx.lineTo(px, py); ctx.stroke();
                // Preview arc (dotted)
                const spd = clamp * 0.009; const nvx = (dx / Math.max(dist, 1)) * spd; const nvy = (dy / Math.max(dist, 1)) * spd;
                ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(91,127,255,0.25)'; ctx.lineWidth = 1.5;
                ctx.beginPath(); let bx = SLING_X, by = SLING_Y, vx = nvx, vy = nvy;
                ctx.moveTo(bx, by);
                for (let i = 0; i < 30; i++) { vy += GRAVITY * 8; bx += vx * 8; by += vy * 8; ctx.lineTo(bx, by); if (bx < 0 || bx > W || by > H) break; }
                ctx.stroke(); ctx.setLineDash([]);
            }

            // Balls
            for (const b of balls) {
                const bg2 = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, BALL_R);
                bg2.addColorStop(0, '#fff'); bg2.addColorStop(1, '#5b7fff');
                ctx.fillStyle = bg2; ctx.shadowColor = '#5b7fff'; ctx.shadowBlur = 16;
                ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            }

            // Particles
            for (const p of particles) {
                const a = p.life / p.max;
                ctx.fillStyle = `hsla(${p.hue},80%,60%,${a})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); ctx.fill();
            }

            // HUD
            ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = '600 12px Inter'; ctx.textAlign = 'left';
            ctx.fillText(`Shots: ${'●'.repeat(shotsLeft)}${'○'.repeat(Math.max(0, 5 - shotsLeft))}`, 10, H - 16);
        }

        let animId;
        function loop(now) {
            const dt = Math.min(now - lastTime, 33); lastTime = now;
            update(dt); draw(); animId = requestAnimationFrame(loop);
        }

        reset(); lastTime = performance.now(); loop(lastTime);

        window.currentGameCleanup = function () {
            cancelAnimationFrame(animId); window.initGame = null;
        };
    };
})();
