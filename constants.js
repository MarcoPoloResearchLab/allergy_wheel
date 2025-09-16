/* File: constants.js */

export const ScreenName = Object.freeze({
    ALLERGY: "allergy",
    WHEEL: "wheel"
});


export const WheelControlMode = Object.freeze({
    STOP: "stop",
    START: "start"
});


export const ControlElementId = Object.freeze({
    START_BUTTON: "start",
    STOP_BUTTON: "stop",
    FULLSCREEN_BUTTON: "fs",
    SPIN_AGAIN_BUTTON: "again",
    REVEAL_SECTION: "reveal",
    GAME_OVER_SECTION: "gameover",
    RESTART_BUTTON: "restart"
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
    ARIA_LABEL: "aria-label"
});

export const AttributeBooleanValue = Object.freeze({
    TRUE: "true",
    FALSE: "false"
});

export const BrowserEventName = Object.freeze({
    DOM_CONTENT_LOADED: "DOMContentLoaded",
    CLICK: "click",
    KEY_DOWN: "keydown",
    CHANGE: "change"
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
