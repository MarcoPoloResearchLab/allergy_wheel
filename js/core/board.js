export class Board {
    constructor({ allergensCatalog, dishesCatalog, normalizationEngine }) {
        this.allergensCatalog = Array.isArray(allergensCatalog) ? allergensCatalog : [];
        this.dishesCatalog = Array.isArray(dishesCatalog) ? dishesCatalog : [];
        this.normalizationEngine = normalizationEngine;
        this.dishIndexByAllergen = new Map();
    }

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

    throwIfAnyAllergenHasNoDishes() {
        const missingTokens = [];
        for (const allergen of this.allergensCatalog) {
            const token = allergen.token;
            const list = this.dishIndexByAllergen.get(token) || [];
            if (list.length === 0) missingTokens.push(token);
        }
        if (missingTokens.length > 0) {
            throw new Error(`Data invariant violated: no dishes found for allergen token(s): ${missingTokens.join(", ")}`);
        }
    }

    getDishesForAllergen(tokenValue) {
        if (!tokenValue) return [];
        return this.dishIndexByAllergen.get(tokenValue) || [];
    }

    getDishLabel(dishObject) {
        if (!dishObject || typeof dishObject !== "object") return "";
        return dishObject.name || dishObject.title || dishObject.label || dishObject.id || "";
    }
}
