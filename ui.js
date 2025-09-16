/* global document */
import {
    SCREEN_ALLERGY,
    SCREEN_WHEEL,
    AttributeName,
    AttributeBooleanValue,
    ResultCardElementId
} from "./constants.js";

export function showScreen(screenName) {
    const bodyElement = document.body;
    if (!bodyElement) {
        return;
    }

    const revealElement = document.getElementById(ResultCardElementId.REVEAL_SECTION);

    if (screenName === SCREEN_ALLERGY) {
        bodyElement.setAttribute(AttributeName.DATA_SCREEN, SCREEN_ALLERGY);
    } else if (screenName === SCREEN_WHEEL) {
        bodyElement.setAttribute(AttributeName.DATA_SCREEN, SCREEN_WHEEL);
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
