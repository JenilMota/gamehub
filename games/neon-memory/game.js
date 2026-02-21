/* =============================================
   Neon Memory — v3.0
   Simon Says style, neon flash, speed scaling
   ============================================= */
(function () {
    'use strict';

    window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore }) {
        const PADS = [
            { id: 0, color: '#f87171', label: '▲', key: 'KeyW' },
            { id: 1, color: '#4ade80', label: '▶', key: 'KeyD' },
            { id: 2, color: '#5b7fff', label: '▼', key: 'KeyS' },
            { id: 3, color: '#f59e42', label: '◀', key: 'KeyA' },
        ];
        let sequence = [], playerSeq = [], score = 0, state = 'ready', activeId = null, playSpeed = 700;

        const wrapper = document.createElement('div');
        wrapper.className = 'puzzle-wrapper';
        wrapper.style.cssText = 'max-width:320px;margin:0 auto;padding:20px;';
        container.appendChild(wrapper);

        function renderGame() {
            wrapper.innerHTML = `
        <div style="text-align:center;margin-bottom:18px;">
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.4);font-weight:600;text-transform:uppercase;letter-spacing:.1em;">${state === 'watching' ? 'Watch…' : state === 'input' ? `Repeat (${playerSeq.length}/${sequence.length})` : state === 'correct' ? '✅ Correct!' : state === 'wrong' ? '❌ Wrong!' : 'Press any pad to start'
                }</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          ${PADS.map(p => `
            <button id="pad-${p.id}" style="
              height:110px;border-radius:20px;font-size:2rem;font-weight:700;border:none;cursor:pointer;
              background:${p.id === activeId ? p.color : `${p.color}22`};
              box-shadow:${p.id === activeId ? `0 0 28px ${p.color},0 0 60px ${p.color}44` : 'none'};
              color:${p.id === activeId ? '#fff' : p.color};
              border:2px solid ${p.color}44;
              transition:all 0.15s;transform:${p.id === activeId ? 'scale(1.04)' : 'scale(1)'};
            ">${p.label}</button>
          `).join('')}
        </div>
      `;
            PADS.forEach(p => {
                const btn = document.getElementById(`pad-${p.id}`);
                btn?.addEventListener('click', () => handleInput(p.id));
                btn?.addEventListener('touchstart', e => { e.preventDefault(); handleInput(p.id); }, { passive: false });
            });
        }

        function flashPad(id, duration = 380) {
            return new Promise(res => {
                activeId = id; renderGame();
                setTimeout(() => { activeId = null; renderGame(); setTimeout(res, 80); }, duration);
            });
        }

        async function playSequence() {
            state = 'watching'; renderGame();
            for (const id of sequence) {
                await flashPad(id, Math.max(180, playSpeed - sequence.length * 15));
                await new Promise(r => setTimeout(r, 60));
            }
            state = 'input'; playerSeq = []; renderGame();
        }

        function addStep() {
            sequence.push(Math.floor(Math.random() * 4));
            playSpeed = Math.max(350, 700 - sequence.length * 18);
            playSequence();
        }

        async function handleInput(id) {
            if (state !== 'input') {
                if (state === 'ready') { sequence = [scoreEl.textContent = '0']; sequence = []; score = 0; addStep(); return; }
                return;
            }
            playerSeq.push(id);
            await flashPad(id, 220);
            const pos = playerSeq.length - 1;
            if (sequence[pos] !== id) {
                state = 'wrong'; renderGame();
                setHighScore(score); highScoreEl.textContent = getHighScore();
                setTimeout(() => { sequence = []; playerSeq = []; score = 0; state = 'ready'; scoreEl.textContent = '0'; renderGame(); }, 1400);
                return;
            }
            if (playerSeq.length === sequence.length) {
                score++; scoreEl.textContent = score;
                state = 'correct'; renderGame();
                setTimeout(() => addStep(), 600);
            }
        }

        // Keyboard support
        function onKey(e) {
            const pad = PADS.find(p => p.key === e.code);
            if (pad) { e.preventDefault(); handleInput(pad.id); }
        }
        document.addEventListener('keydown', onKey);

        scoreEl.textContent = '0'; highScoreEl.textContent = getHighScore();
        renderGame();

        window.currentGameCleanup = function () {
            document.removeEventListener('keydown', onKey);
            window.initGame = null;
        };
    };
})();
