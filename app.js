/* global document, window */
import { renderAllergenList, refreshSelectedAllergenBadges, showScreen, populateRevealCard, setWheelControlToStop, setWheelControlToStartGame } from "./ui.js";
import { initWheel, setWheelLabels, drawWheel, spinToIndex, ensureWheelSize, registerSpinCallbacks, forceStopSpin, setSpinDurationMs, triggerPointerTap } from "./wheel.js";
import { primeAudioOnFirstGesture, playTick, playSiren, playNomNom } from "./audio.js";
import { loadJson, NormalizationEngine, pickRandomUnique } from "./utils.js";
import { Board } from "./board.js";

/* ---------- constants ---------- */
const wheelSegmentCount = 8;
const spinDurationMsDefault = 30000;

/* ---------- app state ---------- */
const applicationState = {
    board: null,
    selectedAllergenToken: null,
    selectedAllergenLabel: "",
    currentCandidateDishes: [],
    currentCandidateLabels: [],
    stopButtonMode: "stop" // "stop" | "start"
};

/* ---------- helpers ---------- */
function recomputeWheelFromSelection() {
    const board = applicationState.board;
    const selectedToken = applicationState.selectedAllergenToken;

    if (!board || !selectedToken) {
        applicationState.currentCandidateDishes = [];
        applicationState.currentCandidateLabels = [];
        setWheelLabels(["No selection"]);
        drawWheel();
        return;
    }

    const matchingDishes = board.getDishesForAllergen(selectedToken);
    if (!Array.isArray(matchingDishes) || matchingDishes.length === 0) {
        // Hard fail per requirement: data must guarantee at least one match per allergen.
        throw new Error(`Invariant broken: no dishes for allergen token '${selectedToken}'`);
    }

    // 1) Anchor: ensure at least one matching dish is present (random among matches).
    const anchorDish = matchingDishes[Math.floor(Math.random() * matchingDishes.length)];

    // 2) Fill remaining slots from the catalog excluding the anchor (keeps picks unique).
    const catalog = Array.isArray(board.dishesCatalog) ? board.dishesCatalog : [];
    const slotsToFill = Math.max(0, wheelSegmentCount - 1);
    const pool = catalog.filter(d => d !== anchorDish);

    let fill = [];
    if (pool.length >= slotsToFill) {
        fill = pickRandomUnique(pool, slotsToFill);
    } else {
        // Not enough unique dishes in catalog to fill one spin — use all unique then repeat randomly.
        fill = [...pool];
        while (fill.length < slotsToFill) {
            fill.push(catalog[Math.floor(Math.random() * catalog.length)]);
        }
    }

    // 3) Combine and shuffle so anchor position is not predictable.
    const chosenDishes = [anchorDish, ...fill];
    for (let index = chosenDishes.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [chosenDishes[index], chosenDishes[randomIndex]] = [chosenDishes[randomIndex], chosenDishes[index]];
    }

    // 4) Persist + render
    applicationState.currentCandidateDishes = chosenDishes.slice(0, wheelSegmentCount);
    applicationState.currentCandidateLabels = applicationState.currentCandidateDishes
        .map(d => board.getDishLabel(d))
        .filter(Boolean)
        .slice(0, wheelSegmentCount);

    setWheelLabels(
        applicationState.currentCandidateLabels.length
            ? applicationState.currentCandidateLabels
            : ["No matches"]
    );
    drawWheel();
}

function toStartMode() {
    const centerButton = document.getElementById("stop");
    if (!centerButton) return;
    centerButton.textContent = "Start";
    centerButton.classList.add("action", "is-start");
    centerButton.classList.remove("is-stop", "primary", "danger");
    applicationState.stopButtonMode = "start";
    setWheelControlToStartGame();
}

function toStopMode() {
    const centerButton = document.getElementById("stop");
    if (!centerButton) return;
    centerButton.textContent = "STOP";
    centerButton.classList.add("action", "is-stop");
    centerButton.classList.remove("is-start", "primary", "danger");
    applicationState.stopButtonMode = "stop";
    setWheelControlToStop();
}

/* ---------- wiring ---------- */
function wireStartButton() {
    const startButton = document.getElementById("start");
    if (!startButton) return;
    startButton.addEventListener("click", () => {
        if (!applicationState.selectedAllergenToken) return;
        showScreen("wheel");
        ensureWheelSize();
        recomputeWheelFromSelection();
        if (!applicationState.currentCandidateLabels.length) return;
        toStopMode();
        setSpinDurationMs(spinDurationMsDefault);
        const randomIndex = Math.floor(Math.random() * applicationState.currentCandidateLabels.length);
        spinToIndex(randomIndex);
    });
}

function wireStopButton() {
    const stopButton = document.getElementById("stop");
    if (!stopButton) return;
    stopButton.addEventListener("click", () => {
        if (applicationState.stopButtonMode === "stop") {
            forceStopSpin();
        } else {
            showScreen("allergy");
        }
    });
}

function wireFullscreenButton() {
    const fullscreenButton = document.getElementById("fs");
    if (!fullscreenButton) return;
    fullscreenButton.addEventListener("click", () => {
        const rootElement = document.documentElement;
        if (!document.fullscreenElement) rootElement.requestFullscreen();
        else document.exitFullscreen();
    });
}

function wireSpinAgainButton() {
    const againButton = document.getElementById("again");
    if (!againButton) return;
    againButton.addEventListener("click", () => {
        const revealSection = document.getElementById("reveal");
        if (revealSection) revealSection.setAttribute("aria-hidden", "true");
        if (!applicationState.currentCandidateLabels.length) return;
        toStopMode();
        setSpinDurationMs(spinDurationMsDefault);
        const randomIndex = Math.floor(Math.random() * applicationState.currentCandidateLabels.length);
        spinToIndex(randomIndex);
    });
}

function wireRevealBackdropDismissal() {
    const revealSection = document.getElementById("reveal");
    if (!revealSection) return;
    revealSection.addEventListener("click", eventObject => {
        if (eventObject.target === revealSection) revealSection.setAttribute("aria-hidden", "true");
    });
    document.addEventListener("keydown", eventObject => {
        if ((eventObject.key === "Escape" || eventObject.key === "Esc") && revealSection.getAttribute("aria-hidden") === "false") {
            revealSection.setAttribute("aria-hidden", "true");
        }
    });
}

/* ---------- bootstrap ---------- */
async function initializeApp() {
    try {
        const [allergensCatalog, dishesCatalog, normalizationRules] = await Promise.all([
            loadJson("./data/allergens.json"),
            loadJson("./data/dishes.json"),
            loadJson("./data/normalization.json")
        ]);

        // ---------- HARD FAIL VALIDATIONS ----------
        if (!Array.isArray(allergensCatalog) || allergensCatalog.length === 0) {
            throw new Error("allergens.json is missing or empty");
        }
        if (!Array.isArray(dishesCatalog) || dishesCatalog.length === 0) {
            throw new Error("dishes.json is missing or empty");
        }
        if (!Array.isArray(normalizationRules) || normalizationRules.length === 0) {
            throw new Error("normalization.json is missing or empty");
        }
        // Validate allergens have required shape
        const badAllergenItems = allergensCatalog.filter(
            (item) => !item || typeof item.token !== "string" || item.token.trim() === ""
        );
        if (badAllergenItems.length > 0) {
            throw new Error("allergens.json contains item(s) without a valid 'token'");
        }
        // Validate dishes have array ingredients
        const badDishItems = dishesCatalog.filter(
            (dish) => !dish || !Array.isArray(dish.ingredients)
        );
        if (badDishItems.length > 0) {
            throw new Error("dishes.json contains item(s) without an 'ingredients' array");
        }
        // ------------------------------------------

        const normalizationEngine = new NormalizationEngine(normalizationRules);
        const board = new Board({ allergensCatalog, dishesCatalog, normalizationEngine });
        board.buildDishIndexByAllergen();

        // HARD FAIL if any allergen has no dishes mapped
        board.throwIfAnyAllergenHasNoDishes();

        applicationState.board = board;

        // Render full list: NOTHING preselected; enable Start only after user chooses.
        const allergyListContainer = document.getElementById("allergy-list");
        if (allergyListContainer) {
            renderAllergenList(allergyListContainer, allergensCatalog, (token, label) => {
                applicationState.selectedAllergenToken = token;
                applicationState.selectedAllergenLabel = label;
                const startBtn = document.getElementById("start");
                if (startBtn) startBtn.disabled = false;
                refreshSelectedAllergenBadges([label]);
            });

            // Ensure Start remains disabled until user actively picks an allergen.
            const startBtn = document.getElementById("start");
            if (startBtn) startBtn.disabled = true;
            refreshSelectedAllergenBadges([]);
        }

        // Wheel
        initWheel(document.getElementById("wheel"));
        registerSpinCallbacks({
            onTick: () => { playTick(); triggerPointerTap(); },
            onStop: (winnerIndex) => {
                const dish = applicationState.currentCandidateDishes[winnerIndex];
                if (!dish) return;

                const revealInfo = populateRevealCard({
                    dish,
                    selectedAllergenToken: applicationState.selectedAllergenToken,
                    selectedAllergenLabel: applicationState.selectedAllergenLabel,
                    normalizationEngine
                });

                if (revealInfo.hasTriggeringIngredient) {
                    playSiren(1800);
                } else {
                    playNomNom(1200);
                }
                toStartMode();
            }
        });

        // UI wiring
        wireStartButton();
        wireStopButton();
        wireFullscreenButton();
        wireSpinAgainButton();
        wireRevealBackdropDismissal();

        primeAudioOnFirstGesture();

        showScreen("allergy");
        document.getElementById("loading").hidden = true;
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
