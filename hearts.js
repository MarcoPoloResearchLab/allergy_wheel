/* global document */

const ElementId = Object.freeze({
    HEARTS_BAR: "hearts-bar"
});

const AttributeName = Object.freeze({
    DATA_COUNT: "data-count",
    ARIA_LABEL: "aria-label",
    ARIA_HIDDEN: "aria-hidden"
});

const AttributeValue = Object.freeze({
    TRUE: "true"
});

const ElementTagName = Object.freeze({
    SPAN: "span"
});

const HeartClassName = Object.freeze({
    HEART: "heart",
    HEART_GAIN: "heart gain"
});

const HeartSelector = Object.freeze({
    HEART: ".heart"
});

const HeartSymbol = "❤️";

const TextContent = Object.freeze({
    EMPTY: "",
    HEART_LABEL_SUFFIX: " hearts"
});

const NumericBase = Object.freeze({
    DECIMAL: 10
});

function setMetadataAttributes(heartsBarElement, totalHearts) {
    const totalLabel = `${totalHearts}${TextContent.HEART_LABEL_SUFFIX}`;
    heartsBarElement.setAttribute(AttributeName.DATA_COUNT, String(totalHearts));
    heartsBarElement.setAttribute(AttributeName.ARIA_LABEL, totalLabel);
    heartsBarElement.title = totalLabel;
}

function appendHeartElements(heartsBarElement, totalHearts) {
    heartsBarElement.innerHTML = TextContent.EMPTY;
    for (let heartIndex = 0; heartIndex < totalHearts; heartIndex += 1) {
        const heartElement = document.createElement(ElementTagName.SPAN);
        heartElement.className = HeartClassName.HEART;
        heartElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeValue.TRUE);
        heartElement.textContent = HeartSymbol;
        heartsBarElement.appendChild(heartElement);
    }
}

function appendGainHearts(heartsBarElement, heartsToAdd) {
    for (let heartGainIndex = 0; heartGainIndex < heartsToAdd; heartGainIndex += 1) {
        const heartElement = document.createElement(ElementTagName.SPAN);
        heartElement.className = HeartClassName.HEART_GAIN;
        heartElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeValue.TRUE);
        heartElement.textContent = HeartSymbol;
        heartsBarElement.appendChild(heartElement);
    }
}

function removeHeartElements(heartsBarElement, heartsToRemove) {
    for (let removalIndex = 0; removalIndex < heartsToRemove; removalIndex += 1) {
        const heartElement = heartsBarElement.querySelector(HeartSelector.HEART);
        if (!heartElement) {
            return;
        }
        heartsBarElement.removeChild(heartElement);
    }
}

export function renderHearts(count, options = {}) {
    const { animate = false } = options;
    const heartsBarElement = document.getElementById(ElementId.HEARTS_BAR);
    if (!heartsBarElement) {
        return;
    }

    const previousCount = parseInt(
        heartsBarElement.getAttribute(AttributeName.DATA_COUNT) || "0",
        NumericBase.DECIMAL
    );
    const totalHearts = Math.max(0, Math.floor(count || 0));

    if (!animate || previousCount === 0) {
        appendHeartElements(heartsBarElement, totalHearts);
        setMetadataAttributes(heartsBarElement, totalHearts);
        return;
    }

    const delta = totalHearts - previousCount;
    if (delta > 0) {
        appendGainHearts(heartsBarElement, delta);
    } else if (delta < 0) {
        const heartsToRemove = Math.min(previousCount, -delta);
        removeHeartElements(heartsBarElement, heartsToRemove);
    }

    setMetadataAttributes(heartsBarElement, totalHearts);
}

export function animateHeartGainFromReveal() {
    /* handled in CSS or implemented elsewhere */
}

export function animateHeartLossAtHeartsBar() {
    /* handled in CSS or implemented elsewhere */
}
