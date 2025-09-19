import {
    AttributeBooleanValue,
    AttributeName,
    AvatarCatalog,
    AvatarClassName,
    AvatarId,
    AvatarMenuText,
    GlobalClassName
} from "./constants.js";

const HtmlTagName = Object.freeze({
    BUTTON: "button",
    IMG: "img",
    SPAN: "span"
});

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

function createToggleLabelElement({ documentReference, avatarClassNameMap, activeDescriptor }) {
    const labelElement = documentReference.createElement(HtmlTagName.SPAN);
    if (avatarClassNameMap.LABEL) {
        labelElement.className = avatarClassNameMap.LABEL;
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
        activeDescriptor
    });

    toggleButtonElement.appendChild(hiddenPromptElement);
    toggleButtonElement.appendChild(imageElement);
    toggleButtonElement.appendChild(labelElement);

    return { imageElement, labelElement };
}

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

export function buildAvatarDescriptorMap(avatarCatalog = AvatarCatalog) {
    const descriptorMap = new Map();
    for (const descriptor of avatarCatalog) {
        descriptorMap.set(descriptor.id, descriptor);
    }
    return descriptorMap;
}
