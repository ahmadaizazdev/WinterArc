/* ============================================================
   MINI CHARTS — dependency-free canvas line charts.
   Kept intentionally small: this app only ever needs a single
   series (optionally with a target line) plotted over days.
   ============================================================ */

const Charts = (() => {

  function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function drawLineChart(canvas, points, opts = {}) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(rect.width, 260);
    const h = opts.height || 220;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const padL = 40, padR = 14, padT = 16, padB = 26;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;

    const accent = getCssVar('--accent') || '#D9762E';
    const textFaint = getCssVar('--text-faint') || '#5C616D';
    const border = getCssVar('--border') || 'rgba(255,255,255,0.07)';

    if (!points || points.length < 2) {
      ctx.fillStyle = textFaint;
      ctx.font = '13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Not enough data yet', w / 2, h / 2);
      return;
    }

    const values = points.map(p => p.y);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.12;
    min -= pad; max += pad;

    const xFor = (i) => padL + (plotW * i) / (points.length - 1);
    const yFor = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;

    // gridlines
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    const gridLines = 4;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = textFaint;
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const y = padT + (plotH * i) / gridLines;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      const val = max - ((max - min) * i) / gridLines;
      ctx.fillText(val.toFixed(opts.decimals || 0), padL - 8, y + 3);
    }

    // x labels (first, middle, last)
    ctx.textAlign = 'center';
    [0, Math.floor((points.length - 1) / 2), points.length - 1].forEach(i => {
      ctx.fillText(points[i].label || '', xFor(i), h - 6);
    });

    // area fill
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, hexToRgba(accent, 0.28));
    grad.addColorStop(1, hexToRgba(accent, 0.0));
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(i), y = yFor(p.y);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(xFor(points.length - 1), padT + plotH);
    ctx.lineTo(xFor(0), padT + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = xFor(i), y = yFor(p.y);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.4;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // dots
    points.forEach((p, i) => {
      const x = xFor(i), y = yFor(p.y);
      ctx.beginPath();
      ctx.arc(x, y, i === points.length - 1 ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = i === points.length - 1 ? accent : hexToRgba(accent, 0.7);
      ctx.fill();
    });
  }

  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  return { drawLineChart };
})();

window.Charts = Charts;
