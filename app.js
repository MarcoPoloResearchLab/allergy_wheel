/* global document, window */
import { renderAllergenList } from "./ui.js";
import {
    initWheel,
    setWheelLabels,
    drawWheel,
    spinToIndex,
    ensureWheelSize,
    registerSpinCallbacks,
    forceStopSpin,
    setSpinDurationMs,
    triggerPointerTap
} from "./wheel.js";
import { primeAudioOnFirstGesture, playTick, playSiren, playNomNom } from "./audio.js";

/* ---------- data loading ---------- */
async function loadJson(path) {
    const httpResponse = await fetch(path, { cache: "no-store" });
    if (!httpResponse.ok) throw new Error(`failed to load ${path}`);
    return httpResponse.json();
}

/* ---------- normalization engine ---------- */
class NormalizationEngine {
    constructor(ruleDescriptors) {
        this.compiledRules = [];
        if (Array.isArray(ruleDescriptors)) {
            for (const descriptor of ruleDescriptors) {
                const patternSource = String(descriptor.pattern || "");
                const patternFlags = String(descriptor.flags || "");
                const targetToken = String(descriptor.token || "");
                if (!patternSource || !targetToken) continue;
                this.compiledRules.push({
                    regex: new RegExp(patternSource, patternFlags),
                    token: targetToken
                });
            }
        }
    }

    tokensForIngredient(ingredientText) {
        const foundTokens = new Set();
        const candidate = String(ingredientText || "");
        for (const compiledRule of this.compiledRules) {
            if (compiledRule.regex.test(candidate)) foundTokens.add(compiledRule.token);
        }
        return foundTokens;
    }

    tokensForDishIngredients(ingredientArray) {
        const union = new Set();
        for (const singleIngredient of ingredientArray || []) {
            const mapped = this.tokensForIngredient(singleIngredient);
            for (const token of mapped) union.add(token);
        }
        return union;
    }
}

/* ---------- app state ---------- */
const applicationState = {
    selectedAllergenToken: null,
    selectedAllergenLabel: "",
    allergensCatalog: [],
    dishesCatalog: [],
    normalizationEngine: null,

    dishIndexByAllergen: new Map(),

    currentCandidateDishes: [],
    currentCandidateLabels: [],

    stopButtonMode: "stop"
};

const localStorageKeySelectedToken = "allergyWheel.selectedAllergenToken";
const localStorageKeySelectedLabel = "allergyWheel.selectedAllergenLabel";

/* ---------- persistence ---------- */
function persistSelectedAllergen() {
    try {
        if (!applicationState.selectedAllergenToken) return;
        window.localStorage.setItem(localStorageKeySelectedToken, applicationState.selectedAllergenToken);
        window.localStorage.setItem(localStorageKeySelectedLabel, applicationState.selectedAllergenLabel || "");
    } catch {}
}

function restorePersistedAllergen() {
    try {
        const token = window.localStorage.getItem(localStorageKeySelectedToken);
        const label = window.localStorage.getItem(localStorageKeySelectedLabel);
        if (token) {
            applicationState.selectedAllergenToken = token;
            applicationState.selectedAllergenLabel = label || token;
            return true;
        }
    } catch {}
    return false;
}

/* ---------- indexing & validation ---------- */
function buildDishIndexByAllergen() {
    const index = new Map();
    for (const dish of applicationState.dishesCatalog) {
        const ingredientList = Array.isArray(dish.ingredients) ? dish.ingredients : [];
        const tokens = applicationState.normalizationEngine.tokensForDishIngredients(ingredientList);
        for (const token of tokens) {
            if (!index.has(token)) index.set(token, []);
            index.get(token).push(dish);
        }
    }
    applicationState.dishIndexByAllergen = index;
}

function validateAllergenCoverageOrThrow() {
    const missing = [];
    for (const allergen of applicationState.allergensCatalog) {
        const token = allergen.token;
        const dishesForToken = applicationState.dishIndexByAllergen.get(token) || [];
        if (dishesForToken.length === 0) missing.push(token);
    }
    if (missing.length > 0) {
        throw new Error(
            `Data invariant violated: no dishes found for allergen token(s): ${missing.join(", ")}.`
        );
    }
}

/* ---------- selectors ---------- */
function dishesMatchingSelectedAllergen() {
    const token = applicationState.selectedAllergenToken;
    if (!token) return [];
    return applicationState.dishIndexByAllergen.get(token) || [];
}

function dishDisplayLabel(dish) {
    if (!dish || typeof dish !== "object") return "";
    return dish.name || dish.title || dish.label || dish.id || "";
}

/* ---------- UI helpers ---------- */
function refreshSelectedAllergenBadges() {
    const badgesContainer = document.getElementById("sel-badges");
    if (!badgesContainer) return;
    badgesContainer.textContent = "";
    if (applicationState.selectedAllergenLabel) {
        const badgeElement = document.createElement("span");
        badgeElement.className = "badge";
        badgeElement.textContent = applicationState.selectedAllergenLabel;
        badgesContainer.appendChild(badgeElement);
    }
}

function setWheelControlToStop() {
    const stopButton = document.getElementById("stop");
    if (!stopButton) return;
    stopButton.textContent = "STOP";
    stopButton.classList.add("danger");
    stopButton.classList.remove("primary");
    applicationState.stopButtonMode = "stop";
}

function setWheelControlToStartGame() {
    const stopButton = document.getElementById("stop");
    if (!stopButton) return;
    stopButton.textContent = "Start Game";
    stopButton.classList.remove("danger");
    stopButton.classList.add("primary");
    applicationState.stopButtonMode = "start";
}

/* ---------- enforce exactly 8 segments ---------- */
const WHEEL_SEGMENTS = 8;

function pickRandomUnique(sourceArray, howMany) {
    const copy = Array.from(sourceArray);
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, howMany);
}

function recomputeWheelFromSelection() {
    const matching = dishesMatchingSelectedAllergen();
    let chosen = [];

    if (matching.length >= WHEEL_SEGMENTS) {
        chosen = pickRandomUnique(matching, WHEEL_SEGMENTS);
    } else {
        chosen = [...matching];
        const seen = new Set(chosen.map(d => d.id || dishDisplayLabel(d)));
        const fillerPool = applicationState.dishesCatalog.filter(d => {
            const key = d.id || dishDisplayLabel(d);
            return !seen.has(key);
        });
        const need = WHEEL_SEGMENTS - chosen.length;
        chosen.push(...pickRandomUnique(fillerPool, need));
        while (chosen.length < WHEEL_SEGMENTS && chosen.length > 0) {
            chosen.push(chosen[chosen.length % chosen.length]);
        }
    }

    applicationState.currentCandidateDishes = chosen;
    applicationState.currentCandidateLabels = chosen.map(dishDisplayLabel).filter(Boolean).slice(0, WHEEL_SEGMENTS);

    setWheelLabels(applicationState.currentCandidateLabels.length ? applicationState.currentCandidateLabels : ["No matches"]);
    drawWheel();
}

/* ---------- EXCLUSIVE SCREEN CONTROLLER ---------- */
function showScreen(targetId) {
    const bodyEl = document.body;
    const reveal = document.getElementById("reveal");

    if (targetId === "screen-allergy") {
        bodyEl.setAttribute("data-screen", "allergy");
        if (reveal) reveal.setAttribute("aria-hidden", "true");
    } else if (targetId === "screen-wheel") {
        bodyEl.setAttribute("data-screen", "wheel");
        if (reveal) reveal.setAttribute("aria-hidden", "true");
        ensureWheelSize();
    } else if (targetId === "reveal" && bodyEl.dataset.screen === "wheel") {
        if (reveal) reveal.setAttribute("aria-hidden", "false");
    }
}

/* ---------- reveal ---------- */
function populateRevealWithDish(chosenDish) {
    const revealSection = document.getElementById("reveal");
    const dishTitleElement = document.getElementById("dish-title");
    const dishCuisineElement = document.getElementById("dish-cuisine");
    const resultBannerElement = document.getElementById("result");
    const resultTextElement = document.getElementById("result-text");
    const ingredientsContainer = document.getElementById("dish-ingredients");
    const faceSvg = document.getElementById("face");

    dishTitleElement.textContent = dishDisplayLabel(chosenDish);
    dishCuisineElement.textContent = chosenDish.cuisine || "";
    ingredientsContainer.textContent = "";

    const triggeringToken = applicationState.selectedAllergenToken;
    let hasTriggeringIngredient = false;

    for (const ingredientName of chosenDish.ingredients || []) {
        const span = document.createElement("span");
        span.className = "ingredient";
        const tokensForIngredient = applicationState.normalizationEngine.tokensForIngredient(ingredientName);
        if (tokensForIngredient.has(triggeringToken)) {
            hasTriggeringIngredient = true;
            span.classList.add("bad");
        }
        span.textContent = ingredientName;
        ingredientsContainer.appendChild(span);
    }

    if (hasTriggeringIngredient) {
        resultBannerElement.classList.replace("ok", "bad");
        resultTextElement.textContent = `Contains your allergen: ${applicationState.selectedAllergenLabel}`;
        if (faceSvg) faceSvg.hidden = false;
        playSiren(1800);
    } else {
        resultBannerElement.classList.replace("bad", "ok");
        resultTextElement.textContent = "Safe to eat. Yummy!";
        if (faceSvg) faceSvg.hidden = true;
        playNomNom(1200);
    }

    setWheelControlToStartGame();
    showScreen("reveal");
}

/* ---------- wiring ---------- */
function wireStartButton() {
    const startButton = document.getElementById("start");
    if (!startButton) return;
    startButton.addEventListener("click", () => {
        if (!applicationState.selectedAllergenToken) return;
        showScreen("screen-wheel");
        recomputeWheelFromSelection();
        if (!applicationState.currentCandidateLabels.length) return;
        setWheelControlToStop();
        setSpinDurationMs(30000);
        spinToIndex(Math.floor(Math.random() * applicationState.currentCandidateLabels.length));
    });
}

function wireStopButton() {
    const stopButton = document.getElementById("stop");
    if (!stopButton) return;
    stopButton.addEventListener("click", () => {
        if (applicationState.stopButtonMode === "stop") {
            forceStopSpin();
        } else {
            showScreen("screen-allergy");
        }
    });
}

function wireFullscreenButton() {
    const fullscreenButton = document.getElementById("fs");
    if (!fullscreenButton) return;
    fullscreenButton.addEventListener("click", () => {
        const root = document.documentElement;
        if (!document.fullscreenElement) root.requestFullscreen();
        else document.exitFullscreen();
    });
}

function wireRevealAgainButton() {
    const againButton = document.getElementById("again");
    if (!againButton) return;
    againButton.addEventListener("click", () => {
        const revealSection = document.getElementById("reveal");
        if (revealSection) revealSection.setAttribute("aria-hidden", "true");
        if (!applicationState.currentCandidateLabels.length) return;
        setWheelControlToStop();
        setSpinDurationMs(30000);
        spinToIndex(Math.floor(Math.random() * applicationState.currentCandidateLabels.length));
    });
}

function wireRevealBackdropDismissal() {
    const revealSection = document.getElementById("reveal");
    if (!revealSection) return;
    revealSection.addEventListener("click", e => {
        if (e.target === revealSection) revealSection.setAttribute("aria-hidden", "true");
    });
    document.addEventListener("keydown", e => {
        if ((e.key === "Escape" || e.key === "Esc") && revealSection.getAttribute("aria-hidden") === "false") {
            revealSection.setAttribute("aria-hidden", "true");
        }
    });
}

/* ---------- bootstrap ---------- */
export async function initializeApp() {
    try {
        const [allergens, dishes, normalization] = await Promise.all([
            loadJson("./data/allergens.json"),
            loadJson("./data/dishes.json"),
            loadJson("./data/normalization.json")
        ]);

        applicationState.allergensCatalog = allergens;
        applicationState.dishesCatalog = dishes;
        applicationState.normalizationEngine = new NormalizationEngine(normalization);

        buildDishIndexByAllergen();
        validateAllergenCoverageOrThrow();

        const listContainer = document.getElementById("allergy-list");
        if (listContainer) {
            renderAllergenList(listContainer, applicationState.allergensCatalog, (token, label) => {
                applicationState.selectedAllergenToken = token;
                applicationState.selectedAllergenLabel = label;
                document.getElementById("start").disabled = false;
                refreshSelectedAllergenBadges();
                persistSelectedAllergen();
            });
            if (restorePersistedAllergen()) {
                const preselectRadio = listContainer.querySelector(
                    `input[type="radio"][value="${applicationState.selectedAllergenToken}"]`
                );
                if (preselectRadio) {
                    preselectRadio.checked = true;
                    document.getElementById("start").disabled = false;
                    refreshSelectedAllergenBadges();
                }
            }
        }

        initWheel(document.getElementById("wheel"));

        registerSpinCallbacks({
            onTick: () => { playTick(); triggerPointerTap(); },
            onStop: idx => {
                const dish = applicationState.currentCandidateDishes[idx];
                if (dish) populateRevealWithDish(dish);
            }
        });

        wireStartButton();
        wireStopButton();
        wireFullscreenButton();
        wireRevealAgainButton();
        wireRevealBackdropDismissal();

        primeAudioOnFirstGesture();

        showScreen("screen-allergy");
        document.getElementById("loading").hidden = true;
    } catch (err) {
        console.error(err);
        const errorText = document.getElementById("load-error");
        if (errorText) {
            errorText.textContent = "Data error: " + (err?.message || "Unknown");
            errorText.hidden = false;
        }
        document.getElementById("start").disabled = true;
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
