/* ═══════════════════════════════════════════════
   init.js — App entry point
   Must be loaded LAST after all other modules.
   Depends on: state.js, ui.js, home.js, chores.js,
               rewards.js, stats.js, parent.js, onboarding.js
═══════════════════════════════════════════════ */

/* ── Context help (? button short press) ── */
function triggerContextHelp() {
  if (typeof window.startOnboarding !== 'function') {
    console.error('startOnboarding not found!');
    return;
  }
  localStorage.removeItem('is_onboarding_complete');
  startOnboarding();
}

async function init() {
  document.getElementById('cBirthdate').max = new Date().toISOString().split('T')[0];
  buildEmojiPicker();
  await refreshHome();
  setInterval(refreshActiveOnly, 30_000);
  resetSS();
  ['click', 'keydown', 'touchstart'].forEach(e => document.addEventListener(e, resetSS));
  await checkBirthdays();

  /* ── Auto-trigger onboarding for new installs ── */
  if (!localStorage.getItem('is_onboarding_complete')) {
    try {
      const kids = await api('/api/children');
      if (!kids.length) {
        setTimeout(startOnboarding, 600);
      }
    } catch (e) {}
  }
}

init();
