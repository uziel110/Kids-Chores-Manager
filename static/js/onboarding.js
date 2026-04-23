/* ═══════════════════════════════════════════════
   onboarding.js — Canvas spotlight onboarding
   Triggered by: ? button click, or auto on first load (0 children)
   Exposes: window.startOnboarding()
═══════════════════════════════════════════════ */
(function () {

  /* ── Helper: find a par-tab by its tab name ── */
  function _parTabEl(name) {
    return [...document.querySelectorAll('.par-tab')]
      .find(el => el.getAttribute('onclick') && el.getAttribute('onclick').includes("'" + name + "'"));
  }

  function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function _goParent(tab) {
    closeM('m-pw');
    S.parentAuthed = true;
    showScreen('parent');
    await _delay(150);
    const btn = _parTabEl(tab);
    if (btn) parTab(tab, btn);
    await _delay(200);
  }

  /* ─────────────────────────────────────────────
     STEP DEFINITIONS
  ───────────────────────────────────────────── */
  const STEPS = [
    {
      targetQuery: '.nav-title',
      emoji: '🌟',
      title: 'ברוכים הבאים!',
      body: 'זהו פאנל המטלות המשפחתי. נעבור יחד על כל הכפתורים הראשיים.',
      arrowDir: 'up',
      beforeStep() { showScreen('home'); },
    },
    {
      targetQuery: '#childrenGrid',
      emoji: '👨‍👩‍👧‍👦',
      title: 'כרטיסיות ילדים',
      body: 'לחץ על כרטיסיית ילד כדי לראות את המטלות שלו ולקחת אחת.',
      arrowDir: 'up',
      beforeStep() { showScreen('home'); },
    },
    {
      targetQuery: '#leaderboard',
      emoji: '🏆',
      title: 'לוח מובילים',
      body: 'דירוג שבועי — מי צבר הכי הרבה נקודות השבוע? מתאפס אוטומטית.',
      arrowDir: 'up',
      beforeStep() { showScreen('home'); },
    },
    {
      targetQuery: 'button.btn-nav[onclick="showRewards()"]',
      emoji: '🎁',
      title: 'כפתור פרסים',
      body: 'פותח את חנות הפרסים. כל ילד רואה רק את הפרסים המיועדים לו.',
      arrowDir: 'up',
      beforeStep() { showScreen('home'); },
    },
    {
      targetQuery: 'button.btn-nav[onclick="showStats()"]',
      emoji: '📊',
      title: 'סטטיסטיקות',
      body: 'נקודות נוכחיות, שבועיות, מטלות שבוצעו היום — לכל ילד.',
      arrowDir: 'up',
      beforeStep() { showScreen('home'); },
    },
    {
      targetQuery: 'button.btn-nav[onclick="showParentLogin()"]',
      emoji: '🔐',
      title: 'פאנל הורים',
      body: 'ניהול מטלות, פרסים וילדים. מוגן בסיסמה (ברירת מחדל: 1234).',
      arrowDir: 'up',
      beforeStep() { showScreen('home'); },
    },
    {
      targetQuery: '#helpBtn',
      emoji: '❓',
      title: 'כפתור עזרה',
      body: 'לחיצה — מפעיל את ההדרכה הזו מחדש בכל עת.',
      arrowDir: 'up',
      beforeStep() { showScreen('home'); },
    },
    /* ── Parent panel ── */
    {
      targetQuery: '#pwInput',
      emoji: '🔑',
      title: 'סיסמת הורים',
      body: 'הכנס סיסמה כדי להיכנס לפאנל הניהול.',
      arrowDir: 'down',
      async beforeStep() {
        showScreen('home');
        document.getElementById('pwInput').value = '';
        document.getElementById('pwErr').style.display = 'none';
        openM('m-pw');
        await _delay(200);
      },
    },
    {
      targetQuery: '#pt-appr',
      emoji: '✔️',
      title: 'לשונית אישורים',
      body: 'כאן מאשרים מטלות שהילדים סיימו ובקשות פרסים. אישור מוסיף נקודות.',
      arrowDir: 'down',
      async beforeStep() { await _goParent('appr'); },
    },
    {
      targetQuery: '#btn-add-child',
      emoji: '➕',
      title: 'הוספת ילד',
      body: 'מוסיפים ילד עם שם, תאריך לידה, מגדר, אווטאר וצבע.',
      arrowDir: 'down',
      async beforeStep() { await _goParent('children'); },
    },
    {
      targetQuery: '#btn-add-chore',
      emoji: '✨',
      title: 'הוספת מטלה',
      body: 'מגדירים שם, נקודות, שעות, ימים, מגבלת לוקחים וקהל יעד.',
      arrowDir: 'down',
      async beforeStep() { await _goParent('chores'); },
    },
    {
      targetQuery: '#btn-add-reward',
      emoji: '🌟',
      title: 'הוספת פרס',
      body: 'מוסיפים פרס עם עלות בנקודות, תמונה אופציונלית ומגבלת מימוש.',
      arrowDir: 'down',
      async beforeStep() { await _goParent('rewards'); },
    },
    /* ── Stats ── */
    {
      targetQuery: '#statsGrid',
      emoji: '📈',
      title: 'כרטיסיות סטטיסטיקה',
      body: 'נקודות נוכחיות, שבועיות, מטלות שבוצעו — לכל ילד בנפרד.',
      arrowDir: 'up',
      async beforeStep() {
        S.parentAuthed = false;
        await showStats();
      },
    },
    {
      targetQuery: '#statsTodaySummary',
      emoji: '📅',
      title: 'סיכום היום',
      body: 'רשימת כל המטלות שבוצעו היום עם מי ביצע וכמה פעמים.',
      arrowDir: 'up',
      beforeStep() { showScreen('stats'); },
    },
    /* ── Rewards child view ── */
    {
      targetQuery: '#rewChildGrid',
      emoji: '🛍️',
      title: 'חנות פרסים',
      body: 'בוחרים לאיזה ילד להיכנס. כל ילד רואה רק את הפרסים שלו.',
      arrowDir: 'up',
      async beforeStep() { await showRewards(); },
    },
    /* ── Done ── */
    {
      targetQuery: '.nav-title',
      emoji: '🎉',
      title: 'סיימנו!',
      body: 'עכשיו אתה יודע הכל. לחץ על כפתור ה-? בכל עת כדי לחזור להדרכה.',
      arrowDir: 'up',
      beforeStep() { showScreen('home'); },
    },
  ];

  /* ─────────────────────────────────────────────
     ENGINE
  ───────────────────────────────────────────── */
  const GLOW_CLR = '#FF8C42';
  const GLOW_W   = 5;
  const GLOW_PAD = 12;
  const CARD_W   = 320;
  const CARD_PAD = 16;

  let canvas, ctx, card, overlay;
  let stepIdx    = 0;
  let animFrame  = null;
  let resizeTimer = null;

  function _buildDOM() {
    // Remove any leftover elements from a previous run
    ['ob-canvas','ob-overlay','ob-card','ob-style'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });

    canvas = document.createElement('canvas');
    canvas.id = 'ob-canvas';
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', zIndex: '3000', pointerEvents: 'none',
    });
    document.body.appendChild(canvas);

    overlay = document.createElement('div');
    overlay.id = 'ob-overlay';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '2999', background: 'transparent',
    });
    document.body.appendChild(overlay);

    card = document.createElement('div');
    card.id = 'ob-card';
    card.innerHTML = `
      <div id="ob-arrow"></div>
      <div id="ob-header">
        <span id="ob-emoji"></span>
        <strong id="ob-title"></strong>
        <span id="ob-counter"></span>
      </div>
      <div id="ob-body"></div>
      <div id="ob-btns">
        <button id="ob-skip" onclick="window.__obSkip()">דלג הכל</button>
        <button id="ob-next" onclick="window.__obNext()">הבא ▶</button>
      </div>`;
    Object.assign(card.style, {
      position: 'fixed', zIndex: '3001',
      width: CARD_W + 'px',
      background: 'var(--card)',
      borderRadius: '20px',
      padding: CARD_PAD + 'px',
      boxShadow: '0 12px 40px rgba(0,0,0,.35)',
      direction: 'rtl',
      fontFamily: 'var(--font)',
    });
    document.body.appendChild(card);

    const st = document.createElement('style');
    st.id = 'ob-style';
    st.textContent = `
      #ob-header{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
      #ob-emoji{font-size:22px;}
      #ob-title{font-size:15px;font-weight:800;color:var(--text);}
      #ob-counter{margin-right:auto;font-size:11px;color:var(--muted);}
      #ob-body{font-size:13px;line-height:1.6;color:var(--muted);margin-bottom:14px;}
      #ob-btns{display:flex;gap:8px;justify-content:flex-end;}
      #ob-skip{padding:7px 14px;border-radius:50px;border:2px solid var(--border);
        background:transparent;font-family:var(--font);font-size:12px;cursor:pointer;color:var(--muted);}
      #ob-next{padding:7px 18px;border-radius:50px;border:none;
        background:var(--orange);color:#fff;font-family:var(--font);font-size:13px;
        font-weight:800;cursor:pointer;}
      #ob-arrow{position:absolute;width:0;height:0;}
      #ob-arrow.up{top:-10px;right:auto;border-left:10px solid transparent;
        border-right:10px solid transparent;border-bottom:10px solid var(--card);}
      #ob-arrow.down{bottom:-10px;right:auto;border-left:10px solid transparent;
        border-right:10px solid transparent;border-top:10px solid var(--card);}
    `;
    document.head.appendChild(st);

    window.__obNext = nextStep;
    window.__obSkip = skipAll;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!canvas) return;
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        _renderStep(STEPS[stepIdx]);
      }, 150);
    });
  }

  /* ── Canvas helpers ── */
  function _roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r);
    c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h);
    c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r);
    c.arcTo(x, y, x + r, y, r);
    c.closePath();
  }

  function _startPulse(rect) {
    if (animFrame) cancelAnimationFrame(animFrame);
    let t = 0;
    (function frame() {
      if (!ctx) return;
      t += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(0,0,0,.62)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (rect) {
        const x = rect.left - GLOW_PAD, y = rect.top - GLOW_PAD;
        const w = rect.width + GLOW_PAD * 2, h = rect.height + GLOW_PAD * 2;
        const r = Math.min(16, h / 2);

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        _roundRect(ctx, x, y, w, h, r);
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = GLOW_CLR;
        ctx.lineWidth   = GLOW_W;
        ctx.shadowColor = GLOW_CLR;
        ctx.shadowBlur  = 14 + 10 * Math.sin(t);
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t);
        _roundRect(ctx, x, y, w, h, r);
        ctx.stroke();
        ctx.restore();
      }

      animFrame = requestAnimationFrame(frame);
    })();
  }

  function _positionCard(rect, arrowDir) {
    if (!card) return;
    const vw = window.innerWidth, vh = window.innerHeight;
    const cardH = card.offsetHeight || 180;
    let top, left;

    if (arrowDir === 'up') {
      top  = rect ? rect.bottom + GLOW_PAD + 14 : vh / 2 - cardH / 2;
      left = rect ? rect.left : (vw - CARD_W) / 2;
    } else {
      top  = rect ? rect.top - GLOW_PAD - cardH - 14 : vh / 2 - cardH / 2;
      left = rect ? rect.left : (vw - CARD_W) / 2;
    }

    top  = Math.max(8, Math.min(top,  vh - cardH - 8));
    left = Math.max(8, Math.min(left, vw - CARD_W - 8));

    card.style.top  = top + 'px';
    card.style.left = left + 'px';

    const arrow = document.getElementById('ob-arrow');
    if (!arrow) return;
    arrow.className = arrowDir === 'up' ? 'up' : arrowDir === 'down' ? 'down' : '';
    if (rect) {
      const arrowLeft = Math.max(16, Math.min(
        rect.left + rect.width / 2 - left - 10,
        CARD_W - 32
      ));
      arrow.style.left = arrowLeft + 'px';
    }
  }

  function _renderStep(step) {
    const el   = step.targetQuery ? document.querySelector(step.targetQuery) : null;
    const rect = el ? el.getBoundingClientRect() : null;

    document.getElementById('ob-emoji').textContent   = step.emoji || '❓';
    document.getElementById('ob-title').textContent   = step.title || '';
    document.getElementById('ob-body').textContent    = step.body  || '';
    document.getElementById('ob-counter').textContent = (stepIdx + 1) + ' / ' + STEPS.length;
    document.getElementById('ob-next').textContent    = stepIdx === STEPS.length - 1 ? '✅ סיום' : 'הבא ▶';

    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    _startPulse(rect);
    setTimeout(() => _positionCard(rect, step.arrowDir || 'up'), 60);
  }

  /* ── Flow ── */
  async function startOnboarding() {
    _buildDOM();
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx      = canvas.getContext('2d');
    stepIdx  = 0;
    card.style.display          = 'block';
    overlay.style.pointerEvents = 'all';
    await _runStep(0);
  }

  async function _runStep(idx) {
    if (idx >= STEPS.length) { _finish(); return; }
    stepIdx = idx;
    const step = STEPS[idx];
    if (typeof step.beforeStep === 'function') {
      await step.beforeStep();
      await _delay(180);
    }
    _renderStep(step);
  }

  async function nextStep() { await _runStep(stepIdx + 1); }

  function skipAll() {
    _finish();
    toast('לחץ על ? בכל עת כדי לפתוח מחדש את ההדרכה', 'ok');
  }

  function _finish() {
    localStorage.setItem('is_onboarding_complete', '1');
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    ['ob-canvas','ob-overlay','ob-card','ob-style'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    canvas = null; ctx = null; card = null; overlay = null;
    S.parentAuthed = false;
    showScreen('home');
    refreshHome();
  }

  window.startOnboarding = startOnboarding;

})();
