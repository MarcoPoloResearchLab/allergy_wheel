// @ts-check

/* global document */
import {
    AttributeName,
    AttributeBooleanValue,
    BrowserEventName,
    HeartsElementId,
    HeartsText,
    WheelConfiguration
} from "../constants.js";

const ElementTagName = Object.freeze({
    SPAN: "span"
});

const HeartClassName = Object.freeze({
    HEART: "heart",
    EMPTY: "heart-empty"
});

const HeartAnimationClassName = Object.freeze({
    ENTER: "heart-enter"
});

const HeartsBarClassName = Object.freeze({
    PULSE: "pulse",
    SHAKE: "shake"
});

const HeartDeltaClassName = Object.freeze({
    BASE: "heart-delta"
});

const AnimationDurationMilliseconds = Object.freeze({
    HEART_ENTER: 300,
    HEART_BAR_FEEDBACK: 350,
    HEART_DELTA: 800,
    SAFETY_BUFFER: 120
});

const HeartsBarChildClassName = Object.freeze({
    COUNT: "heart-count",
    ICONS: "heart-icons",
    GOAL: "heart-goal"
});

const HeartsBarChildSelector = Object.freeze({
    COUNT: `.${HeartsBarChildClassName.COUNT}`,
    ICONS: `.${HeartsBarChildClassName.ICONS}`
});

const TextContent = Object.freeze({
    ZERO: "0"
});

const NumericBase = Object.freeze({
    DECIMAL: 10
});

function formatHeartsLabel(totalHearts) {
    return `${totalHearts}${HeartsText.OF}${WheelConfiguration.WIN_CONDITION_HEARTS}${HeartsText.LABEL_SUFFIX}`;
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

    let goalElement = heartsBarElement.querySelector(`.${HeartsBarChildClassName.GOAL}`);
    if (!goalElement) {
        goalElement = document.createElement(ElementTagName.SPAN);
        goalElement.className = HeartsBarChildClassName.GOAL;
        goalElement.textContent = HeartsText.GOAL;
        heartsBarElement.appendChild(goalElement);
    }
    return { heartCountElement, heartIconsContainerElement };
}

function updateHeartCountElement(heartCountElement, heartCountText) {
    heartCountElement.textContent = heartCountText;
}

function createHeartElement({ filled, shouldAnimateEnter = false }) {
    const heartElement = document.createElement(ElementTagName.SPAN);
    heartElement.className = HeartClassName.HEART;
    heartElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.TRUE);
    heartElement.textContent = filled ? HeartsText.FILLED_SYMBOL : HeartsText.EMPTY_SYMBOL;
    heartElement.classList.toggle(HeartClassName.EMPTY, !filled);

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

/**
 * Renders the hearts bar to reflect the provided count.
 *
 * @param {number} count - Current heart total.
 * @param {{ animate?: boolean }} [options] - Animation options.
 */
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
    const heartElements = Array.from({ length: WheelConfiguration.WIN_CONDITION_HEARTS }, (_, heartIndex) =>
        createHeartElement({
            filled: heartIndex < totalHearts,
            shouldAnimateEnter: animate && heartIndex >= previousCount && heartIndex < totalHearts
        }));
    heartIconsContainerElement.replaceChildren(...heartElements);
    updateHeartCountElement(heartCountElement,
        `${heartCountText}${HeartsText.COUNT_SEPARATOR}${WheelConfiguration.WIN_CONDITION_HEARTS}`);
    setMetadataAttributes(heartsBarElement, totalHearts, heartCountText);
}

/**
 * Animates heart gain feedback originating from the reveal card.
 */
export function animateHeartGainFromReveal() {
    const heartsBarElement = document.getElementById(HeartsElementId.HEARTS_BAR);
    if (!heartsBarElement) {
        return;
    }

    triggerHeartsBarFeedback(heartsBarElement, HeartsBarClassName.PULSE);
    spawnHeartDelta(heartsBarElement, HeartsText.DELTA_GAIN);
}

/**
 * Animates heart loss feedback directly on the hearts bar.
 */
export function animateHeartLossAtHeartsBar() {
    const heartsBarElement = document.getElementById(HeartsElementId.HEARTS_BAR);
    if (!heartsBarElement) {
        return;
    }

    triggerHeartsBarFeedback(heartsBarElement, HeartsBarClassName.SHAKE);
    spawnHeartDelta(heartsBarElement, HeartsText.DELTA_LOSS);
}
