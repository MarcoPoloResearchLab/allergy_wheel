// @ts-check

import { BoardErrorMessage } from "../constants.js";

/** @typedef {import("../types.js").AllergenDescriptor} AllergenDescriptor */
/** @typedef {import("../types.js").Dish} Dish */

/**
 * Builds allergen indices and resolves dish metadata for the wheel.
 */
export class Board {
    /**
     * @param {{
     *     allergensCatalog?: AllergenDescriptor[],
     *     dishesCatalog?: Dish[],
     *     normalizationEngine?: import("../utils/utils.js").NormalizationEngine | null
     * }} [dependencies]
     */
    constructor({ allergensCatalog, dishesCatalog, normalizationEngine }) {
        this.allergensCatalog = Array.isArray(allergensCatalog) ? allergensCatalog : [];
        this.dishesCatalog = Array.isArray(dishesCatalog) ? dishesCatalog : [];
        this.normalizationEngine = normalizationEngine;
        this.dishIndexByAllergen = new Map();
    }

    /**
     * Builds an index of dishes keyed by allergen token using the configured normalization engine.
     */
    buildDishIndexByAllergen() {
        const localIndex = new Map();
        for (const dishObject of this.dishesCatalog) {
            const ingredientList = Array.isArray(dishObject.ingredients) ? dishObject.ingredients : [];
            const tokens = this.normalizationEngine.tokensForDishIngredients(ingredientList);
            for (const token of tokens) {
                if (!localIndex.has(token)) localIndex.set(token, []);
                localIndex.get(token).push(dishObject);
            }
        }
        this.dishIndexByAllergen = localIndex;
    }

    /**
     * Validates that each allergen token resolves at least one dish in the catalog.
     */
    throwIfAnyAllergenHasNoDishes() {
        const missingTokens = [];
        for (const allergen of this.allergensCatalog) {
            const token = allergen.token;
            const list = this.dishIndexByAllergen.get(token) || [];
            if (list.length === 0) missingTokens.push(token);
        }
        if (missingTokens.length > 0) {
            throw new Error(`${BoardErrorMessage.MISSING_DISHES_PREFIX} ${missingTokens.join(", ")}`);
        }
    }

    /**
     * Retrieves dishes associated with the provided allergen token.
     *
     * @param {string} tokenValue - Allergen token used for lookup.
     * @returns {Dish[]} Array of dishes that contain the allergen.
     */
    getDishesForAllergen(tokenValue) {
        if (!tokenValue) return [];
        return this.dishIndexByAllergen.get(tokenValue) || [];
    }

    /**
     * Resolves a display label for the provided dish, considering several fallback fields.
     *
     * @param {Dish | null | undefined} dishObject - Dish entry requiring a human readable label.
     * @returns {string} Label string resolved from the dish entry.
     */
    getDishLabel(dishObject) {
        if (!dishObject || typeof dishObject !== "object") return "";
        return dishObject.name || dishObject.title || dishObject.label || dishObject.id || "";
    }
}
