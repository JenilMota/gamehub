/* =============================================
   Block Breaker — v3.0 Mobile-First
   Touch drag paddle, power-ups, 5 levels
   ============================================= */
(function () {
    'use strict';

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const bodyR = container.getBoundingClientRect();
        const W = isMobile ? Math.floor(bodyR.width) : Math.min(400, Math.floor(bodyR.width - 16));
        const H = isMobile ? Math.floor(window.innerHeight - 170) : Math.min(620, Math.floor(bodyR.height - 16));

        const wrapper = document.createElement('div');
        wrapper.className = 'game-canvas-wrapper';
        wrapper.style.position = 'relative';
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.cssText = `display:block;border-radius:${isMobile ? '0' : '18px'};touch-action:none;`;
        wrapper.appendChild(canvas); container.appendChild(wrapper);
        const ctx = canvas.getContext('2d');

        // Constants
        const PAD_H = 12, BALL_R = 8;
        const ROWS = 6, COLS = Math.floor(W / 58);
        const BRICK_W = Math.floor((W - 20) / COLS), BRICK_H = 22;
        const BRICK_PAD = 3, TOP_PAD = 60;

        // Levels — brick layouts (0=empty, 1-3=hp, 4=strong)
        function makeLevel(lvl) {
            const bricks = [];
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    let hp = 1;
                    if (lvl >= 2) hp = Math.random() < 0.3 ? 2 : 1;
                    if (lvl >= 4) hp = Math.random() < 0.2 ? 3 : hp;
                    const hue = (c / COLS) * 360 + r * 20 + lvl * 30;
                    bricks.push({
                        x: 10 + c * BRICK_W + BRICK_PAD, y: TOP_PAD + r * (BRICK_H + BRICK_PAD),
                        w: BRICK_W - BRICK_PAD * 2, h: BRICK_H,
                        hp, maxHp: hp, hue, hit: 0,
                    });
                }
            }
            return bricks;
        }

        let paddle, ball, balls, bricks, particles, powerups, score, state, level, lives;
        let lastTime = 0;

        function reset() {
            level = 1; lives = 3; score = 0;
            scoreEl.textContent = '0'; highScoreEl.textContent = getHighScore();
            startLevel();
            state = 'ready';
            showOverlay('ready');
        }

        function startLevel() {
            const padW = Math.max(60, W * 0.22);
            paddle = { x: W / 2 - padW / 2, w: padW, h: PAD_H, y: H - 40, targetX: W / 2 - padW / 2 };
            ball = { x: W / 2, y: H - 55, vx: (Math.random() < 0.5 ? 1 : -1) * 0.22, vy: -0.38, launched: false };
            balls = [ball];
            bricks = makeLevel(level);
            particles = []; powerups = [];
        }

        let overlayEl = null;
        function showOverlay(type) {
            removeOverlay();
            overlayEl = document.createElement('div');
            overlayEl.className = 'game-overlay';
            overlayEl.style.background = 'rgba(5,8,20,0.90)';
            if (type === 'ready') {
                overlayEl.innerHTML = `
          <h2 style="background:none;-webkit-text-fill-color:#f59e42;">🧱 Block Breaker</h2>
          <p style="color:rgba(255,255,255,0.6);">Move paddle to bounce ball<br>Touch/drag anywhere to control</p>
          <button class="btn-primary" id="bb-go" style="background:linear-gradient(135deg,#f59e42,#ffd93d);color:#111;">Play</button>`;
            } else if (type === 'level') {
                overlayEl.innerHTML = `
          <h2 style="background:none;-webkit-text-fill-color:#f59e42;">Level ${level}!</h2>
          <p style="color:rgba(255,255,255,0.6);">Get ready…</p>
          <button class="btn-primary" id="bb-go" style="background:linear-gradient(135deg,#f59e42,#ffd93d);color:#111;">Continue</button>`;
            } else if (type === 'win') {
                overlayEl.innerHTML = `
          <h2 style="background:none;-webkit-text-fill-color:#4ade80;">🎉 You Won!</h2>
          <p class="score-big" style="color:#f59e42;">${score}</p>
          <p style="color:#ffd93d;font-weight:700;">All 5 levels cleared!</p>
          <button class="btn-primary" id="bb-go" style="background:linear-gradient(135deg,#f59e42,#ffd93d);color:#111;">Play Again</button>`;
            } else {
                const best = getHighScore(), isNew = score >= best && score > 0;
                overlayEl.innerHTML = `
          <h2 style="background:none;-webkit-text-fill-color:#fff;">Game Over</h2>
          <p class="score-big" style="color:#f59e42;">${score}</p>
          <p style="color:${isNew ? '#ffd93d' : 'rgba(255,255,255,0.5)'};font-weight:700;">${isNew ? '🏆 New High Score!' : 'Best: ' + best}</p>
          <button class="btn-primary" id="bb-go" style="background:linear-gradient(135deg,#f59e42,#ffd93d);color:#111;">Try Again</button>`;
            }
            wrapper.appendChild(overlayEl);
            setTimeout(() => {
                document.getElementById('bb-go')?.addEventListener('click', () => {
                    removeOverlay();
                    if (type === 'win' || type === 'dead') { reset(); state = 'playing'; startLevel(); balls[0].launched = true; }
                    else if (type === 'level') { state = 'playing'; balls[0].launched = true; }
                    else { state = 'playing'; balls[0].launched = true; }
                });
            }, 30);
        }
        function removeOverlay() { overlayEl?.remove(); overlayEl = null; }

        // Input
        let mouseX = W / 2;
        canvas.addEventListener('mousemove', e => {
            const r = canvas.getBoundingClientRect();
            mouseX = (e.clientX - r.left) * (W / r.width);
        });
        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const r = canvas.getBoundingClientRect();
            mouseX = (e.touches[0].clientX - r.left) * (W / r.width);
        }, { passive: false });
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            if (state === 'playing' && !balls[0].launched) balls[0].launched = true;
        }, { passive: false });
        canvas.addEventListener('click', () => { if (state === 'playing' && !balls[0].launched) balls[0].launched = true; });
        document.addEventListener('keydown', e => {
            if (e.code === 'Space') { e.preventDefault(); if (state === 'playing' && !balls[0].launched) balls[0].launched = true; }
            if (e.code === 'ArrowLeft') mouseX = Math.max(paddle.w / 2, mouseX - 20);
            if (e.code === 'ArrowRight') mouseX = Math.min(W - paddle.w / 2, mouseX + 20);
        });

        function spawnParticles(x, y, hue, n = 6) {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;
                particles.push({ x, y, vx: Math.cos(a) * (1 + Math.random() * 2), vy: Math.sin(a) * (1 + Math.random() * 2), life: 1, hue });
            }
        }

        function update(dt) {
            if (state !== 'playing') return;

            // Smooth paddle follow mouse/touch
            paddle.targetX = Math.max(0, Math.min(W - paddle.w, mouseX - paddle.w / 2));
            paddle.x += (paddle.targetX - paddle.x) * 0.28;

            // Process each ball
            for (let bi = balls.length - 1; bi >= 0; bi--) {
                const b = balls[bi];
                if (!b.launched) { b.x = paddle.x + paddle.w / 2; b.y = paddle.y - BALL_R - 2; continue; }

                b.x += b.vx * dt; b.y += b.vy * dt;

                // Walls
                if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); }
                if (b.x + BALL_R > W) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); }
                if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); }

                // Lost
                if (b.y - BALL_R > H + 10) {
                    balls.splice(bi, 1);
                    if (balls.length === 0) {
                        lives--;
                        if (lives <= 0) { setHighScore(score); state = 'dead'; vibrate([50, 30, 50]); setTimeout(() => showOverlay('dead'), 400); return; }
                        else { startLevel(); balls[0].launched = false; vibrate(30); }
                    }
                    continue;
                }

                // Paddle
                if (b.vy > 0 && b.y + BALL_R >= paddle.y && b.y - BALL_R <= paddle.y + paddle.h &&
                    b.x + BALL_R >= paddle.x && b.x - BALL_R <= paddle.x + paddle.w) {
                    b.vy = -Math.abs(b.vy);
                    const rel = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
                    b.vx = rel * 0.40;
                    spawnParticles(b.x, paddle.y, 40, 4);
                }

                // Bricks
                for (let i = bricks.length - 1; i >= 0; i--) {
                    const br = bricks[i];
                    if (b.x + BALL_R < br.x || b.x - BALL_R > br.x + br.w || b.y + BALL_R < br.y || b.y - BALL_R > br.y + br.h) continue;
                    // Which face?
                    const overlapL = b.x + BALL_R - br.x;
                    const overlapR = br.x + br.w - (b.x - BALL_R);
                    const overlapT = b.y + BALL_R - br.y;
                    const overlapB = br.y + br.h - (b.y - BALL_R);
                    const minOv = Math.min(overlapL, overlapR, overlapT, overlapB);
                    if (minOv === overlapL || minOv === overlapR) b.vx *= -1;
                    else b.vy *= -1;

                    br.hp--; br.hit = 1;
                    if (br.hp <= 0) {
                        score += 10 * level; scoreEl.textContent = score;
                        spawnParticles(br.x + br.w / 2, br.y + br.h / 2, br.hue, 8);
                        // Powerup chance
                        if (Math.random() < 0.15) powerups.push({ x: br.x + br.w / 2, y: br.y, type: Math.random() < 0.5 ? 'multi' : 'wide', vy: 0.12 });
                        bricks.splice(i, 1);
                        vibrate(8);
                    } else { vibrate(4); }
                    break;
                }
            }

            // Power-ups
            for (let i = powerups.length - 1; i >= 0; i--) {
                powerups[i].y += powerups[i].vy * dt;
                if (powerups[i].y > H + 20) { powerups.splice(i, 1); continue; }
                if (powerups[i].x + 16 >= paddle.x && powerups[i].x - 16 <= paddle.x + paddle.w &&
                    powerups[i].y + 12 >= paddle.y && powerups[i].y - 12 <= paddle.y + paddle.h) {
                    if (powerups[i].type === 'multi') {
                        // Duplicate all balls
                        const existing = [...balls];
                        for (const ball2 of existing) {
                            balls.push({ x: ball2.x, y: ball2.y, vx: -ball2.vx * 0.9, vy: ball2.vy, launched: true });
                        }
                    } else {
                        paddle.w = Math.min(W * 0.5, paddle.w * 1.4);
                        setTimeout(() => { paddle.w = Math.max(60, W * 0.22); }, 6000);
                    }
                    spawnParticles(powerups[i].x, powerups[i].y, powerups[i].type === 'multi' ? 185 : 45, 10);
                    powerups.splice(i, 1);
                }
            }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                particles[i].x += particles[i].vx * 0.5;
                particles[i].y += particles[i].vy * 0.5;
                particles[i].life -= 0.04;
                if (particles[i].life <= 0) particles.splice(i, 1);
            }

            // Hit flash decay
            for (const br of bricks) { if (br.hit > 0) br.hit -= 0.08; }

            // Level complete
            if (bricks.length === 0) {
                level++;
                setHighScore(score);
                if (level > 5) { state = 'won'; setTimeout(() => showOverlay('win'), 400); return; }
                startLevel(); state = 'levelup';
                setTimeout(() => showOverlay('level'), 400);
            }
        }

        function draw() {
            ctx.fillStyle = '#09111f'; ctx.fillRect(0, 0, W, H);

            // Bricks
            for (const br of bricks) {
                const hitBright = br.hit > 0 ? br.hit * 20 : 0;
                const sat = 70 + hitBright;
                const lig = 42 + Math.floor((1 - br.hp / br.maxHp) * 15) + hitBright;
                ctx.fillStyle = `hsl(${br.hue},${sat}%,${lig}%)`;
                ctx.shadowColor = `hsl(${br.hue},80%,55%)`;
                ctx.shadowBlur = 6;
                roundRect(ctx, br.x, br.y, br.w, br.h, 6);
                ctx.fill();
                ctx.shadowBlur = 0;
                // Shine
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                roundRect(ctx, br.x + 2, br.y + 2, br.w - 4, 6, 3);
                ctx.fill();
                // HP dots
                if (br.maxHp > 1) {
                    for (let d = 0; d < br.hp; d++) {
                        ctx.fillStyle = 'rgba(255,255,255,0.6)';
                        ctx.beginPath(); ctx.arc(br.x + 8 + d * 8, br.y + br.h - 7, 2, 0, Math.PI * 2); ctx.fill();
                    }
                }
            }

            // Power-ups
            for (const p of powerups) {
                ctx.fillStyle = p.type === 'multi' ? '#38d9c0' : '#f59e42';
                ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
                ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                ctx.fillStyle = '#fff'; ctx.font = '600 9px Inter'; ctx.textAlign = 'center';
                ctx.fillText(p.type === 'multi' ? '×2' : 'W+', p.x, p.y + 3);
            }

            // Balls
            for (const b of balls) {
                const bg = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BALL_R);
                bg.addColorStop(0, '#fff'); bg.addColorStop(1, '#38d9c0');
                ctx.fillStyle = bg;
                ctx.shadowColor = '#38d9c0'; ctx.shadowBlur = 16;
                ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
            }

            // Paddle
            const padG = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x + paddle.w, paddle.y + paddle.h);
            padG.addColorStop(0, '#5b7fff'); padG.addColorStop(1, '#9b6dff');
            ctx.fillStyle = padG; ctx.shadowColor = '#5b7fff'; ctx.shadowBlur = 14;
            roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 8); ctx.fill(); ctx.shadowBlur = 0;

            // Particles
            for (const p of particles) {
                ctx.globalAlpha = p.life;
                ctx.fillStyle = `hsl(${p.hue},80%,60%)`;
                ctx.beginPath(); ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;

            // HUD
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.font = '600 12px Inter'; ctx.textAlign = 'left';
            ctx.fillText(`Level ${level}`, 12, 22);
            ctx.textAlign = 'right'; ctx.fillText(`❤️ ${lives}`, W - 12, 22);
        }

        function roundRect(ctx, x, y, w, h, r) {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
            ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
            ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
        }

        let animId;
        function loop(now) {
            const dt = Math.min(now - lastTime, 33); lastTime = now;
            update(dt); draw(); animId = requestAnimationFrame(loop);
        }

        reset(); lastTime = performance.now(); loop(lastTime);

        window.currentGameCleanup = function () {
            cancelAnimationFrame(animId);
            document.removeEventListener('keydown', e => { });
            window.initGame = null;
        };
    };
})();
