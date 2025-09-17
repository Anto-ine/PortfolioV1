"use strict";

// =========================
// Pokédex — logique appli
// (sans effets AOS / parallax)
// =========================

// --- Constantes & DOM ---
const API_BASE = "https://pokeapi.co/api/v2/pokemon/";
const $form = document.getElementById("searchForm");
const $search = document.getElementById("search");
const $status = document.getElementById("status");
const $card = document.getElementById("card");

const $img = document.getElementById("poke-img");
const $name = document.getElementById("poke-name");
const $id = document.getElementById("poke-id");
const $types = document.getElementById("types");
const $stats = document.getElementById("stats");
const $height = document.getElementById("poke-height");
const $weight = document.getElementById("poke-weight");
const $xp = document.getElementById("poke-xp");

const $prev = document.getElementById("prev");
const $next = document.getElementById("next");

const $favBtn = document.getElementById("favBtn");
const $favPanelBtn = document.getElementById("favPanelBtn");
const $favPanel = document.getElementById("favPanel");
const $favClose = document.getElementById("favClose");
const $favClear = document.getElementById("favClear");
const $favList = document.getElementById("favList");

// Couleurs par type (pour CSS custom prop --type)
const TYPE_COLORS = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

let currentId = 1;
const CACHE = new Map(JSON.parse(localStorage.getItem("pokedex-cache") || "[]"));
const FAVS = new Set(JSON.parse(localStorage.getItem("pokedex-favs") || "[]"));

// --- Utils ---
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const setVar = (el, name, val) => el.style.setProperty(name, val);
const setBusy = (b) => {
  $card.setAttribute("aria-busy", String(!!b));
  $card.classList.toggle("loading", !!b);
};

// Anti-course (si on tape vite, on ignore les réponses obsolètes)
let lastRequestId = 0;

// --- Fetch + transform ---
async function fetchPokemon(query) {
  const q = String(query).trim().toLowerCase();
  if (!q) throw new Error("Saisie vide");

  if (CACHE.has(q)) return CACHE.get(q);

  const res = await fetch(`${API_BASE}${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Pokémon introuvable");
  const d = await res.json();

  const p = {
    id: d.id,
    name: cap(d.name || ""),
    image:
      d.sprites?.other?.["official-artwork"]?.front_default ||
      d.sprites?.front_default ||
      "",
    types: (d.types || []).map((t) => t.type?.name).filter(Boolean),
    stats: Object.fromEntries((d.stats || []).map((s) => [s.stat?.name, s.base_stat])),
    height: d.height ? (d.height / 10).toFixed(1) + " m" : "—",
    weight: d.weight ? (d.weight / 10).toFixed(1) + " kg" : "—",
    base_experience: d.base_experience ?? "—",
  };

  // cache multi-clefs (id + nom)
  CACHE.set(String(p.id), p);
  if (p.name) CACHE.set(p.name.toLowerCase(), p);
  localStorage.setItem("pokedex-cache", JSON.stringify([...CACHE]));
  return p;
}

// --- Render ---
function renderTypes(types) {
  $types.innerHTML = "";
  types.forEach((t) => {
    const chip = document.createElement("span");
    chip.className = "type-chip";
    chip.textContent = cap(t);
    $types.appendChild(chip);
  });
}

function renderStats(stats) {
  $stats.innerHTML = "";
  const labels = {
    hp: "PV",
    attack: "Attaque",
    defense: "Défense",
    "special-attack": "Sp. Att",
    "special-defense": "Sp. Def",
    speed: "Vitesse",
  };
  Object.entries(labels).forEach(([key, label]) => {
    const value = Number(stats[key] ?? 0);
    const row = document.createElement("div");
    row.className = "stat";
    row.innerHTML = `
      <div class="label">${label}</div>
      <div class="bar" aria-label="${label} ${value}">
        <span style="width:${Math.min(100, (value / 180) * 100)}%"></span>
      </div>`;
    $stats.appendChild(row);
  });
}

function applyTypeColor(types) {
  const main = types?.[0] || "normal";
  const color = TYPE_COLORS[main] || "#6b7280";
  setVar($card, "--type", color);
}

function renderPokemon(p) {
  applyTypeColor(p.types);

  $img.src = p.image || "img/placeholder.png";
  $img.alt = p.image ? `Illustration de ${p.name}` : "Illustration indisponible";
  $img.onerror = () => { $img.src = "img/placeholder.png"; };

  $name.textContent = p.name;
  $id.textContent = `#${p.id}`;
  $height.textContent = p.height;
  $weight.textContent = p.weight;
  $xp.textContent = p.base_experience;

  renderTypes(p.types);
  renderStats(p.stats);

  document.title = `Pokédex — ${p.name} (#${p.id})`;
  try { history.replaceState(null, "", `?id=${p.id}`); } catch {}
  currentId = p.id;

  // état bouton favori
  $favBtn.setAttribute("aria-pressed", String(FAVS.has(String(p.id))));
  localStorage.setItem("lastId", String(p.id));
}

// --- Load orchestrator ---
async function loadPokemon(query) {
  const reqId = ++lastRequestId;
  try {
    setBusy(true);
    $status.textContent = "Chargement…";
    const p = await fetchPokemon(query);
    if (reqId !== lastRequestId) return; // réponse obsolète
    renderPokemon(p);
    $status.textContent = "";
    // prefetch voisins
    prefetch(p.id + 1);
    if (p.id > 1) prefetch(p.id - 1);
  } catch (e) {
    console.error(e);
    if (reqId !== lastRequestId) return;
    $status.textContent = e?.message || "Erreur inconnue";
  } finally {
    if (reqId === lastRequestId) setBusy(false);
  }
}

function prefetch(id) {
  const key = String(id);
  if (!CACHE.has(key)) fetchPokemon(key).catch(() => {});
}

// --- Favoris ---
function refreshFavList() {
  $favList.innerHTML = "";
  if (FAVS.size === 0) {
    $favList.innerHTML = `<p class="muted">Aucun favori pour le moment.</p>`;
    return;
  }
  [...FAVS].forEach((id) => {
    const item = document.createElement("div");
    item.className = "fav-item";
    item.innerHTML = `
      <a href="?id=${id}">#${id}</a>
      <div class="row gap">
        <button class="btn ghost" data-id="${id}">Ouvrir</button>
        <button class="icon-btn" data-remove="${id}" title="Retirer">✕</button>
      </div>`;
    $favList.appendChild(item);
  });
}

function toggleFav() {
  const key = String(currentId);
  if (FAVS.has(key)) FAVS.delete(key); else FAVS.add(key);
  localStorage.setItem("pokedex-favs", JSON.stringify([...FAVS]));
  $favBtn.setAttribute("aria-pressed", String(FAVS.has(key)));
  refreshFavList();
}

// --- Events ---
document.addEventListener("DOMContentLoaded", () => {
  const url = new URL(location.href);
  const p = url.searchParams.get("id") || localStorage.getItem("lastId") || "1";
  loadPokemon(p);
  refreshFavList();
});

$form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = $search.value.trim();
  if (!q) { $status.textContent = "Tape un nom ou un ID 😉"; return; }
  loadPokemon(q);
});

// Debounce sur l'input
let timer;
$search.addEventListener("input", (e) => {
  const q = e.target.value.trim();
  if (!q) return;
  clearTimeout(timer);
  timer = setTimeout(() => loadPokemon(q), 420);
});

// Nav boutons
$prev.addEventListener("click", () => { if (currentId > 1) loadPokemon(currentId - 1); });
$next.addEventListener("click", () => loadPokemon(currentId + 1));

// Nav clavier
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" && currentId > 1) loadPokemon(currentId - 1);
  if (e.key === "ArrowRight") loadPokemon(currentId + 1);
  if (e.key === "Enter" && document.activeElement === $search) $form.requestSubmit();
});

// Favoris
$favBtn.addEventListener("click", toggleFav);
$favPanelBtn.addEventListener("click", () => {
  const open = $favPanel.getAttribute("aria-hidden") === "false";
  $favPanel.setAttribute("aria-hidden", open ? "true" : "false");
  $favPanelBtn.setAttribute("aria-expanded", open ? "false" : "true");
});
$favClose.addEventListener("click", () => {
  $favPanel.setAttribute("aria-hidden", "true");
  $favPanelBtn.setAttribute("aria-expanded", "false");
});
$favClear.addEventListener("click", () => {
  FAVS.clear();
  localStorage.setItem("pokedex-favs", "[]");
  refreshFavList();
});
$favList.addEventListener("click", (e) => {
  const idOpen = e.target.getAttribute("data-id");
  const idRemove = e.target.getAttribute("data-remove");
  if (idOpen) loadPokemon(idOpen);
  if (idRemove) {
    FAVS.delete(idRemove);
    localStorage.setItem("pokedex-favs", JSON.stringify([...FAVS]));
    refreshFavList();
  }
});

// === Theme Toggle ===
const THEMES = ["theme-sunset", "theme-forest", "theme-cream", "theme-grid", "theme-pokeballs"];
const savedTheme = localStorage.getItem("theme") || THEMES[0];
document.body.classList.add(savedTheme);

document.getElementById("themeToggle")?.addEventListener("click", () => {
  const cur = THEMES.find((t) => document.body.classList.contains(t)) || THEMES[0];
  const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
  THEMES.forEach((t) => document.body.classList.remove(t));
  document.body.classList.add(next);
  localStorage.setItem("theme", next);
});
