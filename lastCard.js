/* global document */

export const ElementId = Object.freeze({
    REVEAL_SECTION: "reveal",
    DISH_TITLE: "dish-title",
    DISH_CUISINE: "dish-cuisine",
    RESULT_BANNER: "result",
    RESULT_TEXT: "result-text",
    INGREDIENTS_CONTAINER: "dish-ingredients",
    FACE_SVG: "face",
    GAME_OVER_SECTION: "gameover",
    WIN_RESTART_BUTTON: "win-restart"
});

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

const AttributeName = Object.freeze({
    ARIA_HIDDEN: "aria-hidden"
});

const AttributeValue = Object.freeze({
    FALSE: "false"
});

const TextContent = Object.freeze({
    EMPTY: "",
    SPACE: " ",
    WIN_TITLE: "You Win! 🏆",
    WIN_MESSAGE: "Amazing! You collected 10 hearts!",
    RESTART_BUTTON_LABEL: "Restart",
    SAFE_TO_EAT: "Safe to eat. Yummy!",
    RESULT_BAD_PREFIX: "Contains your allergen: "
});

const ValueType = Object.freeze({
    FUNCTION: typeof Function
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
        ingredientEmojiByName
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
    }

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
                this.#resultTextElement.textContent = `${TextContent.RESULT_BAD_PREFIX}${selectedAllergenLabel}`;
                if (this.#faceSvgElement) {
                    this.#faceSvgElement.hidden = false;
                }
            } else {
                this.#resultBannerElement.classList.remove(ClassName.BAD);
                this.#resultBannerElement.classList.add(ClassName.OK);
                this.#resultTextElement.textContent = TextContent.SAFE_TO_EAT;
                if (this.#faceSvgElement) {
                    this.#faceSvgElement.hidden = true;
                }
            }
        }

        if (this.#revealSectionElement) {
            this.#revealSectionElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeValue.FALSE);
        }

        return { hasTriggeringIngredient };
    }

    showGameOver() {
        if (this.#gameOverSectionElement) {
            this.#gameOverSectionElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeValue.FALSE);
            return { isDisplayed: true };
        }
        return { isDisplayed: false };
    }

    showWinningCard() {
        if (!this.#revealSectionElement || !this.#dishTitleElement || !this.#resultBannerElement
            || !this.#resultTextElement || !this.#ingredientsContainerElement || !this.#actionsContainerElement) {
            return { restartButton: null, isDisplayed: false };
        }

        this.#dishTitleElement.textContent = TextContent.WIN_TITLE;
        if (this.#dishCuisineElement) {
            this.#dishCuisineElement.textContent = TextContent.EMPTY;
        }

        this.#resultBannerElement.classList.remove(ClassName.BAD);
        this.#resultBannerElement.classList.add(ClassName.OK);
        this.#resultTextElement.textContent = TextContent.WIN_MESSAGE;
        if (this.#faceSvgElement) {
            this.#faceSvgElement.hidden = true;
        }

        this.#ingredientsContainerElement.textContent = TextContent.EMPTY;

        this.#actionsContainerElement.textContent = TextContent.EMPTY;
        const restartButton = this.#documentReference.createElement(ElementTagName.BUTTON);
        restartButton.className = ClassName.BUTTON_PRIMARY;
        restartButton.id = ElementId.WIN_RESTART_BUTTON;
        restartButton.textContent = TextContent.RESTART_BUTTON_LABEL;
        this.#actionsContainerElement.appendChild(restartButton);

        this.#revealSectionElement.setAttribute(AttributeName.ARIA_HIDDEN, AttributeValue.FALSE);
        return { restartButton, isDisplayed: true };
    }

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
