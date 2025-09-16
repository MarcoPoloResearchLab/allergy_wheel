/* global document */

const ElementClassName = Object.freeze({
    CHIP: "chip",
    BADGE: "badge",
    EMOJI_LARGE: "emoji-large"
});

const ElementId = Object.freeze({
    SELECTED_BADGES: "sel-badges"
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

export function renderAllergenList(containerElement, allergenList, onSelectCallback) {
    if (!containerElement) {
        return;
    }

    containerElement.innerHTML = TextContent.EMPTY;
    const safeAllergens = Array.isArray(allergenList) ? allergenList : [];

    for (const allergenItem of safeAllergens) {
        if (!allergenItem || !allergenItem.token) {
            continue;
        }

        const allergenToken = allergenItem.token;
        const allergenLabel = allergenItem.label || allergenToken;
        const allergenEmoji = allergenItem.emoji || TextContent.EMPTY;

        const labelElement = document.createElement(ElementTagName.LABEL);
        labelElement.className = ElementClassName.CHIP;

        const radioElement = document.createElement(ElementTagName.INPUT);
        radioElement.type = RadioInputConfiguration.TYPE;
        radioElement.name = RadioInputConfiguration.NAME;
        radioElement.value = allergenToken;

        if (typeof onSelectCallback === ValueType.FUNCTION) {
            radioElement.addEventListener(EventName.CHANGE, () => {
                onSelectCallback(allergenToken, allergenLabel);
            });
        }

        const textNode = document.createTextNode(`${TextContent.SPACE_PREFIX}${allergenLabel}`);

        const emojiSpan = document.createElement(ElementTagName.SPAN);
        emojiSpan.className = ElementClassName.EMOJI_LARGE;
        emojiSpan.textContent = allergenEmoji;

        labelElement.appendChild(radioElement);
        labelElement.appendChild(textNode);
        labelElement.appendChild(emojiSpan);

        containerElement.appendChild(labelElement);
    }
}

export function refreshSelectedAllergenBadges(allergenEntries) {
    const badgesContainer = document.getElementById(ElementId.SELECTED_BADGES);
    if (!badgesContainer) {
        return;
    }

    badgesContainer.textContent = TextContent.EMPTY;

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

        badgesContainer.appendChild(badgeElement);
    }
}
