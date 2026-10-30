// @ts-check

/* global document */
import { AttributeBooleanValue, AttributeName, BrowserEventName, ControlElementId } from "../constants.js";

/** @typedef {import("../types.js").AllergenDescriptor} AllergenDescriptor */
/** @typedef {import("../types.js").AllergenBadgeEntry} AllergenBadgeEntry */

const ElementClassName = Object.freeze({
    CHIP: "chip",
    CHIP_SELECTED: "chip--selected",
    CHIP_RADIO: "chip__radio",
    CHIP_LABEL: "chip__label",
    CHIP_EMOJI: "chip__emoji",
    BADGE: "badge",
    EMOJI_LARGE: "emoji-large"
});

const RadioInputConfiguration = Object.freeze({
    TYPE: "radio",
    NAME: "allergen_single"
});

const ElementTagName = Object.freeze({
    LABEL: "label",
    INPUT: "input",
    SPAN: "span"
});

const TextContent = Object.freeze({
    EMPTY: ""
});

const ValueType = Object.freeze({
    FUNCTION: typeof Function,
    STRING: typeof ""
});

export class AllergenCard {
    #listContainerElement;

    #badgeContainerElement;

    #onAllergenSelected;

    /**
     * @param {{
     *     listContainerElement?: HTMLElement,
     *     badgeContainerElement?: HTMLElement,
     *     onAllergenSelected?: (descriptor: AllergenDescriptor) => void
     * }} [dependencies]
     */
    constructor({ listContainerElement, badgeContainerElement, onAllergenSelected } = {}) {
        this.#listContainerElement = listContainerElement || null;
        this.#badgeContainerElement = badgeContainerElement || null;
        this.#onAllergenSelected = typeof onAllergenSelected === ValueType.FUNCTION
            ? onAllergenSelected
            : null;
    }

    /**
     * Renders allergen chips into the configured list container.
     *
     * @param {AllergenDescriptor[]} allergenList - Collection of allergens available for selection.
     */
    renderAllergens(allergenList) {
        if (!this.#listContainerElement) {
            return;
        }

        const startButtonElement = ControlElementId.START_BUTTON
            ? document.getElementById(ControlElementId.START_BUTTON)
            : null;

        const existingChipElements = this.#listContainerElement
            .querySelectorAll(`.${ElementClassName.CHIP}`);

        for (const chipElement of existingChipElements) {
            chipElement.remove();
        }

        const safeAllergens = Array.isArray(allergenList) ? allergenList : [];

        const shouldInsertBeforeStartButton = Boolean(
            startButtonElement && this.#listContainerElement.contains(startButtonElement)
        );

        for (const allergenRecord of safeAllergens) {
            if (!allergenRecord || !allergenRecord.token) {
                continue;
            }

            const allergenToken = allergenRecord.token;
            const allergenLabel = allergenRecord.label || allergenToken;
            const allergenEmoji = allergenRecord.emoji || TextContent.EMPTY;

            const labelElement = document.createElement(ElementTagName.LABEL);
            labelElement.className = ElementClassName.CHIP;

            const radioElement = document.createElement(ElementTagName.INPUT);
            radioElement.type = RadioInputConfiguration.TYPE;
            radioElement.name = RadioInputConfiguration.NAME;
            radioElement.value = allergenToken;
            radioElement.className = ElementClassName.CHIP_RADIO;
            radioElement.setAttribute(AttributeName.ARIA_LABEL, allergenLabel);
            radioElement.addEventListener(BrowserEventName.CHANGE, () => {
                this.#setSelectedChip(labelElement);
                this.#handleAllergenSelection({
                    token: allergenToken,
                    label: allergenLabel,
                    emoji: allergenEmoji
                });
            });

            const labelSpan = document.createElement(ElementTagName.SPAN);
            labelSpan.className = ElementClassName.CHIP_LABEL;
            labelSpan.textContent = allergenLabel;

            const emojiSpan = document.createElement(ElementTagName.SPAN);
            emojiSpan.classList.add(ElementClassName.CHIP_EMOJI);
            emojiSpan.textContent = allergenEmoji;
            emojiSpan.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);

            labelElement.appendChild(radioElement);
            labelElement.appendChild(labelSpan);
            labelElement.appendChild(emojiSpan);

            if (shouldInsertBeforeStartButton) {
                this.#listContainerElement.insertBefore(labelElement, startButtonElement);
            } else {
                this.#listContainerElement.appendChild(labelElement);
            }
        }
    }

    /**
     * Updates the badge container to reflect the selected allergen(s).
     *
     * @param {(AllergenBadgeEntry|string)[]} allergenEntries - Badge descriptors or string labels to render.
     */
    updateBadges(allergenEntries) {
        if (!this.#badgeContainerElement) {
            return;
        }

        this.#badgeContainerElement.textContent = TextContent.EMPTY;

        const normalizedEntries = Array.isArray(allergenEntries) ? allergenEntries : [];

        if (normalizedEntries.length === 0) {
            this.#clearChipSelection();
            return;
        }

        for (const allergenEntry of normalizedEntries) {
            const labelText = typeof allergenEntry === ValueType.STRING
                ? allergenEntry
                : (allergenEntry && allergenEntry.label) || TextContent.EMPTY;
            const emojiText = typeof allergenEntry === ValueType.STRING
                ? TextContent.EMPTY
                : (allergenEntry && allergenEntry.emoji) || TextContent.EMPTY;

            const badgeElement = document.createElement(ElementTagName.SPAN);
            badgeElement.className = ElementClassName.BADGE;

            const labelSpan = document.createElement(ElementTagName.SPAN);
            labelSpan.textContent = labelText;
            badgeElement.appendChild(labelSpan);

            if (emojiText) {
                const emojiSpan = document.createElement(ElementTagName.SPAN);
                emojiSpan.className = ElementClassName.EMOJI_LARGE;
                emojiSpan.textContent = emojiText;
                emojiSpan.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
                badgeElement.appendChild(emojiSpan);
            }

            this.#badgeContainerElement.appendChild(badgeElement);
        }
    }

    #setSelectedChip(selectedChipElement) {
        if (!this.#listContainerElement || !selectedChipElement) {
            return;
        }

        const chipElements = this.#listContainerElement
            .querySelectorAll(`.${ElementClassName.CHIP}`);

        for (const chipElement of chipElements) {
            const shouldMarkSelected = chipElement === selectedChipElement;
            chipElement.classList.toggle(ElementClassName.CHIP_SELECTED, shouldMarkSelected);
        }
    }

    #clearChipSelection() {
        if (!this.#listContainerElement) {
            return;
        }

        const chipElements = this.#listContainerElement
            .querySelectorAll(`.${ElementClassName.CHIP}`);

        for (const chipElement of chipElements) {
            chipElement.classList.remove(ElementClassName.CHIP_SELECTED);
            const inputElements = chipElement.getElementsByTagName(ElementTagName.INPUT);
            if (inputElements && inputElements.length > 0) {
                const radioInputElement = inputElements[0];
                if (radioInputElement && radioInputElement.type === RadioInputConfiguration.TYPE) {
                    radioInputElement.checked = false;
                }
            }
        }
    }

    /**
     * Emits the selected allergen descriptor through the configured callback.
     *
     * @param {AllergenDescriptor} allergenDescriptor - Descriptor representing the chosen allergen.
     */
    #handleAllergenSelection(allergenDescriptor) {
        if (typeof this.#onAllergenSelected !== ValueType.FUNCTION) {
            return;
        }

        const descriptor = allergenDescriptor || {};
        this.#onAllergenSelected({
            token: descriptor.token,
            label: descriptor.label,
            emoji: descriptor.emoji
        });
    }
}
