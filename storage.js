/* ============================================================
   STORAGE LAYER
   All persistence goes through this module so a real backend
   could later replace localStorage without touching the rest
   of the app (see comment at bottom of each function).
   ============================================================ */

const DB = (() => {
  const KEYS = {
    users: 'wa_users',            // { [userId]: {id, name, email, passwordHash} }
    session: 'wa_session',        // { userId, remember }
    profile: (uid) => `wa_profile_${uid}`,
    days: (uid) => `wa_days_${uid}`,
    settings: (uid) => `wa_settings_${uid}`,
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.error('DB read error', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('DB write error', key, e);
      return false;
    }
  }

  // ---- simple non-cryptographic hash for the frontend prototype ----
  // NOTE: this is NOT secure. A real backend must hash+salt server-side.
  function hashPassword(pw) {
    let h = 0;
    const str = 'wa_salt_v1::' + pw;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return 'h' + h.toString(36) + str.length;
  }

  function getUsers() { return read(KEYS.users, {}); }
  function saveUsers(users) { return write(KEYS.users, users); }

  function findUserByEmail(email) {
    const users = getUsers();
    const norm = email.trim().toLowerCase();
    return Object.values(users).find(u => u.email.toLowerCase() === norm) || null;
  }

  function createUser({ name, email, password }) {
    const users = getUsers();
    if (findUserByEmail(email)) return { error: 'An account with this email already exists.' };
    const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const user = { id, name: name.trim(), email: email.trim(), passwordHash: hashPassword(password) };
    users[id] = user;
    saveUsers(users);
    return { user };
  }

  function verifyLogin(email, password) {
    const user = findUserByEmail(email);
    if (!user) return { error: 'No account found with that email.' };
    if (user.passwordHash !== hashPassword(password)) return { error: 'Incorrect password.' };
    return { user };
  }

  function setSession(userId, remember) {
    write(KEYS.session, { userId, remember: !!remember });
  }
  function getSession() { return read(KEYS.session, null); }
  function clearSession() { localStorage.removeItem(KEYS.session); }

  function getProfile(uid) { return read(KEYS.profile(uid), null); }
  function saveProfile(uid, profile) { return write(KEYS.profile(uid), profile); }

  function getDays(uid) { return read(KEYS.days(uid), {}); }
  function saveDays(uid, days) { return write(KEYS.days(uid), days); }
  function getDay(uid, dayNum) { const days = getDays(uid); return days[dayNum] || null; }
  function saveDay(uid, dayNum, record) {
    const days = getDays(uid);
    days[dayNum] = record;
    return saveDays(uid, days);
  }

  function getSettings(uid) {
    return read(KEYS.settings(uid), { theme: 'dark', notifications: true, reducedMotion: false });
  }
  function saveSettings(uid, settings) { return write(KEYS.settings(uid), settings); }

  function deleteAccount(uid) {
    const users = getUsers();
    delete users[uid];
    saveUsers(users);
    localStorage.removeItem(KEYS.profile(uid));
    localStorage.removeItem(KEYS.days(uid));
    localStorage.removeItem(KEYS.settings(uid));
    clearSession();
  }

  function exportUserData(uid) {
    return {
      exportedAt: new Date().toISOString(),
      user: (() => { const u = { ...getUsers()[uid] }; delete u.passwordHash; return u; })(),
      profile: getProfile(uid),
      days: getDays(uid),
      settings: getSettings(uid),
    };
  }

  function importUserData(uid, data) {
    if (data.profile) saveProfile(uid, data.profile);
    if (data.days) saveDays(uid, data.days);
    if (data.settings) saveSettings(uid, data.settings);
    return true;
  }

  // When a real backend exists: swap the bodies of these functions for
  // fetch() calls to your API, keeping the same function names/signatures
  // so the rest of the app (engine.js, views.js, app.js) needs no changes.

  return {
    createUser, verifyLogin, findUserByEmail,
    setSession, getSession, clearSession,
    getProfile, saveProfile,
    getDays, saveDays, getDay, saveDay,
    getSettings, saveSettings,
    deleteAccount, exportUserData, importUserData,
  };
})();

window.DB = DB;
