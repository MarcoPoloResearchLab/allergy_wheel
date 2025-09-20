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
        "createListenerBinder requires stateManager methods hasSelectedAllergen, getWheelControlMode, isAudioMuted, and toggleAudioMuted"
};

function createListenerBinder({ controlElementId, attributeName, documentReference = document, stateManager }) {
    if (!controlElementId || !attributeName || !stateManager) {
        throw new Error(ListenerErrorMessage.MISSING_DEPENDENCIES);
    }
    if (
        typeof stateManager.hasSelectedAllergen !== "function"
        || typeof stateManager.getWheelControlMode !== "function"
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

    const ActivationKeyValueSet = new Set([
        KeyboardKey.ENTER,
        KeyboardKey.SPACE,
        KeyboardKey.SPACEBAR
    ]);

    const EscapeKeyValueSet = new Set([
        KeyboardKey.ESCAPE,
        KeyboardKey.ESC
    ]);

    const addActivationListenersToButton = (buttonElement, activationHandler) => {
        if (!buttonElement || typeof activationHandler !== "function") {
            return;
        }

        const handleClick = () => {
            activationHandler();
        };

        const handleKeyDown = (eventObject) => {
            const pressedKey = eventObject && typeof eventObject.key === "string"
                ? eventObject.key
                : "";
            if (!ActivationKeyValueSet.has(pressedKey)) {
                return;
            }
            if (typeof eventObject.preventDefault === "function") {
                eventObject.preventDefault();
            }
            activationHandler();
        };

        buttonElement.addEventListener(BrowserEventName.CLICK, handleClick);
        buttonElement.addEventListener(BrowserEventName.KEY_DOWN, handleKeyDown);
    };

    const invokeRestartWorkflow = (restartCallback) => {
        const gameOverSection = documentReference.getElementById(controlElementId.GAME_OVER_SECTION);
        if (gameOverSection) {
            gameOverSection.setAttribute(attributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
        }

        const revealSection = documentReference.getElementById(controlElementId.REVEAL_SECTION);
        if (revealSection) {
            revealSection.setAttribute(attributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
        }

        if (typeof restartCallback === "function") {
            restartCallback();
        }
    };

    function wireWheelContinueButton({ onStartRequested, onStopRequested } = {}) {
        const wheelContinueButton = documentReference.getElementById(
            controlElementId.WHEEL_CONTINUE_BUTTON
        );
        if (!wheelContinueButton) {
            return;
        }

        const resolveWheelControlMode = () => {
            const managerMode = stateManager.getWheelControlMode();
            if (managerMode === WheelControlMode.STOP || managerMode === WheelControlMode.START) {
                return managerMode;
            }

            const modeAttributeName = attributeName.DATA_WHEEL_CONTROL_MODE;
            if (modeAttributeName) {
                const attributeModeValue = wheelContinueButton.getAttribute(modeAttributeName);
                if (attributeModeValue === WheelControlMode.STOP || attributeModeValue === WheelControlMode.START) {
                    return attributeModeValue;
                }
            }

            return WheelControlMode.START;
        };

        const handleActivation = () => {
            const currentMode = resolveWheelControlMode();
            if (currentMode === WheelControlMode.STOP) {
                if (typeof onStopRequested === "function") {
                    onStopRequested();
                }
                return;
            }
            if (typeof onStartRequested === "function") {
                onStartRequested();
            }
        };

        addActivationListenersToButton(wheelContinueButton, handleActivation);
    }

    function wireWheelRestartButton({ onRestartRequested, onRestartConfirmed } = {}) {
        const wheelRestartButton = documentReference.getElementById(
            controlElementId.WHEEL_RESTART_BUTTON
        );
        if (!wheelRestartButton) {
            return;
        }

        const restartConfirmationElements = {
            containerElement: documentReference.getElementById(
                controlElementId.RESTART_CONFIRMATION_CONTAINER
            ),
            overlayElement: documentReference.getElementById(
                controlElementId.RESTART_CONFIRMATION_OVERLAY
            ),
            dialogElement: documentReference.getElementById(
                controlElementId.RESTART_CONFIRMATION_DIALOG
            ),
            confirmButtonElement: documentReference.getElementById(
                controlElementId.RESTART_CONFIRMATION_CONFIRM_BUTTON
            ),
            cancelButtonElement: documentReference.getElementById(
                controlElementId.RESTART_CONFIRMATION_CANCEL_BUTTON
            )
        };

        const ariaHiddenAttributeName = attributeName.ARIA_HIDDEN;

        const restartConfirmationState = {
            isVisible: false,
            lastFocusedElement: null
        };

        const closeRestartConfirmation = ({ shouldRestoreFocus = true } = {}) => {
            if (!restartConfirmationState.isVisible) {
                return;
            }

            const { containerElement, dialogElement } = restartConfirmationElements;

            if (containerElement) {
                if (ariaHiddenAttributeName) {
                    containerElement.setAttribute(ariaHiddenAttributeName, AttributeBooleanValue.TRUE);
                }
                containerElement.hidden = true;
            }

            if (dialogElement && ariaHiddenAttributeName) {
                dialogElement.setAttribute(ariaHiddenAttributeName, AttributeBooleanValue.TRUE);
            }

            restartConfirmationState.isVisible = false;

            const focusTargetElement = restartConfirmationState.lastFocusedElement;
            restartConfirmationState.lastFocusedElement = null;

            if (
                shouldRestoreFocus
                && focusTargetElement
                && typeof focusTargetElement.focus === "function"
                && (typeof focusTargetElement.isConnected !== "boolean" || focusTargetElement.isConnected)
            ) {
                focusTargetElement.focus();
            }
        };

        const openRestartConfirmation = () => {
            const { containerElement, dialogElement } = restartConfirmationElements;

            if (!containerElement || !dialogElement) {
                return false;
            }

            if (restartConfirmationState.isVisible) {
                return true;
            }

            restartConfirmationState.lastFocusedElement = wheelRestartButton;

            containerElement.hidden = false;
            if (ariaHiddenAttributeName) {
                containerElement.setAttribute(ariaHiddenAttributeName, AttributeBooleanValue.FALSE);
                dialogElement.setAttribute(ariaHiddenAttributeName, AttributeBooleanValue.FALSE);
            }

            restartConfirmationState.isVisible = true;

            if (typeof dialogElement.focus === "function") {
                dialogElement.focus({ preventScroll: true });
            }

            return true;
        };

        const handleEscapeKeyDown = (eventObject) => {
            if (!restartConfirmationState.isVisible) {
                return;
            }

            const pressedKey = typeof eventObject.key === "string" ? eventObject.key : "";
            if (!EscapeKeyValueSet.has(pressedKey)) {
                return;
            }

            if (typeof eventObject.preventDefault === "function") {
                eventObject.preventDefault();
            }

            closeRestartConfirmation({ shouldRestoreFocus: true });
        };

        const handleRestartRequest = () => {
            const wasModalOpened = openRestartConfirmation();

            if (wasModalOpened) {
                if (typeof onRestartRequested === "function") {
                    onRestartRequested();
                }
                return;
            }

            invokeRestartWorkflow(onRestartConfirmed);
        };

        const handleRestartConfirmation = () => {
            closeRestartConfirmation({ shouldRestoreFocus: false });
            invokeRestartWorkflow(onRestartConfirmed);
        };

        const handleRestartCancellation = () => {
            closeRestartConfirmation({ shouldRestoreFocus: true });
        };

        if (restartConfirmationElements.overlayElement) {
            restartConfirmationElements.overlayElement.addEventListener(
                BrowserEventName.CLICK,
                handleRestartCancellation
            );
        }

        if (restartConfirmationElements.cancelButtonElement) {
            addActivationListenersToButton(
                restartConfirmationElements.cancelButtonElement,
                handleRestartCancellation
            );
        }

        if (restartConfirmationElements.confirmButtonElement) {
            addActivationListenersToButton(
                restartConfirmationElements.confirmButtonElement,
                handleRestartConfirmation
            );
        }

        documentReference.addEventListener(BrowserEventName.KEY_DOWN, handleEscapeKeyDown);

        addActivationListenersToButton(wheelRestartButton, handleRestartRequest);
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
        const restartControlIdentifiers = [controlElementId.RESTART_BUTTON];

        for (const restartControlId of restartControlIdentifiers) {
            if (!restartControlId) {
                continue;
            }
            const restartButtonElement = documentReference.getElementById(restartControlId);
            if (!restartButtonElement) {
                continue;
            }

            const handleRestart = () => {
                invokeRestartWorkflow(onRestart);
            };

            addActivationListenersToButton(restartButtonElement, handleRestart);
        }
    }

    /**
     * Connects avatar menu interactions to application state updates.
     *
     * @param {{ onAvatarChange: (avatarIdentifier: string) => void }} param0 - Callbacks invoked during avatar selection.
     */
    function wireAvatarSelector({ onAvatarChange }) {
        const avatarToggleButton = documentReference.getElementById(controlElementId.AVATAR_TOGGLE);
        const avatarMenuElement = documentReference.getElementById(controlElementId.AVATAR_MENU);
        const avatarMenuBackdropElement = documentReference.getElementById(controlElementId.AVATAR_MENU_BACKDROP);
        if (!avatarToggleButton || !avatarMenuElement) {
            return;
        }

        const menuOpenClassName = AvatarMenuClassName.OPEN;
        const backdropVisibleClassName = AvatarMenuClassName.BACKDROP_VISIBLE;
        const ariaExpandedAttributeName = attributeName.ARIA_EXPANDED;
        const ariaHiddenAttributeName = attributeName.ARIA_HIDDEN;

        const setBackdropVisibility = (shouldShowBackdrop) => {
            if (!avatarMenuBackdropElement) {
                return;
            }

            if (shouldShowBackdrop) {
                avatarMenuBackdropElement.hidden = false;
                if (backdropVisibleClassName) {
                    avatarMenuBackdropElement.classList.add(backdropVisibleClassName);
                }
                if (ariaHiddenAttributeName) {
                    avatarMenuBackdropElement.setAttribute(ariaHiddenAttributeName, AttributeBooleanValue.FALSE);
                }
            } else {
                if (backdropVisibleClassName) {
                    avatarMenuBackdropElement.classList.remove(backdropVisibleClassName);
                }
                if (ariaHiddenAttributeName) {
                    avatarMenuBackdropElement.setAttribute(ariaHiddenAttributeName, AttributeBooleanValue.TRUE);
                }
                avatarMenuBackdropElement.hidden = true;
            }
        };

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
            setBackdropVisibility(shouldShowMenu);
        };

        setMenuVisibility(false);

        avatarToggleButton.addEventListener(BrowserEventName.CLICK, () => {
            const shouldOpenMenu = avatarMenuElement.hidden;
            setMenuVisibility(shouldOpenMenu);
        });

        if (avatarMenuBackdropElement) {
            avatarMenuBackdropElement.addEventListener(BrowserEventName.CLICK, () => {
                setMenuVisibility(false);
            });
        }

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
        wireWheelContinueButton,
        wireFullscreenButton,
        wireMuteButton,
        wireSpinAgainButton,
        wireRevealBackdropDismissal,
        wireWheelRestartButton,
        wireRestartButton,
        wireAvatarSelector
    };
}

export { createListenerBinder };
