/* ═══════════════════════════════════════════════
   EMOJI DATA
═══════════════════════════════════════════════ */
const EMOJI_CATS = [
  { label:'🏠', name:'בית', emojis:['🍽️','🥄','🍳','🧹','🧽','🪣','🧺','🧴','🧻','🪥','🚿','🛁','🪤','🔧','🪜','🛏️','🪑','🚪','🪟','💡','🕯️','🛋️','📦','🗑️','🧯'] },
  { label:'🌿', name:'טבע', emojis:['🌱','🌻','🌸','🌿','🍃','💐','🌷','🌾','🍂','🍁','🌲','🎋','🪴','🐕','🐈','🐠','🐇','🐓','🐝','🦋'] },
  { label:'⭐', name:'כיף', emojis:['⭐','🌟','✨','🎯','🎉','🎊','🏆','🥇','🎁','💎','🦄','🌈','🎠','🎡','🎢','🎪','🎭','🎨','🎮','🕹️'] },
  { label:'🍎', name:'אוכל', emojis:['🍎','🍊','🍋','🍇','🍓','🥦','🥕','🥑','🍕','🍔','🌮','🍜','🍣','🧁','🍰','🍦','🍬','🍩','🥐','☕'] },
  { label:'⚽', name:'ספורט', emojis:['⚽','🏀','🎾','🏐','🥊','🏋️','🤸','🚴','🏊','🧘','⛷️','🎿','🛹','🏄','🤽','🧗','🏇','🥋','🏌️','🎣'] },
];
const KID_AVATARS = ['👦','👧','🧒','👶','🦁','🐯','🦊','🐸','🦋','🐬','🦕','🐉','🤖','👾','🧙','🧚','🧜','🦸','🧑‍🚀','🎅'];
const COLORS = ['#FF6B6B','#4ECDC4','#FFE66D','#A78BFA','#FF8C42','#4FC3F7','#FF6B9D','#66BB6A','#FF7043','#26C6DA'];

/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
const S = {
  currentChild: null,
  currentChore: null,
  activeRuns: [],
  ssTimer: null,
  SS_DELAY: 3*60*1000,
  parentAuthed: false,
  selAvatar: '⭐',
  selColor: '#FF8C42',
  selPhoto: null,
  rewChildId: null,
  selDays: new Set(),
  emojiCatIdx: 0,
  choreSortCol: 'title',
  choreSortDir: 'asc',
  rewSortCol: 'points_cost',
  rewSortDir: 'asc',
  childSortCol: 'name',
  childSortDir: 'asc',
};
let _allChores = [];
let _allRewards = [];
let _allRewardClaims = [];
let _allChildren = [];

const DAY_VALS  = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_HE_A  = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
async function init() {
  document.getElementById('cBirthdate').max = new Date().toISOString().split('T')[0];
  buildEmojiPicker();
  await refreshHome();
  setInterval(refreshActiveOnly, 30000);
  resetSS();
  ['click','keydown','touchstart'].forEach(e => document.addEventListener(e, resetSS));
  await checkBirthdays();
}

/* ═══════════════════════════════════════════════
   SCREEN HELPERS
═══════════════════════════════════════════════ */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('s-'+id).classList.add('active');
}

/* ═══════════════════════════════════════════════
   HOME
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
  const el   = document.getElementById('childrenGrid');
  if (!kids.length) {
    el.innerHTML = '<div class="empty"><div class="empty-ico">👶</div><p>הוסף ילדים מפאנל ההורים</p></div>';
    return;
  }
  el.innerHTML = kids.map(k => `
    <div class="child-card" onclick="openChores('${k.id}')" style="--cc:${k.color}">
      <div class="child-av-wrap" style="border-color:${k.color}">
        ${avatarHtml(k, 'child-av-emoji')}
      </div>
      <div class="child-name">${k.name}</div>
      <div class="child-pts">⭐ ${k.points||0}</div>
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
  el.innerHTML = kids.map((k,i) => `
    <div class="lb-row">
      <span class="lb-rank">${medals[i]||(i+1)}</span>
      <div class="lb-av">${avatarHtml(k)}</div>
      <span class="lb-name">${k.name}</span>
      <span class="lb-pts">⭐ ${k.weekly_points||0}</span>
    </div>`).join('');
}

async function refreshActiveOnly() {
  const runs = await api('/api/runs/active');
  S.activeRuns = runs;
  const sec   = document.getElementById('activeSection');
  const lanes = document.getElementById('activeLanes');
  if (!runs.length) { sec.style.display='none'; return; }
  sec.style.display = 'block';

  const byChild = {};
  for (const r of runs) {
    const cid = r.child_id;
    if (!byChild[cid]) byChild[cid] = { child: r.child, runs: [] };
    byChild[cid].runs.push(r);
  }

  lanes.innerHTML = Object.values(byChild).map(({ child, runs: childRuns }) => {
    const chips = childRuns.map(r => {
      const waiting = r.status === 'waiting_approval';
      const chore   = r.chore || {};
      const timerHtml = !waiting && r.deadline
        ? `<div class="timer-deadline" id="td-${r.id}" data-deadline="${r.deadline}">${deadlineStr(r.deadline)}</div>`
        : '';
      return `<div class="run-chip">
        <div class="run-chip-icon">${chore.icon||'⭐'}</div>
        <div class="run-chip-title">${chore.title||''}</div>
        <div class="run-chip-status">
          ${timerHtml}
          <span class="status-badge ${waiting?'wa':'ip'}">${waiting?'⏳ ממתין לאישור':'▶ בתהליך'}</span>
        </div>
        <div class="run-actions">
          ${!waiting ? `<button class="btn-finish" onclick="finishRun('${r.id}')">✅ סיימתי!</button>` : ''}
        </div>
      </div>`;
    }).join('');
    return `<div class="lane-card">
      <div class="lane-header" style="border-bottom-color:${child.color||'#FF8C42'}20">
        <div class="lane-av">${avatarHtml(child)}</div>
        <div class="lane-name">${child.name||''}</div>
      </div>
      <div class="lane-runs">${chips}</div>
    </div>`;
  }).join('');

  startTimers();
}

/* ═══════════════════════════════════════════════
   CHILD CHORE SCREEN
═══════════════════════════════════════════════ */
async function openChores(childId) {
  const kids  = await api('/api/children');
  const child = kids.find(c => c.id === childId);
  S.currentChild = child;

  document.getElementById('choreHeader').innerHTML = `
    <div class="chore-header" style="--cc:${child.color}">
      <div class="chore-hav" style="border-color:${child.color}">${avatarHtml(child)}</div>
      <div class="chore-hinfo">
        <h2>מטלות עבור ${child.name}</h2>
        <div class="pts">⭐ ${child.points||0} נקודות • גיל ${child.age}</div>
      </div>
      <button class="btn-rew-child" onclick="openChildRewards('${child.id}')">🎁 פרסים</button>
    </div>`;

  showScreen('chores');
  await Promise.all([loadChildActiveRuns(childId), loadChores(childId,'הכל')]);
}

async function openChildRewards(childId) {
  showScreen('rewards');
  S.rewChildId = null;
  document.getElementById('rewChildPick').style.display = 'none';
  document.getElementById('rewContent').style.display = 'block';
  await pickRewChild(childId);
}

async function loadChildActiveRuns(childId) {
  const runs = await api(`/api/runs/for-child/${childId}`);
  const sec  = document.getElementById('childActiveSection');
  const grid = document.getElementById('childRunsGrid');
  if (!runs.length) { sec.style.display='none'; return; }
  sec.style.display = 'block';

  grid.innerHTML = runs.map(r => {
    const waiting = r.status === 'waiting_approval';
    const chore   = r.chore || {};
    const timerHtml = !waiting && r.deadline
      ? `<div class="timer-deadline" id="td-${r.id}" data-deadline="${r.deadline}">${deadlineStr(r.deadline)}</div>`
      : '';
    return `<div class="run-chip-child ${waiting?'waiting':''}">
      <div style="font-size:26px;margin-bottom:4px">${chore.icon||'⭐'}</div>
      <div style="font-size:14px;font-weight:800;margin-bottom:4px">${chore.title||''}</div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
        ${timerHtml}
        <span class="status-badge ${waiting?'wa':'ip'}">${waiting?'⏳ ממתין לאישור':'▶ בתהליך'}</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${!waiting ? `<button class="btn-finish" onclick="finishRun('${r.id}')">✅ סיימתי!</button>` : ''}
        ${!waiting ? `<button class="btn-release" onclick="promptRelease('${r.id}')">🗑 שחרר</button>` : ''}
      </div>
    </div>`;
  }).join('');
  startTimers();
}

/* ═══════════════════════════════════════════════
   EMPTY STATE MESSAGE — based on time of day
═══════════════════════════════════════════════ */
function noAvailableChoresHtml(unavailChores) {
  const h = new Date().getHours();
  let ico, greeting, sub;
  if (h >= 21 || h < 6) {
    ico = '🌙'; greeting = 'לילה טוב! 😴'; sub = 'כבר מאוחר, לכו לישון ומחר תהיו אלופים!';
  } else if (h < 9) {
    ico = '☀️'; greeting = 'בוקר טוב!'; sub = 'קצת עוד מוקדם למטלות. בקרוב יהיה מה לעשות!';
  } else if (h < 13) {
    ico = '🌤️'; greeting = 'בוקר נהדר!'; sub = 'כרגע אין מטלות פנויות עבורך.';
  } else if (h < 17) {
    ico = '⛅'; greeting = 'צהריים טובים!'; sub = 'כרגע אין מטלות פנויות עבורך.';
  } else {
    ico = '🌆'; greeting = 'ערב טוב!'; sub = 'כרגע אין מטלות פנויות עבורך.';
  }

  let hintHtml = '';
  if (unavailChores && unavailChores.length > 0) {
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const timeLocked = unavailChores.filter(ch => !ch.time_available && !ch.taken_today && !ch.child_taking);
    if (timeLocked.length > 0) {
      let soonest = null;
      for (const ch of timeLocked) {
        try {
          const [sh, sm] = ch.time_start.split(':').map(Number);
          const startMins = sh * 60 + sm;
          const diff = startMins > nowMins ? startMins - nowMins : (24*60 - nowMins + startMins);
          if (soonest === null || diff < soonest.diff) soonest = { ch, diff };
        } catch(e){}
      }
      if (soonest) {
        const diffH = Math.floor(soonest.diff / 60);
        const diffM = soonest.diff % 60;
        let whenTxt = diffH > 0 ? `בעוד ${diffH} שעות ו-${diffM} דקות` : `בעוד ${diffM} דקות`;
        if (soonest.diff <= 2) whenTxt = 'עוד רגע!';
        hintHtml = `<div class="no-avail-hint">⏰ ${whenTxt} תוכל לקחת: ${soonest.ch.icon||'⭐'} ${soonest.ch.title}</div>`;
      }
    }
  }

  return `<div class="no-avail-card">
    <span class="no-avail-ico">${ico}</span>
    <div class="no-avail-title">${greeting}</div>
    <div class="no-avail-sub">${sub}</div>
    ${hintHtml}
  </div>`;
}

/* ═══════════════════════════════════════════════
   LOAD CHORES — sorted: available first, then unavailable
═══════════════════════════════════════════════ */
async function loadChores(childId, filter='הכל') {
  const chores = await api(`/api/chores/for/${childId}`);
  const locs   = ['הכל', ...new Set(chores.map(c => c.location))];
  document.getElementById('filterTabs').innerHTML = locs.map(l =>
    `<button class="tab ${l===filter?'active':''}" onclick="loadChores('${childId}','${l}')">${l}</button>`
  ).join('');

  const filtered = filter==='הכל' ? chores : chores.filter(c => c.location===filter);
  const grid = document.getElementById('choresGrid');

  if (!filtered.length) {
    grid.innerHTML = '<div class="empty"><div class="empty-ico">🔍</div><p>אין מטלות בקטגוריה זו</p></div>';
    return;
  }

  const available   = filtered.filter(ch => ch.can_take);
  const unavailable = filtered.filter(ch => !ch.can_take);

  function byTimeStart(a, b) {
    return (a.time_start||'00:00').localeCompare(b.time_start||'00:00');
  }
  available.sort(byTimeStart);
  unavailable.sort(byTimeStart);

  function choreCardHtml(ch) {
    const can       = ch.can_take;
    const childTake = ch.child_taking;
    const notTime   = !ch.time_available;
    const slotFull  = !ch.slot_available;
    const doneTday  = ch.taken_today;
    let btn='', reason='', slotTxt='';

    if (childTake)     btn = '<div class="status-badge wa" style="margin-top:6px">⏳ כבר לוקח מטלה זו</div>';
    else if (doneTday) btn = '<div class="status-badge wa" style="margin-top:6px">✅ בוצעה היום</div>';
    else if (notTime)  reason = `<div class="cc-reason">🕐 ${ch.time_reason}</div>`;
    else if (slotFull) slotTxt = `<div class="cc-slot">👥 תפוס (${ch.active_count}/${ch.max_takers})</div>`;
    else               btn = `<button class="btn-take" onclick="event.stopPropagation();askTake('${ch.id}')">✋ אני לוקח!</button>`;

    if (ch.max_takers === 0 && !slotFull)
      slotTxt = `<div class="cc-slot">👥 כל אחד יכול לקחת</div>`;
    else if (ch.max_takers > 1 && !slotFull)
      slotTxt = `<div class="cc-slot">👥 ${ch.active_count}/${ch.max_takers} לוקחים</div>`;

    const mpd = ch.max_per_child_per_day;
    if (mpd !== 1 && ch.child_daily_count > 0 && !childTake)
      slotTxt += `<div class="cc-slot" style="color:var(--teal)">🔁 עשיתה ${ch.child_daily_count} פעמים היום${mpd>0?` / ${mpd}`:''}</div>`;

    const durHint = ch.duration_minutes ? `<span class="cc-tag">⏱ ${ch.duration_minutes} דק'</span>` : '';

    return `<div class="chore-card ${can?'can':'disabled'}" ${can?`onclick="askTake('${ch.id}')"`:''}">
      <div class="cc-icon">${ch.icon||'⭐'}</div>
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
    html += `<div class="chores-section-hdr" style="grid-column:1/-1">
      ✅ מטלות זמינות עכשיו
      <span class="s-badge">${available.length}</span>
    </div>`;
    html += available.map(choreCardHtml).join('');
  } else {
    html += noAvailableChoresHtml(unavailable);
  }

  if (unavailable.length > 0) {
    html += `<div class="section-divider"></div>`;
    html += `<div class="chores-section-hdr unavail" style="grid-column:1/-1">
      🔒 לא זמינות כרגע
      <span class="s-badge">${unavailable.length}</span>
    </div>`;
    html += unavailable.map(choreCardHtml).join('');
  }

  grid.innerHTML = html;
}

/* ═══════════════════════════════════════════════
   ASK TAKE — beautiful confirm modal
═══════════════════════════════════════════════ */
async function askTake(choreId) {
  const chores = await api('/api/chores');
  const ch = chores.find(c => c.id===choreId);
  S.currentChore = ch;

  document.getElementById('mConfEmoji').textContent = ch.icon || '⭐';
  document.getElementById('mConfTitle').textContent = ch.title;
  document.getElementById('mConfBody').innerHTML = `
    <div class="mc-row"><span class="mc-row-icon">📍</span><span>מיקום: <strong>${ch.location}</strong></span></div>
    <div class="mc-row"><span class="mc-row-icon">⭐</span><span>תרוויח <strong>${ch.points} נקודות</strong></span></div>
    <div class="mc-row"><span class="mc-row-icon">🕐</span><span>חלון לקיחה: <strong>${ch.time_start} – ${ch.time_end}</strong></span></div>
    <div class="mc-row"><span class="mc-row-icon">⏱</span><span>יש לך <strong>${ch.duration_minutes||30} דקות</strong> לסיים</span></div>`;
  openM('m-confirm');
}

async function doTakeChore() {
  closeM('m-confirm');
  try {
    await api('/api/runs/start','POST',{child_id:S.currentChild.id, chore_id:S.currentChore.id});
    toast(`🎉 בהצלחה ${S.currentChild.name}! המטלה התחילה`, 'ok');
    await Promise.all([loadChildActiveRuns(S.currentChild.id), loadChores(S.currentChild.id,'הכל'), refreshActiveOnly()]);
    await renderChildren();
  } catch(e) {
    const msg = e.message||'';
    document.getElementById('busyMsg').textContent = msg || 'לא ניתן לקחת מטלה זו כרגע';
    openM('m-busy');
    await loadChores(S.currentChild.id,'הכל');
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
      <div class="mc-row"><span class="mc-row-icon">⏱</span><span>יש לך <strong>${ch.duration_minutes||30} דקות</strong> לסיים</span></div>`;
    openM('m-confirm');
  } catch(e) {
    openM('m-nochores');
  }
}

async function finishRun(runId) {
  await api(`/api/runs/${runId}/finish`,'POST');
  toast('🎉 מטלה הסתיימה! ממתינה לאישור הורה','ok');
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
  await api(`/api/runs/${runId}/release`,'POST');
  toast('מטלה שוחררה','ok');
  if (S.currentChild) await loadChildActiveRuns(S.currentChild.id);
  await refreshActiveOnly();
}

/* ═══════════════════════════════════════════════
   TIMERS — countdown to deadline
═══════════════════════════════════════════════ */
function deadlineStr(deadlineIso) {
  const secs = Math.max(0, Math.floor((new Date(deadlineIso) - Date.now()) / 1000));
  return fmtSecs(secs);
}
function fmtSecs(s) {
  const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), ss=s%60;
  return h>0 ? `${h}:${pad(m)}:${pad(ss)}` : `${pad(m)}:${pad(ss)}`;
}
function pad(n){ return String(n).padStart(2,'0'); }

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

/* ═══════════════════════════════════════════════
   REWARDS
═══════════════════════════════════════════════ */
async function showRewards() {
  showScreen('rewards');
  S.rewChildId=null;
  document.getElementById('rewChildPick').style.display='block';
  document.getElementById('rewContent').style.display='none';
  const kids = await api('/api/children');
  document.getElementById('rewChildGrid').innerHTML = kids.map(k=>
    `<div class="child-card" onclick="pickRewChild('${k.id}')" style="--cc:${k.color}">
      <div class="child-av-wrap" style="border-color:${k.color}">${avatarHtml(k,'child-av-emoji')}</div>
      <div class="child-name">${k.name}</div>
      <div class="child-pts">⭐ ${k.points||0}</div>
    </div>`).join('');
}

async function pickRewChild(childId) {
  const kids  = await api('/api/children');
  const child = kids.find(c=>c.id===childId);
  S.rewChildId = childId;
  document.getElementById('rewChildPick').style.display='none';
  document.getElementById('rewContent').style.display='block';

  const fromChild = S.currentChild && S.currentChild.id === childId;
  document.getElementById('rewHeader').innerHTML=`
    <div class="chore-header" style="--cc:${child.color}">
      <div class="chore-hav" style="border-color:${child.color}">${avatarHtml(child)}</div>
      <div class="chore-hinfo">
        <h2>פרסים של ${child.name}</h2>
        <div class="pts">⭐ ${child.points||0} נקודות</div>
      </div>
      <button class="btn-back" style="margin:0" onclick="${fromChild ? `showScreen('chores')` : `backToRewPicker()`}">← חזרה</button>
    </div>`;

  const rewards = await api('/api/rewards');
  const allClaims = await api('/api/rewards/claims/all').catch(()=>[]);

  const available_rews = rewards.filter(r => r.available && isChildEligibleForReward(child, r));
  available_rews.sort((a,b) => {
    const mc_a = a.max_claims != null ? a.max_claims : 0;
    const mc_b = b.max_claims != null ? b.max_claims : 0;
    const sold_a = mc_a > 0 && allClaims.filter(c=>c.reward_id===a.id && c.status==='approved').length >= mc_a;
    const sold_b = mc_b > 0 && allClaims.filter(c=>c.reward_id===b.id && c.status==='approved').length >= mc_b;
    if (sold_a !== sold_b) return sold_a ? 1 : -1;
    return (a.points_cost||0) - (b.points_cost||0);
  });

  document.getElementById('rewardsGrid').innerHTML = available_rews.length ? available_rews.map(r=>{
    const mc = r.max_claims != null ? r.max_claims : 0;
    const approvedCount = Array.isArray(allClaims) ? allClaims.filter(c=>c.reward_id===r.id && c.status==='approved').length : 0;
    const limitReached = mc > 0 && approvedCount >= mc;
    const hasPoints = (child.points||0) >= r.points_cost;
    const canClaim = hasPoints && !limitReached;
    const cardClass = limitReached ? 'soldout' : (canClaim ? 'can' : 'no');
    const onclick = canClaim ? `onclick="claimRew('${r.id}')"` : '';
    const imgHtml = r.photo
      ? `<img src="${r.photo}" class="rew-photo" alt="">`
      : `<div class="rew-icon">${r.icon||'🎁'}</div>`;
    return `<div class="rew-card ${cardClass}" ${onclick}>
      ${imgHtml}
      <div class="rew-title">${r.title}</div>
      <div class="rew-cost">⭐ ${r.points_cost}</div>
      ${limitReached
          ? '<div style="color:#ff4d4d;font-size:12px;font-weight:700">🚫 אזל מהמלאי</div>'
          : (hasPoints
              ? `<button class="btn-claim" onclick="event.stopPropagation();claimRew('${r.id}')">🎁 אני רוצה!</button>`
              : '<div style="color:var(--muted);font-size:12px;font-weight:700">❌ אין מספיק נקודות</div>'
            )
      }
    </div>`;
  }).join('')
  : '<div class="empty"><div class="empty-ico">🎁</div><p>אין פרסים זמינים עבורך כרגע</p></div>';
}

function backToRewPicker() {
  document.getElementById('rewChildPick').style.display='block';
  document.getElementById('rewContent').style.display='none';
}

async function claimRew(rewId) {
  try {
    await api(`/api/rewards/${rewId}/claim`,'POST',{child_id:S.rewChildId});
    toast('🎉 פרס נדרש! ממתין לאישור הורה','ok');
    pickRewChild(S.rewChildId);
  } catch(e) { toast(e.message||'שגיאה','err'); }
}

/* ═══════════════════════════════════════════════
   STATS + TODAY SUMMARY
═══════════════════════════════════════════════ */
async function showStats() {
  showScreen('stats');
  const [stats, todayItems] = await Promise.all([
    api('/api/stats'),
    api('/api/runs/today-summary')
  ]);
  const grid = document.getElementById('statsGrid');
  if (!stats.length) { grid.innerHTML='<div class="empty"><p>אין נתונים עדיין</p></div>'; }
  else grid.innerHTML = stats.map(s=>`
    <div class="stat-card" style="--cc:${s.color}">
      <div class="stat-name"><div class="stat-av">${avatarHtml(s)}</div>${s.name}</div>
      <div class="stat-row"><span>נקודות נוכחיות</span><span class="stat-val">⭐ ${s.points_current}</span></div>
      <div class="stat-row"><span>נקודות השבוע</span><span class="stat-val">⭐ ${s.weekly_points}</span></div>
      <div class="stat-row"><span>מטלות השבוע</span><span class="stat-val">${s.weekly_chores}</span></div>
      <div class="stat-row"><span>נקודות ממטלות סה"כ</span><span class="stat-val">⭐ ${s.total_points}</span></div>
      ${s.manual_delta !== 0 ? `<div class="stat-row"><span>קיזוז/בונוס ידני</span><span class="stat-val" style="color:${s.manual_delta>0?'var(--green)':'var(--red)'}">${s.manual_delta>0?'+':''}${s.manual_delta}</span></div>` : ''}
      <div class="stat-row"><span>מטלות סה"כ</span><span class="stat-val">${s.total_chores}</span></div>
    </div>`).join('');

  const todayEl = document.getElementById('statsTodaySummary');
  if (!todayItems.length) {
    todayEl.innerHTML = '<div class="empty"><div class="empty-ico">📋</div><p>אין מטלות שבוצעו היום עדיין</p></div>';
  } else {
    const kids = await api('/api/children');
    const cm = Object.fromEntries(kids.map(k=>[k.id,k]));
    todayEl.innerHTML = todayItems.map(item => {
      const ch = item.chore;
      const mpd = ch.max_per_child_per_day;
      const mpdTxt = mpd===0 ? 'ללא הגבלה' : mpd===1 ? 'פעם אחת' : `עד ${mpd} פעמים`;
      const rows = item.by_child.map(e => {
        const child = e.child;
        const av = child.photo
          ? `<img src="${child.photo}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;">`
          : `<span style="font-size:18px">${child.avatar||'⭐'}</span>`;
        const countTxt = e.count > 1 ? `${e.count}× היום` : 'פעם אחת היום';
        return `<div class="today-child-row">${av}<span style="font-weight:700">${child.name||''}</span><span class="today-count">${countTxt}</span></div>`;
      }).join('');
      return `<div class="today-card">
        <div class="today-chore-title">
          <span style="font-size:22px">${ch.icon||'⭐'}</span>
          <span>${ch.title}</span>
          <span class="today-total-badge">סה"כ: ${item.total}</span>
          <span style="font-size:11px;color:var(--muted);font-weight:600">${mpdTxt}</span>
        </div>${rows}</div>`;
    }).join('');
  }
}

/* ═══════════════════════════════════════════════
   PARENT PANEL
═══════════════════════════════════════════════ */
function showParentLogin() {
  const alreadyInParent = document.getElementById('s-parent')?.classList.contains('active');
  if (S.parentAuthed && alreadyInParent) {
    showScreen('parent');
    loadApprovals();
    return;
  }
  document.getElementById('pwInput').value='';
  document.getElementById('pwErr').style.display='none';
  openM('m-pw');
}

async function verifyPw() {
  const pw = document.getElementById('pwInput').value;
  try {
    await api('/api/auth/verify','POST',{password:pw});
    closeM('m-pw');
    S.parentAuthed = true;
    showScreen('parent');
    loadApprovals();
  } catch(e) { document.getElementById('pwErr').style.display='block'; }
}

function parTab(name, btn) {
  document.querySelectorAll('.par-tab').forEach(t=>t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('[id^="pt-"]').forEach(t=>t.style.display='none');
  document.getElementById('pt-'+name).style.display='block';
  if (name==='appr')    loadApprovals();
  if (name==='children')loadChildTable();
  if (name==='chores')  loadChoreTable();
  if (name==='rewards') loadRewardTable();
}

async function loadApprovals() {
  const runs    = await api('/api/runs/active');
  const waiting = runs.filter(r=>r.status==='waiting_approval');
  const inProg  = runs.filter(r=>r.status==='in_progress');

  document.getElementById('pendAppr').innerHTML = waiting.length ? waiting.map(r=>`
    <div class="appr-card">
      <div style="font-size:26px">${r.chore?.icon||'⭐'}</div>
      <div class="appr-info">
        <div class="appr-name">${r.child?.avatar||''} ${r.child?.name||''}</div>
        <div class="appr-sub">${r.chore?.title||''} • ⭐ ${r.chore?.points||0}</div>
      </div>
      <div class="appr-btns">
        <button class="btn-appr" onclick="approveRun('${r.id}')">✔ אשר</button>
        <button class="btn-rej"  onclick="rejectRun('${r.id}')">✖ דחה</button>
      </div>
    </div>`).join('')
    : '<div class="empty"><div class="empty-ico">✅</div><p>אין מטלות לאישור</p></div>';

  document.getElementById('parentActiveRuns').innerHTML = inProg.length ? inProg.map(r=>`
    <div class="appr-card">
      <div style="font-size:26px">${r.chore?.icon||'⭐'}</div>
      <div class="appr-info">
        <div class="appr-name">${r.child?.avatar||''} ${r.child?.name||''}</div>
        <div class="appr-sub">${r.chore?.title||''} • ▶ בתהליך</div>
      </div>
      <div class="appr-btns">
        <button class="btn-rej" onclick="parentRelease('${r.id}')">🗑 שחרר</button>
      </div>
    </div>`).join('')
    : '<div class="empty"><div class="empty-ico">🎯</div><p>אין מטלות פעילות</p></div>';

  const claims = await api('/api/rewards/claims/pending');
  document.getElementById('pendRew').innerHTML = claims.length ? claims.map(c=>`
    <div class="appr-card">
      <div style="font-size:26px">${c.reward?.icon||'🎁'}</div>
      <div class="appr-info">
        <div class="appr-name">${c.child?.avatar||''} ${c.child?.name||''}</div>
        <div class="appr-sub">${c.reward?.title||''} • ⭐ ${c.reward?.points_cost||0}</div>
      </div>
      <div class="appr-btns">
        <button class="btn-appr" onclick="approveClaim('${c.id}')">✔ אשר</button>
        <button class="btn-rej"  onclick="cancelClaim('${c.id}')">✖ בטל</button>
      </div>
    </div>`).join('')
    : '<div class="empty"><div class="empty-ico">🎁</div><p>אין פרסים לאישור</p></div>';
}

async function approveRun(id) {
  await api(`/api/runs/${id}/approve`,'POST');
  confetti(); toast('✅ מטלה אושרה! נקודות נוספו 🌟','ok');
  await loadApprovals(); await refreshHome();
}
async function rejectRun(id) {
  await api(`/api/runs/${id}/reject`,'POST');
  toast('❌ מטלה נדחתה','err'); await loadApprovals();
}
async function parentRelease(id) {
  await api(`/api/runs/${id}/release`,'POST');
  toast('מטלה שוחררה','ok'); await loadApprovals();
}
async function approveClaim(id) {
  await api(`/api/rewards/claims/${id}/approve`,'POST');
  toast('🎁 פרס אושר!','ok'); await loadApprovals(); await refreshHome();
}
async function cancelClaim(id) {
  await api(`/api/rewards/claims/${id}/cancel`,'POST');
  toast('❌ פרס בוטל – הנקודות הוחזרו','ok'); await loadApprovals(); await refreshHome();
}

/* ──── Children CRUD ──────────────────────── */
async function loadChildTable() {
  _allChildren = await api('/api/children');
  renderChildTable();
}

function sortChildTable(col, thEl) {
  if (S.childSortCol === col) {
    S.childSortDir = S.childSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    S.childSortCol = col;
    S.childSortDir = 'asc';
  }
  document.querySelectorAll('#pt-children .mgr-table th').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
  });
  thEl.classList.add(S.childSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  renderChildTable();
}

function renderChildTable() {
  const list = [..._allChildren];
  list.sort((a,b) => {
    let av = a[S.childSortCol] ?? '';
    let bv = b[S.childSortCol] ?? '';
    if (typeof av === 'number') return S.childSortDir==='asc' ? av-bv : bv-av;
    return S.childSortDir==='asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
  document.getElementById('childTable').innerHTML = list.map(k=>`
    <tr>
      <td style="font-size:22px;width:40px">${k.photo ? `<img src="${k.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">` : (k.avatar||'⭐')}</td>
      <td><strong>${k.name}</strong></td>
      <td>${k.birthdate||''}</td>
      <td>${k.age}</td>
      <td><strong style="color:var(--orange)">⭐ ${k.points||0}</strong></td>
      <td>
        <button class="btn-sm" style="border-color:var(--purple);color:var(--purple)" onclick='openPtsModal(${JSON.stringify(k)})'>⭐ נקודות</button>
        <button class="btn-sm ed" onclick='editChild(${JSON.stringify(k)})'>✏️ ערוך</button>
        <button class="btn-sm dl" onclick="delChild('${k.id}','${k.name}')">🗑</button>
      </td>
    </tr>`).join('');
}

/* ──── Points adjust modal ────────────────────────── */
const QUICK_DELTAS = [1, 2, 5, 10, -1, -2, -5, -10];
let _ptsChildId = null;
let _ptsSign    = 1;
let _ptsCurrent = 0;

async function openPtsModal(child) {
  _ptsChildId = child.id;
  _ptsCurrent = child.points || 0;
  _ptsSign    = 1;

  const avEl = document.getElementById('ptsAv');
  avEl.innerHTML = child.photo
    ? `<img src="${child.photo}" alt="">`
    : `<span>${child.avatar||'⭐'}</span>`;
  document.getElementById('ptsName').textContent    = child.name;
  document.getElementById('ptsCurrent').textContent = `⭐ ${_ptsCurrent} נקודות כרגע`;

  document.getElementById('ptsSignPos').className = 'pts-sign active-pos';
  document.getElementById('ptsSignNeg').className = 'pts-sign';

  document.getElementById('ptsQuick').innerHTML = QUICK_DELTAS.map(d => {
    const cls = d > 0 ? 'pos' : 'neg';
    const lbl = d > 0 ? `+${d}` : `${d}`;
    return `<button class="pts-quick-btn ${cls}" onclick="applyQuickDelta(${d})">${lbl}</button>`;
  }).join('');

  document.getElementById('ptsAmount').value  = '';
  document.getElementById('ptsReason').value  = '';
  updatePtsPreview();

  await loadPtsHistory(child.id);
  openM('m-pts');
}

async function loadPtsHistory(childId) {
  try {
    const data = await api('/api/points-history/' + childId);
    const hist = document.getElementById('ptsHist');
    if (!data.length) {
      hist.innerHTML = '<div style="text-align:center;padding:10px;color:var(--muted);font-size:12px">אין היסטוריה עדיין</div>';
      return;
    }
    hist.innerHTML = data.map(h => {
      const pos = h.points >= 0;
      const d   = new Date(h.date);
      const dt  = `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      return `<div class="pts-hist-row">
        <span class="pts-hist-delta ${pos?'pos':'neg'}">${pos?'+':''}${h.points}</span>
        <span class="pts-hist-reason">${h.reason||''}</span>
        <span class="pts-hist-date">${dt}</span>
      </div>`;
    }).join('');
  } catch(e) {
    document.getElementById('ptsHist').innerHTML = '';
  }
}

function setPtsSign(s) {
  _ptsSign = s;
  document.getElementById('ptsSignPos').className = 'pts-sign' + (s===1?' active-pos':'');
  document.getElementById('ptsSignNeg').className = 'pts-sign' + (s===-1?' active-neg':'');
  updatePtsPreview();
}

function updatePtsPreview() {
  const amt = parseInt(document.getElementById('ptsAmount').value) || 0;
  const el  = document.getElementById('ptsPreview');
  if (!amt) { el.textContent = 'בחר כמות נקודות'; el.className='pts-preview'; return; }
  const delta    = _ptsSign * amt;
  const newTotal = Math.max(0, _ptsCurrent + delta);
  const arrow    = delta > 0 ? '⬆️' : '⬇️';
  el.innerHTML   = `${arrow} תהיה: <span>${newTotal} נקודות</span> (${delta>0?'+':''}${delta})`;
  el.className   = 'pts-preview ' + (delta > 0 ? 'will-add' : 'will-sub');
}

async function applyQuickDelta(delta) {
  document.getElementById('ptsAmount').value = Math.abs(delta);
  _ptsSign = delta > 0 ? 1 : -1;
  document.getElementById('ptsSignPos').className = 'pts-sign' + (_ptsSign===1?' active-pos':'');
  document.getElementById('ptsSignNeg').className = 'pts-sign' + (_ptsSign===-1?' active-neg':'');
  document.getElementById('ptsReason').value = '';
  updatePtsPreview();
  await doAdjustPoints();
}

async function doAdjustPoints() {
  const amt = parseInt(document.getElementById('ptsAmount').value);
  if (!amt || amt <= 0) { toast('הכנס כמות נקודות חיובית','err'); return; }
  const delta  = _ptsSign * amt;
  const reason = document.getElementById('ptsReason').value.trim() || (
    delta > 0 ? `הוספה ידנית (${delta}+)` : `קיזוז ידני (${delta})`
  );
  try {
    const updated = await api(`/api/children/${_ptsChildId}/adjust-points`, 'POST', { delta, reason });
    _ptsCurrent = updated.points;
    document.getElementById('ptsCurrent').textContent = `⭐ ${_ptsCurrent} נקודות כרגע`;
    document.getElementById('ptsAmount').value = '';
    document.getElementById('ptsReason').value = '';
    updatePtsPreview();
    toast(delta > 0 ? `➕ ${delta} נקודות נוספו 🌟` : `➖ ${Math.abs(delta)} נקודות הופחתו`, 'ok');
    await loadPtsHistory(_ptsChildId);
    _allChildren = _allChildren.map(c => c.id===_ptsChildId ? {...c, points: updated.points} : c);
    renderChildTable();
    await refreshHome();
  } catch(e) { toast(e.message || 'שגיאה', 'err'); }
}

function initAvPicker(sel) {
  S.selAvatar = sel||'⭐';
  document.getElementById('avPicker').innerHTML = KID_AVATARS.map(a=>
    `<span class="av-opt ${a===S.selAvatar?'sel':''}" onclick="selAv('${a}')">${a}</span>`).join('');
}
function initColPicker(sel) {
  S.selColor = sel||'#FF8C42';
  document.getElementById('colPicker').innerHTML = COLORS.map(c=>
    `<div class="col-opt ${c===S.selColor?'sel':''}" style="background:${c}" onclick="selCol('${c}')"></div>`).join('');
}
function selAv(a) {
  S.selAvatar=a;
  document.querySelectorAll('.av-opt').forEach(e=>e.classList.remove('sel'));
  event.target.classList.add('sel');
  S.selPhoto=null;
  document.getElementById('cPhoto').value='';
  updateChildPreview();
}
function selCol(c) {
  S.selColor=c;
  document.querySelectorAll('.col-opt').forEach(e=>e.classList.remove('sel'));
  event.target.classList.add('sel');
}

function updateChildPreview() {
  const prev = document.getElementById('childPhotoPreview');
  if (S.selPhoto) {
    prev.innerHTML=`<img src="${S.selPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    prev.innerHTML = `<span style="font-size:36px">${S.selAvatar||'⭐'}</span>`;
    prev.className = 'photo-emoji-preview';
  }
}

function onPhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    S.selPhoto = ev.target.result;
    document.getElementById('cPhoto').value = S.selPhoto;
    updateChildPreview();
  };
  reader.readAsDataURL(file);
}
function clearPhoto() {
  S.selPhoto=null;
  document.getElementById('cPhoto').value='';
  document.getElementById('photoFileInput').value='';
  updateChildPreview();
}

function selGender(g) {
  document.getElementById('cGender').value = g;
  document.querySelectorAll('.gender-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.gender === g);
  });
}

function showAddChild() {
  document.getElementById('childMTitle').textContent='הוסף ילד';
  document.getElementById('editChildId').value='';
  document.getElementById('cName').value='';
  document.getElementById('cBirthdate').value='';
  S.selPhoto=null;
  document.getElementById('cPhoto').value='';
  selGender('');
  initAvPicker('⭐'); initColPicker('#FF8C42'); updateChildPreview();
  openM('m-child');
}
function editChild(k) {
  document.getElementById('childMTitle').textContent='ערוך ילד';
  document.getElementById('editChildId').value=k.id;
  document.getElementById('cName').value=k.name;
  document.getElementById('cBirthdate').value=k.birthdate||'';
  S.selPhoto = k.photo||null;
  document.getElementById('cPhoto').value=S.selPhoto||'';
  selGender(k.gender||'');
  initAvPicker(k.avatar); initColPicker(k.color); updateChildPreview();
  openM('m-child');
}
async function saveChild() {
  const id=document.getElementById('editChildId').value;
  const data={
    name:document.getElementById('cName').value,
    birthdate:document.getElementById('cBirthdate').value,
    avatar:S.selAvatar, color:S.selColor,
    photo:S.selPhoto||null,
    gender:document.getElementById('cGender').value||'',
  };
  if (!data.name||!data.birthdate){toast('מלא שם ותאריך לידה','err');return;}
  if (id) await api(`/api/children/${id}`,'PUT',data);
  else    await api('/api/children','POST',data);
  closeM('m-child'); toast('✅ נשמר!','ok');
  await loadChildTable(); await refreshHome();
}
async function delChild(id,name) {
  if (!confirm(`למחוק את ${name}?`))return;
  await api(`/api/children/${id}`,'DELETE');
  toast('נמחק','ok'); await loadChildTable(); await refreshHome();
}

/* ──── Chores CRUD ──────────────────────── */
function updateRepeatUI() {
  const rep = document.getElementById('chRepeat').value;
  const showDays = rep==='weekly'||rep==='every_n_weeks';
  document.getElementById('daysUI').style.display = showDays?'block':'none';
  document.getElementById('intervalUI').style.display = rep==='every_n_weeks'?'block':'none';
  if (showDays) buildDaysBtns();
}
function buildDaysBtns() {
  document.getElementById('daysBtns').innerHTML = DAY_VALS.map((d,i)=>
    `<button type="button" class="day-btn ${S.selDays.has(d)?'sel':''}"
      onclick="toggleDay('${d}',this)">${DAY_HE_A[i]}</button>`).join('');
}
function toggleDay(d,btn) {
  S.selDays.has(d) ? (S.selDays.delete(d),btn.classList.remove('sel')) : (S.selDays.add(d),btn.classList.add('sel'));
}

async function loadChoreTable() {
  _allChores = await api('/api/chores');
  const locs = [...new Set(_allChores.map(c=>c.location))].sort();
  const locSel = document.getElementById('choreFilterLoc');
  const curLoc = locSel.value;
  locSel.innerHTML = '<option value="">כל המיקומים</option>' + locs.map(l=>`<option value="${l}" ${l===curLoc?'selected':''}>${l}</option>`).join('');
  renderChoreTable();
}

function choreSortBy(col, thEl) {
  if (S.choreSortCol === col) {
    S.choreSortDir = S.choreSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    S.choreSortCol = col;
    S.choreSortDir = 'asc';
  }
  document.querySelectorAll('#pt-chores .mgr-table th').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
  });
  thEl.classList.add(S.choreSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  renderChoreTable();
}

function renderChoreTable() {
  const search  = (document.getElementById('choreSearch')?.value||'').toLowerCase();
  const locF    = document.getElementById('choreFilterLoc')?.value||'';
  const enF     = document.getElementById('choreFilterEnabled')?.value||'';

  let list = _allChores.filter(c => {
    if (search && !c.title.toLowerCase().includes(search)) return false;
    if (locF && c.location !== locF) return false;
    const enabled = c.enabled !== false;
    if (enF === '1' && !enabled) return false;
    if (enF === '0' && enabled) return false;
    return true;
  });

  const col = S.choreSortCol;
  const dir = S.choreSortDir;
  list.sort((a,b)=>{
    let av = a[col] ?? '';
    let bv = b[col] ?? '';
    if (col === 'enabled') {
      av = a.enabled !== false ? 1 : 0;
      bv = b.enabled !== false ? 1 : 0;
    }
    if (typeof av === 'number') return dir==='asc' ? av-bv : bv-av;
    return dir==='asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  document.getElementById('choreCount').textContent = `${list.length} / ${_allChores.length} מטלות`;

  document.getElementById('choreTable').innerHTML = list.map(c=>{
    const enabled = c.enabled !== false;
    const uid = 'tog-c-'+c.id;
    return `<tr class="${enabled?'':'disabled-row'}">
      <td>
        <label class="toggle-wrap" title="${enabled?'השבת מטלה':'הפעל מטלה'}">
          <span class="toggle-switch"><input type="checkbox" id="${uid}" ${enabled?'checked':''} onchange="toggleChore('${c.id}',this)"><span class="toggle-slider"></span></span>
        </label>
      </td>
      <td style="font-size:18px">${c.icon||'⭐'}</td>
      <td><strong>${c.title}</strong></td>
      <td>${c.location}</td>
      <td>⭐ ${c.points}</td>
      <td>${c.duration_minutes||30} דק'</td>
      <td>${c.min_age}–${c.max_age}</td>
      <td>${c.max_takers===0 ? 'כל אחד' : (c.max_takers||1)}</td>
      <td>
        <button class="btn-sm ed" onclick='editChore(${JSON.stringify(c)})'>✏️</button>
        <button class="btn-sm dl" onclick="delChore('${c.id}','${c.title}')">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

async function toggleChore(id, chk) {
  try {
    const res = await api(`/api/chores/${id}/toggle`,'POST');
    const ch = _allChores.find(c=>c.id===id);
    if (ch) ch.enabled = res.enabled;
    renderChoreTable();
    toast(res.enabled ? '✅ מטלה הופעלה' : '⏸ מטלה הושבתה', 'ok');
  } catch(e) { toast('שגיאה','err'); loadChoreTable(); }
}

function updateMaxTakersUI() {
  document.getElementById('maxTakersNumWrap').style.display =
    document.getElementById('chMaxTakersType').value==='specific' ? 'block' : 'none';
}
function updateMaxPerDayUI() {
  document.getElementById('maxPerDayNumWrap').style.display =
    document.getElementById('chMaxPerDay').value==='specific' ? 'block' : 'none';
}

function showAddChore() {
  document.getElementById('choreMTitle').textContent='הוסף מטלה';
  document.getElementById('editChoreId').value='';
  ['chTitle'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('chIcon').value='';
  document.getElementById('chPts').value='';
  document.getElementById('chDuration').value=30;
  document.getElementById('chMaxTakersType').value='one';
  document.getElementById('chMaxTakers').value=2;
  updateMaxTakersUI();
  document.getElementById('chMaxPerDay').value='1';
  document.getElementById('chMaxPerDayNum').value=2;
  updateMaxPerDayUI();
  document.getElementById('chMinAge').value=4;
  document.getElementById('chMaxAge').value=12;
  document.getElementById('chStart').value='08:00';
  document.getElementById('chEnd').value='20:00';
  document.getElementById('chRepeat').value='daily';
  document.getElementById('chGenderFilter').value='all';
  _populateChoreChildCheckboxes([]);
  S.selDays=new Set();
  document.getElementById('daysBtns').innerHTML='';
  updateRepeatUI();
  openM('m-chore');
}
function editChore(c) {
  document.getElementById('choreMTitle').textContent='ערוך מטלה';
  document.getElementById('editChoreId').value=c.id;
  document.getElementById('chTitle').value=c.title;
  document.getElementById('chIcon').value=c.icon||'';
  document.getElementById('chPts').value=c.points;
  document.getElementById('chDuration').value=c.duration_minutes||30;
  const mt = c.max_takers != null ? c.max_takers : 1;
  if (mt === 0) { document.getElementById('chMaxTakersType').value='all'; document.getElementById('chMaxTakers').value=2; }
  else if (mt === 1) { document.getElementById('chMaxTakersType').value='one'; document.getElementById('chMaxTakers').value=2; }
  else { document.getElementById('chMaxTakersType').value='specific'; document.getElementById('chMaxTakers').value=mt; }
  updateMaxTakersUI();
  const mpd = c.max_per_child_per_day != null ? c.max_per_child_per_day : 1;
  if (mpd === 0) { document.getElementById('chMaxPerDay').value='0'; document.getElementById('chMaxPerDayNum').value=2; }
  else if (mpd === 1) { document.getElementById('chMaxPerDay').value='1'; document.getElementById('chMaxPerDayNum').value=2; }
  else { document.getElementById('chMaxPerDay').value='specific'; document.getElementById('chMaxPerDayNum').value=mpd; }
  updateMaxPerDayUI();
  document.getElementById('chLoc').value=c.location;
  document.getElementById('chMinAge').value=c.min_age;
  document.getElementById('chMaxAge').value=c.max_age;
  document.getElementById('chStart').value=c.time_start;
  document.getElementById('chEnd').value=c.time_end;
  document.getElementById('chRepeat').value=c.repeat_type;
  S.selDays=new Set(c.repeat_days||[]);
  document.getElementById('chInterval').value=c.repeat_interval||2;
  document.getElementById('daysBtns').innerHTML='';
  updateRepeatUI();
  document.getElementById('chGenderFilter').value = c.gender_filter||'all';
  _populateChoreChildCheckboxes(c.allowed_child_ids||[]);
  openM('m-chore');
}
async function saveChore() {
  const id=document.getElementById('editChoreId').value;
  const takersType = document.getElementById('chMaxTakersType').value;
  let maxTakers;
  if (takersType === 'all') maxTakers = 0;
  else if (takersType === 'one') maxTakers = 1;
  else maxTakers = parseInt(document.getElementById('chMaxTakers').value) || 2;
  const mpdVal = document.getElementById('chMaxPerDay').value;
  let maxPerDay;
  if (mpdVal === '0') maxPerDay = 0;
  else if (mpdVal === '1') maxPerDay = 1;
  else maxPerDay = parseInt(document.getElementById('chMaxPerDayNum').value) || 2;
  const data={
    title:document.getElementById('chTitle').value,
    icon:document.getElementById('chIcon').value||'⭐',
    points:parseInt(document.getElementById('chPts').value),
    duration_minutes:parseInt(document.getElementById('chDuration').value)||30,
    max_takers:maxTakers, max_per_child_per_day:maxPerDay,
    location:document.getElementById('chLoc').value,
    min_age:parseInt(document.getElementById('chMinAge').value),
    max_age:parseInt(document.getElementById('chMaxAge').value),
    time_start:document.getElementById('chStart').value,
    time_end:document.getElementById('chEnd').value,
    repeat_type:document.getElementById('chRepeat').value,
    repeat_days:[...S.selDays],
    repeat_interval:parseInt(document.getElementById('chInterval').value)||1,
    gender_filter:document.getElementById('chGenderFilter').value||'all',
    allowed_child_ids:_getCheckedChildIds('chAllowedChildren'),
  };
  if (!data.title||!data.points){toast('מלא שם ונקודות','err');return;}
  if (id) await api(`/api/chores/${id}`,'PUT',data);
  else    await api('/api/chores','POST',data);
  closeM('m-chore'); closeEmojiPicker();
  toast('✅ נשמר!','ok'); await loadChoreTable();
}
async function delChore(id,title) {
  if (!confirm(`למחוק "${title}"?`))return;
  await api(`/api/chores/${id}`,'DELETE');
  toast('נמחק','ok'); await loadChoreTable();
}

/* ──── Rewards CRUD ──────────────────────── */
async function loadRewardTable() {
  _allRewards = await api('/api/rewards');
  _allRewardClaims = await api('/api/rewards/claims/all').catch(()=>[]);
  renderRewardTable();
}

function rewSortBy(col, thEl) {
  if (S.rewSortCol === col) {
    S.rewSortDir = S.rewSortDir === 'asc' ? 'desc' : 'asc';
  } else {
    S.rewSortCol = col;
    S.rewSortDir = 'asc';
  }
  document.querySelectorAll('#pt-rewards .mgr-table th').forEach(th => {
    th.classList.remove('sort-asc','sort-desc');
  });
  thEl.classList.add(S.rewSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  renderRewardTable();
}

function renderRewardTable() {
  const col = S.rewSortCol;
  const dir = S.rewSortDir;
  const list = [..._allRewards].sort((a,b)=>{
    let av = a[col] ?? 0;
    let bv = b[col] ?? 0;
    if (col === 'available') { av = a.available !== false ? 1 : 0; bv = b.available !== false ? 1 : 0; }
    if (typeof av === 'number') return dir==='asc' ? av-bv : bv-av;
    return dir==='asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  document.getElementById('rewardTable').innerHTML = list.map(r=>{
    const avail = r.available !== false;
    const mc = r.max_claims != null ? r.max_claims : 0;
    const approvedCount = Array.isArray(_allRewardClaims) ? _allRewardClaims.filter(c=>c.reward_id===r.id&&c.status==='approved').length : 0;
    let limitTxt = mc===0 ? 'ללא הגבלה' : mc===1 ? `פעם אחת (${approvedCount}/1)` : `${approvedCount}/${mc}`;
    const gf = r.gender_filter||'all';
    const al = r.allowed_child_ids||[];
    let audTxt = al.length ? 'ילדים ספציפיים' : gf==='boys' ? '👦 בנים' : gf==='girls' ? '👧 בנות' : '👨‍👩 כולם';
    const photoThumb = r.photo ? `<img src="${r.photo}" style="width:28px;height:28px;border-radius:6px;object-fit:cover;vertical-align:middle;"> ` : '';
    return `<tr class="${avail?'':'disabled-row'}">
      <td>
        <label class="toggle-wrap" title="${avail?'השבת פרס':'הפעל פרס'}">
          <span class="toggle-switch"><input type="checkbox" ${avail?'checked':''} onchange="toggleReward('${r.id}',this)"><span class="toggle-slider"></span></span>
        </label>
      </td>
      <td style="font-size:18px">${photoThumb}${r.icon||'🎁'}</td>
      <td><strong>${r.title}</strong></td>
      <td>⭐ ${r.points_cost}</td>
      <td style="font-size:12px;color:var(--muted)">${limitTxt}</td>
      <td><span class="rew-audience">${audTxt}</span></td>
      <td>
        <button class="btn-sm ed" onclick='editRew(${JSON.stringify(r)})'>✏️</button>
        <button class="btn-sm dl" onclick="delRew('${r.id}','${r.title}')">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

async function toggleReward(id, chk) {
  try {
    const res = await api(`/api/rewards/${id}/toggle`,'POST');
    const r = _allRewards.find(x=>x.id===id);
    if (r) r.available = res.available;
    renderRewardTable();
    toast(res.available ? '✅ פרס הופעל' : '⏸ פרס הושבת', 'ok');
  } catch(e) { toast('שגיאה','err'); await loadRewardTable(); }
}
function showAddReward() {
  document.getElementById('rewMTitle').textContent='הוסף פרס';
  document.getElementById('editRewId').value='';
  ['rTitle','rIcon','rCost'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('rMaxClaims').value='0';
  document.getElementById('rMaxClaimsNum').value=2;
  document.getElementById('rGenderFilter').value='all';
  clearRewPhoto();
  _populateRewChildCheckboxes([]);
  updateMaxClaimsUI();
  openM('m-reward');
}
function editRew(r) {
  document.getElementById('rewMTitle').textContent='ערוך פרס';
  document.getElementById('editRewId').value=r.id;
  document.getElementById('rTitle').value=r.title;
  document.getElementById('rIcon').value=r.icon||'🎁';
  document.getElementById('rCost').value=r.points_cost;
  const mc = r.max_claims != null ? r.max_claims : 0;
  if (mc===0) { document.getElementById('rMaxClaims').value='0'; }
  else if (mc===1) { document.getElementById('rMaxClaims').value='1'; }
  else { document.getElementById('rMaxClaims').value='specific'; document.getElementById('rMaxClaimsNum').value=mc; }
  updateMaxClaimsUI();
  document.getElementById('rGenderFilter').value = r.gender_filter||'all';
  _populateRewChildCheckboxes(r.allowed_child_ids||[]);
  const photo = r.photo||null;
  document.getElementById('rPhoto').value = photo||'';
  const prev = document.getElementById('rewPhotoPreview');
  if (photo) {
    prev.innerHTML = `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    prev.innerHTML = r.icon||'🎁';
  }
  openM('m-reward');
}
function updateMaxClaimsUI() {
  const v = document.getElementById('rMaxClaims').value;
  document.getElementById('maxClaimsNumWrap').style.display = v==='specific' ? 'block' : 'none';
  const hints = {'0':'כל ילד יכול לבקש את הפרס כמה פעמים שרוצה', '1':'הפרס יינתן רק פעם אחת בסה"כ', 'specific':''};
  document.getElementById('maxClaimsHint').textContent = hints[v]||'';
}
async function saveReward() {
  const id=document.getElementById('editRewId').value;
  const mcVal = document.getElementById('rMaxClaims').value;
  let maxClaims;
  if (mcVal==='0') maxClaims=0;
  else if (mcVal==='1') maxClaims=1;
  else maxClaims=parseInt(document.getElementById('rMaxClaimsNum').value)||2;
  const data={title:document.getElementById('rTitle').value,
    icon:document.getElementById('rIcon').value||'🎁',
    points_cost:parseInt(document.getElementById('rCost').value),
    max_claims:maxClaims,
    gender_filter:document.getElementById('rGenderFilter').value||'all',
    allowed_child_ids:_getCheckedChildIds('rAllowedChildren'),
    photo:document.getElementById('rPhoto').value||null,
  };
  if (!data.title||!data.points_cost){toast('מלא שם ועלות','err');return;}
  if (id) await api(`/api/rewards/${id}`,'PUT',data);
  else    await api('/api/rewards','POST',data);
  closeM('m-reward'); toast('✅ נשמר!','ok'); await loadRewardTable();
}
async function delRew(id,title) {
  if (!confirm(`למחוק "${title}"?`))return;
  await api(`/api/rewards/${id}`,'DELETE');
  toast('נמחק','ok'); await loadRewardTable();
}

/* ──── Data ──────────────────────── */
function exportData() { window.location.href='/api/export'; }
async function importData(e) {
  const file=e.target.files[0]; if (!file)return;
  try {
    const data=JSON.parse(await file.text());
    await api('/api/import','POST',data);
    toast('✅ נתונים יובאו!','ok'); await refreshHome();
  } catch(err) { toast('שגיאה בייבוא','err'); }
}
async function changePw() {
  const np=document.getElementById('newPw').value;
  if (!np){toast('הכנס סיסמה חדשה','err');return;}
  const op=prompt('הכנס את הסיסמה הנוכחית:'); if (!op)return;
  try {
    await api('/api/auth/change-password','POST',{old_password:op,new_password:np});
    toast('✅ סיסמה שונתה!','ok'); document.getElementById('newPw').value='';
  } catch(e) { toast('סיסמה נוכחית שגויה','err'); }
}

/* ═══════════════════════════════════════════════
   CHORE / REWARD TARGET AUDIENCE HELPERS
═══════════════════════════════════════════════ */
function updateChoreTargetUI() { /* no extra action needed */ }
function updateRewTargetUI()   { /* no extra action needed */ }

async function _populateChoreChildCheckboxes(selectedIds) {
  const kids = _allChildren.length ? _allChildren : await api('/api/children');
  const container = document.getElementById('chAllowedChildren');
  if (!kids.length) {
    container.innerHTML = '<span class="child-checkboxes-empty">אין ילדים רשומים</span>';
    return;
  }
  container.innerHTML = kids.map(k => `
    <label class="child-check-lbl">
      <input type="checkbox" value="${k.id}" ${selectedIds.includes(k.id)?'checked':''}>
      <span>${k.photo?`<img src="${k.photo}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">`:k.avatar||'⭐'} ${k.name}</span>
    </label>`).join('');
}

async function _populateRewChildCheckboxes(selectedIds) {
  const kids = _allChildren.length ? _allChildren : await api('/api/children');
  const container = document.getElementById('rAllowedChildren');
  if (!kids.length) {
    container.innerHTML = '<span class="child-checkboxes-empty">אין ילדים רשומים</span>';
    return;
  }
  container.innerHTML = kids.map(k => `
    <label class="child-check-lbl">
      <input type="checkbox" value="${k.id}" ${selectedIds.includes(k.id)?'checked':''}>
      <span>${k.photo?`<img src="${k.photo}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">`:k.avatar||'⭐'} ${k.name}</span>
    </label>`).join('');
}

function _getCheckedChildIds(containerId) {
  return [...document.querySelectorAll(`#${containerId} input[type=checkbox]:checked`)]
    .map(cb => cb.value);
}

function isChildEligibleForReward(child, rew) {
  const allowed = rew.allowed_child_ids || [];
  if (allowed.length) return allowed.includes(child.id);
  const gf = rew.gender_filter || 'all';
  if (gf === 'boys')  return child.gender === 'boy';
  if (gf === 'girls') return child.gender === 'girl';
  return true;
}

/* ═══════════════════════════════════════════════
   עזרה קונטקסטואלית — CONTEXT HELP
═══════════════════════════════════════════════ */
const HELP_CONTENT = {
  home: {
    title: '🏠 דף הבית',
    items: [
      { t:'👦👧 בחר ילד', d:'לחץ על כרטיסיית ילד כדי לראות את המטלות שלו ולקחת אחת.' },
      { t:'⭐ נקודות', d:'מתחת שם כל ילד רואים כמה נקודות יש לו.' },
      { t:'🏆 לוח מובילים', d:'מצד ימין רואים את דירוג השבועי לפי נקודות שנצברו בשבוע הזה.' },
      { t:'📊 מטלות פעילות', d:'אם יש מטלות שנלקחו כרגע הן מופיעות כאן עם טיימר ספירה לאחור.' },
      { t:'🎁 פרסים', d:'לחץ על כפתור הפרסים בסרגל הניווט לפתיחת חנות הפרסים.' },
    ]
  },
  chores: {
    title: '📋 דף מטלות',
    items: [
      { t:'✅ מטלות זמינות', d:'הכרטיסייות הצבעוניות הן מטלות שניתן לקחת עכשיו. לחץ עליהן או על "אני לוקח!" כדי להתחיל.' },
      { t:'🔒 מטלות נעולות', d:'מטלות עם רקע אפור אינן זמינות עכשיו (שעות, ימים או תפוסה מלאה).' },
      { t:'⏱ טיימר', d:'אחרי לקיחת מטלה רץ טיימר ספירה לאחור. יש לסיים בזמן וללחוץ "סיימתי!".' },
      { t:'🎲 מטלה אקראית', d:'הכפתור "תן לי מטלה!" — המחשב בוחר עבורך מטלה פנויה באקראי.' },
      { t:'📍 סנן מיקום', d:'השתמש בכפתורי הסנן למעלה כדי לסנן לפי חדר.' },
    ]
  },
  rewards: {
    title: '🎁 דף פרסים',
    items: [
      { t:'👫 בחירת ילד', d:'קודם בוחרים את הילד שנכנס לחנות. כל ילד רואה רק את הפרסים המיועדים לו.' },
      { t:'⭐ נקודות', d:'פרסים עולים נקודות. אם אין מספיק נקודות הפרס יוצג באפור.' },
      { t:'🎁 איני רוצה!', d:'לחיצה על הכפתור שולחת בקשת פרס לאישור הורים.' },
      { t:'🚫 אזל מהמלאי', d:'פרס שהגיע למגבלת המימושים שלו מוצג עם הודעה "אזל מהמלאי".' },
    ]
  },
  stats: {
    title: '📊 דף סטטיסטיקות',
    items: [
      { t:'⭐ נקודות נוכחיות', d:'הנקודות שנשארו לאחר ביצוע מטלות וניכוי פרסים.' },
      { t:'📅 פעילות היום', d:'בתחתית הדף רואים את כל המטלות שבוצעו היום ומי ביצע.' },
      { t:'📆 נקודות שבועיות', d:'מתאפס כל שבוע אוטומטית. יותר מטלות שעושים = יותר נקודות!' },
    ]
  },
  parent: {
    title: '👨‍👩 פאנל הורים',
    items: [
      { t:'✔ אישורים', d:'כאן מאשרים מטלות שבוצעו ובקשות פרסים. אישור מטלה מוסיף נקודות.' },
      { t:'📋 ניהול מטלות', d:'הוסף, ערוך ומחק מטלות. ניתן לקבוע שעות זמינות, ימים, גיל וקהל יעד (בנים/בנות/ילדים ספציפיים).' },
      { t:'🎁 ניהול פרסים', d:'הוסף, ערוך ומחק פרסים. ניתן להגדיר קהל יעד, תמונה ומגבלת מימוש.' },
      { t:'👧 ניהול ילדים', d:'הוסף וערוך ילדים, הגדר מין, וניהל נקודות ידנית (+ בונוס או - קיזוז).' },
      { t:'💾 נתונים', d:'ייצוא גיבוי וייבוא נתונים, ושינוי סיסמה.' },
    ]
  }
};

function triggerContextHelp() {
  const screens = ['home','chores','rewards','stats','parent'];
  let active = 'home';
  for (const s of screens) {
    if (document.getElementById('s-'+s)?.classList.contains('active')) { active = s; break; }
  }
  const help = HELP_CONTENT[active] || HELP_CONTENT.home;
  document.getElementById('ctxHelpTitle').textContent = help.title;
  document.getElementById('ctxHelpItems').innerHTML = help.items.map(it=>
    `<div class="ctx-help-item">
       <div class="ctx-help-item-title">${it.t}</div>
       <div class="ctx-help-item-desc">${it.d}</div>
     </div>`
  ).join('');
  document.getElementById('ctx-help-overlay').classList.add('show');
}

function closeCtxHelp(e) {
  if (e.target === document.getElementById('ctx-help-overlay'))
    e.target.classList.remove('show');
}

function openParentGuideTab(tabName) {
  if (!S.parentAuthed) return;
  const tabBtn = document.querySelector(`.par-tab[onclick="parTab('${tabName}',this)"]`);
  if (tabBtn) parTab(tabName, tabBtn);
}

/* ═══════════════════════════════════════════════
   REWARD PHOTO UPLOAD
═══════════════════════════════════════════════ */
function onRewPhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const data = ev.target.result;
    document.getElementById('rPhoto').value = data;
    const prev = document.getElementById('rewPhotoPreview');
    prev.innerHTML = `<img src="${data}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    prev.className = 'photo-emoji-preview';
  };
  reader.readAsDataURL(file);
}
function clearRewPhoto() {
  document.getElementById('rPhoto').value = '';
  document.getElementById('rewPhotoFileInput').value = '';
  document.getElementById('rewPhotoPreview').innerHTML = '🎁';
  document.getElementById('rewPhotoPreview').className = 'photo-emoji-preview';
}

/* ═══════════════════════════════════════════════
   EMOJI PICKER
═══════════════════════════════════════════════ */
function buildEmojiPicker() {
  document.getElementById('emojiCats').innerHTML = EMOJI_CATS.map((cat,i)=>
    `<button class="emoji-cat ${i===0?'active':''}" onclick="switchEmojiCat(${i},this)" title="${cat.name}">${cat.label}</button>`
  ).join('');
  renderEmojiGrid(0);
}
function switchEmojiCat(idx, btn) {
  S.emojiCatIdx = idx;
  document.querySelectorAll('.emoji-cat').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderEmojiGrid(idx);
}
function renderEmojiGrid(idx) {
  document.getElementById('emojiGrid').innerHTML = EMOJI_CATS[idx].emojis.map(e=>
    `<button class="emoji-btn" onclick="pickEmoji('${e}')">${e}</button>`
  ).join('');
}
function pickEmoji(e) {
  document.getElementById('chIcon').value = e;
  closeEmojiPicker();
}
function toggleEmojiPicker() { document.getElementById('emojiDropdown').classList.toggle('open'); }
function closeEmojiPicker()  { document.getElementById('emojiDropdown').classList.remove('open'); }
document.addEventListener('click', e => {
  const wrap = document.querySelector('.emoji-picker-wrap');
  if (wrap && !wrap.contains(e.target)) closeEmojiPicker();
});

/* ═══════════════════════════════════════════════
   AVATAR HTML HELPER
═══════════════════════════════════════════════ */
function avatarHtml(entity, emojiClass='') {
  if (entity && entity.photo)
    return `<img src="${entity.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  const cls = emojiClass ? ` class="${emojiClass}"` : '';
  return `<span${cls}>${entity?.avatar||'⭐'}</span>`;
}

/* ═══════════════════════════════════════════════
   BIRTHDAY
═══════════════════════════════════════════════ */
async function checkBirthdays() {
  const bdays = await api('/api/children/birthdays');
  if (!bdays.length) return;
  const child = bdays[0];
  const av = document.getElementById('bdayAv');
  if (child.photo) av.innerHTML=`<img src="${child.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  else av.innerHTML=`<span style="font-size:56px">${child.avatar||'🎂'}</span>`;
  document.getElementById('bdayTitle').textContent = `🎂 יום הולדת שמח ${child.name}!`;
  document.getElementById('bdaySub').textContent   = `מלא/ה ${child.age}! שיהיה יום מדהים! 🎉🎊🌟`;
  document.getElementById('bdayOverlay').classList.add('show');
  confetti(); setTimeout(confetti,900); setTimeout(confetti,1800);
}
function closeBday() { document.getElementById('bdayOverlay').classList.remove('show'); }

/* ═══════════════════════════════════════════════
   SCREENSAVER
═══════════════════════════════════════════════ */
function resetSS() {
  if (S.ssTimer) clearTimeout(S.ssTimer);
  S.ssTimer = setTimeout(showSS, S.SS_DELAY);
}
function showSS() {
  const el=document.getElementById('ss'); el.classList.add('show');
  const stars=document.getElementById('ss-stars'); stars.innerHTML='';
  const ems=['⭐','🌟','✨','🎉','🌈','🦋','🌸','🎯'];
  for (let i=0;i<18;i++){
    const s=document.createElement('div'); s.className='fstar';
    s.textContent=ems[Math.floor(Math.random()*ems.length)];
    s.style.left=Math.random()*100+'%';
    s.style.animationDuration=(3+Math.random()*5)+'s';
    s.style.animationDelay=(Math.random()*5)+'s';
    s.style.fontSize=(18+Math.random()*20)+'px';
    stars.appendChild(s);
  }
}
function hideSS() { document.getElementById('ss').classList.remove('show'); resetSS(); }

/* ═══════════════════════════════════════════════
   CONFETTI
═══════════════════════════════════════════════ */
function confetti() {
  const cols=['#FF6B6B','#4ECDC4','#FFE66D','#A78BFA','#FF8C42','#FF6B9D'];
  for (let i=0;i<55;i++){
    const p=document.createElement('div'); p.className='cp';
    p.style.left=Math.random()*100+'vw';
    p.style.background=cols[Math.floor(Math.random()*cols.length)];
    p.style.animationDuration=(1+Math.random()*2)+'s';
    p.style.animationDelay=(Math.random()*.5)+'s';
    const sz=7+Math.random()*11; p.style.width=p.style.height=sz+'px';
    if (Math.random()>.5) p.style.borderRadius='50%';
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),3000);
  }
}

/* ═══════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
function toast(msg,type='') {
  const t=document.createElement('div'); t.className=`toast ${type}`;
  t.textContent=msg; document.getElementById('toast-box').appendChild(t);
  setTimeout(()=>t.remove(),3200);
}

/* ═══════════════════════════════════════════════
   MODAL HELPERS
═══════════════════════════════════════════════ */
function openM(id)  { document.getElementById(id).classList.add('show'); }
function closeM(id) { document.getElementById(id).classList.remove('show'); }
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{
  if (e.target===o) o.classList.remove('show');
}));

/* ═══════════════════════════════════════════════
   API
═══════════════════════════════════════════════ */
async function api(path,method='GET',body=null) {
  const opts={method,headers:{'Content-Type':'application/json'}};
  if (body) opts.body=JSON.stringify(body);
  const res=await fetch(path,opts);
  if (!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e?.detail||`HTTP ${res.status}`);}
  return res.json();
}

function _findChildById(id)  { return _allChildren.find(c => c.id === id) || null; }
function _findChoreById(id)  { return _allChores.find(c => c.id === id) || null; }
function _findRewardById(id) { return _allRewards.find(r => r.id === id) || null; }

init();
