/* ============================================================
   CHALLENGE ENGINE
   Pure functions — no DOM, no storage — so they're easy to
   reason about and test in isolation.
   ============================================================ */

const Engine = (() => {

  const DAY_MS = 24 * 60 * 60 * 1000;

  function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  // Challenge day number for a given date, 1-indexed. Can be <=0 (not started)
  // or >90 (finished).
  function dayNumberFor(challengeStartISO, dateISO) {
    const start = startOfDay(challengeStartISO);
    const date = startOfDay(dateISO || new Date());
    const diff = Math.round((date - start) / DAY_MS);
    return diff + 1;
  }

  function dateForDayNumber(challengeStartISO, dayNum) {
    const start = startOfDay(challengeStartISO);
    const d = new Date(start.getTime() + (dayNum - 1) * DAY_MS);
    return d;
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  // Phase & targets. Days 61-90 use 70 min as the representative
  // midpoint of the 60-75 min range called for in that phase.
  function phaseForDay(day) {
    if (day <= 14) return { phase: 1, label: 'Phase 1 — Foundation', steps: 8000, walk: 30 };
    if (day <= 30) return { phase: 2, label: 'Phase 2 — Momentum', steps: 10000, walk: 45 };
    if (day <= 60) return { phase: 3, label: 'Phase 3 — Grind', steps: 11000, walk: 60 };
    return { phase: 4, label: 'Phase 4 — Peak', steps: 12000, walk: 70 };
  }

  // Discipline score out of 7. `rec` is a day record (may be partial).
  function disciplineChecklist(rec, targets) {
    rec = rec || {};
    const stepsOk = (rec.steps || 0) >= targets.steps;
    const walkOk = (rec.walkMin || 0) >= targets.walk;
    return [
      { key: 'stepsOk', label: `${targets.steps.toLocaleString()} steps hit`, on: stepsOk, auto: true },
      { key: 'walkOk', label: `${targets.walk} min walk hit`, on: walkOk, auto: true },
      { key: 'foodQuality', label: 'Ate clean today', on: !!rec.foodQuality, auto: false },
      { key: 'noSoftDrink', label: 'No soft drinks', on: !!rec.noSoftDrink, auto: false },
      { key: 'noJunk', label: 'No junk food', on: !!rec.noJunk, auto: false },
      { key: 'noLateNight', label: 'No late-night eating', on: !!rec.noLateNight, auto: false },
      { key: 'sleepRoutine', label: 'Kept sleep/wake routine', on: !!rec.sleepRoutine, auto: false },
    ];
  }

  function disciplineScore(rec, targets) {
    const list = disciplineChecklist(rec, targets);
    return list.filter(i => i.on).length;
  }

  function isDayEligibleForCompletion(rec, targets) {
    if (!rec) return false;
    return (rec.steps || 0) >= targets.steps && (rec.walkMin || 0) >= targets.walk;
  }

  // Streaks — walks backward from `uptoDay` counting consecutive
  // completed days; also finds the longest run across all recorded days.
  function computeStreaks(days, uptoDay) {
    let current = 0;
    for (let d = uptoDay; d >= 1; d--) {
      const rec = days[d];
      if (rec && rec.completed) current++;
      else break;
    }
    let longest = 0, run = 0;
    const maxDay = Math.max(uptoDay, ...Object.keys(days).map(Number), 0);
    for (let d = 1; d <= maxDay; d++) {
      const rec = days[d];
      if (rec && rec.completed) { run++; longest = Math.max(longest, run); }
      else run = 0;
    }
    longest = Math.max(longest, current);
    return { current, longest };
  }

  function dayStatus(rec, targets) {
    if (!rec) return 'none';
    const score = disciplineScore(rec, targets);
    if (rec.completed || score >= 6) return 'done';
    if (score > 0 || rec.steps || rec.walkMin || rec.weight) return 'partial';
    return 'none';
  }

  function weekBounds(weekNum) {
    return { start: (weekNum - 1) * 7 + 1, end: weekNum * 7 };
  }

  function avg(arr) {
    const nums = arr.filter(n => typeof n === 'number' && !isNaN(n));
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  function round1(n) { return n === null || n === undefined ? null : Math.round(n * 10) / 10; }

  return {
    dayNumberFor, dateForDayNumber, todayISO, phaseForDay,
    disciplineChecklist, disciplineScore, isDayEligibleForCompletion,
    computeStreaks, dayStatus, weekBounds, avg, round1, startOfDay,
  };
})();

window.Engine = Engine;
