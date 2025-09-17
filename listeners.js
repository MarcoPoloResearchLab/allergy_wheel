import {
    WheelControlMode,
    BrowserEventName,
    KeyboardKey,
    AttributeBooleanValue,
    AvatarClassName,
    AvatarMenuClassName,
    TitleClassName
} from "./constants.js";

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

        const allergyTitleElement = documentReference.getElementById(controlElementId.ALLERGY_TITLE);
        const attentionAnimationClassName = TitleClassName.ATTENTION;

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

        const avatarOptionClassName = AvatarClassName.OPTION;
        const avatarOptionElements = avatarOptionClassName
            ? Array.from(avatarMenuElement.getElementsByClassName(avatarOptionClassName))
            : [];

        for (const avatarOptionElement of avatarOptionElements) {
            avatarOptionElement.addEventListener(BrowserEventName.CLICK, () => {
                const selectedAvatarIdentifier = avatarOptionElement.dataset.avatarId;
                if (typeof onAvatarChange === "function" && selectedAvatarIdentifier) {
                    onAvatarChange(selectedAvatarIdentifier);
                }
                setMenuVisibility(false);
            });
        }
    }

    return {
        wireStartButton,
        wireStopButton,
        wireFullscreenButton,
        wireSpinAgainButton,
        wireRevealBackdropDismissal,
        wireRestartButton,
        wireAvatarSelector
    };
}

export { createListenerBinder };
