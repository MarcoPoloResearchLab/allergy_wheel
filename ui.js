/* File: ui.js */
/* global document */

/* allergen list */
export function renderAllergenList(containerElement, allergenList, onSelectCallback) {
    containerElement.innerHTML = "";
    const radioGroupName = "allergen_single";

    for (const allergenItem of allergenList) {
        const allergenToken = allergenItem.token;
        const allergenLabel = allergenItem.label || allergenToken;
        const allergenEmoji = allergenItem.emoji || "";

        const labelElement = document.createElement("label");
        labelElement.className = "chip";

        const radioElement = document.createElement("input");
        radioElement.type = "radio";
        radioElement.name = "allergen_single";
        radioElement.value = allergenToken;

        radioElement.addEventListener("change", () => {
            if (typeof onSelectCallback === "function") onSelectCallback(allergenToken, allergenLabel);
        });

        const textNode = document.createTextNode(" " + allergenLabel);
        const emojiSpan = document.createElement("span");
        emojiSpan.className = "emoji-large";
        emojiSpan.textContent = allergenEmoji;

        labelElement.appendChild(radioElement);
        labelElement.appendChild(textNode);
        labelElement.appendChild(emojiSpan);

        containerElement.appendChild(labelElement);
    }
}

/* badges under wheel */
export function refreshSelectedAllergenBadges(allergenEntries) {
    const badgesContainer = document.getElementById("sel-badges");
    if (!badgesContainer) return;
    badgesContainer.textContent = "";

    for (const entry of allergenEntries || []) {
        const labelText = typeof entry === "string" ? entry : (entry.label || "");
        const emojiText = typeof entry === "string" ? "" : (entry.emoji || "");

        const badgeElement = document.createElement("span");
        badgeElement.className = "badge";

        const labelSpan = document.createElement("span");
        labelSpan.textContent = labelText;

        const emojiSpan = document.createElement("span");
        emojiSpan.className = "emoji-large";
        emojiSpan.textContent = emojiText;

        badgeElement.appendChild(labelSpan);
        if (emojiText) badgeElement.appendChild(emojiSpan);

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
export function setWheelControlToStop() { /* no-op for API symmetry */ }
export function setWheelControlToStartGame() { /* no-op for API symmetry */ }

/* populate reveal card and return outcome
   Added: cuisineToFlagMap (Map lowercased cuisine -> flag emoji)
   Added: ingredientEmojiByName (Map lowercased ingredient name -> emoji) */
export function populateRevealCard({
                                       dish,
                                       selectedAllergenToken,
                                       selectedAllergenLabel,
                                       normalizationEngine,
                                       allergensCatalog,
                                       cuisineToFlagMap,
                                       ingredientEmojiByName
                                   }) {
    const revealSection = document.getElementById("reveal");
    const dishTitleElement = document.getElementById("dish-title");
    const dishCuisineElement = document.getElementById("dish-cuisine");
    const resultBannerElement = document.getElementById("result");
    const resultTextElement = document.getElementById("result-text");
    const ingredientsContainer = document.getElementById("dish-ingredients");
    const faceSvg = document.getElementById("face");

    const dishEmoji = dish.emoji || "";
    const dishNameText = (dish.name || dish.title || dish.label || dish.id || "");
    dishTitleElement.textContent = (dishEmoji ? dishEmoji + " " : "") + dishNameText;

    // Cuisine + country flag (flag looked up by lowercase cuisine name)
    const cuisineText = dish.cuisine || "";
    let cuisineFlagEmoji = "";
    if (cuisineToFlagMap && typeof cuisineToFlagMap.get === "function" && cuisineText) {
        const key = String(cuisineText).trim().toLowerCase();
        cuisineFlagEmoji = cuisineToFlagMap.get(key) || "";
    }
    dishCuisineElement.textContent = cuisineText ? (cuisineFlagEmoji ? (cuisineText + " " + cuisineFlagEmoji) : cuisineText) : "";

    ingredientsContainer.textContent = "";

    // Map allergen token -> emoji for quick fallback lookup
    const emojiByToken = new Map();
    for (const a of allergensCatalog || []) {
        if (a && a.token) emojiByToken.set(a.token, a.emoji || "");
    }

    let hasTriggeringIngredient = false;

    for (const ingredientName of dish.ingredients || []) {
        const spanElement = document.createElement("span");
        spanElement.className = "ingredient";

        const plainName = String(ingredientName || "");
        const lowered = plainName.trim().toLowerCase();

        // Determine allergen hit using normalization engine
        const tokensForIngredient = normalizationEngine.tokensForIngredient(plainName);

        // Determine emoji to show:
        // 1) Prefer explicit ingredient emoji from ingredients.json
        // 2) Otherwise, if ingredient maps to any allergen token, show that allergen's emoji
        let ingredientEmoji = "";
        if (ingredientEmojiByName && typeof ingredientEmojiByName.get === "function") {
            ingredientEmoji = ingredientEmojiByName.get(lowered) || "";
        }
        if (!ingredientEmoji) {
            for (const token of tokensForIngredient) {
                const maybe = emojiByToken.get(token);
                if (maybe) { ingredientEmoji = maybe; break; }
            }
        }

        // Highlight as "bad" if this ingredient triggers the selected allergen
        if (tokensForIngredient.has(selectedAllergenToken)) {
            hasTriggeringIngredient = true;
            spanElement.classList.add("bad");
            // If we still do not have an ingredient-specific emoji, ensure at least the selected allergen's emoji shows
            if (!ingredientEmoji) ingredientEmoji = emojiByToken.get(selectedAllergenToken) || "";
        }

        const textSpan = document.createElement("span");
        textSpan.textContent = plainName;

        const emojiSpan = document.createElement("span");
        emojiSpan.className = "emoji-large";
        emojiSpan.textContent = ingredientEmoji;

        spanElement.appendChild(textSpan);
        if (ingredientEmoji) spanElement.appendChild(emojiSpan);

        ingredientsContainer.appendChild(spanElement);
    }

    if (hasTriggeringIngredient) {
        resultBannerElement.classList.remove("ok");
        resultBannerElement.classList.add("bad");
        resultTextElement.textContent = "Contains your allergen: " + selectedAllergenLabel;
        if (faceSvg) faceSvg.hidden = false;
    } else {
        resultBannerElement.classList.remove("bad");
        resultBannerElement.classList.add("ok");
        resultTextElement.textContent = "Safe to eat. Yummy!";
        if (faceSvg) faceSvg.hidden = true;
    }

    if (revealSection) revealSection.setAttribute("aria-hidden", "false");

    return { hasTriggeringIngredient: hasTriggeringIngredient };
}

/* ---------- Hearts UI ---------- */
export function renderHearts(count, options = {}) {
    const { animate = false } = options;
    const heartsBar = document.getElementById("hearts-bar");
    if (!heartsBar) return;

    const previousCount = parseInt(heartsBar.getAttribute("data-count") || "0", 10);
    const total = Math.max(0, Math.floor(count || 0));

    if (!animate || previousCount === 0) {
        heartsBar.innerHTML = "";
        for (let index = 0; index < total; index++) {
            const span = document.createElement("span");
            span.className = "heart";
            span.setAttribute("aria-hidden", "true");
            span.textContent = "❤️";
            heartsBar.appendChild(span);
        }
        heartsBar.setAttribute("data-count", String(total));
        heartsBar.setAttribute("aria-label", total + " hearts");
        heartsBar.title = total + " hearts";
        return;
    }

    const delta = total - previousCount;
    if (delta > 0) {
        for (let i = 0; i < delta; i++) {
            const span = document.createElement("span");
            span.className = "heart gain";
            span.setAttribute("aria-hidden", "true");
            span.textContent = "❤️";
            heartsBar.appendChild(span);
        }
    } else if (delta < 0) {
        const toRemove = Math.min(previousCount, -delta);
        for (let i = 0; i < toRemove; i++) {
            const child = heartsBar.querySelector(".heart");
            if (child) heartsBar.removeChild(child);
        }
    }
    heartsBar.setAttribute("data-count", String(total));
}

/* small helpers for hearts animations (no-op stubs to keep API consistent with app.js) */
export function animateHeartGainFromReveal() { /* handled in CSS or implemented elsewhere */ }
export function animateHeartLossAtHeartsBar() { /* handled in CSS or implemented elsewhere */ }
export function showGameOver() {
    const gameoverSection = document.getElementById("gameover");
    if (gameoverSection) gameoverSection.setAttribute("aria-hidden", "false");
}

/* ---------- Winning Card (10 hearts) ---------- */
export function showWinningCard() {
    const revealSection = document.getElementById("reveal");
    const dishTitleElement = document.getElementById("dish-title");
    const dishCuisineElement = document.getElementById("dish-cuisine");
    const resultBannerElement = document.getElementById("result");
    const resultTextElement = document.getElementById("result-text");
    const ingredientsContainer = document.getElementById("dish-ingredients");
    const faceSvg = document.getElementById("face");
    const actionsContainer = revealSection ? revealSection.querySelector(".actions") : null;

    if (!revealSection || !dishTitleElement || !resultBannerElement || !resultTextElement || !ingredientsContainer || !actionsContainer) {
        return null;
    }

    // Title & sub
    dishTitleElement.textContent = "You Win! 🏆";
    dishCuisineElement.textContent = "";

    // Banner
    resultBannerElement.classList.remove("bad");
    resultBannerElement.classList.add("ok");
    resultTextElement.textContent = "Amazing! You collected 10 hearts!";
    if (faceSvg) faceSvg.hidden = true;

    // No ingredients on win card
    ingredientsContainer.textContent = "";

    // Replace actions with only Restart
    actionsContainer.textContent = "";
    const restartBtn = document.createElement("button");
    restartBtn.className = "btn primary";
    restartBtn.id = "win-restart";
    restartBtn.textContent = "Restart";
    actionsContainer.appendChild(restartBtn);

    revealSection.setAttribute("aria-hidden", "false");
    return restartBtn;
}
