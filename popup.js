const STORAGE_KEY = 'nyc-grid-align';
const DEFAULT_ANGLE = -28.9;

const enabledCheckbox = document.getElementById('enabled');
const angleSlider = document.getElementById('angle');
const angleDisplay = document.getElementById('angle-display');
const resetBtn = document.getElementById('reset');

function send(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, msg, () => {
      // Swallow "no receiving end" errors when the active tab isn't Maps.
      void chrome.runtime.lastError;
    });
  });
}

function save(state) {
  chrome.storage.local.set({ [STORAGE_KEY]: state });
}

function setAngleDisplay(a) {
  angleDisplay.textContent = a.toFixed(1) + '°';
}

chrome.storage.local.get([STORAGE_KEY], (data) => {
  const state = (data && data[STORAGE_KEY]) || { enabled: false, angle: DEFAULT_ANGLE };
  enabledCheckbox.checked = !!state.enabled;
  angleSlider.value = state.angle;
  setAngleDisplay(Number(state.angle));
});

enabledCheckbox.addEventListener('change', () => {
  const enabled = enabledCheckbox.checked;
  const angle = parseFloat(angleSlider.value);
  save({ enabled, angle });
  send({ type: 'set-enabled', enabled });
});

angleSlider.addEventListener('input', () => {
  const angle = parseFloat(angleSlider.value);
  setAngleDisplay(angle);
  const enabled = enabledCheckbox.checked;
  save({ enabled, angle });
  send({ type: 'set-angle', angle });
});

resetBtn.addEventListener('click', () => {
  angleSlider.value = DEFAULT_ANGLE;
  setAngleDisplay(DEFAULT_ANGLE);
  const enabled = enabledCheckbox.checked;
  save({ enabled, angle: DEFAULT_ANGLE });
  send({ type: 'set-angle', angle: DEFAULT_ANGLE });
});
