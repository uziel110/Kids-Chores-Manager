/* ═══════════════════════════════════════════════
   rewards.js — Child reward shop
   Used by: chores.js (openChildRewards), navbar
═══════════════════════════════════════════════ */

async function showRewards() {
  showScreen('rewards');
  S.rewChildId = null;
  document.getElementById('rewChildPick').style.display = 'block';
  document.getElementById('rewContent').style.display   = 'none';
  const backBtn = document.getElementById('rewBackBtn');
  if (backBtn) { backBtn.onclick = goHome; }
  const kids = await api('/api/children');
  document.getElementById('rewChildGrid').innerHTML = kids.length
    ? kids.map(k => `
        <div class="child-card" onclick="pickRewChild('${k.id}')" style="--cc:${k.color}">
          <div class="child-av-wrap" style="border-color:${k.color}">${avatarHtml(k, 'child-av-emoji')}</div>
          <div class="child-name">${k.name}</div>
          <div class="child-pts">⭐ ${k.points || 0}</div>
        </div>`).join('')
    : `<div class="child-card child-card-placeholder" onclick="showParentLogin()">
        <div class="child-av-wrap" style="border-color:var(--border)">
          <span class="child-av-emoji" style="font-size:32px;opacity:.4">👤</span>
        </div>
        <div class="child-name" style="color:var(--muted)">הוסף ילד</div>
        <div class="child-pts" style="color:var(--muted)">פאנל הורים ←</div>
      </div>`;
}

async function pickRewChild(childId) {
  const kids  = await api('/api/children');
  const child = kids.find(c => c.id === childId);
  S.rewChildId = childId;
  document.getElementById('rewChildPick').style.display = 'none';
  document.getElementById('rewContent').style.display   = 'block';

  const fromChild = S.currentChild && S.currentChild.id === childId;
  const backBtn = document.getElementById('rewBackBtn');
  if (backBtn) backBtn.onclick = fromChild ? () => showScreen('chores') : backToRewPicker;

  document.getElementById('rewHeader').innerHTML = `
    <div class="chore-header" style="--cc:${child.color}">
      <div class="chore-hav" style="border-color:${child.color}">${avatarHtml(child)}</div>
      <div class="chore-hinfo">
        <h2>פרסים של ${child.name}</h2>
        <div class="pts">⭐ ${child.points || 0} נקודות</div>
      </div>
    </div>`;

  const rewards   = await api('/api/rewards');
  const allClaims = await api('/api/rewards/claims/all').catch(() => []);

  const isSoldOut = r => {
    const mc = r.max_claims ?? 0;
    return mc > 0 && allClaims.filter(c => c.reward_id === r.id && c.status === 'approved').length >= mc;
  };

  const myRewards = rewards.filter(r => isChildEligibleForReward(child, r));
  const active    = myRewards.filter(r => r.available !== false && !isSoldOut(r));
  const inactive  = myRewards.filter(r => r.available === false  ||  isSoldOut(r));

  const byPriceDesc = (a, b) => (b.points_cost || 0) - (a.points_cost || 0);
  active.sort(byPriceDesc);
  inactive.sort(byPriceDesc);

  const renderCard = r => {
    const mc           = r.max_claims ?? 0;
    const approvedCnt  = allClaims.filter(c => c.reward_id === r.id && c.status === 'approved').length;
    const limitReached = mc > 0 && approvedCnt >= mc;
    const hasPoints    = (child.points || 0) >= r.points_cost;
    const canClaim     = r.available !== false && hasPoints && !limitReached;
    const cardClass    = limitReached ? 'soldout' : (canClaim ? 'can' : 'no');
    const onclickAttr  = canClaim ? `onclick="claimRew('${r.id}')"` : '';
    const imgHtml      = r.photo
      ? `<img src="${r.photo}" class="rew-photo" alt="">`
      : `<div class="rew-icon">${r.icon || '🎁'}</div>`;
    return `<div class="rew-card ${cardClass}" ${onclickAttr}>
      ${imgHtml}
      <div class="rew-title">${r.title}</div>
      <div class="rew-cost">⭐ ${r.points_cost}</div>
      ${limitReached
        ? '<div style="color:#ff4d4d;font-size:12px;font-weight:700">🚫 אזל מהמלאי</div>'
        : r.available === false
          ? '<div style="color:var(--muted);font-size:12px;font-weight:700">⏸ לא זמין כרגע</div>'
          : hasPoints
            ? `<button class="btn-claim" onclick="event.stopPropagation();claimRew('${r.id}')">🎁 אני רוצה!</button>`
            : '<div style="color:var(--muted);font-size:12px;font-weight:700">❌ אין מספיק נקודות</div>'
      }
    </div>`;
  };

  const inactiveSection = inactive.length ? `
    <div class="rew-section-divider">⏸ לא זמין כרגע</div>
    <div class="rewards-grid rew-inactive-grid">${inactive.map(renderCard).join('')}</div>` : '';

  document.getElementById('rewardsGrid').innerHTML = active.length || inactive.length
    ? `${active.map(renderCard).join('')}${inactiveSection}`
    : '<div class="empty"><div class="empty-ico">🎁</div><p>אין פרסים זמינים עבורך כרגע</p></div>';
}

function backToRewPicker() {
  document.getElementById('rewChildPick').style.display = 'block';
  document.getElementById('rewContent').style.display   = 'none';
  const backBtn = document.getElementById('rewBackBtn');
  if (backBtn) backBtn.onclick = goHome;
}

async function claimRew(rewId) {
  try {
    await api(`/api/rewards/${rewId}/claim`, 'POST', { child_id: S.rewChildId });
    toast('🎉 פרס נדרש! ממתין לאישור הורה', 'ok');
    pickRewChild(S.rewChildId);
  } catch (e) { toast(e.message || 'שגיאה', 'err'); }
}
