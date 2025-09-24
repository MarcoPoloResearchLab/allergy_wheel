// @ts-check

import {
    AttributeBooleanValue,
    AttributeName,
    AvatarCatalog,
    AvatarClassName,
    AvatarId,
    AvatarMenuText,
    GlobalClassName
} from "../constants.js";

/** @typedef {import("../types.js").AvatarDescriptor} AvatarDescriptor */

const HtmlTagName = Object.freeze({
    BUTTON: "button",
    IMG: "img",
    SPAN: "span"
});

/**
 * Resolves the active avatar descriptor from the provided catalog and selected identifier.
 *
 * @param {{ avatarCatalog: AvatarDescriptor[], selectedAvatarId?: string }} options
 * @returns {AvatarDescriptor | null}
 */
function resolveActiveAvatarDescriptor({
    avatarCatalog,
    selectedAvatarId
}) {
    const descriptorMap = buildAvatarDescriptorMap(avatarCatalog);
    const defaultDescriptor = descriptorMap.get(AvatarId.DEFAULT) || avatarCatalog[0] || null;
    if (!selectedAvatarId) {
        return defaultDescriptor;
    }
    return descriptorMap.get(selectedAvatarId) || defaultDescriptor;
}

/**
 * Creates the avatar image element for the toggle button.
 *
 * @param {{
 *     documentReference: Document,
 *     avatarClassNameMap: typeof AvatarClassName,
 *     avatarMenuText: typeof AvatarMenuText,
 *     activeDescriptor: AvatarDescriptor | null
 * }} options
 * @returns {HTMLImageElement}
 */
function createToggleImageElement({
    documentReference,
    avatarClassNameMap,
    avatarMenuText,
    activeDescriptor
}) {
    const imageElement = documentReference.createElement(HtmlTagName.IMG);
    if (avatarClassNameMap.IMAGE) {
        imageElement.className = avatarClassNameMap.IMAGE;
    }
    if (activeDescriptor) {
        imageElement.src = activeDescriptor.assetPath;
        imageElement.alt = `${activeDescriptor.displayName}${avatarMenuText.TOGGLE_ALT_SUFFIX}`;
    } else {
        imageElement.alt = "";
    }
    return imageElement;
}

/**
 * Creates the label element accompanying the avatar toggle.
 *
 * @param {{
 *     documentReference: Document,
 *     avatarClassNameMap: typeof AvatarClassName,
 *     activeDescriptor: AvatarDescriptor | null,
 *     globalClassName: typeof GlobalClassName
 * }} options
 * @returns {HTMLSpanElement}
 */
function createToggleLabelElement({
    documentReference,
    avatarClassNameMap,
    activeDescriptor,
    globalClassName
}) {
    const labelElement = documentReference.createElement(HtmlTagName.SPAN);
    if (avatarClassNameMap.LABEL) {
        labelElement.classList.add(avatarClassNameMap.LABEL);
    }
    if (globalClassName && globalClassName.VISUALLY_HIDDEN) {
        labelElement.classList.add(globalClassName.VISUALLY_HIDDEN);
    }
    labelElement.textContent = activeDescriptor ? activeDescriptor.displayName : "";
    return labelElement;
}

function createVisuallyHiddenPrompt({ documentReference, globalClassName, avatarMenuText }) {
    const hiddenPromptElement = documentReference.createElement(HtmlTagName.SPAN);
    if (globalClassName.VISUALLY_HIDDEN) {
        hiddenPromptElement.className = globalClassName.VISUALLY_HIDDEN;
    }
    hiddenPromptElement.textContent = avatarMenuText.TOGGLE_PROMPT;
    return hiddenPromptElement;
}

/**
 * Populates the avatar toggle button with prompt text, image, and label.
 *
 * @param {{
 *     toggleButtonElement: HTMLElement,
 *     activeDescriptor: AvatarDescriptor | null,
 *     documentReference: Document,
 *     avatarClassNameMap: typeof AvatarClassName,
 *     avatarMenuText: typeof AvatarMenuText,
 *     globalClassName: typeof GlobalClassName
 * }} options
 * @returns {{ imageElement: HTMLImageElement, labelElement: HTMLSpanElement }}
 */
function populateToggleButton({
    toggleButtonElement,
    activeDescriptor,
    documentReference,
    avatarClassNameMap,
    avatarMenuText,
    globalClassName
}) {
    toggleButtonElement.textContent = "";
    const hiddenPromptElement = createVisuallyHiddenPrompt({
        documentReference,
        globalClassName,
        avatarMenuText
    });
    const imageElement = createToggleImageElement({
        documentReference,
        avatarClassNameMap,
        avatarMenuText,
        activeDescriptor
    });
    const labelElement = createToggleLabelElement({
        documentReference,
        avatarClassNameMap,
        activeDescriptor,
        globalClassName
    });

    toggleButtonElement.appendChild(hiddenPromptElement);
    toggleButtonElement.appendChild(imageElement);
    toggleButtonElement.appendChild(labelElement);

    return { imageElement, labelElement };
}

/**
 * Builds a menu option button for a single avatar descriptor.
 *
 * @param {{
 *     documentReference: Document,
 *     avatarClassNameMap: typeof AvatarClassName,
 *     avatarMenuText: typeof AvatarMenuText,
 *     avatarDescriptor: AvatarDescriptor
 * }} options
 * @returns {HTMLButtonElement}
 */
function createMenuOptionButton({
    documentReference,
    avatarClassNameMap,
    avatarMenuText,
    avatarDescriptor
}) {
    const optionButtonElement = documentReference.createElement(HtmlTagName.BUTTON);
    optionButtonElement.type = HtmlTagName.BUTTON;
    if (avatarClassNameMap.BUTTON) {
        optionButtonElement.classList.add(avatarClassNameMap.BUTTON);
    }
    if (avatarClassNameMap.OPTION) {
        optionButtonElement.classList.add(avatarClassNameMap.OPTION);
    }
    optionButtonElement.dataset.avatarId = avatarDescriptor.id;

    const optionImageElement = documentReference.createElement(HtmlTagName.IMG);
    if (avatarClassNameMap.IMAGE) {
        optionImageElement.className = avatarClassNameMap.IMAGE;
    }
    optionImageElement.src = avatarDescriptor.assetPath;
    optionImageElement.alt = `${avatarDescriptor.displayName}${avatarMenuText.OPTION_ALT_SUFFIX}`;
    optionButtonElement.appendChild(optionImageElement);

    const optionLabelElement = documentReference.createElement(HtmlTagName.SPAN);
    if (avatarClassNameMap.LABEL) {
        optionLabelElement.classList.add(avatarClassNameMap.LABEL);
    }
    optionLabelElement.textContent = avatarDescriptor.displayName;
    optionButtonElement.appendChild(optionLabelElement);

    return optionButtonElement;
}

/**
 * Renders the avatar selection menu options inside the provided container element.
 *
 * @param {{
 *     menuContainerElement: HTMLElement,
 *     avatarCatalog: AvatarDescriptor[],
 *     documentReference: Document,
 *     avatarClassNameMap: typeof AvatarClassName,
 *     avatarMenuText: typeof AvatarMenuText
 * }} options
 */
function populateMenuContainer({
    menuContainerElement,
    avatarCatalog,
    documentReference,
    avatarClassNameMap,
    avatarMenuText
}) {
    menuContainerElement.textContent = "";
    for (const avatarDescriptor of avatarCatalog) {
        const optionButtonElement = createMenuOptionButton({
            documentReference,
            avatarClassNameMap,
            avatarMenuText,
            avatarDescriptor
        });
        menuContainerElement.appendChild(optionButtonElement);
    }
}

/**
 * Renders the avatar selection UI and returns references to the key elements.
 *
 * @param {{
 *     toggleButtonElement?: HTMLElement | null,
 *     menuContainerElement?: HTMLElement | null,
 *     selectedAvatarId?: string,
 *     avatarCatalog?: AvatarDescriptor[],
 *     avatarClassNameMap?: typeof AvatarClassName,
 *     avatarMenuText?: typeof AvatarMenuText,
 *     globalClassName?: typeof GlobalClassName,
 *     documentReference?: Document
 * }} [options]
 * @returns {{ imageElement: HTMLImageElement | null, labelElement: HTMLSpanElement | null }}
 */
export function renderAvatarSelector({
    toggleButtonElement,
    menuContainerElement,
    selectedAvatarId = AvatarId.DEFAULT,
    avatarCatalog = AvatarCatalog,
    avatarClassNameMap = AvatarClassName,
    avatarMenuText = AvatarMenuText,
    globalClassName = GlobalClassName,
    documentReference = document
} = {}) {
    if (!toggleButtonElement || !menuContainerElement) {
        return { imageElement: null, labelElement: null };
    }

    toggleButtonElement.setAttribute(AttributeName.ARIA_HAS_POPUP, AttributeBooleanValue.TRUE);
    toggleButtonElement.setAttribute(AttributeName.ARIA_EXPANDED, AttributeBooleanValue.FALSE);
    toggleButtonElement.setAttribute(AttributeName.ARIA_LABEL, avatarMenuText.TOGGLE_PROMPT);

    const activeDescriptor = resolveActiveAvatarDescriptor({
        avatarCatalog,
        selectedAvatarId
    });

    const { imageElement, labelElement } = populateToggleButton({
        toggleButtonElement,
        activeDescriptor,
        documentReference,
        avatarClassNameMap,
        avatarMenuText,
        globalClassName
    });

    populateMenuContainer({
        menuContainerElement,
        avatarCatalog,
        documentReference,
        avatarClassNameMap,
        avatarMenuText
    });

    return { imageElement, labelElement };
}

/**
 * Builds a descriptor map keyed by avatar identifier for quick lookup.
 *
 * @param {AvatarDescriptor[]} [avatarCatalog=AvatarCatalog] - Catalog of available avatar descriptors.
 * @returns {Map<string, AvatarDescriptor>} Map keyed by descriptor identifier.
 */
export function buildAvatarDescriptorMap(avatarCatalog = AvatarCatalog) {
    const descriptorMap = new Map();
    for (const descriptor of avatarCatalog) {
        descriptorMap.set(descriptor.id, descriptor);
    }
    return descriptorMap;
}
