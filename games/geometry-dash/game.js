/* ================================================
   GEOMETRY DASH — Full Implementation v1.0
   Auto-runner, procedural obstacles, orbs,
   neon cube + trail, attempt counter
   ================================================ */
(function () {
    'use strict';

    const style = document.createElement('style');
    style.textContent = `
    #gd-wrap { width:100%;height:100%;position:relative;background:#060914;overflow:hidden; }
    #gd-canvas { display:block; }
    #gd-overlay {
      position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;
      background:rgba(6,9,20,0.88);backdrop-filter:blur(18px);z-index:10;
      animation:gdFadeIn 0.3s ease-out;
    }
    @keyframes gdFadeIn{from{opacity:0}to{opacity:1}}
    #gd-overlay h2 {
      font-size:2.2rem;font-weight:900;letter-spacing:-1px;font-family:Inter,sans-serif;
      background:linear-gradient(135deg,#5b7fff,#9b6dff);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    #gd-overlay p { color:#8892b0;font-size:0.9rem;font-family:Inter,sans-serif;text-align:center; }
    #gd-overlay .gd-btn {
      padding:12px 36px;border:none;border-radius:999px;cursor:pointer;
      background:linear-gradient(135deg,#5b7fff,#9b6dff);color:#fff;
      font-family:Inter,sans-serif;font-size:1rem;font-weight:800;
      box-shadow:0 4px 20px rgba(91,127,255,0.45);transition:transform 0.15s;
    }
    #gd-overlay .gd-btn:hover{transform:scale(1.06);}
    #gd-hud {
      position:absolute;top:12px;left:0;right:0;display:flex;justify-content:space-between;
      padding:0 16px;font-family:Inter,sans-serif;font-weight:700;
      font-size:0.85rem;color:rgba(255,255,255,0.55);pointer-events:none;
    }
  `;
    document.head.appendChild(style);

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile }) {
        const R = container.getBoundingClientRect();
        const W = Math.floor(R.width), H = Math.floor(R.height);

        const wrap = document.createElement('div'); wrap.id = 'gd-wrap';
        const canvas = document.createElement('canvas'); canvas.id = 'gd-canvas';
        canvas.width = W; canvas.height = H;
        const overlay = document.createElement('div'); overlay.id = 'gd-overlay';
        const hud = document.createElement('div'); hud.id = 'gd-hud';
        hud.innerHTML = '<span id="gd-attempt">Attempt 1</span><span id="gd-pct">0%</span>';
        wrap.appendChild(canvas); wrap.appendChild(overlay); wrap.appendChild(hud);
        container.appendChild(wrap);
        const ctx = canvas.getContext('2d');

        const GROUND_Y = H * 0.72;
        const CUBE_SIZE = Math.min(40, H * 0.07);
        const SPEED_BASE = W * 0.004;
        const GRAVITY = H * 0.001;
        const JUMP_V = -H * 0.022;

        let attempt = 1, running = false, raf;
        let cubeX, cubeY, vy, onGround, isDead, cameraX;
        let trailParts;
        let score = 0, bestPct = 0;

        // Procedural level seed (consistent obstacles every run)
        const OBSTACLES = generateLevel();

        function generateLevel() {
            const segs = [];
            let x = W * 1.5;
            const rnd = (a, b) => a + Math.floor(Math.random() * (b - a));
            const srand = mulberry32(42); // deterministic seeded random
            function sr(a, b) { return a + Math.floor(srand() * (b - a)); }
            for (let i = 0; i < 120; i++) {
                const type = sr(0, 3); // 0=spike, 1=block, 2=double-spike
                if (type === 0) {
                    segs.push({ kind: 'spike', x, gapAfter: sr(110, 180) });
                    x += sr(110, 180);
                } else if (type === 1) {
                    const h = sr(1, 3);
                    segs.push({ kind: 'block', x, h, gapAfter: sr(130, 220) });
                    x += sr(130, 220);
                } else {
                    segs.push({ kind: 'spike', x, gapAfter: 5 });
                    segs.push({ kind: 'spike', x: x + CUBE_SIZE * 0.9, gapAfter: sr(130, 200) });
                    x += sr(130, 200);
                }
            }
            segs.push({ kind: 'end', x });
            return segs;
        }

        function mulberry32(a) {
            return function () {
                a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
                t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;
            };
        }

        function reset() {
            cubeX = W * 0.22; cubeY = GROUND_Y - CUBE_SIZE;
            vy = 0; onGround = true; isDead = false;
            cameraX = 0; trailParts = [];
        }

        function jump() {
            if (onGround && !isDead) { vy = JUMP_V; onGround = false; }
        }

        function startGame() {
            reset(); running = true;
            overlay.style.display = 'none';
            if (raf) cancelAnimationFrame(raf);
            raf = requestAnimationFrame(loop);
        }

        function die() {
            isDead = true; running = false;
            const pct = Math.round(cameraX / (OBSTACLES[OBSTACLES.length - 1].x - W) * 100);
            if (pct > bestPct) { bestPct = pct; setHighScore(pct); }
            scoreEl.textContent = pct + '%';
            setTimeout(() => {
                attempt++;
                showOverlay(false, pct);
            }, 400);
        }

        function showOverlay(start, pct) {
            overlay.style.display = 'flex';
            if (start) {
                overlay.innerHTML = `
          <h2>🔷 Geometry Dash</h2>
          <p>Tap / Space to jump. Don't hit the spikes!<br>Complete the level to win.</p>
          <button class="gd-btn" id="gd-start">Start</button>
        `;
            } else {
                overlay.innerHTML = `
          <h2>${pct >= 100 ? '🏆 Complete!' : '💀 Crashed'}</h2>
          <p>Attempt ${attempt - 1} · ${pct}% complete<br>Best: ${bestPct}%</p>
          <button class="gd-btn" id="gd-start">Attempt ${attempt}</button>
        `;
            }
            document.getElementById('gd-start').addEventListener('click', startGame);
            document.getElementById('gd-attempt').textContent = `Attempt ${attempt}`;
        }

        function getObstaclesInView() {
            return OBSTACLES.filter(o => {
                const wx = o.x - cameraX;
                return wx > -CUBE_SIZE * 2 && wx < W + 200;
            });
        }

        function checkCollision() {
            const obs = getObstaclesInView();
            for (const o of obs) {
                const ox = o.x - cameraX;
                if (o.kind === 'spike') {
                    // Spike triangle collision (rough AABB)
                    const sz = CUBE_SIZE;
                    if (cubeX + sz * 0.85 > ox + 4 && cubeX + sz * 0.15 < ox + sz - 4 &&
                        cubeY + sz * 0.85 > GROUND_Y - sz + 6) return true;
                } else if (o.kind === 'block') {
                    const bh = o.h * CUBE_SIZE;
                    const bTop = GROUND_Y - bh;
                    if (cubeX + CUBE_SIZE * 0.8 > ox + 3 && cubeX + CUBE_SIZE * 0.2 < ox + CUBE_SIZE - 3 &&
                        cubeY + CUBE_SIZE * 0.85 > bTop + 3 && cubeY < GROUND_Y + 5) return true;
                }
            }
            return false;
        }

        let lastT = 0;
        function loop(ts) {
            const dt = Math.min((ts - lastT) / 16.67, 3); lastT = ts;
            if (!running) { raf = requestAnimationFrame(loop); return; }

            const speed = SPEED_BASE * (1 + cameraX / (W * 20));
            cameraX += speed * dt;

            // Physics
            vy += GRAVITY * dt;
            cubeY += vy * dt;

            if (cubeY >= GROUND_Y - CUBE_SIZE) {
                cubeY = GROUND_Y - CUBE_SIZE; vy = 0; onGround = true;
            }

            // Trail
            trailParts.push({ x: cubeX, y: cubeY, alpha: 0.7 });
            if (trailParts.length > 14) trailParts.shift();
            trailParts.forEach(t => t.alpha -= 0.04);

            // Collision
            if (checkCollision()) { die(); }

            // HUD
            const totalLen = OBSTACLES[OBSTACLES.length - 1].x - W;
            const pct = Math.min(100, Math.round(cameraX / totalLen * 100));
            document.getElementById('gd-pct').textContent = pct + '%';
            document.getElementById('gd-attempt').textContent = `Attempt ${attempt}`;
            scoreEl.textContent = pct + '%';

            if (pct >= 100) {
                running = false;
                setHighScore(100);
                scoreEl.textContent = '100%';
                setTimeout(() => showOverlay(false, 100), 400);
            }

            // Draw
            drawFrame(speed);
            raf = requestAnimationFrame(loop);
        }

        function drawFrame(speed) {
            // Sky gradient
            const sky = ctx.createLinearGradient(0, 0, 0, H);
            sky.addColorStop(0, '#060914'); sky.addColorStop(1, '#0b0f28');
            ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

            // Parallax stars
            ctx.fillStyle = 'rgba(255,255,255,0.5)';
            for (let i = 0; i < 60; i++) {
                const sx = ((i * 173.41 + cameraX * 0.1) % W + W) % W;
                const sy = ((i * 97.13) % GROUND_Y);
                const r = i % 3 === 0 ? 1.5 : 0.8;
                ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
            }

            // Ground
            const gGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
            gGrad.addColorStop(0, '#1a1f3a'); gGrad.addColorStop(1, '#060914');
            ctx.fillStyle = gGrad; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

            // Ground line glow
            ctx.save(); ctx.shadowColor = '#5b7fff'; ctx.shadowBlur = 12;
            ctx.fillStyle = '#5b7fff'; ctx.fillRect(0, GROUND_Y, W, 2);
            ctx.restore();

            // Background grid lines (moving)
            ctx.strokeStyle = 'rgba(91,127,255,0.06)';
            ctx.lineWidth = 1;
            const gridSize = CUBE_SIZE;
            const offX = (cameraX * 0.5) % gridSize;
            for (let x = -offX; x < W; x += gridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GROUND_Y); ctx.stroke(); }
            for (let y = 0; y < GROUND_Y; y += gridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

            // Obstacles
            const obs = getObstaclesInView();
            for (const o of obs) {
                const ox = o.x - cameraX;
                if (o.kind === 'spike') {
                    ctx.save();
                    ctx.shadowColor = '#f87171'; ctx.shadowBlur = 16;
                    ctx.fillStyle = '#f87171';
                    ctx.beginPath();
                    ctx.moveTo(ox + CUBE_SIZE / 2, GROUND_Y - CUBE_SIZE);
                    ctx.lineTo(ox + CUBE_SIZE, GROUND_Y);
                    ctx.lineTo(ox, GROUND_Y);
                    ctx.closePath(); ctx.fill();
                    // Spike outline
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
                    ctx.restore();
                } else if (o.kind === 'block') {
                    const bh = o.h * CUBE_SIZE;
                    ctx.save();
                    ctx.shadowColor = '#9b6dff'; ctx.shadowBlur = 14;
                    const bg = ctx.createLinearGradient(ox, GROUND_Y - bh, ox + CUBE_SIZE, GROUND_Y);
                    bg.addColorStop(0, '#9b6dff'); bg.addColorStop(1, '#5b7fff');
                    ctx.fillStyle = bg;
                    ctx.beginPath(); ctx.roundRect(ox, GROUND_Y - bh, CUBE_SIZE, bh, 4); ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5; ctx.stroke();
                    ctx.restore();
                }
            }

            // Trail
            for (let i = 0; i < trailParts.length; i++) {
                const t = trailParts[i];
                const age = i / trailParts.length;
                ctx.save();
                ctx.globalAlpha = t.alpha * age;
                ctx.fillStyle = '#5b7fff';
                const ts2 = CUBE_SIZE * (0.5 + age * 0.5);
                ctx.beginPath();
                ctx.roundRect(t.x + (CUBE_SIZE - ts2) / 2, t.y + (CUBE_SIZE - ts2) / 2, ts2, ts2, 3);
                ctx.fill();
                ctx.restore();
            }

            // Cube (with rotation on air)
            const rot = onGround ? 0 : ((Date.now() * 0.005) % ((Math.PI * 2)));
            ctx.save();
            ctx.translate(cubeX + CUBE_SIZE / 2, cubeY + CUBE_SIZE / 2);
            if (!onGround) ctx.rotate(rot);
            ctx.shadowColor = '#5b7fff'; ctx.shadowBlur = 20;
            // Cube gradient
            const cg = ctx.createLinearGradient(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE / 2, CUBE_SIZE / 2);
            cg.addColorStop(0, '#7ca9ff'); cg.addColorStop(1, '#5b7fff');
            ctx.fillStyle = cg;
            ctx.beginPath();
            ctx.roundRect(-CUBE_SIZE / 2, -CUBE_SIZE / 2, CUBE_SIZE, CUBE_SIZE, 5);
            ctx.fill();
            // Inner diamond
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.beginPath();
            ctx.moveTo(0, -CUBE_SIZE * 0.25);
            ctx.lineTo(CUBE_SIZE * 0.25, 0);
            ctx.lineTo(0, CUBE_SIZE * 0.25);
            ctx.lineTo(-CUBE_SIZE * 0.25, 0);
            ctx.closePath(); ctx.fill();
            ctx.restore();

            // Progress bar at bottom
            const totalLen = OBSTACLES[OBSTACLES.length - 1].x - W;
            const pct = Math.min(1, cameraX / totalLen);
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.beginPath(); ctx.roundRect(W * 0.1, H - 8, W * 0.8, 4, 2); ctx.fill();
            ctx.save();
            ctx.shadowColor = '#5b7fff'; ctx.shadowBlur = 8;
            ctx.fillStyle = '#5b7fff';
            ctx.beginPath(); ctx.roundRect(W * 0.1, H - 8, W * 0.8 * pct, 4, 2); ctx.fill();
            ctx.restore();
        }

        // Controls
        function onTap(e) { e.preventDefault(); if (!running) { startGame(); return; } jump(); }
        function onKey(e) {
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
                e.preventDefault(); if (!running) { startGame(); return; } jump();
            }
        }
        canvas.addEventListener('mousedown', onTap);
        canvas.addEventListener('touchstart', onTap, { passive: false });
        document.addEventListener('keydown', onKey);

        // Mobile controls
        const mc = document.getElementById('mc-up');
        if (mc) mc.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });
        const mcAction = document.getElementById('mc-action');
        if (mcAction) mcAction.addEventListener('touchstart', e => { e.preventDefault(); jump(); }, { passive: false });

        showOverlay(true);

        window.currentGameCleanup = () => {
            cancelAnimationFrame(raf);
            canvas.removeEventListener('mousedown', onTap);
            canvas.removeEventListener('touchstart', onTap);
            document.removeEventListener('keydown', onKey);
            style.remove();
        };
    };
})();
