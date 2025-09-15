/* global document, window */
import { renderAllergenList } from "./ui.js";
import {
    initWheel,
    setWheelLabels,
    drawWheel,
    spinToIndex,
    ensureWheelSize,
    registerSpinCallbacks,
    forceStopSpin
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
    currentCandidateLabels: []
};

const localStorageKeySelectedToken = "allergyWheel.selectedAllergenToken";
const localStorageKeySelectedLabel = "allergyWheel.selectedAllergenLabel";

/* ---------- persistence ---------- */
function persistSelectedAllergen() {
    try {
        if (!applicationState.selectedAllergenToken) return;
        window.localStorage.setItem(localStorageKeySelectedToken, applicationState.selectedAllergenToken);
        window.localStorage.setItem(localStorageKeySelectedLabel, applicationState.selectedAllergenLabel || "");
    } catch {
        // ignore
    }
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
    } catch {
        // ignore
    }
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
        if (dishesForToken.length === 0) {
            missing.push(token);
        }
    }
    if (missing.length > 0) {
        throw new Error(
            `Data invariant violated: no dishes found for allergen token(s): ${missing.join(", ")}. ` +
            `Please add at least one matching dish per allergen to data/dishes.json.`
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

function recomputeWheelFromSelection() {
    const matchingDishes = dishesMatchingSelectedAllergen();

    const paddedDishes = [...matchingDishes];
    const seenKeys = new Set(paddedDishes.map(d => (d.id || dishDisplayLabel(d))));

    for (const dish of applicationState.dishesCatalog) {
        if (paddedDishes.length >= 8) break;
        const dishKey = dish.id || dishDisplayLabel(dish);
        if (!seenKeys.has(dishKey)) {
            paddedDishes.push(dish);
            seenKeys.add(dishKey);
        }
    }

    if (paddedDishes.length > 0) {
        let sourceIndex = 0;
        while (paddedDishes.length < 8) {
            paddedDishes.push(paddedDishes[sourceIndex % paddedDishes.length]);
            sourceIndex += 1;
        }
    }

    applicationState.currentCandidateDishes = paddedDishes;
    applicationState.currentCandidateLabels = paddedDishes
        .map(dishDisplayLabel)
        .filter((text) => text && text.length > 0);

    if (!applicationState.currentCandidateLabels.length) {
        setWheelLabels(["No matches"]);
        drawWheel();
        return;
    }

    setWheelLabels(applicationState.currentCandidateLabels);
    drawWheel();
}

function showScreen(targetId) {
    const sectionIds = ["screen-allergy", "screen-wheel", "reveal"];
    for (const sectionId of sectionIds) {
        const sectionElement = document.getElementById(sectionId);
        if (!sectionElement) continue;
        sectionElement.hidden = sectionId !== targetId;
    }
    if (targetId === "screen-wheel") ensureWheelSize();
}

function populateRevealWithDish(chosenDish) {
    const revealSection = document.getElementById("reveal");
    const dishTitleElement = document.getElementById("dish-title");
    const dishCuisineElement = document.getElementById("dish-cuisine");
    const resultBannerElement = document.getElementById("result");
    const resultTextElement = document.getElementById("result-text");
    const ingredientsContainer = document.getElementById("dish-ingredients");
    const faceSvg = document.getElementById("face");

    if (!revealSection || !dishTitleElement || !dishCuisineElement || !resultBannerElement || !resultTextElement || !ingredientsContainer) {
        return;
    }

    dishTitleElement.textContent = dishDisplayLabel(chosenDish);
    dishCuisineElement.textContent = chosenDish.cuisine || "";

    ingredientsContainer.textContent = "";

    const triggeringToken = applicationState.selectedAllergenToken;
    let hasTriggeringIngredient = false;

    for (const ingredientName of chosenDish.ingredients || []) {
        const ingredientSpan = document.createElement("span");
        ingredientSpan.className = "ingredient";

        const tokensForIngredient = applicationState.normalizationEngine.tokensForIngredient(ingredientName);
        const isTriggering = tokensForIngredient.has(triggeringToken);
        if (isTriggering) {
            hasTriggeringIngredient = true;
            ingredientSpan.classList.add("bad");
        }
        ingredientSpan.textContent = ingredientName;
        ingredientsContainer.appendChild(ingredientSpan);
    }

    if (hasTriggeringIngredient) {
        resultBannerElement.classList.remove("ok");
        resultBannerElement.classList.add("bad");
        resultTextElement.textContent = `Contains your allergen: ${applicationState.selectedAllergenLabel}`;
        if (faceSvg) faceSvg.hidden = false;
        playSiren(1800);
    } else {
        resultBannerElement.classList.remove("bad");
        resultBannerElement.classList.add("ok");
        resultTextElement.textContent = "Safe to eat. Yummy!";
        if (faceSvg) faceSvg.hidden = true;
        playNomNom(1200);
    }

    revealSection.hidden = false;
}

/* ---------- wiring ---------- */
function wireStartButton() {
    const startButton = document.getElementById("start");
    if (!startButton) return;
    startButton.addEventListener("click", () => {
        if (!applicationState.selectedAllergenToken) return;

        showScreen("screen-wheel");
        ensureWheelSize();
        recomputeWheelFromSelection();

        if (!applicationState.currentCandidateLabels.length) return;

        const randomIndex = Math.floor(Math.random() * applicationState.currentCandidateLabels.length);
        spinToIndex(randomIndex);
        setTimeout(ensureWheelSize, 0);
    });
}

function wireStopButton() {
    const stopButton = document.getElementById("stop");
    if (!stopButton) return;
    stopButton.addEventListener("click", () => {
        forceStopSpin();
    });
}

function wireFullscreenButton() {
    const fullscreenButton = document.getElementById("fs");
    if (!fullscreenButton) return;
    fullscreenButton.addEventListener("click", () => {
        const documentElement = document.documentElement;
        if (!document.fullscreenElement) {
            if (documentElement.requestFullscreen) documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });
}

function wireRevealAgainButton() {
    const againButton = document.getElementById("again");
    if (!againButton) return;
    againButton.addEventListener("click", () => {
        const revealSection = document.getElementById("reveal");
        if (revealSection) revealSection.hidden = true;
        if (!applicationState.currentCandidateLabels.length) return;
        const randomIndex = Math.floor(Math.random() * applicationState.currentCandidateLabels.length);
        spinToIndex(randomIndex);
    });
}

function wireRevealBackdropDismissal() {
    const revealSection = document.getElementById("reveal");
    if (!revealSection) return;

    revealSection.addEventListener("click", (mouseEvent) => {
        if (mouseEvent.target === revealSection) {
            revealSection.hidden = true;
            showScreen("screen-allergy");
        }
    });

    document.addEventListener("keydown", (keyboardEvent) => {
        const isEscape = keyboardEvent.key === "Escape" || keyboardEvent.key === "Esc";
        if (isEscape && !revealSection.hidden) {
            revealSection.hidden = true;
            showScreen("screen-allergy");
        }
    });
}

/* ---------- bootstrap ---------- */
export async function initializeApp() {
    try {
        const [allergenCatalogJson, dishesJson, normalizationJson] = await Promise.all([
            loadJson("./data/allergens.json"),
            loadJson("./data/dishes.json"),
            loadJson("./data/normalization.json")
        ]);

        applicationState.allergensCatalog = Array.isArray(allergenCatalogJson) ? allergenCatalogJson : [];
        applicationState.dishesCatalog = Array.isArray(dishesJson) ? dishesJson : [];
        applicationState.normalizationEngine = new NormalizationEngine(normalizationJson);

        buildDishIndexByAllergen();
        validateAllergenCoverageOrThrow();

        const listContainer = document.getElementById("allergy-list");
        if (listContainer) {
            renderAllergenList(listContainer, applicationState.allergensCatalog, (selectedToken, selectedLabel) => {
                applicationState.selectedAllergenToken = selectedToken;
                applicationState.selectedAllergenLabel = selectedLabel;
                const startButton = document.getElementById("start");
                if (startButton) startButton.disabled = false;
                refreshSelectedAllergenBadges();
                persistSelectedAllergen();
            });

            if (restorePersistedAllergen()) {
                const preselectRadio = listContainer.querySelector(
                    `input[type="radio"][value="${applicationState.selectedAllergenToken}"]`
                );
                if (preselectRadio) {
                    preselectRadio.checked = true;
                    const startButton = document.getElementById("start");
                    if (startButton) startButton.disabled = false;
                    refreshSelectedAllergenBadges();
                }
            }
        }

        const wheelCanvasElement = document.getElementById("wheel");
        if (wheelCanvasElement) initWheel(wheelCanvasElement);

        registerSpinCallbacks({
            onTick: () => playTick(),
            onStop: (winnerIndex) => {
                const chosenDish = applicationState.currentCandidateDishes[winnerIndex];
                if (chosenDish) populateRevealWithDish(chosenDish);
            }
        });

        wireStartButton();
        wireStopButton();
        wireFullscreenButton();
        wireRevealAgainButton();
        wireRevealBackdropDismissal();

        primeAudioOnFirstGesture();

        const loadingText = document.getElementById("loading");
        if (loadingText) loadingText.hidden = true;
    } catch (caughtError) {
        console.error(caughtError);
        const errorText = document.getElementById("load-error");
        if (errorText) {
            errorText.textContent = "Data error: " + (caughtError?.message || "Unknown");
            errorText.hidden = false;
        }
        const startButton = document.getElementById("start");
        if (startButton) startButton.disabled = true;
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
