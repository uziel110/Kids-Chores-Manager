"""
Kids Chore Management System - FastAPI Backend v4
מערכת ניהול מטלות לילדים
"""

import json, os, uuid, random, base64, re
from datetime import datetime, date, timedelta
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Kids Chore Manager v4")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_FILE  = os.path.join(BASE_DIR, "data.json")
STATIC_DIR = os.path.join(BASE_DIR, "static")
SHARED_DIR = os.path.join(BASE_DIR, "shared")
PHOTOS_DIR = os.path.join(BASE_DIR, "photos")
os.makedirs(PHOTOS_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/shared", StaticFiles(directory=SHARED_DIR), name="shared")
app.mount("/photos", StaticFiles(directory=PHOTOS_DIR), name="photos")

# ─── helpers ──────────────────────────────────────────────────────────────

def load_data():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_data(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def now_str():  return datetime.now().isoformat()
def gen_id():   return str(uuid.uuid4())[:8]

def calc_age(bd: str) -> int:
    try:
        b = date.fromisoformat(bd); t = date.today()
        return t.year - b.year - ((t.month, t.day) < (b.month, b.day))
    except: return 0

def is_birthday_today(bd: str) -> bool:
    try:
        b = date.fromisoformat(bd); t = date.today()
        return b.month == t.month and b.day == t.day
    except: return False

DAY_HE = {"sunday":"ראשון","monday":"שני","tuesday":"שלישי",
           "wednesday":"רביעי","thursday":"חמישי","friday":"שישי","saturday":"שבת"}

def chore_time_status(ch: dict):
    now = datetime.now()
    today_str = now.strftime("%A").lower()
    window_end_iso = ""

    try:
        sh, sm = map(int, ch.get("time_start","00:00").split(":"))
        eh, em = map(int, ch.get("time_end","23:59").split(":"))
        win_start = now.replace(hour=sh, minute=sm, second=0, microsecond=0)
        win_end   = now.replace(hour=eh, minute=em, second=0, microsecond=0)
        earliest  = win_start - timedelta(minutes=30)
        window_end_iso = win_end.isoformat()

        if now < earliest:
            diff = int((earliest - now).total_seconds() / 60)
            return False, f"ניתן לקחת מ-{earliest.strftime('%H:%M')} (עוד {diff} דק')", ""
        if now > win_end:
            return False, f"חלון הזמן הסתיים ב-{ch.get('time_end','')}", ""
    except:
        pass

    rep  = ch.get("repeat_type", "daily")
    days = [d.lower() for d in ch.get("repeat_days", [])]
    if rep == "weekly":
        if days and today_str not in days:
            return False, "ימים: " + ", ".join(DAY_HE.get(d,d) for d in days), ""
    if rep == "every_n_weeks":
        interval = ch.get("repeat_interval", 1)
        if days and today_str not in days:
            return False, "ימים: " + ", ".join(DAY_HE.get(d,d) for d in days), ""
        epoch = date(2024, 1, 7)
        if ((date.today() - epoch).days // 7) % interval != 0:
            return False, f"כל {interval} שבועות", ""
    return True, "", window_end_iso

def chore_taken_today(ch: dict, all_runs: list, child_id: str = None) -> bool:
    if ch.get("repeat_type") == "once":
        return False
    mt   = ch.get("max_takers", 1)
    mpd  = ch.get("max_per_child_per_day", 1)
    today = date.today().isoformat()

    if mt == 1:
        for r in all_runs:
            if r["chore_id"] != ch["id"]:
                continue
            if r["status"] not in ("in_progress", "waiting_approval", "done"):
                continue
            if (r.get("started_at", "") or "")[:10] == today:
                return True
        return False

    if mpd == 0:
        return False

    count = sum(
        1 for r in all_runs
        if r["chore_id"] == ch["id"]
        and r.get("child_id") == child_id
        and r["status"] in ("in_progress", "waiting_approval", "done")
        and (r.get("started_at", "") or "")[:10] == today
    )
    return count >= mpd

def slot_status(ch: dict, active_runs: list):
    mt  = ch.get("max_takers", 1)
    cnt = sum(1 for r in active_runs if r["chore_id"]==ch["id"] and r["status"] in ("in_progress","waiting_approval"))
    if mt == 0:
        return True, cnt, 0
    return cnt < mt, cnt, mt

def migrate_child(c: dict) -> dict:
    c = dict(c)
    if not c.get("birthdate"):
        age = c.get("age", 8)
        c["birthdate"] = f"{date.today().year - age}-01-01"
    c["age"] = calc_age(c["birthdate"])
    c.setdefault("total_points", c.get("points", 0))
    c.setdefault("total_chores", 0)
    c.setdefault("total_time_minutes", 0)
    c.setdefault("weekly_points", 0)
    c.setdefault("weekly_chores", 0)
    c.setdefault("photo", None)
    c.setdefault("gender", "")  # "boy" | "girl" | ""
    return c

def migrate_chore(ch: dict) -> dict:
    ch = dict(ch)
    ch.setdefault("max_takers", 1)
    ch.setdefault("duration_minutes", 30)
    ch.setdefault("max_per_child_per_day", 1)
    ch.setdefault("enabled", True)
    ch.setdefault("gender_filter", "all")       # "all" | "boys" | "girls"
    ch.setdefault("allowed_child_ids", [])       # [] = all children
    return ch

def migrate_reward(r: dict) -> dict:
    r = dict(r)
    r.setdefault("gender_filter", "all")         # "all" | "boys" | "girls"
    r.setdefault("allowed_child_ids", [])         # [] = all children
    r.setdefault("photo", None)                   # base64 data URI or None
    return r

def child_eligible_for_chore(child: dict, ch: dict) -> bool:
    """Check if a child is eligible for a chore based on gender/specific-child filters."""
    gf = ch.get("gender_filter", "all")
    allowed = ch.get("allowed_child_ids", [])

    # Specific children filter overrides gender filter
    if allowed:
        return child["id"] in allowed

    # Gender filter
    if gf == "boys":
        return child.get("gender", "") == "boy"
    if gf == "girls":
        return child.get("gender", "") == "girl"
    return True  # "all"

def child_eligible_for_reward(child: dict, rew: dict) -> bool:
    """Check if a child is eligible for a reward based on gender/specific-child filters."""
    gf = rew.get("gender_filter", "all")
    allowed = rew.get("allowed_child_ids", [])

    if allowed:
        return child["id"] in allowed

    if gf == "boys":
        return child.get("gender", "") == "boy"
    if gf == "girls":
        return child.get("gender", "") == "girl"
    return True

def enrich(runs, cm, chm):
    result = []
    for r in runs:
        rc = dict(r)
        rc["child"] = cm.get(r["child_id"], {})
        rc["chore"] = chm.get(r["chore_id"], {})
        result.append(rc)
    return result

# ─── models ───────────────────────────────────────────────────────────────

class ChildModel(BaseModel):
    name: str
    birthdate: str
    color: str = "#FF6B6B"
    avatar: str = "⭐"
    photo: Optional[str] = None
    gender: str = ""  # "boy" | "girl" | ""

class ChoreModel(BaseModel):
    title: str
    points: int
    location: str
    min_age: int = 4
    max_age: int = 12
    time_start: str = "08:00"
    time_end: str   = "20:00"
    duration_minutes: int = 30
    repeat_type: str = "daily"
    repeat_days: List[str] = []
    repeat_interval: int = 1
    icon: str = "⭐"
    max_takers: int = 1
    max_per_child_per_day: int = 1
    gender_filter: str = "all"       # "all" | "boys" | "girls"
    allowed_child_ids: List[str] = []  # empty = all

class RewardModel(BaseModel):
    title: str
    points_cost: int
    icon: str = "🎁"
    max_claims: int = 0
    gender_filter: str = "all"       # "all" | "boys" | "girls"
    allowed_child_ids: List[str] = []  # empty = all
    photo: Optional[str] = None      # base64 data URI

class PwCheck(BaseModel):
    password: str

# ─── routes ───────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def root():
    with open(os.path.join(BASE_DIR, "static", "index.html"), "r", encoding="utf-8") as f:
        return f.read()

# ── children ──────────────────────────────────────────────────────────────

@app.get("/api/children")
async def get_children():
    data = load_data()
    _maybe_reset(data)
    data["children"] = [migrate_child(c) for c in data["children"]]
    save_data(data)
    return data["children"]

@app.get("/api/children/birthdays")
async def birthdays():
    data = load_data()
    return [migrate_child(dict(c)) for c in data["children"]
            if is_birthday_today(c.get("birthdate", ""))]

@app.post("/api/children")
async def add_child(child: ChildModel):
    data = load_data()
    nc = {
        "id": gen_id(), "name": child.name, "birthdate": child.birthdate,
        "age": calc_age(child.birthdate), "points": 0, "total_points": 0,
        "total_chores": 0, "total_time_minutes": 0, "color": child.color,
        "avatar": child.avatar, "weekly_points": 0, "weekly_chores": 0,
        "photo": child.photo, "gender": child.gender,
    }
    data["children"].append(nc)
    save_data(data)
    return nc

@app.put("/api/children/{cid}")
async def update_child(cid: str, child: ChildModel):
    data = load_data()
    for c in data["children"]:
        if c["id"] == cid:
            c.update({
                "name": child.name, "birthdate": child.birthdate,
                "age": calc_age(child.birthdate), "color": child.color,
                "avatar": child.avatar, "photo": child.photo,
                "gender": child.gender,
            })
            save_data(data)
            return c
    raise HTTPException(404, "Not found")

@app.delete("/api/children/{cid}")
async def del_child(cid: str):
    data = load_data()
    data["children"] = [c for c in data["children"] if c["id"] != cid]
    save_data(data)
    return {"ok": True}

@app.post("/api/children/{cid}/adjust-points")
async def adjust_points(cid: str, payload: dict):
    delta  = int(payload.get("delta", 0))
    reason = payload.get("reason", "ניהול הורים").strip() or "ניהול הורים"
    if delta == 0:
        raise HTTPException(400, "דלטא לא יכול להיות 0")
    data = load_data()
    child = next((c for c in data["children"] if c["id"] == cid), None)
    if not child:
        raise HTTPException(404, "Not found")
    child["points"]       = max(0, child.get("points", 0) + delta)
    child["total_points"] = child.get("total_points", 0) + max(delta, 0)
    if delta > 0:
        child["weekly_points"] = child.get("weekly_points", 0) + delta
    data["points_history"].append({
        "id": gen_id(), "child_id": cid,
        "points": delta, "reason": reason, "date": now_str(),
    })
    save_data(data)
    return migrate_child(dict(child))

# ── chores ────────────────────────────────────────────────────────────────

@app.get("/api/chores")
async def get_chores():
    return [migrate_chore(ch) for ch in load_data()["chores"]]

@app.get("/api/chores/for/{child_id}")
async def chores_for_child(child_id: str):
    data = load_data()
    child = next((migrate_child(c) for c in data["children"] if c["id"] == child_id), None)
    if not child:
        raise HTTPException(404, "Child not found")
    age = child["age"]

    all_runs    = data["chore_runs"]
    all_active  = [r for r in all_runs if r["status"] in ("in_progress", "waiting_approval")]
    child_ip_ids = {r["chore_id"] for r in all_active if r["child_id"] == child_id}

    result = []
    for ch in data["chores"]:
        ch = migrate_chore(dict(ch))
        if not ch.get("enabled", True):
            continue
        if not (ch.get("min_age", 0) <= age <= ch.get("max_age", 99)):
            continue

        # Gender / specific-child filter
        if not child_eligible_for_chore(child, ch):
            continue

        if ch.get("repeat_type") == "once":
            if any(r["chore_id"] == ch["id"] and r["status"] in ("done", "waiting_approval", "in_progress")
                   for r in all_runs):
                continue

        avail, reason, win_end_iso = chore_time_status(ch)
        sok, cnt, mt = slot_status(ch, all_active)
        child_taking = ch["id"] in child_ip_ids
        taken_today  = chore_taken_today(ch, all_runs, child_id)

        today = date.today().isoformat()
        child_daily_count = sum(
            1 for r in all_runs
            if r["chore_id"] == ch["id"]
            and r.get("child_id") == child_id
            and r["status"] in ("in_progress", "waiting_approval", "done")
            and (r.get("started_at", "") or "")[:10] == today
        )

        ch["time_available"]    = avail
        ch["time_reason"]       = reason
        ch["window_end_iso"]    = win_end_iso
        ch["slot_available"]    = sok
        ch["active_count"]      = cnt
        ch["max_takers"]        = mt
        ch["child_taking"]      = child_taking
        ch["taken_today"]       = taken_today
        ch["child_daily_count"] = child_daily_count
        ch["can_take"]          = avail and sok and not child_taking and not taken_today
        result.append(ch)

    return result

@app.get("/api/chores/random/{child_id}")
async def random_chore(child_id: str):
    data = load_data()
    child = next((migrate_child(c) for c in data["children"] if c["id"] == child_id), None)
    if not child:
        raise HTTPException(404, "Not found")
    all_runs   = data["chore_runs"]
    all_active = [r for r in all_runs if r["status"] in ("in_progress", "waiting_approval")]
    child_ip   = {r["chore_id"] for r in all_active if r["child_id"] == child_id}
    pool = []
    for ch in data["chores"]:
        ch = migrate_chore(dict(ch))
        if not (ch.get("min_age", 0) <= child["age"] <= ch.get("max_age", 99)):
            continue
        if not child_eligible_for_chore(child, ch):
            continue
        if ch["id"] in child_ip:
            continue
        if ch.get("repeat_type") == "once":
            if any(r["chore_id"] == ch["id"] and r["status"] in ("done","waiting_approval","in_progress")
                   for r in all_runs):
                continue
        if chore_taken_today(ch, all_runs, child_id):
            continue
        avail, _, _ = chore_time_status(ch)
        if not avail:
            continue
        sok, _, _ = slot_status(ch, all_active)
        if sok:
            pool.append(ch)
    if not pool:
        raise HTTPException(400, "No available chores")
    return random.choice(pool)

@app.post("/api/chores")
async def add_chore(ch: ChoreModel):
    data = load_data()
    nc = {"id": gen_id(), **ch.dict()}
    data["chores"].append(nc)
    save_data(data)
    return nc

@app.put("/api/chores/{chid}")
async def update_chore(chid: str, ch: ChoreModel):
    data = load_data()
    for c in data["chores"]:
        if c["id"] == chid:
            enabled = c.get("enabled", True)
            c.update(ch.dict())
            c["enabled"] = enabled
            save_data(data)
            return c
    raise HTTPException(404, "Not found")

@app.post("/api/chores/{chid}/toggle")
async def toggle_chore(chid: str):
    data = load_data()
    for c in data["chores"]:
        if c["id"] == chid:
            c["enabled"] = not c.get("enabled", True)
            save_data(data)
            return {"id": chid, "enabled": c["enabled"]}
    raise HTTPException(404, "Not found")

@app.delete("/api/chores/{chid}")
async def del_chore(chid: str):
    data = load_data()
    data["chores"] = [c for c in data["chores"] if c["id"] != chid]
    save_data(data)
    return {"ok": True}

# ── runs ──────────────────────────────────────────────────────────────────

@app.get("/api/runs/active")
async def active_runs():
    data = load_data()
    active = [r for r in data["chore_runs"] if r["status"] in ("in_progress", "waiting_approval")]
    cm  = {c["id"]: migrate_child(c)  for c in data["children"]}
    chm = {ch["id"]: migrate_chore(ch) for ch in data["chores"]}
    return enrich(active, cm, chm)

@app.get("/api/runs/for-child/{child_id}")
async def runs_for_child(child_id: str):
    data = load_data()
    runs = [r for r in data["chore_runs"]
            if r["child_id"] == child_id and r["status"] in ("in_progress", "waiting_approval")]
    cm  = {c["id"]: migrate_child(c)  for c in data["children"]}
    chm = {ch["id"]: migrate_chore(ch) for ch in data["chores"]}
    return enrich(runs, cm, chm)

@app.post("/api/runs/start")
async def start_run(payload: dict):
    child_id = payload.get("child_id")
    chore_id = payload.get("chore_id")
    data = load_data()

    ch = next((migrate_chore(dict(c)) for c in data["chores"] if c["id"] == chore_id), None)
    if not ch:
        raise HTTPException(404, "Chore not found")

    child = next((migrate_child(dict(c)) for c in data["children"] if c["id"] == child_id), None)
    if not child:
        raise HTTPException(404, "Child not found")

    if not child_eligible_for_chore(child, ch):
        raise HTTPException(400, "מטלה זו לא מיועדת לילד זה")

    avail, reason, _ = chore_time_status(ch)
    if not avail:
        raise HTTPException(400, reason)

    all_runs   = data["chore_runs"]
    all_active = [r for r in all_runs if r["status"] in ("in_progress", "waiting_approval")]

    if chore_taken_today(ch, all_runs, child_id):
        raise HTTPException(400, "כבר ביצעת מטלה זו היום")

    sok, cnt, mt = slot_status(ch, all_active)
    if not sok:
        raise HTTPException(400, f"המטלה תפוסה כרגע ({cnt}/{mt} לוקחים)")

    if any(r["child_id"] == child_id and r["chore_id"] == chore_id and r["status"] == "in_progress"
           for r in all_runs):
        raise HTTPException(400, "כבר לוקח מטלה זו")

    duration = ch.get("duration_minutes", 30)
    deadline = (datetime.now() + timedelta(minutes=duration)).isoformat()

    run = {
        "id": gen_id(), "chore_id": chore_id, "child_id": child_id,
        "status": "in_progress", "started_at": now_str(),
        "deadline": deadline,
        "finished_at": None, "approved": False,
    }
    data["chore_runs"].append(run)
    save_data(data)
    return run

@app.post("/api/runs/{rid}/finish")
async def finish_run(rid: str):
    data = load_data()
    for r in data["chore_runs"]:
        if r["id"] == rid:
            if r["status"] != "in_progress":
                raise HTTPException(400, "Not in progress")
            r["status"] = "waiting_approval"
            r["finished_at"] = now_str()
            save_data(data)
            return r
    raise HTTPException(404, "Not found")

@app.post("/api/runs/{rid}/release")
async def release_run(rid: str, payload: dict = {}):
    data = load_data()
    for r in data["chore_runs"]:
        if r["id"] == rid:
            if r["status"] not in ("in_progress", "waiting_approval"):
                raise HTTPException(400, "Cannot release")
            r["status"] = "rejected"
            r["finished_at"] = now_str()
            save_data(data)
            return r
    raise HTTPException(404, "Not found")

@app.post("/api/runs/{rid}/approve")
async def approve_run(rid: str):
    data = load_data()
    for r in data["chore_runs"]:
        if r["id"] == rid:
            r["status"] = "done"
            r["approved"] = True
            ch = next((c for c in data["chores"] if c["id"] == r["chore_id"]), None)
            if ch:
                try:
                    started  = datetime.fromisoformat(r["started_at"])
                    finished = datetime.fromisoformat(r.get("finished_at") or now_str())
                    mins = max(1, int((finished - started).total_seconds() / 60))
                except:
                    mins = 0
                for child in data["children"]:
                    if child["id"] == r["child_id"]:
                        pts = ch["points"]
                        child["points"]             = child.get("points", 0) + pts
                        child["weekly_points"]      = child.get("weekly_points", 0) + pts
                        child["total_points"]       = child.get("total_points", 0) + pts
                        child["total_chores"]       = child.get("total_chores", 0) + 1
                        child["total_time_minutes"] = child.get("total_time_minutes", 0) + mins
                        child["weekly_chores"]      = child.get("weekly_chores", 0) + 1
                        data["points_history"].append({
                            "id": gen_id(), "child_id": r["child_id"],
                            "points": pts, "reason": f"מטלה: {ch['title']}",
                            "date": now_str(), "minutes": mins,
                        })
                        break
            save_data(data)
            return r
    raise HTTPException(404, "Not found")

@app.post("/api/runs/{rid}/reject")
async def reject_run(rid: str):
    data = load_data()
    for r in data["chore_runs"]:
        if r["id"] == rid:
            r["status"] = "rejected"
            save_data(data)
            return r
    raise HTTPException(404, "Not found")

# ── daily chore summary ───────────────────────────────────────────────────

@app.get("/api/runs/today-summary")
async def today_summary():
    data  = load_data()
    today = date.today().isoformat()
    cm    = {c["id"]: migrate_child(c)  for c in data["children"]}
    chm   = {ch["id"]: migrate_chore(ch) for ch in data["chores"]}

    agg: dict = {}
    for r in data["chore_runs"]:
        if r["status"] == "rejected":
            continue
        if (r.get("started_at", "") or "")[:10] != today:
            continue
        cid  = r["chore_id"]
        kid  = r["child_id"]
        agg.setdefault(cid, {})
        agg[cid][kid] = agg[cid].get(kid, 0) + 1

    result = []
    for chore_id, by_child in agg.items():
        ch = chm.get(chore_id)
        if not ch:
            continue
        total = sum(by_child.values())
        entries = [
            {"child": cm.get(kid, {}), "count": cnt}
            for kid, cnt in sorted(by_child.items(), key=lambda x: -x[1])
        ]
        result.append({"chore": ch, "total": total, "by_child": entries})

    return sorted(result, key=lambda x: -x["total"])

@app.get("/api/runs/today-detail")
async def today_detail(child_id: str = None):
    data  = load_data()
    today = date.today().isoformat()
    cm    = {c["id"]: migrate_child(c)  for c in data["children"]}
    chm   = {ch["id"]: migrate_chore(ch) for ch in data["chores"]}

    runs = []
    for r in data["chore_runs"]:
        if r["status"] == "rejected":
            continue
        if (r.get("started_at", "") or "")[:10] != today:
            continue
        if child_id and r["child_id"] != child_id:
            continue
        rc = dict(r)
        rc["child"] = cm.get(r["child_id"], {})
        rc["chore"] = chm.get(r["chore_id"], {})
        allocated = rc["chore"].get("duration_minutes", 30)
        try:
            started = datetime.fromisoformat(r["started_at"])
            finished_str = r.get("finished_at")
            if finished_str:
                finished = datetime.fromisoformat(finished_str)
                actual_mins = max(1, int((finished - started).total_seconds() / 60))
            else:
                actual_mins = None
        except:
            actual_mins = None
        rc["actual_minutes"]   = actual_mins
        rc["allocated_minutes"] = allocated
        rc["exceeded"] = actual_mins is not None and actual_mins > allocated
        runs.append(rc)

    return sorted(runs, key=lambda x: x.get("started_at", ""))

# ── stats ─────────────────────────────────────────────────────────────────

@app.get("/api/points-history/{child_id}")
async def get_points_history(child_id: str):
    data = load_data()
    history = [h for h in data.get("points_history", []) if h.get("child_id") == child_id]
    return list(reversed(history))[:50]

@app.get("/api/stats")
async def get_stats():
    data = load_data()
    history = data.get("points_history", [])
    result = []
    for raw in data["children"]:
        c = migrate_child(dict(raw))
        manual_delta = sum(
            h["points"] for h in history
            if h.get("child_id") == c["id"]
            and ("ידנ" in h.get("reason", "") or "בונוס" in h.get("reason", "") or "קיזוז" in h.get("reason", ""))
        )
        result.append({
            "id": c["id"], "name": c["name"],
            "avatar": c.get("avatar","⭐"), "color": c.get("color","#FF8C42"),
            "photo": c.get("photo"),
            "points_current": c.get("points", 0),
            "total_points": c.get("total_points", 0),
            "total_chores": c.get("total_chores", 0),
            "weekly_points": c.get("weekly_points", 0),
            "weekly_chores": c.get("weekly_chores", 0),
            "manual_delta": manual_delta,
        })
    return result

# ── rewards ───────────────────────────────────────────────────────────────

@app.get("/api/rewards")
async def get_rewards():
    return [migrate_reward(r) for r in load_data()["rewards"]]

@app.post("/api/rewards")
async def add_reward(r: RewardModel):
    data = load_data()
    nr = {"id": gen_id(), **r.dict(), "available": True}
    data["rewards"].append(nr)
    save_data(data)
    return nr

@app.put("/api/rewards/{rid}")
async def update_reward(rid: str, r: RewardModel):
    data = load_data()
    for rew in data["rewards"]:
        if rew["id"] == rid:
            available = rew.get("available", True)
            rew.update(r.dict())
            rew["available"] = available
            save_data(data)
            return rew
    raise HTTPException(404, "Not found")

@app.post("/api/rewards/{rid}/toggle")
async def toggle_reward(rid: str):
    data = load_data()
    for rew in data["rewards"]:
        if rew["id"] == rid:
            rew["available"] = not rew.get("available", True)
            save_data(data)
            return {"id": rid, "available": rew["available"]}
    raise HTTPException(404, "Not found")

@app.delete("/api/rewards/{rid}")
async def del_reward(rid: str):
    data = load_data()
    data["rewards"] = [r for r in data["rewards"] if r["id"] != rid]
    save_data(data)
    return {"ok": True}

@app.post("/api/rewards/{rid}/claim")
async def claim_reward(rid: str, payload: dict):
    child_id = payload.get("child_id")
    data = load_data()
    rew   = next((migrate_reward(dict(r)) for r in data["rewards"] if r["id"] == rid), None)
    child = next((migrate_child(dict(c)) for c in data["children"] if c["id"] == child_id), None)
    if not rew:   raise HTTPException(404, "Not found")
    if not child: raise HTTPException(404, "Not found")
    if not child_eligible_for_reward(child, rew):
        raise HTTPException(400, "פרס זה אינו מיועד לך")
    if child["points"] < rew["points_cost"]:
        raise HTTPException(400, "Not enough points")
    mc = rew.get("max_claims", 0)
    if mc > 0:
        approved_count = sum(1 for c in data["reward_claims"]
                             if c["reward_id"] == rid and c["status"] == "approved")
        if approved_count >= mc:
            raise HTTPException(400, f"הפרס הגיע למגבלת המימוש ({mc})")
    # deduct from child in raw data
    for c in data["children"]:
        if c["id"] == child_id:
            c["points"] = c.get("points", 0) - rew["points_cost"]
            break
    claim = {"id": gen_id(), "reward_id": rid, "child_id": child_id,
             "status": "pending", "claimed_at": now_str()}
    data["reward_claims"].append(claim)
    data["points_history"].append({
        "id": gen_id(), "child_id": child_id,
        "points": -rew["points_cost"], "reason": f"פרס: {rew['title']}", "date": now_str(),
    })
    save_data(data)
    return claim

@app.get("/api/rewards/claims/all")
async def all_claims():
    data = load_data()
    cm  = {c["id"]: migrate_child(c) for c in data["children"]}
    rm  = {r["id"]: migrate_reward(r) for r in data["rewards"]}
    return [{**c, "child": cm.get(c["child_id"],{}), "reward": rm.get(c["reward_id"],{})}
            for c in data["reward_claims"]]

@app.get("/api/rewards/claims/pending")
async def pending_claims():
    data = load_data()
    pending  = [c for c in data["reward_claims"] if c["status"] == "pending"]
    cm  = {c["id"]: migrate_child(c) for c in data["children"]}
    rm  = {r["id"]: migrate_reward(r) for r in data["rewards"]}
    return [{**c, "child": cm.get(c["child_id"],{}), "reward": rm.get(c["reward_id"],{})}
            for c in pending]

@app.post("/api/rewards/claims/{cid}/approve")
async def approve_claim(cid: str):
    data = load_data()
    for c in data["reward_claims"]:
        if c["id"] == cid:
            c["status"] = "approved"
            save_data(data)
            return c
    raise HTTPException(404, "Not found")

@app.post("/api/rewards/claims/{cid}/cancel")
async def cancel_claim(cid: str):
    data = load_data()
    for c in data["reward_claims"]:
        if c["id"] == cid and c["status"] == "pending":
            rew = next((migrate_reward(dict(r)) for r in data["rewards"] if r["id"] == c["reward_id"]), None)
            child = next((ch for ch in data["children"] if ch["id"] == c["child_id"]), None)
            if rew and child:
                refund = rew["points_cost"]
                child["points"] = child.get("points", 0) + refund
                data["points_history"].append({
                    "id": gen_id(), "child_id": c["child_id"],
                    "points": refund, "reason": f"ביטול פרס: {rew['title']}", "date": now_str(),
                })
            c["status"] = "cancelled"
            save_data(data)
            return c
    raise HTTPException(404, "Not found")

# ── leaderboard ───────────────────────────────────────────────────────────

@app.get("/api/leaderboard")
async def leaderboard():
    data = load_data()
    _maybe_reset(data)
    ch = [migrate_child(dict(c)) for c in data["children"] if c.get("weekly_points", 0) > 0]
    return sorted(ch, key=lambda x: x.get("weekly_points", 0), reverse=True)

# ── auth ──────────────────────────────────────────────────────────────────

@app.post("/api/auth/verify")
async def verify_pw(p: PwCheck):
    data = load_data()
    if p.password == data["settings"]["parent_password"]:
        return {"ok": True}
    raise HTTPException(401, "Wrong password")

@app.post("/api/auth/change-password")
async def change_pw(payload: dict):
    data = load_data()
    if payload.get("old_password") != data["settings"]["parent_password"]:
        raise HTTPException(401, "Wrong password")
    data["settings"]["parent_password"] = payload.get("new_password")
    save_data(data)
    return {"ok": True}

# ── export/import ─────────────────────────────────────────────────────────

@app.get("/api/export")
async def export():
    return FileResponse(DATA_FILE, filename="kids-chores-backup.json")

@app.post("/api/import")
async def import_backup(payload: dict):
    for key in ["children", "chores", "rewards"]:
        if key not in payload:
            raise HTTPException(400, f"Missing: {key}")
    data = load_data()
    payload.setdefault("settings", data["settings"])
    payload["settings"] = {**data["settings"], **payload.get("settings", {})}
    payload.setdefault("chore_runs",     [])
    payload.setdefault("reward_claims",  [])
    payload.setdefault("points_history", [])
    payload.setdefault("mishna_tasks",   [])
    payload.setdefault("mishna_items",   [])
    payload["children"] = [migrate_child(dict(c))  for c in payload["children"]]
    payload["chores"]   = [migrate_chore(dict(ch)) for ch in payload["chores"]]
    payload["rewards"]  = [migrate_reward(dict(r)) for r in payload["rewards"]]
    save_data(payload)
    return {"ok": True}

# ── mishna ────────────────────────────────────────────────────────────────────

class MishnaTaskModel(BaseModel):
    child_id: str
    title: str = "לימוד משניות בעל פה"
    points_per_mishna: int = 10

class MishnaClaimModel(BaseModel):
    task_id: str
    seder: str
    masechet: str
    perek_num: int
    mishna_nums: List[int]

def _migrate_mishna(data: dict):
    data.setdefault("mishna_tasks", [])
    data.setdefault("mishna_items", [])

def _he_num(n):
    nums = ['','א','ב','ג','ד','ה','ו','ז','ח','ט','י',
            'יא','יב','יג','יד','טו','טז','יז','יח','יט','כ',
            'כא','כב','כג','כד','כה','כו','כז','כח','כט','ל']
    return nums[n] if n < len(nums) else str(n)

@app.get("/api/mishna/tasks")
async def get_mishna_tasks():
    data = load_data()
    _migrate_mishna(data)
    cm = {c["id"]: migrate_child(c) for c in data["children"]}
    return [{**t, "child": cm.get(t["child_id"], {})} for t in data["mishna_tasks"]]

@app.post("/api/mishna/tasks")
async def add_mishna_task(m: MishnaTaskModel):
    data = load_data()
    _migrate_mishna(data)
    task = {"id": gen_id(), "child_id": m.child_id, "title": m.title,
            "points_per_mishna": m.points_per_mishna, "created_at": now_str()}
    data["mishna_tasks"].append(task)
    save_data(data)
    return task

@app.delete("/api/mishna/tasks/{tid}")
async def del_mishna_task(tid: str):
    data = load_data()
    _migrate_mishna(data)
    data["mishna_tasks"] = [t for t in data["mishna_tasks"] if t["id"] != tid]
    save_data(data)
    return {"ok": True}

@app.get("/api/mishna/tasks/for-child/{child_id}")
async def mishna_tasks_for_child(child_id: str):
    data = load_data()
    _migrate_mishna(data)
    return [t for t in data["mishna_tasks"] if t["child_id"] == child_id]

@app.get("/api/mishna/items/for-child/{child_id}")
async def mishna_items_for_child(child_id: str):
    data = load_data()
    _migrate_mishna(data)
    tm = {t["id"]: t for t in data["mishna_tasks"]}
    items = [i for i in data["mishna_items"] if i["child_id"] == child_id]
    return [{**i, "task": tm.get(i["task_id"], {})} for i in items]

@app.get("/api/mishna/items/pending")
async def mishna_items_pending():
    data = load_data()
    _migrate_mishna(data)
    cm = {c["id"]: migrate_child(c) for c in data["children"]}
    tm = {t["id"]: t for t in data["mishna_tasks"]}
    items = [i for i in data["mishna_items"] if i["status"] == "child_done"]
    return [{**i, "child": cm.get(i["child_id"], {}), "task": tm.get(i["task_id"], {})} for i in items]

@app.post("/api/mishna/items/claim")
async def mishna_claim(payload: MishnaClaimModel):
    data = load_data()
    _migrate_mishna(data)
    task = next((t for t in data["mishna_tasks"] if t["id"] == payload.task_id), None)
    if not task:
        raise HTTPException(404, "Task not found")
    taken = {
        (i["seder"], i["masechet"], i["perek_num"], i["mishna_num"])
        for i in data["mishna_items"]
        if i["child_id"] == task["child_id"]
    }
    created = []
    for num in payload.mishna_nums:
        key = (payload.seder, payload.masechet, payload.perek_num, num)
        if key in taken:
            continue
        item = {
            "id": gen_id(), "task_id": payload.task_id, "child_id": task["child_id"],
            "seder": payload.seder, "masechet": payload.masechet,
            "perek_num": payload.perek_num, "mishna_num": num,
            "status": "claimed", "claimed_at": now_str(),
            "child_done_at": None, "reviewed_at": None,
        }
        data["mishna_items"].append(item)
        created.append(item)
        taken.add(key)
    save_data(data)
    return created

@app.post("/api/mishna/items/{iid}/done")
async def mishna_item_done(iid: str):
    data = load_data()
    _migrate_mishna(data)
    for i in data["mishna_items"]:
        if i["id"] == iid and i["status"] in ("claimed", "needs_review"):
            i["status"] = "child_done"
            i["child_done_at"] = now_str()
            save_data(data)
            return i
    raise HTTPException(404, "Not found or wrong status")

@app.post("/api/mishna/items/{iid}/approve")
async def mishna_item_approve(iid: str):
    data = load_data()
    _migrate_mishna(data)
    for i in data["mishna_items"]:
        if i["id"] == iid and i["status"] == "child_done":
            i["status"] = "parent_approved"
            i["reviewed_at"] = now_str()
            task = next((t for t in data["mishna_tasks"] if t["id"] == i["task_id"]), None)
            pts = task["points_per_mishna"] if task else 10
            for c in data["children"]:
                if c["id"] == i["child_id"]:
                    c["points"]        = c.get("points", 0) + pts
                    c["weekly_points"] = c.get("weekly_points", 0) + pts
                    c["total_points"]  = c.get("total_points", 0) + pts
                    label = f'משנה: {i["masechet"]} פ"{_he_num(i["perek_num"])} מ"{_he_num(i["mishna_num"])}'
                    data["points_history"].append({
                        "id": gen_id(), "child_id": i["child_id"],
                        "points": pts, "reason": label, "date": now_str(),
                    })
                    break
            save_data(data)
            return i
    raise HTTPException(404, "Not found or wrong status")

@app.post("/api/mishna/items/{iid}/needs-review")
async def mishna_item_needs_review(iid: str):
    data = load_data()
    _migrate_mishna(data)
    for i in data["mishna_items"]:
        if i["id"] == iid and i["status"] == "child_done":
            i["status"] = "needs_review"
            i["reviewed_at"] = now_str()
            save_data(data)
            return i
    raise HTTPException(404, "Not found or wrong status")

@app.delete("/api/mishna/items/{iid}")
async def mishna_item_return(iid: str):
    data = load_data()
    _migrate_mishna(data)
    data["mishna_items"] = [i for i in data["mishna_items"] if i["id"] != iid]
    save_data(data)
    return {"ok": True}

# ── weekly reset ──────────────────────────────────────────────────────────

def _maybe_reset(data):
    today = date.today()
    last  = data.get("settings", {}).get("last_weekly_reset")
    days  = (today - date.fromisoformat(last)).days if last else 999
    if days >= 7:
        for c in data["children"]:
            c["weekly_points"] = 0
            c["weekly_chores"] = 0
        data["settings"]["last_weekly_reset"] = today.isoformat()
        save_data(data)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
