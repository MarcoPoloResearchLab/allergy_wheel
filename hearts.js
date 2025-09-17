/* global document */
import { AttributeName, AttributeBooleanValue, HeartsElementId } from "./constants.js";

const ElementTagName = Object.freeze({
    SPAN: "span"
});

const HeartClassName = Object.freeze({
    HEART: "heart",
    HEART_GAIN: "heart gain"
});

const HeartsBarChildClassName = Object.freeze({
    COUNT: "heart-count",
    ICONS: "heart-icons"
});

const HeartSelector = Object.freeze({
    HEART: ".heart"
});

const HeartsBarChildSelector = Object.freeze({
    COUNT: `.${HeartsBarChildClassName.COUNT}`,
    ICONS: `.${HeartsBarChildClassName.ICONS}`
});

const HeartSymbol = "❤️";

const TextContent = Object.freeze({
    EMPTY: "",
    ZERO: "0",
    HEART_LABEL_SUFFIX: " hearts"
});

const NumericBase = Object.freeze({
    DECIMAL: 10
});

function formatHeartsLabel(totalHearts) {
    return `${totalHearts}${TextContent.HEART_LABEL_SUFFIX}`;
}

function setMetadataAttributes(heartsBarElement, totalHearts, heartCountText) {
    const totalLabel = formatHeartsLabel(totalHearts);
    heartsBarElement.setAttribute(AttributeName.DATA_COUNT, heartCountText);
    heartsBarElement.setAttribute(AttributeName.ARIA_LABEL, totalLabel);
    heartsBarElement.title = totalLabel;
}

function ensureHeartsBarChildren(heartsBarElement) {
    let heartCountElement = heartsBarElement.querySelector(HeartsBarChildSelector.COUNT);
    if (!heartCountElement) {
        heartCountElement = document.createElement(ElementTagName.SPAN);
        heartCountElement.className = HeartsBarChildClassName.COUNT;
        heartsBarElement.insertBefore(heartCountElement, heartsBarElement.firstChild);
    }

    let heartIconsContainerElement = heartsBarElement.querySelector(HeartsBarChildSelector.ICONS);
    if (!heartIconsContainerElement) {
        heartIconsContainerElement = document.createElement(ElementTagName.SPAN);
        heartIconsContainerElement.className = HeartsBarChildClassName.ICONS;
        heartIconsContainerElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
        heartsBarElement.appendChild(heartIconsContainerElement);
    } else if (!heartIconsContainerElement.hasAttribute(AttributeName.ARIA_HIDDEN)) {
        heartIconsContainerElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
    }

    const heartsBarChildren = Array.from(heartsBarElement.children);
    heartsBarChildren.forEach((childElement) => {
        if (childElement === heartCountElement || childElement === heartIconsContainerElement) {
            return;
        }

        if (childElement.classList && childElement.classList.contains(HeartClassName.HEART)) {
            heartIconsContainerElement.appendChild(childElement);
        }
    });

    return { heartCountElement, heartIconsContainerElement };
}

function updateHeartCountElement(heartCountElement, heartCountText) {
    heartCountElement.textContent = heartCountText;
}

function appendHeartElements(heartIconsContainerElement, totalHearts) {
    heartIconsContainerElement.innerHTML = TextContent.EMPTY;
    for (let heartIndex = 0; heartIndex < totalHearts; heartIndex += 1) {
        const heartElement = document.createElement(ElementTagName.SPAN);
        heartElement.className = HeartClassName.HEART;
        heartElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
        heartElement.textContent = HeartSymbol;
        heartIconsContainerElement.appendChild(heartElement);
    }
}

function appendGainHearts(heartIconsContainerElement, heartsToAdd) {
    for (let heartGainIndex = 0; heartGainIndex < heartsToAdd; heartGainIndex += 1) {
        const heartElement = document.createElement(ElementTagName.SPAN);
        heartElement.className = HeartClassName.HEART_GAIN;
        heartElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
        heartElement.textContent = HeartSymbol;
        heartIconsContainerElement.appendChild(heartElement);
    }
}

function removeHeartElements(heartIconsContainerElement, heartsToRemove) {
    for (let removalIndex = 0; removalIndex < heartsToRemove; removalIndex += 1) {
        const heartElement = heartIconsContainerElement.querySelector(HeartSelector.HEART);
        if (!heartElement) {
            return;
        }
        heartIconsContainerElement.removeChild(heartElement);
    }
}

export function renderHearts(count, options = {}) {
    const { animate = false } = options;
    const heartsBarElement = document.getElementById(HeartsElementId.HEARTS_BAR);
    if (!heartsBarElement) {
        return;
    }

    const { heartCountElement, heartIconsContainerElement } = ensureHeartsBarChildren(heartsBarElement);

    const previousCount = parseInt(
        heartsBarElement.getAttribute(AttributeName.DATA_COUNT) || TextContent.ZERO,
        NumericBase.DECIMAL
    );
    const totalHearts = Math.max(0, Math.floor(count || 0));
    const heartCountText = String(totalHearts);

    if (!animate || previousCount === 0) {
        appendHeartElements(heartIconsContainerElement, totalHearts);
        updateHeartCountElement(heartCountElement, heartCountText);
        setMetadataAttributes(heartsBarElement, totalHearts, heartCountText);
        return;
    }

    const heartCountDelta = totalHearts - previousCount;
    if (heartCountDelta > 0) {
        appendGainHearts(heartIconsContainerElement, heartCountDelta);
    } else if (heartCountDelta < 0) {
        const heartsToRemove = Math.min(previousCount, -heartCountDelta);
        removeHeartElements(heartIconsContainerElement, heartsToRemove);
    }

    updateHeartCountElement(heartCountElement, heartCountText);
    setMetadataAttributes(heartsBarElement, totalHearts, heartCountText);
}

export function animateHeartGainFromReveal() {
    /* handled in CSS or implemented elsewhere */
}

export function animateHeartLossAtHeartsBar() {
    /* handled in CSS or implemented elsewhere */
}
