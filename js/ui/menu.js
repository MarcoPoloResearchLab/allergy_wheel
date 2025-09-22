import { ScreenName, MenuColumnLabel, AttributeName } from "../constants.js";

/** @typedef {import("../types.js").Dish} Dish */
/** @typedef {import("../types.js").AllergenDescriptor} AllergenDescriptor */

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
    CELL_LABEL: "menu-cell__label",
    DISH_HEADING: "menu-dish-heading",
    DISH_TITLE: "menu-dish-title",
    INGREDIENTS_CONTAINER: "ingredients menu-ingredients",
    INGREDIENT: "ingredient",
    INGREDIENT_BAD: "bad",
    EMOJI_LARGE: "emoji-large",
    CUISINE_BADGE: "menu-cuisine-badge",
    NARRATIVE: "menu-narrative",
    EMPTY_ROW: "menu-row menu-row--empty",
    EMPTY_CELL: "menu-cell menu-cell--empty"
});

const ValueType = Object.freeze({
    FUNCTION: typeof Function
});

const MenuMessage = Object.freeze({
    NO_MATCHES: "No dishes match the selected filters."
});

const MenuColumnCount = 4;

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

    #availableCuisineFilters = new Map();

    #availableIngredientFilters = new Map();

    #selectedCuisineFilters = new Set();

    #selectedIngredientFilters = new Set();

    #filterOptionsChangeHandler = null;

    #selectedAllergenToken = null;

    #selectedAllergenLabel = TextContent.EMPTY;

    /**
     * @param {{ documentReference?: Document, menuTableBodyElement?: HTMLElement | null }} [dependencies]
     */
    constructor({
        documentReference = document,
        menuTableBodyElement
    } = {}) {
        this.#documentReference = documentReference;
        this.#menuTableBodyElement = menuTableBodyElement || null;
    }

    /**
     * Updates the menu presenter caches with the latest catalog information.
     *
     * @param {{
     *     dishesCatalog?: Dish[],
     *     normalizationEngine?: import("../utils/utils.js").NormalizationEngine | null,
     *     ingredientEmojiByName?: Map<string, string> | Iterable<[string, string]>,
     *     cuisineToFlagMap?: Map<string, string> | Iterable<[string, string]>,
     *     allergensCatalog?: AllergenDescriptor[]
     * }} [dependencies]
     */
    updateDataDependencies({
        dishesCatalog,
        normalizationEngine,
        ingredientEmojiByName,
        cuisineToFlagMap,
        allergensCatalog
    } = {}) {
        if (Array.isArray(dishesCatalog)) {
            this.#dishesCatalog = dishesCatalog.slice();
            this.#rebuildFilterOptionsFromCatalog();
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

        this.#emitFilterOptionsChange();
    }

    bindFilterOptionsChangeHandler(handlerFunction) {
        if (typeof handlerFunction !== ValueType.FUNCTION) {
            this.#filterOptionsChangeHandler = null;
            return;
        }
        this.#filterOptionsChangeHandler = handlerFunction;
        this.#emitFilterOptionsChange();
    }

    /**
     * Reflects the selected allergen token and label and re-renders the menu view.
     *
     * @param {{ token?: string | null, label?: string }} [selection]
     */
    updateSelectedAllergen({ token, label } = {}) {
        this.#selectedAllergenToken = token || null;
        this.#selectedAllergenLabel = label || TextContent.EMPTY;
        this.renderMenu();
    }

    toggleCuisineFilter(filterValue) {
        const normalizedFilterValue = this.#normalizeFilterValue(filterValue);
        if (!normalizedFilterValue) {
            return;
        }
        if (this.#selectedCuisineFilters.has(normalizedFilterValue)) {
            this.#selectedCuisineFilters.delete(normalizedFilterValue);
        } else if (this.#availableCuisineFilters.has(normalizedFilterValue)) {
            this.#selectedCuisineFilters.add(normalizedFilterValue);
        }
        this.renderMenu();
        this.#emitFilterOptionsChange();
    }

    toggleIngredientFilter(filterValue) {
        const normalizedFilterValue = this.#normalizeFilterValue(filterValue);
        if (!normalizedFilterValue) {
            return;
        }
        if (this.#selectedIngredientFilters.has(normalizedFilterValue)) {
            this.#selectedIngredientFilters.delete(normalizedFilterValue);
        } else if (this.#availableIngredientFilters.has(normalizedFilterValue)) {
            this.#selectedIngredientFilters.add(normalizedFilterValue);
        }
        this.renderMenu();
        this.#emitFilterOptionsChange();
    }

    clearCuisineFilters() {
        if (this.#selectedCuisineFilters.size === 0) {
            return;
        }
        this.#selectedCuisineFilters.clear();
        this.renderMenu();
        this.#emitFilterOptionsChange();
    }

    clearIngredientFilters() {
        if (this.#selectedIngredientFilters.size === 0) {
            return;
        }
        this.#selectedIngredientFilters.clear();
        this.renderMenu();
        this.#emitFilterOptionsChange();
    }

    renderMenu() {
        if (!this.#menuTableBodyElement) {
            return;
        }

        this.#menuTableBodyElement.textContent = TextContent.EMPTY;

        /** @type {Dish[]} */
        const dishesToRender = this.#filterDishes(this.#dishesCatalog);

        if (dishesToRender.length === 0) {
            const emptyStateRow = this.#createEmptyStateRow();
            this.#menuTableBodyElement.appendChild(emptyStateRow);
            return;
        }

        for (const dishRecord of dishesToRender) {
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
        this.#decorateCellWithColumnLabel(cellElement, MenuColumnLabel.DISH);

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
        this.#decorateCellWithColumnLabel(cellElement, MenuColumnLabel.INGREDIENTS);

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
        this.#decorateCellWithColumnLabel(cellElement, MenuColumnLabel.CUISINE);

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
        this.#decorateCellWithColumnLabel(cellElement, MenuColumnLabel.STORY);

        const paragraphElement = this.#documentReference.createElement(HtmlTagName.P);
        paragraphElement.className = ClassName.NARRATIVE;
        paragraphElement.textContent = String(dishRecord.narrative || TextContent.EMPTY);

        cellElement.appendChild(paragraphElement);
        return cellElement;
    }

    #decorateCellWithColumnLabel(cellElement, columnLabelText) {
        const labelText = typeof columnLabelText === "string" ? columnLabelText : TextContent.EMPTY;
        cellElement.setAttribute(AttributeName.DATA_COLUMN_LABEL, labelText);

        const labelSpan = this.#documentReference.createElement(HtmlTagName.SPAN);
        labelSpan.className = ClassName.CELL_LABEL;
        labelSpan.textContent = labelText;
        cellElement.appendChild(labelSpan);
    }

    /**
     * Applies the active cuisine and ingredient filters to the provided dish catalog.
     *
     * @param {Dish[]} dishCatalog - Catalog of dishes to filter.
     * @returns {Dish[]} Filtered list of dishes respecting the active selections.
     */
    #filterDishes(dishCatalog) {
        const sourceCatalog = Array.isArray(dishCatalog) ? dishCatalog : [];
        const filteredDishes = [];
        for (const dishRecord of sourceCatalog) {
            if (!dishRecord) {
                continue;
            }
            if (!this.#passesCuisineFilter(dishRecord)) {
                continue;
            }
            if (!this.#passesIngredientFilter(dishRecord)) {
                continue;
            }
            filteredDishes.push(dishRecord);
        }
        return filteredDishes;
    }

    #passesCuisineFilter(dishRecord) {
        if (this.#selectedCuisineFilters.size === 0) {
            return true;
        }
        const normalizedCuisine = this.#normalizeFilterValue(dishRecord && dishRecord.cuisine);
        if (!normalizedCuisine) {
            return false;
        }
        return this.#selectedCuisineFilters.has(normalizedCuisine);
    }

    #passesIngredientFilter(dishRecord) {
        if (this.#selectedIngredientFilters.size === 0) {
            return true;
        }
        const ingredientList = normalizeToArray(dishRecord && dishRecord.ingredients);
        if (ingredientList.length === 0) {
            return false;
        }
        const normalizedIngredients = new Set();
        for (const ingredientName of ingredientList) {
            const normalizedName = this.#normalizeFilterValue(ingredientName);
            if (normalizedName) {
                normalizedIngredients.add(normalizedName);
            }
        }
        if (normalizedIngredients.size === 0) {
            return false;
        }
        for (const selectedIngredient of this.#selectedIngredientFilters) {
            if (!normalizedIngredients.has(selectedIngredient)) {
                return false;
            }
        }
        return true;
    }

    #rebuildFilterOptionsFromCatalog() {
        this.#availableCuisineFilters = this.#buildCuisineFilterMap(this.#dishesCatalog);
        this.#availableIngredientFilters = this.#buildIngredientFilterMap(this.#dishesCatalog);
        this.#pruneUnavailableSelections();
    }

    #buildCuisineFilterMap(dishesCatalog) {
        const cuisineMap = new Map();
        for (const dishRecord of dishesCatalog || []) {
            if (!dishRecord) {
                continue;
            }
            const cuisineLabel = String(dishRecord.cuisine || TextContent.EMPTY).trim();
            const normalizedCuisine = this.#normalizeFilterValue(cuisineLabel);
            if (!normalizedCuisine || cuisineMap.has(normalizedCuisine)) {
                continue;
            }
            cuisineMap.set(normalizedCuisine, Object.freeze({
                value: normalizedCuisine,
                label: cuisineLabel || normalizedCuisine
            }));
        }
        return this.#sortFilterMapByLabel(cuisineMap);
    }

    #buildIngredientFilterMap(dishesCatalog) {
        const ingredientMap = new Map();
        for (const dishRecord of dishesCatalog || []) {
            if (!dishRecord) {
                continue;
            }
            const ingredientList = normalizeToArray(dishRecord.ingredients);
            for (const ingredientName of ingredientList) {
                const ingredientLabel = String(ingredientName || TextContent.EMPTY).trim();
                const normalizedIngredient = this.#normalizeFilterValue(ingredientLabel);
                if (!normalizedIngredient || ingredientMap.has(normalizedIngredient)) {
                    continue;
                }
                ingredientMap.set(normalizedIngredient, Object.freeze({
                    value: normalizedIngredient,
                    label: ingredientLabel || normalizedIngredient
                }));
            }
        }
        return this.#sortFilterMapByLabel(ingredientMap);
    }

    #sortFilterMapByLabel(filterMap) {
        const sortableEntries = Array.from(filterMap.entries());
        sortableEntries.sort((entryA, entryB) => {
            const labelA = entryA[1] && entryA[1].label ? entryA[1].label : TextContent.EMPTY;
            const labelB = entryB[1] && entryB[1].label ? entryB[1].label : TextContent.EMPTY;
            return labelA.localeCompare(labelB, undefined, { sensitivity: "base" });
        });
        return new Map(sortableEntries);
    }

    #normalizeFilterValue(rawValue) {
        if (rawValue === null || rawValue === undefined) {
            return null;
        }
        const textualValue = String(rawValue).trim().toLowerCase();
        return textualValue ? textualValue : null;
    }

    #pruneUnavailableSelections() {
        for (const selectedCuisine of Array.from(this.#selectedCuisineFilters)) {
            if (!this.#availableCuisineFilters.has(selectedCuisine)) {
                this.#selectedCuisineFilters.delete(selectedCuisine);
            }
        }
        for (const selectedIngredient of Array.from(this.#selectedIngredientFilters)) {
            if (!this.#availableIngredientFilters.has(selectedIngredient)) {
                this.#selectedIngredientFilters.delete(selectedIngredient);
            }
        }
    }

    #emitFilterOptionsChange() {
        if (typeof this.#filterOptionsChangeHandler !== ValueType.FUNCTION) {
            return;
        }
        const payload = {
            cuisines: Array.from(this.#availableCuisineFilters.values()),
            ingredients: Array.from(this.#availableIngredientFilters.values()),
            selectedCuisineValues: Array.from(this.#selectedCuisineFilters.values()),
            selectedIngredientValues: Array.from(this.#selectedIngredientFilters.values())
        };
        this.#filterOptionsChangeHandler(payload);
    }

    #createEmptyStateRow() {
        const rowElement = this.#documentReference.createElement(HtmlTagName.TR);
        rowElement.className = ClassName.EMPTY_ROW;

        const cellElement = this.#documentReference.createElement(HtmlTagName.TD);
        cellElement.className = ClassName.EMPTY_CELL;
        cellElement.colSpan = MenuColumnCount;
        cellElement.textContent = MenuMessage.NO_MATCHES;

        rowElement.appendChild(cellElement);
        return rowElement;
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

    /**
     * Builds a mapping from allergen token to emoji for quick ingredient decoration.
     *
     * @param {AllergenDescriptor[]} [allergensCatalog] - Catalog entries containing allergen emojis.
     * @returns {Map<string, string>} Map keyed by allergen token with emoji values.
     */
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
