/* ═══════════════════════════════════════════════
   state.js — Global state, constants, shared helpers
   Used by: all other modules
═══════════════════════════════════════════════ */

/* ── Constants ── */
const EMOJI_CATS = [
  { label:'🏠', name:'בית', emojis:['🍽️','🥄','🍳','🧹','🧽','🪣','🧺','🧴','🧻','🪥','🚿','🛁','🪤','🔧','🪜','🛏️','🪑','🚪','🪟','💡','🕯️','🛋️','📦','🗑️','🧯'] },
  { label:'🌿', name:'טבע', emojis:['🌱','🌻','🌸','🌿','🍃','💐','🌷','🌾','🍂','🍁','🌲','🎋','🪴','🐕','🐈','🐠','🐇','🐓','🐝','🦋'] },
  { label:'⭐', name:'כיף', emojis:['⭐','🌟','✨','🎯','🎉','🎊','🏆','🥇','🎁','💎','🦄','🌈','🎠','🎡','🎢','🎪','🎭','🎨','🎮','🕹️'] },
  { label:'🍎', name:'אוכל', emojis:['🍎','🍊','🍋','🍇','🍓','🥦','🥕','🥑','🍕','🍔','🌮','🍜','🍣','🧁','🍰','🍦','🍬','🍩','🥐','☕'] },
  { label:'⚽', name:'ספורט', emojis:['⚽','🏀','🎾','🏐','🥊','🏋️','🤸','🚴','🏊','🧘','⛷️','🎿','🛹','🏄','🤽','🧗','🏇','🥋','🏌️','🎣'] },
];
const KID_AVATARS = ['👦','👧','🧒','👶','🦁','🐯','🦊','🐸','🦋','🐬','🦕','🐉','🤖','👾','🧙','🧚','🧜','🦸','🧑‍🚀','🎅'];
const COLORS      = ['#FF6B6B','#4ECDC4','#FFE66D','#A78BFA','#FF8C42','#4FC3F7','#FF6B9D','#66BB6A','#FF7043','#26C6DA'];
const DAY_VALS    = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const DAY_HE_A    = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

/* ── App state (mutable) ── */
const S = {
  currentChild:  null,
  currentChore:  null,
  activeRuns:    [],
  ssTimer:       null,
  SS_DELAY:      3 * 60 * 1000,
  parentAuthed:  false,
  selAvatar:     '⭐',
  selColor:      '#FF8C42',
  selPhoto:      null,
  rewChildId:    null,
  selDays:       new Set(),
  emojiCatIdx:   0,
  choreSortCol:  'title',   choreSortDir: 'asc',
  rewSortCol:    'points_cost', rewSortDir: 'asc',
  childSortCol:  'name',    childSortDir: 'asc',
};

/* ── Cached API data (set by parent-panel loaders) ── */
let _allChores       = [];
let _allRewards      = [];
let _allRewardClaims = [];
let _allChildren     = [];

function _findChildById(id)  { return _allChildren.find(c => c.id === id) || null; }
function _findChoreById(id)  { return _allChores.find(c => c.id === id)   || null; }
function _findRewardById(id) { return _allRewards.find(r => r.id === id)  || null; }

/* ── API ── */
async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e?.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

/* ── Screen helpers ── */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('s-' + id).classList.add('active');
}

/* ── Modal helpers ── */
function openM(id)  { document.getElementById(id).classList.add('show'); }
function closeM(id) { document.getElementById(id).classList.remove('show'); }
document.querySelectorAll('.overlay').forEach(o =>
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('show'); })
);

/* ── Avatar HTML ── */
function avatarHtml(entity, emojiClass = '') {
  if (entity && entity.photo)
    return `<img src="${entity.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  const cls = emojiClass ? ` class="${emojiClass}"` : '';
  return `<span${cls}>${entity?.avatar || '⭐'}</span>`;
}

/* ── Toast ── */
function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.getElementById('toast-box').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ── Eligibility ── */
function isChildEligibleForReward(child, rew) {
  const allowed = rew.allowed_child_ids || [];
  if (allowed.length) return allowed.includes(child.id);
  const gf = rew.gender_filter || 'all';
  if (gf === 'boys')  return child.gender === 'boy';
  if (gf === 'girls') return child.gender === 'girl';
  return true;
}
