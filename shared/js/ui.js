/* ═══════════════════════════════════════════════
   ui.js — Screensaver, confetti, timers, birthday
   Used by: init.js, chores.js
═══════════════════════════════════════════════ */

/* ── Screensaver ── */
function resetSS() {
  if (S.ssTimer) clearTimeout(S.ssTimer);
  S.ssTimer = setTimeout(showSS, S.SS_DELAY);
}
function showSS() {
  const el = document.getElementById('ss');
  el.classList.add('show');
  const stars = document.getElementById('ss-stars');
  stars.innerHTML = '';
  const ems = ['⭐','🌟','✨','🎉','🌈','🦋','🌸','🎯'];
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('div');
    s.className = 'fstar';
    s.textContent = ems[Math.floor(Math.random() * ems.length)];
    s.style.left = Math.random() * 100 + '%';
    s.style.animationDuration = (3 + Math.random() * 5) + 's';
    s.style.animationDelay    = (Math.random() * 5) + 's';
    s.style.fontSize = (18 + Math.random() * 20) + 'px';
    stars.appendChild(s);
  }
}
function hideSS() {
  document.getElementById('ss').classList.remove('show');
  resetSS();
}

/* ── Confetti ── */
function confetti() {
  const cols = ['#FF6B6B','#4ECDC4','#FFE66D','#A78BFA','#FF8C42','#FF6B9D'];
  for (let i = 0; i < 55; i++) {
    const p = document.createElement('div');
    p.className = 'cp';
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = cols[Math.floor(Math.random() * cols.length)];
    p.style.animationDuration = (1 + Math.random() * 2) + 's';
    p.style.animationDelay    = (Math.random() * 0.5) + 's';
    const sz = 7 + Math.random() * 11;
    p.style.width = p.style.height = sz + 'px';
    if (Math.random() > 0.5) p.style.borderRadius = '50%';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 3000);
  }
}

/* ── Countdown timers ── */
function deadlineStr(deadlineIso) {
  const secs = Math.max(0, Math.floor((new Date(deadlineIso) - Date.now()) / 1000));
  return fmtSecs(secs);
}
function fmtSecs(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}
function pad(n) { return String(n).padStart(2, '0'); }

function startTimers() {
  if (window._ti) clearInterval(window._ti);
  window._ti = setInterval(() => {
    document.querySelectorAll('[id^="td-"]').forEach(el => {
      const dl = el.getAttribute('data-deadline');
      if (!dl) return;
      const secs = Math.floor((new Date(dl) - Date.now()) / 1000);
      if (secs <= 0) {
        el.textContent = '⏰ פג הזמן!';
        el.className = 'timer-deadline over';
      } else {
        el.textContent = `⏱ ${fmtSecs(secs)}`;
        el.className = 'timer-deadline' + (secs < 300 ? ' urgent' : '');
      }
    });
  }, 1000);
}

/* ── Birthday overlay ── */
async function checkBirthdays() {
  const bdays = await api('/api/children/birthdays');
  if (!bdays.length) return;
  const child = bdays[0];
  const av = document.getElementById('bdayAv');
  if (child.photo)
    av.innerHTML = `<img src="${child.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  else
    av.innerHTML = `<span style="font-size:56px">${child.avatar || '🎂'}</span>`;
  document.getElementById('bdayTitle').textContent = `🎂 יום הולדת שמח ${child.name}!`;
  document.getElementById('bdaySub').textContent   = `מלא/ה ${child.age}! שיהיה יום מדהים! 🎉🎊🌟`;
  document.getElementById('bdayOverlay').classList.add('show');
  confetti(); setTimeout(confetti, 900); setTimeout(confetti, 1800);
}
function closeBday() {
  document.getElementById('bdayOverlay').classList.remove('show');
}
