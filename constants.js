/* File: constants.js */

export const ScreenName = Object.freeze({
    ALLERGY: "allergy",
    WHEEL: "wheel"
});


const WheelControlModeStringStop = "stop";
const WheelControlModeStringStart = "start";

const AvatarIdentifierSunnyGirl = "avatar-sunny-girl";
const AvatarIdentifierCuriousGirl = "avatar-curious-girl";
const AvatarIdentifierAdventurousBoy = "avatar-adventurous-boy";
const AvatarIdentifierCreativeBoy = "avatar-creative-boy";

export const MODE_STOP = WheelControlModeStringStop;
export const MODE_START = WheelControlModeStringStart;

export const WheelControlMode = Object.freeze({
    STOP: WheelControlModeStringStop,
    START: WheelControlModeStringStart
});

export const AvatarId = Object.freeze({
    DEFAULT: AvatarIdentifierSunnyGirl,
    SUNNY_GIRL: AvatarIdentifierSunnyGirl,
    CURIOUS_GIRL: AvatarIdentifierCuriousGirl,
    ADVENTUROUS_BOY: AvatarIdentifierAdventurousBoy,
    CREATIVE_BOY: AvatarIdentifierCreativeBoy
});

const AvatarAssetPathSunnyGirl = "assets/avatars/sunny-girl.svg";
const AvatarAssetPathCuriousGirl = "assets/avatars/curious-girl.svg";
const AvatarAssetPathAdventurousBoy = "assets/avatars/adventurous-boy.svg";
const AvatarAssetPathCreativeBoy = "assets/avatars/creative-boy.svg";

export const AvatarAssetPath = Object.freeze({
    SUNNY_GIRL: AvatarAssetPathSunnyGirl,
    CURIOUS_GIRL: AvatarAssetPathCuriousGirl,
    ADVENTUROUS_BOY: AvatarAssetPathAdventurousBoy,
    CREATIVE_BOY: AvatarAssetPathCreativeBoy
});

export const ControlElementId = Object.freeze({
    START_BUTTON: "start",
    STOP_BUTTON: "stop",
    FULLSCREEN_BUTTON: "fs",
    SPIN_AGAIN_BUTTON: "again",
    REVEAL_SECTION: "reveal",
    GAME_OVER_SECTION: "gameover",
    RESTART_BUTTON: "restart",
    AVATAR_TOGGLE: "avatar-toggle",
    AVATAR_MENU: "avatar-menu",
    ALLERGY_TITLE: "allergy-title"
});

const AvatarOptionClassName = "avatar-option";
const AvatarImageClassName = "avatar-image";
const AvatarMenuOpenClassName = "is-open";

export const AvatarClassName = Object.freeze({
    OPTION: AvatarOptionClassName,
    IMAGE: AvatarImageClassName
});

export const AvatarMenuClassName = Object.freeze({
    OPEN: AvatarMenuOpenClassName
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
    DATA_SCREEN: "data-screen",
    DATA_COUNT: "data-count",
    ARIA_LABEL: "aria-label",
    ARIA_EXPANDED: "aria-expanded"
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
    RESTART: "Restart"
});
