// @ts-check

import { AttributeBooleanValue, AttributeName, ControlElementId } from "../constants.js";

/**
 * Updates the Allergy Wheel start button blocked state attributes.
 *
 * @param {{
 *     documentReference?: Document,
 *     controlElementIdMap?: typeof ControlElementId,
 *     attributeNameMap?: typeof AttributeName,
 *     shouldBlock: boolean
 * }} options - Dependencies and the desired blocked state.
 * @returns {void}
 */
export function setStartButtonBlockedState({
    documentReference = document,
    controlElementIdMap = ControlElementId,
    attributeNameMap = AttributeName,
    shouldBlock
}) {
    const startButtonId = controlElementIdMap?.START_BUTTON;
    if (!startButtonId || !documentReference) {
        return;
    }

    const startButtonElement = documentReference.getElementById(startButtonId);
    if (!startButtonElement) {
        return;
    }

    const blockedAttributeName = attributeNameMap?.DATA_BLOCKED;
    const ariaDisabledAttributeName = attributeNameMap?.ARIA_DISABLED;
    const booleanValue = shouldBlock ? AttributeBooleanValue.TRUE : AttributeBooleanValue.FALSE;

    if (blockedAttributeName) {
        startButtonElement.setAttribute(blockedAttributeName, booleanValue);
    }
    if (ariaDisabledAttributeName) {
        startButtonElement.setAttribute(ariaDisabledAttributeName, booleanValue);
    }
}
