import {
    ButtonText,
    ScreenName,
    WheelControlMode,
    BrowserEventName,
    AttributeBooleanValue,
    DocumentElementId
} from "./constants.js";

const WheelConfiguration = Object.freeze({
    SEGMENT_COUNT: 8,
    DEFAULT_SPIN_DURATION_MS: 30000,
    WIN_CONDITION_HEARTS: 10,
    MIN_RANDOM_SPIN_DURATION_MS: 22000,
    MAX_RANDOM_SPIN_DURATION_MS: 34000,
    MIN_RANDOM_REVOLUTIONS: 3,
    MAX_RANDOM_REVOLUTIONS: 6
});

const WheelLabelFallback = Object.freeze({
    NO_SELECTION: { label: "No selection", emoji: "" },
    NO_MATCHES: { label: "No matches", emoji: "" }
});

const ButtonClassName = Object.freeze({
    ACTION: "action",
    START: "is-start",
    STOP: "is-stop",
    PRIMARY: "primary",
    DANGER: "danger"
});

const GameErrorMessage = Object.freeze({
    MISSING_DEPENDENCIES: "GameController requires wheel, board, listenerBinder, stateManager, uiPresenter, firstCardPresenter, revealCardPresenter, heartsPresenter, audioPresenter, dataLoader, createNormalizationEngine, and pickRandomUnique.",
    INVALID_DATA_LOADER: "GameController requires dataLoader.loadJson to be a function.",
    INVALID_NORMALIZATION_FACTORY: "GameController requires createNormalizationEngine to be a function.",
    INVALID_RANDOM_PICKER: "GameController requires pickRandomUnique to be a function.",
    NO_DISHES_FOR_ALLERGEN_PREFIX: "Invariant broken: no dishes for allergen token"
});

const DataPath = Object.freeze({
    ALLERGENS: "./data/allergens.json",
    DISHES: "./data/dishes.json",
    NORMALIZATION: "./data/normalization.json",
    COUNTRIES: "./data/countries.json",
    INGREDIENTS: "./data/ingredients.json"
});

const DataValidationMessage = Object.freeze({
    ALLERGENS: "allergens.json is missing or empty",
    DISHES: "dishes.json is missing or empty",
    NORMALIZATION: "normalization.json is missing or empty",
    INGREDIENTS: "ingredients.json is missing or empty"
});

/**
 * Generates a random integer within the inclusive range defined by the provided bounds.
 * If the lower bound exceeds the upper bound, the values are swapped before generating the result.
 */
function generateRandomIntegerInclusive(minInclusive, maxInclusive) {
    const areBoundsInverted = minInclusive > maxInclusive;
    const normalizedMinimumInput = areBoundsInverted ? maxInclusive : minInclusive;
    const normalizedMaximumInput = areBoundsInverted ? minInclusive : maxInclusive;

    const minimum = Math.ceil(normalizedMinimumInput);
    const maximum = Math.floor(normalizedMaximumInput);

    return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function chooseRandomSpinDurationMs() {
    return generateRandomIntegerInclusive(
        WheelConfiguration.MIN_RANDOM_SPIN_DURATION_MS,
        WheelConfiguration.MAX_RANDOM_SPIN_DURATION_MS
    );
}

function chooseRandomRevolutions() {
    return generateRandomIntegerInclusive(
        WheelConfiguration.MIN_RANDOM_REVOLUTIONS,
        WheelConfiguration.MAX_RANDOM_REVOLUTIONS
    );
}

function shuffleArrayInPlace(targetArray) {
    for (let index = targetArray.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        const temporaryValue = targetArray[index];
        targetArray[index] = targetArray[randomIndex];
        targetArray[randomIndex] = temporaryValue;
    }
}

function formatMissingDishesMessage(allergenToken) {
    return `${GameErrorMessage.NO_DISHES_FOR_ALLERGEN_PREFIX} '${allergenToken}'`;
}

export class GameController {
    #documentReference;

    #controlElementIdMap;

    #attributeNameMap;

    #wheel;

    #listenerBinder;

    #board;

    #stateManager;

    #firstCardPresenter;

    #revealCardPresenter;

    #heartsPresenter;

    #audioPresenter;

    #uiPresenter;

    #dataLoader;

    #createNormalizationEngine;

    #pickRandomUnique;

    #cuisineToFlagMap;

    #ingredientEmojiByName;

    #normalizationEngine;

    constructor({
        documentReference = document,
        controlElementIdMap,
        attributeNameMap,
        wheel,
        listenerBinder,
        board,
        stateManager,
        firstCardPresenter,
        revealCardPresenter,
        heartsPresenter,
        audioPresenter,
        uiPresenter,
        dataLoader,
        createNormalizationEngine,
        pickRandomUnique
    }) {
        if (!wheel || !board || !listenerBinder || !stateManager || !uiPresenter || !firstCardPresenter
            || !revealCardPresenter || !heartsPresenter || !audioPresenter || !dataLoader) {
            throw new Error(GameErrorMessage.MISSING_DEPENDENCIES);
        }
        if (typeof dataLoader.loadJson !== "function") {
            throw new Error(GameErrorMessage.INVALID_DATA_LOADER);
        }
        if (typeof createNormalizationEngine !== "function") {
            throw new Error(GameErrorMessage.INVALID_NORMALIZATION_FACTORY);
        }
        if (typeof pickRandomUnique !== "function") {
            throw new Error(GameErrorMessage.INVALID_RANDOM_PICKER);
        }

        this.#documentReference = documentReference;
        this.#controlElementIdMap = controlElementIdMap || {};
        this.#attributeNameMap = attributeNameMap || {};
        this.#wheel = wheel;
        this.#listenerBinder = listenerBinder;
        this.#board = board;
        this.#stateManager = stateManager;
        this.#firstCardPresenter = firstCardPresenter;
        this.#revealCardPresenter = revealCardPresenter;
        this.#heartsPresenter = heartsPresenter;
        this.#audioPresenter = audioPresenter;
        this.#uiPresenter = uiPresenter;
        this.#dataLoader = dataLoader;
        this.#createNormalizationEngine = createNormalizationEngine;
        this.#pickRandomUnique = pickRandomUnique;
        this.#cuisineToFlagMap = new Map();
        this.#ingredientEmojiByName = new Map();
        this.#normalizationEngine = null;
    }

    async bootstrap() {
        try {
            const gameData = await this.#loadGameData();
            this.#prepareBoardAndState(gameData);
            this.#initializeSelectionUi(gameData.allergensCatalog);
            this.#configureWheel();
            this.#wireControlListeners();
            this.#finalizeBootstrap();
        } catch (errorObject) {
            this.#handleBootstrapError(errorObject);
        }
    }

    async #loadGameData() {
        const { loadJson } = this.#dataLoader;

        const [
            allergensCatalog,
            dishesCatalog,
            normalizationRules,
            countriesCatalog,
            ingredientsCatalog
        ] = await Promise.all([
            loadJson(DataPath.ALLERGENS),
            loadJson(DataPath.DISHES),
            loadJson(DataPath.NORMALIZATION),
            loadJson(DataPath.COUNTRIES),
            loadJson(DataPath.INGREDIENTS)
        ]);

        if (!Array.isArray(allergensCatalog) || allergensCatalog.length === 0) {
            throw new Error(DataValidationMessage.ALLERGENS);
        }
        if (!Array.isArray(dishesCatalog) || dishesCatalog.length === 0) {
            throw new Error(DataValidationMessage.DISHES);
        }
        if (!Array.isArray(normalizationRules) || normalizationRules.length === 0) {
            throw new Error(DataValidationMessage.NORMALIZATION);
        }
        if (!Array.isArray(ingredientsCatalog) || ingredientsCatalog.length === 0) {
            throw new Error(DataValidationMessage.INGREDIENTS);
        }

        return {
            allergensCatalog,
            dishesCatalog,
            normalizationRules,
            countriesCatalog,
            ingredientsCatalog
        };
    }

    #prepareBoardAndState({
        allergensCatalog,
        dishesCatalog,
        normalizationRules,
        countriesCatalog,
        ingredientsCatalog
    }) {
        this.#normalizationEngine = this.#createNormalizationEngine(normalizationRules);
        this.#board.allergensCatalog = allergensCatalog;
        this.#board.dishesCatalog = dishesCatalog;
        this.#board.normalizationEngine = this.#normalizationEngine;
        this.#board.buildDishIndexByAllergen();
        this.#board.throwIfAnyAllergenHasNoDishes();

        this.#stateManager.setBoard(this.#board);

        this.#cuisineToFlagMap = this.#buildCuisineFlagMap(countriesCatalog);
        this.#ingredientEmojiByName = this.#buildIngredientEmojiMap(ingredientsCatalog);

        if (this.#revealCardPresenter && typeof this.#revealCardPresenter.updateDataDependencies === "function") {
            this.#revealCardPresenter.updateDataDependencies({
                normalizationEngine: this.#normalizationEngine,
                allergensCatalog,
                cuisineToFlagMap: this.#cuisineToFlagMap,
                ingredientEmojiByName: this.#ingredientEmojiByName
            });
        }

        const initialHeartsCount = this.#stateManager.getInitialHeartsCount();
        this.#stateManager.setHeartsCount(initialHeartsCount);
        this.#heartsPresenter.renderHearts(initialHeartsCount, { animate: false });
    }

    #buildCuisineFlagMap(countriesCatalog) {
        const cuisineMap = new Map();
        if (Array.isArray(countriesCatalog)) {
            for (const record of countriesCatalog) {
                const cuisineKey = String(record && record.cuisine ? record.cuisine : "")
                    .trim()
                    .toLowerCase();
                const flagEmoji = String(record && record.flag ? record.flag : "");
                if (cuisineKey) {
                    cuisineMap.set(cuisineKey, flagEmoji);
                }
            }
        }
        return cuisineMap;
    }

    #buildIngredientEmojiMap(ingredientsCatalog) {
        const emojiMap = new Map();
        for (const ingredientRecord of ingredientsCatalog) {
            const nameKey = String(ingredientRecord && ingredientRecord.name ? ingredientRecord.name : "")
                .trim()
                .toLowerCase();
            const emojiValue = String(ingredientRecord && ingredientRecord.emoji ? ingredientRecord.emoji : "");
            if (nameKey) {
                emojiMap.set(nameKey, emojiValue);
            }
        }
        return emojiMap;
    }

    #initializeSelectionUi(allergensCatalog) {
        if (!this.#firstCardPresenter || typeof this.#firstCardPresenter.renderAllergens !== "function") {
            return;
        }

        this.#firstCardPresenter.renderAllergens(allergensCatalog);

        const startButton = this.#documentReference.getElementById(this.#controlElementIdMap.START_BUTTON);
        if (startButton) {
            startButton.disabled = true;
        }
        if (typeof this.#firstCardPresenter.updateBadges === "function") {
            this.#firstCardPresenter.updateBadges([]);
        }
    }

    #configureWheel() {
        const wheelElement = this.#documentReference.getElementById(DocumentElementId.WHEEL_CANVAS);
        if (this.#wheel.initialize) {
            this.#wheel.initialize(wheelElement);
        }
        if (this.#wheel.setSpinDuration) {
            this.#wheel.setSpinDuration(WheelConfiguration.DEFAULT_SPIN_DURATION_MS);
        }
        if (this.#wheel.registerSpinCallbacks) {
            this.#wheel.registerSpinCallbacks({
                onTick: () => {
                    if (this.#audioPresenter.playTick) {
                        this.#audioPresenter.playTick();
                    }
                    if (this.#wheel.triggerPointerTap) {
                        this.#wheel.triggerPointerTap();
                    }
                },
                onStop: (winnerIndex) => {
                    this.#handleSpinResult(winnerIndex);
                }
            });
        }
    }

    #wireControlListeners() {
        const {
            wireStartButton,
            wireStopButton,
            wireFullscreenButton,
            wireSpinAgainButton,
            wireRevealBackdropDismissal,
            wireRestartButton
        } = this.#listenerBinder;

        if (typeof wireStartButton === "function") {
            wireStartButton({
                onStartRequested: () => {
                    if (this.#uiPresenter.showScreen) {
                        this.#uiPresenter.showScreen(ScreenName.WHEEL);
                    }
                    if (this.#wheel.ensureSize) {
                        this.#wheel.ensureSize();
                    }
                    this.#startSpinWithFreshState();
                }
            });
        }
        if (typeof wireStopButton === "function") {
            wireStopButton({
                onStopRequested: () => {
                    if (this.#wheel.stop) {
                        this.#wheel.stop();
                    }
                },
                onShowAllergyScreen: () => {
                    if (this.#uiPresenter.showScreen) {
                        this.#uiPresenter.showScreen(ScreenName.ALLERGY);
                    }
                }
            });
        }
        if (typeof wireFullscreenButton === "function") {
            wireFullscreenButton();
        }
        if (typeof wireSpinAgainButton === "function") {
            wireSpinAgainButton({
                onSpinAgain: () => {
                    this.#startSpinWithFreshState();
                }
            });
        }
        if (typeof wireRevealBackdropDismissal === "function") {
            wireRevealBackdropDismissal();
        }
        if (typeof wireRestartButton === "function") {
            wireRestartButton({
                onRestart: () => {
                    this.#resetGame();
                }
            });
        }

        if (this.#audioPresenter.primeAudioOnFirstGesture) {
            this.#audioPresenter.primeAudioOnFirstGesture();
        }
    }

    #finalizeBootstrap() {
        const loadingElement = this.#documentReference.getElementById(DocumentElementId.LOADING);
        if (loadingElement) {
            loadingElement.hidden = true;
        }
        const loadErrorElement = this.#documentReference.getElementById(DocumentElementId.LOAD_ERROR);
        if (loadErrorElement) {
            loadErrorElement.hidden = true;
        }
        if (this.#uiPresenter.showScreen) {
            this.#uiPresenter.showScreen(ScreenName.ALLERGY);
        }
    }

    #handleBootstrapError(errorObject) {
        const loadingElement = this.#documentReference.getElementById(DocumentElementId.LOADING);
        if (loadingElement) {
            loadingElement.hidden = true;
        }
        const loadErrorElement = this.#documentReference.getElementById(DocumentElementId.LOAD_ERROR);
        if (loadErrorElement) {
            loadErrorElement.hidden = false;
        }
        // eslint-disable-next-line no-console
        console.error(errorObject);
    }

    #startSpinWithFreshState() {
        if (!this.#stateManager.hasSelectedAllergen || !this.#stateManager.hasSelectedAllergen()) {
            return;
        }

        this.#recomputeWheelFromSelection();
        const candidateLabels = this.#stateManager.getWheelCandidateLabels
            ? this.#stateManager.getWheelCandidateLabels()
            : [];
        if (!candidateLabels.length) {
            return;
        }

        if (this.#wheel.resetForNewSpin) {
            this.#wheel.resetForNewSpin({ randomizeStart: true });
        }
        if (this.#wheel.setRevolutions) {
            this.#wheel.setRevolutions(chooseRandomRevolutions());
        }
        if (this.#wheel.setSpinDuration) {
            this.#wheel.setSpinDuration(chooseRandomSpinDurationMs());
        }

        this.#applyStopMode();
        const randomIndex = generateRandomIntegerInclusive(0, candidateLabels.length - 1);
        if (this.#wheel.spin) {
            this.#wheel.spin(randomIndex);
        }
    }

    #recomputeWheelFromSelection() {
        const boardInstance = this.#stateManager.getBoard ? this.#stateManager.getBoard() : null;
        const selectedToken = this.#stateManager.getSelectedAllergenToken
            ? this.#stateManager.getSelectedAllergenToken()
            : null;

        if (!boardInstance || !selectedToken) {
            if (this.#stateManager.resetWheelCandidates) {
                this.#stateManager.resetWheelCandidates();
            }
            if (this.#wheel.setLabels) {
                this.#wheel.setLabels([WheelLabelFallback.NO_SELECTION]);
            }
            if (this.#wheel.draw) {
                this.#wheel.draw();
            }
            return;
        }

        const matchingDishes = boardInstance.getDishesForAllergen(selectedToken);
        if (!Array.isArray(matchingDishes) || matchingDishes.length === 0) {
            throw new Error(formatMissingDishesMessage(selectedToken));
        }

        const anchorIndex = generateRandomIntegerInclusive(0, matchingDishes.length - 1);
        const anchorDish = matchingDishes[anchorIndex];
        const catalog = Array.isArray(boardInstance.dishesCatalog) ? boardInstance.dishesCatalog : [];

        const slotsToFill = Math.max(0, WheelConfiguration.SEGMENT_COUNT - 1);
        const pool = catalog.filter((dish) => dish !== anchorDish);

        let fillerDishes = [];
        if (pool.length >= slotsToFill) {
            fillerDishes = this.#pickRandomUnique(pool, slotsToFill);
        } else {
            fillerDishes = pool.slice();
            while (fillerDishes.length < slotsToFill && catalog.length > 0) {
                const randomDish = catalog[generateRandomIntegerInclusive(0, catalog.length - 1)];
                fillerDishes.push(randomDish);
            }
        }

        const chosenDishes = [anchorDish, ...fillerDishes];
        shuffleArrayInPlace(chosenDishes);

        const limitedDishes = chosenDishes.slice(0, WheelConfiguration.SEGMENT_COUNT);
        const candidateLabels = limitedDishes
            .map((dish) => ({ label: boardInstance.getDishLabel(dish), emoji: dish.emoji || "" }))
            .filter((entry) => entry.label)
            .slice(0, WheelConfiguration.SEGMENT_COUNT);

        if (this.#stateManager.setWheelCandidates) {
            this.#stateManager.setWheelCandidates({ dishes: limitedDishes, labels: candidateLabels });
        }

        const wheelLabels = candidateLabels.length ? candidateLabels : [WheelLabelFallback.NO_MATCHES];
        if (this.#wheel.setLabels) {
            this.#wheel.setLabels(wheelLabels);
        }
        if (this.#wheel.draw) {
            this.#wheel.draw();
        }
    }

    #handleSpinResult(winnerIndex) {
        const candidateDishes = this.#stateManager.getWheelCandidateDishes
            ? this.#stateManager.getWheelCandidateDishes()
            : [];
        const dish = candidateDishes[winnerIndex];
        if (!dish) {
            this.#applyStartMode();
            return;
        }

        const revealInfo = this.#revealCardPresenter.populateRevealCard
            ? this.#revealCardPresenter.populateRevealCard({
                dish,
                selectedAllergenToken: this.#stateManager.getSelectedAllergenToken
                    ? this.#stateManager.getSelectedAllergenToken()
                    : null,
                selectedAllergenLabel: this.#stateManager.getSelectedAllergenLabel
                    ? this.#stateManager.getSelectedAllergenLabel()
                    : ""
            })
            : { hasTriggeringIngredient: false };

        let heartsCountAfterSpin;
        if (revealInfo && revealInfo.hasTriggeringIngredient) {
            if (this.#heartsPresenter.animateHeartLossAtHeartsBar) {
                this.#heartsPresenter.animateHeartLossAtHeartsBar();
            }
            heartsCountAfterSpin = this.#stateManager.decrementHeartsCount
                ? this.#stateManager.decrementHeartsCount()
                : 0;
            if (this.#audioPresenter.playSiren) {
                this.#audioPresenter.playSiren(1800);
            }
        } else {
            if (this.#heartsPresenter.animateHeartGainFromReveal) {
                this.#heartsPresenter.animateHeartGainFromReveal();
            }
            heartsCountAfterSpin = this.#stateManager.incrementHeartsCount
                ? this.#stateManager.incrementHeartsCount()
                : 0;
            if (this.#audioPresenter.playNomNom) {
                this.#audioPresenter.playNomNom(1200);
            }
        }

        if (this.#heartsPresenter.renderHearts) {
            this.#heartsPresenter.renderHearts(heartsCountAfterSpin, { animate: true });
        }

        if (heartsCountAfterSpin === 0) {
            if (this.#revealCardPresenter.showGameOver) {
                this.#revealCardPresenter.showGameOver();
            }
            this.#applyStartMode();
            return;
        }

        if (heartsCountAfterSpin >= WheelConfiguration.WIN_CONDITION_HEARTS) {
            const winningCardInfo = this.#revealCardPresenter.showWinningCard
                ? this.#revealCardPresenter.showWinningCard()
                : { restartButton: null, isDisplayed: false };
            if (this.#audioPresenter.playWin) {
                this.#audioPresenter.playWin();
            }
            if (winningCardInfo && winningCardInfo.restartButton) {
                winningCardInfo.restartButton.addEventListener(BrowserEventName.CLICK, () => {
                    const revealSection = this.#documentReference.getElementById(this.#controlElementIdMap.REVEAL_SECTION);
                    if (revealSection) {
                        revealSection.setAttribute(
                            this.#attributeNameMap.ARIA_HIDDEN,
                            AttributeBooleanValue.TRUE
                        );
                    }
                    this.#resetGame();
                });
            }
            this.#applyStartMode();
            return;
        }

        this.#applyStartMode();
    }

    #resetGame() {
        const initialHeartsCount = this.#stateManager.getInitialHeartsCount
            ? this.#stateManager.getInitialHeartsCount()
            : 0;
        if (this.#stateManager.setHeartsCount) {
            this.#stateManager.setHeartsCount(initialHeartsCount);
        }
        if (this.#heartsPresenter.renderHearts) {
            this.#heartsPresenter.renderHearts(initialHeartsCount, { animate: false });
        }
        if (this.#stateManager.clearSelectedAllergen) {
            this.#stateManager.clearSelectedAllergen();
        }
        if (this.#stateManager.resetWheelCandidates) {
            this.#stateManager.resetWheelCandidates();
        }
        const startButton = this.#documentReference.getElementById(this.#controlElementIdMap.START_BUTTON);
        if (startButton) {
            startButton.disabled = true;
        }
        if (typeof this.#firstCardPresenter.updateBadges === "function") {
            this.#firstCardPresenter.updateBadges([]);
        }
        if (this.#uiPresenter.showScreen) {
            this.#uiPresenter.showScreen(ScreenName.ALLERGY);
        }
        this.#applyStartMode();
    }

    #applyStartMode() {
        const centerButton = this.#documentReference.getElementById(this.#controlElementIdMap.STOP_BUTTON);
        if (!centerButton) {
            if (this.#stateManager.setStopButtonMode) {
                this.#stateManager.setStopButtonMode(WheelControlMode.START);
            }
            if (this.#uiPresenter.setWheelControlToStartGame) {
                this.#uiPresenter.setWheelControlToStartGame();
            }
            return;
        }
        centerButton.textContent = ButtonText.START;
        centerButton.classList.add(ButtonClassName.ACTION, ButtonClassName.START);
        centerButton.classList.remove(ButtonClassName.STOP, ButtonClassName.PRIMARY, ButtonClassName.DANGER);
        if (this.#stateManager.setStopButtonMode) {
            this.#stateManager.setStopButtonMode(WheelControlMode.START);
        }
        if (this.#uiPresenter.setWheelControlToStartGame) {
            this.#uiPresenter.setWheelControlToStartGame();
        }
    }

    #applyStopMode() {
        const centerButton = this.#documentReference.getElementById(this.#controlElementIdMap.STOP_BUTTON);
        if (!centerButton) {
            if (this.#stateManager.setStopButtonMode) {
                this.#stateManager.setStopButtonMode(WheelControlMode.STOP);
            }
            if (this.#uiPresenter.setWheelControlToStop) {
                this.#uiPresenter.setWheelControlToStop();
            }
            return;
        }
        centerButton.textContent = ButtonText.STOP;
        centerButton.classList.add(ButtonClassName.ACTION, ButtonClassName.STOP);
        centerButton.classList.remove(ButtonClassName.START, ButtonClassName.PRIMARY, ButtonClassName.DANGER);
        if (this.#stateManager.setStopButtonMode) {
            this.#stateManager.setStopButtonMode(WheelControlMode.STOP);
        }
        if (this.#uiPresenter.setWheelControlToStop) {
            this.#uiPresenter.setWheelControlToStop();
        }
    }
}
