(function () {
  const STORAGE_KEY = 'nyc-grid-align';
  const DEFAULT_ANGLE = -28.9;
  const STATE_ATTR_ENABLED = 'data-nyc-grid-enabled';
  const STATE_ATTR_ANGLE = 'data-nyc-grid-angle';

  let enabled = false;
  let angle = DEFAULT_ANGLE;
  let target = null;

  function scaleForAngle(deg) {
    const rad = (Math.abs(deg) * Math.PI) / 180;
    return Math.abs(Math.sin(rad)) + Math.abs(Math.cos(rad)) + 0.04;
  }

  function findMapElement() {
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

  function syncStateAttrs() {
    const root = document.documentElement;
    root.setAttribute(STATE_ATTR_ENABLED, enabled ? 'true' : 'false');
    root.setAttribute(STATE_ATTR_ANGLE, String(angle));
  }

  // The page-world counter-rotation lives in page-world.js (declared in
  // manifest with "world": "MAIN"). Communication is via data-* attributes
  // on <html>, which are shared DOM visible in both worlds.

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
    syncStateAttrs();
    if (enabled) ensureApplied();
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'set-enabled') {
      enabled = !!msg.enabled;
      syncStateAttrs();
      if (enabled) ensureApplied();
      else clearTransform(target);
    } else if (msg.type === 'set-angle') {
      angle = Number(msg.angle);
      syncStateAttrs();
      if (enabled) applyTransform();
    } else if (msg.type === 'get-state') {
      sendResponse({ enabled, angle });
      return true;
    }
  });
})();
