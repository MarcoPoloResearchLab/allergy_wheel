/* global document */
import {
    AttributeName,
    AttributeBooleanValue,
    BrowserEventName,
    HeartsElementId
} from "./constants.js";

const ElementTagName = Object.freeze({
    SPAN: "span"
});

const HeartClassName = Object.freeze({
    HEART: "heart"
});

const HeartAnimationClassName = Object.freeze({
    ENTER: "heart-enter",
    EXIT: "heart-exit"
});

const HeartsBarClassName = Object.freeze({
    PULSE: "pulse",
    SHAKE: "shake"
});

const HeartDeltaClassName = Object.freeze({
    BASE: "heart-delta"
});

const HeartDeltaText = Object.freeze({
    GAIN: "+1",
    LOSS: "-1"
});

const AnimationDurationMilliseconds = Object.freeze({
    HEART_ENTER: 300,
    HEART_EXIT: 260,
    HEART_BAR_FEEDBACK: 350,
    HEART_DELTA: 800,
    SAFETY_BUFFER: 120
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
        const heartElement = createHeartElement();
        heartIconsContainerElement.appendChild(heartElement);
    }
}

function appendGainHearts(heartIconsContainerElement, heartsToAdd) {
    for (let heartGainIndex = 0; heartGainIndex < heartsToAdd; heartGainIndex += 1) {
        const heartElement = createHeartElement({ shouldAnimateEnter: true });
        heartIconsContainerElement.appendChild(heartElement);
    }
}

function removeHeartElements(heartIconsContainerElement, heartsToRemove) {
    if (!heartIconsContainerElement || heartsToRemove <= 0) {
        return;
    }

    const existingHeartElements = Array.from(
        heartIconsContainerElement.querySelectorAll(HeartSelector.HEART)
    );

    const removableHeartElements = existingHeartElements.filter(
        (heartElement) => !heartElement.classList.contains(HeartAnimationClassName.EXIT)
    );

    const heartsMarkedForRemoval = removableHeartElements.slice(-heartsToRemove);

    heartsMarkedForRemoval.forEach((heartElement) => {
        if (!heartElement) {
            return;
        }

        heartElement.classList.remove(HeartAnimationClassName.ENTER);
        heartElement.classList.add(HeartAnimationClassName.EXIT);

        const cleanup = () => {
            heartElement.removeEventListener(BrowserEventName.ANIMATION_END, handleAnimationEnd);
            if (heartElement.parentNode === heartIconsContainerElement) {
                heartIconsContainerElement.removeChild(heartElement);
            }
        };

        const fallbackTimeoutId = setTimeout(
            cleanup,
            AnimationDurationMilliseconds.HEART_EXIT + AnimationDurationMilliseconds.SAFETY_BUFFER
        );

        function handleAnimationEnd(event) {
            if (event.target !== heartElement) {
                return;
            }
            clearTimeout(fallbackTimeoutId);
            cleanup();
        }

        heartElement.addEventListener(BrowserEventName.ANIMATION_END, handleAnimationEnd);
    });
}

function createHeartElement({ shouldAnimateEnter = false } = {}) {
    const heartElement = document.createElement(ElementTagName.SPAN);
    heartElement.className = HeartClassName.HEART;
    heartElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
    heartElement.textContent = HeartSymbol;

    if (!shouldAnimateEnter) {
        return heartElement;
    }

    heartElement.classList.add(HeartAnimationClassName.ENTER);

    const cleanup = () => {
        heartElement.removeEventListener(BrowserEventName.ANIMATION_END, handleAnimationEnd);
        heartElement.classList.remove(HeartAnimationClassName.ENTER);
    };

    const fallbackTimeoutId = setTimeout(
        cleanup,
        AnimationDurationMilliseconds.HEART_ENTER + AnimationDurationMilliseconds.SAFETY_BUFFER
    );

    function handleAnimationEnd(event) {
        if (event.target !== heartElement) {
            return;
        }
        clearTimeout(fallbackTimeoutId);
        cleanup();
    }

    heartElement.addEventListener(BrowserEventName.ANIMATION_END, handleAnimationEnd);

    return heartElement;
}

function removeExistingHeartDeltaElements(heartsBarElement) {
    if (!heartsBarElement) {
        return;
    }

    const existingDeltaElements = heartsBarElement.getElementsByClassName(HeartDeltaClassName.BASE);
    const deltaElements = Array.from(existingDeltaElements);
    deltaElements.forEach((deltaElement) => {
        if (deltaElement && typeof deltaElement.remove === "function") {
            deltaElement.remove();
        }
    });
}

function spawnHeartDelta(heartsBarElement, deltaText) {
    if (!heartsBarElement || !deltaText) {
        return;
    }

    removeExistingHeartDeltaElements(heartsBarElement);

    const deltaElement = document.createElement(ElementTagName.SPAN);
    deltaElement.className = HeartDeltaClassName.BASE;
    deltaElement.textContent = deltaText;
    heartsBarElement.appendChild(deltaElement);

    const cleanup = () => {
        deltaElement.removeEventListener(BrowserEventName.ANIMATION_END, handleAnimationEnd);
        if (deltaElement.parentNode === heartsBarElement) {
            heartsBarElement.removeChild(deltaElement);
        }
    };

    const fallbackTimeoutId = setTimeout(
        cleanup,
        AnimationDurationMilliseconds.HEART_DELTA + AnimationDurationMilliseconds.SAFETY_BUFFER
    );

    function handleAnimationEnd(event) {
        if (event.target !== deltaElement) {
            return;
        }
        clearTimeout(fallbackTimeoutId);
        cleanup();
    }

    deltaElement.addEventListener(BrowserEventName.ANIMATION_END, handleAnimationEnd);
}

function triggerHeartsBarFeedback(heartsBarElement, feedbackClassName) {
    if (!heartsBarElement || !feedbackClassName) {
        return;
    }

    if (heartsBarElement.classList.contains(feedbackClassName)) {
        heartsBarElement.classList.remove(feedbackClassName);
        // Force a reflow so that re-adding the class retriggers the animation.
        void heartsBarElement.offsetWidth; // eslint-disable-line no-unused-expressions
    }

    heartsBarElement.classList.add(feedbackClassName);

    const cleanup = () => {
        heartsBarElement.removeEventListener(BrowserEventName.ANIMATION_END, handleAnimationEnd);
        heartsBarElement.classList.remove(feedbackClassName);
    };

    const fallbackTimeoutId = setTimeout(
        cleanup,
        AnimationDurationMilliseconds.HEART_BAR_FEEDBACK + AnimationDurationMilliseconds.SAFETY_BUFFER
    );

    function handleAnimationEnd(event) {
        if (event.target !== heartsBarElement) {
            return;
        }
        clearTimeout(fallbackTimeoutId);
        cleanup();
    }

    heartsBarElement.addEventListener(BrowserEventName.ANIMATION_END, handleAnimationEnd);
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
    const heartsBarElement = document.getElementById(HeartsElementId.HEARTS_BAR);
    if (!heartsBarElement) {
        return;
    }

    triggerHeartsBarFeedback(heartsBarElement, HeartsBarClassName.PULSE);
    spawnHeartDelta(heartsBarElement, HeartDeltaText.GAIN);
}

export function animateHeartLossAtHeartsBar() {
    const heartsBarElement = document.getElementById(HeartsElementId.HEARTS_BAR);
    if (!heartsBarElement) {
        return;
    }

    triggerHeartsBarFeedback(heartsBarElement, HeartsBarClassName.SHAKE);
    spawnHeartDelta(heartsBarElement, HeartDeltaText.LOSS);
}
