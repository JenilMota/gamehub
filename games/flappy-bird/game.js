/* =============================================
   Flappy Bird — Parallax Edition v3.0
   Day/Night cycle, parallax BG, feathers
   ============================================= */
(function () {
    'use strict';

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const bodyR = container.getBoundingClientRect();
        const CANVAS_W = isMobile ? Math.floor(bodyR.width) : Math.min(380, Math.floor(bodyR.width - 16));
        const CANVAS_H = isMobile ? Math.floor(window.innerHeight - 170) : Math.min(620, Math.floor(bodyR.height - 16));

        const wrapper = document.createElement('div');
        wrapper.className = 'game-canvas-wrapper';
        wrapper.style.position = 'relative';
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_W; canvas.height = CANVAS_H;
        canvas.style.cssText = `display:block;border-radius:${isMobile ? '0' : '18px'};touch-action:none;`;
        wrapper.appendChild(canvas);
        container.appendChild(wrapper);
        const ctx = canvas.getContext('2d');

        // Physics
        const GRAVITY = 0.0028;
        const FLAP = -0.60;
        const MAX_FALL = 0.58;
        const PIPE_SPEED = 0.17;
        const PIPE_GAP = CANVAS_H > 550 ? 155 : 130;
        const PIPE_W = 54;
        const BIRD_R = 15;
        const GROUND_H = 56;
        const GROUND_Y = CANVAS_H - GROUND_H;

        // State
        let bird, pipes, score, state, particles;
        let lastTime = 0, groundX = 0, flapCD = 0, flashAlpha = 0;
        let shake = { x: 0, y: 0 };
        let clouds = [], stars = [], mountains = [], trees = [];
        let dayPhase = 0; // 0=dawn,0.25=day,0.5=dusk,0.75=night

        function skyColor() {
            // Interpolate sky based on score
            const palettes = [
                { sky1: '#0f1b2d', sky2: '#1a2744', ground: '#2a3a4a' }, // night
                { sky1: '#ff7043', sky2: '#ffb74d', ground: '#8d6e63' }, // dawn
                { sky1: '#70c5f0', sky2: '#c8e8ff', ground: '#d4a373' }, // day
                { sky1: '#ff6f00', sky2: '#ffb300', ground: '#9e7c46' }, // dusk
            ];
            const p = palettes[Math.floor(dayPhase * 4) % 4];
            return p;
        }

        function initBg() {
            clouds = [];
            for (let i = 0; i < 6; i++) clouds.push({ x: Math.random() * CANVAS_W, y: 20 + Math.random() * 90, w: 50 + Math.random() * 50, spd: 0.010 + Math.random() * 0.015 });
            stars = [];
            for (let i = 0; i < 35; i++) stars.push({ x: Math.random() * CANVAS_W, y: Math.random() * (GROUND_Y - 20), r: 0.5 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2 });
            mountains = [];
            for (let i = 0; i < 8; i++) mountains.push({ x: i * (CANVAS_W / 7), h: 40 + Math.random() * 80, w: 80 + Math.random() * 80 });
            trees = [];
            for (let i = 0; i < 12; i++) trees.push({ x: i * (CANVAS_W / 11) + 10, h: 20 + Math.random() * 35 });
        }

        function reset() {
            bird = { x: CANVAS_W * 0.28, y: CANVAS_H * 0.4, vy: 0, rot: 0, targetRot: 0, wingPhase: 0 };
            pipes = []; score = 0; particles = []; flapCD = 0; flashAlpha = 0; shake = { x: 0, y: 0 }; groundX = 0;
            dayPhase = 0.25; // start at day
            scoreEl.textContent = '0'; highScoreEl.textContent = getHighScore();
            state = 'idle';
            initBg();
            showOverlay('ready');
        }

        let overlayEl = null;
        function showOverlay(type) {
            removeOverlay();
            overlayEl = document.createElement('div');
            overlayEl.className = 'game-overlay';
            if (type === 'ready') {
                overlayEl.innerHTML = `
          <h2>🐦 Flappy Bird</h2>
          <p>Tap / Space to fly through pipes</p>
          <button class="btn-primary" id="fb-go">Play</button>`;
            } else {
                const best = getHighScore();
                const isNew = score >= best && score > 0;
                overlayEl.innerHTML = `
          <h2>Game Over</h2>
          <p class="score-big">${score}</p>
          <p style="color:${isNew ? '#ffd93d' : 'rgba(255,255,255,0.5)'};font-weight:700;">${isNew ? '🏆 New High Score!' : 'Best: ' + best}</p>
          <button class="btn-primary" id="fb-go">Try Again</button>`;
            }
            wrapper.appendChild(overlayEl);
            setTimeout(() => { document.getElementById('fb-go')?.addEventListener('click', () => { removeOverlay(); startPlaying(); }); }, 30);
        }
        function removeOverlay() { overlayEl?.remove(); overlayEl = null; }

        function startPlaying() {
            bird = { x: CANVAS_W * 0.28, y: CANVAS_H * 0.4, vy: 0, rot: 0, targetRot: 0, wingPhase: 0 };
            pipes = []; score = 0; particles = []; flapCD = 0; flashAlpha = 0; shake = { x: 0, y: 0 };
            scoreEl.textContent = '0'; state = 'playing'; lastTime = performance.now();
        }

        function flap() {
            if (state === 'idle') { removeOverlay(); startPlaying(); return; }
            if (state !== 'playing' || flapCD > 0) return;
            bird.vy = FLAP; bird.targetRot = -0.48; flapCD = 80;
            // Feather particles
            for (let i = 0; i < 4; i++) particles.push({
                x: bird.x - 6, y: bird.y + 4,
                vx: -0.05 - Math.random() * 0.04, vy: 0.02 + Math.random() * 0.04,
                life: 280, max: 280, r: 2.5 + Math.random() * 2, hue: 45
            });
            vibrate(5);
        }

        function onKey(e) { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); } }
        document.addEventListener('keydown', onKey);
        canvas.addEventListener('mousedown', flap);
        canvas.addEventListener('touchstart', e => { e.preventDefault(); flap(); }, { passive: false });

        function update(dt) {
            flapCD = Math.max(0, flapCD - dt);
            if (state === 'idle') { bird.y = CANVAS_H * 0.4 + Math.sin(performance.now() * 0.003) * 10; bird.wingPhase += dt * 0.006; return; }
            if (state !== 'playing') return;

            // Day cycle: advance based on score
            dayPhase = (score * 0.01) % 1;

            bird.vy = Math.min(bird.vy + GRAVITY * dt, MAX_FALL);
            bird.y += bird.vy * dt; bird.wingPhase += dt * 0.013;
            if (bird.vy < -0.1) { bird.rot += (bird.targetRot - bird.rot) * 0.14; }
            else { bird.targetRot = Math.min(1.35, bird.targetRot + dt * 0.003); bird.rot += (bird.targetRot - bird.rot) * 0.06; }

            groundX = (groundX + PIPE_SPEED * dt) % 28;
            for (const c of clouds) { c.x -= c.spd * dt; if (c.x + c.w < 0) c.x = CANVAS_W + 10; }

            // Spawn pipes
            if (pipes.length === 0 || pipes[pipes.length - 1].x < CANVAS_W - 210) {
                const gapY = 70 + Math.random() * (GROUND_Y - PIPE_GAP - 110);
                pipes.push({ x: CANVAS_W + 18, gapY, scored: false });
            }
            for (let i = pipes.length - 1; i >= 0; i--) {
                pipes[i].x -= PIPE_SPEED * dt;
                if (pipes[i].x + PIPE_W < -10) { pipes.splice(i, 1); continue; }
                if (!pipes[i].scored && pipes[i].x + PIPE_W < bird.x) {
                    pipes[i].scored = true; score++; scoreEl.textContent = score; flashAlpha = 0.55;
                    vibrate(8);
                }
                const p = pipes[i], m = 7;
                if (bird.x + BIRD_R - m > p.x && bird.x - BIRD_R + m < p.x + PIPE_W) {
                    if (bird.y - BIRD_R + m < p.gapY || bird.y + BIRD_R - m > p.gapY + PIPE_GAP) { die(); return; }
                }
            }
            if (bird.y + BIRD_R > GROUND_Y) { die(); return; }
            if (bird.y - BIRD_R < 0) { bird.y = BIRD_R; bird.vy = 0; }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
                if (p.life <= 0) particles.splice(i, 1);
            }
            if (flashAlpha > 0) flashAlpha -= dt * 0.003;
            shake.x *= 0.82; shake.y *= 0.82;
        }

        function die() {
            state = 'dead'; setHighScore(score); highScoreEl.textContent = getHighScore();
            shake = { x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 8 };
            for (let i = 0; i < 12; i++) particles.push({ x: bird.x, y: bird.y, vx: (Math.random() - 0.5) * 0.18, vy: (Math.random() - 0.5) * 0.18, life: 450, max: 450, r: 3 + Math.random() * 4, hue: 45 });
            vibrate([50, 30, 50]);
            setTimeout(() => showOverlay('dead'), 650);
        }

        function draw() {
            const t = skyColor();
            ctx.save(); ctx.translate(shake.x, shake.y);

            // Sky gradient
            const skyG = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
            skyG.addColorStop(0, t.sky1); skyG.addColorStop(1, t.sky2);
            ctx.fillStyle = skyG; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            // Stars (night phase)
            if (dayPhase > 0.65 || dayPhase < 0.15) {
                const starAlpha = dayPhase > 0.65 ? (dayPhase - 0.65) / 0.35 : 1 - (dayPhase / 0.15);
                for (const s of stars) {
                    s.phase += 0.012;
                    const a = starAlpha * (0.25 + Math.sin(s.phase) * 0.15);
                    ctx.fillStyle = `rgba(210,220,255,${a})`;
                    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
                }
            }

            // Mountains (far BG)
            ctx.fillStyle = 'rgba(0,0,0,0.10)';
            for (const m of mountains) {
                ctx.beginPath();
                ctx.moveTo(m.x - m.w / 2, GROUND_Y);
                ctx.lineTo(m.x, GROUND_Y - m.h);
                ctx.lineTo(m.x + m.w / 2, GROUND_Y);
                ctx.fill();
            }

            // Clouds
            const cloudAlpha = dayPhase < 0.5 ? 0.6 : 0.2;
            for (const c of clouds) {
                ctx.fillStyle = `rgba(255,255,255,${cloudAlpha})`;
                ctx.beginPath(); ctx.ellipse(c.x, c.y, c.w / 2, c.w / 6, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(c.x - c.w * 0.2, c.y - 5, c.w * 0.32, c.w / 8, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.ellipse(c.x + c.w * 0.2, c.y - 3, c.w * 0.25, c.w / 9, 0, 0, Math.PI * 2); ctx.fill();
            }

            // Pipes
            for (const p of pipes) {
                // Top pipe gradient
                const pipeG = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
                pipeG.addColorStop(0, '#22c55e'); pipeG.addColorStop(0.5, '#4ade80'); pipeG.addColorStop(1, '#16a34a');
                ctx.fillStyle = pipeG;
                ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
                // Cap
                const capG = ctx.createLinearGradient(p.x - 3, 0, p.x + PIPE_W + 3, 0);
                capG.addColorStop(0, '#16a34a'); capG.addColorStop(0.5, '#22c55e'); capG.addColorStop(1, '#15803d');
                ctx.fillStyle = capG;
                ctx.fillRect(p.x - 4, p.gapY - 22, PIPE_W + 8, 22);
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(p.x + 4, 0, 7, p.gapY - 22);

                // Bottom pipe
                ctx.fillStyle = pipeG;
                ctx.fillRect(p.x, p.gapY + PIPE_GAP, PIPE_W, GROUND_Y - (p.gapY + PIPE_GAP));
                ctx.fillStyle = capG;
                ctx.fillRect(p.x - 4, p.gapY + PIPE_GAP, PIPE_W + 8, 22);
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(p.x + 4, p.gapY + PIPE_GAP + 22, 7, GROUND_Y - (p.gapY + PIPE_GAP + 22));
                // Neon edge glow
                ctx.shadowColor = '#4ade80'; ctx.shadowBlur = 8;
                ctx.strokeStyle = 'rgba(74,222,128,0.4)'; ctx.lineWidth = 1;
                ctx.strokeRect(p.x, 0, PIPE_W, p.gapY);
                ctx.strokeRect(p.x, p.gapY + PIPE_GAP, PIPE_W, GROUND_Y - (p.gapY + PIPE_GAP));
                ctx.shadowBlur = 0;
            }

            // Ground
            const gG = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
            gG.addColorStop(0, t.ground); gG.addColorStop(1, 'rgba(0,0,0,0.3)');
            ctx.fillStyle = gG; ctx.fillRect(0, GROUND_Y, CANVAS_W, GROUND_H);
            ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, GROUND_Y, CANVAS_W, 2);
            // Texture lines
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            for (let x = -groundX; x < CANVAS_W; x += 28) {
                ctx.fillRect(x, GROUND_Y + 12, 10, 2); ctx.fillRect(x + 14, GROUND_Y + 24, 8, 2);
            }

            // Bird
            ctx.save(); ctx.translate(bird.x, bird.y); ctx.rotate(bird.rot);
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.beginPath(); ctx.ellipse(2, 4, BIRD_R - 2, 6, 0, 0, Math.PI * 2); ctx.fill();
            // Body
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = 'rgba(251,191,36,0.4)'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.ellipse(0, 0, BIRD_R, BIRD_R * 0.85, 0, 0, Math.PI * 2); ctx.fill();
            ctx.shadowBlur = 0;
            // Wing
            const wa = Math.sin(bird.wingPhase) * 0.55;
            ctx.fillStyle = '#f59e0b';
            ctx.save(); ctx.rotate(wa);
            ctx.beginPath(); ctx.ellipse(-4, 2, 10, 5.5, -0.15, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            // Eye
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(5, -3, 5.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(6.5, -3, 2.8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(5.5, -4.5, 1.2, 0, Math.PI * 2); ctx.fill();
            // Beak
            ctx.fillStyle = '#f87171';
            ctx.beginPath(); ctx.moveTo(BIRD_R - 1, -1); ctx.lineTo(BIRD_R + 8, 2); ctx.lineTo(BIRD_R - 1, 5); ctx.closePath(); ctx.fill();
            ctx.restore();

            // Particles
            for (const p of particles) {
                const a = p.life / p.max;
                ctx.fillStyle = `hsla(${p.hue},80%,65%,${a})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); ctx.fill();
            }

            // Score flash
            if (flashAlpha > 0) { ctx.fillStyle = `rgba(255,255,255,${flashAlpha * 0.12})`; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H); }

            // Big score (in-game)
            if (state === 'playing') {
                ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.textAlign = 'center';
                ctx.font = '800 52px Inter,sans-serif'; ctx.fillText(score, CANVAS_W / 2, 65);
            }
            ctx.restore();
        }

        let animId;
        function loop(now) {
            const dt = Math.min(now - lastTime, 33); lastTime = now;
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
