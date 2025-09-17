"use strict";

/* -----------------------------
   Memory Game — script.js (responsive)
   - Plateau sans scroll : s’adapte à l’écran
   - Mesure la hauteur de la topbar -> --topbar-h
   - Définit --cols et --rows pour le CSS
------------------------------*/

// ===== Config =====
const EMOJIS = ["🐱","🐶","🦊","🐼","🐸","🐵","🐨","🦁","🐯","🐮","🐷","🐔","🐧","🦄","🐙","🐳","🐝","🦋","🌸","🍀","🍉","🍪","🍕","⚽️","🎮","🎲","🎧","🚗","✈️","🚀"];
const SIZES = [4, 5, 6]; // 4x4, 5x5 (1 case vide), 6x6

// ===== DOM =====
const $board      = document.getElementById("board");
const $time       = document.getElementById("time");
const $moves      = document.getElementById("moves");
const $best       = document.getElementById("best");
const $restart    = document.getElementById("restart");
const $sizeBtn    = document.getElementById("size");

const $overlay    = document.getElementById("overlay");
const $again      = document.getElementById("again");
const $close      = document.getElementById("close");
const $finalTime  = document.getElementById("final-time");
const $finalMoves = document.getElementById("final-moves");
const $recordLine = document.getElementById("record-line");
const $topbar     = document.querySelector(".topbar");

// ===== State =====
let gridSize = parseInt(localStorage.getItem("mem-size") || "4", 10);
if (!SIZES.includes(gridSize)) gridSize = 4;

let deck = [];
let first = null, second = null, lock = false;
let matches = 0, totalPairs = 0;
let moves = 0, t0 = 0, tick = null;

// ===== Utils =====
const pad = (n) => String(n).padStart(2, "0");
const fmt = (ms) => `${pad(Math.floor(ms / 60000))}:${pad(Math.floor(ms / 1000) % 60)}`;

function updateHUD() {
  $moves.textContent = String(moves);
  const label = `${gridSize}×${gridSize}`;
  $sizeBtn.textContent = `Taille : ${label}`;
  $sizeBtn.setAttribute("aria-pressed", "false");
  const bestKey = `mem-best-${gridSize}`;
  const best = JSON.parse(localStorage.getItem(bestKey) || "null");
  $best.textContent = best ? `${best.time} / ${best.moves}c` : "—";
}

// Mesure dynamique de la topbar -> CSS var --topbar-h (pour le calcul responsive)
function updateTopbarHeightVar() {
  const h = $topbar ? Math.ceil($topbar.getBoundingClientRect().height) : 64;
  document.documentElement.style.setProperty("--topbar-h", `${h}px`);
}

// Timer
function startTimer() {
  stopTimer();
  t0 = performance.now();
  tick = setInterval(() => { $time.textContent = fmt(performance.now() - t0); }, 250);
}
function stopTimer() {
  if (tick) clearInterval(tick);
  tick = null;
}

// Shuffle
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== Setup =====
function buildDeck(size) {
  const cells = size * size;
  const pairs = Math.floor(cells / 2);
  totalPairs = pairs;

  const pool = EMOJIS.slice();
  shuffle(pool);
  const chosen = pool.slice(0, pairs);
  deck = shuffle([...chosen, ...chosen]);

  // Grille impaire -> 1 case vide
  if (cells % 2 === 1) {
    deck.pop();
    deck.push(null);
  }
}

function renderBoard(size) {
  $board.innerHTML = "";

  // variables CSS pour la grille responsive (utilisées côté CSS)
  $board.style.setProperty("--cols", String(size));
  $board.style.setProperty("--rows", String(size));

  $board.setAttribute("role", "grid");
  $board.setAttribute("aria-label", `Plateau ${size} par ${size}`);

  deck.forEach((sym, idx) => {
    const cell = document.createElement("button");
    cell.className = "card";
    cell.type = "button";
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", "Carte fermée");
    cell.dataset.index = String(idx);

    const inner = document.createElement("div");
    inner.className = "card-inner";

    const front = document.createElement("div");
    front.className = "face front";
    front.textContent = "🎴";

    const back = document.createElement("div");
    back.className = "face back";
    back.textContent = sym ?? "";

    inner.append(front, back);
    cell.appendChild(inner);

    if (sym === null) {
      cell.disabled = true;
      cell.style.visibility = "hidden";
    } else {
      cell.addEventListener("click", () => flip(cell));
      cell.addEventListener("keydown", (e) => {
        const k = e.key, c = size, i = parseInt(cell.dataset.index, 10);
        if (k === "Enter" || k === " ") { e.preventDefault(); flip(cell); }
        if (k === "ArrowRight") focusIndex((i + 1) % deck.length);
        if (k === "ArrowLeft")  focusIndex((i - 1 + deck.length) % deck.length);
        if (k === "ArrowDown")  focusIndex((i + c) % deck.length);
        if (k === "ArrowUp")    focusIndex((i - c + deck.length) % deck.length);
      });
    }
    $board.appendChild(cell);
  });

  focusIndex(0);
}

function focusIndex(i) {
  let tries = 0, idx = i;
  while (tries < deck.length) {
    const btn = $board.querySelector(`.card[data-index="${idx}"]`);
    if (btn && !btn.disabled && btn.style.visibility !== "hidden") { btn.focus(); break; }
    idx = (idx + 1) % deck.length; tries++;
  }
}

// ===== Gameplay =====
function flip(cell) {
  if (lock || cell.classList.contains("flipped") || cell.disabled) return;
  cell.classList.add("flipped");
  cell.setAttribute("aria-label", "Carte ouverte");

  if (!first) { first = cell; if (!tick) startTimer(); return; }
  if (cell === first) return;

  second = cell;
  moves++; $moves.textContent = String(moves);

  const a = symbolOf(first), b = symbolOf(second);
  if (a === b) {
    first.classList.add("matched"); second.classList.add("matched");
    first.disabled = true; second.disabled = true;
    first = second = null;
    matches++; if (matches === totalPairs) win();
  } else {
    lock = true;
    setTimeout(() => {
      first.classList.remove("flipped"); first.setAttribute("aria-label", "Carte fermée");
      second.classList.remove("flipped"); second.setAttribute("aria-label", "Carte fermée");
      first = second = null; lock = false;
    }, 700);
  }
}
function symbolOf(cell) { return deck[parseInt(cell.dataset.index, 10)]; }

function win() {
  stopTimer();
  const elapsed = performance.now() - t0;
  const timeText = fmt(elapsed);
  $finalTime.textContent = timeText;
  $finalMoves.textContent = String(moves);

  const key = `mem-best-${gridSize}`;
  const best = JSON.parse(localStorage.getItem(key) || "null");
  let isRecord = false;
  if (!best || elapsed < best.ms || (elapsed === best.ms && moves < best.moves)) {
    isRecord = true;
    localStorage.setItem(key, JSON.stringify({ ms: elapsed, time: timeText, moves }));
  }
  if ($recordLine) $recordLine.hidden = !isRecord;

  if ($overlay) $overlay.hidden = false;
  if ($again) $again.focus();
}

// ===== Controls & init =====
function reset(size = gridSize) {
  stopTimer();
  gridSize = size;
  localStorage.setItem("mem-size", String(gridSize));
  $time.textContent = "00:00";
  moves = 0; matches = 0; first = second = null; lock = false;
  updateHUD();
  buildDeck(gridSize);
  renderBoard(gridSize);
  if ($overlay) $overlay.hidden = true;
}

document.addEventListener("DOMContentLoaded", () => {
  updateTopbarHeightVar(); // important pour le calcul responsive
  reset(gridSize);
});
window.addEventListener("resize", updateTopbarHeightVar, { passive: true });
window.addEventListener("load", updateTopbarHeightVar);

$restart.addEventListener("click", () => reset(gridSize));
$sizeBtn.addEventListener("click", () => {
  const i = SIZES.indexOf(gridSize);
  const next = SIZES[(i + 1) % SIZES.length];
  $sizeBtn.setAttribute("aria-pressed", "true");
  reset(next);
});
$again.addEventListener("click", () => { if ($overlay) $overlay.hidden = true; reset(gridSize); });
$close.addEventListener("click", () => { if ($overlay) $overlay.hidden = true; });
$overlay.addEventListener("click", (e) => { if (e.target === $overlay) $overlay.hidden = true; });
