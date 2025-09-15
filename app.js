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
    triggerPointerTap
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
    currentCandidateLabels: [], // now array of {label, emoji}
    stopButtonMode: "stop", // "stop" | "start"
    heartsCount: initialHeartsCount
};

/* ---------- helpers ---------- */
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
        throw new Error(`Invariant broken: no dishes for allergen token '${selectedToken}'`);
    }

    const anchorDish = matchingDishes[Math.floor(Math.random() * matchingDishes.length)];

    const catalog = Array.isArray(board.dishesCatalog) ? board.dishesCatalog : [];
    const slotsToFill = Math.max(0, wheelSegmentCount - 1);
    const pool = catalog.filter(d => d !== anchorDish);

    let fill = [];
    if (pool.length >= slotsToFill) {
        fill = pickRandomUnique(pool, slotsToFill);
    } else {
        fill = [...pool];
        while (fill.length < slotsToFill) {
            fill.push(catalog[Math.floor(Math.random() * catalog.length)]);
        }
    }

    const chosenDishes = [anchorDish, ...fill];
    for (let index = chosenDishes.length - 1; index > 0; index--) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [chosenDishes[index], chosenDishes[randomIndex]] = [chosenDishes[randomIndex], chosenDishes[index]];
    }

    applicationState.currentCandidateDishes = chosenDishes.slice(0, wheelSegmentCount);
    applicationState.currentCandidateLabels = applicationState.currentCandidateDishes
        .map(d => ({ label: board.getDishLabel(d), emoji: d.emoji || "" }))
        .filter(obj => obj.label)
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

function wireRestartButton() {
    const restartButton = document.getElementById("restart");
    if (!restartButton) return;
    restartButton.addEventListener("click", () => {
        const gameoverSection = document.getElementById("gameover");
        if (gameoverSection) gameoverSection.setAttribute("aria-hidden", "true");
        resetGame();
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

        if (!Array.isArray(allergensCatalog) || allergensCatalog.length === 0) {
            throw new Error("allergens.json is missing or empty");
        }
        if (!Array.isArray(dishesCatalog) || dishesCatalog.length === 0) {
            throw new Error("dishes.json is missing or empty");
        }
        if (!Array.isArray(normalizationRules) || normalizationRules.length === 0) {
            throw new Error("normalization.json is missing or empty");
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
            renderAllergenList(allergyListContainer, allergensCatalog, (token, label) => {
                applicationState.selectedAllergenToken = token;
                applicationState.selectedAllergenLabel = label;
                const startBtn = document.getElementById("start");
                if (startBtn) startBtn.disabled = false;

                // Find emoji for selected allergen for badges
                const found = allergensCatalog.find(a => a.token === token);
                const badgeEntry = { label, emoji: found?.emoji || "" };
                refreshSelectedAllergenBadges([badgeEntry]);
            });
            const startBtn = document.getElementById("start");
            if (startBtn) startBtn.disabled = true;
            refreshSelectedAllergenBadges([]);
        }

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
                    normalizationEngine,
                    allergensCatalog: board.allergensCatalog
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
