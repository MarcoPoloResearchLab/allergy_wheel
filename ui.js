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

const WheelRestartTabIndex = Object.freeze({
    ACTIVE: 0,
    INACTIVE: -1
});

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

function applyWheelRestartSegmentVisibility(wheelRestartButtonElement, shouldHideButton) {
    if (!wheelRestartButtonElement) {
        return;
    }

    const ariaHiddenAttributeName = AttributeName.ARIA_HIDDEN;
    if (ariaHiddenAttributeName) {
        wheelRestartButtonElement.setAttribute(
            ariaHiddenAttributeName,
            shouldHideButton ? AttributeBooleanValue.TRUE : AttributeBooleanValue.FALSE
        );
    }

    const targetTabIndex = shouldHideButton
        ? WheelRestartTabIndex.INACTIVE
        : WheelRestartTabIndex.ACTIVE;
    wheelRestartButtonElement.tabIndex = targetTabIndex;
    wheelRestartButtonElement.setAttribute("tabindex", String(targetTabIndex));
}

export function updateWheelRestartControlVisibilityFromRevealState() {
    const wheelRestartButtonElement = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);
    if (!wheelRestartButtonElement) {
        return false;
    }

    const wheelControlElement = document.getElementById(ControlElementId.WHEEL_CONTROL_CONTAINER);
    const wheelControlModeAttributeName = AttributeName.DATA_WHEEL_CONTROL_MODE;
    const controlMode = wheelControlElement && wheelControlModeAttributeName
        ? wheelControlElement.getAttribute(wheelControlModeAttributeName)
        : null;

    const isStopMode = controlMode === WheelControlMode.STOP;
    const shouldHideButton = isStopMode || isRevealSectionVisible();
    applyWheelRestartSegmentVisibility(wheelRestartButtonElement, shouldHideButton);
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
    const wheelControlElement = document.getElementById(ControlElementId.WHEEL_CONTROL_CONTAINER);
    const wheelControlModeAttributeName = AttributeName.DATA_WHEEL_CONTROL_MODE;
    if (wheelControlElement) {
        if (WheelControlClassName.STOP_MODE) {
            wheelControlElement.classList.add(WheelControlClassName.STOP_MODE);
        }
        if (wheelControlModeAttributeName) {
            wheelControlElement.setAttribute(wheelControlModeAttributeName, WheelControlMode.STOP);
        }
    }

    const wheelRestartButtonElement = document.getElementById(ControlElementId.WHEEL_RESTART_BUTTON);
    applyWheelRestartSegmentVisibility(wheelRestartButtonElement, true);
}

export function setWheelControlToStartGame() {
    const wheelControlElement = document.getElementById(ControlElementId.WHEEL_CONTROL_CONTAINER);
    const wheelControlModeAttributeName = AttributeName.DATA_WHEEL_CONTROL_MODE;
    if (wheelControlElement) {
        if (WheelControlClassName.STOP_MODE) {
            wheelControlElement.classList.remove(WheelControlClassName.STOP_MODE);
        }
        if (wheelControlModeAttributeName) {
            wheelControlElement.setAttribute(wheelControlModeAttributeName, WheelControlMode.START);
        }
    }

    updateWheelRestartControlVisibilityFromRevealState();
}

export function openRestartConfirmation() {
    /* no-op for API symmetry */
}
