/* =============================================
   WORDLE — Neon Edition
   Guess the 5-letter word in 6 tries
   ============================================= */
(function () {
  'use strict';

  const WORDS = [
    'about','abuse','actor','acute','admit','adopt','after','again','agent','agree',
    'ahead','alarm','album','alert','alike','alive','alley','allow','alone','along',
    'alter','angel','anger','angle','ankle','apart','apple','apply','arena','argue',
    'arise','armor','arrow','asset','audio','audit','avoid','awake','award','aware',
    'badge','baker','basic','batch','beach','beard','beast','begin','being','below',
    'bench','berry','birth','black','blade','blame','blank','blast','blaze','bleed',
    'blend','bless','blind','block','blood','bloom','board','bonus','bound','brain',
    'brand','brave','bread','break','brick','bride','brief','bring','broad','broke',
    'brown','brush','buddy','build','built','burst','buyer','cabin','cable','candy',
    'cargo','carry','catch','cause','chain','chair','chaos','charm','chart','chase',
    'cheap','check','cheek','chess','chest','chief','child','civil','claim','class',
    'clean','clear','clerk','click','cliff','climb','clock','close','cloud','coach',
    'coast','coins','color','comic','coral','count','court','cover','craft','crane',
    'crash','crazy','cream','creek','crime','crisp','cross','crowd','crown','crush',
    'curve','cycle','daily','dance','death','debut','decay','delta','dense','depth',
    'devil','dirty','dodge','doubt','draft','drain','drama','drawn','dream','dress',
    'drift','drink','drive','drove','drunk','dying','eager','early','earth','eight',
    'elite','empty','enemy','enjoy','enter','entry','equal','error','essay','every',
    'exact','exist','extra','fable','faint','fairy','faith','false','fancy','fatal',
    'fault','feast','fence','fever','fiber','field','fifth','fifty','fight','final',
    'first','fixed','flame','flask','flick','flock','flood','floor','fluid','focus',
    'force','forge','forth','found','frame','frank','fresh','front','frost','fruit',
    'fully','fuzzy','gauge','giant','given','glass','glide','globe','glory','glove',
    'going','grace','grade','grain','grand','grant','grasp','grass','grave','great',
    'green','greet','grief','grind','groan','gross','group','grown','guard','guest',
    'guide','guild','guilt','happy','harsh','haste','haven','heart','heavy','hedge',
    'hence','herbs','honor','horse','hotel','house','human','humid','humor','image',
    'inner','input','issue','ivory','jazzy','jewel','joint','joker','jumbo','juice',
    'karma','knife','knock','known','label','large','laser','later','laugh','layer',
    'learn','least','leave','ledge','legal','level','light','limit','liner','lodge',
    'logic','loose','lower','lucky','lunar','lyric','magic','major','maker','manor',
    'maple','march','marsh','match','mayor','metal','meter','minor','minus','mixed',
    'model','moral','month','motor','mount','mouse','mouth','movie','music','naive',
    'nerve','never','night','noble','north','novel','oasis','occur','often','omega',
    'onset','opera','optic','orbit','order','other','outer','oxide','ozone','paint',
    'panel','panic','paper','party','patch','pause','peace','pearl','perch','pixel',
    'pizza','place','plain','plane','plant','plate','plaza','plead','pluck','plume',
    'point','polar','power','press','price','pride','prime','print','prior','prize',
    'probe','proof','prose','proud','proxy','pulse','punch','pupil','purge','queen',
    'quest','quick','quiet','quite','quota','quote','radar','radio','raise','rally',
    'ranch','range','rapid','ratio','reach','react','ready','realm','rebel','refer',
    'regal','relay','relic','remix','reply','resin','rider','right','risky','rival',
    'river','rocky','rough','round','route','royal','ruler','rusty','saint','salsa',
    'sauce','scale','scare','scene','scope','score','scout','seize','sense','seven',
    'shade','shake','shall','shame','shape','share','shark','sharp','sheer','shelf',
    'shell','shift','shine','shirt','shock','shore','short','shout','shove','sight',
    'since','sixth','sixty','skill','skull','slate','sleep','slick','slide','slope',
    'smart','smell','smoke','snake','solve','sonic','sorry','south','space','spare',
    'spark','speak','speed','spend','spoke','sport','spray','squad','stack','staff',
    'stage','stain','stake','stand','stark','start','state','steam','steel','steer',
    'stern','stick','stiff','still','sting','stock','stone','stood','storm','story',
    'strap','stray','strip','stuck','study','stuff','stunt','style','sugar','suite',
    'sunny','super','surge','swamp','swear','sweep','sweet','swift','swing','sword',
    'table','teach','tense','terms','thank','theme','there','thick','thing','think',
    'third','thorn','those','three','threw','throw','thumb','tiger','tight','timer',
    'title','today','token','total','touch','tough','towel','tower','toxic','trace',
    'track','trade','trail','train','trend','trial','tribe','trick','troop','truck',
    'truly','trunk','trust','truth','tumor','twice','twist','tying','ultra','uncle',
    'under','union','unity','until','upper','upset','urban','usage','usual','utter',
    'valid','value','valve','vault','venue','video','viral','virus','visit','vista',
    'vital','vivid','vocal','voice','voter','wagon','waste','watch','water','weave',
    'wedge','weird','whale','wheat','wheel','where','which','while','white','whole',
    'wider','witch','world','worse','worst','worth','would','wrath','wrist','wrote',
    'yacht','yield','young','yours','youth','zebra'
  ];

  const CSS = `
    #wl-wrap {
      width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center;
      justify-content: flex-start; padding: 16px 8px 8px;
      background: #060914; overflow-y: auto; gap: 14px; box-sizing: border-box;
    }
    #wl-grid {
      display: flex; flex-direction: column; gap: 5px;
    }
    .wl-row { display: flex; gap: 5px; }
    .wl-cell {
      width: 54px; height: 54px;
      border: 2px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; font-weight: 900; font-family: Inter, sans-serif;
      color: #eef1fa; text-transform: uppercase;
      transition: border-color 0.1s, transform 0.1s;
      background: rgba(255,255,255,0.03);
      user-select: none;
    }
    .wl-cell.filled { border-color: rgba(255,255,255,0.35); transform: scale(1.06); }
    .wl-cell.correct { background: #22c55e; border-color: #22c55e; color: #fff; box-shadow: 0 0 16px rgba(34,197,94,0.55); }
    .wl-cell.present { background: #f59e0b; border-color: #f59e0b; color: #fff; box-shadow: 0 0 16px rgba(245,158,11,0.50); }
    .wl-cell.absent  { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); }
    @keyframes wlFlip {
      0%   { transform: rotateX(0deg); }
      50%  { transform: rotateX(-90deg); }
      100% { transform: rotateX(0deg); }
    }
    .wl-cell.flip { animation: wlFlip 0.5s ease forwards; }
    @keyframes wlShake {
      0%,100% { transform: translateX(0); }
      20%,60% { transform: translateX(-6px); }
      40%,80% { transform: translateX(6px); }
    }
    .wl-row.shake { animation: wlShake 0.4s ease; }
    @keyframes wlBounce {
      0%,100% { transform: translateY(0); }
      50%      { transform: translateY(-8px); }
    }
    .wl-cell.bounce { animation: wlBounce 0.4s ease; }

    #wl-keyboard {
      display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%;
    }
    .wl-kb-row { display: flex; gap: 5px; justify-content: center; }
    .wl-key {
      padding: 0; height: 42px; min-width: 34px;
      border: none; border-radius: 6px;
      background: rgba(255,255,255,0.12); color: #eef1fa;
      font-family: Inter, sans-serif; font-size: 0.78rem; font-weight: 700;
      cursor: pointer; transition: all 0.15s; text-transform: uppercase;
      display: flex; align-items: center; justify-content: center;
      user-select: none;
    }
    .wl-key.wide { min-width: 54px; font-size: 0.70rem; }
    .wl-key:active { transform: scale(0.92); }
    .wl-key.correct { background: #22c55e; color: #fff; }
    .wl-key.present { background: #f59e0b; color: #fff; }
    .wl-key.absent  { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.25); }

    #wl-msg {
      font-family: Inter, sans-serif; font-size: 0.88rem; font-weight: 700;
      color: #eef1fa; text-align: center; min-height: 20px; letter-spacing: 0.03em;
    }

    #wl-overlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; background: rgba(6,9,20,0.92); backdrop-filter: blur(20px);
      z-index: 10; border-radius: 16px; animation: wlFadeIn 0.3s ease;
    }
    @keyframes wlFadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
    #wl-overlay h2 {
      font-size: 2rem; font-weight: 900; font-family: Inter, sans-serif;
      background: linear-gradient(135deg, #f472b6, #c084fc);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      text-align: center;
    }
    #wl-overlay .wl-answer {
      font-size: 1.6rem; font-weight: 900; letter-spacing: 8px; font-family: Inter, sans-serif;
      color: #22c55e; text-shadow: 0 0 20px rgba(34,197,94,0.6); text-transform: uppercase;
    }
    #wl-overlay p { color: #8892b0; font-family: Inter, sans-serif; font-size: 0.88rem; text-align: center; }
    .wl-btn {
      padding: 12px 36px; border: none; border-radius: 999px; cursor: pointer;
      background: linear-gradient(135deg, #f472b6, #c084fc); color: #fff;
      font-family: Inter, sans-serif; font-size: 1rem; font-weight: 800;
      box-shadow: 0 4px 20px rgba(244,114,182,0.45); transition: transform 0.15s, box-shadow 0.15s;
    }
    .wl-btn:hover { transform: scale(1.06); box-shadow: 0 6px 28px rgba(244,114,182,0.6); }

    @media (max-width: 420px) {
      .wl-cell { width: 46px; height: 46px; font-size: 1.2rem; }
      .wl-key  { height: 38px; min-width: 28px; font-size: 0.72rem; }
      .wl-key.wide { min-width: 46px; }
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  window.initGame = function ({ container, scoreEl, highScoreEl, getHighScore, setHighScore, isMobile, vibrate }) {
    const MAX_TRIES = 6;
    const WORD_LEN = 5;
    let target = '';
    let board = [];       // board[row][col] = letter string
    let revealed = [];    // revealed[row][col] = 'correct'|'present'|'absent'|''
    let currentRow = 0;
    let currentCol = 0;
    let gameOver = false;

    function newGame() {
      target = WORDS[Math.floor(Math.random() * WORDS.length)].toUpperCase();
      board = Array.from({ length: MAX_TRIES }, () => Array(WORD_LEN).fill(''));
      revealed = Array.from({ length: MAX_TRIES }, () => Array(WORD_LEN).fill(''));
      currentRow = 0;
      currentCol = 0;
      gameOver = false;
      renderBoard();
      renderKeyboard();
      setMsg('');
    }

    function renderBoard() {
      const gridEl = document.getElementById('wl-grid');
      if (!gridEl) return;
      gridEl.innerHTML = Array.from({ length: MAX_TRIES }, (_, r) =>
        `<div class="wl-row" id="wl-row-${r}">${
          Array.from({ length: WORD_LEN }, (__, c) => {
            const letter = board[r][c];
            const state = revealed[r][c];
            return `<div class="wl-cell${letter ? ' filled' : ''}${state ? ' ' + state : ''}" id="wl-${r}-${c}">${letter}</div>`;
          }).join('')
        }</div>`
      ).join('');
    }

    function renderKeyboard() {
      const kbEl = document.getElementById('wl-keyboard');
      if (!kbEl) return;
      const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
      const letterStates = {};
      for (let r = 0; r < currentRow; r++) {
        for (let c = 0; c < WORD_LEN; c++) {
          const l = board[r][c];
          const s = revealed[r][c];
          if (!l) continue;
          const prev = letterStates[l];
          const rank = { correct: 3, present: 2, absent: 1 };
          if (!prev || rank[s] > rank[prev]) letterStates[l] = s;
        }
      }
      kbEl.innerHTML = rows.map((row, i) => `
        <div class="wl-kb-row">
          ${i === 2 ? '<button class="wl-key wide" data-key="ENTER">ENTER</button>' : ''}
          ${row.split('').map(l => `<button class="wl-key${letterStates[l] ? ' ' + letterStates[l] : ''}" data-key="${l}">${l}</button>`).join('')}
          ${i === 2 ? '<button class="wl-key wide" data-key="BACKSPACE">⌫</button>' : ''}
        </div>`
      ).join('');
      kbEl.querySelectorAll('.wl-key').forEach(btn => {
        btn.addEventListener('click', () => handleInput(btn.dataset.key));
      });
    }

    function setMsg(msg) {
      const el = document.getElementById('wl-msg');
      if (el) el.textContent = msg;
    }

    function updateCell(r, c) {
      const cell = document.getElementById(`wl-${r}-${c}`);
      if (!cell) return;
      const letter = board[r][c];
      const state = revealed[r][c];
      cell.textContent = letter;
      cell.className = 'wl-cell' + (letter ? ' filled' : '') + (state ? ' ' + state : '');
    }

    function handleInput(key) {
      if (gameOver) return;
      if (key === 'BACKSPACE' || key === 'Backspace') {
        if (currentCol > 0) {
          currentCol--;
          board[currentRow][currentCol] = '';
          updateCell(currentRow, currentCol);
        }
        return;
      }
      if (key === 'ENTER' || key === 'Enter') {
        submitGuess();
        return;
      }
      if (/^[A-Za-z]$/.test(key) && currentCol < WORD_LEN) {
        board[currentRow][currentCol] = key.toUpperCase();
        updateCell(currentRow, currentCol);
        currentCol++;
      }
    }

    function submitGuess() {
      if (currentCol < WORD_LEN) {
        shakeRow(currentRow);
        setMsg('Not enough letters');
        setTimeout(() => setMsg(''), 1500);
        return;
      }

      const guess = board[currentRow].join('');
      revealRow(currentRow, guess, () => {
        renderKeyboard();
        if (guess === target) {
          const score = (MAX_TRIES - currentRow) * 200;
          scoreEl.textContent = score;
          setHighScore(score);
          bounceRow(currentRow);
          setTimeout(() => showOverlay(true, score), 500);
          gameOver = true;
          vibrate?.(50);
        } else {
          currentRow++;
          currentCol = 0;
          if (currentRow >= MAX_TRIES) {
            gameOver = true;
            scoreEl.textContent = 0;
            setTimeout(() => showOverlay(false, 0), 400);
          }
        }
      });
    }

    function revealRow(row, guess, onDone) {
      // Calculate tile states
      const targetArr = target.split('');
      const guessArr = guess.split('');
      const states = Array(WORD_LEN).fill('absent');
      const used = Array(WORD_LEN).fill(false);

      // First pass: correct
      for (let i = 0; i < WORD_LEN; i++) {
        if (guessArr[i] === targetArr[i]) {
          states[i] = 'correct';
          used[i] = true;
        }
      }
      // Second pass: present
      for (let i = 0; i < WORD_LEN; i++) {
        if (states[i] === 'correct') continue;
        for (let j = 0; j < WORD_LEN; j++) {
          if (!used[j] && guessArr[i] === targetArr[j]) {
            states[i] = 'present';
            used[j] = true;
            break;
          }
        }
      }

      // Animate tiles with delay
      for (let c = 0; c < WORD_LEN; c++) {
        const cell = document.getElementById(`wl-${row}-${c}`);
        if (!cell) continue;
        const state = states[c];
        const delay = c * 120;
        setTimeout(() => {
          cell.classList.add('flip');
          setTimeout(() => {
            revealed[row][c] = state;
            cell.className = 'wl-cell ' + state;
            cell.textContent = board[row][c];
          }, 250);
          setTimeout(() => cell.classList.remove('flip'), 500);
        }, delay);
      }
      setTimeout(onDone, WORD_LEN * 120 + 520);
    }

    function shakeRow(row) {
      const rowEl = document.getElementById(`wl-row-${row}`);
      if (!rowEl) return;
      rowEl.classList.add('shake');
      setTimeout(() => rowEl.classList.remove('shake'), 400);
    }

    function bounceRow(row) {
      for (let c = 0; c < WORD_LEN; c++) {
        const cell = document.getElementById(`wl-${row}-${c}`);
        if (!cell) continue;
        setTimeout(() => {
          cell.classList.add('bounce');
          setTimeout(() => cell.classList.remove('bounce'), 400);
        }, c * 80);
      }
    }

    function showOverlay(won, score) {
      const wrap = document.getElementById('wl-wrap');
      const old = document.getElementById('wl-overlay');
      if (old) old.remove();
      const ov = document.createElement('div');
      ov.id = 'wl-overlay';
      ov.innerHTML = `
        <h2>${won ? '🎉 Brilliant!' : '😔 Next Time!'}</h2>
        <div class="wl-answer">${won ? target : target}</div>
        <p>${won ? `Solved in ${currentRow} ${currentRow === 1 ? 'try' : 'tries'} · Score: ${score}` : `The word was above`}</p>
        <button class="wl-btn" id="wl-restart">Play Again</button>
      `;
      wrap.appendChild(ov);
      document.getElementById('wl-restart').addEventListener('click', () => {
        ov.remove();
        scoreEl.textContent = 0;
        newGame();
      });
    }

    // Build HTML
    container.innerHTML = `
      <div id="wl-wrap" style="position:relative;">
        <div id="wl-grid"></div>
        <div id="wl-msg"></div>
        <div id="wl-keyboard"></div>
      </div>
    `;

    // Keyboard input
    const onKey = e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      handleInput(e.key);
    };
    document.addEventListener('keydown', onKey);

    newGame();

    window.currentGameCleanup = () => {
      document.removeEventListener('keydown', onKey);
      styleEl.remove();
    };
  };
})();
