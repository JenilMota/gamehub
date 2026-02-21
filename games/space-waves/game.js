/* =============================================
   Space Waves — Boss Edition v3.0
   4 enemy types, boss every 5 waves, explosions
   Virtual joystick supported
   ============================================= */
(function () {
    'use strict';

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const bodyR = container.getBoundingClientRect();
        const CANVAS_W = isMobile ? Math.floor(bodyR.width) : Math.min(400, Math.floor(bodyR.width - 16));
        const CANVAS_H = isMobile ? Math.floor(window.innerHeight - 170) : Math.min(620, Math.floor(bodyR.height - 16));

        const wrapper = document.createElement('div');
        wrapper.className = 'game-canvas-wrapper';
        wrapper.style.position = 'relative';
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_W; canvas.height = CANVAS_H;
        canvas.style.cssText = `display:block;border-radius:${isMobile ? '0' : '18px'};touch-action:none;`;
        wrapper.appendChild(canvas); container.appendChild(wrapper);
        const ctx = canvas.getContext('2d');

        const SHIP_W = 28, SHIP_H = 32;
        const BULLET_SPD = 0.52, SHOOT_CD = 145;

        let ship, bullets, enemies, particles, powerups, stars, explosions;
        let score, wave, state, lastTime, shootTimer = 0, waveTimer = 0;
        let keys = {}, shieldActive = 0, rapidFire = 0;
        let bossActive = false, boss = null;

        function initStars() {
            stars = [];
            for (let i = 0; i < 70; i++) stars.push({
                x: Math.random() * CANVAS_W, y: Math.random() * CANVAS_H,
                spd: 0.02 + Math.random() * 0.07, r: 0.4 + Math.random() * 1.5,
                twinkle: Math.random() * Math.PI * 2,
            });
        }

        function reset() {
            ship = { x: CANVAS_W / 2, y: CANVAS_H - 65, w: SHIP_W, h: SHIP_H, trail: [] };
            bullets = []; enemies = []; particles = []; powerups = []; explosions = [];
            score = 0; wave = 0; shootTimer = 0; waveTimer = 0;
            shieldActive = 0; rapidFire = 0; bossActive = false; boss = null;
            scoreEl.textContent = '0'; highScoreEl.textContent = getHighScore();
            state = 'ready'; showOverlay('ready');
        }

        let overlayEl = null;
        function showOverlay(type) {
            removeOverlay();
            overlayEl = document.createElement('div');
            overlayEl.className = 'game-overlay';
            overlayEl.style.background = 'rgba(4,4,18,0.90)';
            if (type === 'ready') {
                overlayEl.innerHTML = `
          <h2 style="background:none;-webkit-text-fill-color:#5b7fff;">🚀 Space Waves</h2>
          <p style="color:rgba(255,255,255,0.6);">Move ship · Auto-shoot · Bosses every 5 waves!</p>
          <button class="btn-primary" id="sw-go">Launch</button>`;
            } else {
                const best = getHighScore(), isNew = score >= best && score > 0;
                overlayEl.innerHTML = `
          <h2 style="background:none;-webkit-text-fill-color:#fff;">Game Over</h2>
          <p class="score-big" style="color:#5b7fff;">${score}</p>
          <p style="color:${isNew ? '#ffd93d' : 'rgba(255,255,255,0.5)'};font-weight:700;">${isNew ? '🏆 New High Score!' : 'Best: ' + best}</p>
          <button class="btn-primary" id="sw-go">Try Again</button>`;
            }
            wrapper.appendChild(overlayEl);
            setTimeout(() => { document.getElementById('sw-go')?.addEventListener('click', startPlaying); }, 30);
        }
        function removeOverlay() { overlayEl?.remove(); overlayEl = null; }

        function startPlaying() {
            removeOverlay();
            ship = { x: CANVAS_W / 2, y: CANVAS_H - 65, w: SHIP_W, h: SHIP_H, trail: [] };
            bullets = []; enemies = []; particles = []; powerups = []; explosions = [];
            score = 0; wave = 0; shootTimer = 0; waveTimer = 0;
            shieldActive = 0; rapidFire = 0; bossActive = false; boss = null;
            scoreEl.textContent = '0'; state = 'playing'; lastTime = performance.now();
        }

        // Input
        function onKeyDown(e) {
            keys[e.code] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
            if ((e.code === 'Space' || e.code === 'Enter') && state === 'ready') startPlaying();
        }
        function onKeyUp(e) { keys[e.code] = false; }
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        // Touch drag directly on canvas (fallback if no vjoy)
        let touchActive = false, lastTouchX = 0, lastTouchY = 0;
        canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            if (state === 'ready') { startPlaying(); return; }
            touchActive = true;
            const r = canvas.getBoundingClientRect();
            lastTouchX = (e.touches[0].clientX - r.left) * (CANVAS_W / r.width);
            lastTouchY = (e.touches[0].clientY - r.top) * (CANVAS_H / r.height);
        }, { passive: false });
        canvas.addEventListener('touchmove', e => {
            e.preventDefault();
            if (!touchActive || state !== 'playing') return;
            const r = canvas.getBoundingClientRect();
            ship.x = (e.touches[0].clientX - r.left) * (CANVAS_W / r.width);
            ship.y = (e.touches[0].clientY - r.top) * (CANVAS_H / r.height);
            ship.x = Math.max(SHIP_W / 2, Math.min(CANVAS_W - SHIP_W / 2, ship.x));
            ship.y = Math.max(SHIP_H, Math.min(CANVAS_H - 20, ship.y));
        }, { passive: false });
        canvas.addEventListener('touchend', () => { touchActive = false; });
        canvas.addEventListener('click', () => { if (state === 'ready') startPlaying(); });

        function spawnExplosion(x, y, color, big = false) {
            const rings = big ? 3 : 1;
            for (let r = 0; r < rings; r++) {
                const count = big ? 16 : 8;
                for (let i = 0; i < count; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const spd = (big ? 0.08 : 0.05) + Math.random() * 0.12;
                    particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: big ? 500 : 300, max: big ? 500 : 300, r: big ? 4 : 2 + Math.random() * 3, hue: color });
                }
            }
            if (big) {
                explosions.push({ x, y, r: 0, maxR: 80, life: 1, color });
                vibrate(big ? [60, 30, 60] : 25);
            } else vibrate(15);
        }

        function spawnWave() {
            wave++;
            if (wave % 5 === 0) { spawnBoss(); return; }
            const count = Math.min(3 + wave, 14);
            for (let i = 0; i < count; i++) {
                const roll = Math.random();
                let type, hp, vy, vx, w;
                if (roll < 0.15 + wave * 0.01) { type = 'fast'; hp = 1; vy = 0.14; vx = (Math.random() - 0.5) * 0.08; w = 16; }
                else if (roll < 0.35 && wave > 3) { type = 'tank'; hp = 3; vy = 0.04 + wave * 0.003; vx = (Math.random() - 0.5) * 0.03; w = 26; }
                else { type = 'normal'; hp = wave > 4 ? 2 : 1; vy = 0.06 + wave * 0.004; vx = (Math.random() - 0.5) * 0.06; w = 22; }
                enemies.push({
                    x: 20 + Math.random() * (CANVAS_W - 40), y: -20 - i * 45,
                    w, h: w, vy, vx, hp, maxHp: hp, type, phase: Math.random() * Math.PI * 2,
                });
            }
            if (wave % 3 === 0) {
                powerups.push({ x: 30 + Math.random() * (CANVAS_W - 60), y: -20, type: Math.random() < 0.5 ? 'shield' : 'rapid', vy: 0.06 });
            }
        }

        function spawnBoss() {
            bossActive = true;
            boss = {
                x: CANVAS_W / 2, y: -60, targetY: 90, hp: 20 + wave * 3, maxHp: 20 + wave * 3,
                w: 70, h: 60, phase: 0, shootTimer: 0, vx: 0.08, bullets: [],
            };
        }

        function update(dt) {
            if (state !== 'playing') return;

            // Joystick (if available)
            const vj = window._vjoyState;
            if (vj?.active) {
                ship.x += vj.x * 0.28 * dt; ship.y += vj.y * 0.28 * dt;
                ship.x = Math.max(SHIP_W / 2, Math.min(CANVAS_W - SHIP_W / 2, ship.x));
                ship.y = Math.max(SHIP_H, Math.min(CANVAS_H - 20, ship.y));
            }

            // Keyboard movement
            const SPD = 0.26;
            if (keys['ArrowLeft'] || keys['KeyA']) ship.x = Math.max(SHIP_W / 2, ship.x - SPD * dt);
            if (keys['ArrowRight'] || keys['KeyD']) ship.x = Math.min(CANVAS_W - SHIP_W / 2, ship.x + SPD * dt);
            if (keys['ArrowUp'] || keys['KeyW']) ship.y = Math.max(SHIP_H, ship.y - SPD * dt);
            if (keys['ArrowDown'] || keys['KeyS']) ship.y = Math.min(CANVAS_H - 20, ship.y + SPD * dt);

            // Engine trail
            ship.trail.unshift({ x: ship.x, y: ship.y + SHIP_H / 2 });
            if (ship.trail.length > 10) ship.trail.pop();

            // Shoot
            shootTimer += dt;
            const cd = rapidFire > 0 ? SHOOT_CD / 3 : SHOOT_CD;
            if (shootTimer >= cd) {
                shootTimer = 0;
                bullets.push({ x: ship.x, y: ship.y - SHIP_H / 2, vy: -BULLET_SPD, hue: 185 });
                if (rapidFire > 0) {
                    bullets.push({ x: ship.x - 9, y: ship.y - SHIP_H / 2 + 6, vy: -BULLET_SPD, hue: 40 });
                    bullets.push({ x: ship.x + 9, y: ship.y - SHIP_H / 2 + 6, vy: -BULLET_SPD, hue: 40 });
                }
            }
            if (shieldActive > 0) shieldActive -= dt;
            if (rapidFire > 0) rapidFire -= dt;

            // Bullets
            for (let i = bullets.length - 1; i >= 0; i--) { bullets[i].y += bullets[i].vy * dt; if (bullets[i].y < -10) bullets.splice(i, 1); }

            // Boss
            if (bossActive && boss) {
                if (boss.y < boss.targetY) boss.y += 0.07 * dt;
                boss.x += boss.vx * dt;
                if (boss.x > CANVAS_W - boss.w / 2 || boss.x < boss.w / 2) boss.vx *= -1;
                boss.phase += 0.002 * dt;

                // Boss shoots
                boss.shootTimer += dt;
                if (boss.shootTimer > 800 - wave * 15) {
                    boss.shootTimer = 0;
                    for (let i = 0; i < 3; i++) {
                        const a = -Math.PI / 2 + (i - 1) * 0.35;
                        boss.bullets.push({ x: boss.x, y: boss.y + boss.h / 2, vx: Math.cos(a) * 0.2, vy: Math.sin(a) * 0.2 });
                    }
                }
                // Boss bullets
                for (let i = boss.bullets.length - 1; i >= 0; i--) {
                    boss.bullets[i].x += boss.bullets[i].vx * dt;
                    boss.bullets[i].y += boss.bullets[i].vy * dt;
                    if (boss.bullets[i].y > CANVAS_H + 10) { boss.bullets.splice(i, 1); continue; }
                    // Hit ship
                    if (Math.abs(boss.bullets[i].x - ship.x) < SHIP_W && Math.abs(boss.bullets[i].y - ship.y) < SHIP_H) {
                        if (shieldActive > 0) { boss.bullets.splice(i, 1); shieldActive = 0; }
                        else { die(); return; }
                    }
                }
                // Player bullets hit boss
                for (let i = bullets.length - 1; i >= 0; i--) {
                    if (Math.abs(bullets[i].x - boss.x) < boss.w / 2 && Math.abs(bullets[i].y - boss.y) < boss.h / 2) {
                        bullets.splice(i, 1); boss.hp--;
                        if (boss.hp <= 0) {
                            spawnExplosion(boss.x, boss.y, 45, true);
                            score += Math.floor(50 + wave * 15); scoreEl.textContent = score;
                            boss = null; bossActive = false;
                            waveTimer = 0;
                        }
                    }
                }
                // Boss collision with ship
                if (boss && Math.abs(boss.x - ship.x) < (boss.w / 2 + SHIP_W / 2) && Math.abs(boss.y - ship.y) < (boss.h / 2 + SHIP_H / 2)) {
                    if (shieldActive > 0) { shieldActive = 0; } else { die(); return; }
                }
            }

            // Enemies
            for (let i = enemies.length - 1; i >= 0; i--) {
                const e = enemies[i];
                e.y += e.vy * dt;
                e.x += Math.sin(e.phase += 0.003 * dt) * e.vx * dt * 10;
                if (e.y > CANVAS_H + 20) { enemies.splice(i, 1); continue; }
                // Bullet hits enemy
                for (let j = bullets.length - 1; j >= 0; j--) {
                    if (Math.abs(bullets[j].x - e.x) < e.w && Math.abs(bullets[j].y - e.y) < e.h) {
                        bullets.splice(j, 1); e.hp--;
                        if (e.hp <= 0) {
                            const pts = e.type === 'fast' ? 15 : e.type === 'tank' ? 25 : 10;
                            score += pts; scoreEl.textContent = score;
                            spawnExplosion(e.x, e.y, e.type === 'fast' ? 0 : e.type === 'tank' ? 280 : 280);
                            enemies.splice(i, 1);
                        }
                        break;
                    }
                }
                // Hit ship
                if (i < enemies.length && Math.abs(enemies[i].x - ship.x) < (SHIP_W + enemies[i].w) / 2 && Math.abs(enemies[i].y - ship.y) < (SHIP_H + enemies[i].h) / 2) {
                    if (shieldActive > 0) { enemies.splice(i, 1); shieldActive = 0; }
                    else { die(); return; }
                }
            }

            // Power-ups
            for (let i = powerups.length - 1; i >= 0; i--) {
                powerups[i].y += powerups[i].vy * dt;
                if (powerups[i].y > CANVAS_H + 20) { powerups.splice(i, 1); continue; }
                if (Math.abs(powerups[i].x - ship.x) < 28 && Math.abs(powerups[i].y - ship.y) < 28) {
                    if (powerups[i].type === 'shield') shieldActive = 6000;
                    else rapidFire = 5000;
                    score += 20; scoreEl.textContent = score;
                    spawnExplosion(powerups[i].x, powerups[i].y, powerups[i].type === 'shield' ? 185 : 40);
                    powerups.splice(i, 1);
                }
            }

            // Wave spawn
            if (!bossActive && enemies.length === 0) {
                waveTimer += dt;
                if (waveTimer > 1200) { waveTimer = 0; spawnWave(); }
            }

            // Stars
            for (const s of stars) {
                s.y += s.spd * dt; s.twinkle += 0.02;
                if (s.y > CANVAS_H) s.y = 0;
            }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
                if (p.life <= 0) particles.splice(i, 1);
            }

            // Explosion rings
            for (let i = explosions.length - 1; i >= 0; i--) {
                explosions[i].r += 1.8 * dt * 0.1; explosions[i].life -= 0.04;
                if (explosions[i].life <= 0) explosions.splice(i, 1);
            }
        }

        function die() {
            state = 'dead'; setHighScore(score); highScoreEl.textContent = getHighScore();
            spawnExplosion(ship.x, ship.y, 210, true);
            vibrate([80, 40, 80]);
            setTimeout(() => showOverlay('dead'), 700);
        }

        function draw() {
            ctx.fillStyle = '#050718'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            // Stars
            for (const s of stars) {
                const a = 0.25 + Math.sin(s.twinkle) * 0.20;
                ctx.fillStyle = `rgba(180,190,255,${a})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            }

            // Engine trail
            for (let i = 0; i < ship.trail.length; i++) {
                const a = (1 - i / ship.trail.length) * 0.5;
                ctx.fillStyle = `rgba(91,240,255,${a})`;
                ctx.beginPath(); ctx.arc(ship.trail[i].x, ship.trail[i].y, 5 * (1 - i / ship.trail.length), 0, Math.PI * 2); ctx.fill();
            }

            // Explosion rings
            for (const ex of explosions) {
                ctx.strokeStyle = `hsla(${ex.color},80%,60%,${ex.life * 0.7})`;
                ctx.lineWidth = 3 * ex.life;
                ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI * 2); ctx.stroke();
            }

            // Enemies
            for (const e of enemies) {
                ctx.save(); ctx.translate(e.x, e.y);
                if (e.type === 'fast') {
                    ctx.fillStyle = '#f87171'; ctx.shadowColor = '#f87171'; ctx.shadowBlur = 10;
                    ctx.beginPath(); ctx.moveTo(0, -e.h / 2); ctx.lineTo(e.w / 2, e.h / 2); ctx.lineTo(-e.w / 2, e.h / 2); ctx.closePath(); ctx.fill();
                } else if (e.type === 'tank') {
                    ctx.fillStyle = '#a855f7'; ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 12;
                    ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
                    // Health bar
                    const hpPct = e.hp / e.maxHp;
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-e.w / 2, e.h / 2 + 4, e.w, 4);
                    ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : '#f87171'; ctx.fillRect(-e.w / 2, e.h / 2 + 4, e.w * hpPct, 4);
                } else {
                    ctx.fillStyle = '#9b6dff'; ctx.shadowColor = '#9b6dff'; ctx.shadowBlur = 10;
                    ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h);
                    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-e.w / 2, -e.h / 2, e.w, e.h / 3);
                }
                ctx.shadowBlur = 0; ctx.restore();
            }

            // Boss
            if (boss) {
                ctx.save(); ctx.translate(boss.x, boss.y);
                const pulse = 1 + Math.sin(boss.phase) * 0.06;
                ctx.scale(pulse, pulse);
                ctx.fillStyle = '#ec4899'; ctx.shadowColor = '#ec4899'; ctx.shadowBlur = 20;
                // Hex shape
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
                    if (i === 0) ctx.moveTo(Math.cos(a) * 35, Math.sin(a) * 35);
                    else ctx.lineTo(Math.cos(a) * 35, Math.sin(a) * 35);
                }
                ctx.closePath(); ctx.fill();
                ctx.shadowBlur = 0;
                // Health bar
                const hpPct = boss.hp / boss.maxHp;
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-40, 46, 80, 6);
                ctx.fillStyle = hpPct > 0.5 ? '#4ade80' : hpPct > 0.25 ? '#f59e42' : '#f87171';
                ctx.fillRect(-40, 46, 80 * hpPct, 6);
                ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 6;
                ctx.font = 'bold 11px Inter'; ctx.textAlign = 'center';
                ctx.fillText('BOSS', 0, -45);
                ctx.shadowBlur = 0;
                // Boss bullets
                ctx.restore();
                for (const bb of boss.bullets) {
                    ctx.fillStyle = '#f87171'; ctx.shadowColor = '#f87171'; ctx.shadowBlur = 6;
                    ctx.beginPath(); ctx.arc(bb.x, bb.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                }
            }

            // Player bullets
            ctx.shadowColor = '#5bf0ff'; ctx.shadowBlur = 8;
            for (const b of bullets) {
                const hsl = `hsl(${b.hue || 185},100%,65%)`;
                ctx.fillStyle = hsl;
                ctx.fillRect(b.x - 2, b.y - 7, 4, 14);
            }
            ctx.shadowBlur = 0;

            // Power-ups
            for (const p of powerups) {
                const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.12;
                ctx.save(); ctx.translate(p.x, p.y); ctx.scale(pulse, pulse);
                ctx.fillStyle = p.type === 'shield' ? '#38d9c0' : '#f59e42';
                ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14;
                ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                ctx.font = '900 12px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff'; ctx.fillText(p.type === 'shield' ? '🛡' : '⚡', 0, 1);
                ctx.restore();
            }

            // Ship
            if (state === 'playing' || state === 'ready') {
                ctx.save(); ctx.translate(ship.x, ship.y);
                // Engine glow
                const eg = ctx.createRadialGradient(0, SHIP_H / 2 + 5, 0, 0, SHIP_H / 2 + 5, 16);
                eg.addColorStop(0, 'rgba(91,240,255,0.5)'); eg.addColorStop(1, 'rgba(91,240,255,0)');
                ctx.fillStyle = eg; ctx.fillRect(-16, SHIP_H / 2 - 6, 32, 28);
                // Body
                ctx.fillStyle = '#c8d6e5'; ctx.shadowColor = '#5bf0ff'; ctx.shadowBlur = 12;
                ctx.beginPath();
                ctx.moveTo(0, -SHIP_H / 2); ctx.lineTo(SHIP_W / 2, SHIP_H / 2);
                ctx.lineTo(0, SHIP_H / 2 - 8); ctx.lineTo(-SHIP_W / 2, SHIP_H / 2); ctx.closePath(); ctx.fill();
                ctx.shadowBlur = 0;
                // Cockpit
                ctx.fillStyle = '#5bf0ff'; ctx.shadowColor = '#5bf0ff'; ctx.shadowBlur = 6;
                ctx.beginPath(); ctx.arc(0, -4, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
                // Wings accent
                ctx.fillStyle = 'rgba(91,127,255,0.4)';
                ctx.fillRect(-SHIP_W / 2, SHIP_H / 4, 8, 8); ctx.fillRect(SHIP_W / 2 - 8, SHIP_H / 4, 8, 8);
                // Shield
                if (shieldActive > 0) {
                    const t = performance.now() * 0.006;
                    ctx.strokeStyle = `rgba(91,240,255,${0.35 + Math.sin(t) * 0.12})`;
                    ctx.lineWidth = 2; ctx.shadowColor = '#5bf0ff'; ctx.shadowBlur = 8;
                    ctx.beginPath(); ctx.arc(0, 0, SHIP_W + 4, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
                }
                ctx.restore();
            }

            // Particles
            for (const p of particles) {
                const a = p.life / p.max;
                ctx.fillStyle = `hsla(${p.hue},75%,60%,${a})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); ctx.fill();
            }

            // HUD
            if (state === 'playing') {
                ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = '600 12px Inter,sans-serif'; ctx.textAlign = 'left';
                ctx.fillText(`Wave ${wave}`, 10, 20);
                if (rapidFire > 0) { ctx.fillStyle = '#f59e42'; ctx.fillText('⚡ RAPID', 10, 36); }
                if (shieldActive > 0) { ctx.fillStyle = '#38d9c0'; ctx.fillText('🛡 SHIELD', 10, rapidFire > 0 ? 52 : 36); }
                if (bossActive && boss) { ctx.fillStyle = '#ec4899'; ctx.textAlign = 'center'; ctx.font = '700 13px Inter'; ctx.fillText('⚠️ BOSS WAVE', CANVAS_W / 2, 20); }
            }
        }

        let animId;
        function loop(now) {
            const dt = Math.min(now - lastTime, 33); lastTime = now;
            update(dt); draw(); animId = requestAnimationFrame(loop);
        }

        initStars(); reset(); lastTime = performance.now(); loop(lastTime);

        window.currentGameCleanup = function () {
            cancelAnimationFrame(animId);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            window.initGame = null;
        };
    };
})();
