// @ts-check

/* global document */
import {
    ResultCardElementId,
    AttributeName,
    AttributeBooleanValue,
    ButtonText,
    AvatarId,
    ResultCardText
} from "../constants.js";

/** @typedef {import("../types.js").AllergenDescriptor} AllergenDescriptor */
/** @typedef {import("../types.js").Dish} Dish */

const ElementTagName = Object.freeze({
    SPAN: "span",
    BUTTON: "button"
});

const ClassName = Object.freeze({
    BAD: "bad",
    OK: "ok",
    INGREDIENT: "ingredient",
    EMOJI_LARGE: "emoji-large",
    BUTTON_PRIMARY: "btn primary"
});

const Selector = Object.freeze({
    ACTIONS_CONTAINER: ".actions"
});

const TextContent = Object.freeze({
    EMPTY: "",
    SPACE: " "
});

const ValueType = Object.freeze({
    FUNCTION: typeof Function
});

const SvgNamespaceValue = Object.freeze({
    SVG: "http://www.w3.org/2000/svg",
    XLINK: "http://www.w3.org/1999/xlink"
});

const SvgTagName = Object.freeze({
    IMAGE: "image"
});

const SvgAttributeName = Object.freeze({
    HREF: "href",
    WIDTH: "width",
    HEIGHT: "height",
    PRESERVE_ASPECT_RATIO: "preserveAspectRatio"
});

const SvgAttributeValue = Object.freeze({
    FULL_SIZE: "100%",
    PRESERVE_ASPECT_RATIO: "xMidYMid meet"
});

function normalizeToMap(candidateMap) {
    if (candidateMap instanceof Map) {
        return candidateMap;
    }
    if (!candidateMap) {
        return new Map();
    }
    return new Map(candidateMap);
}

function ensureSet(candidateIterable) {
    if (candidateIterable instanceof Set) {
        return candidateIterable;
    }
    if (Array.isArray(candidateIterable)) {
        return new Set(candidateIterable);
    }
    if (candidateIterable && typeof candidateIterable[Symbol.iterator] === "function") {
        return new Set(candidateIterable);
    }
    return new Set();
}

/**
 * Renders the final result card and winning screen.
 */
export class ResultCard {
    #documentReference;

    #revealSectionElement;

    #dishTitleElement;

    #dishCuisineElement;

    #resultBannerElement;

    #resultTextElement;

    #ingredientsContainerElement;

    #faceSvgElement;

    #gameOverSectionElement;

    #actionsContainerElement;

    #normalizationEngine;

    #allergensCatalog;

    #cuisineToFlagMap;

    #ingredientEmojiByName;

    #emojiByTokenMap;

    #avatarMap;

    #selectedAvatarId;

    /**
     * @param {{
     *     documentReference?: Document,
     *     revealSectionElement?: HTMLElement | null,
     *     dishTitleElement?: HTMLElement | null,
     *     dishCuisineElement?: HTMLElement | null,
     *     resultBannerElement?: HTMLElement | null,
     *     resultTextElement?: HTMLElement | null,
     *     ingredientsContainerElement?: HTMLElement | null,
     *     faceSvgElement?: SVGElement | HTMLElement | null,
     *     gameOverSectionElement?: HTMLElement | null,
     *     normalizationEngine?: import("../utils/utils.js").NormalizationEngine | null,
     *     allergensCatalog?: AllergenDescriptor[],
     *     cuisineToFlagMap?: Map<string, string> | Iterable<[string, string]>,
     *     ingredientEmojiByName?: Map<string, string> | Iterable<[string, string]>,
     *     avatarMap?: Map<string, string> | Iterable<[string, string]>,
     *     selectedAvatarId?: string
     * }} [dependencies]
     */
    constructor({
        documentReference = document,
        revealSectionElement,
        dishTitleElement,
        dishCuisineElement,
        resultBannerElement,
        resultTextElement,
        ingredientsContainerElement,
        faceSvgElement,
        gameOverSectionElement,
        normalizationEngine,
        allergensCatalog,
        cuisineToFlagMap,
        ingredientEmojiByName,
        avatarMap,
        selectedAvatarId = AvatarId.DEFAULT
    }) {
        this.#documentReference = documentReference;
        this.#revealSectionElement = revealSectionElement || null;
        this.#dishTitleElement = dishTitleElement || null;
        this.#dishCuisineElement = dishCuisineElement || null;
        this.#resultBannerElement = resultBannerElement || null;
        this.#resultTextElement = resultTextElement || null;
        this.#ingredientsContainerElement = ingredientsContainerElement || null;
        this.#faceSvgElement = faceSvgElement || null;
        this.#gameOverSectionElement = gameOverSectionElement || null;
        this.#actionsContainerElement = this.#revealSectionElement
            ? this.#revealSectionElement.querySelector(Selector.ACTIONS_CONTAINER)
            : null;

        this.#normalizationEngine = normalizationEngine || null;
        this.#allergensCatalog = Array.isArray(allergensCatalog) ? allergensCatalog : [];
        this.#cuisineToFlagMap = normalizeToMap(cuisineToFlagMap);
        this.#ingredientEmojiByName = normalizeToMap(ingredientEmojiByName);
        this.#emojiByTokenMap = this.#buildEmojiByTokenMap(this.#allergensCatalog);
        this.#avatarMap = normalizeToMap(avatarMap);
        this.#selectedAvatarId = AvatarId.DEFAULT;
        this.updateAvatarSelection(selectedAvatarId);
    }

    /**
     * Refreshes cached dependencies when new catalog data is supplied.
     *
     * @param {{
     *     normalizationEngine?: import("../utils/utils.js").NormalizationEngine | null,
     *     allergensCatalog?: AllergenDescriptor[],
     *     cuisineToFlagMap?: Map<string, string> | Iterable<[string, string]>,
     *     ingredientEmojiByName?: Map<string, string> | Iterable<[string, string]>
     * }} [dependencies]
     */
    updateDataDependencies({
        normalizationEngine,
        allergensCatalog,
        cuisineToFlagMap,
        ingredientEmojiByName
    }) {
        if (normalizationEngine) {
            this.#normalizationEngine = normalizationEngine;
        }
        if (Array.isArray(allergensCatalog)) {
            this.#allergensCatalog = allergensCatalog;
            this.#emojiByTokenMap = this.#buildEmojiByTokenMap(allergensCatalog);
        }
        if (cuisineToFlagMap) {
            this.#cuisineToFlagMap = normalizeToMap(cuisineToFlagMap);
        }
        if (ingredientEmojiByName) {
            this.#ingredientEmojiByName = normalizeToMap(ingredientEmojiByName);
        }
    }

    /**
     * Updates the active avatar resource and re-renders the SVG when possible.
     *
     * @param {string | null | undefined} avatarIdentifierCandidate - Candidate avatar identifier selected by the player.
     * @returns {{ selectedAvatarId: string, hasRenderableAvatar: boolean }} Result of the update operation.
     */
    updateAvatarSelection(avatarIdentifierCandidate) {
        const normalizedCandidate = typeof avatarIdentifierCandidate === "string"
            ? avatarIdentifierCandidate.trim()
            : TextContent.EMPTY;

        let resolvedIdentifier = this.#selectedAvatarId;
        if (typeof resolvedIdentifier !== "string" || !resolvedIdentifier) {
            resolvedIdentifier = AvatarId.DEFAULT;
        }

        if (normalizedCandidate && this.#avatarMap.has(normalizedCandidate)) {
            resolvedIdentifier = normalizedCandidate;
        } else if (!this.#avatarMap.has(resolvedIdentifier)) {
            if (this.#avatarMap.has(AvatarId.DEFAULT)) {
                resolvedIdentifier = AvatarId.DEFAULT;
            } else {
                const firstEntryIterator = this.#avatarMap.keys().next();
                resolvedIdentifier = !firstEntryIterator.done
                    ? firstEntryIterator.value
                    : AvatarId.DEFAULT;
            }
        }

        this.#selectedAvatarId = resolvedIdentifier;
        const hasRenderableAvatar = this.#renderSelectedAvatar();

        return {
            selectedAvatarId: this.#selectedAvatarId,
            hasRenderableAvatar
        };
    }

    /**
     * Populates the reveal card UI with the provided dish details.
     *
     * @param {{
     *     dish: Dish | null,
     *     selectedAllergenToken: string | null,
     *     selectedAllergenLabel: string
     * }} options
     * @returns {{ hasTriggeringIngredient: boolean }} Indicates whether the dish contains the selected allergen.
     */
    populateRevealCard({
        dish,
        selectedAllergenToken,
        selectedAllergenLabel
    }) {
        const safeDish = dish || {};
        const dishEmoji = safeDish.emoji || TextContent.EMPTY;
        const dishNameCandidates = [safeDish.name, safeDish.title, safeDish.label, safeDish.id];
        const dishNameText = dishNameCandidates.find((value) => value) || TextContent.EMPTY;

        if (this.#dishTitleElement) {
            this.#dishTitleElement.textContent = dishEmoji
                ? `${dishEmoji}${TextContent.SPACE}${dishNameText}`
                : dishNameText;
        }

        const cuisineText = safeDish.cuisine || TextContent.EMPTY;
        let cuisineFlagEmoji = TextContent.EMPTY;
        if (this.#cuisineToFlagMap && typeof this.#cuisineToFlagMap.get === ValueType.FUNCTION && cuisineText) {
            const cuisineKey = String(cuisineText).trim().toLowerCase();
            cuisineFlagEmoji = this.#cuisineToFlagMap.get(cuisineKey) || TextContent.EMPTY;
        }
        if (this.#dishCuisineElement) {
            this.#dishCuisineElement.textContent = cuisineText
                ? (cuisineFlagEmoji
                    ? `${cuisineText}${TextContent.SPACE}${cuisineFlagEmoji}`
                    : cuisineText)
                : TextContent.EMPTY;
        }

        if (this.#ingredientsContainerElement) {
            this.#ingredientsContainerElement.textContent = TextContent.EMPTY;
        }

        let hasTriggeringIngredient = false;
        const ingredientList = Array.isArray(safeDish.ingredients) ? safeDish.ingredients : [];

        for (const ingredientName of ingredientList) {
            if (!this.#ingredientsContainerElement) {
                break;
            }

            const ingredientSpan = this.#documentReference.createElement(ElementTagName.SPAN);
            ingredientSpan.className = ClassName.INGREDIENT;

            const rawIngredientName = String(ingredientName || TextContent.EMPTY);
            const loweredIngredientName = rawIngredientName.trim().toLowerCase();

            const tokensIterable = this.#normalizationEngine
                && typeof this.#normalizationEngine.tokensForIngredient === ValueType.FUNCTION
                ? this.#normalizationEngine.tokensForIngredient(rawIngredientName)
                : [];
            const tokensForIngredient = ensureSet(tokensIterable);

            let ingredientEmoji = TextContent.EMPTY;
            if (this.#ingredientEmojiByName && typeof this.#ingredientEmojiByName.get === ValueType.FUNCTION) {
                ingredientEmoji = this.#ingredientEmojiByName.get(loweredIngredientName) || TextContent.EMPTY;
            }
            if (!ingredientEmoji) {
                for (const allergenToken of tokensForIngredient) {
                    const emojiFromToken = this.#emojiByTokenMap.get(allergenToken);
                    if (emojiFromToken) {
                        ingredientEmoji = emojiFromToken;
                        break;
                    }
                }
            }

            if (selectedAllergenToken && tokensForIngredient.has(selectedAllergenToken)) {
                hasTriggeringIngredient = true;
                ingredientSpan.classList.add(ClassName.BAD);
                if (!ingredientEmoji) {
                    ingredientEmoji = this.#emojiByTokenMap.get(selectedAllergenToken) || TextContent.EMPTY;
                }
            }

            const textSpan = this.#documentReference.createElement(ElementTagName.SPAN);
            textSpan.textContent = rawIngredientName;
            ingredientSpan.appendChild(textSpan);

            if (ingredientEmoji) {
                const emojiSpan = this.#documentReference.createElement(ElementTagName.SPAN);
                emojiSpan.className = ClassName.EMOJI_LARGE;
                emojiSpan.textContent = ingredientEmoji;
                ingredientSpan.appendChild(emojiSpan);
            }

            this.#ingredientsContainerElement.appendChild(ingredientSpan);
        }

        if (this.#resultBannerElement && this.#resultTextElement) {
            if (hasTriggeringIngredient) {
                this.#resultBannerElement.classList.remove(ClassName.OK);
                this.#resultBannerElement.classList.add(ClassName.BAD);
                this.#resultTextElement.textContent = `${ResultCardText.RESULT_BAD_PREFIX}${selectedAllergenLabel}`;
                if (this.#faceSvgElement) {
                    this.#renderSelectedAvatar();
                    this.#faceSvgElement.hidden = false;
                }
            } else {
                this.#resultBannerElement.classList.remove(ClassName.BAD);
                this.#resultBannerElement.classList.add(ClassName.OK);
                this.#resultTextElement.textContent = ResultCardText.SAFE_TO_EAT;
                if (this.#faceSvgElement) {
                    this.#faceSvgElement.hidden = true;
                }
            }
        }

        if (this.#revealSectionElement) {
            this.#revealSectionElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.FALSE);
        }

        return { hasTriggeringIngredient };
    }

    showGameOver() {
        if (this.#gameOverSectionElement) {
            this.#gameOverSectionElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.FALSE);
            return { isDisplayed: true };
        }
        return { isDisplayed: false };
    }

    showWinningCard() {
        if (!this.#revealSectionElement || !this.#dishTitleElement || !this.#resultBannerElement
            || !this.#resultTextElement || !this.#ingredientsContainerElement || !this.#actionsContainerElement) {
            return { restartButton: null, isDisplayed: false };
        }

        this.#dishTitleElement.textContent = ResultCardText.WIN_TITLE;
        if (this.#dishCuisineElement) {
            this.#dishCuisineElement.textContent = TextContent.EMPTY;
        }

        this.#resultBannerElement.classList.remove(ClassName.BAD);
        this.#resultBannerElement.classList.add(ClassName.OK);
        this.#resultTextElement.textContent = ResultCardText.WIN_MESSAGE;
        if (this.#faceSvgElement) {
            this.#faceSvgElement.hidden = true;
        }

        this.#ingredientsContainerElement.textContent = TextContent.EMPTY;

        this.#actionsContainerElement.textContent = TextContent.EMPTY;
        const restartButton = this.#documentReference.createElement(ElementTagName.BUTTON);
        restartButton.className = ClassName.BUTTON_PRIMARY;
        restartButton.id = ResultCardElementId.WIN_RESTART_BUTTON;
        restartButton.textContent = ButtonText.RESTART;
        this.#actionsContainerElement.appendChild(restartButton);

        this.#revealSectionElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeBooleanValue.FALSE);
        return { restartButton, isDisplayed: true };
    }

    #renderSelectedAvatar() {
        if (!this.#faceSvgElement) {
            return false;
        }

        const avatarResource = this.#avatarMap.get(this.#selectedAvatarId);
        if (!avatarResource) {
            this.#faceSvgElement.innerHTML = TextContent.EMPTY;
            return false;
        }

        if (typeof avatarResource === "string") {
            const trimmedResource = avatarResource.trim();
            if (!trimmedResource) {
                this.#faceSvgElement.innerHTML = TextContent.EMPTY;
                return false;
            }

            if (trimmedResource.startsWith("<")) {
                this.#faceSvgElement.innerHTML = trimmedResource;
                return true;
            }

            if (this.#documentReference && typeof this.#documentReference.createElementNS === ValueType.FUNCTION) {
                const avatarImageElement = this.#documentReference.createElementNS(
                    SvgNamespaceValue.SVG,
                    SvgTagName.IMAGE
                );
                avatarImageElement.setAttribute(SvgAttributeName.WIDTH, SvgAttributeValue.FULL_SIZE);
                avatarImageElement.setAttribute(SvgAttributeName.HEIGHT, SvgAttributeValue.FULL_SIZE);
                avatarImageElement.setAttribute(
                    SvgAttributeName.PRESERVE_ASPECT_RATIO,
                    SvgAttributeValue.PRESERVE_ASPECT_RATIO
                );
                avatarImageElement.setAttributeNS(SvgNamespaceValue.XLINK, SvgAttributeName.HREF, trimmedResource);
                avatarImageElement.setAttribute(SvgAttributeName.HREF, trimmedResource);
                this.#faceSvgElement.replaceChildren(avatarImageElement);
                return true;
            }

            this.#faceSvgElement.innerHTML = TextContent.EMPTY;
            return false;
        }

        this.#faceSvgElement.innerHTML = TextContent.EMPTY;
        return false;
    }

    /**
     * Constructs a lookup map from allergen token to emoji for quick ingredient decoration.
     *
     * @param {AllergenDescriptor[]} [allergensCatalog] - Catalog entries supplying allergen emojis.
     * @returns {Map<string, string>} Map keyed by allergen token with emoji values.
     */
    #buildEmojiByTokenMap(allergensCatalog) {
        const emojiMap = new Map();
        for (const allergenRecord of allergensCatalog || []) {
            if (allergenRecord && allergenRecord.token) {
                emojiMap.set(allergenRecord.token, allergenRecord.emoji || TextContent.EMPTY);
            }
        }
        return emojiMap;
    }
}
