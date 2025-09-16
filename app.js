/* File: app.js */
/* global document, window */
import {
    renderAllergenList,
    refreshSelectedAllergenBadges,
    showScreen,
    populateRevealCard,
    setWheelControlToStop,
    setWheelControlToStartGame,
    renderHearts,
    showGameOver,
    animateHeartGainFromReveal,
    animateHeartLossAtHeartsBar
} from "./ui.js";
import {
    initWheel,
    setWheelLabels,
    drawWheel,
    spinToIndex,
    ensureWheelSize,
    registerSpinCallbacks,
    forceStopSpin,
    setSpinDurationMs,
    triggerPointerTap,
    scrambleStartAngle,
    resetForNewSpin,
    setRevolutions
} from "./wheel.js";
import { primeAudioOnFirstGesture, playTick, playSiren, playNomNom } from "./audio.js";
import { loadJson, NormalizationEngine, pickRandomUnique } from "./utils.js";
import { Board } from "./board.js";

/* ---------- constants ---------- */
const wheelSegmentCount = 8;
const spinDurationMsDefault = 30000;
const initialHeartsCount = 5;

/* ---------- app state ---------- */
const applicationState = {
    board: null,
    selectedAllergenToken: null,
    selectedAllergenLabel: "",
    currentCandidateDishes: [],
    currentCandidateLabels: [], // array of {label, emoji}
    stopButtonMode: "stop", // "stop" | "start"
    heartsCount: initialHeartsCount
};

/* ---------- helpers ---------- */
function randomBetween(minInclusive, maxInclusive) {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomSpinDurationMs() {
    // Keep it kid-friendly but varied; center around ~30s with some variance
    return randomBetween(22000, 34000);
}
function getRandomRevolutions() {
    // Vary the "force"; 3–6 full turns feels nice with easing
    return randomBetween(3, 6);
}

function recomputeWheelFromSelection() {
    const board = applicationState.board;
    const selectedToken = applicationState.selectedAllergenToken;

    if (!board || !selectedToken) {
        applicationState.currentCandidateDishes = [];
        applicationState.currentCandidateLabels = [];
        setWheelLabels([{ label: "No selection", emoji: "" }]);
        drawWheel();
        return;
    }

    const matchingDishes = board.getDishesForAllergen(selectedToken);
    if (!Array.isArray(matchingDishes) || matchingDishes.length === 0) {
        throw new Error("Invariant broken: no dishes for allergen token '" + selectedToken + "'");
    }

    const anchorDish = matchingDishes[Math.floor(Math.random() * matchingDishes.length)];
    const catalog = Array.isArray(board.dishesCatalog) ? board.dishesCatalog : [];

    const slotsToFill = Math.max(0, wheelSegmentCount - 1);
    const pool = catalog.filter(function filterOutAnchor(d) { return d !== anchorDish; });

    let fill = [];
    if (pool.length >= slotsToFill) {
        fill = pickRandomUnique(pool, slotsToFill);
    } else {
        fill = pool.slice();
        while (fill.length < slotsToFill) {
            fill.push(catalog[Math.floor(Math.random() * catalog.length)]);
        }
    }

    const chosenDishes = [anchorDish, ...fill];
    for (let index = chosenDishes.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        const tmp = chosenDishes[index];
        chosenDishes[index] = chosenDishes[randomIndex];
        chosenDishes[randomIndex] = tmp;
    }

    applicationState.currentCandidateDishes = chosenDishes.slice(0, wheelSegmentCount);
    applicationState.currentCandidateLabels = applicationState.currentCandidateDishes
        .map(function mapDishToLabel(d) { return { label: board.getDishLabel(d), emoji: d.emoji || "" }; })
        .filter(function keepNonEmpty(obj) { return obj.label; })
        .slice(0, wheelSegmentCount);

    setWheelLabels(
        applicationState.currentCandidateLabels.length
            ? applicationState.currentCandidateLabels
            : [{ label: "No matches", emoji: "" }]
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

function resetGame() {
    applicationState.heartsCount = initialHeartsCount;
    renderHearts(applicationState.heartsCount, { animate: false });
    applicationState.selectedAllergenToken = null;
    applicationState.selectedAllergenLabel = "";
    applicationState.currentCandidateDishes = [];
    applicationState.currentCandidateLabels = [];
    const startBtn = document.getElementById("start");
    if (startBtn) startBtn.disabled = true;
    refreshSelectedAllergenBadges([]);
    showScreen("allergy");
}

/* ---------- wiring ---------- */
function startSpinWithFreshState() {
    // Build a NEW wheel (new random dishes) + fresh start angle + new speed/force
    if (!applicationState.selectedAllergenToken) return;
    recomputeWheelFromSelection();
    if (!applicationState.currentCandidateLabels.length) return;

    // Fresh angle & speed
    resetForNewSpin({ randomizeStart: true });
    setRevolutions(getRandomRevolutions());
    setSpinDurationMs(getRandomSpinDurationMs());

    toStopMode();
    const randomIndex = Math.floor(Math.random() * applicationState.currentCandidateLabels.length);
    spinToIndex(randomIndex);
}

function wireStartButton() {
    const startButton = document.getElementById("start");
    if (!startButton) return;
    startButton.addEventListener("click", function onStartPressed() {
        if (!applicationState.selectedAllergenToken) return;
        showScreen("wheel");
        ensureWheelSize();
        startSpinWithFreshState();
    });
}

function wireStopButton() {
    const stopButton = document.getElementById("stop");
    if (!stopButton) return;
    stopButton.addEventListener("click", function onStopPressed() {
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
    fullscreenButton.addEventListener("click", function onFullscreenPressed() {
        const rootElement = document.documentElement;
        if (!document.fullscreenElement) rootElement.requestFullscreen();
        else document.exitFullscreen();
    });
}

function wireSpinAgainButton() {
    const againButton = document.getElementById("again");
    if (!againButton) return;
    againButton.addEventListener("click", function onAgainPressed() {
        const revealSection = document.getElementById("reveal");
        if (revealSection) revealSection.setAttribute("aria-hidden", "true");
        startSpinWithFreshState();
    });
}

function wireRevealBackdropDismissal() {
    const revealSection = document.getElementById("reveal");
    if (!revealSection) return;
    revealSection.addEventListener("click", function onBackdropClick(e) {
        if (e.target === revealSection) revealSection.setAttribute("aria-hidden", "true");
    });
    document.addEventListener("keydown", function onEsc(e) {
        if ((e.key === "Escape" || e.key === "Esc") && revealSection.getAttribute("aria-hidden") === "false") {
            revealSection.setAttribute("aria-hidden", "true");
        }
    });
}

function wireRestartButton() {
    const restartButton = document.getElementById("restart");
    if (!restartButton) return;
    restartButton.addEventListener("click", function onRestartPressed() {
        const gameoverSection = document.getElementById("gameover");
        if (gameoverSection) gameoverSection.setAttribute("aria-hidden", "true");
        resetGame();
    });
}

/* ---------- bootstrap ---------- */
async function initializeApp() {
    try {
        const [
            allergensCatalog,
            dishesCatalog,
            normalizationRules,
            countriesCatalogMaybe,
            ingredientsCatalog
        ] = await Promise.all([
            loadJson("./data/allergens.json"),
            loadJson("./data/dishes.json"),
            loadJson("./data/normalization.json"),
            loadJson("./data/countries.json"),
            loadJson("./data/ingredients.json")
        ]);

        if (!Array.isArray(allergensCatalog) || allergensCatalog.length === 0) {
            throw new Error("allergens.json is missing or empty");
        }
        if (!Array.isArray(dishesCatalog) || dishesCatalog.length === 0) {
            throw new Error("dishes.json is missing or empty");
        }
        if (!Array.isArray(normalizationRules) || normalizationRules.length === 0) {
            throw new Error("normalization.json is missing or empty");
        }
        if (!Array.isArray(ingredientsCatalog) || ingredientsCatalog.length === 0) {
            throw new Error("ingredients.json is missing or empty");
        }

        // Build cuisine -> flag map (keys in lowercase for robust matching)
        const cuisineToFlagMap = new Map();
        if (Array.isArray(countriesCatalogMaybe)) {
            for (const record of countriesCatalogMaybe) {
                const cuisineKey = String(record && record.cuisine ? record.cuisine : "")
                    .trim()
                    .toLowerCase();
                const flagEmoji = String(record && record.flag ? record.flag : "");
                if (cuisineKey) cuisineToFlagMap.set(cuisineKey, flagEmoji);
            }
        }

        // Build ingredient name -> emoji map (lowercased keys)
        const ingredientEmojiByName = new Map();
        for (const item of ingredientsCatalog) {
            const nameKey = String(item && item.name ? item.name : "").trim().toLowerCase();
            const emoji = String(item && item.emoji ? item.emoji : "");
            if (nameKey) ingredientEmojiByName.set(nameKey, emoji);
        }

        const normalizationEngine = new NormalizationEngine(normalizationRules);
        const board = new Board({ allergensCatalog, dishesCatalog, normalizationEngine });
        board.buildDishIndexByAllergen();
        board.throwIfAnyAllergenHasNoDishes();

        applicationState.board = board;

        // Initial hearts render (no animation)
        applicationState.heartsCount = initialHeartsCount;
        renderHearts(applicationState.heartsCount, { animate: false });

        const allergyListContainer = document.getElementById("allergy-list");
        if (allergyListContainer) {
            renderAllergenList(allergyListContainer, allergensCatalog, function onAllergenChosen(token, label) {
                applicationState.selectedAllergenToken = token;
                applicationState.selectedAllergenLabel = label;
                const startBtn = document.getElementById("start");
                if (startBtn) startBtn.disabled = false;

                // Find emoji for selected allergen for badges
                const found = allergensCatalog.find(function findMatch(a) { return a && a.token === token; });
                const badgeEntry = { label: label, emoji: (found && found.emoji) || "" };
                refreshSelectedAllergenBadges([badgeEntry]);
            });
            const startBtn = document.getElementById("start");
            if (startBtn) startBtn.disabled = true;
            refreshSelectedAllergenBadges([]);
        }

        initWheel(document.getElementById("wheel"));
        registerSpinCallbacks({
            onTick: function onTick() { playTick(); triggerPointerTap(); },
            onStop: function onStop(winnerIndex) {
                const dish = applicationState.currentCandidateDishes[winnerIndex];
                if (!dish) return;

                const revealInfo = populateRevealCard({
                    dish: dish,
                    selectedAllergenToken: applicationState.selectedAllergenToken,
                    selectedAllergenLabel: applicationState.selectedAllergenLabel,
                    normalizationEngine: normalizationEngine,
                    allergensCatalog: board.allergensCatalog,
                    cuisineToFlagMap: cuisineToFlagMap,
                    ingredientEmojiByName: ingredientEmojiByName
                });

                if (revealInfo.hasTriggeringIngredient) {
                    // LOSS: animate a breaking heart at the bar, then decrement
                    animateHeartLossAtHeartsBar();
                    applicationState.heartsCount = Math.max(0, applicationState.heartsCount - 1);
                    playSiren(1800);
                } else {
                    // GAIN: fly a heart from the reveal to the bar, then increment
                    animateHeartGainFromReveal();
                    applicationState.heartsCount = applicationState.heartsCount + 1;
                    playNomNom(1200);
                }

                // Update the toolbar hearts with animation
                renderHearts(applicationState.heartsCount, { animate: true });

                if (applicationState.heartsCount === 0) {
                    showGameOver();
                }

                toStartMode();
            }
        });

        wireStartButton();
        wireStopButton();
        wireFullscreenButton();
        wireSpinAgainButton();
        wireRevealBackdropDismissal();
        wireRestartButton();

        primeAudioOnFirstGesture();

        // Show initial screen
        const loadingEl = document.getElementById("loading");
        if (loadingEl) loadingEl.hidden = true;
        showScreen("allergy");
    } catch (errorObject) {
        const loadingEl = document.getElementById("loading");
        const loadErrorEl = document.getElementById("load-error");
        if (loadingEl) loadingEl.hidden = true;
        if (loadErrorEl) loadErrorEl.hidden = false;
        // eslint-disable-next-line no-console
        console.error(errorObject);
    }
}

window.addEventListener("DOMContentLoaded", function onDomReady() {
    initializeApp();
});
