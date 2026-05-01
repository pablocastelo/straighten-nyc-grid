(function () {
  const ENABLED_ATTR = 'data-nyc-grid-enabled';
  const ANGLE_ATTR = 'data-nyc-grid-angle';
  const TYPES = [
    'pointerdown', 'pointermove', 'pointerup', 'pointercancel',
    'mousedown', 'mousemove', 'mouseup',
    'wheel'
  ];

  function getEnabled() {
    return document.documentElement.getAttribute(ENABLED_ATTR) === 'true';
  }
  function getAngle() {
    const v = parseFloat(document.documentElement.getAttribute(ANGLE_ATTR));
    return Number.isFinite(v) ? v : 0;
  }
  function scaleForAngle(deg) {
    const rad = Math.abs(deg) * Math.PI / 180;
    return Math.abs(Math.sin(rad)) + Math.abs(Math.cos(rad)) + 0.04;
  }
  function getMap() {
    return document.querySelector('div[role="application"][aria-label^="Map"]')
        || document.querySelector('div[role="application"][aria-label*="Map"]');
  }
  function override(e, prop, value) {
    try {
      Object.defineProperty(e, prop, { value: value, configurable: true, writable: true });
    } catch (_) { /* ignore */ }
  }
  function transformPoint(x, y, target, angleDeg) {
    const r = target.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const rad = -angleDeg * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const s = 1 / scaleForAngle(angleDeg);
    const dx = (x - cx) * s;
    const dy = (y - cy) * s;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }
  function rewrite(e) {
    if (!getEnabled()) return;
    const target = getMap();
    if (!target) return;
    const path = (typeof e.composedPath === 'function') ? e.composedPath() : [];
    let inMap = false;
    for (let i = 0; i < path.length; i++) { if (path[i] === target) { inMap = true; break; } }
    if (!inMap && !(e.target && target.contains(e.target))) return;

    const angleDeg = getAngle();
    const p = transformPoint(e.clientX, e.clientY, target, angleDeg);
    const dx = p.x - e.clientX;
    const dy = p.y - e.clientY;
    override(e, 'clientX', p.x);
    override(e, 'clientY', p.y);
    override(e, 'pageX', e.pageX + dx);
    override(e, 'pageY', e.pageY + dy);
    override(e, 'x', p.x);
    override(e, 'y', p.y);
    override(e, 'screenX', e.screenX + dx);
    override(e, 'screenY', e.screenY + dy);
    if (typeof e.movementX === 'number') {
      const rad = -angleDeg * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const s = 1 / scaleForAngle(angleDeg);
      const mx = e.movementX * s, my = e.movementY * s;
      override(e, 'movementX', mx * cos - my * sin);
      override(e, 'movementY', mx * sin + my * cos);
    }
  }

  for (let i = 0; i < TYPES.length; i++) {
    window.addEventListener(TYPES[i], rewrite, { capture: true, passive: false });
  }
})();
