/* ═══════════════════════════════════════════════
   stats.js — Statistics screen
   Used by: navbar
═══════════════════════════════════════════════ */

async function showStats() {
  showScreen('stats');
  const [stats, todayItems] = await Promise.all([
    api('/api/stats'),
    api('/api/runs/today-summary'),
  ]);

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

  const todayEl = document.getElementById('statsTodaySummary');
  if (!todayItems.length) {
    todayEl.innerHTML = '<div class="empty"><div class="empty-ico">📋</div><p>אין מטלות שבוצעו היום עדיין</p></div>';
    return;
  }

  const kids = await api('/api/children');
  todayEl.innerHTML = todayItems.map(item => {
    const ch     = item.chore;
    const mpd    = ch.max_per_child_per_day;
    const mpdTxt = mpd === 0 ? 'ללא הגבלה' : mpd === 1 ? 'פעם אחת' : `עד ${mpd} פעמים`;
    const rows   = item.by_child.map(e => {
      const child    = e.child;
      const av       = child.photo
        ? `<img src="${child.photo}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;">`
        : `<span style="font-size:18px">${child.avatar || '⭐'}</span>`;
      const countTxt = e.count > 1 ? `${e.count}× היום` : 'פעם אחת היום';
      return `<div class="today-child-row">${av}<span style="font-weight:700">${child.name || ''}</span><span class="today-count">${countTxt}</span></div>`;
    }).join('');
    return `<div class="today-card">
      <div class="today-chore-title">
        <span style="font-size:22px">${ch.icon || '⭐'}</span>
        <span>${ch.title}</span>
        <span class="today-total-badge">סה"כ: ${item.total}</span>
        <span style="font-size:11px;color:var(--muted);font-weight:600">${mpdTxt}</span>
      </div>${rows}</div>`;
  }).join('');
}
