/* global document, window */
import { renderAllergenList } from "./ui.js";
import {
    initWheel,
    setWheelLabels,
    drawWheel,
    spinToIndex,
    ensureWheelSize
} from "./wheel.js";
import { primeAudioOnFirstGesture } from "./audio.js";

/* ---------- data loading ---------- */
async function loadJson(path) {
    const httpResponse = await fetch(path, { cache: "no-store" });
    if (!httpResponse.ok) throw new Error(`failed to load ${path}`);
    return httpResponse.json();
}

/* ---------- normalization engine ---------- */
class NormalizationEngine {
    constructor(ruleDescriptors) {
        // ruleDescriptors: [{pattern, flags, token}]
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
    normalizationEngine: null
};

function dishesMatchingSelectedAllergen() {
    const selectedToken = applicationState.selectedAllergenToken;
    if (!selectedToken) return [];
    const normalizedToken = String(selectedToken);
    const matchingDishes = [];

    for (const dish of applicationState.dishesCatalog) {
        const ingredientList = Array.isArray(dish.ingredients) ? dish.ingredients : [];
        const dishTokens = applicationState.normalizationEngine.tokensForDishIngredients(ingredientList);
        if (dishTokens.has(normalizedToken)) matchingDishes.push(dish);
    }
    return matchingDishes;
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
    const candidateDishes = dishesMatchingSelectedAllergen();
    const labelList = candidateDishes.map(dishDisplayLabel).filter((text) => text && text.length > 0);
    if (!labelList.length) {
        setWheelLabels(["No matches"]);
        drawWheel();
        return;
    }
    setWheelLabels(labelList);
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

function wireStartButton() {
    const startButton = document.getElementById("start");
    if (!startButton) return;
    startButton.addEventListener("click", () => {
        if (!applicationState.selectedAllergenToken) return;

        showScreen("screen-wheel");
        ensureWheelSize();
        recomputeWheelFromSelection();

        const candidateDishes = dishesMatchingSelectedAllergen();
        const labelList = candidateDishes.map(dishDisplayLabel).filter((text) => text && text.length > 0);
        if (!labelList.length) return;

        const randomIndex = Math.floor(Math.random() * labelList.length);
        spinToIndex(randomIndex);
        setTimeout(ensureWheelSize, 0);
    });
}

function wireStopButton() {
    const stopButton = document.getElementById("stop");
    if (!stopButton) return;
    stopButton.addEventListener("click", () => showScreen("screen-allergy"));
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

        const listContainer = document.getElementById("allergy-list");
        if (listContainer) {
            renderAllergenList(listContainer, applicationState.allergensCatalog, (selectedToken, selectedLabel) => {
                applicationState.selectedAllergenToken = selectedToken;
                applicationState.selectedAllergenLabel = selectedLabel;
                const startButton = document.getElementById("start");
                if (startButton) startButton.disabled = false;
                refreshSelectedAllergenBadges();
                recomputeWheelFromSelection();
            });
        }

        const wheelCanvasElement = document.getElementById("wheel");
        if (wheelCanvasElement) initWheel(wheelCanvasElement);

        wireStartButton();
        wireStopButton();
        wireFullscreenButton();

        // prime audio context on first gesture (keeps autoplay policies happy)
        primeAudioOnFirstGesture();

        const loadingText = document.getElementById("loading");
        if (loadingText) loadingText.hidden = true;
    } catch (caughtError) {
        console.error(caughtError);
        const errorText = document.getElementById("load-error");
        if (errorText) errorText.hidden = false;
    }
}

document.addEventListener("DOMContentLoaded", initializeApp);
