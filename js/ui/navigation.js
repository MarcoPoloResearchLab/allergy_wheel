// @ts-check

import {
    ScreenName,
    ScreenElementId,
    NavigationText,
    NavigationIcon,
    AttributeName,
    ControlElementId,
    BrowserEventName
} from "../constants.js";
import { reportError } from "../utils/logging.js";

/** @typedef {typeof ScreenName[keyof typeof ScreenName]} NavigationScreen */

const NavigationScreenElementId = Object.freeze({
    [ScreenName.ALLERGY]: ScreenElementId.ALLERGY,
    [ScreenName.WHEEL]: ScreenElementId.WHEEL,
    [ScreenName.MENU]: ScreenElementId.MENU
});

const DestinationIconSize = 24;
const DestinationIconClassName = "header-destination-icon";

/** Shows the other view on one button and remembers the current game screen. */
export class NavigationController {
    #toggleButtonElement;
    #destinationIconElement;
    #destinationLabelElement;
    #attributeNameMap;
    #onScreenChange;
    /** @type {NavigationScreen} */
    #activeScreenName = ScreenName.ALLERGY;
    /** @type {NavigationScreen} */
    #gameScreenName = ScreenName.ALLERGY;

    /**
     * @param {{documentReference?: Document, controlElementIdMap?: typeof ControlElementId,
     * attributeNameMap?: typeof AttributeName, onScreenChange?: (screen: NavigationScreen) => void}} [options]
     */
    constructor({
        documentReference = document,
        controlElementIdMap = ControlElementId,
        attributeNameMap = AttributeName,
        onScreenChange
    } = {}) {
        const button = documentReference.getElementById(controlElementIdMap.NAV_TOGGLE_BUTTON);
        if (!button) throw new Error(NavigationText.MISSING_CONTROL);
        this.#toggleButtonElement = button;
        this.#destinationIconElement = documentReference.createElement("img");
        this.#destinationIconElement.className = DestinationIconClassName;
        this.#destinationIconElement.alt = "";
        this.#destinationIconElement.setAttribute(attributeNameMap.ARIA_HIDDEN, "true");
        this.#destinationIconElement.width = DestinationIconSize;
        this.#destinationIconElement.height = DestinationIconSize;
        this.#destinationLabelElement = documentReference.createElement("span");
        button.replaceChildren(this.#destinationIconElement, this.#destinationLabelElement);
        this.#attributeNameMap = attributeNameMap;
        this.#onScreenChange = onScreenChange;
    }

    /** Binds the destination action and renders the initial game destination. */
    initialize() {
        this.#toggleButtonElement.addEventListener(BrowserEventName.CLICK, () => {
            try {
                if (this.#onScreenChange) this.#onScreenChange(this.#targetScreenName());
            } catch (error) {
                reportError(NavigationText.CHANGE_FAILED, error);
            }
        });
        this.updateActiveScreen(this.#activeScreenName);
    }

    /** @param {NavigationScreen} screenName Actual screen shown by the application. */
    updateActiveScreen(screenName) {
        this.#activeScreenName = screenName;
        if (screenName !== ScreenName.MENU) this.#gameScreenName = screenName;
        this.#destinationLabelElement.textContent = screenName === ScreenName.MENU
            ? NavigationText.GAME : NavigationText.MENU;
        this.#destinationIconElement.src = screenName === ScreenName.MENU
            ? NavigationIcon.GAME : NavigationIcon.MENU;
        this.#toggleButtonElement.setAttribute(
            this.#attributeNameMap.ARIA_CONTROLS,
            NavigationScreenElementId[this.#targetScreenName()]
        );
    }

    /** @returns {NavigationScreen} */
    #targetScreenName() {
        return this.#activeScreenName === ScreenName.MENU ? this.#gameScreenName : ScreenName.MENU;
    }
}

/** @returns {NavigationScreen} Initial view from the page's screen attribute. */
export function resolveInitialNavState() {
    return document.body.getAttribute(AttributeName.DATA_SCREEN) === ScreenName.MENU
        ? ScreenName.MENU : ScreenName.ALLERGY;
}
