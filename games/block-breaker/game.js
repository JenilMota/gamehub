/* =============================================
   BLOCK BREAKER — Neon Laser v4.0
   Neon ball trail, power-ups (multi-ball, laser,
   magnet, wide paddle), 10 levels, particles
   ============================================= */
(function () {
    'use strict';

    const CSS = `
    #bb-wrap{width:100%;height:100%;position:relative;background:#060914;display:flex;align-items:center;justify-content:center;}
    #bb-canvas{display:block;border-radius:12px;}
    #bb-overlay{
      position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;
      background:rgba(6,9,20,0.92);backdrop-filter:blur(20px);z-index:10;border-radius:12px;
    }
    #bb-overlay h2{
      font-size:2.2rem;font-weight:900;font-family:Inter,sans-serif;letter-spacing:-1px;
      background:linear-gradient(135deg,#818cf8,#c084fc);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    #bb-overlay p{color:#64748b;font-family:Inter,sans-serif;font-size:0.9rem;text-align:center;line-height:1.6;}
    #bb-overlay .bb-score{font-size:2.6rem;font-weight:900;color:#818cf8;font-family:Inter,sans-serif;}
    .bb-btn{
      padding:13px 40px;border:none;border-radius:999px;cursor:pointer;
      background:linear-gradient(135deg,#818cf8,#c084fc);color:#fff;
      font-family:Inter,sans-serif;font-size:1rem;font-weight:900;
      box-shadow:0 4px 24px rgba(129,140,248,0.45);transition:transform 0.15s;
    }
    .bb-btn:hover{transform:scale(1.07);}
    #bb-level-badge{
      position:absolute;top:12px;left:12px;
      font-family:Inter,sans-serif;font-size:0.8rem;font-weight:700;
      color:rgba(255,255,255,0.4);pointer-events:none;
    }
    #bb-lives{
      position:absolute;top:12px;right:12px;
      font-family:Inter,sans-serif;font-size:0.9rem;color:rgba(255,255,255,0.5);pointer-events:none;
    }
  `;
    const styleEl = document.createElement('style'); styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const R = container.getBoundingClientRect();
        const W = Math.min(R.width, 560), H = R.height;

        const wrap = document.createElement('div'); wrap.id = 'bb-wrap';
        const canvas = document.createElement('canvas'); canvas.id = 'bb-canvas';
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const overlay = document.createElement('div'); overlay.id = 'bb-overlay';
        const lvlBadge = document.createElement('div'); lvlBadge.id = 'bb-level-badge';
        const livesEl = document.createElement('div'); livesEl.id = 'bb-lives';
        wrap.appendChild(canvas); wrap.appendChild(overlay); wrap.appendChild(lvlBadge); wrap.appendChild(livesEl);
        container.appendChild(wrap);

        const PAD_H = Math.max(10, H * 0.016);
        const PAD_W_BASE = W * 0.18;
        const BALL_R = Math.max(7, W * 0.016);
        const BRICK_ROWS = 6, BRICK_COLS = 9;
        const BRICK_W = W / BRICK_COLS, BRICK_H = Math.max(22, H * 0.038);
        const TOP_PAD = H * 0.12;

        let score, lives, level, balls, paddle, bricks, particles, powerUps, laserBeams;
        let running, raf, lastT = 0;
        let padPower = null, padWidthMult = 1, laserCooldown = 0, magnetActive = false;

        function makeBricks(lvl) {
            const bks = [];
            const PATTERNS = [
                // Level 1: plain rows
                r => r < 4 ? 1 : 0,
                // Level 2: checkerboard
                (r, c) => (r + c) % 2 === 0 ? 2 : 1,
                // Level 3: diamond
                (r, c) => Math.abs(r - 2.5) + Math.abs(c - 4) < 4 ? 2 : 1,
                // Level 4: all heavy
                () => 2,
                // Level 5: fortress (outer ring strong)
                (r, c) => (r === 0 || r === BRICK_ROWS - 1 || c === 0 || c === BRICK_COLS - 1) ? 3 : 1,
            ];
            const pattern = PATTERNS[Math.min(lvl - 1, PATTERNS.length - 1)];
            for (let r = 0; r < BRICK_ROWS; r++) {
                for (let c = 0; c < BRICK_COLS; c++) {
                    const hp = pattern(r, c);
                    if (hp === 0) continue;
                    const hue = (r * 25 + c * 8 + lvl * 40) % 360;
                    bks.push({ x: c * BRICK_W, y: TOP_PAD + r * BRICK_H, w: BRICK_W - 3, h: BRICK_H - 3, hp, maxHp: hp, hue, pw: Math.random() < 0.12 ? pickPower() : null });
                }
            }
            return bks;
        }

        function pickPower() { return ['wide', 'laser', 'multi', 'magnet'][Math.floor(Math.random() * 4)]; }

        function makeBall(bx, by, angle) {
            const spd = H * 0.007;
            return { x: bx ?? W / 2, y: by ?? H * 0.65, vx: Math.cos(angle ?? -Math.PI / 2) * spd, vy: Math.sin(angle ?? -Math.PI / 2) * spd, trail: [], attached: !bx };
        }

        function resetLevel() {
            const pax = W / 2;
            paddle = { x: pax, y: H * 0.9, w: PAD_W_BASE * padWidthMult };
            balls = [makeBall()];
            laserBeams = []; powerUps = [];
            padPower = null; padWidthMult = 1; laserCooldown = 0; magnetActive = false;
        }

        function startGame() {
            score = 0; lives = 3; level = 1;
            bricks = makeBricks(level);
            particlesArr = []; particles = particlesArr;
            resetLevel(); running = true;
            scoreEl.textContent = '0';
            if (highScoreEl) highScoreEl.textContent = getHighScore();
            overlay.style.display = 'none';
            updateHUD();
        }
        let particlesArr = [];

        function updateHUD() {
            lvlBadge.textContent = `Level ${level}`;
            livesEl.textContent = '❤️'.repeat(lives);
        }

        function showOverlay(type) {
            overlay.style.display = 'flex';
            const best = getHighScore();
            if (type === 'start') {
                overlay.innerHTML = `
          <h2>⚡ Block Breaker</h2>
          <p>Mouse/Touch to move paddle. Break all bricks!<br>Catch power-ups for laser, multi-ball & more!</p>
          <button class="bb-btn" id="bb-go">Start</button>
        `;
            } else if (type === 'dead') {
                overlay.innerHTML = `
          <h2>Game Over</h2>
          <div class="bb-score">${score.toLocaleString()}</div>
          <p>Level ${level} · Best: ${best.toLocaleString()}</p>
          <button class="bb-btn" id="bb-go">Play Again</button>
        `;
            } else if (type === 'win') {
                overlay.innerHTML = `
          <h2>🎉 You Win!</h2>
          <div class="bb-score">${score.toLocaleString()}</div>
          <p>All ${level} levels cleared!</p>
          <button class="bb-btn" id="bb-go">Play Again</button>
        `;
            }
            document.getElementById('bb-go').addEventListener('click', startGame);
        }

        function spawnParticles(x, y, hue, n = 8) {
            for (let i = 0; i < n; i++) {
                const angle = Math.random() * Math.PI * 2, spd = 1.5 + Math.random() * 3;
                particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, hue, r: 3 + Math.random() * 3 });
            }
        }

        function update(dt) {
            if (!running) return;

            laserCooldown = Math.max(0, laserCooldown - dt);

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= dt * 1.5;
                if (p.life <= 0) particles.splice(i, 1);
            }

            // Power-ups fall
            for (let i = powerUps.length - 1; i >= 0; i--) {
                const pw = powerUps[i]; pw.y += dt * 160;
                if (pw.y > H + 20) { powerUps.splice(i, 1); continue; }
                if (pw.y + 10 > paddle.y - PAD_H && pw.y - 10 < paddle.y + PAD_H &&
                    pw.x > paddle.x - paddle.w / 2 && pw.x < paddle.x + paddle.w / 2) {
                    applyPower(pw.type); powerUps.splice(i, 1);
                }
            }

            // Laser beams
            for (let i = laserBeams.length - 1; i >= 0; i--) {
                const lb = laserBeams[i]; lb.y -= dt * 600;
                if (lb.y < 0) { laserBeams.splice(i, 1); continue; }
                for (let j = bricks.length - 1; j >= 0; j--) {
                    const b = bricks[j];
                    if (lb.x > b.x && lb.x < b.x + b.w && lb.y > b.y && lb.y < b.y + b.h) {
                        hitBrick(j); laserBeams.splice(i, 1); break;
                    }
                }
            }

            // Balls
            for (let bi = balls.length - 1; bi >= 0; bi--) {
                const ball = balls[bi];

                if (ball.attached) {
                    ball.x = paddle.x; ball.y = paddle.y - PAD_H - BALL_R - 2;
                    continue;
                }

                ball.trail.push({ x: ball.x, y: ball.y, life: 1 });
                if (ball.trail.length > 16) ball.trail.shift();
                ball.trail.forEach(t => t.life -= dt * 4);

                ball.x += ball.vx * dt * 60; ball.y += ball.vy * dt * 60;

                // Walls
                if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
                if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.vx = -Math.abs(ball.vx); }
                if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy = Math.abs(ball.vy); }

                // Lost ball
                if (ball.y - BALL_R > H + 20) {
                    balls.splice(bi, 1);
                    if (balls.length === 0) {
                        lives--;
                        updateHUD();
                        if (lives <= 0) { running = false; setHighScore(score); showOverlay('dead'); return; }
                        vibrate?.([40, 20, 60]);
                        resetLevel();
                    }
                    continue;
                }

                // Paddle collision
                const py = paddle.y - PAD_H;
                if (ball.y + BALL_R >= py && ball.y - BALL_R <= py + PAD_H * 2 &&
                    ball.x >= paddle.x - paddle.w / 2 && ball.x <= paddle.x + paddle.w / 2 && ball.vy > 0) {
                    const hit = (ball.x - paddle.x) / (paddle.w / 2);
                    const angle = hit * (Math.PI * 0.38) - Math.PI / 2;
                    const spd = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
                    ball.vx = Math.cos(angle) * spd;
                    ball.vy = Math.sin(angle) * spd;
                    ball.y = py - BALL_R;
                    if (magnetActive) ball.attached = true;
                }

                // Brick collision
                for (let j = bricks.length - 1; j >= 0; j--) {
                    const b = bricks[j];
                    if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w &&
                        ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h) {
                        const overlapL = ball.x + BALL_R - b.x, overlapR = b.x + b.w - (ball.x - BALL_R);
                        const overlapT = ball.y + BALL_R - b.y, overlapB = b.y + b.h - (ball.y - BALL_R);
                        const minH = Math.min(overlapL, overlapR), minV = Math.min(overlapT, overlapB);
                        if (minH < minV) ball.vx *= -1; else ball.vy *= -1;
                        hitBrick(j);
                        break;
                    }
                }
            }

            // Check level cleared
            if (bricks.length === 0) {
                level++;
                if (level > 10) { running = false; setHighScore(score); showOverlay('win'); return; }
                for (const ball of balls) {
                    spawnParticles(ball.x, ball.y, 200, 16);
                }
                bricks = makeBricks(level);
                resetLevel();
                updateHUD();
            }
        }

        function hitBrick(j) {
            const b = bricks[j];
            b.hp--;
            spawnParticles(b.x + b.w / 2, b.y + b.h / 2, b.hue, 6);
            if (b.hp <= 0) {
                const pts = b.maxHp * 10 * level;
                score += pts; scoreEl.textContent = score; setHighScore(score);
                if (highScoreEl) highScoreEl.textContent = getHighScore();
                if (b.pw) powerUps.push({ x: b.x + b.w / 2, y: b.y, type: b.pw, pulse: 0 });
                bricks.splice(j, 1);
            }
        }

        function applyPower(type) {
            padPower = type;
            spawnParticles(paddle.x, paddle.y, 180, 12);
            if (type === 'wide') { padWidthMult = 1.7; paddle.w = PAD_W_BASE * padWidthMult; setTimeout(() => { padWidthMult = 1; paddle.w = PAD_W_BASE; }, 8000); }
            if (type === 'multi') {
                const bs = [...balls];
                for (const ball of bs) {
                    if (ball.attached) continue;
                    const angle = Math.atan2(ball.vy, ball.vx);
                    balls.push(makeBall(ball.x, ball.y, angle + 0.4));
                    balls.push(makeBall(ball.x, ball.y, angle - 0.4));
                }
                balls.forEach(b => b.attached = false);
            }
            if (type === 'laser') { setTimeout(() => padPower = null, 8000); }
            if (type === 'magnet') { magnetActive = true; setTimeout(() => magnetActive = false, 5000); }
        }

        function spawnLaser() {
            if (padPower !== 'laser' || laserCooldown > 0) return;
            laserCooldown = 0.25;
            laserBeams.push({ x: paddle.x - 15, y: paddle.y - PAD_H });
            laserBeams.push({ x: paddle.x + 15, y: paddle.y - PAD_H });
        }

        function draw() {
            ctx.fillStyle = '#060914'; ctx.fillRect(0, 0, W, H);

            // Subtle grid
            ctx.strokeStyle = 'rgba(129,140,248,0.04)'; ctx.lineWidth = 0.5;
            for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
            for (let y = 0; y < H; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

            // Particles
            for (const p of particles) {
                ctx.save(); ctx.globalAlpha = p.life;
                ctx.fillStyle = `hsl(${p.hue},90%,65%)`; ctx.shadowColor = `hsl(${p.hue},90%,65%)`; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            // Bricks
            for (const b of bricks) {
                const alpha = 0.3 + (b.hp / b.maxHp) * 0.7;
                const lightness = 30 + (b.hp / b.maxHp) * 35;
                ctx.save();
                ctx.shadowColor = `hsl(${b.hue},90%,60%)`; ctx.shadowBlur = 8;
                const bg = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
                bg.addColorStop(0, `hsl(${b.hue},80%,${lightness + 15}%)`);
                bg.addColorStop(1, `hsl(${b.hue},80%,${lightness}%)`);
                ctx.fillStyle = bg;
                ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 5); ctx.fill();
                ctx.strokeStyle = `rgba(255,255,255,0.15)`; ctx.lineWidth = 1;
                ctx.stroke();
                // Cracks if hp < maxHp
                if (b.hp < b.maxHp) {
                    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
                    ctx.beginPath(); ctx.moveTo(b.x + b.w * 0.3, b.y); ctx.lineTo(b.x + b.w * 0.5, b.y + b.h); ctx.stroke();
                }
                // Power-up icon
                if (b.pw) {
                    ctx.font = `${b.h * 0.7}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.shadowBlur = 0;
                    const icons = { wide: '↔', laser: '⚡', multi: '✦', magnet: '🧲' };
                    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText(icons[b.pw] ?? '★', b.x + b.w / 2, b.y + b.h / 2);
                }
                ctx.restore();
            }

            // Power-up drops
            for (const pw of powerUps) {
                pw.pulse = (pw.pulse ?? 0) + 0.08;
                const colors = { wide: '#38bdf8', laser: '#f87171', multi: '#a78bfa', magnet: '#fbbf24' };
                const icons = { wide: '↔', laser: '⚡', multi: '✦', magnet: '🧲' };
                ctx.save();
                ctx.shadowColor = colors[pw.type]; ctx.shadowBlur = 14;
                ctx.fillStyle = colors[pw.type];
                ctx.globalAlpha = 0.9 + Math.sin(pw.pulse) * 0.1;
                ctx.beginPath(); ctx.arc(pw.x, pw.y, 14, 0, Math.PI * 2); ctx.fill();
                ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
                ctx.fillText(icons[pw.type], pw.x, pw.y);
                ctx.restore();
            }

            // Laser beams
            for (const lb of laserBeams) {
                ctx.save(); ctx.strokeStyle = '#f87171'; ctx.shadowColor = '#f87171'; ctx.shadowBlur = 12;
                ctx.lineWidth = 3;
                ctx.beginPath(); ctx.moveTo(lb.x, lb.y); ctx.lineTo(lb.x, lb.y - 25); ctx.stroke();
                ctx.restore();
            }

            // Ball trails + balls
            for (const ball of balls) {
                // Trail
                for (let i = 0; i < ball.trail.length; i++) {
                    const t = ball.trail[i];
                    if (t.life <= 0) continue;
                    const age = i / ball.trail.length;
                    ctx.save(); ctx.globalAlpha = t.life * age * 0.5;
                    ctx.fillStyle = '#818cf8'; ctx.shadowColor = '#818cf8'; ctx.shadowBlur = 8;
                    ctx.beginPath(); ctx.arc(t.x, t.y, BALL_R * age, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
                // Ball
                ctx.save();
                ctx.shadowColor = '#818cf8'; ctx.shadowBlur = 20;
                const bg = ctx.createRadialGradient(ball.x - BALL_R * 0.3, ball.y - BALL_R * 0.3, 1, ball.x, ball.y, BALL_R);
                bg.addColorStop(0, '#c4b5fd'); bg.addColorStop(1, '#6366f1');
                ctx.fillStyle = bg;
                ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            // Paddle
            ctx.save();
            const pw = paddle.w;
            ctx.shadowColor = padPower === 'laser' ? '#f87171' : padPower === 'wide' ? '#38bdf8' : '#818cf8';
            ctx.shadowBlur = 18;
            const padGrad = ctx.createLinearGradient(paddle.x - pw / 2, 0, paddle.x + pw / 2, 0);
            const c1 = padPower === 'laser' ? '#f87171' : padPower === 'magnet' ? '#fbbf24' : '#818cf8';
            const c2 = padPower === 'wide' ? '#38bdf8' : '#c084fc';
            padGrad.addColorStop(0, c1); padGrad.addColorStop(0.5, c2); padGrad.addColorStop(1, c1);
            ctx.fillStyle = padGrad;
            ctx.beginPath(); ctx.roundRect(paddle.x - pw / 2, paddle.y - PAD_H, pw, PAD_H * 2, PAD_H);
            ctx.fill();
            ctx.restore();
        }

        // Controls
        function movePaddle(clientX) {
            const rect = canvas.getBoundingClientRect();
            const relX = (clientX - rect.left) * (W / rect.width);
            paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, relX));
        }
        canvas.addEventListener('mousemove', e => movePaddle(e.clientX));
        canvas.addEventListener('touchmove', e => { e.preventDefault(); movePaddle(e.touches[0].clientX); }, { passive: false });

        const onKey = e => {
            if (e.code === 'Space') { e.preventDefault(); balls.forEach(b => { if (b.attached) b.attached = false; }); spawnLaser(); }
            if (e.code === 'ArrowLeft') { e.preventDefault(); paddle.x = Math.max(paddle.w / 2, paddle.x - W * 0.04); }
            if (e.code === 'ArrowRight') { e.preventDefault(); paddle.x = Math.min(W - paddle.w / 2, paddle.x + W * 0.04); }
        };
        document.addEventListener('keydown', onKey);
        canvas.addEventListener('mousedown', () => { balls.forEach(b => { if (b.attached) b.attached = false; }); spawnLaser(); });
        canvas.addEventListener('touchstart', e => { e.preventDefault(); balls.forEach(b => { if (b.attached) b.attached = false; }); }, { passive: false });

        function loop(ts) {
            raf = requestAnimationFrame(loop);
            const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
            update(dt); draw();
        }

        showOverlay('start');
        raf = requestAnimationFrame(loop);

        window.currentGameCleanup = () => {
            cancelAnimationFrame(raf); raf = null;
            document.removeEventListener('keydown', onKey);
            styleEl.remove();
        };
    };
})();
