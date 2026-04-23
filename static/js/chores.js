/* ═══════════════════════════════════════════════
   chores.js — Child chore screen, take/finish/release
   Used by: home.js (openChores), parent.js (via nav)
═══════════════════════════════════════════════ */

/* ── Navigate to child's chore screen ── */
async function openChores(childId) {
  const kids  = await api('/api/children');
  const child = kids.find(c => c.id === childId);
  S.currentChild = child;

  document.getElementById('choreHeader').innerHTML = `
    <div class="chore-header" style="--cc:${child.color}">
      <div class="chore-hav" style="border-color:${child.color}">${avatarHtml(child)}</div>
      <div class="chore-hinfo">
        <h2>מטלות עבור ${child.name}</h2>
        <div class="pts">⭐ ${child.points || 0} נקודות • גיל ${child.age}</div>
      </div>
      <button class="btn-rew-child" onclick="openChildRewards('${child.id}')">🎁 פרסים</button>
    </div>`;

  showScreen('chores');
  await Promise.all([loadChildActiveRuns(childId), loadChores(childId, 'הכל')]);
}

async function openChildRewards(childId) {
  showScreen('rewards');
  S.rewChildId = null;
  document.getElementById('rewChildPick').style.display = 'none';
  document.getElementById('rewContent').style.display   = 'block';
  await pickRewChild(childId);
}

/* ── Active runs on chore screen ── */
async function loadChildActiveRuns(childId) {
  const runs = await api(`/api/runs/for-child/${childId}`);
  const sec  = document.getElementById('childActiveSection');
  const grid = document.getElementById('childRunsGrid');
  if (!runs.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';

  grid.innerHTML = runs.map(r => {
    const waiting   = r.status === 'waiting_approval';
    const chore     = r.chore || {};
    const timerHtml = !waiting && r.deadline
      ? `<div class="timer-deadline" id="td-${r.id}" data-deadline="${r.deadline}">${deadlineStr(r.deadline)}</div>`
      : '';
    return `<div class="run-chip-child ${waiting ? 'waiting' : ''}">
      <div style="font-size:26px;margin-bottom:4px">${chore.icon || '⭐'}</div>
      <div style="font-size:14px;font-weight:800;margin-bottom:4px">${chore.title || ''}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
        ${timerHtml}
        <span class="status-badge ${waiting ? 'wa' : 'ip'}">${waiting ? '⏳ ממתין לאישור' : '▶ בתהליך'}</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${!waiting ? `<button class="btn-finish" onclick="finishRun('${r.id}')">✅ סיימתי!</button>` : ''}
        ${!waiting ? `<button class="btn-release" onclick="promptRelease('${r.id}')">🗑 שחרר</button>` : ''}
      </div>
    </div>`;
  }).join('');
  startTimers();
}

/* ── Empty-state based on time of day ── */
function noAvailableChoresHtml(unavailChores) {
  const h = new Date().getHours();
  let ico, greeting, sub;
  if      (h >= 21 || h < 6) { ico = '🌙'; greeting = 'לילה טוב! 😴';     sub = 'כבר מאוחר, לכו לישון ומחר תהיו אלופים!'; }
  else if (h < 9)             { ico = '☀️'; greeting = 'בוקר טוב!';         sub = 'קצת עוד מוקדם למטלות. בקרוב יהיה מה לעשות!'; }
  else if (h < 13)            { ico = '🌤️'; greeting = 'בוקר נהדר!';        sub = 'כרגע אין מטלות פנויות עבורך.'; }
  else if (h < 17)            { ico = '⛅'; greeting = 'צהריים טובים!';     sub = 'כרגע אין מטלות פנויות עבורך.'; }
  else                        { ico = '🌆'; greeting = 'ערב טוב!';          sub = 'כרגע אין מטלות פנויות עבורך.'; }

  let hintHtml = '';
  if (unavailChores?.length) {
    const nowMins    = new Date().getHours() * 60 + new Date().getMinutes();
    const timeLocked = unavailChores.filter(ch => !ch.time_available && !ch.taken_today && !ch.child_taking);
    let soonest = null;
    for (const ch of timeLocked) {
      try {
        const [sh, sm] = ch.time_start.split(':').map(Number);
        const startMins = sh * 60 + sm;
        const diff = startMins > nowMins ? startMins - nowMins : (24 * 60 - nowMins + startMins);
        if (soonest === null || diff < soonest.diff) soonest = { ch, diff };
      } catch (e) {}
    }
    if (soonest) {
      const diffH = Math.floor(soonest.diff / 60), diffM = soonest.diff % 60;
      let whenTxt = diffH > 0 ? `בעוד ${diffH} שעות ו-${diffM} דקות` : `בעוד ${diffM} דקות`;
      if (soonest.diff <= 2) whenTxt = 'עוד רגע!';
      hintHtml = `<div class="no-avail-hint">⏰ ${whenTxt} תוכל לקחת: ${soonest.ch.icon || '⭐'} ${soonest.ch.title}</div>`;
    }
  }

  return `<div class="no-avail-card">
    <span class="no-avail-ico">${ico}</span>
    <div class="no-avail-title">${greeting}</div>
    <div class="no-avail-sub">${sub}</div>
    ${hintHtml}
  </div>`;
}

/* ── Load & render chore cards ── */
async function loadChores(childId, filter = 'הכל') {
  const chores = await api(`/api/chores/for/${childId}`);
  const locs   = ['הכל', ...new Set(chores.map(c => c.location))];
  document.getElementById('filterTabs').innerHTML = locs.map(l =>
    `<button class="tab ${l === filter ? 'active' : ''}" onclick="loadChores('${childId}','${l}')">${l}</button>`
  ).join('');

  const filtered    = filter === 'הכל' ? chores : chores.filter(c => c.location === filter);
  const grid        = document.getElementById('choresGrid');

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty"><div class="empty-ico">🔍</div><p>אין מטלות בקטגוריה זו</p></div>';
    return;
  }

  const available   = filtered.filter(ch => ch.can_take);
  const unavailable = filtered.filter(ch => !ch.can_take);
  const byTime      = (a, b) => (a.time_start || '00:00').localeCompare(b.time_start || '00:00');
  available.sort(byTime);
  unavailable.sort(byTime);

  function choreCardHtml(ch) {
    const can      = ch.can_take, childTake = ch.child_taking;
    const notTime  = !ch.time_available, slotFull = !ch.slot_available, doneTday = ch.taken_today;
    let btn = '', reason = '', slotTxt = '';

    if      (childTake) btn     = '<div class="status-badge wa" style="margin-top:6px">⏳ כבר לוקח מטלה זו</div>';
    else if (doneTday)  btn     = '<div class="status-badge wa" style="margin-top:6px">✅ בוצעה היום</div>';
    else if (notTime)   reason  = `<div class="cc-reason">🕐 ${ch.time_reason}</div>`;
    else if (slotFull)  slotTxt = `<div class="cc-slot">👥 תפוס (${ch.active_count}/${ch.max_takers})</div>`;
    else                btn     = `<button class="btn-take" onclick="event.stopPropagation();askTake('${ch.id}')">✋ אני לוקח!</button>`;

    if (ch.max_takers === 0 && !slotFull) slotTxt = `<div class="cc-slot">👥 כל אחד יכול לקחת</div>`;
    else if (ch.max_takers > 1 && !slotFull) slotTxt = `<div class="cc-slot">👥 ${ch.active_count}/${ch.max_takers} לוקחים</div>`;

    const mpd = ch.max_per_child_per_day;
    if (mpd !== 1 && ch.child_daily_count > 0 && !childTake)
      slotTxt += `<div class="cc-slot" style="color:var(--teal)">🔁 עשיתה ${ch.child_daily_count} פעמים היום${mpd > 0 ? ` / ${mpd}` : ''}</div>`;

    const durHint = ch.duration_minutes ? `<span class="cc-tag">⏱ ${ch.duration_minutes} דק'</span>` : '';

    return `<div class="chore-card ${can ? 'can' : 'disabled'}" ${can ? `onclick="askTake('${ch.id}')"` : ''}>
      <div class="cc-icon">${ch.icon || '⭐'}</div>
      <div class="cc-title">${ch.title}</div>
      <div class="cc-meta">
        <span class="cc-tag">⭐ ${ch.points}</span>
        <span class="cc-tag">📍 ${ch.location}</span>
        <span class="cc-tag">🕐 ${ch.time_start}–${ch.time_end}</span>
        ${durHint}
      </div>
      ${reason}${slotTxt}${btn}
    </div>`;
  }

  let html = '';
  if (available.length > 0) {
    html += `<div class="chores-section-hdr" style="grid-column:1/-1">✅ מטלות זמינות עכשיו <span class="s-badge">${available.length}</span></div>`;
    html += available.map(choreCardHtml).join('');
  } else {
    html += noAvailableChoresHtml(unavailable);
  }
  if (unavailable.length > 0) {
    html += `<div class="section-divider"></div>`;
    html += `<div class="chores-section-hdr unavail" style="grid-column:1/-1">🔒 לא זמינות כרגע <span class="s-badge">${unavailable.length}</span></div>`;
    html += unavailable.map(choreCardHtml).join('');
  }
  grid.innerHTML = html;
}

/* ── Take / Finish / Release ── */
async function askTake(choreId) {
  const chores = await api('/api/chores');
  const ch = chores.find(c => c.id === choreId);
  S.currentChore = ch;
  document.getElementById('mConfEmoji').textContent = ch.icon || '⭐';
  document.getElementById('mConfTitle').textContent = ch.title;
  document.getElementById('mConfBody').innerHTML = `
    <div class="mc-row"><span class="mc-row-icon">📍</span><span>מיקום: <strong>${ch.location}</strong></span></div>
    <div class="mc-row"><span class="mc-row-icon">⭐</span><span>תרוויח <strong>${ch.points} נקודות</strong></span></div>
    <div class="mc-row"><span class="mc-row-icon">🕐</span><span>חלון לקיחה: <strong>${ch.time_start} – ${ch.time_end}</strong></span></div>
    <div class="mc-row"><span class="mc-row-icon">⏱</span><span>יש לך <strong>${ch.duration_minutes || 30} דקות</strong> לסיים</span></div>`;
  openM('m-confirm');
}

async function doTakeChore() {
  closeM('m-confirm');
  try {
    await api('/api/runs/start', 'POST', { child_id: S.currentChild.id, chore_id: S.currentChore.id });
    toast(`🎉 בהצלחה ${S.currentChild.name}! המטלה התחילה`, 'ok');
    await Promise.all([loadChildActiveRuns(S.currentChild.id), loadChores(S.currentChild.id, 'הכל'), refreshActiveOnly()]);
    await renderChildren();
  } catch (e) {
    document.getElementById('busyMsg').textContent = e.message || 'לא ניתן לקחת מטלה זו כרגע';
    openM('m-busy');
    await loadChores(S.currentChild.id, 'הכל');
  }
}

async function getRandomChore() {
  if (!S.currentChild) return;
  try {
    const ch = await api(`/api/chores/random/${S.currentChild.id}`);
    S.currentChore = ch;
    document.getElementById('mConfEmoji').textContent = ch.icon || '🎲';
    document.getElementById('mConfTitle').textContent = `המחשב בחר: ${ch.title}`;
    document.getElementById('mConfBody').innerHTML = `
      <div class="mc-row"><span class="mc-row-icon">📍</span><span>מיקום: <strong>${ch.location}</strong></span></div>
      <div class="mc-row"><span class="mc-row-icon">⭐</span><span>תרוויח <strong>${ch.points} נקודות</strong></span></div>
      <div class="mc-row"><span class="mc-row-icon">⏱</span><span>יש לך <strong>${ch.duration_minutes || 30} דקות</strong> לסיים</span></div>`;
    openM('m-confirm');
  } catch (e) { openM('m-nochores'); }
}

async function finishRun(runId) {
  await api(`/api/runs/${runId}/finish`, 'POST');
  toast('🎉 מטלה הסתיימה! ממתינה לאישור הורה', 'ok');
  if (S.currentChild) await loadChildActiveRuns(S.currentChild.id);
  await refreshActiveOnly();
}

function promptRelease(runId) {
  document.getElementById('releaseRunId').value = runId;
  openM('m-release');
}

async function doRelease() {
  const runId = document.getElementById('releaseRunId').value;
  closeM('m-release');
  await api(`/api/runs/${runId}/release`, 'POST');
  toast('מטלה שוחררה', 'ok');
  if (S.currentChild) await loadChildActiveRuns(S.currentChild.id);
  await refreshActiveOnly();
}
