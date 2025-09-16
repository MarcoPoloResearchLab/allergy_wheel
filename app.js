import { GameController } from "./game.js";
import { Wheel } from "./wheel.js";
import { createListenerBinder } from "./listeners.js";
import { StateManager } from "./state.js";
import { Board } from "./board.js";
import { NormalizationEngine, loadJson, pickRandomUnique } from "./utils.js";
import { AllergenCard } from "./firstCard.js";
import { ResultCard } from "./lastCard.js";
import { renderHearts, animateHeartGainFromReveal, animateHeartLossAtHeartsBar } from "./hearts.js";
import { primeAudioOnFirstGesture, playTick, playSiren, playNomNom, playWin } from "./audio.js";
import { showScreen, setWheelControlToStop, setWheelControlToStartGame } from "./ui.js";
import {
    ControlElementId,
    AttributeName,
    BrowserEventName,
    FirstCardElementId,
    ResultCardElementId,
    AvatarId,
    AvatarAssetPath,
    AvatarClassName
} from "./constants.js";

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

const avatarResourceMap = new Map([
    [AvatarId.SUNNY_GIRL, AvatarAssetPath.SUNNY_GIRL],
    [AvatarId.CURIOUS_GIRL, AvatarAssetPath.CURIOUS_GIRL],
    [AvatarId.ADVENTUROUS_BOY, AvatarAssetPath.ADVENTUROUS_BOY],
    [AvatarId.CREATIVE_BOY, AvatarAssetPath.CREATIVE_BOY]
]);

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
    ingredientEmojiByName: new Map(),
    avatarMap: avatarResourceMap,
    selectedAvatarId: stateManager.getSelectedAvatar()
});

const headerAvatarToggleElement = document.getElementById(ControlElementId.AVATAR_TOGGLE);
const headerAvatarImageElement = headerAvatarToggleElement
    ? headerAvatarToggleElement.getElementsByClassName(AvatarClassName.IMAGE)[0] || null
    : null;

/**
 * Updates the header avatar image element with the resource mapped to the selected identifier.
 * Falls back to the default avatar asset when the provided identifier is not available.
 *
 * @param {string} avatarIdentifier - Identifier representing the avatar to display.
 */
const updateHeaderAvatarImage = (avatarIdentifier) => {
    if (!headerAvatarImageElement) {
        return;
    }
    const resolvedAvatarResource =
        avatarResourceMap.get(avatarIdentifier) || avatarResourceMap.get(AvatarId.DEFAULT);
    if (resolvedAvatarResource) {
        headerAvatarImageElement.src = resolvedAvatarResource;
    }
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

stateManager.initialize();

listenerBinder.wireAvatarSelector({
    onAvatarChange: (avatarIdentifier) => {
        stateManager.setSelectedAvatar(avatarIdentifier);
        const resolvedAvatarIdentifier = stateManager.getSelectedAvatar();
        revealCardPresenter.updateAvatarSelection(resolvedAvatarIdentifier);
        updateHeaderAvatarImage(resolvedAvatarIdentifier);
    }
});

updateHeaderAvatarImage(stateManager.getSelectedAvatar());

window.addEventListener(BrowserEventName.DOM_CONTENT_LOADED, () => {
    gameController.bootstrap();
});
