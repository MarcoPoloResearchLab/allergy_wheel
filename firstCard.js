/* global document */

const ElementClassName = Object.freeze({
    CHIP: "chip",
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
    EMPTY: "",
    SPACE_PREFIX: " "
});

const EventName = Object.freeze({
    CHANGE: "change"
});

const ValueType = Object.freeze({
    FUNCTION: typeof Function,
    STRING: typeof ""
});

export class AllergenCard {
    #listContainerElement;

    #badgeContainerElement;

    #onAllergenSelected;

    constructor({ listContainerElement, badgeContainerElement, onAllergenSelected } = {}) {
        this.#listContainerElement = listContainerElement || null;
        this.#badgeContainerElement = badgeContainerElement || null;
        this.#onAllergenSelected = typeof onAllergenSelected === ValueType.FUNCTION
            ? onAllergenSelected
            : null;
    }

    renderAllergens(allergenList) {
        if (!this.#listContainerElement) {
            return;
        }

        this.#listContainerElement.innerHTML = TextContent.EMPTY;
        const safeAllergens = Array.isArray(allergenList) ? allergenList : [];

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

            radioElement.addEventListener(EventName.CHANGE, () => {
                this.#handleAllergenSelection({
                    token: allergenToken,
                    label: allergenLabel,
                    emoji: allergenEmoji
                });
            });

            const textNode = document.createTextNode(`${TextContent.SPACE_PREFIX}${allergenLabel}`);

            const emojiSpan = document.createElement(ElementTagName.SPAN);
            emojiSpan.className = ElementClassName.EMOJI_LARGE;
            emojiSpan.textContent = allergenEmoji;

            labelElement.appendChild(radioElement);
            labelElement.appendChild(textNode);
            labelElement.appendChild(emojiSpan);

            this.#listContainerElement.appendChild(labelElement);
        }
    }

    updateBadges(allergenEntries) {
        if (!this.#badgeContainerElement) {
            return;
        }

        this.#badgeContainerElement.textContent = TextContent.EMPTY;

        for (const allergenEntry of allergenEntries || []) {
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
                badgeElement.appendChild(emojiSpan);
            }

            this.#badgeContainerElement.appendChild(badgeElement);
        }
    }

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
