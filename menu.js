import { ScreenName } from "./constants.js";

const TextContent = Object.freeze({
    EMPTY: ""
});

const HtmlTagName = Object.freeze({
    TR: "tr",
    TD: "td",
    DIV: "div",
    SPAN: "span",
    P: "p"
});

const ClassName = Object.freeze({
    ROW: "menu-row",
    CELL_DISH: "menu-cell menu-cell--dish",
    CELL_INGREDIENTS: "menu-cell menu-cell--ingredients",
    CELL_CUISINE: "menu-cell menu-cell--cuisine",
    CELL_NARRATIVE: "menu-cell menu-cell--narrative",
    DISH_HEADING: "menu-dish-heading",
    DISH_TITLE: "menu-dish-title",
    INGREDIENTS_CONTAINER: "ingredients menu-ingredients",
    INGREDIENT: "ingredient",
    INGREDIENT_BAD: "bad",
    EMOJI_LARGE: "emoji-large",
    CUISINE_BADGE: "menu-cuisine-badge",
    NARRATIVE: "menu-narrative"
});

const ValueType = Object.freeze({
    FUNCTION: typeof Function
});

function normalizeToMap(candidate) {
    if (candidate instanceof Map) {
        return candidate;
    }
    if (!candidate) {
        return new Map();
    }
    return new Map(candidate);
}

function normalizeToArray(candidate) {
    if (Array.isArray(candidate)) {
        return candidate.slice();
    }
    if (candidate && typeof candidate[Symbol.iterator] === ValueType.FUNCTION) {
        return Array.from(candidate);
    }
    return [];
}

export class MenuView {
    #documentReference;

    #menuTableBodyElement;

    #dishesCatalog = [];

    #normalizationEngine = null;

    #ingredientEmojiByName = new Map();

    #cuisineToFlagMap = new Map();

    #emojiByTokenMap = new Map();

    #selectedAllergenToken = null;

    #selectedAllergenLabel = TextContent.EMPTY;

    constructor({
        documentReference = document,
        menuTableBodyElement
    } = {}) {
        this.#documentReference = documentReference;
        this.#menuTableBodyElement = menuTableBodyElement || null;
    }

    updateDataDependencies({
        dishesCatalog,
        normalizationEngine,
        ingredientEmojiByName,
        cuisineToFlagMap,
        allergensCatalog
    } = {}) {
        if (Array.isArray(dishesCatalog)) {
            this.#dishesCatalog = dishesCatalog.slice();
        }
        if (normalizationEngine) {
            this.#normalizationEngine = normalizationEngine;
        }
        if (ingredientEmojiByName) {
            this.#ingredientEmojiByName = normalizeToMap(ingredientEmojiByName);
        }
        if (cuisineToFlagMap) {
            this.#cuisineToFlagMap = normalizeToMap(cuisineToFlagMap);
        }
        if (Array.isArray(allergensCatalog)) {
            this.#emojiByTokenMap = this.#buildEmojiByTokenMap(allergensCatalog);
        }
    }

    updateSelectedAllergen({ token, label } = {}) {
        this.#selectedAllergenToken = token || null;
        this.#selectedAllergenLabel = label || TextContent.EMPTY;
        this.renderMenu();
    }

    renderMenu() {
        if (!this.#menuTableBodyElement) {
            return;
        }

        this.#menuTableBodyElement.textContent = TextContent.EMPTY;

        for (const dishRecord of this.#dishesCatalog) {
            if (!dishRecord) {
                continue;
            }
            const rowElement = this.#documentReference.createElement(HtmlTagName.TR);
            rowElement.className = ClassName.ROW;

            rowElement.appendChild(this.#createDishCell(dishRecord));
            rowElement.appendChild(this.#createIngredientsCell(dishRecord));
            rowElement.appendChild(this.#createCuisineCell(dishRecord));
            rowElement.appendChild(this.#createNarrativeCell(dishRecord));

            this.#menuTableBodyElement.appendChild(rowElement);
        }
    }

    getSelectedAllergen() {
        return {
            token: this.#selectedAllergenToken,
            label: this.#selectedAllergenLabel
        };
    }

    #createDishCell(dishRecord) {
        const cellElement = this.#documentReference.createElement(HtmlTagName.TD);
        cellElement.className = ClassName.CELL_DISH;

        const headingElement = this.#documentReference.createElement(HtmlTagName.DIV);
        headingElement.className = ClassName.DISH_HEADING;

        const emojiSpan = this.#documentReference.createElement(HtmlTagName.SPAN);
        emojiSpan.className = ClassName.EMOJI_LARGE;
        emojiSpan.textContent = String(dishRecord.emoji || TextContent.EMPTY);

        const titleElement = this.#documentReference.createElement(HtmlTagName.DIV);
        titleElement.className = ClassName.DISH_TITLE;
        const nameText = dishRecord.name || dishRecord.title || dishRecord.id || TextContent.EMPTY;
        titleElement.textContent = nameText;

        if (emojiSpan.textContent) {
            headingElement.appendChild(emojiSpan);
        }
        headingElement.appendChild(titleElement);
        cellElement.appendChild(headingElement);

        return cellElement;
    }

    #createIngredientsCell(dishRecord) {
        const cellElement = this.#documentReference.createElement(HtmlTagName.TD);
        cellElement.className = ClassName.CELL_INGREDIENTS;

        const ingredientsContainer = this.#documentReference.createElement(HtmlTagName.DIV);
        ingredientsContainer.className = ClassName.INGREDIENTS_CONTAINER;

        const ingredientList = normalizeToArray(dishRecord.ingredients);
        for (const ingredientName of ingredientList) {
            const ingredientChip = this.#createIngredientChip(ingredientName);
            ingredientsContainer.appendChild(ingredientChip);
        }

        cellElement.appendChild(ingredientsContainer);
        return cellElement;
    }

    #createCuisineCell(dishRecord) {
        const cellElement = this.#documentReference.createElement(HtmlTagName.TD);
        cellElement.className = ClassName.CELL_CUISINE;

        const badgeElement = this.#documentReference.createElement(HtmlTagName.SPAN);
        badgeElement.className = ClassName.CUISINE_BADGE;

        const cuisineName = String(dishRecord.cuisine || TextContent.EMPTY).trim();
        const cuisineFlag = this.#resolveCuisineFlag(cuisineName);

        if (cuisineFlag) {
            const flagSpan = this.#documentReference.createElement(HtmlTagName.SPAN);
            flagSpan.className = ClassName.EMOJI_LARGE;
            flagSpan.textContent = cuisineFlag;
            badgeElement.appendChild(flagSpan);
        }

        const cuisineTextSpan = this.#documentReference.createElement(HtmlTagName.SPAN);
        cuisineTextSpan.textContent = cuisineName;
        badgeElement.appendChild(cuisineTextSpan);

        cellElement.appendChild(badgeElement);
        return cellElement;
    }

    #createNarrativeCell(dishRecord) {
        const cellElement = this.#documentReference.createElement(HtmlTagName.TD);
        cellElement.className = ClassName.CELL_NARRATIVE;

        const paragraphElement = this.#documentReference.createElement(HtmlTagName.P);
        paragraphElement.className = ClassName.NARRATIVE;
        paragraphElement.textContent = String(dishRecord.narrative || TextContent.EMPTY);

        cellElement.appendChild(paragraphElement);
        return cellElement;
    }

    #createIngredientChip(ingredientName) {
        const chipElement = this.#documentReference.createElement(HtmlTagName.SPAN);
        chipElement.className = ClassName.INGREDIENT;

        const ingredientText = String(ingredientName || TextContent.EMPTY);
        const normalizedIngredientName = ingredientText.trim().toLowerCase();

        const tokensForIngredient = this.#normalizationEngine
            && typeof this.#normalizationEngine.tokensForIngredient === ValueType.FUNCTION
                ? this.#normalizationEngine.tokensForIngredient(ingredientText)
                : new Set();

        let ingredientEmoji = this.#ingredientEmojiByName.get(normalizedIngredientName) || TextContent.EMPTY;
        if (!ingredientEmoji) {
            for (const allergenToken of tokensForIngredient || []) {
                const emojiFromToken = this.#emojiByTokenMap.get(allergenToken);
                if (emojiFromToken) {
                    ingredientEmoji = emojiFromToken;
                    break;
                }
            }
        }

        if (this.#selectedAllergenToken && tokensForIngredient && tokensForIngredient.has(this.#selectedAllergenToken)) {
            chipElement.classList.add(ClassName.INGREDIENT_BAD);
            if (!ingredientEmoji) {
                ingredientEmoji = this.#emojiByTokenMap.get(this.#selectedAllergenToken) || TextContent.EMPTY;
            }
        }

        const textSpan = this.#documentReference.createElement(HtmlTagName.SPAN);
        textSpan.textContent = ingredientText;
        chipElement.appendChild(textSpan);

        if (ingredientEmoji) {
            const emojiSpan = this.#documentReference.createElement(HtmlTagName.SPAN);
            emojiSpan.className = ClassName.EMOJI_LARGE;
            emojiSpan.textContent = ingredientEmoji;
            chipElement.appendChild(emojiSpan);
        }

        return chipElement;
    }

    #resolveCuisineFlag(cuisineName) {
        if (!cuisineName || !this.#cuisineToFlagMap) {
            return TextContent.EMPTY;
        }
        const normalizedKey = String(cuisineName).trim().toLowerCase();
        return this.#cuisineToFlagMap.get(normalizedKey) || TextContent.EMPTY;
    }

    #buildEmojiByTokenMap(allergensCatalog) {
        const emojiMap = new Map();
        for (const allergenRecord of allergensCatalog) {
            if (!allergenRecord || !allergenRecord.token) {
                continue;
            }
            const allergenEmoji = allergenRecord.emoji || TextContent.EMPTY;
            if (allergenEmoji) {
                emojiMap.set(allergenRecord.token, allergenEmoji);
            }
        }
        return emojiMap;
    }
}

export function isMenuScreen(screenName) {
    return screenName === ScreenName.MENU;
}
