/* ═══════════════════════════════════════════════
   parent.js — Parent panel: login, approvals, CRUD
   Sub-modules: children-crud, chores-crud, rewards-crud
   Used by: navbar
═══════════════════════════════════════════════ */

/* ── Auth ── */
function showParentLogin() {
  const alreadyIn = document.getElementById('s-parent')?.classList.contains('active');
  if (S.parentAuthed && alreadyIn) { showScreen('parent'); loadApprovals(); return; }
  document.getElementById('pwInput').value = '';
  document.getElementById('pwErr').style.display = 'none';
  openM('m-pw');
}

async function verifyPw() {
  try {
    await api('/api/auth/verify', 'POST', { password: document.getElementById('pwInput').value });
    closeM('m-pw');
    S.parentAuthed = true;
    showScreen('parent');
    loadApprovals();
  } catch (e) { document.getElementById('pwErr').style.display = 'block'; }
}

/* ── Tabs ── */
function parTab(name, btn) {
  document.querySelectorAll('.par-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('[id^="pt-"]').forEach(t => t.style.display = 'none');
  document.getElementById('pt-' + name).style.display = 'block';
  if (name === 'appr')     loadApprovals();
  if (name === 'children') loadChildTable();
  if (name === 'chores')   loadChoreTable();
  if (name === 'rewards')  loadRewardTable();
  if (name === 'mishna')   loadMishnaTab();
}

/* ── Approvals ── */
function _runTimingHtml(r) {
  if (!r.finished_at || !r.started_at) return '';
  const actualMins = Math.max(1, Math.round((new Date(r.finished_at) - new Date(r.started_at)) / 60000));
  const allocated  = r.chore?.duration_minutes || 30;
  const exceeded   = actualMins > allocated;
  const color      = exceeded ? 'var(--red)' : 'var(--green)';
  const txt = exceeded
    ? `⏰ לקח ${actualMins} דק' • חרג ב-${actualMins - allocated} דק' מהזמן שהוקצב`
    : `✅ לקח ${actualMins} דק' מתוך ${allocated} דק'`;
  return `<div style="font-size:11px;color:${color};font-weight:600;margin-top:4px">${txt}</div>`;
}

async function loadApprovals() {
  const runs    = await api('/api/runs/active');
  const waiting = runs.filter(r => r.status === 'waiting_approval');
  const inProg  = runs.filter(r => r.status === 'in_progress');

  document.getElementById('pendAppr').innerHTML = waiting.length
    ? waiting.map(r => `
      <div class="appr-card">
        <div style="font-size:26px">${r.chore?.icon || '⭐'}</div>
        <div class="appr-info">
          <div class="appr-name">${r.child?.avatar || ''} ${r.child?.name || ''}</div>
          <div class="appr-sub">${r.chore?.title || ''} • ⭐ ${r.chore?.points || 0}</div>
          ${_runTimingHtml(r)}
        </div>
        <div class="appr-btns">
          <button class="btn-appr" onclick="approveRun('${r.id}')">✔ אשר</button>
          <button class="btn-rej"  onclick="rejectRun('${r.id}')">✖ דחה</button>
        </div>
      </div>`).join('')
    : '<div class="empty"><div class="empty-ico">✅</div><p>אין מטלות לאישור</p></div>';

  document.getElementById('parentActiveRuns').innerHTML = inProg.length
    ? inProg.map(r => `
      <div class="appr-card">
        <div style="font-size:26px">${r.chore?.icon || '⭐'}</div>
        <div class="appr-info">
          <div class="appr-name">${r.child?.avatar || ''} ${r.child?.name || ''}</div>
          <div class="appr-sub">${r.chore?.title || ''} • ▶ בתהליך</div>
        </div>
        <div class="appr-btns">
          <button class="btn-rej" onclick="parentRelease('${r.id}')">🗑 שחרר</button>
        </div>
      </div>`).join('')
    : '<div class="empty"><div class="empty-ico">🎯</div><p>אין מטלות פעילות</p></div>';

  const claims = await api('/api/rewards/claims/pending');
  document.getElementById('pendRew').innerHTML = claims.length
    ? claims.map(c => `
      <div class="appr-card">
        <div style="font-size:26px">${c.reward?.icon || '🎁'}</div>
        <div class="appr-info">
          <div class="appr-name">${c.child?.avatar || ''} ${c.child?.name || ''}</div>
          <div class="appr-sub">${c.reward?.title || ''} • ⭐ ${c.reward?.points_cost || 0}</div>
        </div>
        <div class="appr-btns">
          <button class="btn-appr" onclick="approveClaim('${c.id}')">✔ אשר</button>
          <button class="btn-rej"  onclick="cancelClaim('${c.id}')">✖ בטל</button>
        </div>
      </div>`).join('')
    : '<div class="empty"><div class="empty-ico">🎁</div><p>אין פרסים לאישור</p></div>';

  await loadMishnaPendingInApprovals();
}

async function approveRun(id)  { await api(`/api/runs/${id}/approve`,'POST'); confetti(); toast('✅ מטלה אושרה! נקודות נוספו 🌟','ok'); await loadApprovals(); await refreshHome(); }
async function rejectRun(id)   { await api(`/api/runs/${id}/reject`,'POST');  toast('❌ מטלה נדחתה','err'); await loadApprovals(); }
async function parentRelease(id){ await api(`/api/runs/${id}/release`,'POST'); toast('מטלה שוחררה','ok'); await loadApprovals(); }
async function approveClaim(id){ await api(`/api/rewards/claims/${id}/approve`,'POST'); toast('🎁 פרס אושר!','ok'); await loadApprovals(); await refreshHome(); }
async function cancelClaim(id) { await api(`/api/rewards/claims/${id}/cancel`,'POST');  toast('❌ פרס בוטל – הנקודות הוחזרו','ok'); await loadApprovals(); await refreshHome(); }

/* ── Data export/import ── */
function exportData() { window.location.href = '/api/export'; }
async function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    await api('/api/import', 'POST', data);
    toast('✅ נתונים יובאו!', 'ok'); await refreshHome();
  } catch (err) { toast('שגיאה בייבוא', 'err'); }
}
async function changePw() {
  const np = document.getElementById('newPw').value;
  if (!np) { toast('הכנס סיסמה חדשה', 'err'); return; }
  const op = prompt('הכנס את הסיסמה הנוכחית:'); if (!op) return;
  try {
    await api('/api/auth/change-password', 'POST', { old_password: op, new_password: np });
    toast('✅ סיסמה שונתה!', 'ok');
    document.getElementById('newPw').value = '';
  } catch (e) { toast('סיסמה נוכחית שגויה', 'err'); }
}

/* ════════════════════════════════════════
   CHILDREN CRUD
════════════════════════════════════════ */
async function loadChildTable() {
  _allChildren = await api('/api/children');
  renderChildTable();
}

function sortChildTable(col, thEl) {
  S.childSortDir = S.childSortCol === col ? (S.childSortDir === 'asc' ? 'desc' : 'asc') : 'asc';
  S.childSortCol = col;
  document.querySelectorAll('#pt-children .mgr-table th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
  thEl.classList.add(S.childSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  renderChildTable();
}

function renderChildTable() {
  const list = [..._allChildren].sort((a, b) => {
    let av = a[S.childSortCol] ?? '', bv = b[S.childSortCol] ?? '';
    if (typeof av === 'number') return S.childSortDir === 'asc' ? av - bv : bv - av;
    return S.childSortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
  document.getElementById('childTable').innerHTML = list.map(k => `
    <tr>
      <td style="font-size:22px;width:40px">${k.photo
        ? `<img src="${k.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover">`
        : (k.avatar || '⭐')}</td>
      <td><strong>${k.name}</strong></td>
      <td>${k.birthdate || ''}</td>
      <td>${k.age}</td>
      <td><strong style="color:var(--orange)">⭐ ${k.points || 0}</strong></td>
      <td>
        <button class="btn-sm" style="border-color:var(--purple);color:var(--purple)"
          onclick='openPtsModal(${JSON.stringify(k)})'>⭐ נקודות</button>
        <button class="btn-sm ed" onclick='editChild(${JSON.stringify(k)})'>✏️ ערוך</button>
        <button class="btn-sm dl" onclick="delChild('${k.id}','${k.name}')">🗑</button>
      </td>
    </tr>`).join('');
}

/* ── Points adjust modal ── */
const QUICK_DELTAS = [1, 2, 5, 10, -1, -2, -5, -10];
let _ptsChildId = null, _ptsSign = 1, _ptsCurrent = 0;

async function openPtsModal(child) {
  _ptsChildId = child.id; _ptsCurrent = child.points || 0; _ptsSign = 1;
  document.getElementById('ptsAv').innerHTML = child.photo
    ? `<img src="${child.photo}" alt="">` : `<span>${child.avatar || '⭐'}</span>`;
  document.getElementById('ptsName').textContent    = child.name;
  document.getElementById('ptsCurrent').textContent = `⭐ ${_ptsCurrent} נקודות כרגע`;
  document.getElementById('ptsSignPos').className   = 'pts-sign active-pos';
  document.getElementById('ptsSignNeg').className   = 'pts-sign';
  document.getElementById('ptsQuick').innerHTML = QUICK_DELTAS.map(d =>
    `<button class="pts-quick-btn ${d > 0 ? 'pos' : 'neg'}" onclick="applyQuickDelta(${d})">${d > 0 ? '+' : ''}${d}</button>`
  ).join('');
  document.getElementById('ptsAmount').value = '';
  document.getElementById('ptsReason').value = '';
  updatePtsPreview();
  await loadPtsHistory(child.id);
  openM('m-pts');
}

async function loadPtsHistory(childId) {
  try {
    const data = await api('/api/points-history/' + childId);
    const hist = document.getElementById('ptsHist');
    if (!data.length) { hist.innerHTML = '<div style="text-align:center;padding:10px;color:var(--muted);font-size:12px">אין היסטוריה עדיין</div>'; return; }
    hist.innerHTML = data.map(h => {
      const pos = h.points >= 0;
      const d   = new Date(h.date);
      const dt  = `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      return `<div class="pts-hist-row">
        <span class="pts-hist-delta ${pos ? 'pos' : 'neg'}">${pos ? '+' : ''}${h.points}</span>
        <span class="pts-hist-reason">${h.reason || ''}</span>
        <span class="pts-hist-date">${dt}</span>
      </div>`;
    }).join('');
  } catch (e) { document.getElementById('ptsHist').innerHTML = ''; }
}

function setPtsSign(s) {
  _ptsSign = s;
  document.getElementById('ptsSignPos').className = 'pts-sign' + (s ===  1 ? ' active-pos' : '');
  document.getElementById('ptsSignNeg').className = 'pts-sign' + (s === -1 ? ' active-neg' : '');
  updatePtsPreview();
}

function updatePtsPreview() {
  const amt = parseInt(document.getElementById('ptsAmount').value) || 0;
  const el  = document.getElementById('ptsPreview');
  if (!amt) { el.textContent = 'בחר כמות נקודות'; el.className = 'pts-preview'; return; }
  const delta    = _ptsSign * amt;
  const newTotal = Math.max(0, _ptsCurrent + delta);
  el.innerHTML   = `${delta > 0 ? '⬆️' : '⬇️'} תהיה: <span>${newTotal} נקודות</span> (${delta > 0 ? '+' : ''}${delta})`;
  el.className   = 'pts-preview ' + (delta > 0 ? 'will-add' : 'will-sub');
}

async function applyQuickDelta(delta) {
  document.getElementById('ptsAmount').value = Math.abs(delta);
  _ptsSign = delta > 0 ? 1 : -1;
  document.getElementById('ptsSignPos').className = 'pts-sign' + (_ptsSign ===  1 ? ' active-pos' : '');
  document.getElementById('ptsSignNeg').className = 'pts-sign' + (_ptsSign === -1 ? ' active-neg' : '');
  document.getElementById('ptsReason').value = '';
  updatePtsPreview();
  await doAdjustPoints();
}

async function doAdjustPoints() {
  const amt = parseInt(document.getElementById('ptsAmount').value);
  if (!amt || amt <= 0) { toast('הכנס כמות נקודות חיובית','err'); return; }
  const delta  = _ptsSign * amt;
  const reason = document.getElementById('ptsReason').value.trim()
    || (delta > 0 ? `הוספה ידנית (${delta}+)` : `קיזוז ידני (${delta})`);
  try {
    const updated = await api(`/api/children/${_ptsChildId}/adjust-points`, 'POST', { delta, reason });
    _ptsCurrent = updated.points;
    document.getElementById('ptsCurrent').textContent = `⭐ ${_ptsCurrent} נקודות כרגע`;
    document.getElementById('ptsAmount').value = '';
    document.getElementById('ptsReason').value = '';
    updatePtsPreview();
    toast(delta > 0 ? `➕ ${delta} נקודות נוספו 🌟` : `➖ ${Math.abs(delta)} נקודות הופחתו`, 'ok');
    await loadPtsHistory(_ptsChildId);
    _allChildren = _allChildren.map(c => c.id === _ptsChildId ? { ...c, points: updated.points } : c);
    renderChildTable();
    await refreshHome();
  } catch (e) { toast(e.message || 'שגיאה', 'err'); }
}

function selGender(g) {
  document.getElementById('cGender').value = g;
  document.querySelectorAll('.gender-btn').forEach(b => b.classList.toggle('active', b.dataset.gender === g));
}

function showAddChild() {
  document.getElementById('childMTitle').textContent = 'הוסף ילד';
  document.getElementById('editChildId').value = '';
  document.getElementById('cName').value = '';
  document.getElementById('cBirthdate').value = '';
  S.selPhoto = null;
  document.getElementById('cPhoto').value = '';
  selGender('');
  initAvPicker('⭐'); initColPicker('#FF8C42'); updateChildPreview();
  openM('m-child');
}

function editChild(k) {
  document.getElementById('childMTitle').textContent = 'ערוך ילד';
  document.getElementById('editChildId').value = k.id;
  document.getElementById('cName').value = k.name;
  document.getElementById('cBirthdate').value = k.birthdate || '';
  S.selPhoto = k.photo || null;
  document.getElementById('cPhoto').value = S.selPhoto || '';
  selGender(k.gender || '');
  initAvPicker(k.avatar); initColPicker(k.color); updateChildPreview();
  openM('m-child');
}

async function saveChild() {
  const id   = document.getElementById('editChildId').value;
  const data = {
    name:      document.getElementById('cName').value,
    birthdate: document.getElementById('cBirthdate').value,
    avatar:    S.selAvatar, color: S.selColor,
    photo:     S.selPhoto || null,
    gender:    document.getElementById('cGender').value || '',
  };
  if (!data.name || !data.birthdate) { toast('מלא שם ותאריך לידה','err'); return; }
  if (id) await api(`/api/children/${id}`,'PUT',data);
  else    await api('/api/children','POST',data);
  closeM('m-child'); toast('✅ נשמר!','ok');
  await loadChildTable(); await refreshHome();
}

async function delChild(id, name) {
  if (!confirm(`למחוק את ${name}?`)) return;
  await api(`/api/children/${id}`,'DELETE');
  toast('נמחק','ok'); await loadChildTable(); await refreshHome();
}

/* ── Avatar/color/photo pickers ── */
function initAvPicker(sel) {
  S.selAvatar = sel || '⭐';
  document.getElementById('avPicker').innerHTML = KID_AVATARS.map(a =>
    `<span class="av-opt ${a === S.selAvatar ? 'sel' : ''}" onclick="selAv('${a}')">${a}</span>`
  ).join('');
}
function initColPicker(sel) {
  S.selColor = sel || '#FF8C42';
  document.getElementById('colPicker').innerHTML = COLORS.map(c =>
    `<div class="col-opt ${c === S.selColor ? 'sel' : ''}" style="background:${c}" onclick="selCol('${c}')"></div>`
  ).join('');
}
function selAv(a) {
  S.selAvatar = a;
  document.querySelectorAll('.av-opt').forEach(e => e.classList.remove('sel'));
  event.target.classList.add('sel');
  S.selPhoto = null; document.getElementById('cPhoto').value = '';
  updateChildPreview();
}
function selCol(c) {
  S.selColor = c;
  document.querySelectorAll('.col-opt').forEach(e => e.classList.remove('sel'));
  event.target.classList.add('sel');
}
function updateChildPreview() {
  const prev = document.getElementById('childPhotoPreview');
  if (S.selPhoto) {
    prev.innerHTML = `<img src="${S.selPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  } else {
    prev.innerHTML  = `<span style="font-size:36px">${S.selAvatar || '⭐'}</span>`;
    prev.className  = 'photo-emoji-preview';
  }
}
function onPhotoUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    S.selPhoto = ev.target.result;
    document.getElementById('cPhoto').value = S.selPhoto;
    updateChildPreview();
  };
  reader.readAsDataURL(file);
}
function clearPhoto() {
  S.selPhoto = null;
  document.getElementById('cPhoto').value = '';
  document.getElementById('photoFileInput').value = '';
  updateChildPreview();
}

/* ════════════════════════════════════════
   CHORES CRUD
════════════════════════════════════════ */
function updateRepeatUI() {
  const rep      = document.getElementById('chRepeat').value;
  const showDays = rep === 'weekly' || rep === 'every_n_weeks';
  document.getElementById('daysUI').style.display      = showDays ? 'block' : 'none';
  document.getElementById('intervalUI').style.display  = rep === 'every_n_weeks' ? 'block' : 'none';
  if (showDays) buildDaysBtns();
}
function buildDaysBtns() {
  document.getElementById('daysBtns').innerHTML = DAY_VALS.map((d, i) =>
    `<button type="button" class="day-btn ${S.selDays.has(d) ? 'sel' : ''}"
      onclick="toggleDay('${d}',this)">${DAY_HE_A[i]}</button>`
  ).join('');
}
function toggleDay(d, btn) {
  S.selDays.has(d) ? (S.selDays.delete(d), btn.classList.remove('sel'))
                   : (S.selDays.add(d),    btn.classList.add('sel'));
}
function updateMaxTakersUI() {
  document.getElementById('maxTakersNumWrap').style.display =
    document.getElementById('chMaxTakersType').value === 'specific' ? 'block' : 'none';
}
function updateMaxPerDayUI() {
  document.getElementById('maxPerDayNumWrap').style.display =
    document.getElementById('chMaxPerDay').value === 'specific' ? 'block' : 'none';
}
function updateChoreTargetUI() {}

async function loadChoreTable() {
  _allChores = await api('/api/chores');
  const locs   = [...new Set(_allChores.map(c => c.location))].sort();
  const locSel = document.getElementById('choreFilterLoc');
  const curLoc = locSel.value;
  locSel.innerHTML = '<option value="">כל המיקומים</option>'
    + locs.map(l => `<option value="${l}" ${l === curLoc ? 'selected' : ''}>${l}</option>`).join('');
  renderChoreTable();
}

function choreSortBy(col, thEl) {
  S.choreSortDir = S.choreSortCol === col ? (S.choreSortDir === 'asc' ? 'desc' : 'asc') : 'asc';
  S.choreSortCol = col;
  document.querySelectorAll('#pt-chores .mgr-table th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
  thEl.classList.add(S.choreSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  renderChoreTable();
}

function renderChoreTable() {
  const search = (document.getElementById('choreSearch')?.value || '').toLowerCase();
  const locF   = document.getElementById('choreFilterLoc')?.value || '';
  const enF    = document.getElementById('choreFilterEnabled')?.value || '';
  let list = _allChores.filter(c => {
    if (search && !c.title.toLowerCase().includes(search)) return false;
    if (locF && c.location !== locF) return false;
    const enabled = c.enabled !== false;
    if (enF === '1' && !enabled) return false;
    if (enF === '0' &&  enabled) return false;
    return true;
  });
  const col = S.choreSortCol, dir = S.choreSortDir;
  list.sort((a, b) => {
    let av = a[col] ?? '', bv = b[col] ?? '';
    if (col === 'enabled') { av = a.enabled !== false ? 1 : 0; bv = b.enabled !== false ? 1 : 0; }
    if (typeof av === 'number') return dir === 'asc' ? av - bv : bv - av;
    return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
  document.getElementById('choreCount').textContent = `${list.length} / ${_allChores.length} מטלות`;
  document.getElementById('choreTable').innerHTML = list.map(c => {
    const enabled = c.enabled !== false;
    return `<tr class="${enabled ? '' : 'disabled-row'}">
      <td><label class="toggle-wrap" title="${enabled ? 'השבת' : 'הפעל'}">
        <span class="toggle-switch"><input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleChore('${c.id}',this)"><span class="toggle-slider"></span></span>
      </label></td>
      <td style="font-size:18px">${c.icon || '⭐'}</td>
      <td><strong>${c.title}</strong></td>
      <td>${c.location}</td>
      <td>⭐ ${c.points}</td>
      <td>${c.duration_minutes || 30} דק'</td>
      <td>${c.min_age}–${c.max_age}</td>
      <td>${c.max_takers === 0 ? 'כל אחד' : (c.max_takers || 1)}</td>
      <td>
        <button class="btn-sm ed" onclick='editChore(${JSON.stringify(c)})'>✏️</button>
        <button class="btn-sm dl" onclick="delChore('${c.id}','${c.title}')">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

async function toggleChore(id, chk) {
  try {
    const res = await api(`/api/chores/${id}/toggle`, 'POST');
    const ch  = _allChores.find(c => c.id === id);
    if (ch) ch.enabled = res.enabled;
    renderChoreTable();
    toast(res.enabled ? '✅ מטלה הופעלה' : '⏸ מטלה הושבתה', 'ok');
  } catch (e) { toast('שגיאה','err'); loadChoreTable(); }
}

function showAddChore() {
  document.getElementById('choreMTitle').textContent = 'הוסף מטלה';
  document.getElementById('editChoreId').value = '';
  ['chTitle'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('chIcon').value = '';
  document.getElementById('chPts').value  = '';
  document.getElementById('chDuration').value = 30;
  document.getElementById('chMaxTakersType').value = 'one';
  document.getElementById('chMaxTakers').value = 2; updateMaxTakersUI();
  document.getElementById('chMaxPerDay').value = '1';
  document.getElementById('chMaxPerDayNum').value = 2; updateMaxPerDayUI();
  document.getElementById('chMinAge').value = 4;
  document.getElementById('chMaxAge').value = 12;
  document.getElementById('chStart').value  = '08:00';
  document.getElementById('chEnd').value    = '20:00';
  document.getElementById('chRepeat').value = 'daily';
  document.getElementById('chGenderFilter').value = 'all';
  _populateChoreChildCheckboxes([]);
  S.selDays = new Set();
  document.getElementById('daysBtns').innerHTML = '';
  updateRepeatUI();
  openM('m-chore');
}

function editChore(c) {
  document.getElementById('choreMTitle').textContent = 'ערוך מטלה';
  document.getElementById('editChoreId').value = c.id;
  document.getElementById('chTitle').value     = c.title;
  document.getElementById('chIcon').value      = c.icon || '';
  document.getElementById('chPts').value       = c.points;
  document.getElementById('chDuration').value  = c.duration_minutes || 30;
  const mt = c.max_takers ?? 1;
  if      (mt === 0) { document.getElementById('chMaxTakersType').value = 'all';      document.getElementById('chMaxTakers').value = 2; }
  else if (mt === 1) { document.getElementById('chMaxTakersType').value = 'one';      document.getElementById('chMaxTakers').value = 2; }
  else               { document.getElementById('chMaxTakersType').value = 'specific'; document.getElementById('chMaxTakers').value = mt; }
  updateMaxTakersUI();
  const mpd = c.max_per_child_per_day ?? 1;
  if      (mpd === 0) { document.getElementById('chMaxPerDay').value = '0';        document.getElementById('chMaxPerDayNum').value = 2; }
  else if (mpd === 1) { document.getElementById('chMaxPerDay').value = '1';        document.getElementById('chMaxPerDayNum').value = 2; }
  else                { document.getElementById('chMaxPerDay').value = 'specific'; document.getElementById('chMaxPerDayNum').value = mpd; }
  updateMaxPerDayUI();
  document.getElementById('chLoc').value    = c.location;
  document.getElementById('chMinAge').value = c.min_age;
  document.getElementById('chMaxAge').value = c.max_age;
  document.getElementById('chStart').value  = c.time_start;
  document.getElementById('chEnd').value    = c.time_end;
  document.getElementById('chRepeat').value = c.repeat_type;
  S.selDays = new Set(c.repeat_days || []);
  document.getElementById('chInterval').value = c.repeat_interval || 2;
  document.getElementById('daysBtns').innerHTML = '';
  updateRepeatUI();
  document.getElementById('chGenderFilter').value = c.gender_filter || 'all';
  _populateChoreChildCheckboxes(c.allowed_child_ids || []);
  openM('m-chore');
}

async function saveChore() {
  const id         = document.getElementById('editChoreId').value;
  const takersType = document.getElementById('chMaxTakersType').value;
  const maxTakers  = takersType === 'all' ? 0 : takersType === 'one' ? 1 : parseInt(document.getElementById('chMaxTakers').value) || 2;
  const mpdVal     = document.getElementById('chMaxPerDay').value;
  const maxPerDay  = mpdVal === '0' ? 0 : mpdVal === '1' ? 1 : parseInt(document.getElementById('chMaxPerDayNum').value) || 2;
  const data = {
    title:    document.getElementById('chTitle').value,
    icon:     document.getElementById('chIcon').value  || '⭐',
    points:   parseInt(document.getElementById('chPts').value),
    duration_minutes:    parseInt(document.getElementById('chDuration').value) || 30,
    max_takers:          maxTakers,
    max_per_child_per_day: maxPerDay,
    location:            document.getElementById('chLoc').value,
    min_age:             parseInt(document.getElementById('chMinAge').value),
    max_age:             parseInt(document.getElementById('chMaxAge').value),
    time_start:          document.getElementById('chStart').value,
    time_end:            document.getElementById('chEnd').value,
    repeat_type:         document.getElementById('chRepeat').value,
    repeat_days:         [...S.selDays],
    repeat_interval:     parseInt(document.getElementById('chInterval').value) || 1,
    gender_filter:       document.getElementById('chGenderFilter').value || 'all',
    allowed_child_ids:   _getCheckedChildIds('chAllowedChildren'),
  };
  if (!data.title || !data.points) { toast('מלא שם ונקודות','err'); return; }
  if (id) await api(`/api/chores/${id}`,'PUT',data);
  else    await api('/api/chores','POST',data);
  closeM('m-chore'); closeEmojiPicker();
  toast('✅ נשמר!','ok'); await loadChoreTable();
}

async function delChore(id, title) {
  if (!confirm(`למחוק "${title}"?`)) return;
  await api(`/api/chores/${id}`,'DELETE');
  toast('נמחק','ok'); await loadChoreTable();
}

/* ════════════════════════════════════════
   REWARDS CRUD
════════════════════════════════════════ */
async function loadRewardTable() {
  _allRewards      = await api('/api/rewards');
  _allRewardClaims = await api('/api/rewards/claims/all').catch(() => []);
  renderRewardTable();
}

function rewSortBy(col, thEl) {
  S.rewSortDir = S.rewSortCol === col ? (S.rewSortDir === 'asc' ? 'desc' : 'asc') : 'asc';
  S.rewSortCol = col;
  document.querySelectorAll('#pt-rewards .mgr-table th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
  thEl.classList.add(S.rewSortDir === 'asc' ? 'sort-asc' : 'sort-desc');
  renderRewardTable();
}

function renderRewardTable() {
  const col = S.rewSortCol, dir = S.rewSortDir;
  const list = [..._allRewards].sort((a, b) => {
    let av = a[col] ?? 0, bv = b[col] ?? 0;
    if (col === 'available') { av = a.available !== false ? 1 : 0; bv = b.available !== false ? 1 : 0; }
    if (typeof av === 'number') return dir === 'asc' ? av - bv : bv - av;
    return dir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
  document.getElementById('rewardTable').innerHTML = list.map(r => {
    const avail        = r.available !== false;
    const mc           = r.max_claims ?? 0;
    const approvedCnt  = _allRewardClaims.filter(c => c.reward_id === r.id && c.status === 'approved').length;
    const limitTxt     = mc === 0 ? 'ללא הגבלה' : mc === 1 ? `פעם אחת (${approvedCnt}/1)` : `${approvedCnt}/${mc}`;
    const gf           = r.gender_filter || 'all';
    const al           = r.allowed_child_ids || [];
    const audTxt       = al.length ? 'ילדים ספציפיים' : gf === 'boys' ? '👦 בנים' : gf === 'girls' ? '👧 בנות' : '👨‍👩 כולם';
    const photoThumb   = r.photo ? `<img src="${r.photo}" style="width:28px;height:28px;border-radius:6px;object-fit:cover;vertical-align:middle;"> ` : '';
    return `<tr class="${avail ? '' : 'disabled-row'}">
      <td><label class="toggle-wrap"><span class="toggle-switch">
        <input type="checkbox" ${avail ? 'checked' : ''} onchange="toggleReward('${r.id}',this)">
        <span class="toggle-slider"></span></span></label></td>
      <td style="font-size:18px">${photoThumb}${r.icon || '🎁'}</td>
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
    const r   = _allRewards.find(x => x.id === id);
    if (r) r.available = res.available;
    renderRewardTable();
    toast(res.available ? '✅ פרס הופעל' : '⏸ פרס הושבת', 'ok');
  } catch (e) { toast('שגיאה','err'); await loadRewardTable(); }
}

function updateRewTargetUI() {}
function updateMaxClaimsUI() {
  const v = document.getElementById('rMaxClaims').value;
  document.getElementById('maxClaimsNumWrap').style.display = v === 'specific' ? 'block' : 'none';
  const hints = {'0':'כל ילד יכול לבקש את הפרס כמה פעמים שרוצה','1':'הפרס יינתן רק פעם אחת בסה"כ','specific':''};
  document.getElementById('maxClaimsHint').textContent = hints[v] || '';
}

function showAddReward() {
  document.getElementById('rewMTitle').textContent = 'הוסף פרס';
  document.getElementById('editRewId').value = '';
  ['rTitle','rIcon','rCost'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('rMaxClaims').value = '0';
  document.getElementById('rMaxClaimsNum').value = 2;
  document.getElementById('rGenderFilter').value = 'all';
  clearRewPhoto();
  _populateRewChildCheckboxes([]);
  updateMaxClaimsUI();
  openM('m-reward');
}

function editRew(r) {
  document.getElementById('rewMTitle').textContent = 'ערוך פרס';
  document.getElementById('editRewId').value = r.id;
  document.getElementById('rTitle').value    = r.title;
  document.getElementById('rIcon').value     = r.icon || '🎁';
  document.getElementById('rCost').value     = r.points_cost;
  const mc = r.max_claims ?? 0;
  if      (mc === 0) document.getElementById('rMaxClaims').value = '0';
  else if (mc === 1) document.getElementById('rMaxClaims').value = '1';
  else { document.getElementById('rMaxClaims').value = 'specific'; document.getElementById('rMaxClaimsNum').value = mc; }
  updateMaxClaimsUI();
  document.getElementById('rGenderFilter').value = r.gender_filter || 'all';
  _populateRewChildCheckboxes(r.allowed_child_ids || []);
  const photo = r.photo || null;
  document.getElementById('rPhoto').value = photo || '';
  const prev  = document.getElementById('rewPhotoPreview');
  prev.innerHTML = photo
    ? `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : (r.icon || '🎁');
  openM('m-reward');
}

async function saveReward() {
  const id     = document.getElementById('editRewId').value;
  const mcVal  = document.getElementById('rMaxClaims').value;
  const maxClaims = mcVal === '0' ? 0 : mcVal === '1' ? 1 : parseInt(document.getElementById('rMaxClaimsNum').value) || 2;
  const data   = {
    title:            document.getElementById('rTitle').value,
    icon:             document.getElementById('rIcon').value || '🎁',
    points_cost:      parseInt(document.getElementById('rCost').value),
    max_claims:       maxClaims,
    gender_filter:    document.getElementById('rGenderFilter').value || 'all',
    allowed_child_ids: _getCheckedChildIds('rAllowedChildren'),
    photo:            document.getElementById('rPhoto').value || null,
  };
  if (!data.title || !data.points_cost) { toast('מלא שם ועלות','err'); return; }
  if (id) await api(`/api/rewards/${id}`,'PUT',data);
  else    await api('/api/rewards','POST',data);
  closeM('m-reward'); toast('✅ נשמר!','ok'); await loadRewardTable();
}

async function delRew(id, title) {
  if (!confirm(`למחוק "${title}"?`)) return;
  await api(`/api/rewards/${id}`,'DELETE');
  toast('נמחק','ok'); await loadRewardTable();
}

/* ── Audience helpers ── */
async function _populateChoreChildCheckboxes(selectedIds) {
  const kids = _allChildren.length ? _allChildren : await api('/api/children');
  const container = document.getElementById('chAllowedChildren');
  if (!kids.length) { container.innerHTML = '<span class="child-checkboxes-empty">אין ילדים רשומים</span>'; return; }
  container.innerHTML = kids.map(k => `
    <label class="child-check-lbl">
      <input type="checkbox" value="${k.id}" ${selectedIds.includes(k.id) ? 'checked' : ''}>
      <span>${k.photo ? `<img src="${k.photo}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">` : k.avatar || '⭐'} ${k.name}</span>
    </label>`).join('');
}

async function _populateRewChildCheckboxes(selectedIds) {
  const kids = _allChildren.length ? _allChildren : await api('/api/children');
  const container = document.getElementById('rAllowedChildren');
  if (!kids.length) { container.innerHTML = '<span class="child-checkboxes-empty">אין ילדים רשומים</span>'; return; }
  container.innerHTML = kids.map(k => `
    <label class="child-check-lbl">
      <input type="checkbox" value="${k.id}" ${selectedIds.includes(k.id) ? 'checked' : ''}>
      <span>${k.photo ? `<img src="${k.photo}" style="width:18px;height:18px;border-radius:50%;object-fit:cover;">` : k.avatar || '⭐'} ${k.name}</span>
    </label>`).join('');
}

function _getCheckedChildIds(containerId) {
  return [...document.querySelectorAll(`#${containerId} input[type=checkbox]:checked`)].map(cb => cb.value);
}

/* ── Reward photo upload ── */
function onRewPhotoUpload(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('rPhoto').value = ev.target.result;
    const prev = document.getElementById('rewPhotoPreview');
    prev.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    prev.className  = 'photo-emoji-preview';
  };
  reader.readAsDataURL(file);
}
function clearRewPhoto() {
  document.getElementById('rPhoto').value = '';
  document.getElementById('rewPhotoFileInput').value = '';
  document.getElementById('rewPhotoPreview').innerHTML = '🎁';
  document.getElementById('rewPhotoPreview').className = 'photo-emoji-preview';
}

/* ── Emoji picker (chore icon) ── */
function buildEmojiPicker() {
  document.getElementById('emojiCats').innerHTML = EMOJI_CATS.map((cat, i) =>
    `<button class="emoji-cat ${i === 0 ? 'active' : ''}" onclick="switchEmojiCat(${i},this)" title="${cat.name}">${cat.label}</button>`
  ).join('');
  renderEmojiGrid(0);
}
function switchEmojiCat(idx, btn) {
  S.emojiCatIdx = idx;
  document.querySelectorAll('.emoji-cat').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderEmojiGrid(idx);
}
function renderEmojiGrid(idx) {
  document.getElementById('emojiGrid').innerHTML = EMOJI_CATS[idx].emojis.map(e =>
    `<button class="emoji-btn" onclick="pickEmoji('${e}')">${e}</button>`
  ).join('');
}
function pickEmoji(e)        { document.getElementById('chIcon').value = e; closeEmojiPicker(); }
function toggleEmojiPicker() { document.getElementById('emojiDropdown').classList.toggle('open'); }
function closeEmojiPicker()  { document.getElementById('emojiDropdown').classList.remove('open'); }
document.addEventListener('click', e => {
  const wrap = document.querySelector('.emoji-picker-wrap');
  if (wrap && !wrap.contains(e.target)) closeEmojiPicker();
});

function openParentGuideTab(tabName) {
  if (!S.parentAuthed) return;
  const tabBtn = document.querySelector(`.par-tab[onclick="parTab('${tabName}',this)"]`);
  if (tabBtn) parTab(tabName, tabBtn);
}
