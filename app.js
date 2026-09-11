/* ============================================================
   APP CONTROLLER
   ============================================================ */

const App = (() => {

  const state = {
    user: null,
    profile: null,
    days: {},
    settings: null,
    selectedDay: null,
    currentPage: 'dashboard',
  };

  const PAGES = ['dashboard', 'tracker', 'calendar', 'progress', 'weekly', 'goals', 'settings'];

  /* ------------------------------------------------ INIT / SESSION */
  function init() {
    bindAuthScreen();
    bindOnboarding();
    bindAppShell();

    const session = DB.getSession();
    if (session && session.userId) {
      const users = JSON.parse(localStorage.getItem('wa_users') || '{}');
      const user = users[session.userId];
      if (user) {
        loadUserSession(user);
        return;
      }
    }
    showScreen('auth');
    applyThemeFromStorageDefault();
  }

  function applyThemeFromStorageDefault() {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  function loadUserSession(user) {
    state.user = { id: user.id, name: user.name, email: user.email };
    state.settings = DB.getSettings(user.id);
    applyTheme(state.settings.theme);
    document.documentElement.dataset.reducedMotion = state.settings.reducedMotion ? 'true' : 'false';
    const profile = DB.getProfile(user.id);
    if (!profile || !profile.onboarded) {
      state.profile = profile || { name: user.name };
      startOnboarding();
      showScreen('onboarding');
    } else {
      state.profile = profile;
      state.days = DB.getDays(user.id);
      showScreen('app');
      navigate('dashboard');
    }
  }

  function showScreen(name) {
    document.getElementById('screen-auth').classList.toggle('hidden', name !== 'auth');
    document.getElementById('screen-onboarding').classList.toggle('hidden', name !== 'onboarding');
    document.getElementById('app').classList.toggle('hidden', name !== 'app');
  }

  /* ------------------------------------------------ THEME */
  function applyTheme(pref) {
    let effective = pref;
    if (pref === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effective === 'light' ? 'light' : 'dark');
  }

  function setTheme(pref) {
    state.settings.theme = pref;
    DB.saveSettings(state.user.id, state.settings);
    applyTheme(pref);
  }

  /* ------------------------------------------------ AUTH SCREEN */
  function bindAuthScreen() {
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const formLogin = document.getElementById('form-login');
    const formSignup = document.getElementById('form-signup');
    const switchText = document.getElementById('auth-switch-text');
    const errorBox = document.getElementById('auth-error');

    function showTab(which) {
      errorBox.classList.remove('show');
      tabLogin.classList.toggle('active', which === 'login');
      tabSignup.classList.toggle('active', which === 'signup');
      formLogin.classList.toggle('active', which === 'login');
      formSignup.classList.toggle('active', which === 'signup');
      switchText.innerHTML = which === 'login'
        ? `New here? <button type="button" class="link-btn" id="link-to-signup">Create an account</button>`
        : `Already have an account? <button type="button" class="link-btn" id="link-to-login">Log in</button>`;
      const link = which === 'login' ? document.getElementById('link-to-signup') : document.getElementById('link-to-login');
      link.addEventListener('click', () => showTab(which === 'login' ? 'signup' : 'login'));
    }

    tabLogin.addEventListener('click', () => showTab('login'));
    tabSignup.addEventListener('click', () => showTab('signup'));
    document.getElementById('link-to-signup').addEventListener('click', () => showTab('signup'));

    function showError(msg) { errorBox.textContent = msg; errorBox.classList.add('show'); }

    formLogin.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-password').value;
      const remember = document.getElementById('login-remember').checked;
      const result = DB.verifyLogin(email, password);
      if (result.error) return showError(result.error);
      DB.setSession(result.user.id, remember);
      loadUserSession(result.user);
    });

    formSignup.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const confirm = document.getElementById('signup-confirm').value;
      if (!name) return showError('Please enter your name.');
      if (password.length < 6) return showError('Password must be at least 6 characters.');
      if (password !== confirm) return showError('Passwords do not match.');
      const result = DB.createUser({ name, email, password });
      if (result.error) return showError(result.error);
      DB.setSession(result.user.id, true);
      loadUserSession(result.user);
    });

    document.getElementById('btn-forgot').addEventListener('click', () => {
      UI.openModal({
        title: 'Reset password',
        bodyHTML: `<p style="color:var(--text-dim);font-size:14.5px;line-height:1.6;">This is a frontend prototype without an email backend yet, so password resets aren't wired up. When Winter Arc connects to a real server, this is where a reset link would be sent.</p>`,
        footButtons: [{ label: 'Got it', className: 'btn-primary', onClick: UI.closeModal }],
      });
    });
  }

  /* ------------------------------------------------ ONBOARDING */
  const onboardSteps = [
    {
      title: 'Personal',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'age', label: 'Age', type: 'number' },
        { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other', 'Prefer not to say'] },
      ],
    },
    {
      title: 'Body',
      fields: [
        { key: 'height', label: 'Height (cm)', type: 'number' },
        { key: 'weightStart', label: 'Starting weight (kg)', type: 'number', step: '0.1' },
        { key: 'waistStart', label: 'Waist measurement (cm)', type: 'number', step: '0.1' },
      ],
    },
    {
      title: 'Goals',
      fields: [
        { key: 'targetWeight90', label: '90-day target weight (kg)', type: 'number', step: '0.1' },
        { key: 'targetWeightLong', label: 'Long-term target weight (kg)', type: 'number', step: '0.1' },
      ],
    },
    {
      title: 'Lifestyle',
      fields: [
        { key: 'dailyStepsBaseline', label: 'Current daily steps', type: 'number' },
        { key: 'activityLevel', label: 'Activity level', type: 'select', options: ['Sedentary', 'Lightly active', 'Active', 'Very active'] },
        { key: 'gymAccess', label: 'Gym access', type: 'yesno' },
        { key: 'primaryExercise', label: 'Primary exercise', type: 'text' },
      ],
    },
    {
      title: 'Challenge',
      fields: [
        { key: 'challengeStart', label: 'Challenge start date', type: 'date' },
      ],
    },
  ];
  let obStep = 0;
  let obData = {};

  function startOnboarding() {
    obStep = 0;
    obData = { name: state.profile?.name || state.user.name, challengeStart: Engine.todayISO(), gymAccess: true };
    renderOnboardStep();
  }

  function bindOnboarding() { /* nav buttons are re-bound each render */ }

  function renderOnboardStep() {
    const stepsWrap = document.getElementById('onboard-steps');
    stepsWrap.innerHTML = onboardSteps.map((_, i) => `<i class="${i < obStep ? 'done' : i === obStep ? 'active' : ''}"></i>`).join('');

    const step = onboardSteps[obStep];
    const card = document.getElementById('onboard-card');
    card.innerHTML = `
      <h3>${step.title}</h3>
      ${step.fields.map(f => fieldHTML(f)).join('')}
      <div class="onboard-nav">
        ${obStep > 0 ? `<button class="btn btn-ghost" id="ob-back">Back</button>` : `<span></span>`}
        <button class="btn btn-primary" id="ob-next">${obStep === onboardSteps.length - 1 ? 'Start my arc' : 'Continue'}</button>
      </div>
    `;

    step.fields.forEach(f => {
      if (f.type === 'yesno') {
        const group = card.querySelector(`[data-yesno="${f.key}"]`);
        group.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
          group.querySelectorAll('button').forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          obData[f.key] = b.dataset.val === 'true';
        }));
      }
    });

    if (obStep > 0) document.getElementById('ob-back').addEventListener('click', () => { collectStep(step); obStep--; renderOnboardStep(); });
    document.getElementById('ob-next').addEventListener('click', () => {
      if (!collectStep(step, true)) return;
      if (obStep === onboardSteps.length - 1) finishOnboarding();
      else { obStep++; renderOnboardStep(); }
    });
  }

  function fieldHTML(f) {
    const val = obData[f.key] ?? '';
    if (f.type === 'select') {
      return `<div class="field"><label>${f.label}</label><select data-key="${f.key}">${f.options.map(o => `<option ${val===o?'selected':''}>${o}</option>`).join('')}</select></div>`;
    }
    if (f.type === 'yesno') {
      return `<div class="field"><label>${f.label}</label>
        <div class="toggle-group" data-yesno="${f.key}">
          <button data-val="true" class="${val===true?'active':''}">Yes</button>
          <button data-val="false" class="${val===false?'active':''}">No</button>
        </div></div>`;
    }
    return `<div class="field"><label>${f.label}</label><input data-key="${f.key}" type="${f.type}" ${f.step?`step="${f.step}"`:''} value="${val}"></div>`;
  }

  function collectStep(step, validate) {
    const card = document.getElementById('onboard-card');
    for (const f of step.fields) {
      if (f.type === 'yesno') continue;
      const input = card.querySelector(`[data-key="${f.key}"]`);
      if (!input) continue;
      let v = input.value;
      if (f.type === 'number') v = v === '' ? null : parseFloat(v);
      if (validate && f.required && !v) { UI.toast('Please fill in ' + f.label.toLowerCase()); return false; }
      obData[f.key] = v;
    }
    return true;
  }

  function finishOnboarding() {
    const profile = Object.assign({
      onboarded: true,
      weightCurrent: obData.weightStart,
      waistCurrent: obData.waistStart,
      challengeDuration: 90,
      avatar: null,
    }, obData);
    state.profile = profile;
    DB.saveProfile(state.user.id, profile);
    DB.saveDays(state.user.id, {});
    state.days = {};
    showScreen('app');
    navigate('dashboard');
    UI.toast('Your arc has begun', { good: true });
  }

  /* ------------------------------------------------ APP SHELL / NAV */
  function bindAppShell() {
    document.getElementById('sidebar-nav').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-page]');
      if (btn) navigate(btn.dataset.page);
    });
    document.getElementById('mobile-bottomnav').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-page]');
      if (btn) navigate(btn.dataset.page);
      if (e.target.closest('#btn-more')) toggleDrawer(true);
    });
    document.getElementById('btn-logout').addEventListener('click', confirmLogout);
    document.getElementById('drawer-logout').addEventListener('click', () => { toggleDrawer(false); confirmLogout(); });
    document.getElementById('btn-open-drawer').addEventListener('click', () => toggleDrawer(true));
    document.querySelector('#mobile-drawer .scrim').addEventListener('click', () => toggleDrawer(false));
    document.getElementById('mobile-drawer').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-page]');
      if (btn) { navigate(btn.dataset.page); toggleDrawer(false); }
    });
  }

  function toggleDrawer(show) {
    document.getElementById('mobile-drawer').classList.toggle('show', show);
  }

  function confirmLogout() {
    UI.confirmDialog({
      title: 'Log out?',
      message: 'You can log back in any time — your progress is saved to this account.',
      confirmLabel: 'Log out',
      onConfirm: logout,
    });
  }

  function logout() {
    DB.clearSession();
    state.user = null; state.profile = null; state.days = {}; state.settings = null;
    document.documentElement.setAttribute('data-theme', 'dark');
    showScreen('auth');
  }

  function navigate(page) {
    if (!PAGES.includes(page)) return;
    state.currentPage = page;
    if (page !== 'tracker') state.selectedDay = null;
    document.querySelectorAll('.sidebar-nav button[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    document.querySelectorAll('.mobile-bottomnav button[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    updateSidebarInfo();
    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function updateSidebarInfo() {
    document.getElementById('sidebar-name').textContent = state.profile.name;
    const dayNum = getTodayDayNumber();
    const total = state.profile.challengeDuration || 90;
    document.getElementById('sidebar-daylabel').textContent = dayNum < 1 ? 'Starting soon' : dayNum > total ? 'Complete' : `Day ${dayNum} of ${total}`;
    const avatarEls = [document.getElementById('sidebar-avatar')];
    avatarEls.forEach(el => { el.innerHTML = state.profile.avatar ? `<img src="${state.profile.avatar}">` : UI.initials(state.profile.name); });
  }

  function getTodayDayNumber() {
    return Engine.dayNumberFor(state.profile.challengeStart, Engine.todayISO());
  }

  function buildCtx() {
    return {
      profile: state.profile,
      days: state.days,
      settings: state.settings,
      todayDayNum: getTodayDayNumber(),
      selectedDay: state.selectedDay,
      App,
    };
  }

  function renderCurrentPage() {
    const ctx = buildCtx();
    switch (state.currentPage) {
      case 'dashboard': Views.renderDashboard(document.getElementById('page-dashboard'), ctx); break;
      case 'tracker': Views.renderTracker(document.getElementById('page-tracker'), ctx); break;
      case 'calendar': Views.renderCalendar(document.getElementById('page-calendar'), ctx); break;
      case 'progress': Views.renderProgress(document.getElementById('page-progress'), ctx); break;
      case 'weekly': Views.renderWeekly(document.getElementById('page-weekly'), ctx); break;
      case 'goals': Views.renderGoals(document.getElementById('page-goals'), ctx); break;
      case 'settings': Views.renderSettings(document.getElementById('page-settings'), ctx); break;
    }
  }

  function refresh() {
    updateSidebarInfo();
    renderCurrentPage();
  }

  /* ------------------------------------------------ DAY DATA HELPERS */
  function selectDay(n) {
    const total = state.profile.challengeDuration || 90;
    state.selectedDay = Math.max(1, Math.min(total, n));
  }

  function saveDayRecord(dayNum, rec) {
    state.days[dayNum] = rec;
    DB.saveDay(state.user.id, dayNum, rec);
    syncCurrentWeightWaist();
    refresh();
  }

  // Recomputes "current" weight/waist as the value from the most recently
  // logged day, so editing an earlier day never overwrites a newer entry.
  function syncCurrentWeightWaist() {
    let changed = false;
    const dayNums = Object.keys(state.days).map(Number).sort((a, b) => a - b);
    for (const d of dayNums) {
      const r = state.days[d];
      if (r.weight) { state.profile.weightCurrent = r.weight; changed = true; }
      if (r.waist) { state.profile.waistCurrent = r.waist; changed = true; }
    }
    if (changed) DB.saveProfile(state.user.id, state.profile);
  }

  function toggleDisciplineFlag(dayNum, key) {
    const rec = Views.getRecord(state.days, dayNum);
    rec[key] = !rec[key];
    saveDayRecord(dayNum, rec);
  }

  function completeDay(dayNum) {
    const rec = Views.getRecord(state.days, dayNum);
    const targets = Engine.phaseForDay(dayNum);
    if (!Engine.isDayEligibleForCompletion(rec, targets)) {
      UI.toast('Hit your step and walk targets first.');
      return;
    }
    rec.completed = true;
    saveDayRecord(dayNum, rec);
    const score = Engine.disciplineScore(rec, targets);
    if (score === 7) UI.toast('PERFECT DAY', { good: true });
    else UI.toast('Day ' + dayNum + ' complete', { good: true });
  }

  function resetDay(dayNum) {
    delete state.days[dayNum];
    DB.saveDays(state.user.id, state.days);
    refresh();
  }

  function resetChallenge() {
    state.days = {};
    DB.saveDays(state.user.id, {});
    refresh();
  }

  /* ------------------------------------------------ QUICK LOG MODALS */
  function openQuickLog(type, dayNum) {
    const rec = Views.getRecord(state.days, dayNum);
    const configs = {
      steps: { title: 'Log steps', key: 'steps', value: rec.steps || 0, step: 100, min: 0, suffix: ' steps', decimals: 0 },
      walk: { title: 'Log walking minutes', key: 'walkMin', value: rec.walkMin || 0, step: 5, min: 0, suffix: ' min', decimals: 0 },
      weight: { title: "Log today's weight", key: 'weight', value: rec.weight || state.profile.weightCurrent || 0, step: 0.1, min: 0, suffix: ' kg', decimals: 1 },
      water: { title: 'Log water', key: 'water', value: rec.water || 0, step: 1, min: 0, suffix: ' glasses', decimals: 0 },
    };

    if (type === 'notes') {
      UI.openModal({
        title: 'Add a note',
        bodyHTML: `<textarea id="quick-notes" rows="4" style="width:100%;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:12px;color:var(--text);font-family:var(--font-ui);font-size:14px;">${UI.escapeHtml(rec.notes||'')}</textarea>`,
        footButtons: [
          { label: 'Cancel', className: 'btn-ghost', onClick: UI.closeModal },
          { label: 'Save', className: 'btn-primary', onClick: () => {
            rec.notes = document.getElementById('quick-notes').value;
            saveDayRecord(dayNum, rec);
            UI.closeModal();
            UI.toast('Note saved', { good: true });
          }},
        ],
      });
      return;
    }

    const cfg = configs[type];
    if (!cfg) return;
    UI.openModal({
      title: cfg.title,
      bodyHTML: `
        <div class="stepper-input">
          <button id="qs-dec" type="button">−</button>
          <input type="number" id="qs-val" value="${cfg.value}" step="${cfg.step}">
          <button id="qs-inc" type="button">+</button>
        </div>`,
      footButtons: [
        { label: 'Cancel', className: 'btn-ghost', onClick: UI.closeModal },
        { label: 'Save', className: 'btn-primary', onClick: () => {
          const input = document.getElementById('qs-val');
          const newVal = parseFloat(input.value) || 0;
          const oldVal = cfg.value;
          rec[cfg.key] = newVal;
          saveDayRecord(dayNum, rec);
          UI.closeModal();
          checkThresholdToast(type, dayNum, oldVal, newVal);
        }},
      ],
    });
    document.getElementById('qs-dec').addEventListener('click', () => {
      const input = document.getElementById('qs-val');
      input.value = Math.max(cfg.min, (parseFloat(input.value) || 0) - cfg.step);
    });
    document.getElementById('qs-inc').addEventListener('click', () => {
      const input = document.getElementById('qs-val');
      input.value = (parseFloat(input.value) || 0) + cfg.step;
    });
  }

  function checkThresholdToast(type, dayNum, oldVal, newVal) {
    const targets = Engine.phaseForDay(dayNum);
    if (type === 'steps' && oldVal < targets.steps && newVal >= targets.steps) {
      UI.toast(`${targets.steps.toLocaleString()} STEPS COMPLETE`, { good: true });
    } else if (type === 'walk' && oldVal < targets.walk && newVal >= targets.walk) {
      UI.toast('WALK COMPLETE', { good: true });
    }
  }

  /* ------------------------------------------------ PROFILE / SETTINGS MUTATIONS */
  function saveProfile(profile) {
    state.profile = profile;
    DB.saveProfile(state.user.id, profile);
  }

  function updateProfileFields(fields) {
    Object.assign(state.profile, fields);
    DB.saveProfile(state.user.id, state.profile);
    refresh();
  }

  function updateSettings(fields) {
    Object.assign(state.settings, fields);
    DB.saveSettings(state.user.id, state.settings);
    if (fields.reducedMotion !== undefined) document.documentElement.dataset.reducedMotion = fields.reducedMotion ? 'true' : 'false';
  }

  function exportData() {
    const data = DB.exportUserData(state.user.id);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `winter-arc-${state.user.name.replace(/\s+/g,'-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importData(data) {
    DB.importUserData(state.user.id, data);
    state.profile = DB.getProfile(state.user.id);
    state.days = DB.getDays(state.user.id);
    state.settings = DB.getSettings(state.user.id);
    applyTheme(state.settings.theme);
    refresh();
  }

  function deleteAccount() {
    DB.deleteAccount(state.user.id);
    state.user = null; state.profile = null; state.days = {}; state.settings = null;
    document.documentElement.setAttribute('data-theme', 'dark');
    showScreen('auth');
    UI.toast('Account deleted');
  }

  /* ------------------------------------------------ OVERVIEW STATS */
  function computeOverview() {
    const profile = state.profile, days = state.days;
    const todayNum = getTodayDayNumber();
    const total = profile.challengeDuration || 90;
    const streaks = Engine.computeStreaks(days, Math.min(todayNum, total));
    const weightLost = Engine.round1((profile.weightStart || 0) - (profile.weightCurrent || profile.weightStart || 0));
    const waistLost = Engine.round1((profile.waistStart || 0) - (profile.waistCurrent || profile.waistStart || 0));
    const recordedDays = Object.values(days);
    const stepsArr = recordedDays.map(d => d.steps).filter(Boolean);
    const walkTotal = recordedDays.reduce((sum, d) => sum + (d.walkMin || 0), 0);
    const daysCompleted = recordedDays.filter(d => d.completed).length;
    const daysRemaining = Math.max(0, total - Math.min(todayNum, total));
    const completionPct = total ? Math.round((daysCompleted / total) * 100) : 0;
    return {
      weightCurrent: profile.weightCurrent, weightLost,
      waistCurrent: profile.waistCurrent, waistLost,
      daysCompleted, daysRemaining,
      currentStreak: streaks.current, longestStreak: streaks.longest,
      avgSteps: Engine.avg(stepsArr), totalWalk: walkTotal,
      completionPct,
    };
  }

  /* ------------------------------------------------ PUBLIC API */
  return {
    init, navigate, refresh, renderCurrentPage,
    selectDay, saveDayRecord, toggleDisciplineFlag, completeDay, resetDay, resetChallenge,
    openQuickLog, saveProfile, updateProfileFields, updateSettings, setTheme,
    exportData, importData, deleteAccount, computeOverview,
  };
})();

window.App = App; // exposed for debugging/testing
document.addEventListener('DOMContentLoaded', App.init);
