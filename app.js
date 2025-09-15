/* global document, window */
import { renderAllergenList, refreshSelectedAllergenBadges, showScreen, populateRevealCard, setWheelControlToStop, setWheelControlToStartGame } from "./ui.js";
import { initWheel, setWheelLabels, drawWheel, spinToIndex, ensureWheelSize, registerSpinCallbacks, forceStopSpin, setSpinDurationMs, triggerPointerTap } from "./wheel.js";
import { primeAudioOnFirstGesture, playTick, playSiren, playNomNom } from "./audio.js";
import { loadJson, NormalizationEngine, persistSelectedAllergen, restorePersistedAllergen, pickRandomUnique } from "./utils.js";
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
    const matchingDishes = applicationState.board.getDishesForAllergen(applicationState.selectedAllergenToken);
    let chosenDishes = [];

    if (matchingDishes.length >= wheelSegmentCount) {
        chosenDishes = pickRandomUnique(matchingDishes, wheelSegmentCount);
    } else {
        chosenDishes = [...matchingDishes];
        const seenKeys = new Set(chosenDishes.map(dish => dish.id || applicationState.board.getDishLabel(dish)));
        const fillerPool = applicationState.board.dishesCatalog.filter(dish => {
            const key = dish.id || applicationState.board.getDishLabel(dish);
            return !seenKeys.has(key);
        });
        const needCount = wheelSegmentCount - chosenDishes.length;
        chosenDishes.push(...pickRandomUnique(fillerPool, needCount));
        while (chosenDishes.length < wheelSegmentCount && chosenDishes.length > 0) {
            chosenDishes.push(chosenDishes[chosenDishes.length % chosenDishes.length]);
        }
    }

    applicationState.currentCandidateDishes = chosenDishes;
    applicationState.currentCandidateLabels = chosenDishes
        .map(dish => applicationState.board.getDishLabel(dish))
        .filter(Boolean)
        .slice(0, wheelSegmentCount);

    setWheelLabels(applicationState.currentCandidateLabels.length ? applicationState.currentCandidateLabels : ["No matches"]);
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
export async function initializeApp() {
    try {
        const [allergensCatalog, dishesCatalog, normalizationRules] = await Promise.all([
            loadJson("./data/allergens.json"),
            loadJson("./data/dishes.json"),
            loadJson("./data/normalization.json")
        ]);

        const normalizationEngine = new NormalizationEngine(normalizationRules);
        const board = new Board({ allergensCatalog, dishesCatalog, normalizationEngine });
        board.buildDishIndexByAllergen();
        board.throwIfAnyAllergenHasNoDishes();

        applicationState.board = board;

        const allergyListContainer = document.getElementById("allergy-list");
        if (allergyListContainer) {
            renderAllergenList(allergyListContainer, allergensCatalog, (token, label) => {
                applicationState.selectedAllergenToken = token;
                applicationState.selectedAllergenLabel = label;
                document.getElementById("start").disabled = false;
                refreshSelectedAllergenBadges([label]);
                persistSelectedAllergen(token, label);
            });

            const restored = restorePersistedAllergen();
            if (restored) {
                applicationState.selectedAllergenToken = restored.token;
                applicationState.selectedAllergenLabel = restored.label || restored.token;
                const preselectRadio = allergyListContainer.querySelector(
                    `input[type="radio"][value="${applicationState.selectedAllergenToken}"]`
                );
                if (preselectRadio) {
                    preselectRadio.checked = true;
                    document.getElementById("start").disabled = false;
                    refreshSelectedAllergenBadges([applicationState.selectedAllergenLabel]);
                }
            }
        }

        // Wheel
        initWheel(document.getElementById("wheel"));
        registerSpinCallbacks({
            onTick: () => { playTick(); triggerPointerTap(); },
            onStop: winnerIndex => {
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
