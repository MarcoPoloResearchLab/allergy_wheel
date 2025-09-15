/* global window */

export async function loadJson(pathString) {
    const httpResponse = await fetch(pathString, { cache: "no-store" });
    if (!httpResponse.ok) throw new Error(`failed to load ${pathString}`);
    return httpResponse.json();
}

export class NormalizationEngine {
    constructor(ruleDescriptors) {
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

    tokensForIngredient(ingredientText) {
        const foundTokens = new Set();
        const candidateText = String(ingredientText || "");
        for (const compiledRule of this.compiledRules) {
            if (compiledRule.regex.test(candidateText)) foundTokens.add(compiledRule.token);
        }
        return foundTokens;
    }

    tokensForDishIngredients(ingredientArray) {
        const union = new Set();
        for (const singleIngredient of ingredientArray || []) {
            const mapped = this.tokensForIngredient(singleIngredient);
            for (const token of mapped) union.add(token);
        }
        return union;
    }
}

/* persistence of selection */
const localStorageKeySelectedToken = "allergyWheel.selectedAllergenToken";
const localStorageKeySelectedLabel = "allergyWheel.selectedAllergenLabel";

export function persistSelectedAllergen(tokenValue, labelValue) {
    try {
        if (!tokenValue) return;
        window.localStorage.setItem(localStorageKeySelectedToken, tokenValue);
        window.localStorage.setItem(localStorageKeySelectedLabel, labelValue || "");
    } catch {}
}

export function restorePersistedAllergen() {
    try {
        const token = window.localStorage.getItem(localStorageKeySelectedToken);
        const label = window.localStorage.getItem(localStorageKeySelectedLabel);
        if (token) return { token, label: label || token };
    } catch {}
    return null;
}

/* rng utilities */
export function pickRandomUnique(sourceArray, howMany) {
    const copyArray = Array.from(sourceArray);
    for (let reverseIndex = copyArray.length - 1; reverseIndex > 0; reverseIndex--) {
        const randomIndex = Math.floor(Math.random() * (reverseIndex + 1));
        [copyArray[reverseIndex], copyArray[randomIndex]] = [copyArray[randomIndex], copyArray[reverseIndex]];
    }
    return copyArray.slice(0, howMany);
}
