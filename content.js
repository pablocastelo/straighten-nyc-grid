(function () {
  const STORAGE_KEY = 'nyc-grid-align';
  const DEFAULT_ANGLE = -28.9;

  let enabled = false;
  let angle = DEFAULT_ANGLE;
  let target = null;

  function scaleForAngle(deg) {
    const rad = (Math.abs(deg) * Math.PI) / 180;
    return Math.abs(Math.sin(rad)) + Math.abs(Math.cos(rad)) + 0.04;
  }

  function findMapElement() {
    // Current Google Maps places the WebGL canvas as a direct child of the
    // div[role="application"][aria-label^="Map"] node. Class names are
    // obfuscated and rotate, so target by role+aria. Fall back to the
    // canvas's parent in case Maps' a11y attributes change.
    const app = document.querySelector('div[role="application"][aria-label^="Map"]')
            || document.querySelector('div[role="application"][aria-label*="Map"]');
    if (app) return app;

    let biggest = null;
    for (const c of document.querySelectorAll('canvas')) {
      if (!biggest || c.width * c.height > biggest.width * biggest.height) biggest = c;
    }
    if (biggest && biggest.parentElement) return biggest.parentElement;

    const scene = document.querySelector('#scene') || document.querySelector('div.widget-scene');
    return scene || null;
  }

  function clearTransform(el) {
    if (!el) return;
    el.style.transform = '';
    el.style.transformOrigin = '';
    el.style.transition = '';
  }

  function applyTransform() {
    const el = findMapElement();
    if (!el) return false;

    if (target && target !== el) clearTransform(target);
    target = el;

    if (enabled) {
      const s = scaleForAngle(angle);
      el.style.transformOrigin = 'center center';
      el.style.transition = 'transform 0.4s ease';
      el.style.transform = `rotate(${angle}deg) scale(${s.toFixed(3)})`;
    } else {
      clearTransform(el);
    }
    return true;
  }

  function ensureApplied(retries = 20) {
    if (applyTransform()) return;
    if (retries > 0) setTimeout(() => ensureApplied(retries - 1), 500);
  }

  // ---- Pointer counter-rotation ------------------------------------------
  // CSS rotate() only rotates pixels; Maps still reads pointer deltas in
  // unrotated screen space, so dragging visually-up pans the map along the
  // rotated axis. We intercept real events in capture phase and override
  // their coordinate properties (clientX, pageX, x, screenX, etc.) so Maps
  // sees deltas rotated by -angle. The events stay trusted (we don't
  // re-dispatch), just with rewritten coordinates.
  const INTERCEPT_TYPES = [
    'pointerdown', 'pointermove', 'pointerup', 'pointercancel',
    'mousedown', 'mousemove', 'mouseup',
    'wheel'
  ];
  let interceptInstalled = false;

  function transformPoint(x, y) {
    if (!target) return { x, y };
    const r = target.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const rad = -angle * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const s = 1 / scaleForAngle(angle);
    const dx = (x - cx) * s;
    const dy = (y - cy) * s;
    return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
  }

  function override(evt, prop, value) {
    try {
      Object.defineProperty(evt, prop, { value, configurable: true, writable: true });
    } catch (_) { /* read-only descriptor — give up silently */ }
  }

  function rewriteCoords(e) {
    const { x, y } = transformPoint(e.clientX, e.clientY);
    const dx = x - e.clientX;
    const dy = y - e.clientY;
    override(e, 'clientX', x);
    override(e, 'clientY', y);
    override(e, 'pageX', e.pageX + dx);
    override(e, 'pageY', e.pageY + dy);
    override(e, 'x', x);
    override(e, 'y', y);
    override(e, 'screenX', e.screenX + dx);
    override(e, 'screenY', e.screenY + dy);
    if (typeof e.movementX === 'number') {
      // movementX/Y are deltas — rotate them by -angle (no translation, no scale-shift in absolute pos)
      const rad = -angle * Math.PI / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);
      const s = 1 / scaleForAngle(angle);
      const mx = e.movementX * s, my = e.movementY * s;
      override(e, 'movementX', mx * cos - my * sin);
      override(e, 'movementY', mx * sin + my * cos);
    }
  }

  function intercept(e) {
    if (!enabled || !target) return;
    const path = (typeof e.composedPath === 'function') ? e.composedPath() : [];
    let inMap = false;
    for (let i = 0; i < path.length; i++) {
      if (path[i] === target) { inMap = true; break; }
    }
    if (!inMap && !(e.target && target.contains(e.target))) return;
    rewriteCoords(e);
  }

  function installInterceptors() {
    if (interceptInstalled) return;
    for (const t of INTERCEPT_TYPES) {
      window.addEventListener(t, intercept, { capture: true, passive: false });
    }
    interceptInstalled = true;
  }

  function uninstallInterceptors() {
    if (!interceptInstalled) return;
    for (const t of INTERCEPT_TYPES) {
      window.removeEventListener(t, intercept, { capture: true });
    }
    interceptInstalled = false;
  }

  const observer = new MutationObserver(() => {
    if (!enabled) return;
    const current = findMapElement();
    if (!current) return;
    if (current !== target || current.style.transform.indexOf('rotate') === -1) {
      applyTransform();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  chrome.storage.local.get([STORAGE_KEY], (data) => {
    const state = (data && data[STORAGE_KEY]) || {};
    enabled = !!state.enabled;
    angle = typeof state.angle === 'number' ? state.angle : DEFAULT_ANGLE;
    if (enabled) {
      ensureApplied();
      installInterceptors();
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'set-enabled') {
      enabled = !!msg.enabled;
      if (enabled) {
        ensureApplied();
        installInterceptors();
      } else {
        clearTransform(target);
        uninstallInterceptors();
      }
    } else if (msg.type === 'set-angle') {
      angle = Number(msg.angle);
      if (enabled) applyTransform();
    } else if (msg.type === 'get-state') {
      sendResponse({ enabled, angle });
      return true;
    }
  });
})();
