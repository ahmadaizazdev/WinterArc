/* ============================================================
   VIEWS — pure(-ish) render functions. Each takes a container
   element and a context object, writes innerHTML, then wires
   up its own event listeners (delegation-safe since content is
   replaced wholesale on every render).
   ============================================================ */

const Views = (() => {

  function emptyDayRecord() {
    return {
      weight: null, waist: null, steps: 0, walkMin: 0, sleep: null, water: 0,
      foodQuality: false, noSoftDrink: false, noJunk: false, noLateNight: false,
      sleepRoutine: false, notes: '', completed: false,
    };
  }

  function getRecord(days, dayNum) {
    return Object.assign(emptyDayRecord(), days[dayNum] || {});
  }

  /* ---------------------------------------------------------- DASHBOARD */
  function renderDashboard(el, ctx) {
    const { profile, days, App } = ctx;
    const todayNum = ctx.todayDayNum;

    if (todayNum < 1) {
      const startDate = new Date(profile.challengeStart);
      el.innerHTML = `
        <div class="bento">
          <div class="card state-banner">
            <div class="mission-label">YOUR ARC BEGINS SOON</div>
            <div class="sb-num">${Math.abs(todayNum) + 1}</div>
            <p>Day${Math.abs(todayNum) + 1 === 1 ? '' : 's'} until Winter Arc starts on ${startDate.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'})}.</p>
            <button class="btn btn-primary" id="btn-start-now" style="margin-top:18px;">Start today instead</button>
          </div>
        </div>`;
      el.querySelector('#btn-start-now').addEventListener('click', () => {
        profile.challengeStart = Engine.todayISO();
        App.saveProfile(profile);
        App.refresh();
      });
      return;
    }

    if (todayNum > (profile.challengeDuration || 90)) {
      const stats = App.computeOverview();
      el.innerHTML = `
        <div class="bento">
          <div class="card state-banner">
            <div class="mission-label">WINTER ARC</div>
            <div class="sb-num">90 DAYS COMPLETE</div>
            <p>You started at ${UI.fmt1(profile.weightStart)} kg and finished at ${UI.fmt1(profile.weightCurrent)} kg — ${UI.fmt1(stats.weightLost)} kg of the version you built this winter.</p>
          </div>
          ${overviewGridHTML(stats)}
        </div>`;
      return;
    }

    const targets = Engine.phaseForDay(todayNum);
    const rec = getRecord(days, todayNum);
    const yRec = todayNum > 1 ? days[todayNum - 1] : null;
    const streaks = Engine.computeStreaks(days, todayNum);
    const checklist = Engine.disciplineChecklist(rec, targets);
    const score = Engine.disciplineScore(rec, targets);
    const eligible = Engine.isDayEligibleForCompletion(rec, targets);
    const stepsPct = Math.min(1, (rec.steps || 0) / targets.steps);
    const walkPct = Math.min(1, (rec.walkMin || 0) / targets.walk);
    const stats = App.computeOverview();
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    el.innerHTML = `
      <div class="dash-header">
        <div>
          <div class="dash-greeting">${greeting}, ${UI.escapeHtml(profile.name.split(' ')[0])}</div>
          <div class="dash-daynum">DAY <span>${todayNum}</span> / ${profile.challengeDuration || 90}</div>
          <div class="dash-phase-badge"><i></i>${targets.label}</div>
        </div>
        <div class="dash-streak">
          <div class="flame-row">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c2 2 3 5 3 7a7 7 0 1 1-14 0c0-4 2-6 5-14z"/></svg>
            ${streaks.current}
          </div>
          <div class="best">BEST: ${streaks.longest} DAYS</div>
        </div>
      </div>

      <div class="bento">
        <div class="card mission-card">
          <div class="mission-top">
            <div>
              <div class="mission-label">TODAY'S MISSION</div>
              <div class="mission-title">${targets.steps.toLocaleString()} steps · ${targets.walk} min walk</div>
            </div>
          </div>
          <div class="mission-rings">
            <div class="ring-stat" data-quick="steps">
              ${UI.ringSVG(stepsPct, 60, 6)}
              <div>
                <div class="rlabel">Steps</div>
                <div class="rval"><span class="num-steps">${(rec.steps||0).toLocaleString()}</span> <small>/ ${targets.steps.toLocaleString()}</small></div>
              </div>
            </div>
            <div class="ring-stat" data-quick="walk">
              ${UI.ringSVG(walkPct, 60, 6)}
              <div>
                <div class="rlabel">Walking</div>
                <div class="rval"><span class="num-walk">${rec.walkMin||0}</span> <small>/ ${targets.walk} MIN</small></div>
              </div>
            </div>
          </div>
          <div class="mission-actions">
            <button class="btn btn-quiet btn-sm" data-quick="steps">Log steps</button>
            <button class="btn btn-quiet btn-sm" data-quick="walk">Log walk</button>
            <button class="btn btn-quiet btn-sm" data-quick="notes">Add a note</button>
          </div>
        </div>

        <div class="side-stack">
          <div class="card quick-card" data-quick="weight">
            <div><div class="qlabel">Weight today</div><div class="qval">${rec.weight ? UI.fmt1(rec.weight) + ' kg' : '—'}</div></div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
          </div>
          <div class="card quick-card" data-quick="water">
            <div><div class="qlabel">Water</div><div class="qval">${rec.water || 0} <small style="font-size:13px;color:var(--text-faint)">glasses</small></div></div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>
          </div>
        </div>

        <div class="card discipline-card" style="grid-column:span 12;">
          <div class="discipline-head">
            <div><div class="mission-label">DISCIPLINE SCORE</div><div class="dscore">${score} / 7</div></div>
            <button class="btn btn-quiet btn-sm" data-quick="tracker">Open tracker</button>
          </div>
          <div class="discipline-dots">${checklist.map(c => `<i class="${c.on ? 'on' : ''}"></i>`).join('')}</div>
          <div class="discipline-list">
            ${checklist.filter(c => !c.auto).map(c => `
              <div class="discipline-item ${c.on ? 'on' : ''}" data-toggle="${c.key}">
                <span class="chk">${c.on ? checkIcon() : ''}</span> ${c.label}
              </div>`).join('')}
          </div>
        </div>

        <div class="complete-btn-row">
          <button class="complete-day-btn ${rec.completed ? 'done' : (eligible ? 'ready' : '')}" id="btn-complete-day" ${rec.completed ? 'disabled' : ''}>
            ${rec.completed ? '✓ Day complete' : eligible ? 'Complete today' : `Hit your targets to complete today`}
          </button>
        </div>

        ${yRec ? `
        <div class="card yesterday-card">
          <div class="section-head"><h3>Yesterday</h3><button class="link-btn" id="btn-edit-yesterday">Edit yesterday</button></div>
          <div class="yesterday-grid">
            <div class="yitem"><div class="ylabel">Discipline</div><div class="yval">${Engine.disciplineScore(yRec, Engine.phaseForDay(todayNum-1))} / 7</div></div>
            <div class="yitem"><div class="ylabel">Steps</div><div class="yval">${(yRec.steps||0).toLocaleString()}</div></div>
            <div class="yitem"><div class="ylabel">Walk</div><div class="yval">${yRec.walkMin||0} min</div></div>
            <div class="yitem"><div class="ylabel">Weight</div><div class="yval">${yRec.weight ? UI.fmt1(yRec.weight)+' kg' : '—'}</div></div>
          </div>
        </div>` : `<div class="card yesterday-card"><div class="section-head"><h3>Yesterday</h3></div><p style="color:var(--text-faint);font-size:13.5px;">Nothing logged yet — day one starts today.</p></div>`}

        <div class="card motivation-block">
          <div class="motivation-quote">He was so handsome, it made her fall for him — the version he became.</div>
          <div class="motivation-line">BECOME THAT VERSION OF YOURSELF.</div>
        </div>

        ${overviewGridHTML(stats)}

        <div class="card calendar-preview">
          <div class="section-head"><h3>Recent days</h3><button class="link-btn" data-quick="viewcalendar">View full calendar</button></div>
          <div class="cal-grid" style="grid-template-columns:repeat(10,1fr);">
            ${recentDaysHTML(days, todayNum)}
          </div>
        </div>
      </div>
    `;

    attachDashboardEvents(el, ctx, { rec, targets, todayNum, yRec });
  }

  function checkIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>`;
  }

  function recentDaysHTML(days, todayNum) {
    const start = Math.max(1, todayNum - 9);
    let html = '';
    for (let d = start; d <= todayNum; d++) {
      const rec = days[d];
      const targets = Engine.phaseForDay(d);
      const status = Engine.dayStatus(rec, targets);
      const cls = [status, d === todayNum ? 'today' : ''].filter(Boolean).join(' ');
      html += `<div class="cal-day ${cls}" data-day="${d}"><span class="dn">${d}</span></div>`;
    }
    return html;
  }

  function overviewGridHTML(stats) {
    return `
      <div class="overview-grid">
        <div class="card ov-card big">
          <div class="ov-label">CURRENT WEIGHT</div>
          <div class="ov-value">${UI.fmt1(stats.weightCurrent)}<small>kg</small></div>
          <div class="ov-delta ${stats.weightLost >= 0 ? 'pos' : 'neg'}">${stats.weightLost >= 0 ? '−' : '+'}${UI.fmt1(Math.abs(stats.weightLost))} kg lost</div>
        </div>
        <div class="card ov-card reg"><div class="ov-label">WAIST</div><div class="ov-value">${UI.fmt1(stats.waistCurrent)}<small>cm</small></div><div class="ov-delta ${stats.waistLost >= 0 ? 'pos':'neg'}">${stats.waistLost >= 0 ? '−' : '+'}${UI.fmt1(Math.abs(stats.waistLost))}</div></div>
        <div class="card ov-card reg"><div class="ov-label">DAYS DONE</div><div class="ov-value">${stats.daysCompleted}</div></div>
        <div class="card ov-card reg"><div class="ov-label">DAYS LEFT</div><div class="ov-value">${stats.daysRemaining}</div></div>
        <div class="card ov-card reg"><div class="ov-label">STREAK</div><div class="ov-value">${stats.currentStreak}</div></div>
        <div class="card ov-card reg"><div class="ov-label">BEST STREAK</div><div class="ov-value">${stats.longestStreak}</div></div>
        <div class="card ov-card reg"><div class="ov-label">AVG STEPS</div><div class="ov-value">${stats.avgSteps ? Math.round(stats.avgSteps).toLocaleString() : '—'}</div></div>
        <div class="card ov-card reg"><div class="ov-label">TOTAL WALK</div><div class="ov-value">${stats.totalWalk}<small>min</small></div></div>
        <div class="card ov-card big"><div class="ov-label">OVERALL COMPLETION</div><div class="ov-value">${stats.completionPct}%</div></div>
      </div>`;
  }

  function attachDashboardEvents(el, ctx, d) {
    const { App } = ctx;
    el.querySelectorAll('[data-quick]').forEach(node => {
      node.addEventListener('click', () => {
        const type = node.dataset.quick;
        if (type === 'tracker') return App.navigate('tracker');
        if (type === 'viewcalendar') return App.navigate('calendar');
        App.openQuickLog(type, d.todayNum);
      });
    });
    el.querySelectorAll('[data-toggle]').forEach(node => {
      node.addEventListener('click', () => App.toggleDisciplineFlag(d.todayNum, node.dataset.toggle));
    });
    el.querySelectorAll('.cal-day[data-day]').forEach(node => {
      node.addEventListener('click', () => { App.selectDay(Number(node.dataset.day)); App.navigate('tracker'); });
    });
    const completeBtn = el.querySelector('#btn-complete-day');
    if (completeBtn && !d.rec.completed) {
      completeBtn.addEventListener('click', () => App.completeDay(d.todayNum));
    }
    const editYesterday = el.querySelector('#btn-edit-yesterday');
    if (editYesterday) editYesterday.addEventListener('click', () => { App.selectDay(d.todayNum - 1); App.navigate('tracker'); });
  }

  /* ---------------------------------------------------------- DAILY TRACKER */
  function renderTracker(el, ctx) {
    const { profile, days, App } = ctx;
    const dayNum = ctx.selectedDay || ctx.todayDayNum;
    const clamped = Math.max(1, Math.min(profile.challengeDuration || 90, dayNum));
    const rec = getRecord(days, clamped);
    const targets = Engine.phaseForDay(clamped);
    const score = Engine.disciplineScore(rec, targets);
    const checklist = Engine.disciplineChecklist(rec, targets);
    const date = Engine.dateForDayNumber(profile.challengeStart, clamped);

    el.innerHTML = `
      <div class="section-head">
        <div>
          <h3 style="font-size:24px;">Day ${clamped} tracker</h3>
          <div style="color:var(--text-faint);font-size:13px;margin-top:4px;">${date.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'})} · ${targets.label}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-ghost btn-sm" id="btn-tr-prev" ${clamped<=1?'disabled':''}>&larr; Prev</button>
          <button class="btn btn-ghost btn-sm" id="btn-tr-next" ${clamped>=ctx.todayDayNum?'disabled':''}>Next &rarr;</button>
        </div>
      </div>

      <div class="bento">
        <div class="card card-pad" style="grid-column:span 6;">
          <h3 style="font-family:var(--font-display);font-size:16px;margin:0 0 16px;">Body</h3>
          <div class="field-row">
            <div class="field"><label>Weight (kg)</label><input type="number" step="0.1" id="in-weight" value="${rec.weight ?? ''}"></div>
            <div class="field"><label>Waist (cm)</label><input type="number" step="0.1" id="in-waist" value="${rec.waist ?? ''}"></div>
          </div>
        </div>

        <div class="card card-pad" style="grid-column:span 6;">
          <h3 style="font-family:var(--font-display);font-size:16px;margin:0 0 16px;">Movement</h3>
          <div class="field-row">
            <div class="field"><label>Steps (target ${targets.steps.toLocaleString()})</label><input type="number" id="in-steps" value="${rec.steps ?? 0}"></div>
            <div class="field"><label>Walking minutes (target ${targets.walk})</label><input type="number" id="in-walk" value="${rec.walkMin ?? 0}"></div>
          </div>
        </div>

        <div class="card card-pad" style="grid-column:span 6;">
          <h3 style="font-family:var(--font-display);font-size:16px;margin:0 0 16px;">Rest & hydration</h3>
          <div class="field-row">
            <div class="field"><label>Sleep (hours)</label><input type="number" step="0.5" id="in-sleep" value="${rec.sleep ?? ''}"></div>
            <div class="field"><label>Water (glasses)</label><input type="number" id="in-water" value="${rec.water ?? 0}"></div>
          </div>
        </div>

        <div class="card card-pad" style="grid-column:span 6;">
          <h3 style="font-family:var(--font-display);font-size:16px;margin:0 0 14px;">Discipline — ${score}/7</h3>
          <div class="discipline-dots" style="margin-bottom:14px;">${checklist.map(c=>`<i class="${c.on?'on':''}"></i>`).join('')}</div>
          ${checklist.filter(c=>!c.auto).map(c => `
            <label class="checkline" style="margin-bottom:9px;">
              <input type="checkbox" data-flag="${c.key}" ${c.on?'checked':''}> ${c.label}
            </label>`).join('')}
        </div>

        <div class="card card-pad" style="grid-column:span 12;">
          <h3 style="font-family:var(--font-display);font-size:16px;margin:0 0 12px;">Notes</h3>
          <textarea id="in-notes" rows="3" style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px;color:var(--text);font-family:var(--font-ui);font-size:14px;">${UI.escapeHtml(rec.notes||'')}</textarea>
        </div>

        <div class="complete-btn-row" style="display:flex;gap:12px;">
          <button class="btn btn-primary" id="btn-save-day" style="flex:1;">Save day</button>
          <button class="btn btn-ghost" id="btn-reset-day">Reset this day</button>
        </div>
      </div>
    `;

    attachTrackerEvents(el, ctx, clamped);
  }

  function attachTrackerEvents(el, ctx, dayNum) {
    const { App } = ctx;
    el.querySelector('#btn-tr-prev')?.addEventListener('click', () => { App.selectDay(dayNum - 1); App.navigate('tracker'); });
    el.querySelector('#btn-tr-next')?.addEventListener('click', () => { App.selectDay(dayNum + 1); App.navigate('tracker'); });
    el.querySelector('#btn-save-day').addEventListener('click', () => {
      const rec = getRecord(ctx.days, dayNum);
      rec.weight = numOrNull(el.querySelector('#in-weight').value);
      rec.waist = numOrNull(el.querySelector('#in-waist').value);
      rec.steps = parseInt(el.querySelector('#in-steps').value) || 0;
      rec.walkMin = parseInt(el.querySelector('#in-walk').value) || 0;
      rec.sleep = numOrNull(el.querySelector('#in-sleep').value);
      rec.water = parseInt(el.querySelector('#in-water').value) || 0;
      rec.notes = el.querySelector('#in-notes').value;
      el.querySelectorAll('[data-flag]').forEach(cb => { rec[cb.dataset.flag] = cb.checked; });
      App.saveDayRecord(dayNum, rec);
      UI.toast('Day ' + dayNum + ' saved', { good: true });
    });
    el.querySelector('#btn-reset-day').addEventListener('click', () => {
      UI.confirmDialog({
        title: 'Reset this day?',
        message: `This will permanently clear all logged data for Day ${dayNum}.`,
        confirmLabel: 'Reset day',
        danger: true,
        onConfirm: () => { App.resetDay(dayNum); UI.toast('Day ' + dayNum + ' reset'); },
      });
    });
  }

  function numOrNull(v) { return v === '' || v === null || v === undefined ? null : parseFloat(v); }

  /* ---------------------------------------------------------- 90-DAY CALENDAR */
  function renderCalendar(el, ctx) {
    const { profile, days, App } = ctx;
    const total = profile.challengeDuration || 90;
    const todayNum = ctx.todayDayNum;

    let weeksHTML = '';
    for (let w = 0; w < Math.ceil(total / 10); w++) {
      const startD = w * 10 + 1;
      const endD = Math.min(total, startD + 9);
      let cells = '';
      for (let d = startD; d <= endD; d++) {
        const rec = days[d];
        const targets = Engine.phaseForDay(d);
        const status = Engine.dayStatus(rec, targets);
        const cls = [status, d === todayNum ? 'today' : '', d === ctx.selectedDay ? 'selected' : '', d > todayNum ? 'future' : ''].filter(Boolean).join(' ');
        cells += `<div class="cal-day ${cls}" data-day="${d}"><span class="dn">${d}</span></div>`;
      }
      weeksHTML += `<div class="week-block"><div class="week-block-label">DAYS ${startD}–${endD}</div><div class="cal-grid">${cells}</div></div>`;
    }

    el.innerHTML = `
      <div class="section-head"><h3 style="font-size:24px;">90-day calendar</h3></div>
      <div class="cal-legend">
        <span><i class="leg-none"></i>Not started</span>
        <span><i class="leg-partial"></i>Partial</span>
        <span><i class="leg-done"></i>Completed</span>
        <span><i class="leg-today"></i>Today</span>
      </div>
      ${weeksHTML}
    `;

    el.querySelectorAll('.cal-day[data-day]').forEach(node => {
      node.addEventListener('click', () => {
        const d = Number(node.dataset.day);
        if (d > todayNum) return;
        App.selectDay(d);
        App.navigate('tracker');
      });
    });
  }

  /* ---------------------------------------------------------- PROGRESS */
  function renderProgress(el, ctx, initialMetric) {
    const { days, todayDayNum } = ctx;
    const metrics = [
      { key: 'weight', label: 'Weight', decimals: 1, unit: 'kg' },
      { key: 'waist', label: 'Waist', decimals: 1, unit: 'cm' },
      { key: 'steps', label: 'Steps', decimals: 0, unit: '' },
      { key: 'walkMin', label: 'Walking minutes', decimals: 0, unit: 'min' },
      { key: 'discipline', label: 'Discipline score', decimals: 0, unit: '/7' },
    ];
    const startMetric = initialMetric || 'weight';
    el.innerHTML = `
      <div class="section-head"><h3 style="font-size:24px;">Progress</h3></div>
      <div class="metric-tabs pill-select" id="metric-tabs">
        ${metrics.map(m => `<button class="${m.key===startMetric?'active':''}" data-metric="${m.key}">${m.label}</button>`).join('')}
      </div>
      <div class="card chart-card">
        <canvas id="progress-canvas"></canvas>
      </div>
    `;

    const buttons = el.querySelectorAll('[data-metric]');
    function draw(metricKey) {
      buttons.forEach(b => b.classList.toggle('active', b.dataset.metric === metricKey));
      const metric = metrics.find(m => m.key === metricKey);
      const points = [];
      for (let d = 1; d <= todayDayNum; d++) {
        const rec = days[d];
        if (!rec) continue;
        let val;
        if (metricKey === 'discipline') val = Engine.disciplineScore(rec, Engine.phaseForDay(d));
        else val = rec[metricKey];
        const isBodyMetric = metricKey === 'weight' || metricKey === 'waist';
        if (val === null || val === undefined) continue;
        if (isBodyMetric && !val) continue; // 0/null body measurements aren't real data points
        points.push({ y: val, label: 'D' + d });
      }
      const canvas = el.querySelector('#progress-canvas');
      if (points.length < 2) {
        canvas.replaceWith(emptyStateNode(metric.label));
      } else {
        Charts.drawLineChart(canvas, points, { decimals: metric.decimals });
      }
    }
    buttons.forEach(b => b.addEventListener('click', () => {
      // re-render chart card fresh each time to allow swapping canvas<->empty state
      renderProgress(el, ctx, b.dataset.metric);
    }));
    draw(startMetric);
  }

  function emptyStateNode(label) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>
      <p>Not enough ${label.toLowerCase()} data yet. Log a few more days from the Daily Tracker to see this chart come alive.</p>`;
    return div;
  }

  /* ---------------------------------------------------------- WEEKLY REVIEW */
  function renderWeekly(el, ctx) {
    const { days, profile, todayDayNum } = ctx;
    const total = profile.challengeDuration || 90;
    const numWeeks = Math.ceil(total / 7);
    let html = `<div class="section-head"><h3 style="font-size:24px;">Weekly review</h3></div>`;

    for (let w = 1; w <= numWeeks; w++) {
      const { start, end } = Engine.weekBounds(w);
      const locked = start > todayDayNum;
      const weightArr = [], waistArr = [], stepsArr = [], walkArr = [], discArr = [];
      let daysCompleted = 0, bestDay = null, bestSteps = 0;
      for (let d = start; d <= Math.min(end, todayDayNum); d++) {
        const rec = days[d];
        if (!rec) continue;
        if (rec.weight) weightArr.push(rec.weight);
        if (rec.waist) waistArr.push(rec.waist);
        if (rec.steps) { stepsArr.push(rec.steps); if (rec.steps > bestSteps) { bestSteps = rec.steps; } }
        if (rec.walkMin) walkArr.push(rec.walkMin);
        const score = Engine.disciplineScore(rec, Engine.phaseForDay(d));
        discArr.push(score);
        if (rec.completed) { daysCompleted++; if (bestDay === null || score > discArr[bestDay - start]) bestDay = d; }
      }
      const weightChange = weightArr.length >= 2 ? Engine.round1(weightArr[weightArr.length-1] - weightArr[0]) : null;
      const waistChange = waistArr.length >= 2 ? Engine.round1(waistArr[waistArr.length-1] - waistArr[0]) : null;

      html += `
        <div class="card week-card ${locked ? 'week-locked' : ''}">
          <div class="week-card-head">
            <div class="wk-title">Week ${w}</div>
            <div class="wk-dates">Days ${start}–${end}</div>
          </div>
          ${locked ? `<p style="color:var(--text-faint);font-size:13.5px;">This week hasn't started yet.</p>` : `
          <div class="week-stats">
            <div class="wstat"><div class="wlabel">AVG WEIGHT</div><div class="wval">${weightArr.length ? UI.fmt1(Engine.avg(weightArr)) + ' kg' : '—'}</div></div>
            <div class="wstat"><div class="wlabel">WEIGHT CHANGE</div><div class="wval">${weightChange !== null ? (weightChange<=0?'':'+') + weightChange + ' kg' : '—'}</div></div>
            <div class="wstat"><div class="wlabel">AVG WAIST</div><div class="wval">${waistArr.length ? UI.fmt1(Engine.avg(waistArr)) + ' cm' : '—'}</div></div>
            <div class="wstat"><div class="wlabel">WAIST CHANGE</div><div class="wval">${waistChange !== null ? (waistChange<=0?'':'+') + waistChange + ' cm' : '—'}</div></div>
            <div class="wstat"><div class="wlabel">AVG STEPS</div><div class="wval">${stepsArr.length ? Math.round(Engine.avg(stepsArr)).toLocaleString() : '—'}</div></div>
            <div class="wstat"><div class="wlabel">WALK MINUTES</div><div class="wval">${walkArr.reduce((a,b)=>a+b,0)}</div></div>
            <div class="wstat"><div class="wlabel">AVG DISCIPLINE</div><div class="wval">${discArr.length ? UI.fmt1(Engine.avg(discArr)) : '—'} / 7</div></div>
            <div class="wstat"><div class="wlabel">DAYS COMPLETED</div><div class="wval">${daysCompleted} / 7</div></div>
            <div class="wstat"><div class="wlabel">HIGHEST STEPS</div><div class="wval">${bestSteps ? bestSteps.toLocaleString() : '—'}</div></div>
            <div class="wstat"><div class="wlabel">BEST DAY</div><div class="wval">${bestDay ? 'Day ' + bestDay : '—'}</div></div>
          </div>`}
        </div>`;
    }
    el.innerHTML = html;
  }

  /* ---------------------------------------------------------- GOALS */
  function renderGoals(el, ctx) {
    const { profile } = ctx;
    const start = profile.weightStart, current = profile.weightCurrent, target90 = profile.targetWeight90, longTerm = profile.targetWeightLong;
    const firstMilestone = Engine.round1((start + target90) / 2);
    const totalToLose = start - longTerm;
    const lostSoFar = start - current;
    const pct = totalToLose > 0 ? Math.max(0, Math.min(100, Math.round((lostSoFar / totalToLose) * 100))) : 0;

    el.innerHTML = `
      <div class="section-head"><h3 style="font-size:24px;">Goals</h3></div>
      <div class="goal-hero">
        <div class="card goal-milestone ${current <= firstMilestone ? 'reached' : ''}">
          <div class="gval">${UI.fmt1(firstMilestone)}</div>
          <div class="glabel">First milestone (kg)</div>
        </div>
        <div class="card goal-milestone ${current <= target90 ? 'reached' : ''}">
          <div class="gval">${UI.fmt1(target90)}</div>
          <div class="glabel">90-day target (kg)</div>
        </div>
        <div class="card goal-milestone ${current <= longTerm ? 'reached' : ''}">
          <div class="gval">${UI.fmt1(longTerm)}</div>
          <div class="glabel">Long-term target (kg)</div>
        </div>
      </div>
      <div class="card goal-progress-card">
        <div class="mission-label">PROGRESS TOWARD LONG-TERM GOAL</div>
        <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%;"></div></div>
        <div class="goal-meta-row">
          <span>Started at ${UI.fmt1(start)} kg</span>
          <span>${pct}% there</span>
          <span>Goal ${UI.fmt1(longTerm)} kg</span>
        </div>
        <div class="field-row" style="margin-top:24px;">
          <div class="ov-card card" style="padding:16px;"><div class="ov-label">CURRENT WEIGHT</div><div class="ov-value">${UI.fmt1(current)}<small>kg</small></div></div>
          <div class="ov-card card" style="padding:16px;"><div class="ov-label">REMAINING</div><div class="ov-value">${UI.fmt1(Math.max(0,current-longTerm))}<small>kg</small></div></div>
        </div>
      </div>
    `;
  }

  /* ---------------------------------------------------------- SETTINGS */
  function renderSettings(el, ctx) {
    const { profile, settings, App } = ctx;
    el.innerHTML = `
      <div class="section-head"><h3 style="font-size:24px;">Profile &amp; settings</h3></div>

      <div class="settings-section">
        <h3>Profile</h3>
        <div class="card settings-card">
          <div class="avatar-upload" style="margin-bottom:22px;">
            <div class="avatar" id="settings-avatar">${profile.avatar ? `<img src="${profile.avatar}">` : UI.initials(profile.name)}</div>
            <div>
              <button class="btn btn-quiet btn-sm" id="btn-avatar-upload">Change photo</button>
              <input type="file" id="in-avatar-file" accept="image/*" class="hidden">
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Name</label><input id="p-name" value="${UI.escapeHtml(profile.name)}"></div>
            <div class="field"><label>Age</label><input type="number" id="p-age" value="${profile.age ?? ''}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Height (cm)</label><input type="number" id="p-height" value="${profile.height ?? ''}"></div>
            <div class="field"><label>Gender</label>
              <select id="p-gender">
                ${['Male','Female','Other','Prefer not to say'].map(g => `<option ${profile.gender===g?'selected':''}>${g}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="field-row">
            <div class="field"><label>Starting weight (kg)</label><input type="number" step="0.1" id="p-weightStart" value="${profile.weightStart ?? ''}"></div>
            <div class="field"><label>Current weight (kg)</label><input type="number" step="0.1" id="p-weightCurrent" value="${profile.weightCurrent ?? ''}"></div>
          </div>
          <div class="field-row">
            <div class="field"><label>Starting waist (cm)</label><input type="number" step="0.1" id="p-waistStart" value="${profile.waistStart ?? ''}"></div>
            <div class="field"><label>Current waist (cm)</label><input type="number" step="0.1" id="p-waistCurrent" value="${profile.waistCurrent ?? ''}"></div>
          </div>
          <button class="btn btn-primary" id="btn-save-profile">Save profile</button>
        </div>
      </div>

      <div class="settings-section">
        <h3>Goals</h3>
        <div class="card settings-card">
          <div class="field-row">
            <div class="field"><label>90-day target weight (kg)</label><input type="number" step="0.1" id="p-target90" value="${profile.targetWeight90 ?? ''}"></div>
            <div class="field"><label>Long-term target weight (kg)</label><input type="number" step="0.1" id="p-targetLong" value="${profile.targetWeightLong ?? ''}"></div>
          </div>
          <button class="btn btn-primary" id="btn-save-goals">Save goals</button>
        </div>
      </div>

      <div class="settings-section">
        <h3>Activity</h3>
        <div class="card settings-card">
          <div class="field-row">
            <div class="field"><label>Daily step baseline</label><input type="number" id="p-stepsBaseline" value="${profile.dailyStepsBaseline ?? ''}"></div>
            <div class="field"><label>Primary exercise</label><input id="p-exercise" value="${UI.escapeHtml(profile.primaryExercise||'')}"></div>
          </div>
          <div class="field"><label>Activity level</label>
            <select id="p-activity">
              ${['Sedentary','Lightly active','Active','Very active'].map(a => `<option ${profile.activityLevel===a?'selected':''}>${a}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Gym access</label>
            <div class="toggle-group" id="p-gym">
              <button data-val="true" class="${profile.gymAccess ? 'active':''}">Yes</button>
              <button data-val="false" class="${!profile.gymAccess ? 'active':''}">No</button>
            </div>
          </div>
          <button class="btn btn-primary" id="btn-save-activity" style="margin-top:6px;">Save activity</button>
        </div>
      </div>

      <div class="settings-section">
        <h3>Challenge</h3>
        <div class="card settings-card">
          <div class="field-row">
            <div class="field"><label>Challenge start date</label><input type="date" id="p-startdate" value="${profile.challengeStart}"></div>
            <div class="field"><label>Duration (days)</label><input type="number" id="p-duration" value="${profile.challengeDuration || 90}"></div>
          </div>
          <button class="btn btn-primary" id="btn-save-challenge">Save challenge settings</button>
        </div>
      </div>

      <div class="settings-section">
        <h3>Preferences</h3>
        <div class="card settings-card">
          <div class="setting-row">
            <div><div class="srow-label">Theme</div><div class="srow-sub">Choose how Winter Arc looks</div></div>
            <div class="toggle-group" id="theme-toggle" style="width:220px;">
              <button data-theme="dark" class="${settings.theme==='dark'?'active':''}">Dark</button>
              <button data-theme="light" class="${settings.theme==='light'?'active':''}">Light</button>
              <button data-theme="system" class="${settings.theme==='system'?'active':''}">System</button>
            </div>
          </div>
          <div class="setting-row">
            <div><div class="srow-label">Notifications</div><div class="srow-sub">Daily reminder to log your progress</div></div>
            <label class="switch"><input type="checkbox" id="sw-notifications" ${settings.notifications?'checked':''}><span class="track"></span></label>
          </div>
          <div class="setting-row">
            <div><div class="srow-label">Reduced motion</div><div class="srow-sub">Turn off animations and transitions</div></div>
            <label class="switch"><input type="checkbox" id="sw-reduced" ${settings.reducedMotion?'checked':''}><span class="track"></span></label>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>Your data</h3>
        <div class="card settings-card">
          <div class="setting-row">
            <div><div class="srow-label">Export my data</div><div class="srow-sub">Download everything as a JSON file</div></div>
            <button class="btn btn-quiet btn-sm" id="btn-export">Export</button>
          </div>
          <div class="setting-row">
            <div><div class="srow-label">Import data</div><div class="srow-sub">Restore from a previously exported file</div></div>
            <button class="btn btn-quiet btn-sm" id="btn-import">Import</button>
            <input type="file" id="in-import-file" accept="application/json" class="hidden">
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3>Danger zone</h3>
        <div class="danger-zone">
          <div class="setting-row">
            <div><div class="srow-label">Reset a single day</div><div class="srow-sub">Clear one day's logged data</div></div>
            <button class="btn btn-danger btn-sm" id="btn-reset-single">Reset a day</button>
          </div>
          <div class="setting-row">
            <div><div class="srow-label">Reset entire challenge</div><div class="srow-sub">Clear all 90 days of progress</div></div>
            <button class="btn btn-danger btn-sm" id="btn-reset-challenge">Reset challenge</button>
          </div>
          <div class="setting-row">
            <div><div class="srow-label">Delete account</div><div class="srow-sub">Permanently remove your account and all data</div></div>
            <button class="btn btn-danger btn-sm" id="btn-delete-account">Delete account</button>
          </div>
        </div>
      </div>
    `;

    attachSettingsEvents(el, ctx);
  }

  function attachSettingsEvents(el, ctx) {
    const { App, profile } = ctx;

    el.querySelector('#btn-avatar-upload').addEventListener('click', () => el.querySelector('#in-avatar-file').click());
    el.querySelector('#in-avatar-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { App.updateProfileFields({ avatar: reader.result }); UI.toast('Photo updated', { good: true }); };
      reader.readAsDataURL(file);
    });

    el.querySelector('#btn-save-profile').addEventListener('click', () => {
      App.updateProfileFields({
        name: el.querySelector('#p-name').value.trim() || profile.name,
        age: numOrNull(el.querySelector('#p-age').value),
        height: numOrNull(el.querySelector('#p-height').value),
        gender: el.querySelector('#p-gender').value,
        weightStart: numOrNull(el.querySelector('#p-weightStart').value),
        weightCurrent: numOrNull(el.querySelector('#p-weightCurrent').value),
        waistStart: numOrNull(el.querySelector('#p-waistStart').value),
        waistCurrent: numOrNull(el.querySelector('#p-waistCurrent').value),
      });
      UI.toast('Profile saved', { good: true });
    });

    el.querySelector('#btn-save-goals').addEventListener('click', () => {
      App.updateProfileFields({
        targetWeight90: numOrNull(el.querySelector('#p-target90').value),
        targetWeightLong: numOrNull(el.querySelector('#p-targetLong').value),
      });
      UI.toast('Goals saved', { good: true });
    });

    const gymGroup = el.querySelector('#p-gym');
    gymGroup.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      gymGroup.querySelectorAll('button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    }));

    el.querySelector('#btn-save-activity').addEventListener('click', () => {
      App.updateProfileFields({
        dailyStepsBaseline: numOrNull(el.querySelector('#p-stepsBaseline').value),
        primaryExercise: el.querySelector('#p-exercise').value.trim(),
        activityLevel: el.querySelector('#p-activity').value,
        gymAccess: gymGroup.querySelector('button.active').dataset.val === 'true',
      });
      UI.toast('Activity saved', { good: true });
    });

    el.querySelector('#btn-save-challenge').addEventListener('click', () => {
      App.updateProfileFields({
        challengeStart: el.querySelector('#p-startdate').value,
        challengeDuration: parseInt(el.querySelector('#p-duration').value) || 90,
      });
      UI.toast('Challenge settings saved', { good: true });
      App.refresh();
    });

    el.querySelector('#theme-toggle').querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => { App.setTheme(b.dataset.theme); App.renderCurrentPage(); });
    });
    el.querySelector('#sw-notifications').addEventListener('change', (e) => App.updateSettings({ notifications: e.target.checked }));
    el.querySelector('#sw-reduced').addEventListener('change', (e) => App.updateSettings({ reducedMotion: e.target.checked }));

    el.querySelector('#btn-export').addEventListener('click', () => App.exportData());
    el.querySelector('#btn-import').addEventListener('click', () => el.querySelector('#in-import-file').click());
    el.querySelector('#in-import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { App.importData(JSON.parse(reader.result)); UI.toast('Data imported', { good: true }); }
        catch (err) { UI.toast('That file could not be read.'); }
      };
      reader.readAsText(file);
    });

    el.querySelector('#btn-reset-single').addEventListener('click', () => {
      const day = prompt('Which day number would you like to reset? (1–' + (profile.challengeDuration||90) + ')');
      const n = parseInt(day);
      if (!n) return;
      UI.confirmDialog({
        title: 'Reset this day?',
        message: `This will permanently remove Day ${n}'s progress.`,
        confirmLabel: 'Reset day', danger: true,
        onConfirm: () => { App.resetDay(n); UI.toast('Day ' + n + ' reset'); },
      });
    });
    el.querySelector('#btn-reset-challenge').addEventListener('click', () => {
      UI.confirmDialog({
        title: 'Reset entire challenge?',
        message: 'This will permanently remove all 90 days of your progress. Your profile and goals will stay intact.',
        confirmLabel: 'Reset challenge', danger: true,
        onConfirm: () => { App.resetChallenge(); UI.toast('Challenge reset'); },
      });
    });
    el.querySelector('#btn-delete-account').addEventListener('click', () => {
      UI.confirmDialog({
        title: 'Delete your account?',
        message: 'This will permanently remove your account and all associated data. This cannot be undone.',
        confirmLabel: 'Delete account', danger: true,
        onConfirm: () => App.deleteAccount(),
      });
    });
  }

  return {
    renderDashboard, renderTracker, renderCalendar, renderProgress,
    renderWeekly, renderGoals, renderSettings, getRecord, emptyDayRecord,
  };
})();

window.Views = Views;
