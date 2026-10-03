/* =========================================================
   PUTARAN KEBERUNTUNGAN
   Vanilla JavaScript — no framework
   ========================================================= */

"use strict";

const STORAGE_KEYS = {
  names: "pk_names_v1",
  history: "pk_history_v1",
  settings: "pk_settings_v1",
  demoInitialized: "pk_demo_initialized_v1"
};

const DEFAULT_SETTINGS = {
  autoRemoveWinner: false,
  soundEnabled: false
};

const INTRO_SAMPLE_NAMES = [
  "Andi",
  "Ujang",
  "Saskia",
  "Dedi",
  "Fitri"
];

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
  demoNames: false,
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
    const namesRaw = localStorage.getItem(STORAGE_KEYS.names);

    const history = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.history) || "[]"
    );

    const settings = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.settings) || "{}"
    );

    const demoInitialized =
      localStorage.getItem(STORAGE_KEYS.demoInitialized) === "true";

    const names = namesRaw ? JSON.parse(namesRaw) : [];

    if (!demoInitialized && !names.length && !history.length) {
      state.names = [...INTRO_SAMPLE_NAMES];
      state.demoNames = true;
    } else {
      state.names = Array.isArray(names) ? sanitizeNames(names) : [];
      state.demoNames = false;
    }

    state.history = Array.isArray(history) ? history : [];

    state.settings = {
      ...DEFAULT_SETTINGS,
      ...(settings && typeof settings === "object" ? settings : {})
    };
  } catch (error) {
    console.warn("Data lokal tidak dapat dibaca:", error);

    state.names = [...INTRO_SAMPLE_NAMES];
    state.history = [];
    state.settings = { ...DEFAULT_SETTINGS };
    state.demoNames = true;
  }

  elements.autoRemoveWinner.checked =
    Boolean(state.settings.autoRemoveWinner);

  elements.soundEnabled.checked =
    Boolean(state.settings.soundEnabled);
}

function saveStorage() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.names,
      JSON.stringify(state.names)
    );

    localStorage.setItem(
      STORAGE_KEYS.history,
      JSON.stringify(state.history)
    );

    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify(state.settings)
    );

    localStorage.setItem(
      STORAGE_KEYS.demoInitialized,
      "true"
    );
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
  return sanitizeNames(
    String(rawText || "").split(/\r?\n/)
  );
}

function addNames(rawText) {
  const incoming = parseNames(rawText);

  if (!incoming.length) {
    showToast("Masukkan minimal satu nama.");
    return false;
  }

  if (state.demoNames) {
    state.names = [];
    state.demoNames = false;
  }

  state.names.push(...incoming);

  saveStorage();
  renderAll();

  showToast(`${incoming.length} nama ditambahkan.`);

  return true;
}

function removeName(index) {
  if (
    state.spinning ||
    index < 0 ||
    index >= state.names.length
  ) {
    return;
  }

  const removed = state.names.splice(index, 1)[0];

  if (state.winnerIndex !== null) {
    state.winnerIndex = null;
  }

  saveStorage();
  renderAll();

  showToast(`${removed} dihapus.`);
}

function clearNames() {
  if (state.spinning || !state.names.length) {
    return;
  }

  const confirmed = window.confirm("Hapus semua nama?");

  if (!confirmed) {
    return;
  }

  state.names = [];
  state.winnerIndex = null;
  state.demoNames = false;

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

    remove.addEventListener("click", () => {
      removeName(index);
    });

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

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateControls() {
  const disabled = state.spinning;

  elements.spinButton.disabled =
    disabled || state.names.length < 2;

  elements.spinAgainButton.disabled =
    disabled || state.names.length < 2;

  elements.removeWinnerButton.disabled =
    disabled || state.winnerIndex === null;

  if (state.names.length === 0) {
    elements.wheelStatus.textContent =
      "Tambahkan nama, lalu putar rodanya.";
 