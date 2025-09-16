import { GameController } from "./game.js";
import { Wheel } from "./wheel.js";
import { createListenerBinder } from "./listeners.js";
import { StateManager } from "./state.js";
import { Board } from "./board.js";
import { NormalizationEngine, loadJson, pickRandomUnique } from "./utils.js";
import { AllergenCard } from "./firstCard.js";
import { ResultCard, ElementId as ResultCardElementId } from "./lastCard.js";
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

const FirstCardElementId = Object.freeze({
    LIST_CONTAINER: "allergy-list",
    BADGE_CONTAINER: "sel-badges"
});

const stateManager = new StateManager();

const listenerBinder = createListenerBinder({
    controlElementId: ControlElementId,
    attributeName: AttributeName,
    documentReference: document,
    stateManager
});

const wheel = new Wheel();

const board = new Board({
    allergensCatalog: [],
    dishesCatalog: [],
    normalizationEngine: new NormalizationEngine([])
});

const firstCardPresenter = new AllergenCard({
    listContainerElement: document.getElementById(FirstCardElementId.LIST_CONTAINER),
    badgeContainerElement: document.getElementById(FirstCardElementId.BADGE_CONTAINER),
    onAllergenSelected: (allergenDescriptor) => {
        if (!allergenDescriptor || !allergenDescriptor.token) {
            return;
        }

        const selectedLabel = allergenDescriptor.label || allergenDescriptor.token;

        stateManager.setSelectedAllergen({
            token: allergenDescriptor.token,
            label: selectedLabel
        });

        const startButtonElement = document.getElementById(ControlElementId.START_BUTTON);
        if (startButtonElement) {
            startButtonElement.disabled = false;
        }

        const badgeEntry = {
            label: selectedLabel,
            emoji: allergenDescriptor.emoji || ""
        };
        firstCardPresenter.updateBadges([badgeEntry]);
    }
});

const revealCardPresenter = new ResultCard({
    documentReference: document,
    revealSectionElement: document.getElementById(ResultCardElementId.REVEAL_SECTION),
    dishTitleElement: document.getElementById(ResultCardElementId.DISH_TITLE),
    dishCuisineElement: document.getElementById(ResultCardElementId.DISH_CUISINE),
    resultBannerElement: document.getElementById(ResultCardElementId.RESULT_BANNER),
    resultTextElement: document.getElementById(ResultCardElementId.RESULT_TEXT),
    ingredientsContainerElement: document.getElementById(ResultCardElementId.INGREDIENTS_CONTAINER),
    faceSvgElement: document.getElementById(ResultCardElementId.FACE_SVG),
    gameOverSectionElement: document.getElementById(ResultCardElementId.GAME_OVER_SECTION),
    normalizationEngine: board.normalizationEngine,
    allergensCatalog: board.allergensCatalog,
    cuisineToFlagMap: new Map(),
    ingredientEmojiByName: new Map()
});

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

stateManager.initialize();

window.addEventListener(BrowserEventName.DOM_CONTENT_LOADED, () => {
    gameController.bootstrap();
});
