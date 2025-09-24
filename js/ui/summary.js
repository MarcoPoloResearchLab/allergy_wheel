// @ts-check

import {
    SummaryElementId,
    SummaryClassName,
    SummaryText
} from "../constants.js";

/** @typedef {import("../types.js").AllergenDescriptor} AllergenDescriptor */
/** @typedef {import("../types.js").Dish} Dish */

const TextContent = Object.freeze({
    EMPTY: "",
    SPACE: " ",
    COMMA_SPACE: ", ",
    AND: " and "
});

/**
 * Creates the static summary structure inside the configured wrapper.
 *
 * @param {Document} documentReference - Document used to query and create nodes.
 * @returns {{
 *     wrapperElement: HTMLElement,
 *     containerElement: HTMLElement,
 *     titleElement: HTMLHeadingElement,
 *     introParagraphElement: HTMLParagraphElement,
 *     secondaryParagraphElement: HTMLParagraphElement,
 *     listElement: HTMLUListElement,
 *     outroParagraphElement: HTMLParagraphElement
 * } | null}
 */
function ensureSummaryStructure(documentReference) {
    const wrapperElement = documentReference.getElementById(SummaryElementId.WRAPPER);
    const containerElement = documentReference.getElementById(SummaryElementId.CONTAINER);
    if (!wrapperElement || !containerElement) {
        return null;
    }

    wrapperElement.classList.add(SummaryClassName.WRAPPER);
    wrapperElement.hidden = true;

    containerElement.classList.add(SummaryClassName.CONTAINER);
    containerElement.textContent = TextContent.EMPTY;

    const titleElement = documentReference.createElement("h2");
    titleElement.id = SummaryElementId.TITLE;
    containerElement.appendChild(titleElement);

    const introParagraphElement = documentReference.createElement("p");
    introParagraphElement.id = SummaryElementId.INTRO;
    containerElement.appendChild(introParagraphElement);

    const secondaryParagraphElement = documentReference.createElement("p");
    secondaryParagraphElement.id = SummaryElementId.SECOND_PARAGRAPH;
    containerElement.appendChild(secondaryParagraphElement);

    const listElement = documentReference.createElement("ul");
    listElement.id = SummaryElementId.LIST;
    listElement.className = SummaryClassName.LIST;
    containerElement.appendChild(listElement);

    const outroParagraphElement = documentReference.createElement("p");
    outroParagraphElement.id = SummaryElementId.OUTRO;
    containerElement.appendChild(outroParagraphElement);

    return {
        wrapperElement,
        containerElement,
        titleElement,
        introParagraphElement,
        secondaryParagraphElement,
        listElement,
        outroParagraphElement
    };
}

/**
 * Formats an array of sample dish names into a readable list.
 *
 * @param {string[]} sampleNames - Collection of dish names to format.
 * @returns {string} Formatted list suitable for inclusion in prose.
 */
function formatSampleList(sampleNames) {
    if (sampleNames.length === 0) {
        return TextContent.EMPTY;
    }
    if (sampleNames.length === 1) {
        return sampleNames[0];
    }
    if (sampleNames.length === 2) {
        return sampleNames.join(TextContent.AND);
    }
    const leadingSamples = sampleNames.slice(0, sampleNames.length - 1).join(TextContent.COMMA_SPACE);
    const finalSample = sampleNames[sampleNames.length - 1];
    return `${leadingSamples},${TextContent.AND}${finalSample}`;
}

/**
 * Formats the list entry text for a single allergen summary.
 *
 * @param {number} dishCount - Total number of dishes associated with the allergen.
 * @param {string[]} sampleNames - Sample dish names to display.
 * @returns {string} Human readable summary text.
 */
function formatSummaryDetail(dishCount, sampleNames) {
    if (dishCount <= 0) {
        return SummaryText.ZERO_DISHES_MESSAGE;
    }
    const dishNoun = dishCount === 1 ? "dish" : "dishes";
    const baseText = `${dishCount} ${dishNoun} in the Allergy Wheel menu trigger this allergen alert`;
    if (sampleNames.length === 0) {
        return `${baseText}.`;
    }
    const sampleList = formatSampleList(sampleNames);
    return `${baseText}, ${SummaryText.LIST_INTRO_PHRASE} ${sampleList}.`;
}

/**
 * Renders the allergen summary into the configured container.
 *
 * @param {{
 *     documentReference?: Document,
 *     allergensCatalog?: AllergenDescriptor[],
 *     dishesByAllergenToken?: Map<string, Dish[]> | Record<string, Dish[]>
 * }} [options]
 * @returns {void}
 */
export function renderAllergenSummary({
    documentReference = document,
    allergensCatalog = [],
    dishesByAllergenToken
} = {}) {
    const structure = ensureSummaryStructure(documentReference);
    if (!structure) {
        return;
    }
    const {
        wrapperElement,
        titleElement,
        introParagraphElement,
        secondaryParagraphElement,
        listElement,
        outroParagraphElement
    } = structure;

    titleElement.textContent = SummaryText.TITLE;
    introParagraphElement.textContent = SummaryText.INTRO;
    secondaryParagraphElement.textContent = SummaryText.SECOND_PARAGRAPH;
    outroParagraphElement.textContent = SummaryText.OUTRO;

    listElement.textContent = TextContent.EMPTY;

    const allergenEntries = Array.isArray(allergensCatalog) ? allergensCatalog : [];
    const dishesMap = dishesByAllergenToken instanceof Map
        ? dishesByAllergenToken
        : new Map(Object.entries(dishesByAllergenToken || {}));

    for (const allergenDescriptor of allergenEntries) {
        if (!allergenDescriptor || typeof allergenDescriptor !== "object") {
            continue;
        }
        const allergenToken = String(allergenDescriptor.token || TextContent.EMPTY);
        if (!allergenToken) {
            continue;
        }
        const allergenLabel = allergenDescriptor.label || allergenToken;
        const allergenEmoji = allergenDescriptor.emoji || TextContent.EMPTY;
        const associatedDishes = dishesMap.get(allergenToken) || [];
        const dishCount = Array.isArray(associatedDishes) ? associatedDishes.length : 0;
        const sampleNames = Array.isArray(associatedDishes)
            ? associatedDishes
                .slice(0, 3)
                .map((dishRecord) => dishRecord?.name || dishRecord?.title || dishRecord?.id || TextContent.EMPTY)
                .filter(Boolean)
            : [];

        const listItemElement = documentReference.createElement("li");
        const strongElement = documentReference.createElement("strong");
        strongElement.textContent = allergenEmoji
            ? `${allergenEmoji}${TextContent.SPACE}${allergenLabel}`
            : allergenLabel;
        listItemElement.appendChild(strongElement);
        listItemElement.appendChild(documentReference.createTextNode(" — "));
        listItemElement.appendChild(
            documentReference.createTextNode(formatSummaryDetail(dishCount, sampleNames))
        );
        listElement.appendChild(listItemElement);
    }

    wrapperElement.hidden = false;
}
