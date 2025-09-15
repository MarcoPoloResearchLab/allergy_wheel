/* global document */

/* allergen list */
export function renderAllergenList(containerElement, allergenList, onSelectCallback) {
    containerElement.innerHTML = "";
    const radioGroupName = "allergen_single";

    for (const allergenItem of allergenList) {
        const allergenToken = allergenItem.token;
        const allergenLabel = allergenItem.label || allergenToken;

        const labelElement = document.createElement("label");
        labelElement.className = "chip";

        const radioElement = document.createElement("input");
        radioElement.type = "radio";
        radioElement.name = radioGroupName;
        radioElement.value = allergenToken;

        radioElement.addEventListener("change", () => {
            if (typeof onSelectCallback === "function") onSelectCallback(allergenToken, allergenLabel);
        });

        labelElement.appendChild(radioElement);
        labelElement.appendChild(document.createTextNode(` ${allergenLabel}`));
        containerElement.appendChild(labelElement);
    }
}

/* badges under wheel */
export function refreshSelectedAllergenBadges(allergenLabels) {
    const badgesContainer = document.getElementById("sel-badges");
    if (!badgesContainer) return;
    badgesContainer.textContent = "";
    for (const singleLabel of allergenLabels || []) {
        const badgeElement = document.createElement("span");
        badgeElement.className = "badge";
        badgeElement.textContent = singleLabel;
        badgesContainer.appendChild(badgeElement);
    }
}

/* exclusive screens */
export function showScreen(screenName) {
    const bodyElement = document.body;
    const revealElement = document.getElementById("reveal");

    if (screenName === "allergy") {
        bodyElement.setAttribute("data-screen", "allergy");
        if (revealElement) revealElement.setAttribute("aria-hidden", "true");
    } else if (screenName === "wheel") {
        bodyElement.setAttribute("data-screen", "wheel");
        if (revealElement) revealElement.setAttribute("aria-hidden", "true");
    }
}

/* stop button visual state helpers (mirrored in app.js text switch) */
export function setWheelControlToStop() {
    // no-op here; class/text is handled in app.js; this is kept to satisfy API exposure
}
export function setWheelControlToStartGame() {
    // no-op (same rationale)
}

/* populate reveal card and return outcome */
export function populateRevealCard({ dish, selectedAllergenToken, selectedAllergenLabel, normalizationEngine }) {
    const revealSection = document.getElementById("reveal");
    const dishTitleElement = document.getElementById("dish-title");
    const dishCuisineElement = document.getElementById("dish-cuisine");
    const resultBannerElement = document.getElementById("result");
    const resultTextElement = document.getElementById("result-text");
    const ingredientsContainer = document.getElementById("dish-ingredients");
    const faceSvg = document.getElementById("face");

    dishTitleElement.textContent = dish.name || dish.title || dish.label || dish.id || "";
    dishCuisineElement.textContent = dish.cuisine || "";
    ingredientsContainer.textContent = "";

    let hasTriggeringIngredient = false;

    for (const ingredientName of dish.ingredients || []) {
        const spanElement = document.createElement("span");
        spanElement.className = "ingredient";
        const tokensForIngredient = normalizationEngine.tokensForIngredient(ingredientName);
        if (tokensForIngredient.has(selectedAllergenToken)) {
            hasTriggeringIngredient = true;
            spanElement.classList.add("bad");
        }
        spanElement.textContent = ingredientName;
        ingredientsContainer.appendChild(spanElement);
    }

    if (hasTriggeringIngredient) {
        resultBannerElement.classList.remove("ok");
        resultBannerElement.classList.add("bad");
        resultTextElement.textContent = `Contains your allergen: ${selectedAllergenLabel}`;
        if (faceSvg) faceSvg.hidden = false;
    } else {
        resultBannerElement.classList.remove("bad");
        resultBannerElement.classList.add("ok");
        resultTextElement.textContent = "Safe to eat. Yummy!";
        if (faceSvg) faceSvg.hidden = true;
    }

    if (revealSection) revealSection.setAttribute("aria-hidden", "false");

    return { hasTriggeringIngredient };
}
