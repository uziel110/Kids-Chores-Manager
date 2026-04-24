/* ═══════════════════════════════════════════════
   mishna.js — לימוד משניות בעל פה
   Parent: create tasks, review/approve submissions
   Child: browse sedarim → masechtot → perakim → select mishnas
═══════════════════════════════════════════════ */

/* ── state ── */
const MS = {
  selectedSederIdx: null,
  selectedMasechetIdx: null,
  selectedPerekIdx: null,
  selectedMishnaNums: new Set(),
  takenKeys: new Set(),   // "seder|masechet|perek|num" for this child
  childItems: [],         // all mishna_items for current child
  childTasks: [],         // all mishna_tasks for current child
  activeTaskId: null,
};

/* ── helpers ── */
function _mishnaKey(seder, masechet, perek, num) {
  return `${seder}|${masechet}|${perek}|${num}`;
}

function _statusLabel(status) {
  return {
    claimed:         '📚 בלמידה',
    child_done:      '⏳ ממתין לאישור',
    parent_approved: '✅ אושר!',
    needs_review:    '🔄 ללמוד שוב',
  }[status] || status;
}

function _statusClass(status) {
  return {
    claimed:         'ms-status-claimed',
    child_done:      'ms-status-pending',
    parent_approved: 'ms-status-approved',
    needs_review:    'ms-status-review',
  }[status] || '';
}

/* ══════════════════════════════════════════
   CHILD SIDE
══════════════════════════════════════════ */

/* Entry point — called when child switches to mishna tab */
async function loadChildMishna(childId) {
  const el = document.getElementById('childMishnaContent');
  el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)">טוען...</div>';

  const [tasks, items] = await Promise.all([
    api(`/api/mishna/tasks/for-child/${childId}`),
    api(`/api/mishna/items/for-child/${childId}`),
  ]);

  MS.childTasks = tasks;
  MS.childItems = items;
  MS.takenKeys  = new Set(
    items.map(i => _mishnaKey(i.seder, i.masechet, i.perek_num, i.mishna_num))
  );

  if (!tasks.length) {
    el.innerHTML = `<div class="ms-empty">
      <div style="font-size:48px">📖</div>
      <div style="font-weight:800;font-size:16px;margin:10px 0 6px">אין עדיין משימת משניות</div>
      <div style="color:var(--muted);font-size:14px">בקש מהורה להוסיף משימה</div>
    </div>`;
    return;
  }

  MS.activeTaskId = tasks[0].id;
  MS.selectedSederIdx    = null;
  MS.selectedMasechetIdx = null;
  MS.selectedPerekIdx    = null;
  MS.selectedMishnaNums  = new Set();

  renderChildMishna();
}

function renderChildMishna() {
  const el  = document.getElementById('childMishnaContent');
  const task = MS.childTasks.find(t => t.id === MS.activeTaskId);
  if (!task) return;

  const myItems = MS.childItems.filter(i => i.task_id === task.id);

  el.innerHTML = `
    <div class="ms-task-header">
      <div class="ms-task-title">📖 ${task.title}</div>
      <div class="ms-task-pts">⭐ ${task.points_per_mishna} נקודות למשנה</div>
    </div>

    <!-- Browser -->
    <div class="ms-browser">
      ${_renderSederRow()}
      ${MS.selectedSederIdx !== null ? _renderMasechetRow() : ''}
      ${MS.selectedMasechetIdx !== null ? _renderPerekRow() : ''}
      ${MS.selectedPerekIdx !== null ? _renderMishnaGrid() : ''}
    </div>

    <!-- My mishnas -->
    ${_renderMyMishnas(myItems)}
  `;
}

function _renderSederRow() {
  const btns = MISHNA_DATA.map((s, i) => `
    <button class="ms-seder-btn ${MS.selectedSederIdx === i ? 'active' : ''}"
      onclick="msSelectSeder(${i})">${s.name}</button>
  `).join('');
  return `<div class="ms-browser-row">
    <div class="ms-browser-label">סדר:</div>
    <div class="ms-seder-row">${btns}</div>
  </div>`;
}

function _renderMasechetRow() {
  const seder = MISHNA_DATA[MS.selectedSederIdx];
  const btns = seder.masechtot.map((m, i) => `
    <button class="ms-masechet-btn ${MS.selectedMasechetIdx === i ? 'active' : ''}"
      onclick="msSelectMasechet(${i})">${m.name}</button>
  `).join('');
  return `<div class="ms-browser-row">
    <div class="ms-browser-label">מסכת:</div>
    <div class="ms-masechet-row">${btns}</div>
  </div>`;
}

function _renderPerekRow() {
  const masechet = MISHNA_DATA[MS.selectedSederIdx].masechtot[MS.selectedMasechetIdx];
  const btns = masechet.perakim.map((cnt, i) => `
    <button class="ms-perek-btn ${MS.selectedPerekIdx === i ? 'active' : ''}"
      onclick="msSelectPerek(${i})">פרק ${heNum(i + 1)}</button>
  `).join('');
  return `<div class="ms-browser-row">
    <div class="ms-browser-label">פרק:</div>
    <div class="ms-perek-row">${btns}</div>
  </div>`;
}

function _renderMishnaGrid() {
  const seder    = MISHNA_DATA[MS.selectedSederIdx];
  const masechet = seder.masechtot[MS.selectedMasechetIdx];
  const count    = masechet.perakim[MS.selectedPerekIdx];
  const sName    = seder.name;
  const mName    = masechet.name;
  const pNum     = MS.selectedPerekIdx + 1;

  let gridHtml = '';
  for (let n = 1; n <= count; n++) {
    const key   = _mishnaKey(sName, mName, pNum, n);
    const taken = MS.takenKeys.has(key);
    const sel   = MS.selectedMishnaNums.has(n);
    const cls   = taken ? 'ms-mishna-taken' : sel ? 'ms-mishna-sel' : 'ms-mishna-free';
    const click = taken ? '' : `onclick="msToggleMishna(${n})"`;
    const icon  = taken ? '🔒' : sel ? '✓' : heNum(n);
    gridHtml += `<button class="ms-mishna-btn ${cls}" ${click} title="משנה ${heNum(n)}">${icon}</button>`;
  }

  const selCount = MS.selectedMishnaNums.size;
  const task     = MS.childTasks.find(t => t.id === MS.activeTaskId);
  const pts      = task ? task.points_per_mishna : 10;

  return `<div class="ms-mishna-grid-wrap">
    <div class="ms-browser-label" style="margin-bottom:8px">
      משניות פרק ${heNum(pNum)} — ${mName} (${count} משניות):
    </div>
    <div class="ms-mishna-grid">${gridHtml}</div>
    ${selCount > 0 ? `
      <div class="ms-claim-bar">
        <span>בחרת <strong>${selCount}</strong> משניות • ${selCount * pts} נקודות אפשריות</span>
        <button class="btn-primary ms-claim-btn" onclick="msClaimSelected()">📚 אני לוקח ללמוד!</button>
      </div>` : ''}
    <div class="ms-legend">
      <span class="ms-mishna-btn ms-mishna-free" style="pointer-events:none">א</span> פנוי &nbsp;
      <span class="ms-mishna-btn ms-mishna-sel" style="pointer-events:none">✓</span> נבחר &nbsp;
      <span class="ms-mishna-btn ms-mishna-taken" style="pointer-events:none">🔒</span> כבר נלקח
    </div>
  </div>`;
}

function _renderMyMishnas(items) {
  if (!items.length) return '';

  const grouped = {};
  for (const i of items) {
    const key = `${i.seder} / ${i.masechet} / פרק ${heNum(i.perek_num)}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(i);
  }

  const sections = Object.entries(grouped).map(([label, group]) => {
    const cards = group
      .sort((a, b) => a.mishna_num - b.mishna_num)
      .map(i => {
        const canDone = i.status === 'claimed' || i.status === 'needs_review';
        return `<div class="ms-item-card ${_statusClass(i.status)}">
          <div class="ms-item-ref">משנה ${heNum(i.mishna_num)}</div>
          <div class="ms-item-status">${_statusLabel(i.status)}</div>
          ${canDone ? `<button class="ms-done-btn" onclick="msMarkDone('${i.id}')">✋ למדתי!</button>` : ''}
        </div>`;
      }).join('');
    return `<div class="ms-group">
      <div class="ms-group-label">📖 ${label}</div>
      <div class="ms-items-row">${cards}</div>
    </div>`;
  }).join('');

  const pending = items.filter(i => i.status === 'child_done').length;
  const approved = items.filter(i => i.status === 'parent_approved').length;

  return `<div class="ms-my-mishnas">
    <div class="ms-my-title">
      📋 המשניות שלי
      <span class="ms-my-stats">${approved} אושרו • ${pending} ממתינות</span>
    </div>
    ${sections}
  </div>`;
}

/* ── child interactions ── */
function msSelectSeder(idx) {
  MS.selectedSederIdx    = idx;
  MS.selectedMasechetIdx = null;
  MS.selectedPerekIdx    = null;
  MS.selectedMishnaNums  = new Set();
  renderChildMishna();
}
function msSelectMasechet(idx) {
  MS.selectedMasechetIdx = idx;
  MS.selectedPerekIdx    = null;
  MS.selectedMishnaNums  = new Set();
  renderChildMishna();
}
function msSelectPerek(idx) {
  MS.selectedPerekIdx   = idx;
  MS.selectedMishnaNums = new Set();
  renderChildMishna();
}
function msToggleMishna(num) {
  if (MS.selectedMishnaNums.has(num)) MS.selectedMishnaNums.delete(num);
  else MS.selectedMishnaNums.add(num);
  const wrap = document.querySelector('.ms-mishna-grid-wrap');
  if (wrap) {
    const tmp = document.createElement('div');
    tmp.innerHTML = _renderMishnaGrid();
    wrap.replaceWith(tmp.firstElementChild);
  } else {
    renderChildMishna();
  }
}

async function msClaimSelected() {
  if (!MS.selectedMishnaNums.size || MS.activeTaskId === null) return;
  const seder    = MISHNA_DATA[MS.selectedSederIdx].name;
  const masechet = MISHNA_DATA[MS.selectedSederIdx].masechtot[MS.selectedMasechetIdx].name;
  const perekNum = MS.selectedPerekIdx + 1;
  try {
    const created = await api('/api/mishna/items/claim', 'POST', {
      task_id:     MS.activeTaskId,
      seder, masechet,
      perek_num:   perekNum,
      mishna_nums: [...MS.selectedMishnaNums],
    });
    MS.childItems.push(...created);
    for (const i of created) {
      MS.takenKeys.add(_mishnaKey(i.seder, i.masechet, i.perek_num, i.mishna_num));
    }
    MS.selectedMishnaNums = new Set();
    toast(`📚 לקחת ${created.length} משניות ללמידה!`, 'ok');
    renderChildMishna();
  } catch (e) { toast(e.message || 'שגיאה', 'err'); }
}

async function msMarkDone(itemId) {
  try {
    const updated = await api(`/api/mishna/items/${itemId}/done`, 'POST');
    const idx = MS.childItems.findIndex(i => i.id === itemId);
    if (idx >= 0) MS.childItems[idx] = { ...MS.childItems[idx], ...updated };
    toast('⏳ נשלח להורה לאישור!', 'ok');
    renderChildMishna();
  } catch (e) { toast(e.message || 'שגיאה', 'err'); }
}

/* Tab switcher on child screen */
function switchChildMainTab(tab, btn) {
  document.querySelectorAll('.child-main-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('childChoresMode').style.display  = tab === 'chores'  ? '' : 'none';
  document.getElementById('childMishnaMode').style.display  = tab === 'mishna'  ? '' : 'none';
  if (tab === 'mishna' && S.currentChild) loadChildMishna(S.currentChild.id);
}

/* ══════════════════════════════════════════
   PARENT SIDE
══════════════════════════════════════════ */

async function loadMishnaTab() {
  await Promise.all([loadMishnaTasks(), loadMishnaPending()]);
}

async function loadMishnaTasks() {
  const tasks = await api('/api/mishna/tasks');
  const el = document.getElementById('mishnaTasksList');
  if (!tasks.length) {
    el.innerHTML = '<div class="empty"><div class="empty-ico">📖</div><p>אין משימות משניות עדיין</p></div>';
    return;
  }

  // Group by child
  const byChild = {};
  for (const t of tasks) {
    const cid = t.child_id;
    if (!byChild[cid]) byChild[cid] = { child: t.child, tasks: [] };
    byChild[cid].tasks.push(t);
  }

  el.innerHTML = Object.values(byChild).map(({ child, tasks: ts }) => `
    <div class="ms-par-child-block">
      <div class="ms-par-child-name">${avatarHtml(child)} ${child.name || ''}</div>
      ${ts.map(t => `
        <div class="ms-par-task-row">
          <div class="ms-par-task-info">
            <span class="ms-par-task-title">📖 ${t.title}</span>
            <span class="ms-par-task-pts">⭐ ${t.points_per_mishna} נק' למשנה</span>
          </div>
          <button class="btn-rej" onclick="deleteMishnaTask('${t.id}')">🗑 מחק</button>
        </div>`).join('')}
    </div>`).join('');
}

async function loadMishnaPending() {
  const items = await api('/api/mishna/items/pending');
  const el    = document.getElementById('mishnaPendingList');
  if (!items.length) {
    el.innerHTML = '<div class="empty"><div class="empty-ico">✅</div><p>אין משניות לאישור</p></div>';
    return;
  }
  el.innerHTML = items.map(i => `
    <div class="appr-card ms-appr-card">
      <div style="font-size:28px">📖</div>
      <div class="appr-info">
        <div class="appr-name">${avatarHtml(i.child)} ${i.child?.name || ''}</div>
        <div class="appr-sub">
          ${i.masechet} · פרק ${heNum(i.perek_num)} · משנה ${heNum(i.mishna_num)}
        </div>
        <div style="font-size:11px;color:var(--muted)">⭐ ${i.task?.points_per_mishna || 10} נקודות</div>
      </div>
      <div class="appr-btns">
        <button class="btn-appr" onclick="approveMishnaItem('${i.id}')">✔ אשר</button>
        <button class="btn-rej"  onclick="needsReviewMishnaItem('${i.id}')">🔄 ללמוד שוב</button>
        <button class="btn-secondary" style="font-size:11px;padding:5px 8px" onclick="returnMishnaItem('${i.id}')">↩ החזר</button>
      </div>
    </div>`).join('');
}

/* Pending mishnas also shown in approvals tab */
async function loadMishnaPendingInApprovals() {
  const items = await api('/api/mishna/items/pending');
  const el    = document.getElementById('mishnaPendingAppr');
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="empty"><div class="empty-ico">📖</div><p>אין משניות לאישור</p></div>';
    return;
  }
  el.innerHTML = items.map(i => `
    <div class="appr-card ms-appr-card">
      <div style="font-size:28px">📖</div>
      <div class="appr-info">
        <div class="appr-name">${avatarHtml(i.child)} ${i.child?.name || ''}</div>
        <div class="appr-sub">${i.masechet} · פרק ${heNum(i.perek_num)} · משנה ${heNum(i.mishna_num)}</div>
        <div style="font-size:11px;color:var(--muted)">⭐ ${i.task?.points_per_mishna || 10} נקודות</div>
      </div>
      <div class="appr-btns">
        <button class="btn-appr" onclick="approveMishnaItem('${i.id}',true)">✔ אשר</button>
        <button class="btn-rej"  onclick="needsReviewMishnaItem('${i.id}',true)">🔄 שוב</button>
        <button class="btn-secondary" style="font-size:11px;padding:5px 8px" onclick="returnMishnaItem('${i.id}',true)">↩ החזר</button>
      </div>
    </div>`).join('');
}

/* ── parent task CRUD ── */
async function showAddMishnaTask() {
  const children = await api('/api/children');
  const sel = document.getElementById('mishnaTaskChild');
  sel.innerHTML = children.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  document.getElementById('editMishnaTaskId').value = '';
  document.getElementById('mishnaTaskTitle').value  = 'לימוד משניות בעל פה';
  document.getElementById('mishnaTaskPts').value    = 10;
  openM('m-mishna-task');
}

async function saveMishnaTask() {
  const childId = document.getElementById('mishnaTaskChild').value;
  const title   = document.getElementById('mishnaTaskTitle').value.trim() || 'לימוד משניות בעל פה';
  const pts     = parseInt(document.getElementById('mishnaTaskPts').value) || 10;
  try {
    await api('/api/mishna/tasks', 'POST', { child_id: childId, title, points_per_mishna: pts });
    closeM('m-mishna-task');
    toast('📖 משימה נוספה!', 'ok');
    await loadMishnaTab();
  } catch (e) { toast(e.message || 'שגיאה', 'err'); }
}

async function deleteMishnaTask(tid) {
  if (!confirm('למחוק משימה זו? כל המשניות הקשורות אליה יימחקו.')) return;
  await api(`/api/mishna/tasks/${tid}`, 'DELETE');
  toast('נמחק', 'ok');
  await loadMishnaTab();
}

/* ── parent review actions ── */
async function approveMishnaItem(iid, fromAppr = false) {
  try {
    await api(`/api/mishna/items/${iid}/approve`, 'POST');
    toast('✅ משנה אושרה! נקודות הוספו', 'ok');
    if (fromAppr) { await loadApprovals(); await loadMishnaPendingInApprovals(); }
    else await loadMishnaTab();
  } catch (e) { toast(e.message || 'שגיאה', 'err'); }
}

async function needsReviewMishnaItem(iid, fromAppr = false) {
  try {
    await api(`/api/mishna/items/${iid}/needs-review`, 'POST');
    toast('🔄 הוחזר לחזרה נוספת', 'ok');
    if (fromAppr) { await loadApprovals(); await loadMishnaPendingInApprovals(); }
    else await loadMishnaTab();
  } catch (e) { toast(e.message || 'שגיאה', 'err'); }
}

async function returnMishnaItem(iid, fromAppr = false) {
  try {
    await api(`/api/mishna/items/${iid}`, 'DELETE');
    toast('↩ המשנה הוחזרה — הילד יכול ללוקחה שוב', 'ok');
    if (fromAppr) { await loadApprovals(); await loadMishnaPendingInApprovals(); }
    else await loadMishnaTab();
  } catch (e) { toast(e.message || 'שגיאה', 'err'); }
}
