// @ts-check

/* File: constants.js */

export const ScreenName = Object.freeze({
    ALLERGY: "allergy",
    WHEEL: "wheel",
    MENU: "menu"
});


export const WheelConfiguration = Object.freeze({
    SEGMENT_COUNT: 8,
    DEFAULT_SPIN_DURATION_MS: 30000,
    WIN_CONDITION_HEARTS: 10,
    MIN_RANDOM_SPIN_DURATION_MS: 22000,
    MAX_RANDOM_SPIN_DURATION_MS: 34000,
    MIN_RANDOM_REVOLUTIONS: 3,
    MAX_RANDOM_REVOLUTIONS: 6
});

export const AllergenDistributionConfiguration = Object.freeze({
    MIN_HEARTS_FOR_DISTRIBUTION: 1,
    MAX_HEARTS_FOR_DISTRIBUTION: 9,
    MIN_ALLERGEN_SEGMENTS: 1,
    MAX_ALLERGEN_SEGMENTS: 7
});

export const WheelLabelFallback = Object.freeze({
    NO_SELECTION: Object.freeze({ label: "No selection", emoji: "" }),
    NO_MATCHES: Object.freeze({ label: "No matches", emoji: "" })
});

export const ButtonClassName = Object.freeze({
    ACTION: "action",
    START: "is-start",
    STOP: "is-stop",
    PRIMARY: "primary",
    DANGER: "danger"
});


const WheelControlModeStringStop = "stop";
const WheelControlModeStringStart = "start";
const WheelControlStopClassName = "wheel-control--stop-mode";
const WheelControlContainerElementId = "wheel-control";

const AvatarIdentifierSunnyGirl = "avatar-sunny-girl";
const AvatarIdentifierCuriousGirl = "avatar-curious-girl";
const AvatarIdentifierAdventurousBoy = "avatar-adventurous-boy";
const AvatarIdentifierCreativeBoy = "avatar-creative-boy";
const AvatarIdentifierTyrannosaurusRex = "avatar-tyrannosaurus-rex";
const AvatarIdentifierTriceratops = "avatar-triceratops";

export const MODE_STOP = WheelControlModeStringStop;
export const MODE_START = WheelControlModeStringStart;

export const WheelControlMode = Object.freeze({
    STOP: WheelControlModeStringStop,
    START: WheelControlModeStringStart
});

export const WheelControlClassName = Object.freeze({
    STOP_MODE: WheelControlStopClassName
});

const AvatarAssetPathSunnyGirl = "assets/avatars/sunny.svg";
const AvatarAssetPathCuriousGirl = "assets/avatars/sea.svg";
const AvatarAssetPathAdventurousBoy = "assets/avatars/adventurous-boy.svg";
const AvatarAssetPathCreativeBoy = "assets/avatars/sunny girl.svg";
const AvatarAssetPathTyrannosaurusRex = "assets/avatars/t-rex.svg";
const AvatarAssetPathTriceratops = "assets/avatars/triceratops.svg";

const AvatarDisplayNameSunnyGirl = "Earthling";
const AvatarDisplayNameCuriousGirl = "Marine";
const AvatarDisplayNameAdventurousBoy = "Adventurous Boy";
const AvatarDisplayNameCreativeBoy = "Sunny Girl";
const AvatarDisplayNameTyrannosaurusRex = "T-Rex";
const AvatarDisplayNameTriceratops = "Triceratops";

const AvatarCatalogEntries = Object.freeze([
    Object.freeze({
        key: "SUNNY_GIRL",
        id: AvatarIdentifierSunnyGirl,
        assetPath: AvatarAssetPathSunnyGirl,
        displayName: AvatarDisplayNameSunnyGirl
    }),
    Object.freeze({
        key: "CURIOUS_GIRL",
        id: AvatarIdentifierCuriousGirl,
        assetPath: AvatarAssetPathCuriousGirl,
        displayName: AvatarDisplayNameCuriousGirl
    }),
    Object.freeze({
        key: "ADVENTUROUS_BOY",
        id: AvatarIdentifierAdventurousBoy,
        assetPath: AvatarAssetPathAdventurousBoy,
        displayName: AvatarDisplayNameAdventurousBoy
    }),
    Object.freeze({
        key: "CREATIVE_BOY",
        id: AvatarIdentifierCreativeBoy,
        assetPath: AvatarAssetPathCreativeBoy,
        displayName: AvatarDisplayNameCreativeBoy
    }),
    Object.freeze({
        key: "TYRANNOSAURUS_REX",
        id: AvatarIdentifierTyrannosaurusRex,
        assetPath: AvatarAssetPathTyrannosaurusRex,
        displayName: AvatarDisplayNameTyrannosaurusRex
    }),
    Object.freeze({
        key: "TRICERATOPS",
        id: AvatarIdentifierTriceratops,
        assetPath: AvatarAssetPathTriceratops,
        displayName: AvatarDisplayNameTriceratops
    })
]);

const createAvatarMapByKey = (propertyName) => {
    const mapping = {};
    for (const descriptor of AvatarCatalogEntries) {
        mapping[descriptor.key] = descriptor[propertyName];
    }
    return mapping;
};

const createAvatarMapById = (propertyName) => {
    const mapping = {};
    for (const descriptor of AvatarCatalogEntries) {
        mapping[descriptor.id] = descriptor[propertyName];
    }
    return mapping;
};

const avatarIdByKey = createAvatarMapByKey("id");
avatarIdByKey.DEFAULT = AvatarIdentifierSunnyGirl;

export const AvatarId = Object.freeze(avatarIdByKey);

export const AvatarCatalog = AvatarCatalogEntries;

export const AvatarAssetPath = Object.freeze(createAvatarMapByKey("assetPath"));

export const AvatarDisplayName = Object.freeze(createAvatarMapById("displayName"));

const AudioAssetPathYamYam = "assets/audio/yam_yam.mp3";
const AudioAssetPathSiren = "assets/audio/ambulance_siren.mp3";

export const AudioAssetPath = Object.freeze({
    NOM_NOM: AudioAssetPathYamYam,
    SIREN: AudioAssetPathSiren
});

export const ControlElementId = Object.freeze({
    START_BUTTON: "start",
    WHEEL_CONTINUE_BUTTON: "wheel-continue",
    WHEEL_RESTART_BUTTON: "wheel-restart",
    WHEEL_CONTROL_CONTAINER: WheelControlContainerElementId,
    FULLSCREEN_BUTTON: "fs",
    MUTE_BUTTON: "mute",
    SPIN_AGAIN_BUTTON: "again",
    REVEAL_SECTION: "reveal",
    GAME_OVER_SECTION: "gameover",
    RESTART_BUTTON: "restart",
    AVATAR_TOGGLE: "avatar-toggle",
    AVATAR_MENU: "avatar-menu",
    AVATAR_MENU_BACKDROP: "avatar-menu-backdrop",
    ALLERGY_TITLE: "allergy-title",
    NAV_GAME_BUTTON: "nav-game",
    NAV_MENU_BUTTON: "nav-menu",
    RESTART_CONFIRMATION_CONTAINER: "restart-confirmation",
    RESTART_CONFIRMATION_OVERLAY: "restart-confirmation-overlay",
    RESTART_CONFIRMATION_DIALOG: "restart-confirmation-dialog",
    RESTART_CONFIRMATION_CONFIRM_BUTTON: "restart-confirmation-confirm",
    RESTART_CONFIRMATION_CANCEL_BUTTON: "restart-confirmation-cancel"
});

export const RestartConfirmationText = Object.freeze({
    TITLE: "Restart the game?",
    MESSAGE: "Are you sure you want to restart? Your current progress will be lost.",
    CONFIRM: "Yes, restart",
    CANCEL: "Continue playing"
});

const AvatarButtonClassName = "avatar-button";
const AvatarOptionClassName = "avatar-option";
const AvatarImageClassName = "avatar-image";
const AvatarLabelClassName = "avatar-label";
const AvatarMenuContainerClassName = "avatar-menu";
const AvatarMenuOpenClassName = "is-open";
const AvatarMenuBackdropClassName = "avatar-menu-backdrop";
const AvatarMenuBackdropVisibleClassName = "avatar-menu-backdrop--visible";

const VisuallyHiddenClassName = "visually-hidden";

const AvatarTogglePromptText = "Choose your avatar";
const AvatarToggleAltSuffixText = " avatar";
const AvatarOptionAltSuffixText = " avatar option";

export const AvatarClassName = Object.freeze({
    BUTTON: AvatarButtonClassName,
    OPTION: AvatarOptionClassName,
    IMAGE: AvatarImageClassName,
    LABEL: AvatarLabelClassName
});

export const AvatarMenuClassName = Object.freeze({
    CONTAINER: AvatarMenuContainerClassName,
    OPEN: AvatarMenuOpenClassName,
    BACKDROP: AvatarMenuBackdropClassName,
    BACKDROP_VISIBLE: AvatarMenuBackdropVisibleClassName
});

export const GlobalClassName = Object.freeze({
    VISUALLY_HIDDEN: VisuallyHiddenClassName
});

export const AvatarMenuText = Object.freeze({
    TOGGLE_PROMPT: AvatarTogglePromptText,
    TOGGLE_ALT_SUFFIX: AvatarToggleAltSuffixText,
    OPTION_ALT_SUFFIX: AvatarOptionAltSuffixText
});

const TitleAttentionClassName = "title--attention";

export const TitleClassName = Object.freeze({
    ATTENTION: TitleAttentionClassName
});

export const FirstCardElementId = Object.freeze({
    LIST_CONTAINER: "allergy-list",
    BADGE_CONTAINER: "sel-badges"
});

export const ResultCardElementId = Object.freeze({
    REVEAL_SECTION: ControlElementId.REVEAL_SECTION,
    DISH_TITLE: "dish-title",
    DISH_CUISINE: "dish-cuisine",
    RESULT_BANNER: "result",
    RESULT_TEXT: "result-text",
    INGREDIENTS_CONTAINER: "dish-ingredients",
    FACE_SVG: "face",
    GAME_OVER_SECTION: ControlElementId.GAME_OVER_SECTION,
    WIN_RESTART_BUTTON: "win-restart"
});

export const ScreenElementId = Object.freeze({
    ALLERGY: "screen-allergy",
    WHEEL: "screen-wheel",
    MENU: "screen-menu"
});

export const MenuElementId = Object.freeze({
    TABLE_BODY: "menu-table-body",
    INGREDIENT_FILTER_TOGGLE: "menu-ingredient-filter-toggle",
    INGREDIENT_FILTER_PANEL: "menu-ingredient-filter-panel",
    INGREDIENT_FILTER_LIST: "menu-ingredient-filter-list",
    INGREDIENT_FILTER_CLEAR: "menu-ingredient-filter-clear",
    CUISINE_FILTER_TOGGLE: "menu-cuisine-filter-toggle",
    CUISINE_FILTER_PANEL: "menu-cuisine-filter-panel",
    CUISINE_FILTER_LIST: "menu-cuisine-filter-list",
    CUISINE_FILTER_CLEAR: "menu-cuisine-filter-clear"
});

export const MenuFilterText = Object.freeze({
    FILTER_LABEL: "Filter",
    INGREDIENT_FILTER_ARIA_LABEL: "Filter ingredients",
    CUISINE_FILTER_ARIA_LABEL: "Filter cuisines",
    CLEAR_INGREDIENT_LABEL: "Clear ingredient filters",
    CLEAR_CUISINE_LABEL: "Clear cuisine filters",
    SELECT_ALL_LABEL: "Show all"
});

const MenuColumnLabelDishText = "Dish";
const MenuColumnLabelIngredientsText = "Ingredients";
const MenuColumnLabelCuisineText = "Cuisine";
const MenuColumnLabelStoryText = "Story";

export const MenuColumnLabel = Object.freeze({
    DISH: MenuColumnLabelDishText,
    INGREDIENTS: MenuColumnLabelIngredientsText,
    CUISINE: MenuColumnLabelCuisineText,
    STORY: MenuColumnLabelStoryText
});

export const DocumentElementId = Object.freeze({
    LOADING: "loading",
    LOAD_ERROR: "load-error",
    WHEEL_CANVAS: "wheel"
});

export const HeartsElementId = Object.freeze({
    HEARTS_BAR: "hearts-bar"
});

export const AttributeName = Object.freeze({
    ARIA_HIDDEN: "aria-hidden",
    ARIA_LABEL: "aria-label",
    ARIA_PRESSED: "aria-pressed",
    ARIA_EXPANDED: "aria-expanded",
    ARIA_HAS_POPUP: "aria-haspopup",
    ARIA_DISABLED: "aria-disabled",
    DATA_SCREEN: "data-screen",
    DATA_COUNT: "data-count",
    DATA_BLOCKED: "data-blocked",
    DATA_WHEEL_CONTROL_MODE: "data-wheel-control-mode",
    DATA_COLUMN_LABEL: "data-column-label"
});

export const AttributeBooleanValue = Object.freeze({
    TRUE: "true",
    FALSE: "false"
});

const DocumentReadyStateLoading = "loading";
const DocumentReadyStateInteractive = "interactive";
const DocumentReadyStateComplete = "complete";

export const DocumentReadyState = Object.freeze({
    LOADING: DocumentReadyStateLoading,
    INTERACTIVE: DocumentReadyStateInteractive,
    COMPLETE: DocumentReadyStateComplete
});

export const BrowserEventName = Object.freeze({
    DOM_CONTENT_LOADED: "DOMContentLoaded",
    CLICK: "click",
    KEY_DOWN: "keydown",
    CHANGE: "change",
    ANIMATION_END: "animationend",
    POINTER_DOWN: "pointerdown",
    TOUCH_START: "touchstart",
    VISIBILITY_CHANGE: "visibilitychange",
    RESIZE: "resize"
});

const KeyboardKeyEnter = "Enter";
const KeyboardKeySpace = " ";
const KeyboardKeySpacebar = "Spacebar";
const KeyboardKeyEscape = "Escape";
const KeyboardKeyEsc = "Esc";

export const KeyboardKey = Object.freeze({
    ENTER: KeyboardKeyEnter,
    SPACE: KeyboardKeySpace,
    SPACEBAR: KeyboardKeySpacebar,
    ESCAPE: KeyboardKeyEscape,
    ESC: KeyboardKeyEsc
});

export const ButtonText = Object.freeze({
    SPIN: "SPIN",
    STOP: "STOP",
    RESTART: "Restart",
    MUTE: "Mute",
    SOUND_ON: "Sound On"
});

export const AudioControlLabel = Object.freeze({
    MUTE_AUDIO: "Mute audio",
    UNMUTE_AUDIO: "Unmute audio"
});

export const DataPath = Object.freeze({
    ALLERGENS: "./data/allergens.json",
    DISHES: "./data/dishes.json",
    NORMALIZATION: "./data/normalization.json",
    COUNTRIES: "./data/countries.json",
    INGREDIENTS: "./data/ingredients.json"
});

export const DataValidationMessage = Object.freeze({
    ALLERGENS: "allergens.json is missing or empty",
    DISHES: "dishes.json is missing or empty",
    NORMALIZATION: "normalization.json is missing or empty",
    INGREDIENTS: "ingredients.json is missing or empty"
});

export const GameErrorMessage = Object.freeze({
    MISSING_DEPENDENCIES:
        "GameController requires wheel, board, listenerBinder, stateManager, uiPresenter, firstCardPresenter, revealCardPresenter, heartsPresenter, audioPresenter, menuPresenter, dataLoader, createNormalizationEngine, and pickRandomUnique.",
    INVALID_DATA_LOADER: "GameController requires dataLoader.loadJson to be a function.",
    INVALID_NORMALIZATION_FACTORY: "GameController requires createNormalizationEngine to be a function.",
    INVALID_RANDOM_PICKER: "GameController requires pickRandomUnique to be a function.",
    NO_DISHES_FOR_ALLERGEN_PREFIX: "Invariant broken: no dishes for allergen token"
});

export const BoardErrorMessage = Object.freeze({
    MISSING_DISHES_PREFIX: "Data invariant violated: no dishes found for allergen token(s):"
});

export const ListenerErrorMessage = Object.freeze({
    MISSING_DEPENDENCIES:
        "createListenerBinder requires controlElementId, attributeName, and stateManager",
    MISSING_STATE_MANAGER_METHODS:
        "createListenerBinder requires stateManager methods hasSelectedAllergen, getWheelControlMode, isAudioMuted, and toggleAudioMuted"
});

export const StateManagerErrorMessage = Object.freeze({
    INVALID_INITIAL_HEARTS_COUNT: "StateManager.initialize requires a numeric initialHeartsCount",
    INVALID_HEARTS_COUNT: "StateManager.setHeartsCount requires a numeric value"
});

export const AudioErrorMessage = Object.freeze({
    ASSET_LOAD_FAILURE: "Unable to load audio asset",
    ASSET_DECODE_FAILURE: "Unable to decode audio asset",
    SIREN_ASSET_LOAD_FAILURE: "Unable to load siren audio asset.",
    SIREN_DECODE_FAILURE: "Unable to decode siren audio asset.",
    FETCH_UNSUPPORTED: "Audio asset loading requires fetch support."
});

export const WheelErrorMessage = Object.freeze({
    MISSING_CANVAS: "Wheel requires a canvas element with a 2d context",
    MISSING_CONTEXT: "Wheel could not acquire a 2d drawing context"
});

export const StorageKey = Object.freeze({
    SELECTED_ALLERGEN_TOKEN: "allergyWheel.selectedAllergenToken",
    SELECTED_ALLERGEN_LABEL: "allergyWheel.selectedAllergenLabel"
});

export const MenuMessage = Object.freeze({
    NO_MATCHES: "No dishes match the selected filters."
});

export const LoadJsonErrorMessage = Object.freeze({
    PREFIX: "failed to load"
});

export const ResultCardText = Object.freeze({
    WIN_TITLE: "You Win! 🏆",
    WIN_MESSAGE: "Amazing! You collected 10 hearts!",
    SAFE_TO_EAT: "Safe to eat. Yummy!",
    RESULT_BAD_PREFIX: "Contains your allergen: "
});

export const HeartsText = Object.freeze({
    DELTA_GAIN: "+1",
    DELTA_LOSS: "-1",
    LABEL_SUFFIX: " hearts"
});
