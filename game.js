import {
    SCREEN_ALLERGY,
    SCREEN_WHEEL,
    MODE_STOP,
    MODE_START
} from "./constants.js";
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
    animateHeartLossAtHeartsBar,
    showWinningCard
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
    resetForNewSpin,
    setRevolutions
} from "./wheel.js";
import { primeAudioOnFirstGesture, playTick, playSiren, playNomNom, playWin } from "./audio.js";
import { loadJson, NormalizationEngine, pickRandomUnique } from "./utils.js";
import { Board } from "./board.js";
import {
    setBoard,
    getBoard,
    setSelectedAllergen,
    clearSelectedAllergen,
    getSelectedAllergenToken,
    getSelectedAllergenLabel,
    hasSelectedAllergen,
    setWheelCandidates,
    resetWheelCandidates,
    getWheelCandidateDishes,
    getWheelCandidateLabels,
    setHeartsCount,
    incrementHeartsCount,
    decrementHeartsCount,
    getInitialHeartsCount,
    setStopButtonMode
} from "./state.js";

const WheelConfiguration = {
    SEGMENT_COUNT: 8,
    DEFAULT_SPIN_DURATION_MS: 30000,
    WIN_CONDITION_HEARTS: 10
};

const ButtonClassName = {
    ACTION: "action",
    START: "is-start",
    STOP: "is-stop",
    PRIMARY: "primary",
    DANGER: "danger"
};

const ButtonText = {
    START: "Start",
    STOP: "STOP"
};

const GameErrorMessage = {
    MISSING_DEPENDENCIES: "createGame requires controlElementId, attributeName, and listeners"
};

function randomBetween(minInclusive, maxInclusive) {
    const min = Math.ceil(minInclusive);
    const max = Math.floor(maxInclusive);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomSpinDurationMs() {
    return randomBetween(22000, 34000);
}

function getRandomRevolutions() {
    return randomBetween(3, 6);
}

function recomputeWheelFromSelection() {
    const board = getBoard();
    const selectedToken = getSelectedAllergenToken();

    if (!board || !selectedToken) {
        resetWheelCandidates();
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

    const slotsToFill = Math.max(0, WheelConfiguration.SEGMENT_COUNT - 1);
    const pool = catalog.filter((dish) => dish !== anchorDish);

    let fillerDishes = [];
    if (pool.length >= slotsToFill) {
        fillerDishes = pickRandomUnique(pool, slotsToFill);
    } else {
        fillerDishes = pool.slice();
        while (fillerDishes.length < slotsToFill && catalog.length > 0) {
            fillerDishes.push(catalog[Math.floor(Math.random() * catalog.length)]);
        }
    }

    const chosenDishes = [anchorDish, ...fillerDishes];
    for (let index = chosenDishes.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        const temporaryDish = chosenDishes[index];
        chosenDishes[index] = chosenDishes[randomIndex];
        chosenDishes[randomIndex] = temporaryDish;
    }

    const limitedDishes = chosenDishes.slice(0, WheelConfiguration.SEGMENT_COUNT);
    const candidateLabels = limitedDishes
        .map((dish) => ({ label: board.getDishLabel(dish), emoji: dish.emoji || "" }))
        .filter((entry) => entry.label)
        .slice(0, WheelConfiguration.SEGMENT_COUNT);

    setWheelCandidates({ dishes: limitedDishes, labels: candidateLabels });

    const wheelLabels = candidateLabels.length ? candidateLabels : [{ label: "No matches", emoji: "" }];
    setWheelLabels(wheelLabels);
    drawWheel();
}

function createGame({ controlElementId, attributeName, listeners, documentReference = document }) {
    if (!controlElementId || !attributeName || !listeners) {
        throw new Error(GameErrorMessage.MISSING_DEPENDENCIES);
    }

    const {
        wireStartButton,
        wireStopButton,
        wireFullscreenButton,
        wireSpinAgainButton,
        wireRevealBackdropDismissal,
        wireRestartButton
    } = listeners;

    function toStartMode() {
        const centerButton = documentReference.getElementById(controlElementId.STOP_BUTTON);
        if (!centerButton) return;
        centerButton.textContent = ButtonText.START;
        centerButton.classList.add(ButtonClassName.ACTION, ButtonClassName.START);
        centerButton.classList.remove(ButtonClassName.STOP, ButtonClassName.PRIMARY, ButtonClassName.DANGER);
        setStopButtonMode(MODE_START);
        setWheelControlToStartGame();
    }

    function toStopMode() {
        const centerButton = documentReference.getElementById(controlElementId.STOP_BUTTON);
        if (!centerButton) return;
        centerButton.textContent = ButtonText.STOP;
        centerButton.classList.add(ButtonClassName.ACTION, ButtonClassName.STOP);
        centerButton.classList.remove(ButtonClassName.START, ButtonClassName.PRIMARY, ButtonClassName.DANGER);
        setStopButtonMode(MODE_STOP);
        setWheelControlToStop();
    }

    function startSpinWithFreshState() {
        if (!hasSelectedAllergen()) return;

        recomputeWheelFromSelection();
        const candidateLabels = getWheelCandidateLabels();
        if (!candidateLabels.length) return;

        resetForNewSpin({ randomizeStart: true });
        setRevolutions(getRandomRevolutions());
        setSpinDurationMs(getRandomSpinDurationMs());

        toStopMode();
        const randomIndex = Math.floor(Math.random() * candidateLabels.length);
        spinToIndex(randomIndex);
    }

    function resetGame() {
        const initialHeartsCount = getInitialHeartsCount();
        setHeartsCount(initialHeartsCount);
        renderHearts(initialHeartsCount, { animate: false });
        clearSelectedAllergen();
        resetWheelCandidates();
        const startButton = documentReference.getElementById(controlElementId.START_BUTTON);
        if (startButton) startButton.disabled = true;
        refreshSelectedAllergenBadges([]);
        showScreen(SCREEN_ALLERGY);
        toStartMode();
    }

    async function bootstrapGame() {
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

            setBoard(board);

            const initialHeartsCount = getInitialHeartsCount();
            setHeartsCount(initialHeartsCount);
            renderHearts(initialHeartsCount, { animate: false });

            const allergyListContainer = documentReference.getElementById("allergy-list");
            if (allergyListContainer) {
                renderAllergenList(allergyListContainer, allergensCatalog, (token, label) => {
                    setSelectedAllergen({ token, label });
                    const startButton = documentReference.getElementById(controlElementId.START_BUTTON);
                    if (startButton) startButton.disabled = false;

                    const foundAllergen = allergensCatalog.find((entry) => entry && entry.token === token);
                    const badgeEntry = { label, emoji: (foundAllergen && foundAllergen.emoji) || "" };
                    refreshSelectedAllergenBadges([badgeEntry]);
                });
                const startButton = documentReference.getElementById(controlElementId.START_BUTTON);
                if (startButton) startButton.disabled = true;
                refreshSelectedAllergenBadges([]);
            }

            initWheel(documentReference.getElementById("wheel"));
            setSpinDurationMs(WheelConfiguration.DEFAULT_SPIN_DURATION_MS);
            registerSpinCallbacks({
                onTick() {
                    playTick();
                    triggerPointerTap();
                },
                onStop(winnerIndex) {
                    const candidateDishes = getWheelCandidateDishes();
                    const dish = candidateDishes[winnerIndex];
                    if (!dish) return;

                    const revealInfo = populateRevealCard({
                        dish,
                        selectedAllergenToken: getSelectedAllergenToken(),
                        selectedAllergenLabel: getSelectedAllergenLabel(),
                        normalizationEngine,
                        allergensCatalog: board.allergensCatalog,
                        cuisineToFlagMap,
                        ingredientEmojiByName
                    });

                    let heartsCountAfterSpin;
                    if (revealInfo.hasTriggeringIngredient) {
                        animateHeartLossAtHeartsBar();
                        heartsCountAfterSpin = decrementHeartsCount();
                        playSiren(1800);
                    } else {
                        animateHeartGainFromReveal();
                        heartsCountAfterSpin = incrementHeartsCount();
                        playNomNom(1200);
                    }

                    renderHearts(heartsCountAfterSpin, { animate: true });

                    if (heartsCountAfterSpin === 0) {
                        showGameOver();
                        toStartMode();
                        return;
                    }

                    if (heartsCountAfterSpin >= WheelConfiguration.WIN_CONDITION_HEARTS) {
                        const restartButton = showWinningCard();
                        playWin();

                        if (restartButton) {
                            restartButton.addEventListener("click", () => {
                                const revealSection = documentReference.getElementById(controlElementId.REVEAL_SECTION);
                                if (revealSection) {
                                    revealSection.setAttribute(attributeName.ARIA_HIDDEN, "true");
                                }
                                resetGame();
                            });
                        }

                        toStartMode();
                        return;
                    }

                    toStartMode();
                }
            });

            wireStartButton({
                onStartRequested: () => {
                    showScreen(SCREEN_WHEEL);
                    ensureWheelSize();
                    startSpinWithFreshState();
                }
            });
            wireStopButton({
                onStopRequested: () => {
                    forceStopSpin();
                },
                onShowAllergyScreen: () => {
                    showScreen(SCREEN_ALLERGY);
                }
            });
            wireFullscreenButton();
            wireSpinAgainButton({
                onSpinAgain: () => {
                    startSpinWithFreshState();
                }
            });
            wireRevealBackdropDismissal();
            wireRestartButton({
                onRestart: () => {
                    resetGame();
                }
            });

            primeAudioOnFirstGesture();

            const loadingElement = documentReference.getElementById("loading");
            if (loadingElement) loadingElement.hidden = true;
            showScreen(SCREEN_ALLERGY);
        } catch (errorObject) {
            const loadingElement = documentReference.getElementById("loading");
            const loadErrorElement = documentReference.getElementById("load-error");
            if (loadingElement) loadingElement.hidden = true;
            if (loadErrorElement) loadErrorElement.hidden = false;
            // eslint-disable-next-line no-console
            console.error(errorObject);
        }
    }

    return { bootstrapGame };
}

export { createGame };
