/* =========================================================
   PUTARAN KEBERUNTUNGAN
   Vanilla JavaScript — no framework
   ========================================================= */

"use strict";

const STORAGE_KEYS = {
  names: "pk_names_v1",
  history: "pk_history_v1",
  settings: "pk_settings_v1"
};

const DEFAULT_SETTINGS = {
  autoRemoveWinner: false,
  soundEnabled: false
};

const COLORS = [
  "#E53935",
  "#F9A825",
  "#1E88E5",
  "#43A047",
  "#8E24AA",
  "#FB8C00",
  "#00ACC1",
  "#D81B60",
  "#6D4C41",
  "#3949AB"
];

const state = {
  names: [],
  history: [],
  settings: { ...DEFAULT_SETTINGS },
  rotation: 0,
  spinning: false,
  winnerIndex: null,
  audioContext: null
};

const elements = {
  canvas: document.getElementById("wheelCanvas"),
  wheelStage: document.querySelector(".wheel-stage"),
  spinButton: document.getElementById("spinButton"),
  spinAgainButton: document.getElementById("spinAgainButton"),
  removeWinnerButton: document.getElementById("removeWinnerButton"),
  wheelStatus: document.getElementById("wheelStatus"),
  nameCount: document.getElementById("nameCount"),
  nameInput: document.getElementById("nameInput"),
  addNamesButton: document.getElementById("addNamesButton"),
  nameList: document.getElementById("nameList"),
  modalNameInput: document.getElementById("modalNameInput"),
  modalAddNamesButton: document.getElementById("modalAddNamesButton"),
  modalNameList: document.getElementById("modalNameList"),
  resultContent: document.getElementById("resultContent"),
  resultActions: document.getElementById("resultActions"),
  historyList: document.getElementById("historyList"),
  clearHistoryButton: document.getElementById("clearHistoryButton"),
  autoRemoveWinner: document.getElementById("autoRemoveWinner"),
  soundEnabled: document.getElementById("soundEnabled"),
  resetAppButton: document.getElementById("resetAppButton"),
  menuToggle: document.getElementById("menuToggle"),
  mobileMenu: document.getElementById("mobileMenu"),
  drawerBackdrop: document.getElementById("drawerBackdrop"),
  toast: document.getElementById("toast"),
  namesModal: document.getElementById("namesModal"),
  historyModal: document.getElementById("historyModal"),
  settingsModal: document.getElementById("settingsModal")
};

const ctx = elements.canvas.getContext("2d");

let toastTimer = null;

function loadStorage() {
  try {
    const names = JSON.parse(localStorage.getItem(STORAGE_KEYS.names) || "[]");
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
    const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || "{}");

    state.names = Array.isArray(names) ? sanitizeNames(names) : [];
    state.history = Array.isArray(history) ? history : [];
    state.settings = {
      ...DEFAULT_SETTINGS,
      ...(settings && typeof settings === "object" ? settings : {})
    };
  } catch (error) {
    console.warn("Data lokal tidak dapat dibaca:", error);
    state.names = [];
    state.history = [];
    state.settings = { ...DEFAULT_SETTINGS };
  }

  elements.autoRemoveWinner.checked = Boolean(state.settings.autoRemoveWinner);
  elements.soundEnabled.checked = Boolean(state.settings.soundEnabled);
}

function saveStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.names, JSON.stringify(state.names));
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
  } catch (error) {
    console.warn("Data lokal tidak dapat disimpan:", error);
    showToast("Penyimpanan browser tidak tersedia.");
  }
}

function sanitizeNames(names) {
  return names
    .map((name) => String(name).trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function parseNames(rawText) {
  return sanitizeNames(String(rawText || "").split(/\r?\n/));
}

function addNames(rawText) {
  const incoming = parseNames(rawText);

  if (!incoming.length) {
    showToast("Masukkan minimal satu nama.");
    return false;
  }

  state.names.push(...incoming);
  saveStorage();
  renderAll();
  showToast(`${incoming.length} nama ditambahkan.`);
  return true;
}

function removeName(index) {
  if (state.spinning || index < 0 || index >= state.names.length) return;

  const removed = state.names.splice(index, 1)[0];
  if (state.winnerIndex !== null) {
    state.winnerIndex = null;
  }

  saveStorage();
  renderAll();
  showToast(`${removed} dihapus.`);
}

function clearNames() {
  if (state.spinning || !state.names.length) return;

  const confirmed = window.confirm("Hapus semua nama?");
  if (!confirmed) return;

  state.names = [];
  state.winnerIndex = null;
  saveStorage();
  renderAll();
  showToast("Semua nama dihapus.");
}

function renderAll() {
  updateCount();
  renderNameList(elements.nameList);
  renderNameList(elements.modalNameList);
  renderHistory();
  drawWheel();
  updateControls();
}

function updateCount() {
  elements.nameCount.textContent = String(state.names.length);
}

function renderNameList(container) {
  container.replaceChildren();

  if (!state.names.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "Belum ada nama.";
    container.appendChild(empty);
    return;
  }

  state.names.forEach((name, index) => {
    const row = document.createElement("div");
    row.className = "name-item";

    const number = document.createElement("span");
    number.className = "name-number";
    number.textContent = String(index + 1);

    const value = document.createElement("span");
    value.className = "name-value";
    value.textContent = name;
    value.title = name;

    const remove = document.createElement("button");
    remove.className = "remove-name";
    remove.type = "button";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `Hapus ${name}`);
    remove.addEventListener("click", () => removeName(index));

    row.append(number, value, remove);
    container.appendChild(row);
  });
}

function renderHistory() {
  elements.historyList.replaceChildren();

  if (!state.history.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = "Belum ada riwayat putaran.";
    elements.historyList.appendChild(empty);
    return;
  }

  state.history.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "history-item";

    const number = document.createElement("span");
    number.className = "history-number";
    number.textContent = `#${state.history.length - index}`;

    const name = document.createElement("span");
    name.className = "history-name";
    name.textContent = item.name;

    const time = document.createElement("span");
    time.className = "history-time";
    time.textContent = formatHistoryTime(item.timestamp);

    row.append(number, name, time);
    elements.historyList.appendChild(row);
  });
}

function formatHistoryTime(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateControls() {
  const disabled = state.spinning;
  elements.spinButton.disabled = disabled || state.names.length < 2;
  elements.spinAgainButton.disabled = disabled || state.names.length < 2;
  elements.removeWinnerButton.disabled = disabled || state.winnerIndex === null;

  if (state.names.length === 0) {
    elements.wheelStatus.textContent = "Tambahkan nama, lalu putar rodanya.";
  } else if (state.names.length === 1) {
    elements.wheelStatus.textContent = "Tambahkan minimal satu nama lagi untuk memutar.";
  } else if (!state.spinning) {
    elements.wheelStatus.textContent = "Semua nama memiliki satu sektor yang sama besar.";
  }
}

function clearInput(input) {
  input.value = "";
}

function randomIndex(maxExclusive) {
  if (maxExclusive <= 1) return 0;

  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    const maxUint = 0x100000000;
    const limit = Math.floor(maxUint / maxExclusive) * maxExclusive;
    const buffer = new Uint32Array(1);

    do {
      window.crypto.getRandomValues(buffer);
    } while (buffer[0] >= limit);

    return buffer[0] % maxExclusive;
  }

  return Math.floor(Math.random() * maxExclusive);
}

function resizeCanvas() {
  const rect = elements.canvas.getBoundingClientRect();
  const size = Math.max(1, Math.floor(Math.min(rect.width, rect.height)));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  elements.canvas.width = Math.floor(size * dpr);
  elements.canvas.height = Math.floor(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawWheel();
}

function getCanvasSize() {
  const rect = elements.canvas.getBoundingClientRect();
  return Math.min(rect.width, rect.height);
}

function drawWheel() {
  const size = getCanvasSize();
  if (!size || !state.names.length) {
    drawEmptyWheel();
    return;
  }

  const center = size / 2;
  const radius = center - 6;
  const count = state.names.length;
  const slice = (Math.PI * 2) / count;
  const currentRotation = state.rotation;

  ctx.clearRect(0, 0, size, size);

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate(degToRad(currentRotation));

  for (let i = 0; i < count; i += 1) {
    const start = -Math.PI / 2 + i * slice;
    const end = start + slice;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, end);
    ctx.closePath();

    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = Math.max(1.5, size / 260);
    ctx.stroke();

    drawWheelLabel(
     state.names[i],
     i,
     start,
     end,
     radius,
     size,
     currentRotation
   );
  }

  ctx.restore();

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = Math.max(4, size / 35);
  ctx.stroke();
}

function drawEmptyWheel() {
  const size = getCanvasSize();
  if (!size) return;

  const center = size / 2;
  const radius = center - 6;

  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#e9eaec";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(5, size / 30);
  ctx.stroke();

  ctx.fillStyle = "#7b8086";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `800 ${Math.max(14, size / 22)}px Nunito, sans-serif`;
  ctx.fillText("Tambahkan nama", center, center - 10);

  ctx.font = `700 ${Math.max(11, size / 32)}px Nunito, sans-serif`;
  ctx.fillText("untuk memulai", center, center + 17);
}

function drawWheelLabel(
  name,
  index,
  start,
  end,
  radius,
  size,
  currentRotation
) {
  const angle = start + (end - start) / 2;
  const labelRadius = radius * 0.70;

  const x = Math.cos(angle) * labelRadius;
  const y = Math.sin(angle) * labelRadius;

  const count = state.names.length;

  const fontSize = clamp(
    size / (
      count > 30
        ? 46
        : count > 12
          ? 32
          : 21
    ),
    9,
    22
  );

  const availableWidth = Math.max(
    24,
    2 * labelRadius * Math.sin((end - start) / 2) * 0.82
  );

  ctx.save();

  ctx.translate(x, y);

  /*
   * Wheel berputar, tetapi teks dikembalikan
   * ke posisi horizontal terhadap layar.
   */
  ctx.rotate(-degToRad(currentRotation));

  ctx.font = `900 ${fontSize}px Nunito, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";

  ctx.shadowColor = "rgba(0,0,0,0.18)";
  ctx.shadowBlur = 2;

  let label = name;

  while (
    ctx.measureText(label).width > availableWidth &&
    label.length > 2
  ) {
    label = `${label.slice(0, -2)}…`;
  }

  ctx.fillText(label, 0, 0);

  ctx.restore();
}
function truncateName(name, maxChars) {
  if (name.length <= maxChars) return name;
  return `${name.slice(0, Math.max(1, maxChars - 1))}…`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function getTargetRotation(winnerIndex, total) {
  const slice = 360 / total;
  const centerAngle = winnerIndex * slice + slice / 2;

  /*
   * Canvas slice 0 starts at the top (-90deg).
   * The pointer is fixed at the top, so the winner's center must
   * rotate to the top position.
   */
  const desiredRotation = -centerAngle;
  const currentNormalized = normalizeDegrees(state.rotation);
  const desiredNormalized = normalizeDegrees(desiredRotation);

  let delta = desiredNormalized - currentNormalized;
  if (delta < 0) delta += 360;

  const extraTurns = 5 + randomIndex(3);
  return state.rotation + extraTurns * 360 + delta;
}

function spin() {
  if (state.spinning || state.names.length < 2) {
    if (state.names.length < 2) {
      showToast("Tambahkan minimal dua nama.");
    }
    return;
  }

  state.spinning = true;
  state.winnerIndex = null;
  elements.resultActions.hidden = true;
  elements.spinButton.disabled = true;
  elements.spinAgainButton.disabled = true;
  elements.removeWinnerButton.disabled = true;
  elements.wheelStatus.textContent = "Roda sedang berputar…";

  const winnerIndex = randomIndex(state.names.length);
  const startRotation = state.rotation;
  const targetRotation = getTargetRotation(winnerIndex, state.names.length);
  const duration = 4200 + randomIndex(1000);
  const startTime = performance.now();

  function frame(now) {
    const progress = clamp((now - startTime) / duration, 0, 1);
    const eased = easeOutCubic(progress);

    state.rotation = startRotation + (targetRotation - startRotation) * eased;
    drawWheel();

    if (progress < 1) {
      requestAnimationFrame(frame);
      return;
    }

    state.rotation = targetRotation;
    state.spinning = false;
    state.winnerIndex = winnerIndex;

    completeSpin(winnerIndex);
  }

  requestAnimationFrame(frame);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function completeSpin(winnerIndex) {
  const winner = state.names[winnerIndex];

  state.history.unshift({
    name: winner,
    timestamp: new Date().toISOString()
  });

  state.history = state.history.slice(0, 50);

  renderWinner(winner);
  saveStorage();
  playWinSound();
  renderHistory();
  updateControls();

  if (state.settings.autoRemoveWinner) {
    state.names.splice(winnerIndex, 1);
    state.winnerIndex = null;
    saveStorage();
    renderAll();
    elements.wheelStatus.textContent = `${winner} terpilih dan dihapus dari daftar.`;
  } else {
    elements.wheelStatus.textContent = `${winner} terpilih.`;
    drawWheel();
  }
}

function renderWinner(winner) {
  elements.resultContent.replaceChildren();

  const wrapper = document.createElement("div");

  const label = document.createElement("span");
  label.className = "result-label";
  label.textContent = "NAMA TERPILIH";

  const name = document.createElement("strong");
  name.className = "result-winner";
  name.textContent = winner;

  wrapper.append(label, name);
  elements.resultContent.appendChild(wrapper);
  elements.resultActions.hidden = false;
}

function removeWinner() {
  if (
    state.spinning ||
    state.winnerIndex === null ||
    !state.names[state.winnerIndex]
  ) {
    return;
  }

  const winner = state.names[state.winnerIndex];
  state.names.splice(state.winnerIndex, 1);
  state.winnerIndex = null;

  saveStorage();
  renderAll();
  elements.resultActions.hidden = true;
  elements.resultContent.innerHTML =
    '<span class="result-placeholder">Pemenang telah dihapus.</span>';
  showToast(`${winner} dihapus dari daftar.`);
}

function clearHistory() {
  if (!state.history.length) return;

  const confirmed = window.confirm("Hapus seluruh riwayat putaran?");
  if (!confirmed) return;

  state.history = [];
  saveStorage();
  renderHistory();
  showToast("Riwayat dihapus.");
}

function resetApp() {
  const confirmed = window.confirm(
    "Reset semua nama, riwayat, dan pengaturan?"
  );

  if (!confirmed) return;

  state.names = [];
  state.history = [];
  state.settings = { ...DEFAULT_SETTINGS };
  state.rotation = 0;
  state.winnerIndex = null;

  saveStorage();

  elements.autoRemoveWinner.checked = false;
  elements.soundEnabled.checked = false;
  elements.resultActions.hidden = true;
  elements.resultContent.innerHTML =
    '<span class="result-placeholder">Pemenang akan muncul di sini.</span>';

  renderAll();
  showToast("Aplikasi berhasil direset.");
}

function updateSetting(key, value) {
  state.settings[key] = Boolean(value);
  saveStorage();
}

function playWinSound() {
  if (!state.settings.soundEnabled) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!state.audioContext) {
      state.audioContext = new AudioContextClass();
    }

    const audio = state.audioContext;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      990,
      audio.currentTime + 0.16
    );

    gain.gain.setValueAtTime(0.0001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.22);

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start();
    oscillator.stop(audio.currentTime + 0.23);
  } catch (error) {
    console.warn("Audio tidak tersedia:", error);
  }
}

function showToast(message) {
  window.clearTimeout(toastTimer);

  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");

  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2200);
}

function openDialog(dialog) {
  if (!dialog || state.spinning) return;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeDialog(dialog) {
  if (!dialog) return;

  if (typeof dialog.close === "function" && dialog.open) {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function openNames() {
  closeMenu();
  renderNameList(elements.modalNameList);
  openDialog(elements.namesModal);
}

function openHistory() {
  closeMenu();
  renderHistory();
  openDialog(elements.historyModal);
}

function openSettings() {
  closeMenu();
  elements.autoRemoveWinner.checked = state.settings.autoRemoveWinner;
  elements.soundEnabled.checked = state.settings.soundEnabled;
  openDialog(elements.settingsModal);
}

function openMenu() {
  elements.mobileMenu.classList.add("is-open");
  elements.mobileMenu.setAttribute("aria-hidden", "false");
  elements.menuToggle.setAttribute("aria-expanded", "true");
  elements.drawerBackdrop.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeMenu() {
  elements.mobileMenu.classList.remove("is-open");
  elements.mobileMenu.setAttribute("aria-hidden", "true");
  elements.menuToggle.setAttribute("aria-expanded", "false");
  elements.drawerBackdrop.hidden = true;
  document.body.style.overflow = "";
}

function handleAction(action) {
  switch (action) {
    case "openNames":
      openNames();
      break;
    case "openHistory":
      openHistory();
      break;
    case "openSettings":
      openSettings();
      break;
    case "clearNames":
      clearNames();
      break;
    case "closeMenu":
      closeMenu();
      break;
    default:
      break;
  }
}

elements.addNamesButton.addEventListener("click", () => {
  addNames(elements.nameInput.value);
});

elements.modalAddNamesButton.addEventListener("click", () => {
  if (addNames(elements.modalNameInput.value)) {
    renderNameList(elements.modalNameList);
  }
});

elements.spinButton.addEventListener("click", spin);
elements.spinAgainButton.addEventListener("click", spin);
elements.removeWinnerButton.addEventListener("click", removeWinner);
elements.clearHistoryButton.addEventListener("click", clearHistory);
elements.resetAppButton.addEventListener("click", resetApp);

elements.autoRemoveWinner.addEventListener("change", (event) => {
  updateSetting("autoRemoveWinner", event.target.checked);
});

elements.soundEnabled.addEventListener("change", (event) => {
  updateSetting("soundEnabled", event.target.checked);
});

document.addEventListener("click", (event) => {
  const actionElement = event.target.closest("[data-action]");

  if (actionElement) {
    handleAction(actionElement.dataset.action);
  }

  const closeElement = event.target.closest("[data-close-dialog]");

  if (closeElement) {
    const dialog = document.getElementById(closeElement.dataset.closeDialog);
    closeDialog(dialog);
  }
});

elements.menuToggle.addEventListener("click", () => {
  if (elements.mobileMenu.classList.contains("is-open")) {
    closeMenu();
  } else {
    openMenu();
  }
});

elements.drawerBackdrop.addEventListener("click", closeMenu);

document.querySelectorAll(".modal").forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeDialog(dialog);
    }
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }

  if (
    event.key === "Enter" &&
    event.ctrlKey &&
    document.activeElement === elements.nameInput
  ) {
    addNames(elements.nameInput.value);
  }
});

const resizeObserver = new ResizeObserver(() => {
  resizeCanvas();
});

resizeObserver.observe(elements.wheelStage);

window.addEventListener("orientationchange", () => {
  window.setTimeout(resizeCanvas, 120);
});

window.addEventListener("resize", resizeCanvas);

loadStorage();
renderAll();
requestAnimationFrame(resizeCanvas);
