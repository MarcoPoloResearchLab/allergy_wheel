/* global document */
import {
    ScreenName,
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

    if (screenName === ScreenName.ALLERGY) {
        bodyElement.setAttribute(AttributeName.DATA_SCREEN, ScreenName.ALLERGY);
    } else if (screenName === ScreenName.WHEEL) {
        bodyElement.setAttribute(AttributeName.DATA_SCREEN, ScreenName.WHEEL);
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
