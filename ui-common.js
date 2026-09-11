/* ============================================================
   UI COMMON — toasts, modals, confirms, small render helpers.
   ============================================================ */

const UI = (() => {

  function toast(msg, opts = {}) {
    const wrap = document.getElementById('toast-wrap');
    const el = document.createElement('div');
    el.className = 'toast' + (opts.good ? ' good' : '');
    el.textContent = msg;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 350);
    }, opts.duration || 2400);
  }

  function closeModal() {
    const root = document.getElementById('modal-root');
    const overlay = root.querySelector('.modal-overlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => { root.innerHTML = ''; }, 250);
  }

  function openModal({ title, bodyHTML, footButtons }) {
    const root = document.getElementById('modal-root');
    root.innerHTML = `
      <div class="modal-overlay" id="active-modal-overlay">
        <div class="modal-box" role="dialog" aria-modal="true" aria-label="${escapeHtml(title || '')}">
          <div class="modal-head">
            <h3>${title || ''}</h3>
            <button class="icon-btn" id="modal-close-x" aria-label="Close">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="modal-body">${bodyHTML}</div>
          <div class="modal-foot" id="modal-foot"></div>
        </div>
      </div>`;
    const foot = document.getElementById('modal-foot');
    (footButtons || []).forEach(b => {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (b.className || 'btn-quiet');
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
      foot.appendChild(btn);
    });
    document.getElementById('modal-close-x').addEventListener('click', closeModal);
    const overlay = document.getElementById('active-modal-overlay');
    overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) closeModal(); });
    requestAnimationFrame(() => overlay.classList.add('show'));
    return root;
  }

  function confirmDialog({ title, message, confirmLabel, danger, onConfirm }) {
    openModal({
      title,
      bodyHTML: `<div class="confirm-box"><p>${message}</p></div>`,
      footButtons: [
        { label: 'Cancel', className: 'btn-ghost', onClick: closeModal },
        {
          label: confirmLabel || 'Confirm',
          className: danger ? 'btn-danger' : 'btn-primary',
          onClick: () => { closeModal(); onConfirm(); },
        },
      ],
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[s]));
  }

  // Animate a numeric text node from its current value to `to`.
  function animateNumber(el, to, opts = {}) {
    if (!el) return;
    const from = parseFloat(el.dataset.rawval || '0') || 0;
    const decimals = opts.decimals || 0;
    const duration = opts.duration || 500;
    const start = performance.now();
    const reduced = document.documentElement.dataset.reducedMotion === 'true';
    if (reduced) {
      el.textContent = to.toFixed(decimals) + (opts.suffix || '');
      el.dataset.rawval = to;
      return;
    }
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const val = from + (to - from) * eased;
      el.textContent = val.toFixed(decimals) + (opts.suffix || '');
      if (t < 1) requestAnimationFrame(tick);
      else { el.dataset.rawval = to; el.classList.add('pop'); setTimeout(() => el.classList.remove('pop'), 350); }
    }
    requestAnimationFrame(tick);
  }

  // Circular progress ring SVG markup.
  function ringSVG(pct, size = 64, stroke = 6) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(1, pct));
    const offset = c * (1 - clamped);
    return `
      <svg class="ring-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle class="track" cx="${size/2}" cy="${size/2}" r="${r}"></circle>
        <circle class="prog" cx="${size/2}" cy="${size/2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${offset}"></circle>
      </svg>`;
  }

  function initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function fmt1(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return (Math.round(n * 10) / 10).toString();
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  return { toast, openModal, closeModal, confirmDialog, escapeHtml, animateNumber, ringSVG, initials, fmt1, formatDate };
})();

window.UI = UI;
