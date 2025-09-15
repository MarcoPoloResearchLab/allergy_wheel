// app.js — robust boot: load JSON immediately, wait for DOM to wire UI.

import { Wheel } from "./wheel.js";
import { playTick, playSiren, primeAudioOnFirstGesture } from "./audio.js";
import {
  qs, show, hide, bindFullScreen,
  renderAllergyChecklist, updateBadges,
  openModal, closeModal
} from "./ui.js";

/* ---------- Data locations (absolute paths) ---------- */
const DATA = {
  allergens: "/data/allergens.json",
  dishes: "/data/dishes.json",
  normalization: "/data/normalization.json",
};

/* ---------- App state ---------- */
const state = {
  allergens: [],
  dishes: [],
  rules: [],           // [{ token, re: RegExp }]
  selected: new Set(),
  wheel: null,
  spinning: false,
};

/* ---------- Load data immediately (does NOT touch DOM) ---------- */
const dataReady = Promise.all([
  fetchJSON(DATA.allergens),
  fetchJSON(DATA.dishes),
  fetchJSON(DATA.normalization),
])
  .then(([allergens, dishes, normalization]) => {
    state.allergens = allergens;
    state.dishes = dishes;
    state.rules = normalization.map(r => ({ token: r.token, re: new RegExp(r.pattern, r.flags || "i") }));
  })
  .catch(err => {
    // Defer UI error rendering until DOM exists
    state._bootError = err;
  });

/* ---------- Wait for DOM without blocking data ---------- */
const domReady = document.readyState === "loading"
  ? new Promise(resolve => document.addEventListener("DOMContentLoaded", resolve, { once: true }))
  : Promise.resolve();

/* ---------- When both ready, wire UI ---------- */
Promise.all([dataReady, domReady]).then(() => {
  // Grab elements now that DOM exists
  const el = {
    fs: qs("#fs"),
    allergyList: qs("#allergy-list"),
    start: qs("#start"),
    loading: qs("#loading"),
    loadError: qs("#load-error"),
    screenAllergy: qs("#screen-allergy"),
    screenWheel: qs("#screen-wheel"),
    wheelCanvas: qs("#wheel"),
    stop: qs("#stop"),
    badges: qs("#sel-badges"),
    modal: qs("#reveal"),
    title: qs("#dish-title"),
    cuisine: qs("#dish-cuisine"),
    ingredients: qs("#dish-ingredients"),
    banner: qs("#result"),
    face: qs("#face"),
    resultText: qs("#result-text"),
    again: qs("#again"),
  };

  // If data failed, show a visible error
  if (state._bootError) {
    if (el.loading) el.loading.hidden = true;
    if (el.loadError) {
      el.loadError.hidden = false;
      el.loadError.textContent = `Could not load data. ${state._bootError.message || String(state._bootError)}`;
    }
    return;
  }

  // Now safe to bind UI (elements exist)
  if (el.fs) bindFullScreen(el.fs);
  primeAudioOnFirstGesture();

  const getSelected = renderAllergyChecklist(el.allergyList, state.allergens);
  if (el.loading) el.loading.textContent = "Select allergens, then Start.";
  if (el.start) {
    el.start.disabled = false;
    el.start.addEventListener("click", () => {
      state.selected = getSelected();
      startWheel(el);
    }, { once: true });
  }

  // Buttons & keyboard
  if (el.stop) el.stop.addEventListener("click", () => state.wheel && state.wheel.requestStop());
  if (el.again) el.again.addEventListener("click", () => {
    closeModal(el.modal);
    if (state.wheel) { state.spinning = true; state.wheel.start(); }
  });
  document.addEventListener("keydown", evt => {
    if (evt.code === "Space" || evt.code === "Enter") {
      const onAllergyScreen = !el.screenWheel || el.screenWheel.hasAttribute("hidden");
      if (onAllergyScreen && el.start) el.start.click();
      else if (el.stop) el.stop.click();
      evt.preventDefault();
    }
  });

  // Helper closures with element bag
  function startWheel(elRef) {
    hide(elRef.screenAllergy);
    show(elRef.screenWheel);

    updateBadges(elRef.badges, state.selected, state.allergens);

    state.wheel = new Wheel(elRef.wheelCanvas, state.dishes.map(d => d.name));
    state.wheel.onStop(idx => revealDish(elRef, state.dishes[idx]));
    new ResizeObserver(() => state.wheel.resizeToCss()).observe(elRef.wheelCanvas);

    state.spinning = true;
    state.wheel.start();

    const tickId = setInterval(() => { if (state.spinning) playTick(); }, 140);
    const stopTicks = () => clearInterval(tickId);
    elRef.again.addEventListener("click", stopTicks, { once: true });
    elRef.stop.addEventListener("click", stopTicks, { once: true });
  }

  function revealDish(elRef, dish) {
    state.spinning = false;

    const hits = [...allergensForDish(dish)].filter(t => state.selected.has(t));

    elRef.title.textContent = dish.name;
    elRef.cuisine.textContent = dish.cuisine;
    elRef.ingredients.innerHTML = "";

    dish.ingredients.forEach(ingredient => {
      const span = document.createElement("span");
      span.className = "ingredient";
      span.textContent = ingredient;
      if (state.rules.some(r => r.re.test(ingredient) && hits.includes(r.token))) span.classList.add("bad");
      elRef.ingredients.appendChild(span);
    });

    if (hits.length) {
      elRef.banner.className = "banner bad";
      elRef.resultText.textContent = "Allergen found! Call the food ambulance!";
      elRef.face.hidden = false;
      playSiren();
    } else {
      elRef.banner.className = "banner ok";
      elRef.resultText.textContent = "Safe to eat. Yummy!";
      elRef.face.hidden = true;
    }
    openModal(elRef.modal);
  }
});

/* ---------- Helpers (no DOM access) ---------- */
function fetchJSON(path) {
  return fetch(path, { cache: "no-store" }).then(res => {
    if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${res.statusText}`);
    return res.json();
  });
}

function allergensForDish(dish) {
  const out = new Set();
  dish.ingredients.forEach(ing => {
    state.rules.forEach(rule => { if (rule.re.test(ing)) out.add(rule.token); });
  });
  return out;
}
