/* global document */
import {
    ScreenName,
    AttributeName,
    AttributeBooleanValue,
    ResultCardElementId,
    ScreenElementId
} from "./constants.js";

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
    /* no-op for API symmetry */
}

export function setWheelControlToStartGame() {
    /* no-op for API symmetry */
}
