/* =============================================
   MEMORY MATCH — Neon Flip v4.0
   3D card flip CSS, neon glows, combo system,
   timer, 3 difficulty modes, perfect score
   ============================================= */
(function () {
    'use strict';

    const CSS = `
    #mm-wrap{
      width:100%;height:100%;position:relative;background:#060914;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      padding:12px;box-sizing:border-box;overflow:hidden;
      font-family:Inter,sans-serif;
    }
    #mm-topbar{
      display:flex;align-items:center;justify-content:space-between;
      width:100%;max-width:560px;margin-bottom:12px;
    }
    .mm-diff-btn{
      padding:6px 14px;border-radius:999px;border:1.5px solid rgba(255,255,255,0.12);
      background:transparent;cursor:pointer;color:rgba(255,255,255,0.4);
      font-family:Inter,sans-serif;font-weight:700;font-size:0.75rem;transition:all 0.2s;
    }
    .mm-diff-btn.active{
      background:linear-gradient(135deg,#818cf8,#c084fc);border-color:transparent;
      color:#fff;box-shadow:0 2px 14px rgba(129,140,248,0.4);
    }
    #mm-stats{display:flex;gap:16px;font-size:0.8rem;font-weight:600;color:rgba(255,255,255,0.35);}
    #mm-timer{color:#f87171;font-weight:900;}
    #mm-combo-flash{
      position:absolute;top:60px;left:50%;transform:translateX(-50%);
      font-weight:900;font-size:1.3rem;color:#fbbf24;text-shadow:0 0 12px #fbbf24;
      pointer-events:none;opacity:0;transition:opacity 0.5s;z-index:20;
    }
    #mm-grid{
      display:grid;gap:8px;width:100%;max-width:560px;
    }
    .mm-card{
      aspect-ratio:1;cursor:pointer;perspective:600px;
    }
    .mm-card-inner{
      width:100%;height:100%;position:relative;transform-style:preserve-3d;
      transition:transform 0.4s cubic-bezier(0.4,0,0.2,1);border-radius:12px;
    }
    .mm-card.flipped .mm-card-inner,.mm-card.matched .mm-card-inner{
      transform:rotateY(180deg);
    }
    .mm-card-front,.mm-card-back{
      position:absolute;inset:0;border-radius:12px;backface-visibility:hidden;
      display:flex;align-items:center;justify-content:center;font-size:1.8rem;
    }
    .mm-card-front{
      background:linear-gradient(135deg,rgba(30,30,60,0.8),rgba(15,15,40,0.9));
      border:1.5px solid rgba(255,255,255,0.07);
      box-shadow:0 2px 12px rgba(0,0,0,0.5);
    }
    .mm-card-front::after{
      content:'';position:absolute;inset:0;border-radius:12px;
      background:linear-gradient(135deg,rgba(129,140,248,0.05),transparent);
    }
    .mm-card-back{
      background:linear-gradient(135deg,rgba(30,40,80,0.95),rgba(20,25,60,0.95));
      border:1.5px solid rgba(129,140,248,0.25);
      transform:rotateY(180deg);
      box-shadow:0 2px 16px rgba(129,140,248,0.2),0 0 0 1px rgba(129,140,248,0.1);
    }
    .mm-card.matched .mm-card-back{
      background:linear-gradient(135deg,rgba(20,60,40,0.95),rgba(10,40,25,0.95));
      border-color:rgba(74,222,128,0.4);
      box-shadow:0 2px 20px rgba(74,222,128,0.25),0 0 0 1px rgba(74,222,128,0.15);
      animation:mmPulse 0.5s ease-out;
    }
    @keyframes mmPulse{0%{transform:rotateY(180deg) scale(1.12)}100%{transform:rotateY(180deg) scale(1)}}
    #mm-overlay{
      position:absolute;inset:0;display:none;flex-direction:column;
      align-items:center;justify-content:center;gap:14px;
      background:rgba(6,9,20,0.92);backdrop-filter:blur(20px);z-index:30;
    }
    #mm-overlay h2{
      font-size:2.2rem;font-weight:900;letter-spacing:-1px;
      background:linear-gradient(135deg,#818cf8,#c084fc);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
    }
    #mm-overlay p{color:#64748b;font-size:0.9rem;text-align:center;}
    #mm-overlay .mm-score-big{font-size:2.8rem;font-weight:900;color:#818cf8;}
    .mm-play-btn{
      padding:12px 40px;border:none;border-radius:999px;cursor:pointer;
      background:linear-gradient(135deg,#818cf8,#c084fc);color:#fff;
      font-family:Inter,sans-serif;font-size:1rem;font-weight:900;
      box-shadow:0 4px 20px rgba(129,140,248,0.45);transition:transform 0.15s;
    }
    .mm-play-btn:hover{transform:scale(1.07);}
  `;
    const styleEl = document.createElement('style'); styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore }) {
        const wrap = document.createElement('div'); wrap.id = 'mm-wrap';

        const topbar = document.createElement('div'); topbar.id = 'mm-topbar';
        const diffGroup = document.createElement('div'); diffGroup.style.display = 'flex'; diffGroup.style.gap = '6px';
        const stats = document.createElement('div'); stats.id = 'mm-stats';
        stats.innerHTML = `<span id="mm-moves">0 moves</span><span id="mm-timer">0:00</span>`;
        topbar.appendChild(diffGroup); topbar.appendChild(stats);

        const comboFlash = document.createElement('div'); comboFlash.id = 'mm-combo-flash';
        const grid = document.createElement('div'); grid.id = 'mm-grid';
        const overlayEl = document.createElement('div'); overlayEl.id = 'mm-overlay';

        wrap.appendChild(topbar); wrap.appendChild(comboFlash); wrap.appendChild(grid); wrap.appendChild(overlayEl);
        container.appendChild(wrap);

        const DIFFS = {
            easy: { n: 12, cols: 4, label: 'Easy', time: 0 },
            medium: { n: 20, cols: 5, label: 'Medium', time: 90 },
            hard: { n: 24, cols: 6, label: 'Hard', time: 60 },
        };

        const EMOJIS = ['🌟', '🎮', '🎸', '🦋', '🐉', '🦄', '🌈', '💎', '🔮', '🎯', '🌺', '🦊', '🐼', '🎪', '🌙', '🎭', '🦁', '🔱', '❄️', '🎨', '🏆', '🎲', '🌊', '🎵'];

        let diff = 'easy', cards = [], flipped = [], matched = [];
        let score = 0, moves = 0, locked = false, combo = 0;
        let timerInterval, elapsed = 0, gameActive = false;
        let comboTO;

        function startGame(d) {
            diff = d;
            clearInterval(timerInterval);
            const { n, cols, time } = DIFFS[d];
            const pairs = shuffle([...EMOJIS]).slice(0, n / 2);
            cards = shuffle([...pairs, ...pairs]).map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }));
            flipped = []; matched = []; score = 0; moves = 0; locked = false; combo = 0;
            elapsed = 0; gameActive = true;
            scoreEl.textContent = '0';
            if (highScoreEl) highScoreEl.textContent = getHighScore();
            updateDiffBtns();
            grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            overlayEl.style.display = 'none';
            render();
            // Timer
            timerInterval = setInterval(() => {
                if (!gameActive) return;
                elapsed++;
                const left = time > 0 ? Math.max(0, time - elapsed) : elapsed;
                const m = Math.floor(left / 60), s = left % 60;
                const timerEl = document.getElementById('mm-timer');
                if (timerEl) timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
                if (time > 0 && elapsed >= time) { gameActive = false; gameOver(false); }
            }, 1000);
        }

        function updateDiffBtns() {
            diffGroup.innerHTML = '';
            for (const [key, val] of Object.entries(DIFFS)) {
                const btn = document.createElement('button');
                btn.className = 'mm-diff-btn' + (key === diff ? ' active' : '');
                btn.textContent = val.label;
                btn.addEventListener('click', () => startGame(key));
                diffGroup.appendChild(btn);
            }
        }

        function shuffle(arr) {
            for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; }
            return arr;
        }

        function flip(id) {
            if (locked || !gameActive) return;
            const card = cards[id];
            if (card.flipped || card.matched) return;
            card.flipped = true; flipped.push(id); moves++;
            document.getElementById(`mm-moves`).textContent = `${moves} move${moves !== 1 ? 's' : ''}`;
            updateCard(id);

            if (flipped.length === 2) {
                locked = true;
                const [a, b] = flipped;
                if (cards[a].emoji === cards[b].emoji) {
                    // Match!
                    combo++;
                    const basePoints = Math.max(200 - moves * 3, 50);
                    const comboBonus = combo >= 2 ? combo * 30 : 0;
                    score += basePoints + comboBonus;
                    scoreEl.textContent = score;
                    setHighScore(score);
                    if (highScoreEl) highScoreEl.textContent = getHighScore();
                    if (combo >= 2) showComboFlash(combo);
                    setTimeout(() => {
                        cards[a].matched = cards[b].matched = true;
                        matched.push(a, b);
                        flipped = []; locked = false;
                        updateCard(a); updateCard(b);
                        if (matched.length === cards.length) { gameActive = false; clearInterval(timerInterval); setTimeout(() => gameOver(true), 400); }
                    }, 200);
                } else {
                    combo = 0;
                    setTimeout(() => {
                        cards[a].flipped = cards[b].flipped = false;
                        flipped = []; locked = false;
                        updateCard(a); updateCard(b);
                    }, 900);
                }
            }
        }

        function showComboFlash(n) {
            comboFlash.textContent = `${n}x COMBO! +${n * 30}🔥`;
            comboFlash.style.opacity = '1';
            clearTimeout(comboTO);
            comboTO = setTimeout(() => comboFlash.style.opacity = '0', 1500);
        }

        function updateCard(id) {
            const el = document.getElementById(`mm-card-${id}`);
            if (!el) return;
            const card = cards[id];
            el.className = 'mm-card' + (card.flipped || card.matched ? ' flipped' : '') + (card.matched ? ' matched' : '');
        }

        function render() {
            grid.innerHTML = '';
            for (const c of cards) {
                const card = document.createElement('div');
                card.className = 'mm-card' + (c.flipped || c.matched ? ' flipped' : '') + (c.matched ? ' matched' : '');
                card.id = `mm-card-${c.id}`;
                card.innerHTML = `
          <div class="mm-card-inner">
            <div class="mm-card-front"></div>
            <div class="mm-card-back">${c.emoji}</div>
          </div>
        `;
                card.addEventListener('click', () => flip(c.id));
                grid.appendChild(card);
            }
        }

        function gameOver(won) {
            clearInterval(timerInterval);
            setHighScore(score);
            const perfect = combo >= cards.length / 4;
            overlayEl.style.display = 'flex';
            overlayEl.innerHTML = `
        <h2>${won ? (perfect ? '✨ Perfect!' : '🎉 Complete!') : '⏰ Time Up!'}</h2>
        <div class="mm-score-big">${score.toLocaleString()}</div>
        <p>${moves} moves · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')} · Best: ${getHighScore().toLocaleString()}</p>
        <button class="mm-play-btn" id="mm-retry">Play Again</button>
      `;
            document.getElementById('mm-retry').addEventListener('click', () => startGame(diff));
        }

        updateDiffBtns();
        startGame('easy');

        window.currentGameCleanup = () => {
            clearInterval(timerInterval);
            clearTimeout(comboTO);
            gameActive = false;
            styleEl.remove();
        };
    };
})();
