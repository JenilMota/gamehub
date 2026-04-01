/* =============================================
   FLAPPY BIRD — Neon City v4.0
   Parallax cyberpunk skyline, trail, feathers,
   combo scoring, smooth feel
   ============================================= */
(function () {
    'use strict';

    const CSS = `
    #fb-wrap{width:100%;height:100%;position:relative;overflow:hidden;background:#060914;}
    #fb-canvas{display:block;}
    #fb-overlay{
      position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;
      background:rgba(6,9,20,0.88);backdrop-filter:blur(18px);z-index:10;
    }
    #fb-overlay h2{
      font-size:2.2rem;font-weight:900;font-family:Inter,sans-serif;letter-spacing:-1px;
      background:linear-gradient(135deg,#f59e0b,#ef4444);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    #fb-overlay p{color:#64748b;font-family:Inter,sans-serif;font-size:0.9rem;text-align:center;line-height:1.6;}
    #fb-overlay .fb-score{font-size:2.8rem;font-weight:900;color:#f59e0b;font-family:Inter,sans-serif;}
    .fb-btn{
      padding:13px 40px;border:none;border-radius:999px;cursor:pointer;
      background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;
      font-family:Inter,sans-serif;font-size:1rem;font-weight:900;letter-spacing:0.5px;
      box-shadow:0 4px 24px rgba(245,158,11,0.45);transition:transform 0.15s;
    }
    .fb-btn:hover{transform:scale(1.07);}
  `;
    const styleEl = document.createElement('style'); styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const R = container.getBoundingClientRect();
        const W = Math.floor(R.width), H = Math.floor(R.height);

        const wrap = document.createElement('div'); wrap.id = 'fb-wrap';
        const canvas = document.createElement('canvas'); canvas.id = 'fb-canvas';
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const overlay = document.createElement('div'); overlay.id = 'fb-overlay';
        wrap.appendChild(canvas); wrap.appendChild(overlay);
        container.appendChild(wrap);

        const PIPE_W = Math.max(52, W * 0.1);
        const GAP = Math.max(140, H * 0.28);
        const GRAVITY = H * 0.0032;
        const JUMP_V = -H * 0.025;
        const PIPE_SPEED = W * 0.003;

        // City layers for parallax
        const CITY_LAYERS = [
            { speed: 0.15, buildings: generateCity(W, H, 0.35, 0.65, 22) },
            { speed: 0.35, buildings: generateCity(W, H, 0.2, 0.5, 15) },
            { speed: 0.65, buildings: generateCity(W, H, 0.1, 0.35, 10) },
        ];

        function generateCity(cw, ch, minH, maxH, count) {
            const blds = [];
            const bw = cw / count * 1.2;
            for (let i = 0; i < count + 4; i++) {
                const h = ch * (minH + Math.random() * (maxH - minH));
                blds.push({ x: i * bw - bw, w: bw * (0.6 + Math.random() * 0.5), h, windows: Math.random() > 0.4 });
            }
            return blds;
        }

        // Stars
        const STARS = Array.from({ length: 80 }, () => ({
            x: Math.random() * W, y: Math.random() * H * 0.7,
            r: Math.random() * 1.5 + 0.3, twinkle: Math.random() * Math.PI * 2
        }));

        let bird, pipes, particles, score, best, cameraX, running, started, raf, lastT = 0;
        let combo = 0;

        function resetBird() {
            bird = { x: W * 0.22, y: H / 2, vy: 0, rot: 0, trail: [], frame: 0 };
        }

        function reset() {
            pipes = []; score = 0; cameraX = 0; combo = 0;
            particles = [];
            resetBird();
            addPipe(W + 50);
            best = getHighScore();
            scoreEl.textContent = '0';
            if (highScoreEl) highScoreEl.textContent = best;
        }

        function addPipe(x) {
            const topH = H * 0.12 + Math.random() * (H * 0.52);
            pipes.push({ x, topH, scored: false, hue: Math.floor(Math.random() * 360) });
        }

        function flap() {
            if (!started) { started = true; running = true; return; }
            if (!running) return;
            bird.vy = JUMP_V;
            // Feather burst
            for (let i = 0; i < 5; i++) {
                const angle = Math.PI * 0.4 + Math.random() * Math.PI * 0.3;
                particles.push({ x: bird.x, y: bird.y, vx: -Math.cos(angle) * 2, vy: -Math.sin(angle) * 2, life: 1, type: 'feather', rot: Math.random() * Math.PI * 2 });
            }
        }

        function die() {
            running = false;
            vibrate?.([60, 30, 100]);
            setHighScore(score);
            // Big explosion
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2, spd = 2 + Math.random() * 4;
                particles.push({ x: bird.x, y: bird.y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, type: 'spark', color: `hsl(${30 + Math.random() * 20},100%,60%)` });
            }
            setTimeout(() => showOverlay('dead'), 800);
        }

        function showOverlay(type) {
            overlay.style.display = 'flex';
            const best2 = getHighScore();
            if (type === 'start') {
                overlay.innerHTML = `
          <h2>🐦 Flappy Bird</h2>
          <p>Tap / Space to flap. Fly through the neon pipes!<br>Chain close calls for score combos.</p>
          <button class="fb-btn" id="fb-go">Fly!</button>
        `;
            } else {
                overlay.innerHTML = `
          <h2>${score >= best2 ? '🏆 New Best!' : 'You Crashed!'}</h2>
          <div class="fb-score">${score}</div>
          <p>Best: ${best2} · Combo: ${combo}x</p>
          <button class="fb-btn" id="fb-go">Try Again</button>
        `;
            }
            document.getElementById('fb-go').addEventListener('click', () => {
                reset(); started = false; overlay.style.display = 'none';
            });
        }

        function update(dt) {
            const pxDt = PIPE_SPEED * dt * 60;
            cameraX += pxDt;

            // City parallax scroll
            for (const layer of CITY_LAYERS) {
                for (const b of layer.buildings) {
                    b.x -= layer.speed * pxDt;
                    if (b.x + b.w < 0) b.x += W + b.w;
                }
            }

            // Stars twinkle
            for (const s of STARS) s.twinkle += dt * 2;

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life -= dt * 1.2;
                if (p.rot !== undefined) p.rot += 0.1;
                if (p.life <= 0) particles.splice(i, 1);
            }

            if (!started || !running) return;

            // Physics
            bird.vy += GRAVITY * dt * 60;
            bird.vy = Math.max(bird.vy, JUMP_V * 1.2); // terminal velocity
            bird.y += bird.vy;
            bird.rot = Math.max(-0.5, Math.min(Math.PI / 2, bird.vy * 0.06));
            bird.frame += dt * 8;

            // Trail
            bird.trail.push({ x: bird.x, y: bird.y, life: 1 });
            if (bird.trail.length > 18) bird.trail.shift();
            bird.trail.forEach(t => t.life -= dt * 3);

            // Ground / ceiling
            if (bird.y > H - 20 || bird.y < 0) { die(); return; }

            // Pipes
            for (let i = pipes.length - 1; i >= 0; i--) {
                const p = pipes[i];
                p.x -= pxDt;

                // Score
                if (!p.scored && p.x + PIPE_W < bird.x) {
                    p.scored = true; score++; combo++;
                    scoreEl.textContent = score; setHighScore(score);
                    if (highScoreEl) highScoreEl.textContent = getHighScore();
                }

                // Collision — use full visual width including 4px cap extension on each side
                const bLeft = bird.x - 12, bRight = bird.x + 12, bTop = bird.y - 12, bBottom = bird.y + 12;
                const pLeft = p.x - 4, pRight = p.x + PIPE_W + 4;
                if (bRight > pLeft && bLeft < pRight) {
                    if (bTop < p.topH || bBottom > p.topH + GAP) { die(); return; }
                }

                if (p.x + PIPE_W < -20) pipes.splice(i, 1);
            }

            if (pipes.length === 0 || pipes[pipes.length - 1].x < W) {
                addPipe((pipes[pipes.length - 1]?.x ?? W) + W * 0.45 + Math.random() * W * 0.2);
            }
        }

        function drawCity(layer) {
            ctx.save();
            for (const b of layer.buildings) {
                const alpha = 0.12 + (1 - layer.speed) * 0.15;
                ctx.fillStyle = `rgba(30,40,80,${alpha})`;
                ctx.fillRect(b.x, H - b.h, b.w - 2, b.h);
                // Windows
                if (b.windows) {
                    const rows = Math.floor(b.h / 18), cols = Math.floor((b.w - 2) / 10);
                    for (let r = 0; r < rows; r++) {
                        for (let c = 0; c < cols; c++) {
                            if (Math.sin(b.x * 0.3 + r * 7 + c * 11) > 0.2) {
                                ctx.fillStyle = `rgba(255,200,80,${alpha * 2})`;
                                ctx.fillRect(b.x + 4 + c * 10, H - b.h + 6 + r * 18, 5, 8);
                            }
                        }
                    }
                }
            }
            ctx.restore();
        }

        function draw() {
            // Sky gradient
            const sky = ctx.createLinearGradient(0, 0, 0, H);
            sky.addColorStop(0, '#060914'); sky.addColorStop(0.6, '#0a0f28'); sky.addColorStop(1, '#0e1535');
            ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

            // Stars
            for (const s of STARS) {
                const alpha = 0.4 + Math.sin(s.twinkle) * 0.4;
                ctx.fillStyle = `rgba(255,255,255,${alpha})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            }

            // City layers (back to front)
            for (const layer of CITY_LAYERS) drawCity(layer);

            // Ground
            const gGrad = ctx.createLinearGradient(0, H - 20, 0, H);
            gGrad.addColorStop(0, '#0f1a35'); gGrad.addColorStop(1, '#060914');
            ctx.fillStyle = gGrad; ctx.fillRect(0, H - 20, W, 20);
            ctx.save(); ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 10;
            ctx.fillStyle = '#38bdf8'; ctx.fillRect(0, H - 20, W, 2);
            ctx.restore();

            // Pipes
            for (const p of pipes) {
                const px = p.x;
                const pipeGrad = ctx.createLinearGradient(px, 0, px + PIPE_W, 0);
                pipeGrad.addColorStop(0, `hsl(${p.hue},80%,22%)`);
                pipeGrad.addColorStop(0.4, `hsl(${p.hue},80%,35%)`);
                pipeGrad.addColorStop(1, `hsl(${p.hue},80%,18%)`);

                ctx.save(); ctx.shadowColor = `hsl(${p.hue},90%,60%)`; ctx.shadowBlur = 14;
                ctx.fillStyle = pipeGrad;
                // Top pipe
                ctx.beginPath(); ctx.roundRect(px, 0, PIPE_W, p.topH, [0, 0, 8, 8]); ctx.fill();
                // Cap
                ctx.beginPath(); ctx.roundRect(px - 4, p.topH - 16, PIPE_W + 8, 16, 4); ctx.fill();
                // Bottom pipe
                const botY = p.topH + GAP;
                ctx.beginPath(); ctx.roundRect(px, botY, PIPE_W, H - botY, [8, 8, 0, 0]); ctx.fill();
                ctx.beginPath(); ctx.roundRect(px - 4, botY, PIPE_W + 8, 16, 4); ctx.fill();
                // Highlight strip
                ctx.fillStyle = `rgba(255,255,255,0.08)`;
                ctx.fillRect(px + 4, 0, 6, p.topH - 16);
                ctx.fillRect(px + 4, botY + 16, 6, H - botY);
                ctx.restore();
            }

            // Particles
            for (const p of particles) {
                ctx.save(); ctx.globalAlpha = p.life;
                if (p.type === 'feather') {
                    ctx.translate(p.x, p.y); ctx.rotate(p.rot ?? 0);
                    ctx.fillStyle = '#fde68a'; ctx.shadowColor = '#fde68a'; ctx.shadowBlur = 6;
                    ctx.fillRect(-2, -5, 4, 10);
                } else {
                    ctx.fillStyle = p.color ?? '#f59e0b'; ctx.shadowColor = p.color ?? '#f59e0b'; ctx.shadowBlur = 8;
                    ctx.beginPath(); ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2); ctx.fill();
                }
                ctx.restore();
            }

            // Bird trail
            for (let i = 0; i < bird.trail.length; i++) {
                const t = bird.trail[i];
                if (t.life <= 0) continue;
                const alpha = t.life * 0.35 * (i / bird.trail.length);
                ctx.save(); ctx.globalAlpha = alpha;
                ctx.fillStyle = '#f59e0b'; ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(t.x, t.y, 8 * (i / bird.trail.length), 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            // Bird
            if (!running && !started || running) {
                ctx.save();
                ctx.translate(bird.x, bird.y); ctx.rotate(bird.rot);
                ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 18;

                // Body
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath(); ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2); ctx.fill();

                // Wing (animated)
                const wing = Math.sin(bird.frame) * 0.4;
                ctx.fillStyle = '#f59e0b';
                ctx.beginPath(); ctx.ellipse(-3, wing * 8, 10, 5, wing, 0, Math.PI * 2); ctx.fill();

                // Eye
                ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.arc(7, -3, 5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#1e293b';
                ctx.beginPath(); ctx.arc(8, -3, 2.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.beginPath(); ctx.arc(8.5, -4, 1, 0, Math.PI * 2); ctx.fill();

                // Beak
                ctx.fillStyle = '#fb923c';
                ctx.beginPath(); ctx.moveTo(14, -1); ctx.lineTo(22, 3); ctx.lineTo(14, 5); ctx.closePath(); ctx.fill();

                ctx.restore();
            }

            // Score overlay
            if (running || started) {
                ctx.save();
                ctx.font = `bold ${Math.min(36, W * 0.06)}px Inter,sans-serif`;
                ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
                ctx.fillText(score, W / 2, 50);
                ctx.restore();
            }
        }

        function loop(ts) {
            raf = requestAnimationFrame(loop);
            const dt = Math.min((ts - lastT) / 1000, 0.08); lastT = ts;
            update(dt); draw();
        }

        // Controls
        const onKey = e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); } };
        document.addEventListener('keydown', onKey);
        canvas.addEventListener('mousedown', e => { e.preventDefault(); flap(); });
        canvas.addEventListener('touchstart', e => { e.preventDefault(); flap(); }, { passive: false });
        document.getElementById('mc-action')?.addEventListener('touchstart', e => { e.preventDefault(); flap(); }, { passive: false });

        reset(); showOverlay('start');
        raf = requestAnimationFrame(loop);

        window.currentGameCleanup = () => {
            cancelAnimationFrame(raf); raf = null;
            document.removeEventListener('keydown', onKey);
            styleEl.remove();
        };
    };
})();
