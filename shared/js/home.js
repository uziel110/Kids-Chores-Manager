/* ═══════════════════════════════════════════════
   home.js — Home screen, leaderboard, active runs
   Used by: init.js
═══════════════════════════════════════════════ */

async function goHome() {
  const leavingParent = document.getElementById('s-parent')?.classList.contains('active');
  if (leavingParent) S.parentAuthed = false;
  showScreen('home');
  await refreshHome();
}

async function refreshHome() {
  await Promise.all([renderChildren(), renderLeaderboard(), refreshActiveOnly()]);
}

async function renderChildren() {
  const kids = await api('/api/children');
  _allChildren = kids;
  const el = document.getElementById('childrenGrid');
  if (!kids.length) {
    el.innerHTML = `
      <div class="child-card child-card-placeholder" onclick="showParentLogin()">
        <div class="child-av-wrap" style="border-color:var(--border)">
          <span class="child-av-emoji" style="font-size:32px;opacity:.4">👤</span>
        </div>
        <div class="child-name" style="color:var(--muted)">הוסף ילד</div>
        <div class="child-pts" style="color:var(--muted)">פאנל הורים ←</div>
      </div>`;
    return;
  }
  el.innerHTML = kids.map(k => `
    <div class="child-card" onclick="openChores('${k.id}')" style="--cc:${k.color}">
      <div class="child-av-wrap" style="border-color:${k.color}">
        ${avatarHtml(k, 'child-av-emoji')}
      </div>
      <div class="child-name">${k.name}</div>
      <div class="child-pts">⭐ ${k.points || 0}</div>
    </div>`).join('');
}

async function renderLeaderboard() {
  const kids = await api('/api/leaderboard');
  const el   = document.getElementById('leaderboard');
  if (!kids.length) {
    el.innerHTML = '<div class="empty"><div class="empty-ico">🏆</div><p>אין ניקוד השבוע עדיין</p></div>';
    return;
  }
  const medals = ['🥇','🥈','🥉'];
  el.innerHTML = kids.map((k, i) => `
    <div class="lb-row">
      <span class="lb-rank">${medals[i] || (i + 1)}</span>
      <div class="lb-av">${avatarHtml(k)}</div>
      <span class="lb-name">${k.name}</span>
      <span class="lb-pts">⭐ ${k.weekly_points || 0}</span>
    </div>`).join('');
}

async function refreshActiveOnly() {
  const runs = await api('/api/runs/active');
  S.activeRuns = runs;
  const sec   = document.getElementById('activeSection');
  const lanes = document.getElementById('activeLanes');
  if (!runs.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';

  const byChild = {};
  for (const r of runs) {
    if (!byChild[r.child_id]) byChild[r.child_id] = { child: r.child, runs: [] };
    byChild[r.child_id].runs.push(r);
  }

  lanes.innerHTML = Object.values(byChild).map(({ child, runs: childRuns }) => {
    const chips = childRuns.map(r => {
      const waiting  = r.status === 'waiting_approval';
      const chore    = r.chore || {};
      const timerHtml = !waiting && r.deadline
        ? `<div class="timer-deadline" id="td-${r.id}" data-deadline="${r.deadline}">${deadlineStr(r.deadline)}</div>`
        : '';
      return `<div class="run-chip">
        <div class="run-chip-icon">${chore.icon || '⭐'}</div>
        <div class="run-chip-title">${chore.title || ''}</div>
        <div class="run-chip-status">
          ${timerHtml}
          <span class="status-badge ${waiting ? 'wa' : 'ip'}">${waiting ? '⏳ ממתין לאישור' : '▶ בתהליך'}</span>
        </div>
        <div class="run-actions">
          ${!waiting ? `<button class="btn-finish" onclick="finishRun('${r.id}')">✅ סיימתי!</button>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="lane-card">
      <div class="lane-header" style="border-bottom-color:${child.color || '#FF8C42'}20">
        <div class="lane-av">${avatarHtml(child)}</div>
        <div class="lane-name">${child.name || ''}</div>
      </div>
      <div class="lane-runs">${chips}</div>
    </div>`;
  }).join('');

  startTimers();
}
