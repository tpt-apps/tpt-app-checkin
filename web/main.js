import init, { scan_rgba } from "./vendor/tpt_app_checkin_wasm.js";
import * as db from "./lib/db.js";

const $ = (id) => document.getElementById(id);

const SAMPLE_TICKETS = Array.from({ length: 10 }, (_, i) => `TICKET-${String(i + 1).padStart(4, "0")}`);

const errorBox = $("error-box");
const scanFlash = $("scan-flash");
const scanStatus = $("scan-status");
const tbody = $("ticket-tbody");
const searchBox = $("search-box");

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.classList.toggle("show", Boolean(msg));
}

function parseIds(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.split(",")[0].trim())
    .filter((line) => line.length > 0);
}

let allTickets = [];

async function refreshTable() {
  allTickets = await db.getAllTickets();
  allTickets.sort((a, b) => a.id.localeCompare(b.id));
  renderStats();
  renderTable();
}

function renderStats() {
  const total = allTickets.length;
  const checked = allTickets.filter((t) => t.status === "used").length;
  $("stat-total").textContent = total;
  $("stat-checked").textContent = checked;
  $("stat-remaining").textContent = total - checked;
}

function renderTable() {
  const query = searchBox.value.trim().toLowerCase();
  tbody.innerHTML = "";
  const filtered = query ? allTickets.filter((t) => t.id.toLowerCase().includes(query)) : allTickets;

  for (const ticket of filtered) {
    const tr = document.createElement("tr");
    if (ticket.status === "used") tr.className = "used";

    const idTd = document.createElement("td");
    idTd.textContent = ticket.id;

    const statusTd = document.createElement("td");
    const pill = document.createElement("span");
    pill.className = `pill ${ticket.status === "used" ? "used" : "unused"}`;
    pill.textContent = ticket.status === "used" ? "Checked in" : "Not checked in";
    statusTd.appendChild(pill);

    const timeTd = document.createElement("td");
    timeTd.textContent = ticket.checkedAt ? new Date(ticket.checkedAt).toLocaleString() : "—";

    tr.append(idTd, statusTd, timeTd);
    tbody.appendChild(tr);
  }
}

async function loadTickets() {
  const fileInput = $("ticket-file");
  const pasteText = $("ticket-paste").value;

  let raw = pasteText;
  if (fileInput.files && fileInput.files[0]) {
    raw = await fileInput.files[0].text();
  }

  const ids = [...new Set(parseIds(raw))];
  if (ids.length === 0) {
    showError("No ticket IDs found — paste some or choose a CSV file first.");
    return;
  }

  await db.replaceAllTickets(ids);
  showError("");
  await refreshTable();
}

function flash(kind, text) {
  scanFlash.textContent = text;
  scanFlash.className = `scan-flash show ${kind}`;
  clearTimeout(flash._t);
  flash._t = setTimeout(() => scanFlash.classList.remove("show"), 2200);
}

const recentlySeen = new Map(); // ticket id -> timestamp, to avoid re-processing every frame
const SEEN_COOLDOWN_MS = 2500;

async function handleScan(text) {
  const now = Date.now();
  const last = recentlySeen.get(text);
  if (last && now - last < SEEN_COOLDOWN_MS) return;
  recentlySeen.set(text, now);

  const result = await db.checkIn(text);
  if (result === "checked-in") {
    flash("ok", `✓ Checked in: ${text}`);
  } else if (result === "already-used") {
    flash("dupe", `Already checked in: ${text}`);
  } else {
    flash("invalid", `Not a valid ticket: ${text}`);
  }
  await refreshTable();
}

function wireScanner() {
  const video = $("video");
  const overlay = $("overlay");
  const capture = $("capture");
  const scanBtn = $("scan-btn");
  const stopBtn = $("stop-btn");

  let stream = null;
  let rafHandle = null;

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
    } catch (err) {
      scanStatus.textContent = `Camera access failed: ${err}`;
      return;
    }

    video.srcObject = stream;
    await video.play();

    capture.width = video.videoWidth;
    capture.height = video.videoHeight;
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    scanStatus.textContent = "Scanning…";
    scanBtn.disabled = true;
    stopBtn.disabled = false;

    scheduleFrame();
  }

  function stop() {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    scanStatus.textContent = "Camera not started.";
    scanBtn.disabled = false;
    stopBtn.disabled = true;
  }

  function scheduleFrame() {
    rafHandle = requestAnimationFrame(processFrame);
  }

  function processFrame() {
    if (!stream) return;

    const ctx = capture.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, capture.width, capture.height);
    const { data, width, height } = ctx.getImageData(0, 0, capture.width, capture.height);

    let hits = [];
    try {
      hits = scan_rgba(new Uint8Array(data.buffer), width, height);
    } catch (err) {
      console.debug("scan_rgba error:", err);
    }

    for (const hit of hits) {
      handleScan(hit.text);
    }

    scheduleFrame();
  }

  scanBtn.addEventListener("click", start);
  stopBtn.addEventListener("click", stop);
}

function exportCsv() {
  const rows = [["ticket_id", "status", "checked_in_at"]];
  for (const t of allTickets) {
    rows.push([t.id, t.status, t.checkedAt ? new Date(t.checkedAt).toISOString() : ""]);
  }
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function main() {
  await init();
  wireScanner();

  $("load-tickets-btn").addEventListener("click", loadTickets);
  $("load-sample-btn").addEventListener("click", async () => {
    $("ticket-paste").value = SAMPLE_TICKETS.join("\n");
    await db.replaceAllTickets(SAMPLE_TICKETS);
    showError("");
    await refreshTable();
  });
  $("export-btn").addEventListener("click", exportCsv);
  $("reset-btn").addEventListener("click", async () => {
    if (!confirm("Reset all check-ins? This clears attendance but keeps the ticket list.")) return;
    await db.resetAllCheckIns();
    await refreshTable();
  });
  searchBox.addEventListener("input", renderTable);

  const aboutDialog = $("about-dialog");
  $("about-link").addEventListener("click", (e) => {
    e.preventDefault();
    aboutDialog.showModal();
  });
  $("about-close").addEventListener("click", () => aboutDialog.close());

  await refreshTable();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  let deferredInstallPrompt = null;
  const installLink = $("install-link");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installLink.hidden = false;
  });
  installLink.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installLink.hidden = true;
  });
}

main();
