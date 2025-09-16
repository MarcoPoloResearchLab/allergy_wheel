import { MODE_STOP } from "./constants.js";

const DomEventName = {
    CLICK: "click",
    KEY_DOWN: "keydown"
};

const KeyboardKey = {
    ESCAPE: "Escape",
    ESC: "Esc"
};

const AriaHiddenValue = {
    TRUE: "true",
    FALSE: "false"
};

const ListenerErrorMessage = {
    MISSING_DEPENDENCIES: "createListenerBinder requires controlElementId, attributeName, and stateManager",
    MISSING_STATE_MANAGER_METHODS: "createListenerBinder requires stateManager methods hasSelectedAllergen and getStopButtonMode"
};

function createListenerBinder({ controlElementId, attributeName, documentReference = document, stateManager }) {
    if (!controlElementId || !attributeName || !stateManager) {
        throw new Error(ListenerErrorMessage.MISSING_DEPENDENCIES);
    }
    if (typeof stateManager.hasSelectedAllergen !== "function" || typeof stateManager.getStopButtonMode !== "function") {
        throw new Error(ListenerErrorMessage.MISSING_STATE_MANAGER_METHODS);
    }

    function wireStartButton({ onStartRequested }) {
        const startButton = documentReference.getElementById(controlElementId.START_BUTTON);
        if (!startButton) return;
        startButton.addEventListener(DomEventName.CLICK, () => {
            if (!stateManager.hasSelectedAllergen()) return;
            if (typeof onStartRequested === "function") {
                onStartRequested();
            }
        });
    }

    function wireStopButton({ onStopRequested, onShowAllergyScreen }) {
        const stopButton = documentReference.getElementById(controlElementId.STOP_BUTTON);
        if (!stopButton) return;
        stopButton.addEventListener(DomEventName.CLICK, () => {
            if (stateManager.getStopButtonMode() === MODE_STOP) {
                if (typeof onStopRequested === "function") onStopRequested();
            } else if (typeof onShowAllergyScreen === "function") {
                onShowAllergyScreen();
            }
        });
    }

    function wireFullscreenButton() {
        const fullscreenButton = documentReference.getElementById(controlElementId.FULLSCREEN_BUTTON);
        if (!fullscreenButton) return;
        fullscreenButton.addEventListener(DomEventName.CLICK, () => {
            const rootElement = documentReference.documentElement;
            if (!documentReference.fullscreenElement) rootElement.requestFullscreen();
            else documentReference.exitFullscreen();
        });
    }

    function wireSpinAgainButton({ onSpinAgain }) {
        const spinAgainButton = documentReference.getElementById(controlElementId.SPIN_AGAIN_BUTTON);
        if (!spinAgainButton) return;
        spinAgainButton.addEventListener(DomEventName.CLICK, () => {
            const revealSection = documentReference.getElementById(controlElementId.REVEAL_SECTION);
            if (revealSection) {
                revealSection.setAttribute(attributeName.ARIA_HIDDEN, AriaHiddenValue.TRUE);
            }
            if (typeof onSpinAgain === "function") onSpinAgain();
        });
    }

    function wireRevealBackdropDismissal() {
        const revealSection = documentReference.getElementById(controlElementId.REVEAL_SECTION);
        if (!revealSection) return;
        revealSection.addEventListener(DomEventName.CLICK, (eventObject) => {
            if (eventObject.target === revealSection) {
                revealSection.setAttribute(attributeName.ARIA_HIDDEN, AriaHiddenValue.TRUE);
            }
        });
        documentReference.addEventListener(DomEventName.KEY_DOWN, (eventObject) => {
            const isEscapeKey = eventObject.key === KeyboardKey.ESCAPE || eventObject.key === KeyboardKey.ESC;
            const isRevealVisible = revealSection.getAttribute(attributeName.ARIA_HIDDEN) === AriaHiddenValue.FALSE;
            if (isEscapeKey && isRevealVisible) {
                revealSection.setAttribute(attributeName.ARIA_HIDDEN, AriaHiddenValue.TRUE);
            }
        });
    }

    function wireRestartButton({ onRestart }) {
        const restartButton = documentReference.getElementById(controlElementId.RESTART_BUTTON);
        if (!restartButton) return;
        restartButton.addEventListener(DomEventName.CLICK, () => {
            const gameOverSection = documentReference.getElementById(controlElementId.GAME_OVER_SECTION);
            if (gameOverSection) {
                gameOverSection.setAttribute(attributeName.ARIA_HIDDEN, AriaHiddenValue.TRUE);
            }
            const revealSection = documentReference.getElementById(controlElementId.REVEAL_SECTION);
            if (revealSection) {
                revealSection.setAttribute(attributeName.ARIA_HIDDEN, AriaHiddenValue.TRUE);
            }
            if (typeof onRestart === "function") onRestart();
        });
    }

    return {
        wireStartButton,
        wireStopButton,
        wireFullscreenButton,
        wireSpinAgainButton,
        wireRevealBackdropDismissal,
        wireRestartButton
    };
}

export { createListenerBinder };
