/* =============================================
   Asteroids — v3.0
   Smooth rotation, screen wrap, power-ups
   Virtual joystick supported
   ============================================= */
(function () {
    'use strict';

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
        const bodyR = container.getBoundingClientRect();
        const W = isMobile ? Math.floor(bodyR.width) : Math.min(420, Math.floor(bodyR.width - 16));
        const H = isMobile ? Math.floor(window.innerHeight - 170) : Math.min(580, Math.floor(bodyR.height - 16));

        const wrapper = document.createElement('div');
        wrapper.className = 'game-canvas-wrapper';
        wrapper.style.position = 'relative';
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        canvas.style.cssText = `display:block;border-radius:${isMobile ? '0' : '18px'};touch-action:none;`;
        wrapper.appendChild(canvas); container.appendChild(wrapper);
        const ctx = canvas.getContext('2d');

        const SHIP_ACCEL = 0.00025, FRICTION = 0.988, TURN_SPEED = 0.0038, SHOOT_CD = 220;
        const MAX_SPEED = 0.38;

        let ship, asteroids, bullets, particles, stars, score, level, state, lastTime;
        let keys = {}, shootTimer = 0, respawnTimer = 0, shieldTimer = 0;

        function makeStars() {
            stars = [];
            for (let i = 0; i < 80; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: 0.3 + Math.random() * 1.2, phase: Math.random() * Math.PI * 2 });
        }

        function makeShip() {
            return { x: W / 2, y: H / 2, vx: 0, vy: 0, angle: -Math.PI / 2, dead: false, invincible: 3000, thrustTrail: [] };
        }

        function makeAsteroid(x, y, size) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 0.04 + Math.random() * 0.06 + level * 0.008;
            const verts = 7 + Math.floor(Math.random() * 5);
            const shape = [];
            for (let i = 0; i < verts; i++) {
                const a = (i / verts) * Math.PI * 2;
                const r = size * (0.7 + Math.random() * 0.45);
                shape.push({ a, r });
            }
            return { x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, size, rot: 0, rotSpd: (Math.random() - 0.5) * 0.003, shape };
        }

        function spawnLevel() {
            const count = 4 + level;
            asteroids = [];
            for (let i = 0; i < count; i++) {
                let x, y;
                do { x = Math.random() * W; y = Math.random() * H; }
                while (Math.hypot(x - ship.x, y - ship.y) < 90);
                asteroids.push(makeAsteroid(x, y, 28 + Math.random() * 14));
            }
        }

        function reset() {
            ship = makeShip(); level = 1; score = 0; shootTimer = 0; shieldTimer = 0;
            bullets = []; particles = [];
            makeStars(); spawnLevel();
            scoreEl.textContent = '0'; highScoreEl.textContent = getHighScore();
            state = 'ready'; showOverlay('ready');
        }

        let overlayEl = null;
        function showOverlay(type) {
            removeOverlay();
            overlayEl = document.createElement('div');
            overlayEl.className = 'game-overlay';
            overlayEl.style.background = 'rgba(2,4,14,0.90)';
            if (type === 'ready') {
                overlayEl.innerHTML = `<h2 style="background:none;-webkit-text-fill-color:#22d3ee;">☄️ Asteroids</h2>
          <p style="color:rgba(255,255,255,0.6);">Rotate → Thrust → Shoot<br>Use vjoy on mobile</p>
          <button class="btn-primary" id="at-go" style="background:linear-gradient(135deg,#22d3ee,#5b7fff);">Launch</button>`;
            } else if (type === 'level') {
                overlayEl.innerHTML = `<h2 style="background:none;-webkit-text-fill-color:#22d3ee;">Level ${level}</h2>
          <p>Cleared! Next wave incoming…</p>
          <button class="btn-primary" id="at-go" style="background:linear-gradient(135deg,#22d3ee,#5b7fff);">Continue</button>`;
            } else {
                const best = getHighScore(), isNew = score >= best && score > 0;
                overlayEl.innerHTML = `<h2 style="background:none;-webkit-text-fill-color:#fff;">Destroyed</h2>
          <p class="score-big" style="color:#22d3ee;">${score}</p>
          <p style="color:${isNew ? '#ffd93d' : 'rgba(255,255,255,0.5)'};font-weight:700;">${isNew ? '🏆 New High Score!' : 'Best: ' + best}</p>
          <button class="btn-primary" id="at-go" style="background:linear-gradient(135deg,#22d3ee,#5b7fff);">Retry</button>`;
            }
            wrapper.appendChild(overlayEl);
            setTimeout(() => {
                document.getElementById('at-go')?.addEventListener('click', () => {
                    removeOverlay();
                    if (type === 'dead') { score = 0; level = 1; ship = makeShip(); bullets = []; particles = []; spawnLevel(); state = 'playing'; lastTime = performance.now(); }
                    else if (type === 'level') { ship.vx = 0; ship.vy = 0; ship.invincible = 2000; spawnLevel(); state = 'playing'; lastTime = performance.now(); }
                    else { state = 'playing'; lastTime = performance.now(); }
                });
            }, 30);
        }
        function removeOverlay() { overlayEl?.remove(); overlayEl = null; }

        // Input
        function onKeyDown(e) {
            keys[e.code] = true;
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
            if ((e.code === 'Space' || e.code === 'Enter') && state === 'ready') { removeOverlay(); state = 'playing'; lastTime = performance.now(); }
        }
        function onKeyUp(e) { keys[e.code] = false; }
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        canvas.addEventListener('click', () => { if (state === 'ready') { removeOverlay(); state = 'playing'; lastTime = performance.now(); } });

        function spawnParticles(x, y, n = 8, color = '#22d3ee', big = false) {
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;
                const spd = big ? 0.05 + Math.random() * 0.12 : 0.03 + Math.random() * 0.08;
                particles.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, life: big ? 600 : 350, max: big ? 600 : 350, r: big ? 4 : 2, color });
            }
        }

        function update(dt) {
            for (const s of stars) { s.phase += 0.008; }
            if (state !== 'playing') return;

            // Joystick
            const vj = window._vjoyState;
            if (vj?.active) {
                ship.angle += vj.x * 0.005 * dt;
                if (Math.abs(vj.y) > 0.3) {
                    ship.vx += Math.cos(ship.angle) * SHIP_ACCEL * dt * (vj.y < 0 ? 1 : -0.5);
                    ship.vy += Math.sin(ship.angle) * SHIP_ACCEL * dt * (vj.y < 0 ? 1 : -0.5);
                }
            }

            // Keys
            if (keys['ArrowLeft'] || keys['KeyA']) ship.angle -= TURN_SPEED * dt;
            if (keys['ArrowRight'] || keys['KeyD']) ship.angle += TURN_SPEED * dt;
            if (keys['ArrowUp'] || keys['KeyW']) {
                ship.vx += Math.cos(ship.angle) * SHIP_ACCEL * dt;
                ship.vy += Math.sin(ship.angle) * SHIP_ACCEL * dt;
                ship.thrustTrail.unshift({ x: ship.x, y: ship.y, life: 1 });
            }
            if (keys['ArrowDown'] || keys['KeyS']) { // Brake
                ship.vx *= 0.97; ship.vy *= 0.97;
            }

            // Speed cap
            const spd = Math.hypot(ship.vx, ship.vy);
            if (spd > MAX_SPEED) { ship.vx = ship.vx / spd * MAX_SPEED; ship.vy = ship.vy / spd * MAX_SPEED; }

            ship.vx *= FRICTION; ship.vy *= FRICTION;
            ship.x = (ship.x + ship.vx * dt + W) % W;
            ship.y = (ship.y + ship.vy * dt + H) % H;

            // Thrust trail
            if (ship.thrustTrail.length > 6) ship.thrustTrail.pop();
            for (const t of ship.thrustTrail) t.life -= 0.08;
            ship.thrustTrail = ship.thrustTrail.filter(t => t.life > 0);

            // Shoot
            if (shieldTimer > 0) shieldTimer -= dt;
            if (ship.invincible > 0) ship.invincible -= dt;
            shootTimer += dt;
            if ((keys['Space'] || (vj?.active && false)) && shootTimer >= SHOOT_CD) {
                shootTimer = 0;
                bullets.push({ x: ship.x + Math.cos(ship.angle) * 18, y: ship.y + Math.sin(ship.angle) * 18, vx: Math.cos(ship.angle) * 0.55, vy: Math.sin(ship.angle) * 0.55, life: 900 });
                vibrate(5);
            }

            // Bullets
            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].x = (bullets[i].x + bullets[i].vx * dt + W) % W;
                bullets[i].y = (bullets[i].y + bullets[i].vy * dt + H) % H;
                bullets[i].life -= dt;
                if (bullets[i].life <= 0) { bullets.splice(i, 1); continue; }
                // Bullet vs asteroid
                let hit = false;
                for (let j = asteroids.length - 1; j >= 0; j--) {
                    const a = asteroids[j], d = Math.hypot(bullets[i].x - a.x, bullets[i].y - a.y);
                    if (d < a.size) {
                        bullets.splice(i, 1); hit = true;
                        const pts = a.size > 30 ? 20 : a.size > 18 ? 50 : 100;
                        score += pts; scoreEl.textContent = score;
                        spawnParticles(a.x, a.y, 6, '#22d3ee');
                        if (a.size > 16) {
                            asteroids.push(makeAsteroid(a.x + 10, a.y, a.size * 0.55));
                            asteroids.push(makeAsteroid(a.x - 10, a.y, a.size * 0.55));
                        }
                        asteroids.splice(j, 1);
                        vibrate(a.size > 30 ? 25 : 10);
                        break;
                    }
                }
                if (hit) continue;
            }

            // Asteroids
            for (const a of asteroids) {
                a.x = (a.x + a.vx * dt + W) % W;
                a.y = (a.y + a.vy * dt + H) % H;
                a.rot += a.rotSpd * dt;
                // Collision with ship
                if (ship.invincible <= 0 && Math.hypot(a.x - ship.x, a.y - ship.y) < a.size + 10) {
                    die(); return;
                }
            }

            // Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
                if (p.life <= 0) particles.splice(i, 1);
            }

            // Level clear
            if (asteroids.length === 0) {
                level++; setHighScore(score);
                state = 'levelup'; setTimeout(() => showOverlay('level'), 400);
            }
        }

        function die() {
            state = 'dead'; setHighScore(score); highScoreEl.textContent = getHighScore();
            spawnParticles(ship.x, ship.y, 16, '#22d3ee', true);
            vibrate([60, 30, 80]);
            setTimeout(() => showOverlay('dead'), 800);
        }

        function draw() {
            ctx.fillStyle = '#020414'; ctx.fillRect(0, 0, W, H);
            // Stars
            for (const s of stars) {
                const a = 0.15 + Math.sin(s.phase) * 0.12;
                ctx.fillStyle = `rgba(180,195,255,${a})`;
                ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
            }

            // Asteroids
            for (const a of asteroids) {
                ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
                ctx.fillStyle = 'rgba(100,110,140,0.7)';
                ctx.strokeStyle = '#6272a4'; ctx.lineWidth = 1.5;
                ctx.shadowColor = '#6272a4'; ctx.shadowBlur = 6;
                ctx.beginPath();
                for (let i = 0; i < a.shape.length; i++) {
                    const v = a.shape[i];
                    if (i === 0) ctx.moveTo(Math.cos(v.a) * v.r, Math.sin(v.a) * v.r);
                    else ctx.lineTo(Math.cos(v.a) * v.r, Math.sin(v.a) * v.r);
                }
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.shadowBlur = 0; ctx.restore();
            }

            // Bullets
            ctx.shadowColor = '#5bf0ff'; ctx.shadowBlur = 10;
            for (const b of bullets) {
                ctx.fillStyle = '#5bf0ff';
                ctx.beginPath(); ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2); ctx.fill();
            }
            ctx.shadowBlur = 0;

            // Particles
            for (const p of particles) {
                const a = p.life / p.max;
                ctx.fillStyle = `rgba(34,211,238,${a})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a, 0, Math.PI * 2); ctx.fill();
            }

            // Thrust trail
            for (let i = 0; i < ship.thrustTrail.length; i++) {
                const t = ship.thrustTrail[i];
                ctx.fillStyle = `rgba(91,240,255,${t.life * 0.4})`;
                ctx.beginPath(); ctx.arc(t.x, t.y, 5 * t.life, 0, Math.PI * 2); ctx.fill();
            }

            // Ship
            if (state === 'playing' && (ship.invincible <= 0 || Math.floor(ship.invincible / 80) % 2 === 0)) {
                ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.angle);
                ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 16;
                ctx.fillStyle = '#c8d6e5';
                ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-12, 11); ctx.lineTo(-7, 0); ctx.lineTo(-12, -11); ctx.closePath(); ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#22d3ee';
                ctx.beginPath(); ctx.arc(-2, 0, 5, 0, Math.PI * 2); ctx.fill();
                if (shieldTimer > 0) {
                    ctx.strokeStyle = `rgba(34,211,238,${0.4 + Math.sin(performance.now() * 0.01) * 0.15})`;
                    ctx.lineWidth = 2.5; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 8;
                    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
                    ctx.shadowBlur = 0;
                }
                ctx.restore();
            }

            // HUD
            ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = '600 12px Inter'; ctx.textAlign = 'left';
            ctx.fillText(`Level ${level}`, 10, 22);
        }

        let animId;
        function loop(now) {
            const dt = Math.min(now - lastTime, 33); lastTime = now;
            update(dt); draw(); animId = requestAnimationFrame(loop);
        }

        makeStars(); reset(); lastTime = performance.now(); loop(lastTime);

        window.currentGameCleanup = function () {
            cancelAnimationFrame(animId);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
            window.initGame = null;
        };
    };
})();
