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
        radioElement.name = radioGroupName;
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
   Added: cuisineToFlagMap (Map lowercased cuisine -> flag emoji) */
export function populateRevealCard({
                                       dish,
                                       selectedAllergenToken,
                                       selectedAllergenLabel,
                                       normalizationEngine,
                                       allergensCatalog,
                                       cuisineToFlagMap
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

    // Map allergen token -> emoji for quick lookup
    const emojiByToken = new Map();
    for (const a of allergensCatalog || []) {
        if (a && a.token) emojiByToken.set(a.token, a.emoji || "");
    }

    let hasTriggeringIngredient = false;

    for (const ingredientName of dish.ingredients || []) {
        const spanElement = document.createElement("span");
        spanElement.className = "ingredient";

        const tokensForIngredient = normalizationEngine.tokensForIngredient(ingredientName);
        let ingredientEmoji = "";

        if (tokensForIngredient.has(selectedAllergenToken)) {
            hasTriggeringIngredient = true;
            spanElement.classList.add("bad");
            ingredientEmoji = emojiByToken.get(selectedAllergenToken) || "";
        } else {
            // If ingredient maps to any known allergen token, show its emoji (first match)
            for (const token of tokensForIngredient) {
                const maybe = emojiByToken.get(token);
                if (maybe) { ingredientEmoji = maybe; break; }
            }
        }

        const textSpan = document.createElement("span");
        textSpan.textContent = ingredientName;

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
            span.className = "heart heart-enter";
            span.setAttribute("aria-hidden", "true");
            span.textContent = "❤️";
            heartsBar.appendChild(span);
            span.addEventListener("animationend", function onEnd() {
                span.classList.remove("heart-enter");
            }, { once: true });
        }
        showHeartDelta("+" + delta);
        heartsBar.classList.remove("pulse");
        // eslint-disable-next-line no-unused-expressions
        heartsBar.offsetWidth;
        heartsBar.classList.add("pulse");
    } else if (delta < 0) {
        for (let i = 0; i < Math.abs(delta); i++) {
            const last = heartsBar.lastElementChild;
            if (!last) break;
            last.classList.add("heart-exit");
            last.addEventListener("animationend", function onExit() {
                last.remove();
            }, { once: true });
        }
        showHeartDelta(String(delta));
        heartsBar.classList.remove("shake");
        // eslint-disable-next-line no-unused-expressions
        heartsBar.offsetWidth;
        heartsBar.classList.add("shake");
    }

    heartsBar.setAttribute("data-count", String(total));
    heartsBar.setAttribute("aria-label", total + " hearts");
    heartsBar.title = total + " hearts";
}

function showHeartDelta(textContent) {
    const heartsBar = document.getElementById("hearts-bar");
    if (!heartsBar) return;
    const bubble = document.createElement("span");
    bubble.className = "heart-delta";
    bubble.textContent = textContent;
    heartsBar.appendChild(bubble);
    bubble.addEventListener("animationend", function onAnimEnd() { bubble.remove(); }, { once: true });
}

export function animateHeartGainFromReveal() {
    const source = document.getElementById("result") || document.getElementById("reveal");
    const target = document.getElementById("hearts-bar");
    if (!source || !target) return;

    const srcRect = source.getBoundingClientRect();
    const tgtRect = target.getBoundingClientRect();

    const startX = srcRect.left + srcRect.width * 0.1;
    const startY = srcRect.top + 16;
    const endX = tgtRect.left + tgtRect.width - 8;
    const endY = tgtRect.top + 8;

    const heart = document.createElement("span");
    heart.className = "fx-heart fly";
    heart.textContent = "❤️";
    heart.style.left = startX + "px";
    heart.style.top = startY + "px";
    document.body.appendChild(heart);

    const dx = endX - startX;
    const dy = endY - startY;
    heart.style.setProperty("--dx", dx + "px");
    heart.style.setProperty("--dy", dy + "px");

    requestAnimationFrame(function go() { heart.classList.add("go"); });

    heart.addEventListener("transitionend", function onEnd() { heart.remove(); }, { once: true });
}

export function animateHeartLossAtHeartsBar() {
    const target = document.getElementById("hearts-bar");
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width - 10;
    const cy = rect.top + 10;

    const heart = document.createElement("span");
    heart.className = "fx-heart break";
    heart.textContent = "💔";
    heart.style.left = cx + "px";
    heart.style.top = cy + "px";
    document.body.appendChild(heart);

    heart.addEventListener("animationend", function onEnd() { heart.remove(); }, { once: true });
}

/* ---------- Game Over overlay helpers ---------- */
export function showGameOver() {
    const gameoverSection = document.getElementById("gameover");
    if (gameoverSection) gameoverSection.setAttribute("aria-hidden", "false");
}
