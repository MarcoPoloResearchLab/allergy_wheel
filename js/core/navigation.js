// @ts-check

import {
    ScreenName,
    AttributeName,
    AttributeBooleanValue,
    ControlElementId,
    BrowserEventName
} from "../constants.js";

const TextContent = Object.freeze({
    EMPTY: ""
});

const ValueType = Object.freeze({
    FUNCTION: typeof Function
});

/**
 * Manages the top-level navigation buttons and synchronizes their pressed state.
 */
export class NavigationController {
    #documentReference;

    #controlElementIdMap;

    #attributeNameMap;

    #onScreenChange;

    #gameButtonElement = null;

    #menuButtonElement = null;

    constructor({
        documentReference = document,
        controlElementIdMap = ControlElementId,
        attributeNameMap = AttributeName,
        onScreenChange
    } = {}) {
        this.#documentReference = documentReference;
        this.#controlElementIdMap = controlElementIdMap;
        this.#attributeNameMap = attributeNameMap;
        this.#onScreenChange = typeof onScreenChange === ValueType.FUNCTION ? onScreenChange : null;
    }

    initialize() {
        if (!this.#documentReference || !this.#controlElementIdMap) {
            return;
        }

        this.#gameButtonElement = this.#documentReference.getElementById(
            this.#controlElementIdMap.NAV_GAME_BUTTON
        );
        this.#menuButtonElement = this.#documentReference.getElementById(
            this.#controlElementIdMap.NAV_MENU_BUTTON
        );

        this.#wireNavigationButton(this.#gameButtonElement, ScreenName.ALLERGY);
        this.#wireNavigationButton(this.#menuButtonElement, ScreenName.MENU);
    }

    updateActiveScreen(screenName) {
        const activeCategory = this.#mapScreenToCategory(screenName);
        const ariaPressedAttribute = this.#attributeNameMap?.ARIA_PRESSED;
        const pressedTrue = AttributeBooleanValue.TRUE;
        const pressedFalse = AttributeBooleanValue.FALSE;

        if (this.#gameButtonElement && ariaPressedAttribute) {
            const shouldPressGame = activeCategory !== ScreenName.MENU;
            this.#gameButtonElement.setAttribute(
                ariaPressedAttribute,
                shouldPressGame ? pressedTrue : pressedFalse
            );
        }

        if (this.#menuButtonElement && ariaPressedAttribute) {
            const shouldPressMenu = activeCategory === ScreenName.MENU;
            this.#menuButtonElement.setAttribute(
                ariaPressedAttribute,
                shouldPressMenu ? pressedTrue : pressedFalse
            );
        }
    }

    #wireNavigationButton(buttonElement, targetScreenName) {
        if (!buttonElement) {
            return;
        }
        buttonElement.addEventListener(BrowserEventName.CLICK, () => {
            this.updateActiveScreen(targetScreenName);
            if (this.#onScreenChange) {
                this.#onScreenChange(targetScreenName);
            }
        });
    }

    #mapScreenToCategory(screenName) {
        if (screenName === ScreenName.MENU) {
            return ScreenName.MENU;
        }
        if (screenName === ScreenName.WHEEL || screenName === ScreenName.ALLERGY) {
            return ScreenName.ALLERGY;
        }
        return ScreenName.ALLERGY;
    }
}

/**
 * Determines the initial navigation state based on the body's data attribute.
 *
 * @returns {string} Initial screen name.
 */
export function resolveInitialNavState() {
    const bodyElement = document.body;
    if (!bodyElement) {
        return ScreenName.ALLERGY;
    }
    const dataScreenAttribute = AttributeName.DATA_SCREEN || TextContent.EMPTY;
    const activeScreen = dataScreenAttribute
        ? bodyElement.getAttribute(dataScreenAttribute) || TextContent.EMPTY
        : TextContent.EMPTY;
    if (activeScreen === ScreenName.MENU) {
        return ScreenName.MENU;
    }
    return ScreenName.ALLERGY;
}
