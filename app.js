import { GameController } from "./game.js";
import { Wheel } from "./wheel.js";
import { createListenerBinder } from "./listeners.js";
import { StateManager } from "./state.js";
import { Board } from "./board.js";
import { NormalizationEngine, loadJson, pickRandomUnique } from "./utils.js";
import { AllergenCard } from "./firstCard.js";
import { ResultCard } from "./lastCard.js";
import { renderHearts, animateHeartGainFromReveal, animateHeartLossAtHeartsBar } from "./hearts.js";
import { MenuView } from "./menu.js";
import { MenuFilterController } from "./menuFilters.js";
import { NavigationController, resolveInitialNavState } from "./navigation.js";
import {
    primeAudioOnFirstGesture as primeAudioOnFirstGestureEffect,
    playTick as playTickEffect,
    playSiren as playSirenEffect,
    playNomNom as playNomNomEffect,
    playWin as playWinEffect
} from "./audio.js";
import { openRestartConfirmation, setWheelControlToStop, setWheelControlToStartGame, showScreen } from "./ui.js";
import { renderAvatarSelector, buildAvatarDescriptorMap } from "./avatarRenderer.js";
import {
    ControlElementId,
    AttributeName,
    AttributeBooleanValue,
    BrowserEventName,
    DocumentReadyState,
    FirstCardElementId,
    ResultCardElementId,
    AvatarId,
    AvatarCatalog,
    AvatarClassName,
    AvatarMenuText,
    ScreenName,
    MenuElementId
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

const setDocumentStartButtonBlockedState = (shouldBlockStartButton) => {
    const startButtonElement = document.getElementById(ControlElementId.START_BUTTON);
    if (!startButtonElement) {
        return;
    }

    const blockedAttributeName = AttributeName.DATA_BLOCKED;
    if (blockedAttributeName) {
        startButtonElement.setAttribute(
            blockedAttributeName,
            shouldBlockStartButton ? AttributeBooleanValue.TRUE : AttributeBooleanValue.FALSE
        );
    }

    const ariaDisabledAttributeName = AttributeName.ARIA_DISABLED;
    if (ariaDisabledAttributeName) {
        startButtonElement.setAttribute(
            ariaDisabledAttributeName,
            shouldBlockStartButton ? AttributeBooleanValue.TRUE : AttributeBooleanValue.FALSE
        );
    }
};

const menuPresenter = new MenuView({
    documentReference: document,
    menuTableBodyElement: document.getElementById(MenuElementId.TABLE_BODY)
});

const menuFilterController = new MenuFilterController({
    documentReference: document,
    menuPresenter,
    controlElementIdMap: MenuElementId,
    attributeNameMap: AttributeName
});

menuFilterController.initialize();

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

        setDocumentStartButtonBlockedState(false);

        const badgeEntry = {
            label: selectedLabel,
            emoji: allergenDescriptor.emoji || ""
        };
        firstCardPresenter.updateBadges([badgeEntry]);

        if (menuPresenter && typeof menuPresenter.updateSelectedAllergen === "function") {
            menuPresenter.updateSelectedAllergen({
                token: allergenDescriptor.token,
                label: selectedLabel
            });
        }
    }
});

const avatarDescriptorMap = buildAvatarDescriptorMap(AvatarCatalog);

const avatarResourceMap = new Map();
for (const avatarDescriptor of AvatarCatalog) {
    avatarResourceMap.set(avatarDescriptor.id, avatarDescriptor.assetPath);
}

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
const headerAvatarMenuElement = document.getElementById(ControlElementId.AVATAR_MENU);

let headerAvatarImageElement = null;
let headerAvatarLabelElement = null;

if (headerAvatarToggleElement && headerAvatarMenuElement) {
    const renderedAvatarElements = renderAvatarSelector({
        toggleButtonElement: headerAvatarToggleElement,
        menuContainerElement: headerAvatarMenuElement,
        selectedAvatarId: stateManager.getSelectedAvatar()
    });
    headerAvatarImageElement = renderedAvatarElements.imageElement;
    headerAvatarLabelElement = renderedAvatarElements.labelElement;
}

/**
 * Updates the header avatar image element with the resource mapped to the selected identifier.
 * Falls back to the default avatar asset when the provided identifier is not available.
 *
 * @param {string} avatarIdentifier - Identifier representing the avatar to display.
 */
const defaultAvatarDescriptor = avatarDescriptorMap.get(AvatarId.DEFAULT)
    || AvatarCatalog[0]
    || null;

const updateHeaderAvatarSelection = (avatarIdentifier) => {
    const resolvedAvatarDescriptor = avatarDescriptorMap.get(avatarIdentifier)
        || defaultAvatarDescriptor;

    if (!resolvedAvatarDescriptor) {
        return;
    }

    if (headerAvatarImageElement) {
        headerAvatarImageElement.src = resolvedAvatarDescriptor.assetPath;
        headerAvatarImageElement.alt = `${resolvedAvatarDescriptor.displayName}${AvatarMenuText.TOGGLE_ALT_SUFFIX}`;
    }

    if (headerAvatarLabelElement) {
        headerAvatarLabelElement.textContent = resolvedAvatarDescriptor.displayName;
    }
};

const heartsPresenter = {
    renderHearts,
    animateHeartGainFromReveal,
    animateHeartLossAtHeartsBar
};

let cachedAudioMutedState = stateManager.isAudioMuted();

const shouldPlayAudio = () => {
    const isMuted = stateManager.isAudioMuted();
    cachedAudioMutedState = isMuted;
    return isMuted === false;
};

const audioPresenter = {
    primeAudioOnFirstGesture: () => {
        primeAudioOnFirstGestureEffect();
    },
    playTick: (...args) => {
        if (!shouldPlayAudio()) {
            return;
        }
        playTickEffect(...args);
    },
    playSiren: (...args) => {
        if (!shouldPlayAudio()) {
            return;
        }
        playSirenEffect(...args);
    },
    playNomNom: (...args) => {
        if (!shouldPlayAudio()) {
            return;
        }
        playNomNomEffect(...args);
    },
    playWin: (...args) => {
        if (!shouldPlayAudio()) {
            return;
        }
        playWinEffect(...args);
    },
    handleMuteToggle: (isMuted) => {
        cachedAudioMutedState = Boolean(isMuted);
    }
};

let navigationController = null;

const applyNavigationState = (screenName) => {
    if (navigationController && typeof navigationController.updateActiveScreen === "function") {
        navigationController.updateActiveScreen(screenName);
    }
};

const navAwareShowScreen = (screenName) => {
    showScreen(screenName);
    applyNavigationState(screenName);
};

const uiPresenter = {
    showScreen: navAwareShowScreen,
    setWheelControlToStop,
    setWheelControlToStartGame,
    openRestartConfirmation
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
    menuPresenter,
    uiPresenter,
    dataLoader,
    createNormalizationEngine,
    pickRandomUnique
});

navigationController = new NavigationController({
    documentReference: document,
    controlElementIdMap: ControlElementId,
    attributeNameMap: AttributeName,
    onScreenChange: (targetScreenName) => {
        const resolvedTarget = targetScreenName === ScreenName.MENU
            ? ScreenName.MENU
            : ScreenName.ALLERGY;
        navAwareShowScreen(resolvedTarget);
    }
});

navigationController.initialize();
navAwareShowScreen(resolveInitialNavState());

stateManager.initialize();

if (typeof menuPresenter.updateSelectedAllergen === "function") {
    menuPresenter.updateSelectedAllergen({
        token: stateManager.getSelectedAllergenToken(),
        label: stateManager.getSelectedAllergenLabel()
    });
}

listenerBinder.wireAvatarSelector({
    onAvatarChange: (avatarIdentifier) => {
        stateManager.setSelectedAvatar(avatarIdentifier);
        const resolvedAvatarIdentifier = stateManager.getSelectedAvatar();
        revealCardPresenter.updateAvatarSelection(resolvedAvatarIdentifier);
        updateHeaderAvatarSelection(resolvedAvatarIdentifier);
    }
});

updateHeaderAvatarSelection(stateManager.getSelectedAvatar());

const bootstrapGameWhenDocumentIsReady = () => {
    gameController.bootstrap();
};

if (document.readyState !== DocumentReadyState.LOADING) {
    bootstrapGameWhenDocumentIsReady();
}

document.addEventListener(
    BrowserEventName.DOM_CONTENT_LOADED,
    bootstrapGameWhenDocumentIsReady
);
