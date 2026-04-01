/* =============================================
   SPACE WAVES — Nova Edition v4.0
   Twin-stick feel, 5 enemy types, boss waves,
   weapon upgrades, shield, screen shake, warp
   ============================================= */
(function () {
    'use strict';

    const CSS = `
    #sw-wrap{width:100%;height:100%;position:relative;overflow:hidden;background:#000;}
    #sw-canvas{display:block;}
    #sw-overlay{
      position:absolute;inset:0;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;
      background:rgba(0,0,10,0.9);backdrop-filter:blur(18px);z-index:10;
    }
    #sw-overlay h2{
      font-size:2.4rem;font-weight:900;font-family:Inter,sans-serif;letter-spacing:-1px;
      background:linear-gradient(135deg,#60a5fa,#a78bfa);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    #sw-overlay p{color:#64748b;font-family:Inter,sans-serif;font-size:0.9rem;text-align:center;line-height:1.6;}
    #sw-overlay .sw-big{font-size:2.8rem;font-weight:900;color:#60a5fa;font-family:Inter,sans-serif;}
    .sw-btn{
      padding:12px 40px;border:none;border-radius:999px;cursor:pointer;
      background:linear-gradient(135deg,#60a5fa,#a78bfa);color:#fff;
      font-family:Inter,sans-serif;font-size:1rem;font-weight:900;
      box-shadow:0 4px 24px rgba(96,165,250,0.4);transition:transform 0.15s;
    }
    .sw-btn:hover{transform:scale(1.07);}
    #sw-hud{
      position:absolute;top:0;left:0;right:0;height:50px;
      display:flex;align-items:center;justify-content:space-between;
      padding:0 16px;pointer-events:none;z-index:5;
    }
    #sw-shield-bar-bg{
      position:absolute;bottom:0;left:0;right:0;height:3px;background:rgba(255,255,255,0.08);z-index:5;pointer-events:none;
    }
    #sw-shield-bar{height:100%;background:linear-gradient(90deg,#60a5fa,#a78bfa);transition:width 0.3s;}
  `;
    const styleEl = document.createElement('style'); styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const R = container.getBoundingClientRect();
        const W = Math.floor(R.width), H = Math.floor(R.height);

        const wrap = document.createElement('div'); wrap.id = 'sw-wrap';
        const canvas = document.createElement('canvas'); canvas.id = 'sw-canvas';
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const overlay = document.createElement('div'); overlay.id = 'sw-overlay';
        const hud = document.createElement('div'); hud.id = 'sw-hud';
        hud.innerHTML = `<span id="sw-wave" style="font-family:Inter;font-size:0.8rem;font-weight:700;color:rgba(255,255,255,0.4)">Wave 1</span><span id="sw-weapon" style="font-family:Inter;font-size:0.8rem;font-weight:700;color:rgba(96,165,250,0.7)">⚡ Single</span>`;
        const shieldBg = document.createElement('div'); shieldBg.id = 'sw-shield-bar-bg';
        const shieldBar = document.createElement('div'); shieldBar.id = 'sw-shield-bar'; shieldBar.style.width = '100%';
        shieldBg.appendChild(shieldBar);

        wrap.appendChild(canvas); wrap.appendChild(overlay); wrap.appendChild(hud); wrap.appendChild(shieldBg);
        container.appendChild(wrap);

        // Stars
        const STARS = Array.from({ length: 120 }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            r: Math.random() * 1.8 + 0.2,
            spd: 0.2 + Math.random() * 1.2,
            alpha: 0.3 + Math.random() * 0.6
        }));

        let ship, bullets, enemies, particles, powerDrops;
        let wave, score, shield, running, raf, lastT = 0;
        let shake = { x: 0, y: 0, t: 0 };
        let keys = {};
        let weaponLevel = 1;
        let waveTimer = 0, waveActive = false, bossAlive = false;
        let touchTarget = null;

        const WEAPON_NAMES = ['Single', 'Double', 'Triple', 'Laser'];

        function resetGame() {
            ship = { x: W / 2, y: H * 0.85, r: 16, vx: 0, vy: 0, fireTimer: 0, trail: [], invincible: 0 };
            bullets = []; enemies = []; particles = []; powerDrops = [];
            wave = 1; score = 0; shield = 100; weaponLevel = 1;
            waveTimer = 0; waveActive = false; bossAlive = false;
            scoreEl.textContent = '0';
            if (highScoreEl) highScoreEl.textContent = getHighScore();
            updateHUD();
            spawnWave();
        }

        function updateHUD() {
            document.getElementById('sw-wave').textContent = `Wave ${wave}`;
            document.getElementById('sw-weapon').textContent = `⚡ ${WEAPON_NAMES[Math.min(weaponLevel - 1, WEAPON_NAMES.length - 1)]}`;
            shieldBar.style.width = `${shield}%`;
            shieldBar.style.background = shield < 25 ? 'linear-gradient(90deg,#f87171,#fbbf24)' : 'linear-gradient(90deg,#60a5fa,#a78bfa)';
        }

        function spawnWave() {
            const isBoss = wave % 5 === 0;
            const count = isBoss ? 1 : 4 + wave * 2;
            waveActive = true;
            if (isBoss) {
                const bossHp = 20 + wave * 10;
                enemies.push({ x: W / 2, y: -60, r: 40, vx: 0, vy: 0.5, hp: bossHp, maxHp: bossHp, type: 'boss', fireTimer: 0, angle: 0, wobble: 0 });
                bossAlive = true;
            } else {
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        if (!running) return;
                        const type = Math.random() < 0.2 ? 'zigzag' : Math.random() < 0.15 ? 'tank' : Math.random() < 0.1 ? 'speeder' : 'basic';
                        const sizes = { basic: 14, zigzag: 12, tank: 20, speeder: 10 };
                        const hps = { basic: 1, zigzag: 1, tank: 3, speeder: 1 };
                        enemies.push({
                            x: Math.random() * (W - 60) + 30, y: -40,
                            r: sizes[type], hp: hps[type], maxHp: hps[type],
                            vx: (Math.random() - 0.5) * 2, vy: 1.2 + Math.random() * (wave * 0.3),
                            type, zigPhase: 0, fireTimer: 0, angle: 0
                        });
                    }, i * 200);
                }
            }
        }

        function spawnExplosion(x, y, color, big) {
            const n = big ? 24 : 12;
            for (let i = 0; i < n; i++) {
                const angle = Math.random() * Math.PI * 2, spd = (big ? 4 : 2) + Math.random() * 3;
                particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, color, r: big ? 5 : 3 });
            }
            if (big) { shake.x = 8; shake.y = 8; shake.t = 0.3; vibrate?.([50, 30, 80]); }
        }

        function fireBullets() {
            const px = ship.x, py = ship.y - ship.r;
            const spd = H * 0.018;
            if (weaponLevel === 1) bullets.push({ x: px, y: py, vx: 0, vy: -spd, r: 4, type: 'normal' });
            else if (weaponLevel === 2) { bullets.push({ x: px - 12, y: py, vx: 0, vy: -spd, r: 4, type: 'normal' }); bullets.push({ x: px + 12, y: py, vx: 0, vy: -spd, r: 4, type: 'normal' }); }
            else if (weaponLevel === 3) { bullets.push({ x: px, y: py, vx: 0, vy: -spd, r: 4, type: 'normal' }); bullets.push({ x: px - 14, y: py, vx: -spd * 0.15, vy: -spd, r: 4, type: 'normal' }); bullets.push({ x: px + 14, y: py, vx: spd * 0.15, vy: -spd, r: 4, type: 'normal' }); }
            else { bullets.push({ x: px, y: py, vx: 0, vy: -spd * 1.4, r: 5, type: 'laser', life: 1 }); }
        }

        function update(dt) {
            if (!running) return;
            const pxDt = dt * 60;

            // Camera shake
            if (shake.t > 0) {
                shake.t -= dt;
                shake.x = (Math.random() - 0.5) * 10 * (shake.t / 0.3);
                shake.y = (Math.random() - 0.5) * 10 * (shake.t / 0.3);
                if (shake.t <= 0) { shake.x = 0; shake.y = 0; }
            }

            // Stars
            for (const s of STARS) { s.y += s.spd; if (s.y > H + 2) { s.y = -2; s.x = Math.random() * W; } }

            // Ship movement
            const speed = W * 0.006 * pxDt;
            if (keys['ArrowLeft'] || keys['a'] || keys['A']) ship.vx -= speed * 0.4;
            if (keys['ArrowRight'] || keys['d'] || keys['D']) ship.vx += speed * 0.4;
            if (keys['ArrowUp'] || keys['w'] || keys['W']) ship.vy -= speed * 0.3;
            if (keys['ArrowDown'] || keys['s'] || keys['S']) ship.vy += speed * 0.3;
            ship.vx *= 0.88; ship.vy *= 0.88;
            ship.x = Math.max(ship.r, Math.min(W - ship.r, ship.x + ship.vx));
            ship.y = Math.max(H * 0.1, Math.min(H - ship.r, ship.y + ship.vy));

            // Trail
            ship.trail.push({ x: ship.x, y: ship.y, life: 1 });
            if (ship.trail.length > 12) ship.trail.shift();
            ship.trail.forEach(t => t.life -= dt * 5);

            // Auto-fire
            ship.fireTimer -= dt;
            if (ship.fireTimer <= 0) { fireBullets(); ship.fireTimer = weaponLevel >= 4 ? 0.06 : 0.18 - wave * 0.005; ship.fireTimer = Math.max(0.06, ship.fireTimer); }

            ship.invincible = Math.max(0, ship.invincible - dt);

            // Bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                b.x += b.vx; b.y += b.vy;
                if (b.type === 'laser') { b.life -= dt * 1.5; if (b.life <= 0) { bullets.splice(i, 1); continue; } }
                if (b.y < -20 || b.x < -20 || b.x > W + 20) { bullets.splice(i, 1); continue; }

                // vs enemies
                let hit = false;
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const e = enemies[j];
                    const d = Math.hypot(b.x - e.x, b.y - e.y);
                    if (d < b.r + e.r) {
                        e.hp--;
                        const hue = e.type === 'boss' ? 280 : e.type === 'tank' ? 30 : 200;
                        spawnExplosion(b.x, b.y, `hsl(${hue},90%,60%)`, false);
                        if (e.hp <= 0) {
                            const pts = e.type === 'boss' ? 500 * wave : e.type === 'tank' ? 30 : 10;
                            score += pts; scoreEl.textContent = score; setHighScore(score);
                            if (highScoreEl) highScoreEl.textContent = getHighScore();
                            spawnExplosion(e.x, e.y, `hsl(${hue},90%,60%)`, e.type === 'boss' ? true : false);
                            if (Math.random() < 0.15) powerDrops.push({ x: e.x, y: e.y, vy: 1.5, type: Math.random() < 0.5 ? 'weapon' : 'shield', pulse: 0 });
                            if (e.type === 'boss') bossAlive = false;
                            enemies.splice(j, 1);
                        }
                        if (b.type !== 'laser') { bullets.splice(i, 1); hit = true; break; }
                    }
                }
                if (hit) continue;
            }

            // Enemies
            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                e.angle += dt * 2;

                if (e.type === 'boss') {
                    e.wobble += dt * 2;
                    e.x = W / 2 + Math.sin(e.wobble) * W * 0.35;
                    e.y = Math.min(H * 0.22, e.y + e.vy);
                    e.fireTimer -= dt;
                    if (e.fireTimer <= 0) {
                        const angles = [Math.PI / 2, Math.PI / 2 + 0.4, Math.PI / 2 - 0.4];
                        for (const a of angles) bullets.push({ x: e.x, y: e.y + e.r, vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, r: 6, type: 'enemy', hue: 0 });
                        e.fireTimer = 1.2;
                    }
                } else if (e.type === 'zigzag') {
                    e.zigPhase = (e.zigPhase ?? 0) + dt * 3;
                    e.x += Math.sin(e.zigPhase) * 3;
                    e.y += e.vy;
                } else if (e.type === 'speeder') {
                    e.vy = Math.min(e.vy + dt * 2, H * 0.015);
                    e.y += e.vy; e.x += e.vx;
                } else {
                    e.y += e.vy; e.x += e.vx;
                }

                e.x = ((e.x % W) + W) % W;

                // Boss fires spread at player
                if (e.type !== 'boss' && Math.random() < 0.002 * wave) {
                    const dx = ship.x - e.x, dy = ship.y - e.y;
                    const d = Math.hypot(dx, dy);
                    const spd = 4 + wave * 0.3;
                    bullets.push({ x: e.x, y: e.y, vx: dx / d * spd, vy: dy / d * spd, r: 5, type: 'enemy', hue: e.type === 'tank' ? 30 : 0 });
                }

                if (e.y > H + 60) { enemies.splice(i, 1); continue; }

                // Hit ship
                const ds = Math.hypot(e.x - ship.x, e.y - ship.y);
                if (ds < ship.r + e.r && ship.invincible <= 0) {
                    shield -= e.type === 'boss' ? 20 : 10;
                    ship.invincible = 1.2;
                    spawnExplosion(ship.x, ship.y, '#f87171', false);
                    shake.x = 5; shake.y = 5; shake.t = 0.2;
                    vibrate?.([30, 15, 50]);
                    updateHUD();
                    if (shield <= 0) { running = false; setHighScore(score); spawnExplosion(ship.x, ship.y, '#f59e0b', true); setTimeout(() => showOverlay('dead'), 900); return; }
                }
            }

            // Enemy bullets hit ship
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                if (b.type !== 'enemy') continue;
                b.x += b.vx; b.y += b.vy;
                if (b.y > H + 20 || b.x < -20 || b.x > W + 20 || b.y < -20) { bullets.splice(i, 1); continue; }
                const ds = Math.hypot(b.x - ship.x, b.y - ship.y);
                if (ds < ship.r + b.r && ship.invincible <= 0) {
                    shield -= 8; ship.invincible = 0.8;
                    spawnExplosion(b.x, b.y, '#f87171', false);
                    bullets.splice(i, 1); updateHUD();
                    if (shield <= 0) { running = false; setHighScore(score); spawnExplosion(ship.x, ship.y, '#f59e0b', true); setTimeout(() => showOverlay('dead'), 900); return; }
                }
            }

            // Power-ups
            for (let i = powerDrops.length - 1; i >= 0; i--) {
                const pw = powerDrops[i];
                pw.y += pw.vy; pw.pulse += dt * 4;
                if (pw.y > H + 20) { powerDrops.splice(i, 1); continue; }
                const ds = Math.hypot(pw.x - ship.x, pw.y - ship.y);
                if (ds < ship.r + 14) {
                    if (pw.type === 'weapon') { weaponLevel = Math.min(4, weaponLevel + 1); spawnExplosion(ship.x, ship.y, '#60a5fa', false); }
                    else { shield = Math.min(100, shield + 25); }
                    updateHUD(); powerDrops.splice(i, 1);
                }
            }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt * 1.5;
                if (p.life <= 0) particles.splice(i, 1);
            }

            // Next wave
            if (!waveActive || (enemies.length === 0 && !bossAlive && waveTimer <= 0)) {
                waveTimer -= dt;
                if (waveTimer <= 0) { wave++; updateHUD(); spawnWave(); waveTimer = 3; }
            }
        }

        function drawShip(x, y) {
            const inv = ship.invincible > 0 && Math.floor(ship.invincible * 10) % 2 === 0;
            if (inv) return;
            ctx.save();
            ctx.translate(x, y);
            ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 20;

            // Engine glow
            ctx.fillStyle = `hsl(${200 + Math.sin(Date.now() * 0.01) * 20},100%,65%)`;
            ctx.beginPath();
            ctx.ellipse(0, 14, 6, 3 + Math.sin(Date.now() * 0.02) * 2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body
            const grad = ctx.createLinearGradient(-16, -20, 16, 20);
            grad.addColorStop(0, '#93c5fd'); grad.addColorStop(0.5, '#3b82f6'); grad.addColorStop(1, '#1e3a8a');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(0, -20); ctx.lineTo(16, 14); ctx.lineTo(8, 10); ctx.lineTo(0, 12);
            ctx.lineTo(-8, 10); ctx.lineTo(-16, 14); ctx.closePath(); ctx.fill();

            // Cockpit
            const cockpit = ctx.createRadialGradient(-2, -8, 1, 0, -6, 8);
            cockpit.addColorStop(0, '#bfdbfe'); cockpit.addColorStop(1, '#93c5fd');
            ctx.fillStyle = cockpit;
            ctx.beginPath(); ctx.ellipse(0, -6, 5, 7, 0, 0, Math.PI * 2); ctx.fill();

            // Wing details
            ctx.strokeStyle = 'rgba(147,197,253,0.4)'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(13, 12); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(-13, 12); ctx.stroke();
            ctx.restore();
        }

        function draw() {
            ctx.save();
            ctx.translate(Math.round(shake.x), Math.round(shake.y));

            ctx.fillStyle = '#000005'; ctx.fillRect(-10, -10, W + 20, H + 20);

            // Stars
            for (const s of STARS) {
                ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            }

            // Particles
            for (const p of particles) {
                ctx.save(); ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 8;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            // Ship trail
            for (let i = 0; i < ship.trail.length; i++) {
                const t = ship.trail[i];
                if (t.life <= 0) continue;
                const age = i / ship.trail.length;
                ctx.save(); ctx.globalAlpha = t.life * age * 0.4;
                ctx.fillStyle = '#60a5fa'; ctx.shadowColor = '#60a5fa'; ctx.shadowBlur = 6;
                ctx.beginPath(); ctx.arc(t.x, t.y, 6 * age, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }

            // Power drops
            for (const pw of powerDrops) {
                const pulse = Math.sin(pw.pulse) * 3;
                ctx.save();
                ctx.shadowColor = pw.type === 'weapon' ? '#60a5fa' : '#4ade80'; ctx.shadowBlur = 16;
                ctx.fillStyle = pw.type === 'weapon' ? '#60a5fa' : '#4ade80';
                ctx.beginPath(); ctx.arc(pw.x, pw.y, 10 + pulse, 0, Math.PI * 2); ctx.fill();
                ctx.font = '12px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
                ctx.fillText(pw.type === 'weapon' ? '⚡' : '❤️', pw.x, pw.y);
                ctx.restore();
            }

            // Enemies
            for (const e of enemies) {
                ctx.save();
                ctx.translate(e.x, e.y); ctx.rotate(e.angle);

                if (e.type === 'boss') {
                    // Boss - big menacing
                    ctx.shadowColor = '#c084fc'; ctx.shadowBlur = 30;
                    ctx.fillStyle = '#4c1d95';
                    ctx.beginPath();
                    for (let k = 0; k < 8; k++) {
                        const a = (k / 8) * Math.PI * 2, r = k % 2 === 0 ? e.r : e.r * 0.5;
                        k === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                    }
                    ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2; ctx.stroke();
                    // HP bar
                    ctx.rotate(-e.angle);
                    ctx.fillStyle = 'rgba(0,0,0,0.5)';
                    ctx.fillRect(-e.r, -e.r - 14, e.r * 2, 6);
                    ctx.fillStyle = '#c084fc';
                    ctx.fillRect(-e.r, -e.r - 14, e.r * 2 * (e.hp / e.maxHp), 6);
                } else {
                    const colors = { basic: '#f87171', tank: '#fbbf24', speeder: '#34d399', zigzag: '#f43f5e' };
                    const col = colors[e.type] ?? '#f87171';
                    ctx.shadowColor = col; ctx.shadowBlur = 12;
                    ctx.fillStyle = col;
                    if (e.type === 'tank') {
                        ctx.beginPath(); ctx.arc(0, 0, e.r, 0, Math.PI * 2); ctx.fill();
                        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                    } else {
                        ctx.beginPath();
                        ctx.moveTo(0, e.r); ctx.lineTo(e.r * 0.85, -e.r * 0.5); ctx.lineTo(-e.r * 0.85, -e.r * 0.5);
                        ctx.closePath(); ctx.fill();
                    }
                }
                ctx.restore();
            }

            // Bullets
            for (const b of bullets) {
                if (b.type === 'enemy') {
                    ctx.save();
                    ctx.shadowColor = `hsl(${b.hue ?? 0},90%,60%)`; ctx.shadowBlur = 10;
                    ctx.fillStyle = `hsl(${b.hue ?? 0},90%,60%)`;
                    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                } else if (b.type === 'laser') {
                    ctx.save(); ctx.globalAlpha = b.life;
                    ctx.strokeStyle = '#f0abfc'; ctx.shadowColor = '#f0abfc'; ctx.shadowBlur = 18; ctx.lineWidth = 4;
                    ctx.beginPath(); ctx.moveTo(b.x, b.y + 30); ctx.lineTo(b.x, b.y - 30); ctx.stroke();
                    ctx.restore();
                } else {
                    ctx.save();
                    ctx.shadowColor = '#7dd3fc'; ctx.shadowBlur = 12;
                    ctx.fillStyle = '#7dd3fc';
                    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                }
            }

            // Ship
            if (running) drawShip(ship.x, ship.y);

            ctx.restore();
        }

        function showOverlay(type) {
            overlay.style.display = 'flex';
            const best = getHighScore();
            if (type === 'start') {
                overlay.innerHTML = `
          <h2>🚀 Space Waves</h2>
          <p>Arrow keys / WASD to move. Auto-fire!<br>Collect ⚡ upgrades and ❤️ shield packs.<br>Boss every 5 waves!</p>
          <button class="sw-btn" id="sw-go">Launch</button>
        `;
            } else {
                overlay.innerHTML = `
          <h2>Ship Destroyed!</h2>
          <div class="sw-big">${score.toLocaleString()}</div>
          <p>Wave ${wave} · Best: ${best.toLocaleString()}</p>
          <button class="sw-btn" id="sw-go">Try Again</button>
        `;
            }
            document.getElementById('sw-go').addEventListener('click', () => {
                overlay.style.display = 'none'; resetGame(); running = true;
                if (!raf) raf = requestAnimationFrame(loop);
            });
        }

        // Controls
        const onKeyDown = e => { keys[e.key] = true; };
        const onKeyUp = e => { keys[e.key] = false; };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Touch move
        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            touchTarget = { x: (e.touches[0].clientX - rect.left) * W / rect.width, y: (e.touches[0].clientY - rect.top) * H / rect.height };
        }, { passive: false });
        canvas.addEventListener('touchend', () => { touchTarget = null; }, { passive: true });

        function handleTouch() {
            if (!touchTarget) return;
            const dx = touchTarget.x - ship.x, dy = touchTarget.y - ship.y;
            const d = Math.hypot(dx, dy);
            if (d > 5) { ship.vx += (dx / d) * 3; ship.vy += (dy / d) * 3; }
        }

        function loop(ts) {
            raf = requestAnimationFrame(loop);
            const dt = Math.min((ts - lastT) / 1000, 0.05); lastT = ts;
            handleTouch(); update(dt); draw();
        }

        showOverlay('start');
        raf = requestAnimationFrame(loop);

        window.currentGameCleanup = () => {
            cancelAnimationFrame(raf); raf = null;
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            styleEl.remove();
        };
    };
})();
