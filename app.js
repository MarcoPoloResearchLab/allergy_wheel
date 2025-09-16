import { createGame } from "./game.js";
import { createListenerBinder } from "./listeners.js";
import { initializeState } from "./state.js";

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

const { bootstrapGame } = createGame({
    controlElementId: ControlElementId,
    attributeName: AttributeName,
    listeners: listenerBinder,
    documentReference: document
});

initializeState();

window.addEventListener(BrowserEventName.DOM_CONTENT_LOADED, () => {
    bootstrapGame();
});
