/* global document */
import { SCREEN_ALLERGY, SCREEN_WHEEL } from "./constants.js";

const ElementId = Object.freeze({
    REVEAL_SECTION: "reveal"
});

const AttributeName = Object.freeze({
    DATA_SCREEN: "data-screen",
    ARIA_HIDDEN: "aria-hidden"
});

const AttributeValue = Object.freeze({
    TRUE: "true"
});

export function showScreen(screenName) {
    const bodyElement = document.body;
    if (!bodyElement) {
        return;
    }

    const revealElement = document.getElementById(ElementId.REVEAL_SECTION);

    if (screenName === SCREEN_ALLERGY) {
        bodyElement.setAttribute(AttributeName.DATA_SCREEN, SCREEN_ALLERGY);
    } else if (screenName === SCREEN_WHEEL) {
        bodyElement.setAttribute(AttributeName.DATA_SCREEN, SCREEN_WHEEL);
    }

    if (revealElement) {
        revealElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeValue.TRUE);
    }
}

export function setWheelControlToStop() {
    /* no-op for API symmetry */
}

export function setWheelControlToStartGame() {
    /* no-op for API symmetry */
}
