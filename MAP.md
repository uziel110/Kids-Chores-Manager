# 🗺️ מפת הפרויקט — kids-chores

> קרא קובץ זה לפני כל עריכה. הוא מסביר איפה נמצא כל דבר ומה אחראי על מה.

---

## מבנה תיקיות

```
kids-chores/
├── MAP.md                    ← אתה כאן
├── main.py                   ← Backend: FastAPI + כל ה-endpoints
├── data.json                 ← מסד נתונים JSON (נוצר אוטומטית)
├── requirements.txt          ← תלויות Python
├── photos/                   ← תמונות אווטאר שהועלו
├── static/
│   ├── index.html            ← מעטפת ה-SPA + כל ה-modals
│   ├── css/
│   │   └── style.css         ← כל הסגנונות
│   └── js/
│       ├── state.js          ← קבוע ראשון לטעינה: state, api(), helpers
│       ├── ui.js             ← screensaver, confetti, timers, birthday
│       ├── home.js           ← דף הבית, leaderboard, active runs
│       ├── chores.js         ← דף מטלות ילד: load/take/finish/release
│       ├── rewards.js        ← חנות פרסים לילד
│       ├── stats.js          ← דף סטטיסטיקות
│       ├── parent.js         ← פאנל הורים: login, approvals, כל ה-CRUD
│       ├── onboarding.js     ← הדרכה interaktivit עם canvas spotlight
│       └── init.js           ← קובץ אחרון לטעינה: init() + long-press help
```

---

## סדר טעינת הקבצים (index.html)

חשוב! הסדר קריטי:
```
state.js → ui.js → home.js → chores.js → rewards.js → stats.js → parent.js → onboarding.js → init.js
```

`state.js` חייב להיות ראשון (מגדיר `S`, `api()`, `toast()` וכו').  
`init.js` חייב להיות אחרון (קורא ל-`init()` שתלוי בכל השאר).

---

## מה נמצא איפה

### index.html
- כל מבנה ה-HTML של ה-SPA
- כל ה-modals (m-pw, m-confirm, m-child, m-chore, m-reward, m-pts, ...)
- Navbar עם כפתורי ניווט ו-`#helpBtn`
- **IDs חשובים לonboarding**: `#btn-add-child`, `#btn-add-chore`, `#btn-add-reward`

### style.css
סקציות עם כותרות מפורשות:
```
VARIABLES → RESET → NAVBAR → SCREENS → CHILD CARDS → CHORE CARDS →
REWARD CARDS → STATS → PARENT PANEL → MODALS → GENDER BUTTONS →
CHILD CHECKBOXES → HELP BUTTON → CONTEXT HELP OVERLAY →
REWARD PHOTO → TOGGLE SWITCH → CHORE FILTER BAR → KEYFRAMES → RESPONSIVE
```

### state.js
- `const S` — כל ה-state המשותף של האפליקציה
- `let _allChores/Rewards/Children/RewardClaims` — cache מה-API
- `function api()` — wrapper ל-fetch
- `function showScreen()`, `openM()`, `closeM()` — navigation helpers
- `function avatarHtml()`, `toast()`, `isChildEligibleForReward()` — shared utils
- `_findChildById()`, `_findChoreById()`, `_findRewardById()` — cache lookups

### ui.js
- `resetSS()`, `showSS()`, `hideSS()` — screensaver
- `confetti()` — אפקט קונפטי
- `deadlineStr()`, `fmtSecs()`, `pad()`, `startTimers()` — countdown timers
- `checkBirthdays()`, `closeBday()` — overlay יום הולדת

### home.js
- `goHome()` — navigation + אם עוזב פאנל הורים מאפס `parentAuthed`
- `refreshHome()` — מרענן ילדים + leaderboard + active runs
- `renderChildren()` — כרטיסיות ילדים; גם מעדכן `_allChildren`
- `renderLeaderboard()` — לוח מובילים שבועי
- `refreshActiveOnly()` — מטלות פעילות עם lane-cards

### chores.js
- `openChores(childId)` — מנווט למסך מטלות ילד
- `openChildRewards(childId)` — מנווט לחנות פרסים מתוך מסך ילד
- `loadChildActiveRuns(childId)` — הצגת run-chips פעילים
- `loadChores(childId, filter)` — טוען ומציג כרטיסיות מטלה
- `noAvailableChoresHtml()` — הודעת empty-state לפי שעה
- `askTake(choreId)` — modal אישור לקיחת מטלה
- `doTakeChore()`, `getRandomChore()` — לקיחת מטלה
- `finishRun(runId)`, `promptRelease(runId)`, `doRelease()` — סיום/שחרור

### rewards.js
- `showRewards()` — דף בחירת ילד לחנות
- `pickRewChild(childId)` — טוען פרסים מסוננים לפי `isChildEligibleForReward()`
- `backToRewPicker()` — חזרה לבחירת ילד
- `claimRew(rewId)` — בקשת פרס

### stats.js
- `showStats()` — טוען ומציג stat-cards + today-summary

### parent.js
**Auth**: `showParentLogin()`, `verifyPw()`  
**Tabs**: `parTab(name, btn)`, `openParentGuideTab(tabName)`  
**Approvals**: `loadApprovals()`, `approveRun/rejectRun/parentRelease/approveClaim/cancelClaim()`  
**Data**: `exportData()`, `importData()`, `changePw()`

**Children CRUD**: `loadChildTable()`, `sortChildTable()`, `renderChildTable()`  
`showAddChild()`, `editChild(k)`, `saveChild()`, `delChild()`  
`openPtsModal()`, `loadPtsHistory()`, `setPtsSign()`, `updatePtsPreview()`, `applyQuickDelta()`, `doAdjustPoints()`  
`selGender()`, `initAvPicker()`, `initColPicker()`, `selAv()`, `selCol()`  
`updateChildPreview()`, `onPhotoUpload()`, `clearPhoto()`

**Chores CRUD**: `loadChoreTable()`, `choreSortBy()`, `renderChoreTable()`  
`toggleChore()`, `showAddChore()`, `editChore(c)`, `saveChore()`, `delChore()`  
`updateRepeatUI()`, `buildDaysBtns()`, `toggleDay()`  
`updateMaxTakersUI()`, `updateMaxPerDayUI()`, `updateChoreTargetUI()`

**Rewards CRUD**: `loadRewardTable()`, `rewSortBy()`, `renderRewardTable()`  
`toggleReward()`, `showAddReward()`, `editRew(r)`, `saveReward()`, `delRew()`  
`updateMaxClaimsUI()`, `updateRewTargetUI()`

**Audience helpers**: `_populateChoreChildCheckboxes()`, `_populateRewChildCheckboxes()`, `_getCheckedChildIds()`  
**Reward photo**: `onRewPhotoUpload()`, `clearRewPhoto()`  
**Emoji picker**: `buildEmojiPicker()`, `switchEmojiCat()`, `renderEmojiGrid()`, `pickEmoji()`, `toggleEmojiPicker()`, `closeEmojiPicker()`

### onboarding.js
IIFE — לא מגדיר globals חוץ מ-`window.startOnboarding()`.  
מכיל:
- `STEPS[]` — הגדרת כל שלבי ההדרכה (26 שלבים המכסים כל מסך)
- Canvas engine: `_buildDOM()`, `_resizeCanvas()`, `_draw()`, `_startPulse()`, `_positionCard()`, `_renderStep()`
- Flow: `startOnboarding()`, `_runStep()`, `nextStep()`, `skipAll()`, `_finish()`
- מסתיים עם `localStorage.setItem('is_onboarding_complete','1')`

**לשינוי שלב**: ערוך את `STEPS[]`. כל שלב: `{ targetQuery, emoji, title, body, arrowDir, beforeStep() }`.

### init.js
- `async function init()` — נקודת הכניסה
- מגדיר long-press על `#helpBtn` (700ms) → `startOnboarding()`
- בוחן אם יש ילדים; אם לא ואין `is_onboarding_complete` → מפעיל `startOnboarding()`
- מסתיים ב-`init();`

---

## מודל הנתונים

### Child
```
id, name, birthdate, age, points, total_points, total_chores,
total_time_minutes, color, avatar, weekly_points, weekly_chores,
photo (base64|null), gender ("boy"|"girl"|"")
```

### Chore
```
id, title, points, location, icon, min_age, max_age,
time_start, time_end, duration_minutes, repeat_type,
repeat_days, repeat_interval, max_takers, max_per_child_per_day,
enabled, gender_filter ("all"|"boys"|"girls"),
allowed_child_ids []   ← מבטל gender_filter כשאינו ריק
```

### Reward
```
id, title, points_cost, icon, max_claims, available,
gender_filter, allowed_child_ids [], photo (base64|null)
```

---

## Backend (main.py)

**Endpoints עיקריים:**
```
GET/POST   /api/children
PUT/DELETE /api/children/{id}
GET        /api/children/birthdays
POST       /api/children/{id}/adjust-points
GET        /api/leaderboard
GET        /api/chores
POST       /api/chores
PUT/DELETE /api/chores/{id}
POST       /api/chores/{id}/toggle
GET        /api/chores/for/{child_id}  ← מסנן לפי גיל/מגדר/allowed_child_ids/זמן/slots
POST       /api/chores/random/{child_id}
GET/POST   /api/rewards
PUT/DELETE /api/rewards/{id}
POST       /api/rewards/{id}/toggle
POST       /api/rewards/{id}/claim     ← מאמת eligibility
GET        /api/rewards/claims/all
GET        /api/rewards/claims/pending
POST       /api/rewards/claims/{id}/approve|cancel
POST       /api/runs/start             ← מאמת eligibility
GET        /api/runs/active
GET        /api/runs/for-child/{id}
POST       /api/runs/{id}/finish|approve|reject|release
GET        /api/runs/today-summary
GET        /api/stats
GET        /api/points-history/{child_id}
POST       /api/auth/verify
POST       /api/auth/change-password
GET        /api/export
POST       /api/import
```

---

## מתכוני שינויים נפוצים

### הוספת שדה חדש למטלה
1. `main.py` → `ChoreModel` + `migrate_chore()`
2. `index.html` → `#m-chore` modal
3. `parent.js` → `showAddChore()` (reset) + `editChore()` (restore) + `saveChore()` (send)

### הוספת שדה חדש לפרס
אותו תבנית: `RewardModel` + `migrate_reward()` + `showAddReward/editRew/saveReward`

### הוספת שלב לonboarding
פתח `onboarding.js`, הוסף אובייקט ל-`STEPS[]`:
```js
{
  targetQuery: '#my-element',
  emoji: '🎯',
  title: 'כותרת בעברית',
  body: 'הסבר בעברית',
  arrowDir: 'up', // או 'down'
  async beforeStep() { showScreen('parent'); await _delay(200); }
}
```

### שינוי הסיסמה הראשונית
`main.py` → חפש `default_password` — ברירת מחדל `1234`.

### הפעלת onboarding ידנית
לחיצה ארוכה (700ms) על כפתור ה-`?` בסרגל הניווט.  
או בקונסול: `localStorage.removeItem('is_onboarding_complete'); startOnboarding();`

---

## הפעלת השרת

```bash
# Python
C:\Users\uziel\AppData\Local\Python\bin\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000

# דרך Task Scheduler: install_scheduler.bat
# ניהול: manage_scheduler.bat
```

גישה: `http://localhost:8000` או `http://[IP]:8000` ברשת הביתית.
