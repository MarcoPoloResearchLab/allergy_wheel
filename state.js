import { MODE_STOP, MODE_START } from "./constants.js";

const DEFAULT_INITIAL_HEARTS_COUNT = 5;

const TextValue = Object.freeze({
    EMPTY: ""
});

const StateManagerErrorMessage = Object.freeze({
    INVALID_INITIAL_HEARTS_COUNT: "StateManager.initialize requires a numeric initialHeartsCount",
    INVALID_HEARTS_COUNT: "StateManager.setHeartsCount requires a numeric value"
});

class StateManager {
    #board;

    #initialHeartsCount;

    #heartsCount;

    #selectedAllergenToken;

    #selectedAllergenLabel;

    #wheelCandidateDishes;

    #wheelCandidateLabels;

    #stopButtonMode;

    constructor({ initialHeartsCount = DEFAULT_INITIAL_HEARTS_COUNT, initialStopButtonMode = MODE_STOP } = {}) {
        this.initialize({ initialHeartsCount, initialStopButtonMode });
    }

    initialize({ initialHeartsCount = DEFAULT_INITIAL_HEARTS_COUNT, initialStopButtonMode = MODE_STOP } = {}) {
        if (typeof initialHeartsCount !== "number" || Number.isNaN(initialHeartsCount)) {
            throw new Error(StateManagerErrorMessage.INVALID_INITIAL_HEARTS_COUNT);
        }
        this.#initialHeartsCount = initialHeartsCount;
        this.#heartsCount = initialHeartsCount;
        this.#stopButtonMode = initialStopButtonMode === MODE_START ? MODE_START : MODE_STOP;
        this.#selectedAllergenToken = null;
        this.#selectedAllergenLabel = TextValue.EMPTY;
        this.#wheelCandidateDishes = [];
        this.#wheelCandidateLabels = [];
        this.#board = null;
    }

    setBoard(boardInstance) {
        this.#board = boardInstance || null;
    }

    getBoard() {
        return this.#board;
    }

    setSelectedAllergen({ token, label } = {}) {
        this.#selectedAllergenToken = token || null;
        this.#selectedAllergenLabel = label || TextValue.EMPTY;
    }

    clearSelectedAllergen() {
        this.#selectedAllergenToken = null;
        this.#selectedAllergenLabel = TextValue.EMPTY;
    }

    getSelectedAllergenToken() {
        return this.#selectedAllergenToken;
    }

    getSelectedAllergenLabel() {
        return this.#selectedAllergenLabel;
    }

    hasSelectedAllergen() {
        return Boolean(this.#selectedAllergenToken);
    }

    setWheelCandidates({ dishes = [], labels = [] } = {}) {
        this.#wheelCandidateDishes = Array.isArray(dishes) ? dishes.slice() : [];
        this.#wheelCandidateLabels = Array.isArray(labels) ? labels.slice() : [];
    }

    resetWheelCandidates() {
        this.#wheelCandidateDishes = [];
        this.#wheelCandidateLabels = [];
    }

    getWheelCandidateDishes() {
        return this.#wheelCandidateDishes.slice();
    }

    getWheelCandidateLabels() {
        return this.#wheelCandidateLabels.slice();
    }

    setHeartsCount(newHeartsCount) {
        if (typeof newHeartsCount !== "number" || Number.isNaN(newHeartsCount)) {
            throw new Error(StateManagerErrorMessage.INVALID_HEARTS_COUNT);
        }
        this.#heartsCount = Math.max(0, Math.floor(newHeartsCount));
    }

    incrementHeartsCount() {
        this.#heartsCount += 1;
        return this.#heartsCount;
    }

    decrementHeartsCount() {
        this.#heartsCount = Math.max(0, this.#heartsCount - 1);
        return this.#heartsCount;
    }

    getInitialHeartsCount() {
        return this.#initialHeartsCount;
    }

    setStopButtonMode(mode) {
        this.#stopButtonMode = mode === MODE_START ? MODE_START : MODE_STOP;
    }

    getStopButtonMode() {
        return this.#stopButtonMode;
    }
}

export { StateManager, DEFAULT_INITIAL_HEARTS_COUNT };
