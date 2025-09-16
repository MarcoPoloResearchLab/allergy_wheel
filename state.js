import { MODE_STOP, MODE_START } from "./constants.js";

const DEFAULT_INITIAL_HEARTS_COUNT = 5;

const gameState = {
    board: null,
    initialHeartsCount: DEFAULT_INITIAL_HEARTS_COUNT,
    heartsCount: DEFAULT_INITIAL_HEARTS_COUNT,
    selectedAllergenToken: null,
    selectedAllergenLabel: "",
    wheelCandidateDishes: [],
    wheelCandidateLabels: [],
    stopButtonMode: MODE_STOP
};

function initializeState({ initialHeartsCount = DEFAULT_INITIAL_HEARTS_COUNT, initialStopButtonMode = MODE_STOP } = {}) {
    if (typeof initialHeartsCount !== "number" || Number.isNaN(initialHeartsCount)) {
        throw new Error("initializeState requires a numeric initialHeartsCount");
    }
    gameState.initialHeartsCount = initialHeartsCount;
    gameState.heartsCount = initialHeartsCount;
    gameState.stopButtonMode = initialStopButtonMode === MODE_START ? MODE_START : MODE_STOP;
    gameState.selectedAllergenToken = null;
    gameState.selectedAllergenLabel = "";
    gameState.wheelCandidateDishes = [];
    gameState.wheelCandidateLabels = [];
    gameState.board = null;
}

function setBoard(boardInstance) {
    gameState.board = boardInstance || null;
}

function getBoard() {
    return gameState.board;
}

function setSelectedAllergen({ token, label }) {
    gameState.selectedAllergenToken = token || null;
    gameState.selectedAllergenLabel = label || "";
}

function clearSelectedAllergen() {
    gameState.selectedAllergenToken = null;
    gameState.selectedAllergenLabel = "";
}

function getSelectedAllergenToken() {
    return gameState.selectedAllergenToken;
}

function getSelectedAllergenLabel() {
    return gameState.selectedAllergenLabel;
}

function hasSelectedAllergen() {
    return Boolean(gameState.selectedAllergenToken);
}

function setWheelCandidates({ dishes = [], labels = [] }) {
    gameState.wheelCandidateDishes = Array.isArray(dishes) ? dishes.slice() : [];
    gameState.wheelCandidateLabels = Array.isArray(labels) ? labels.slice() : [];
}

function resetWheelCandidates() {
    gameState.wheelCandidateDishes = [];
    gameState.wheelCandidateLabels = [];
}

function getWheelCandidateDishes() {
    return gameState.wheelCandidateDishes.slice();
}

function getWheelCandidateLabels() {
    return gameState.wheelCandidateLabels.slice();
}

function setHeartsCount(newHeartsCount) {
    if (typeof newHeartsCount !== "number" || Number.isNaN(newHeartsCount)) {
        throw new Error("setHeartsCount requires a numeric value");
    }
    gameState.heartsCount = Math.max(0, Math.floor(newHeartsCount));
}

function incrementHeartsCount() {
    gameState.heartsCount += 1;
    return gameState.heartsCount;
}

function decrementHeartsCount() {
    gameState.heartsCount = Math.max(0, gameState.heartsCount - 1);
    return gameState.heartsCount;
}

function getInitialHeartsCount() {
    return gameState.initialHeartsCount;
}

function setStopButtonMode(mode) {
    gameState.stopButtonMode = mode === MODE_START ? MODE_START : MODE_STOP;
}

function getStopButtonMode() {
    return gameState.stopButtonMode;
}

export {
    initializeState,
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
    setStopButtonMode,
    getStopButtonMode
};
