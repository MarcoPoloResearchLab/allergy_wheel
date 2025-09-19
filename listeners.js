import {
    WheelControlMode,
    BrowserEventName,
    KeyboardKey,
    AttributeBooleanValue,
    AvatarMenuClassName,
    TitleClassName,
    ButtonText,
    AudioControlLabel
} from "./constants.js";

const ListenerErrorMessage = {
    MISSING_DEPENDENCIES: "createListenerBinder requires controlElementId, attributeName, and stateManager",
    MISSING_STATE_MANAGER_METHODS:
        "createListenerBinder requires stateManager methods hasSelectedAllergen, getStopButtonMode, isAudioMuted, and toggleAudioMuted"
};

function createListenerBinder({ controlElementId, attributeName, documentReference = document, stateManager }) {
    if (!controlElementId || !attributeName || !stateManager) {
        throw new Error(ListenerErrorMessage.MISSING_DEPENDENCIES);
    }
    if (
        typeof stateManager.hasSelectedAllergen !== "function"
        || typeof stateManager.getStopButtonMode !== "function"
        || typeof stateManager.isAudioMuted !== "function"
        || typeof stateManager.toggleAudioMuted !== "function"
    ) {
        throw new Error(ListenerErrorMessage.MISSING_STATE_MANAGER_METHODS);
    }

    function wireStartButton({ onStartRequested }) {
        const startButton = documentReference.getElementById(controlElementId.START_BUTTON);
        if (!startButton) return;

        const allergyTitleElement = documentReference.getElementById(controlElementId.ALLERGY_TITLE);
        const attentionAnimationClassName = TitleClassName.ATTENTION;
        const blockedStateAttributeName = attributeName.DATA_BLOCKED;

        if (allergyTitleElement && attentionAnimationClassName) {
            const handleTitleAnimationEnd = () => {
                allergyTitleElement.classList.remove(attentionAnimationClassName);
            };
            allergyTitleElement.addEventListener(
                BrowserEventName.ANIMATION_END,
                handleTitleAnimationEnd
            );
        }

        startButton.addEventListener(BrowserEventName.CLICK, () => {
            const hasSelectedAllergen = stateManager.hasSelectedAllergen();
            if (!hasSelectedAllergen) {
                if (allergyTitleElement && attentionAnimationClassName) {
                    allergyTitleElement.classList.remove(attentionAnimationClassName);
                    void allergyTitleElement.offsetWidth;
                    allergyTitleElement.classList.add(attentionAnimationClassName);
                }
                return;
            }

            const isStartButtonBlocked = blockedStateAttributeName
                ? startButton.getAttribute(blockedStateAttributeName) === AttributeBooleanValue.TRUE
                : false;
            if (isStartButtonBlocked) {
                return;
            }

            if (allergyTitleElement && attentionAnimationClassName) {
                allergyTitleElement.classList.remove(attentionAnimationClassName);
            }

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

    function wireMuteButton({ onMuteChange } = {}) {
        const muteButton = documentReference.getElementById(controlElementId.MUTE_BUTTON);
        if (!muteButton) {
            return;
        }

        const ariaPressedAttributeName = attributeName.ARIA_PRESSED;
        const ariaLabelAttributeName = attributeName.ARIA_LABEL;

        const applyMuteStatePresentation = (isMuted) => {
            const resolvedMuteState = Boolean(isMuted);
            const pressedValue = resolvedMuteState ? AttributeBooleanValue.TRUE : AttributeBooleanValue.FALSE;
            if (ariaPressedAttributeName) {
                muteButton.setAttribute(ariaPressedAttributeName, pressedValue);
            }
            muteButton.textContent = resolvedMuteState ? ButtonText.SOUND_ON : ButtonText.MUTE;
            if (ariaLabelAttributeName) {
                muteButton.setAttribute(
                    ariaLabelAttributeName,
                    resolvedMuteState ? AudioControlLabel.UNMUTE_AUDIO : AudioControlLabel.MUTE_AUDIO
                );
            }
        };

        applyMuteStatePresentation(stateManager.isAudioMuted());

        muteButton.addEventListener(BrowserEventName.CLICK, () => {
            const updatedMuteState = stateManager.toggleAudioMuted();
            applyMuteStatePresentation(updatedMuteState);
            if (typeof onMuteChange === "function") {
                onMuteChange(Boolean(updatedMuteState));
            }
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

    /**
     * Connects avatar menu interactions to application state updates.
     *
     * @param {{ onAvatarChange: (avatarIdentifier: string) => void }} param0 - Callbacks invoked during avatar selection.
     */
    function wireAvatarSelector({ onAvatarChange }) {
        const avatarToggleButton = documentReference.getElementById(controlElementId.AVATAR_TOGGLE);
        const avatarMenuElement = documentReference.getElementById(controlElementId.AVATAR_MENU);
        if (!avatarToggleButton || !avatarMenuElement) {
            return;
        }

        const menuOpenClassName = AvatarMenuClassName.OPEN;
        const ariaExpandedAttributeName = attributeName.ARIA_EXPANDED;

        const setMenuVisibility = (shouldShowMenu) => {
            if (shouldShowMenu) {
                avatarMenuElement.hidden = false;
                if (menuOpenClassName) {
                    avatarMenuElement.classList.add(menuOpenClassName);
                }
                if (ariaExpandedAttributeName) {
                    avatarToggleButton.setAttribute(ariaExpandedAttributeName, AttributeBooleanValue.TRUE);
                }
            } else {
                if (menuOpenClassName) {
                    avatarMenuElement.classList.remove(menuOpenClassName);
                }
                avatarMenuElement.hidden = true;
                if (ariaExpandedAttributeName) {
                    avatarToggleButton.setAttribute(ariaExpandedAttributeName, AttributeBooleanValue.FALSE);
                }
            }
        };

        setMenuVisibility(false);

        avatarToggleButton.addEventListener(BrowserEventName.CLICK, () => {
            const shouldOpenMenu = avatarMenuElement.hidden;
            setMenuVisibility(shouldOpenMenu);
        });

        avatarMenuElement.addEventListener(BrowserEventName.CLICK, (eventObject) => {
            const eventTarget = eventObject.target instanceof Element
                ? eventObject.target.closest(`[data-avatar-id]`)
                : null;
            if (!eventTarget || !avatarMenuElement.contains(eventTarget)) {
                return;
            }

            const selectedAvatarIdentifier = eventTarget.dataset.avatarId;
            if (typeof onAvatarChange === "function" && selectedAvatarIdentifier) {
                onAvatarChange(selectedAvatarIdentifier);
            }
            setMenuVisibility(false);
        });
    }

    return {
        wireStartButton,
        wireStopButton,
        wireFullscreenButton,
        wireMuteButton,
        wireSpinAgainButton,
        wireRevealBackdropDismissal,
        wireRestartButton,
        wireAvatarSelector
    };
}

export { createListenerBinder };
