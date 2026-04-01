/* ========================================
   GameHub — Main Application v4.0
   Full Rework: Search, Categories, Favorites,
   Recently Played, Loading Spinner, Fullscreen,
   Score Sharing, Animated Stats
   ======================================== */

(function () {
  'use strict';

  // ----------------------------------------
  // Game Registry — with categories
  // ----------------------------------------
  const GAMES = [
    { id: 'wordle', name: 'Wordle', desc: 'Guess the hidden 5-letter word in 6 tries', icon: '🔤', gradient: 'linear-gradient(135deg,#f472b6,#c084fc)', controls: 'none', category: 'word', isNew: true },
    { id: 'stacker', name: 'Stacker', desc: 'Stack blocks with perfect timing', icon: '🏗️', gradient: 'linear-gradient(135deg,#fb923c,#facc15)', controls: 'tap', category: 'timing', isNew: true },
    { id: 'aim-trainer', name: 'Aim Trainer', desc: 'Click shrinking targets as fast as you can', icon: '🎯', gradient: 'linear-gradient(135deg,#f87171,#fb923c)', controls: 'none', category: 'reflex', isNew: true },
    { id: 'color-flood', name: 'Color Flood', desc: 'Flood the board with one color in limited moves', icon: '🎨', gradient: 'linear-gradient(135deg,#34d399,#22d3ee)', controls: 'none', category: 'puzzle', isNew: true },
    { id: 'space-waves', name: 'Space Waves', desc: 'Shoot waves of enemies', icon: '🚀', gradient: 'linear-gradient(135deg,#5b7fff,#9b6dff)', controls: 'vjoy', category: 'action' },
    { id: 'tetris', name: 'Tetris', desc: 'Stack blocks & clear lines', icon: '🟨', gradient: 'linear-gradient(135deg,#f59e42,#ffd93d)', controls: 'lr', category: 'arcade' },
    { id: '2048', name: '2048', desc: 'Slide tiles to reach 2048', icon: '🔢', gradient: 'linear-gradient(135deg,#f87171,#f59e42)', controls: 'none', category: 'puzzle' },
    { id: 'block-breaker', name: 'Block Breaker', desc: 'Smash all the bricks', icon: '🧱', gradient: 'linear-gradient(135deg,#f59e42,#ffd93d)', controls: 'lr', category: 'arcade' },
    { id: 'memory-match', name: 'Memory Match', desc: 'Find matching card pairs', icon: '🃏', gradient: 'linear-gradient(135deg,#9b6dff,#5b7fff)', controls: 'none', category: 'puzzle' },
    { id: 'snake', name: 'Snake', desc: 'Eat & grow without crashing', icon: '🐍', gradient: 'linear-gradient(135deg,#4ade80,#38d9c0)', controls: 'dpad', category: 'arcade' },
    { id: 'flappy-bird', name: 'Flappy Bird', desc: 'Tap to fly & dodge pipes', icon: '🐦', gradient: 'linear-gradient(135deg,#38d9c0,#4ade80)', controls: 'tap', category: 'reflex' },
    { id: 'pacman', name: 'Pac-Man', desc: 'Eat dots & dodge ghosts', icon: '👻', gradient: 'linear-gradient(135deg,#ffd93d,#f59e42)', controls: 'dpad', category: 'arcade' },
    { id: 'geometry-dash', name: 'Geometry Dash', desc: 'Jump over obstacles to survive', icon: '🔷', gradient: 'linear-gradient(135deg,#5b7fff,#9b6dff)', controls: 'tap', category: 'runner' },
    { id: 'crossy-road', name: 'Crossy Road', desc: 'Cross roads & rivers safely', icon: '🐸', gradient: 'linear-gradient(135deg,#4ade80,#38d9c0)', controls: 'dpad', category: 'action' },
  ];

  const CATEGORIES = [
    { id: 'all', label: '🎮 All' },
    { id: 'word', label: '🔤 Word' },
    { id: 'timing', label: '⏱️ Timing' },
    { id: 'reflex', label: '⚡ Reflex' },
    { id: 'puzzle', label: '🧩 Puzzle' },
    { id: 'action', label: '⚔️ Action' },
    { id: 'arcade', label: '👾 Arcade' },
    { id: 'runner', label: '🏃 Runner' },
  ];

  // ----------------------------------------
  // Settings
  // ----------------------------------------
  const DEFAULTS = { darkMode: true, sound: true, mobileControls: true, vibration: true, cloudSync: true };
  function loadSettings() { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('gamehub-settings')) }; } catch { return { ...DEFAULTS }; } }
  function saveSettings(s) { localStorage.setItem('gamehub-settings', JSON.stringify(s)); }
  let settings = loadSettings();

  function applyTheme(isDark) {
    document.body.classList.toggle('light', !isDark);
    settings.darkMode = isDark;
    saveSettings(settings);
  }

  // ----------------------------------------
  // Scores
  // ----------------------------------------
  function getHS(id) { try { return parseInt(localStorage.getItem('hs-' + id)) || 0; } catch { return 0; } }
  function setHS(id, s) {
    if (s > getHS(id)) {
      localStorage.setItem('hs-' + id, s);
      if (settings.cloudSync && window.GameHubAuth?.getCurrentUser()) {
        const all = {}; GAMES.forEach(g => { all[g.id] = getHS(g.id); });
        window.GameHubAuth.saveScoresToCloud(all);
      }
      return true;
    }
    return false;
  }

  async function syncCloud() {
    if (!window.GameHubAuth || !settings.cloudSync) return;
    try {
      const cloud = await window.GameHubAuth.loadScoresFromCloud();
      if (cloud) {
        Object.keys(cloud).forEach(id => {
          const r = parseInt(cloud[id]) || 0;
          if (r > getHS(id)) localStorage.setItem('hs-' + id, r);
        });
      }
    } catch (e) { console.warn('[GameHub] Cloud sync:', e); }
  }

  // ----------------------------------------
  // Favorites
  // ----------------------------------------
  function getFavs() { try { return JSON.parse(localStorage.getItem('gamehub-favs')) || []; } catch { return []; } }
  function setFavs(arr) { localStorage.setItem('gamehub-favs', JSON.stringify(arr)); }
  function isFav(id) { return getFavs().includes(id); }
  function toggleFav(id) {
    const favs = getFavs();
    const idx = favs.indexOf(id);
    if (idx === -1) favs.push(id);
    else favs.splice(idx, 1);
    setFavs(favs);
  }

  // ----------------------------------------
  // Recently Played
  // ----------------------------------------
  const MAX_RECENT = 4;
  function getRecents() { try { return JSON.parse(localStorage.getItem('gamehub-recent')) || []; } catch { return []; } }
  function addRecent(id) {
    let r = getRecents().filter(x => x !== id);
    r.unshift(id);
    if (r.length > MAX_RECENT) r = r.slice(0, MAX_RECENT);
    localStorage.setItem('gamehub-recent', JSON.stringify(r));
  }

  // ----------------------------------------
  // Toast
  // ----------------------------------------
  function showToast(msg, type = 'info', duration = 2800) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 350); }, duration);
  }

  // ----------------------------------------
  // Animated Count-up
  // ----------------------------------------
  function countUp(el, target, duration = 600) {
    if (!el || target === 0) { if (el) el.textContent = target.toLocaleString(); return; }
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(ease * target).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = target.toLocaleString();
    }
    requestAnimationFrame(tick);
  }

  // ----------------------------------------
  // Mobile Detection
  // ----------------------------------------
  const isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  // ----------------------------------------
  // Mobile Controls (Thumb-Zone)
  // ----------------------------------------
  function removeMobileControls() { document.getElementById('mobile-controls')?.remove(); }

  function createMobileControls(type) {
    removeMobileControls();
    if (type === 'none' || !settings.mobileControls) return;

    const mc = document.createElement('div');
    mc.className = 'mobile-controls';
    mc.id = 'mobile-controls';

    const left = document.createElement('div');
    const right = document.createElement('div');
    left.className = 'mc-left';
    right.className = 'mc-right';

    function mkBtn(label, keyCode, cls) {
      const b = document.createElement('button');
      b.className = `mc-btn ${cls || ''}`;
      b.innerHTML = label;
      b.setAttribute('role', 'button');
      b.addEventListener('touchstart', e => {
        e.preventDefault();
        b.classList.add('pressed');
        document.dispatchEvent(new KeyboardEvent('keydown', { code: keyCode, key: keyCode, bubbles: true }));
        if (settings.vibration && navigator.vibrate) navigator.vibrate(12);
      }, { passive: false });
      b.addEventListener('touchend', e => {
        e.preventDefault();
        b.classList.remove('pressed');
        document.dispatchEvent(new KeyboardEvent('keyup', { code: keyCode, key: keyCode, bubbles: true }));
      }, { passive: false });
      b.addEventListener('touchcancel', () => b.classList.remove('pressed'));
      return b;
    }

    if (type === 'tap') {
      const tapWrap = document.createElement('div');
      tapWrap.className = 'mc-tap';
      tapWrap.appendChild(mkBtn('TAP', 'Space', 'mc-action'));
      mc.style.justifyContent = 'center';
      mc.appendChild(tapWrap);
      document.body.appendChild(mc);
      return;
    }

    if (type === 'dpad') {
      const dpad = document.createElement('div');
      dpad.className = 'mc-dpad';
      dpad.appendChild(mkBtn('▲', 'ArrowUp', 'mc-btn-up'));
      dpad.appendChild(mkBtn('◀', 'ArrowLeft', 'mc-btn-left'));
      dpad.appendChild(mkBtn('▼', 'ArrowDown', 'mc-btn-down'));
      dpad.appendChild(mkBtn('▶', 'ArrowRight', 'mc-btn-right'));
      left.appendChild(dpad);
    }

    if (type === 'runner') {
      const run = document.createElement('div');
      run.className = 'mc-runner';
      run.appendChild(mkBtn('↑<br><small>JUMP</small>', 'ArrowUp', 'mc-btn-jump'));
      run.appendChild(mkBtn('↓<br><small>DUCK</small>', 'ArrowDown', 'mc-btn-duck'));
      mc.style.justifyContent = 'center';
      mc.appendChild(run);
      document.body.appendChild(mc);
      return;
    }

    if (type === 'lr') {
      const lr = document.createElement('div');
      lr.className = 'mc-lr';
      lr.appendChild(mkBtn('◀', 'ArrowLeft'));
      lr.appendChild(mkBtn('▶', 'ArrowRight'));
      mc.style.justifyContent = 'center';
      mc.appendChild(lr);
      document.body.appendChild(mc);
      return;
    }

    if (type === 'vjoy' || type === 'vjoy-fire') {
      const joyArea = document.createElement('div');
      joyArea.className = 'vjoy-area';
      joyArea.id = 'vjoy-area';
      const knob = document.createElement('div');
      knob.className = 'vjoy-knob';
      knob.id = 'vjoy-knob';
      joyArea.appendChild(knob);
      left.appendChild(joyArea);

      if (type === 'vjoy-fire') {
        const fire = mkBtn('🔥', 'Space', 'mc-action');
        right.appendChild(fire);
      }
      mc.appendChild(left); mc.appendChild(right);
      document.body.appendChild(mc);

      window._vjoyState = { x: 0, y: 0, active: false };
      let joyRect, joyOriginX, joyOriginY;
      const maxR = 28;

      joyArea.addEventListener('touchstart', e => {
        e.preventDefault();
        joyRect = joyArea.getBoundingClientRect();
        joyOriginX = joyRect.left + joyRect.width / 2;
        joyOriginY = joyRect.top + joyRect.height / 2;
        window._vjoyState.active = true;
      }, { passive: false });

      joyArea.addEventListener('touchmove', e => {
        e.preventDefault();
        if (!window._vjoyState.active) return;
        const dx = e.touches[0].clientX - joyOriginX;
        const dy = e.touches[0].clientY - joyOriginY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamp = Math.min(dist, maxR);
        const angle = Math.atan2(dy, dx);
        const kx = Math.cos(angle) * clamp;
        const ky = Math.sin(angle) * clamp;
        knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
        window._vjoyState.x = kx / maxR;
        window._vjoyState.y = ky / maxR;
      }, { passive: false });

      const resetJoy = () => {
        window._vjoyState = { x: 0, y: 0, active: false };
        knob.style.transform = 'translate(-50%,-50%)';
      };
      joyArea.addEventListener('touchend', resetJoy, { passive: false });
      joyArea.addEventListener('touchcancel', resetJoy, { passive: false });
      return;
    }

    mc.appendChild(left); mc.appendChild(right);
    document.body.appendChild(mc);
  }

  // ----------------------------------------
  // Auth UI
  // ----------------------------------------
  function setupAuthUI() {
    const authModal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');
    const authTitle = document.getElementById('auth-title');

    window.showAuthModal = mode => {
      if (mode === 'signup') {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        authTitle.textContent = '📝 Create Account';
      } else {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        authTitle.textContent = '🔐 Sign In';
      }
      document.getElementById('auth-error').textContent = '';
      document.getElementById('signup-error').textContent = '';
      authModal.classList.add('active');
    };
    window.hideAuthModal = () => authModal.classList.remove('active');

    document.getElementById('auth-close').addEventListener('click', window.hideAuthModal);
    authModal.addEventListener('click', e => { if (e.target === authModal) window.hideAuthModal(); });
    document.getElementById('show-signup').addEventListener('click', e => { e.preventDefault(); window.showAuthModal('signup'); });
    document.getElementById('show-login').addEventListener('click', e => { e.preventDefault(); window.showAuthModal('login'); });

    document.getElementById('btn-login').addEventListener('click', async () => {
      const email = document.getElementById('auth-email').value.trim();
      const pass = document.getElementById('auth-password').value;
      const errEl = document.getElementById('auth-error');
      const btn = document.getElementById('btn-login');
      errEl.textContent = '';
      if (!email || !pass) { errEl.textContent = 'Please fill in all fields.'; return; }
      btn.disabled = true;
      btn.innerHTML = '<span class="auth-spinner"></span> Signing in…';
      try { await window.GameHubAuth.loginWithEmail(email, pass); window.hideAuthModal(); renderHub(); }
      catch (e) { errEl.textContent = friendlyError(e); }
      finally { btn.disabled = false; btn.textContent = 'Sign In'; }
    });

    document.getElementById('btn-signup').addEventListener('click', async () => {
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const pass = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;
      const errEl = document.getElementById('signup-error');
      const btn = document.getElementById('btn-signup');
      errEl.textContent = '';
      if (!email || !pass) { errEl.textContent = 'Please fill in all fields.'; return; }
      if (pass.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; return; }
      if (pass !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }
      btn.disabled = true;
      btn.innerHTML = '<span class="auth-spinner"></span> Creating…';
      try { await window.GameHubAuth.signupWithEmail(email, pass, name); window.hideAuthModal(); renderHub(); }
      catch (e) { errEl.textContent = friendlyError(e); }
      finally { btn.disabled = false; btn.textContent = 'Create Account'; }
    });

    const googleHandler = async () => {
      try { await window.GameHubAuth.loginWithGoogle(); window.hideAuthModal(); renderHub(); }
      catch (e) {
        const errEl = document.getElementById('auth-error');
        if (errEl) errEl.textContent = friendlyError(e);
      }
    };
    document.getElementById('btn-google-login').addEventListener('click', googleHandler);
    document.getElementById('btn-google-signup').addEventListener('click', googleHandler);

    document.getElementById('auth-password').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-login').click(); });
    document.getElementById('signup-confirm').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('btn-signup').click(); });
  }

  function friendlyError(err) {
    if (!err) return 'Something went wrong. Please try again.';
    const map = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many attempts. Try again later.',
      'auth/popup-closed-by-user': 'Sign-in popup was closed.',
      'auth/popup-blocked': 'Popups blocked. Please allow popups.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    return map[err.code] || err.message || 'Error: ' + (err.code || 'Unknown');
  }

  // ----------------------------------------
  // Hub State (search + filter)
  // ----------------------------------------
  let hubSearchQuery = '';
  let hubActiveFilter = 'all';

  function getFilteredGames() {
    const q = hubSearchQuery.toLowerCase().trim();
    return GAMES.filter(g => {
      const matchesSearch = !q || g.name.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q) || g.category.includes(q);
      const matchesCategory = hubActiveFilter === 'all' || g.category === hubActiveFilter;
      return matchesSearch && matchesCategory;
    });
  }

  // ----------------------------------------
  // Render Hub
  // ----------------------------------------
  function renderHub() {
    if (typeof window.currentGameCleanup === 'function') {
      window.currentGameCleanup(); window.currentGameCleanup = null;
    }
    removeMobileControls();

    const user = window.GameHubAuth?.getCurrentUser() || null;
    const totalBest = GAMES.reduce((s, g) => s + getHS(g.id), 0);
    // Count distinct games ever visited (union of recently-played IDs + any game with a high score)
    const playedIds = new Set([...getRecents(), ...GAMES.filter(g => getHS(g.id) > 0).map(g => g.id)]);
    const played = playedIds.size;
    const recents = getRecents().map(id => GAMES.find(g => g.id === id)).filter(Boolean);
    const filtered = getFilteredGames();

    // Recently-played HTML
    const recentHtml = recents.length > 0 ? `
      <div class="hub-section-header">
        <h2>⏱️ Recently Played</h2>
        <p>${recents.length} game${recents.length !== 1 ? 's' : ''}</p>
      </div>
      <div class="recently-played-strip">
        ${recents.map(g => `
          <div class="recent-card" data-game="${g.id}">
            <div class="recent-card-icon" style="background:${g.gradient};">${g.icon}</div>
            <div class="recent-card-name">${g.name}</div>
            <div class="recent-card-score">🏆 ${getHS(g.id).toLocaleString()}</div>
          </div>`).join('')}
      </div>` : '';

    // Game cards HTML
    const cardsHtml = filtered.length > 0
      ? filtered.map((g, i) => `
          <div class="game-card glass" data-game="${g.id}" style="animation-delay:${i * 0.04}s">
            <div class="game-card-top">
              <div class="game-card-icon" style="background:${g.gradient};">${g.icon}</div>
              <button class="fav-btn ${isFav(g.id) ? 'active' : ''}" data-fav="${g.id}" title="${isFav(g.id) ? 'Remove favorite' : 'Add favorite'}">
                ${isFav(g.id) ? '❤️' : '🤍'}
              </button>
            </div>
            ${g.isNew ? '<span class="game-card-new">NEW</span>' : ''}
            <h3 class="game-card-title">${g.name}</h3>
            <p class="game-card-desc">${g.desc}</p>
            <span class="game-badge ${g.category}">${g.category}</span>
            <div class="game-card-meta">
              <span class="game-card-score">🏆 ${getHS(g.id).toLocaleString()}</span>
              <span class="game-card-play">Play →</span>
            </div>
          </div>`).join('')
      : `<div class="no-games-msg">
           <span>🔍</span>
           <p>No games found for "<strong>${hubSearchQuery}</strong>"</p>
         </div>`;

    // Filter tabs HTML
    const tabsHtml = CATEGORIES.map(c => `
      <button class="filter-tab ${hubActiveFilter === c.id ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>`).join('');

    document.getElementById('app').innerHTML = `
      <div class="navbar glass-static">
        <div class="navbar-brand" id="nav-brand">
          <div class="navbar-logo">🎮</div>
          <span class="navbar-title">GameHub</span>
        </div>
        <div class="navbar-actions">
          <button class="nav-icon-btn" id="btn-dark-toggle" title="Toggle theme">${settings.darkMode ? '☀️' : '🌙'}</button>
          <button class="nav-icon-btn" id="btn-settings" title="Settings">⚙️</button>
          ${user ? `
            <div class="user-pill" id="user-pill">
              <div class="user-avatar">
                ${user.photoURL ? `<img src="${user.photoURL}" alt="av">` : `<span>${(user.displayName || user.email || '?')[0].toUpperCase()}</span>`}
              </div>
              <span class="user-name">${user.displayName || user.email.split('@')[0]}</span>
              <div class="user-dropdown" id="user-dropdown">
                <div class="user-dropdown-item" style="flex-direction:column;align-items:flex-start;gap:1px;cursor:default;pointer-events:none;">
                  <span style="font-weight:700;">${user.displayName || 'Player'}</span>
                  <span style="font-size:0.68rem;color:var(--text-tertiary);">${user.email}</span>
                </div>
                <div class="user-dropdown-divider"></div>
                <button class="user-dropdown-item" id="btn-sync-now">☁️ Sync Scores</button>
                <div class="user-dropdown-divider"></div>
                <button class="user-dropdown-item danger" id="btn-logout">🚪 Sign Out</button>
              </div>
            </div>` : `<button class="nav-signin-btn" id="btn-signin">Sign In</button>`}
        </div>
      </div>

      <div class="hub-container">
        <div class="hub-hero">
          <h1>GameHub</h1>
          <p class="hub-hero-tagline">${GAMES.length} premium games — play free in your browser</p>
          ${user
        ? `<p class="hub-hero-welcome">Welcome back, <strong>${user.displayName || user.email.split('@')[0]}</strong> 👋</p>`
        : `<p class="hub-hero-welcome"><a href="#" id="hero-signin" class="hero-signin-link">Sign in</a> to sync scores across devices</p>`}
        </div>

        <div class="hub-stats glass">
          <div class="hub-stat-item">
            <span class="hub-stat-value" id="stat-games">${GAMES.length}</span>
            <span class="hub-stat-label">Games</span>
          </div>
          <div class="hub-stat-divider"></div>
          <div class="hub-stat-item">
            <span class="hub-stat-value" id="stat-played">0</span>
            <span class="hub-stat-label">Played</span>
          </div>
          <div class="hub-stat-divider"></div>
          <div class="hub-stat-item">
            <span class="hub-stat-value" id="stat-score">0</span>
            <span class="hub-stat-label">Total Score</span>
          </div>
          <div class="hub-stat-divider"></div>
          <div class="hub-stat-item">
            <span class="hub-stat-value">${user ? '☁️' : '📴'}</span>
            <span class="hub-stat-label">${user ? 'Synced' : 'Local'}</span>
          </div>
        </div>

        ${recentHtml}

        <div class="hub-controls">
          <div class="search-bar-wrap">
            <span class="search-bar-icon">🔍</span>
            <input type="search" id="hub-search" placeholder="Search games…" value="${hubSearchQuery}" autocomplete="off" />
          </div>
          <div class="filter-tabs">${tabsHtml}</div>
        </div>

        <div class="hub-section-header">
          <h2>🕹️ Games</h2>
          <p>${filtered.length} of ${GAMES.length}</p>
        </div>

        <div class="game-grid" id="game-grid">${cardsHtml}</div>

        <footer class="hub-footer">
          <p>🎮 GameHub — Built for fun, designed with ❤️</p>
          <p class="hub-footer-sub">© ${new Date().getFullYear()} GameHub Arcade</p>
        </footer>
      </div>
    `;

    // Animate stats count-up
    countUp(document.getElementById('stat-played'), played);
    countUp(document.getElementById('stat-score'), totalBest, 900);

    // Bind events
    document.getElementById('nav-brand').addEventListener('click', () => { location.hash = ''; });
    document.getElementById('btn-dark-toggle').addEventListener('click', () => {
      settings.darkMode = !settings.darkMode;
      applyTheme(settings.darkMode);
      renderHub();
    });
    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('btn-signin')?.addEventListener('click', () => window.showAuthModal('login'));
    document.getElementById('hero-signin')?.addEventListener('click', e => { e.preventDefault(); window.showAuthModal('login'); });

    // User pill dropdown
    const userPill = document.getElementById('user-pill');
    if (userPill) {
      const dropdown = document.getElementById('user-dropdown');
      userPill.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('open'); });
      document.addEventListener('click', () => dropdown.classList.remove('open'));
      document.getElementById('btn-sync-now').addEventListener('click', async () => {
        dropdown.classList.remove('open');
        if (settings.cloudSync) {
          const all = {}; GAMES.forEach(g => { all[g.id] = getHS(g.id); });
          await window.GameHubAuth.saveScoresToCloud(all);
          showToast('✅ Scores synced!', 'success');
        }
      });
      document.getElementById('btn-logout').addEventListener('click', async () => {
        dropdown.classList.remove('open');
        await window.GameHubAuth.logout();
        renderHub();
      });
    }

    // Search input
    document.getElementById('hub-search').addEventListener('input', e => {
      hubSearchQuery = e.target.value;
      rebuildGameGrid();
    });

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        hubActiveFilter = tab.dataset.cat;
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        rebuildGameGrid();
      });
    });

    // Favorites
    document.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.fav;
        toggleFav(id);
        const wasActive = btn.classList.contains('active');
        btn.classList.toggle('active', !wasActive);
        btn.innerHTML = !wasActive ? '❤️' : '🤍';
        btn.title = !wasActive ? 'Remove favorite' : 'Add favorite';
        showToast(!wasActive ? '❤️ Added to favorites' : '🤍 Removed from favorites', 'info', 1800);
      });
    });

    // Game card clicks
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => { location.hash = card.dataset.game; });
    });

    // Recently played card clicks
    document.querySelectorAll('.recent-card').forEach(card => {
      card.addEventListener('click', () => { location.hash = card.dataset.game; });
    });
  }

  // Rebuild only the game grid (for search/filter without full re-render)
  function rebuildGameGrid() {
    const filtered = getFilteredGames();
    const grid = document.getElementById('game-grid');
    if (!grid) return;

    const header = document.querySelector('.hub-section-header p');
    if (header) header.textContent = `${filtered.length} of ${GAMES.length}`;

    grid.innerHTML = filtered.length > 0
      ? filtered.map((g, i) => `
          <div class="game-card glass" data-game="${g.id}" style="animation-delay:${i * 0.04}s">
            <div class="game-card-top">
              <div class="game-card-icon" style="background:${g.gradient};">${g.icon}</div>
              <button class="fav-btn ${isFav(g.id) ? 'active' : ''}" data-fav="${g.id}" title="${isFav(g.id) ? 'Remove favorite' : 'Add favorite'}">
                ${isFav(g.id) ? '❤️' : '🤍'}
              </button>
            </div>
            ${g.isNew ? '<span class="game-card-new">NEW</span>' : ''}
            <h3 class="game-card-title">${g.name}</h3>
            <p class="game-card-desc">${g.desc}</p>
            <span class="game-badge ${g.category}">${g.category}</span>
            <div class="game-card-meta">
              <span class="game-card-score">🏆 ${getHS(g.id).toLocaleString()}</span>
              <span class="game-card-play">Play →</span>
            </div>
          </div>`).join('')
      : `<div class="no-games-msg">
           <span>🔍</span>
           <p>No games found for "<strong>${hubSearchQuery}</strong>"</p>
         </div>`;

    // Rebind
    document.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => { location.hash = card.dataset.game; });
    });
    document.querySelectorAll('.fav-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.fav;
        toggleFav(id);
        const wasActive = btn.classList.contains('active');
        btn.classList.toggle('active', !wasActive);
        btn.innerHTML = !wasActive ? '❤️' : '🤍';
        showToast(!wasActive ? '❤️ Added to favorites' : '🤍 Removed from favorites', 'info', 1800);
      });
    });
  }

  // ----------------------------------------
  // Render Game
  // ----------------------------------------
  function renderGame(gameId) {
    const game = GAMES.find(g => g.id === gameId);
    if (!game) { renderHub(); return; }

    if (typeof window.currentGameCleanup === 'function') {
      window.currentGameCleanup(); window.currentGameCleanup = null;
    }

    addRecent(gameId);

    const user = window.GameHubAuth?.getCurrentUser() || null;

    document.getElementById('app').innerHTML = `
      <div class="game-view">
        <div class="game-header glass-static">
          <button class="back-btn" id="btn-back">← Back</button>
          <div class="game-header-center">
            <span style="font-size:1.1rem;">${game.icon}</span>
            <span class="game-header-title">${game.name}</span>
            <span class="game-badge ${game.category}" style="margin-top:0;">${game.category}</span>
          </div>
          <div class="game-header-right">
            <div class="game-score-display">
              Score: <strong id="current-score">0</strong>
              &nbsp;·&nbsp;
              Best: <strong id="high-score">${getHS(gameId)}</strong>
              ${user ? ' ☁️' : ''}
            </div>
            <button class="fullscreen-btn" id="btn-fullscreen" title="Fullscreen">⛶</button>
          </div>
        </div>
        <div class="game-body" id="game-container">
          <div class="game-loading" id="game-loading">
            <div class="game-loading-spinner"></div>
            <p>Loading ${game.name}…</p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-back').addEventListener('click', () => { location.hash = ''; });

    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      const view = document.querySelector('.game-view');
      if (!view) return;
      if (!document.fullscreenElement) {
        view.requestFullscreen?.() || view.webkitRequestFullscreen?.();
        document.getElementById('btn-fullscreen').textContent = '✕';
      } else {
        document.exitFullscreen?.() || document.webkitExitFullscreen?.();
        document.getElementById('btn-fullscreen').textContent = '⛶';
      }
    });
    document.addEventListener('fullscreenchange', () => {
      const btn = document.getElementById('btn-fullscreen');
      if (btn) btn.textContent = document.fullscreenElement ? '✕' : '⛶';
    });

    document.getElementById('game-container').addEventListener('touchmove', e => e.preventDefault(), { passive: false });

    if (isMobile) createMobileControls(game.controls);

    const container = document.getElementById('game-container');
    const scoreEl = document.getElementById('current-score');
    const highScoreEl = document.getElementById('high-score');

    const oldScript = document.getElementById('game-script');
    if (oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'game-script';
    script.src = `games/${gameId}/game.js?v=${Date.now()}`;
    script.onload = () => {
      const loadingEl = document.getElementById('game-loading');
      if (loadingEl) loadingEl.remove();
      if (typeof window.initGame === 'function') {
        window.initGame({
          container, scoreEl, highScoreEl,
          getHighScore: () => getHS(gameId),
          setHighScore: (s) => {
            const isNew = setHS(gameId, s);
            if (isNew) showToast(`🏆 New best: ${s.toLocaleString()}!`, 'success');
            return isNew;
          },
          isDark: settings.darkMode,
          isMobile,
          sound: settings.sound,
          vibrate: ms => { if (settings.vibration && navigator.vibrate) navigator.vibrate(ms || 12); },
          shareScore: (score) => shareScore(game, score),
        });
      }
    };
    script.onerror = () => {
      const loadingEl = document.getElementById('game-loading');
      if (loadingEl) {
        loadingEl.innerHTML = `<p style="color:var(--danger);text-align:center;">Failed to load game.</p>`;
      }
    };
    document.body.appendChild(script);
  }

  // ----------------------------------------
  // Score Sharing
  // ----------------------------------------
  async function shareScore(game, score) {
    const text = `🎮 I scored ${score.toLocaleString()} in ${game.name} on GameHub Arcade!`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `GameHub — ${game.name}`, text });
        return;
      } catch (e) { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      showToast('📋 Score copied to clipboard!', 'info', 2500);
    } catch (e) {
      showToast('🏆 ' + text, 'success', 3500);
    }
  }

  // ----------------------------------------
  // Settings Modal
  // ----------------------------------------
  function openSettings() {
    const modal = document.getElementById('settings-modal');
    document.getElementById('toggle-dark').checked = settings.darkMode;
    document.getElementById('toggle-sound').checked = settings.sound;
    document.getElementById('toggle-mobile-controls').checked = settings.mobileControls;
    document.getElementById('toggle-vibration').checked = settings.vibration;
    document.getElementById('toggle-cloud-sync').checked = settings.cloudSync;
    modal.classList.add('active');
  }

  function setupSettings() {
    const modal = document.getElementById('settings-modal');
    const close = document.getElementById('settings-close');
    close.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });

    document.getElementById('toggle-dark').addEventListener('change', e => { applyTheme(e.target.checked); });
    document.getElementById('toggle-sound').addEventListener('change', e => { settings.sound = e.target.checked; saveSettings(settings); });
    document.getElementById('toggle-mobile-controls').addEventListener('change', e => { settings.mobileControls = e.target.checked; saveSettings(settings); });
    document.getElementById('toggle-vibration').addEventListener('change', e => { settings.vibration = e.target.checked; saveSettings(settings); });
    document.getElementById('toggle-cloud-sync').addEventListener('change', e => { settings.cloudSync = e.target.checked; saveSettings(settings); });

    document.getElementById('btn-reset-scores').addEventListener('click', () => {
      if (confirm('Reset ALL high scores?')) {
        GAMES.forEach(g => localStorage.removeItem('hs-' + g.id));
        localStorage.removeItem('gamehub-recent');
        showToast('All scores cleared.', 'info');
        renderHub();
      }
    });
  }

  // ----------------------------------------
  // Router
  // ----------------------------------------
  function route() {
    const hash = location.hash.replace('#', '');
    if (hash && GAMES.find(g => g.id === hash)) renderGame(hash);
    else renderHub();
  }

  // ----------------------------------------
  // Init
  // ----------------------------------------
  async function init() {
    applyTheme(settings.darkMode);
    setupSettings();
    setupAuthUI();
    route();
    window.addEventListener('hashchange', route);

    if (window.GameHubAuth) {
      try {
        await window.GameHubAuth.init();
        window.GameHubAuth.onAuthStateChanged(async user => {
          if (user) {
            await syncCloud();
            const hash = location.hash.replace('#', '');
            if (!hash || !GAMES.find(g => g.id === hash)) renderHub();
          }
        });
      } catch (e) { console.warn('[GameHub] Firebase init:', e); }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
