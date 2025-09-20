/* global document */
import {
    ScreenName,
    AttributeName,
    AttributeBooleanValue,
    ResultCardElementId,
    ScreenElementId,
    ControlElementId,
    WheelControlClassName,
    WheelControlMode
} from "./constants.js";

function isRevealSectionVisible() {
    const revealElement = document.getElementById(ResultCardElementId.REVEAL_SECTION);
    if (!revealElement) {
        return false;
    }

    const ariaHiddenAttributeName = AttributeName.ARIA_HIDDEN;
    if (!ariaHiddenAttributeName) {
        return false;
    }

    const revealHiddenState = revealElement.getAttribute(ariaHiddenAttributeName);
    return revealHiddenState === AttributeBooleanValue.FALSE;
}

function applyWheelRestartButtonVisibility(wheelRestartButtonElement, shouldHideButton) {
    if (!wheelRestartButtonElement) {
        return;
    }

    wheelRestartButtonElement.hidden = shouldHideButton;

    const ariaHiddenAttributeName = AttributeName.ARIA_HIDDEN;
    if (ariaHiddenAttributeName) {
        wheelRestartButtonElement.setAttribute(
            ariaHiddenAttributeName,
            shouldHideButton ? AttributeBooleanValue.TRUE : AttributeBooleanValue.FALSE
        );
    }
}

function collectWheelControlElements() {
    const wheelControlElement = document.getElementById(ControlElementId.WHEEL_CONTROL_CONTAINER);
    const wheelContinueButtonElement = document.getElementById(ControlElementId.WHEEL_CONTINUE_BUTTON);
    const wheelRestartButtonElement = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);

    return {
        wheelControlElement,
        wheelContinueButtonElement,
        wheelRestartButtonElement
    };
}

function isStopModeActiveForWheelControl({ wheelControlElement, wheelContinueButtonElement }) {
    if (
        wheelControlElement
        && WheelControlClassName.STOP_MODE
        && wheelControlElement.classList.contains(WheelControlClassName.STOP_MODE)
    ) {
        return true;
    }

    const wheelControlModeAttributeName = AttributeName.DATA_WHEEL_CONTROL_MODE;
    if (wheelContinueButtonElement && wheelControlModeAttributeName) {
        const wheelControlModeValue = wheelContinueButtonElement.getAttribute(
            wheelControlModeAttributeName
        );

        if (wheelControlModeValue === WheelControlMode.STOP) {
            return true;
        }
    }

    return false;
}

export function updateWheelRestartControlVisibilityFromRevealState() {
    const {
        wheelControlElement,
        wheelContinueButtonElement,
        wheelRestartButtonElement
    } = collectWheelControlElements();

    if (isStopModeActiveForWheelControl({ wheelControlElement, wheelContinueButtonElement })) {
        return Boolean(wheelRestartButtonElement);
    }

    if (!wheelRestartButtonElement) {
        return false;
    }

    const shouldHideButton = isRevealSectionVisible();
    applyWheelRestartButtonVisibility(wheelRestartButtonElement, shouldHideButton);
    return true;
}

const ScreenElementEntries = Object.freeze([
    Object.freeze([ScreenName.ALLERGY, ScreenElementId.ALLERGY]),
    Object.freeze([ScreenName.WHEEL, ScreenElementId.WHEEL]),
    Object.freeze([ScreenName.MENU, ScreenElementId.MENU])
]);

export function showScreen(screenName) {
    const bodyElement = document.body;
    if (!bodyElement) {
        return;
    }

    const revealElement = document.getElementById(ResultCardElementId.REVEAL_SECTION);

    let resolvedScreenName = ScreenName.ALLERGY;
    if (screenName === ScreenName.WHEEL) {
        resolvedScreenName = ScreenName.WHEEL;
    } else if (screenName === ScreenName.MENU) {
        resolvedScreenName = ScreenName.MENU;
    }

    bodyElement.setAttribute(AttributeName.DATA_SCREEN, resolvedScreenName);

    const ariaHiddenAttributeName = AttributeName.ARIA_HIDDEN;
    if (ariaHiddenAttributeName) {
        for (const [knownScreenName, elementId] of ScreenElementEntries) {
            const screenElement = document.getElementById(elementId);
            if (!screenElement) {
                continue;
            }
            const isActiveScreen = knownScreenName === resolvedScreenName;
            screenElement.setAttribute(
                ariaHiddenAttributeName,
                isActiveScreen ? AttributeBooleanValue.FALSE : AttributeBooleanValue.TRUE
            );
        }
    }

    if (revealElement) {
        revealElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
    }
}

export function setWheelControlToStop() {
    const { wheelControlElement, wheelRestartButtonElement } = collectWheelControlElements();
    if (wheelControlElement && WheelControlClassName.STOP_MODE) {
        wheelControlElement.classList.add(WheelControlClassName.STOP_MODE);
    }

    applyWheelRestartButtonVisibility(wheelRestartButtonElement, true);
}

export function setWheelControlToStartGame() {
    const wheelControlElement = document.getElementById(ControlElementId.WHEEL_CONTROL_CONTAINER);
    if (wheelControlElement && WheelControlClassName.STOP_MODE) {
        wheelControlElement.classList.remove(WheelControlClassName.STOP_MODE);
    }

    updateWheelRestartControlVisibilityFromRevealState();
}

export function openRestartConfirmation() {
    /* no-op for API symmetry */
}
