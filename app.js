import { GameController } from "./game.js";
import { Wheel } from "./wheel.js";
import { createListenerBinder } from "./listeners.js";
import {
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
    setStopButtonMode
} from "./state.js";
import { Board } from "./board.js";
import { NormalizationEngine, loadJson, pickRandomUnique } from "./utils.js";
import { renderAllergenList, refreshSelectedAllergenBadges } from "./firstCard.js";
import { populateRevealCard, showGameOver, showWinningCard } from "./lastCard.js";
import { renderHearts, animateHeartGainFromReveal, animateHeartLossAtHeartsBar } from "./hearts.js";
import { primeAudioOnFirstGesture, playTick, playSiren, playNomNom, playWin } from "./audio.js";
import { showScreen, setWheelControlToStop, setWheelControlToStartGame } from "./ui.js";

const ControlElementId = Object.freeze({
    START_BUTTON: "start",
    STOP_BUTTON: "stop",
    FULLSCREEN_BUTTON: "fs",
    SPIN_AGAIN_BUTTON: "again",
    REVEAL_SECTION: "reveal",
    GAME_OVER_SECTION: "gameover",
    RESTART_BUTTON: "restart"
});

const AttributeName = Object.freeze({
    ARIA_HIDDEN: "aria-hidden"
});

const BrowserEventName = Object.freeze({
    DOM_CONTENT_LOADED: "DOMContentLoaded"
});

const listenerBinder = createListenerBinder({
    controlElementId: ControlElementId,
    attributeName: AttributeName,
    documentReference: document
});

const wheel = new Wheel();

const board = new Board({
    allergensCatalog: [],
    dishesCatalog: [],
    normalizationEngine: new NormalizationEngine([])
});

const stateManager = {
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
};

const firstCardPresenter = {
    renderAllergenList,
    refreshSelectedAllergenBadges
};

const revealCardPresenter = {
    populateRevealCard,
    showGameOver,
    showWinningCard
};

const heartsPresenter = {
    renderHearts,
    animateHeartGainFromReveal,
    animateHeartLossAtHeartsBar
};

const audioPresenter = {
    primeAudioOnFirstGesture,
    playTick,
    playSiren,
    playNomNom,
    playWin
};

const uiPresenter = {
    showScreen,
    setWheelControlToStop,
    setWheelControlToStartGame
};

const dataLoader = {
    loadJson
};

const createNormalizationEngine = (ruleDescriptors) => new NormalizationEngine(ruleDescriptors);

const gameController = new GameController({
    documentReference: document,
    controlElementIdMap: ControlElementId,
    attributeNameMap: AttributeName,
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
});

initializeState();

window.addEventListener(BrowserEventName.DOM_CONTENT_LOADED, () => {
    gameController.bootstrap();
});
