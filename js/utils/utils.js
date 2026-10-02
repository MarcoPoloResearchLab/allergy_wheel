// @ts-check

/* global window */

import { LoadJsonErrorMessage } from "../constants.js";

/** @typedef {import("../types.js").NormalizationRule} NormalizationRule */

/**
 * Loads a JSON resource from the provided path.
 *
 * @param {string} pathString - Path to the JSON resource.
 * @returns {Promise<unknown>} Parsed JSON payload.
 */
export async function loadJson(pathString) {
    const httpResponse = await fetch(pathString, { cache: "no-store" });
    if (!httpResponse.ok) {
        throw new Error(`${LoadJsonErrorMessage.PREFIX} ${pathString}`);
    }
    return httpResponse.json();
}

/**
 * Compiles regular expressions for normalizing ingredient text to allergen tokens.
 */
export class NormalizationEngine {
    /**
     * @param {NormalizationRule[]} ruleDescriptors - Descriptors used to compile normalization regular expressions.
     */
    /**
     * @param {NormalizationRule[]} ruleDescriptors - Descriptors used to compile normalization expressions.
     */
    constructor(ruleDescriptors) {
        /** @type {{ regex: RegExp; token: string }[]} */
        this.compiledRules = [];
        if (Array.isArray(ruleDescriptors)) {
            for (const descriptor of ruleDescriptors) {
                const patternSource = String(descriptor.pattern || "");
                const patternFlags = String(descriptor.flags || "");
                const targetToken = String(descriptor.token || "");
                if (!patternSource || !targetToken) continue;
                this.compiledRules.push({
                    regex: new RegExp(patternSource, patternFlags),
                    token: targetToken
                });
            }
        }
    }

    /**
     * Determines the set of allergen tokens triggered by a single ingredient string.
     *
     * @param {string} ingredientText - Ingredient text to evaluate against the compiled rules.
     * @returns {Set<string>} Set of allergen tokens detected within the ingredient text.
     */
    tokensForIngredient(ingredientText) {
        const foundTokens = new Set();
        const candidateText = String(ingredientText || "");
        for (const compiledRule of this.compiledRules) {
            compiledRule.regex.lastIndex = 0;
            if (compiledRule.regex.test(candidateText)) {
                foundTokens.add(compiledRule.token);
            }
        }
        return foundTokens;
    }

    /**
     * Aggregates allergen tokens detected across a list of ingredient strings.
     *
     * @param {string[]} ingredientArray - Collection of ingredient text entries for a dish.
     * @returns {Set<string>} Union of allergen tokens produced for the provided ingredients.
     */
    tokensForDishIngredients(ingredientArray) {
        const union = new Set();
        for (const singleIngredient of ingredientArray || []) {
            const mapped = this.tokensForIngredient(singleIngredient);
            for (const token of mapped) union.add(token);
        }
        return union;
    }
}

/* rng utilities */
/**
 * Picks a unique subset of items from the provided source array.
 *
 * @template T
 * @param {T[]} sourceArray - Source items to sample from.
 * @param {number} howMany - Desired number of unique items.
 * @returns {T[]} Sampled subset of items.
 */
export function pickRandomUnique(sourceArray, howMany) {
    const copyArray = Array.from(sourceArray);
    for (let reverseIndex = copyArray.length - 1; reverseIndex > 0; reverseIndex--) {
        const randomIndex = Math.floor(Math.random() * (reverseIndex + 1));
        [copyArray[reverseIndex], copyArray[randomIndex]] = [copyArray[randomIndex], copyArray[reverseIndex]];
    }
    return copyArray.slice(0, howMany);
}
