/* File: constants.js */

export const ScreenName = Object.freeze({
    ALLERGY: "allergy",
    WHEEL: "wheel",
    MENU: "menu"
});


const WheelControlModeStringStop = "stop";
const WheelControlModeStringStart = "start";

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
    STOP_BUTTON: "stop",
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
    NAV_MENU_BUTTON: "nav-menu"
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
    DATA_BLOCKED: "data-blocked"
});

export const AttributeBooleanValue = Object.freeze({
    TRUE: "true",
    FALSE: "false"
});

export const BrowserEventName = Object.freeze({
    DOM_CONTENT_LOADED: "DOMContentLoaded",
    CLICK: "click",
    KEY_DOWN: "keydown",
    CHANGE: "change",
    ANIMATION_END: "animationend"
});

export const KeyboardKey = Object.freeze({
    ESCAPE: "Escape",
    ESC: "Esc"
});

export const ButtonText = Object.freeze({
    START: "Start",
    STOP: "STOP",
    RESTART: "Restart",
    MUTE: "Mute",
    SOUND_ON: "Sound On"
});

export const AudioControlLabel = Object.freeze({
    MUTE_AUDIO: "Mute audio",
    UNMUTE_AUDIO: "Unmute audio"
});
