/* =============================================
   Color Flow — v3.0
   Tap matching colors, combos, 3 modes
   ============================================= */
(function () {
    'use strict';

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore }) {
        const wrapper = document.createElement('div');
        wrapper.className = 'puzzle-wrapper';
        wrapper.style.cssText = 'max-width:340px;margin:0 auto;padding:12px;';
        container.appendChild(wrapper);

        const COLORS = ['#f87171', '#fbbf24', '#4ade80', '#38d9c0', '#5b7fff', '#f472b6', '#a855f7'];
        let queue = [], score = 0, combo = 0, lives = 3, timer = 0, speed = 2800, state = 'ready';
        let timerId = null;

        function reset() {
            queue = []; score = 0; combo = 0; lives = 3; speed = 2800;
            scoreEl.textContent = '0'; highScoreEl.textContent = getHighScore();
            render(); startGame();
        }

        function startGame() {
            state = 'playing';
            addItem(); addItem();
            timerId = setInterval(tick, 16);
        }

        function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

        function addItem() {
            queue.push({ color: randomColor(), life: speed, max: speed });
            render();
        }

        let animId;
        function tick() {
            if (state !== 'playing') return;
            for (let i = queue.length - 1; i >= 0; i--) {
                queue[i].life -= 16;
                if (queue[i].life <= 0) {
                    queue.splice(i, 1);
                    lives--; combo = 0;
                    if (lives <= 0) { clearInterval(timerId); state = 'dead'; setHighScore(score); highScoreEl.textContent = getHighScore(); render(); return; }
                }
            }
            if (queue.length < 3 && Math.random() < 0.015) addItem();
            render();
        }

        function tap(color) {
            if (state !== 'playing') return;
            let found = false;
            for (let i = 0; i < queue.length; i++) {
                if (queue[i].color === color) { queue.splice(i, 1); found = true; break; }
            }
            if (found) { combo++; score += combo * 10; scoreEl.textContent = score; speed = Math.max(1200, speed - 15); }
            else { combo = 0; lives = Math.max(0, lives - 1); if (lives <= 0) { clearInterval(timerId); state = 'dead'; setHighScore(score); highScoreEl.textContent = getHighScore(); } }
            render();
        }

        function render() {
            wrapper.innerHTML = `
        <div style="text-align:center;margin-bottom:10px;">
          <span style="font-size:1.3rem;font-weight:700;color:rgba(255,255,255,0.8);">${'❤️'.repeat(lives)}</span>
          <span style="color:rgba(255,255,255,0.3);margin:0 8px;">·</span>
          <span style="font-size:0.85rem;color:rgba(255,255,255,0.5);">Combo ×${combo}</span>
        </div>
        <div style="background:rgba(255,255,255,0.04);border-radius:16px;padding:14px;min-height:90px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;">
          ${queue.map((q, i) => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
              <div style="width:38px;height:38px;border-radius:50%;background:${q.color};box-shadow:0 0 14px ${q.color};"></div>
              <div style="width:36px;height:4px;background:rgba(255,255,255,0.1);border-radius:2px;">
                <div style="width:${Math.max(0, (q.life / q.max) * 100)}%;height:4px;background:${q.color};border-radius:2px;transition:width 0.1s linear;"></div>
              </div>
            </div>`).join('')}
          ${queue.length === 0 ? '<p style="color:rgba(255,255,255,0.3);font-size:0.8rem;">Tap a color below!</p>' : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:12px;">
          ${COLORS.map(c => `
            <button class="cf-btn" style="width:100%;aspect-ratio:1;border-radius:14px;background:${c};border:none;cursor:pointer;box-shadow:0 0 12px ${c}44;transition:transform 0.1s,box-shadow 0.15s;" data-color="${c}"></button>
          `).join('')}
        </div>
        ${state === 'dead' ? `
          <div style="text-align:center;padding:16px;">
            <h3 style="color:#fff;margin:0 0 6px;">Game Over — ${score} pts</h3>
            <button class="btn-primary" id="cf-restart">Play Again</button>
          </div>` : ''}
        ${state === 'ready' ? `<div style="text-align:center;"><button class="btn-primary" id="cf-start">Start</button></div>` : ''}
      `;
            wrapper.querySelectorAll('.cf-btn').forEach(btn => {
                btn.addEventListener('click', () => tap(btn.dataset.color));
                btn.addEventListener('touchstart', e => { e.preventDefault(); tap(btn.dataset.color); }, { passive: false });
            });
            document.getElementById('cf-restart')?.addEventListener('click', () => { clearInterval(timerId); reset(); });
            document.getElementById('cf-start')?.addEventListener('click', () => { state = 'ready'; reset(); });
        }

        render();
        reset();

        window.currentGameCleanup = function () {
            clearInterval(timerId);
            cancelAnimationFrame(animId);
            window.initGame = null;
        };
    };
})();
