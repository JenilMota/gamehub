/* =============================================
   Memory Match — v3.0
   Card flip animation, combos, 3 difficulties
   ============================================= */
(function () {
    'use strict';

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore }) {
        const EMOJIS = ['🐶', '🐱', '🦊', '🐼', '🦁', '🐸', '🦋', '🦄', '🐉', '🎸', '🎮', '🌈', '⭐', '💎', '🔮', '🍕'];
        let cards = [], flipped = [], matched = [], score = 0, moves = 0, locked = false;
        let difficulty = 'easy'; // easy=12, med=16, hard=24

        const GRIDS = { easy: { n: 12, cols: 4 }, med: { n: 16, cols: 4 }, hard: { n: 24, cols: 6 } };

        const wrapper = document.createElement('div');
        wrapper.className = 'puzzle-wrapper';
        wrapper.style.cssText = 'max-width:400px;margin:0 auto;padding:10px;';
        container.appendChild(wrapper);

        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; }
            return arr;
        }

        function startGame(diff) {
            difficulty = diff;
            const { n, cols } = GRIDS[diff];
            const pairs = shuffle([...EMOJIS]).slice(0, n / 2);
            cards = shuffle([...pairs, ...pairs]).map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }));
            flipped = []; matched = []; score = 0; moves = 0; locked = false;
            scoreEl.textContent = '0'; highScoreEl.textContent = getHighScore();
            render();
        }

        function flip(id) {
            if (locked) return;
            const card = cards[id];
            if (card.flipped || card.matched) return;
            card.flipped = true; flipped.push(id); moves++;
            render();
            if (flipped.length === 2) {
                locked = true;
                const [a, b] = flipped;
                if (cards[a].emoji === cards[b].emoji) {
                    cards[a].matched = cards[b].matched = true;
                    matched.push(a, b);
                    score += Math.max(100 - moves * 2, 10);
                    scoreEl.textContent = score;
                    flipped = []; locked = false;
                    if (matched.length === cards.length) { setHighScore(score); highScoreEl.textContent = getHighScore(); setTimeout(winScreen, 300); }
                    render();
                } else {
                    setTimeout(() => {
                        cards[a].flipped = cards[b].flipped = false;
                        flipped = []; locked = false;
                        render();
                    }, 1000);
                }
            }
        }

        function winScreen() {
            const msg = document.createElement('div');
            msg.className = 'game-overlay'; msg.style.background = 'rgba(0,0,0,0.88)';
            msg.innerHTML = `<h2>🎉 Complete!</h2><p class="score-big" style="color:#4ade80;">${score}</p><p style="color:rgba(255,255,255,0.6);">In ${moves} moves</p><button class="btn-primary" id="mm-again">Play Again</button>`;
            wrapper.style.position = 'relative';
            const rel = wrapper.parentElement;
            rel.style.position = 'relative';
            rel.appendChild(msg);
            msg.querySelector('#mm-again').addEventListener('click', () => { msg.remove(); startGame(difficulty); });
        }

        function render() {
            const { cols } = GRIDS[difficulty];
            wrapper.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="display:flex;gap:8px;">
            ${['easy', 'med', 'hard'].map(d => `<button id="mm-${d}" style="padding:4px 10px;background:${d === difficulty ? 'linear-gradient(135deg,#5b7fff,#9b6dff)' : 'rgba(255,255,255,0.05)'};color:${d === difficulty ? '#fff' : 'rgba(255,255,255,0.5)'};border:1px solid ${d === difficulty ? 'transparent' : 'rgba(255,255,255,0.1)'};border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:600;">${d.charAt(0).toUpperCase() + d.slice(1)}</button>`).join('')}
          </div>
          <span style="font-size:0.78rem;color:rgba(255,255,255,0.4);">Moves: ${moves}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;">
          ${cards.map(c => `
            <button id="mc-${c.id}" style="
              aspect-ratio:1;border-radius:12px;font-size:1.5rem;border:none;cursor:pointer;
              background:${c.matched ? 'rgba(74,222,128,0.2)' : (c.flipped ? 'linear-gradient(135deg,rgba(91,127,255,0.4),rgba(155,109,255,0.4))' : 'rgba(255,255,255,0.07)')};
              box-shadow:${c.matched ? '0 0 12px #4ade8044' : 'none'};
              border:1px solid ${c.matched ? 'rgba(74,222,128,0.4)' : (c.flipped ? 'rgba(91,127,255,0.4)' : 'rgba(255,255,255,0.07)')};
              transition:all 0.2s;transform:${c.flipped || c.matched ? 'scale(1)' : 'scale(0.97)'};
            ">${c.flipped || c.matched ? c.emoji : '·'}</button>
          `).join('')}
        </div>
      `;
            ['easy', 'med', 'hard'].forEach(d => {
                document.getElementById(`mm-${d}`)?.addEventListener('click', () => startGame(d));
            });
            cards.forEach(c => {
                document.getElementById(`mc-${c.id}`)?.addEventListener('click', () => flip(c.id));
            });
        }

        startGame('easy');
        scoreEl.textContent = '0';

        window.currentGameCleanup = function () { window.initGame = null; };
    };
})();
