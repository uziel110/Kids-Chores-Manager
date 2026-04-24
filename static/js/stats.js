/* ═══════════════════════════════════════════════
   stats.js — Statistics screen
   Used by: navbar
═══════════════════════════════════════════════ */

let _todayRuns   = [];
let _todayFilter = 'by_chore';

async function showStats() {
  showScreen('stats');
  const [stats, todayRuns] = await Promise.all([
    api('/api/stats'),
    api('/api/runs/today-detail'),
  ]);
  _todayRuns = todayRuns;

  const grid = document.getElementById('statsGrid');
  if (!stats.length) {
    grid.innerHTML = '<div class="empty"><p>אין נתונים עדיין</p></div>';
  } else {
    grid.innerHTML = stats.map(s => `
      <div class="stat-card" style="--cc:${s.color}">
        <div class="stat-name"><div class="stat-av">${avatarHtml(s)}</div>${s.name}</div>
        <div class="stat-row"><span>נקודות נוכחיות</span><span class="stat-val">⭐ ${s.points_current}</span></div>
        <div class="stat-row"><span>נקודות השבוע</span><span class="stat-val">⭐ ${s.weekly_points}</span></div>
        <div class="stat-row"><span>מטלות השבוע</span><span class="stat-val">${s.weekly_chores}</span></div>
        <div class="stat-row"><span>נקודות ממטלות סה"כ</span><span class="stat-val">⭐ ${s.total_points}</span></div>
        ${s.manual_delta !== 0
          ? `<div class="stat-row"><span>קיזוז/בונוס ידני</span>
             <span class="stat-val" style="color:${s.manual_delta > 0 ? 'var(--green)' : 'var(--red)'}">
               ${s.manual_delta > 0 ? '+' : ''}${s.manual_delta}</span></div>`
          : ''}
        <div class="stat-row"><span>מטלות סה"כ</span><span class="stat-val">${s.total_chores}</span></div>
      </div>`).join('');
  }

  renderTodayActivity();
}

function setTodayFilter(filter, btn) {
  _todayFilter = filter;
  document.querySelectorAll('.today-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTodayActivity();
}

function renderTodayActivity() {
  const el = document.getElementById('statsTodaySummary');
  if (!_todayRuns.length) {
    el.innerHTML = '<div class="empty"><div class="empty-ico">📋</div><p>אין מטלות שבוצעו היום עדיין</p></div>';
    return;
  }
  if (_todayFilter === 'by_chore') renderTodayByChore(el);
  else renderTodayByChild(el);
}

function _runTimingTxt(r) {
  if (r.status === 'in_progress') return `<span style="color:var(--teal)">▶ בתהליך</span>`;
  if (r.actual_minutes == null) return '';
  if (r.exceeded)
    return `<span style="color:var(--red);font-weight:700">⏰ ${r.actual_minutes} דק' (חרג ב-${r.actual_minutes - r.allocated_minutes} דק')</span>`;
  return `<span style="color:var(--green)">⏱ ${r.actual_minutes} דק'</span>`;
}

function _statusIcon(status) {
  if (status === 'done')             return '✅';
  if (status === 'waiting_approval') return '⏳';
  return '▶';
}

function _childAv(child, size = 26) {
  return child.photo
    ? `<img src="${child.photo}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;">`
    : `<span style="font-size:${size - 8}px">${child.avatar || '⭐'}</span>`;
}

function renderTodayByChore(el) {
  const byChore = {};
  for (const r of _todayRuns) {
    const cid = r.chore_id;
    if (!byChore[cid]) byChore[cid] = { chore: r.chore, runs: [] };
    byChore[cid].runs.push(r);
  }
  const groups = Object.values(byChore).sort((a, b) => b.runs.length - a.runs.length);

  el.innerHTML = groups.map(g => {
    const ch   = g.chore || {};
    const mpd  = ch.max_per_child_per_day;
    const mpdTxt = mpd === 0 ? 'ללא הגבלה' : mpd === 1 ? 'פעם אחת' : `עד ${mpd} פעמים`;
    const rows = g.runs.map(r => {
      const child   = r.child || {};
      const timeStr = fmtTime(r.started_at);
      return `<div class="today-child-row">
        ${_childAv(child)}
        <span style="font-weight:700;flex:1">${child.name || ''}</span>
        ${timeStr ? `<span class="today-time">${timeStr}</span>` : ''}
        <span class="today-dur">${_runTimingTxt(r)}</span>
        <span>${_statusIcon(r.status)}</span>
      </div>`;
    }).join('');
    return `<div class="today-card">
      <div class="today-chore-title">
        <span style="font-size:22px">${ch.icon || '⭐'}</span>
        <span>${ch.title || ''}</span>
        <span class="today-total-badge">סה"כ: ${g.runs.length}</span>
        <span style="font-size:11px;color:var(--muted);font-weight:600">${mpdTxt}</span>
      </div>${rows}
    </div>`;
  }).join('');
}

function renderTodayByChild(el) {
  const byChild = {};
  for (const r of _todayRuns) {
    const cid = r.child_id;
    if (!byChild[cid]) byChild[cid] = { child: r.child, runs: [] };
    byChild[cid].runs.push(r);
  }
  const groups = Object.values(byChild).sort((a, b) => b.runs.length - a.runs.length);

  el.innerHTML = groups.map(g => {
    const child = g.child || {};
    const color = child.color || 'var(--orange)';
    const rows  = g.runs.map(r => {
      const ch      = r.chore || {};
      const timeStr = fmtTime(r.started_at);
      return `<div class="today-child-row">
        <span style="font-size:18px">${ch.icon || '⭐'}</span>
        <span style="font-weight:700;flex:1">${ch.title || ''}</span>
        ${timeStr ? `<span class="today-time">${timeStr}</span>` : ''}
        <span class="today-dur">${_runTimingTxt(r)}</span>
        <span>${_statusIcon(r.status)}</span>
      </div>`;
    }).join('');
    return `<div class="today-card" style="border-right-color:${color}">
      <div class="today-chore-title">
        ${_childAv(child, 34)}
        <span style="font-weight:800;font-size:16px">${child.name || ''}</span>
        <span class="today-total-badge">סה"כ: ${g.runs.length}</span>
      </div>${rows}
    </div>`;
  }).join('');
}
