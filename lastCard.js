/* global document */

const ElementId = Object.freeze({
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

export function populateRevealCard({
    dish,
    selectedAllergenToken,
    selectedAllergenLabel,
    normalizationEngine,
    allergensCatalog,
    cuisineToFlagMap,
    ingredientEmojiByName
}) {
    const revealSection = document.getElementById(ElementId.REVEAL_SECTION);
    const dishTitleElement = document.getElementById(ElementId.DISH_TITLE);
    const dishCuisineElement = document.getElementById(ElementId.DISH_CUISINE);
    const resultBannerElement = document.getElementById(ElementId.RESULT_BANNER);
    const resultTextElement = document.getElementById(ElementId.RESULT_TEXT);
    const ingredientsContainer = document.getElementById(ElementId.INGREDIENTS_CONTAINER);
    const faceSvg = document.getElementById(ElementId.FACE_SVG);

    const safeDish = dish || {};
    const dishEmoji = safeDish.emoji || TextContent.EMPTY;
    const dishNameCandidates = [safeDish.name, safeDish.title, safeDish.label, safeDish.id];
    const dishNameText = dishNameCandidates.find((value) => value) || TextContent.EMPTY;
    dishTitleElement.textContent = dishEmoji
        ? `${dishEmoji}${TextContent.SPACE}${dishNameText}`
        : dishNameText;

    const cuisineText = safeDish.cuisine || TextContent.EMPTY;
    let cuisineFlagEmoji = TextContent.EMPTY;
    if (cuisineToFlagMap && typeof cuisineToFlagMap.get === ValueType.FUNCTION && cuisineText) {
        const cuisineKey = String(cuisineText).trim().toLowerCase();
        cuisineFlagEmoji = cuisineToFlagMap.get(cuisineKey) || TextContent.EMPTY;
    }
    dishCuisineElement.textContent = cuisineText
        ? (cuisineFlagEmoji
            ? `${cuisineText}${TextContent.SPACE}${cuisineFlagEmoji}`
            : cuisineText)
        : TextContent.EMPTY;

    ingredientsContainer.textContent = TextContent.EMPTY;

    const emojiByToken = new Map();
    for (const allergenRecord of allergensCatalog || []) {
        if (allergenRecord && allergenRecord.token) {
            emojiByToken.set(allergenRecord.token, allergenRecord.emoji || TextContent.EMPTY);
        }
    }

    let hasTriggeringIngredient = false;
    const ingredientList = Array.isArray(safeDish.ingredients) ? safeDish.ingredients : [];

    for (const ingredientName of ingredientList) {
        const ingredientSpan = document.createElement(ElementTagName.SPAN);
        ingredientSpan.className = ClassName.INGREDIENT;

        const rawIngredientName = String(ingredientName || TextContent.EMPTY);
        const loweredIngredientName = rawIngredientName.trim().toLowerCase();

        const tokensForIngredient = normalizationEngine.tokensForIngredient(rawIngredientName);

        let ingredientEmoji = TextContent.EMPTY;
        if (ingredientEmojiByName && typeof ingredientEmojiByName.get === ValueType.FUNCTION) {
            ingredientEmoji = ingredientEmojiByName.get(loweredIngredientName) || TextContent.EMPTY;
        }
        if (!ingredientEmoji) {
            for (const allergenToken of tokensForIngredient) {
                const emojiFromToken = emojiByToken.get(allergenToken);
                if (emojiFromToken) {
                    ingredientEmoji = emojiFromToken;
                    break;
                }
            }
        }

        if (tokensForIngredient.has(selectedAllergenToken)) {
            hasTriggeringIngredient = true;
            ingredientSpan.classList.add(ClassName.BAD);
            if (!ingredientEmoji) {
                ingredientEmoji = emojiByToken.get(selectedAllergenToken) || TextContent.EMPTY;
            }
        }

        const textSpan = document.createElement(ElementTagName.SPAN);
        textSpan.textContent = rawIngredientName;
        ingredientSpan.appendChild(textSpan);

        if (ingredientEmoji) {
            const emojiSpan = document.createElement(ElementTagName.SPAN);
            emojiSpan.className = ClassName.EMOJI_LARGE;
            emojiSpan.textContent = ingredientEmoji;
            ingredientSpan.appendChild(emojiSpan);
        }

        ingredientsContainer.appendChild(ingredientSpan);
    }

    if (hasTriggeringIngredient) {
        resultBannerElement.classList.remove(ClassName.OK);
        resultBannerElement.classList.add(ClassName.BAD);
        resultTextElement.textContent = `${TextContent.RESULT_BAD_PREFIX}${selectedAllergenLabel}`;
        if (faceSvg) {
            faceSvg.hidden = false;
        }
    } else {
        resultBannerElement.classList.remove(ClassName.BAD);
        resultBannerElement.classList.add(ClassName.OK);
        resultTextElement.textContent = TextContent.SAFE_TO_EAT;
        if (faceSvg) {
            faceSvg.hidden = true;
        }
    }

    if (revealSection) {
        revealSection.setAttribute(AttributeName.ARIA_HIDDEN, AttributeValue.FALSE);
    }

    return { hasTriggeringIngredient };
}

export function showGameOver() {
    const gameoverSection = document.getElementById(ElementId.GAME_OVER_SECTION);
    if (gameoverSection) {
        gameoverSection.setAttribute(AttributeName.ARIA_HIDDEN, AttributeValue.FALSE);
    }
}

export function showWinningCard() {
    const revealSection = document.getElementById(ElementId.REVEAL_SECTION);
    const dishTitleElement = document.getElementById(ElementId.DISH_TITLE);
    const dishCuisineElement = document.getElementById(ElementId.DISH_CUISINE);
    const resultBannerElement = document.getElementById(ElementId.RESULT_BANNER);
    const resultTextElement = document.getElementById(ElementId.RESULT_TEXT);
    const ingredientsContainer = document.getElementById(ElementId.INGREDIENTS_CONTAINER);
    const faceSvg = document.getElementById(ElementId.FACE_SVG);
    const actionsContainer = revealSection ? revealSection.querySelector(Selector.ACTIONS_CONTAINER) : null;

    if (!revealSection || !dishTitleElement || !resultBannerElement || !resultTextElement || !ingredientsContainer || !actionsContainer) {
        return null;
    }

    dishTitleElement.textContent = TextContent.WIN_TITLE;
    dishCuisineElement.textContent = TextContent.EMPTY;

    resultBannerElement.classList.remove(ClassName.BAD);
    resultBannerElement.classList.add(ClassName.OK);
    resultTextElement.textContent = TextContent.WIN_MESSAGE;
    if (faceSvg) {
        faceSvg.hidden = true;
    }

    ingredientsContainer.textContent = TextContent.EMPTY;

    actionsContainer.textContent = TextContent.EMPTY;
    const restartButton = document.createElement(ElementTagName.BUTTON);
    restartButton.className = ClassName.BUTTON_PRIMARY;
    restartButton.id = ElementId.WIN_RESTART_BUTTON;
    restartButton.textContent = TextContent.RESTART_BUTTON_LABEL;
    actionsContainer.appendChild(restartButton);

    revealSection.setAttribute(AttributeName.ARIA_HIDDEN, AttributeValue.FALSE);
    return restartButton;
}
