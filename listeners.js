import { WheelControlMode, BrowserEventName, KeyboardKey, AttributeBooleanValue } from "./constants.js";

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
        startButton.addEventListener(BrowserEventName.CLICK, () => {
            if (!stateManager.hasSelectedAllergen()) return;
            if (typeof onStartRequested === "function") {
                onStartRequested();
            }
        });
    }

    function wireStopButton({ onStopRequested, onShowAllergyScreen }) {
        const stopButton = documentReference.getElementById(controlElementId.STOP_BUTTON);
        if (!stopButton) return;
        stopButton.addEventListener(BrowserEventName.CLICK, () => {
            if (stateManager.getStopButtonMode() === WheelControlMode.STOP) {
                if (typeof onStopRequested === "function") onStopRequested();
            } else if (typeof onShowAllergyScreen === "function") {
                onShowAllergyScreen();
            }
        });
    }

    function wireFullscreenButton() {
        const fullscreenButton = documentReference.getElementById(controlElementId.FULLSCREEN_BUTTON);
        if (!fullscreenButton) return;
        fullscreenButton.addEventListener(BrowserEventName.CLICK, () => {
            const rootElement = documentReference.documentElement;
            if (!documentReference.fullscreenElement) rootElement.requestFullscreen();
            else documentReference.exitFullscreen();
        });
    }

    function wireSpinAgainButton({ onSpinAgain }) {
        const spinAgainButton = documentReference.getElementById(controlElementId.SPIN_AGAIN_BUTTON);
        if (!spinAgainButton) return;
        spinAgainButton.addEventListener(BrowserEventName.CLICK, () => {
            const revealSection = documentReference.getElementById(controlElementId.REVEAL_SECTION);
            if (revealSection) {
                revealSection.setAttribute(attributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
            }
            if (typeof onSpinAgain === "function") onSpinAgain();
        });
    }

    function wireRevealBackdropDismissal() {
        const revealSection = documentReference.getElementById(controlElementId.REVEAL_SECTION);
        if (!revealSection) return;
        revealSection.addEventListener(BrowserEventName.CLICK, (eventObject) => {
            if (eventObject.target === revealSection) {
                revealSection.setAttribute(attributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
            }
        });
        documentReference.addEventListener(BrowserEventName.KEY_DOWN, (eventObject) => {
            const isEscapeKey = eventObject.key === KeyboardKey.ESCAPE || eventObject.key === KeyboardKey.ESC;
            const isRevealVisible = revealSection.getAttribute(attributeName.ARIA_HIDDEN) === AttributeBooleanValue.FALSE;
            if (isEscapeKey && isRevealVisible) {
                revealSection.setAttribute(attributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
            }
        });
    }

    function wireRestartButton({ onRestart }) {
        const restartButton = documentReference.getElementById(controlElementId.RESTART_BUTTON);
        if (!restartButton) return;
        restartButton.addEventListener(BrowserEventName.CLICK, () => {
            const gameOverSection = documentReference.getElementById(controlElementId.GAME_OVER_SECTION);
            if (gameOverSection) {
                gameOverSection.setAttribute(attributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
            }
            const revealSection = documentReference.getElementById(controlElementId.REVEAL_SECTION);
            if (revealSection) {
                revealSection.setAttribute(attributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
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
