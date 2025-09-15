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
export function setWheelControlToStop() { /* no-op for API symmetry */ }
export function setWheelControlToStartGame() { /* no-op for API symmetry */ }

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

/* ---------- Hearts UI ---------- */
/**
 * Render hearts with optional add/remove animations.
 * @param {number} count - target hearts count
 * @param {{animate?: boolean}} [options]
 */
export function renderHearts(count, options = {}) {
    const { animate = false } = options;
    const heartsBar = document.getElementById("hearts-bar");
    if (!heartsBar) return;

    const previousCount = parseInt(heartsBar.getAttribute("data-count") || "0", 10);
    const total = Math.max(0, Math.floor(count || 0));

    // First render (or when animation is disabled): hard rebuild
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
        heartsBar.setAttribute("aria-label", `${total} hearts`);
        heartsBar.title = `${total} hearts`;
        return;
    }

    // Animated diff
    const delta = total - previousCount;
    if (delta > 0) {
        // Add hearts with a pop-in animation
        for (let i = 0; i < delta; i++) {
            const span = document.createElement("span");
            span.className = "heart heart-enter";
            span.setAttribute("aria-hidden", "true");
            span.textContent = "❤️";
            heartsBar.appendChild(span);
            span.addEventListener("animationend", () => {
                span.classList.remove("heart-enter");
            }, { once: true });
        }
        showHeartDelta(`+${delta}`);
    } else if (delta < 0) {
        // Remove hearts with a pop-out animation (from the end)
        for (let i = 0; i < Math.abs(delta); i++) {
            const last = heartsBar.lastElementChild;
            if (!last) break;
            last.classList.add("heart-exit");
            last.addEventListener("animationend", () => {
                last.remove();
            }, { once: true });
        }
        showHeartDelta(`${delta}`); // delta is negative already
    }

    heartsBar.setAttribute("data-count", String(total));
    heartsBar.setAttribute("aria-label", `${total} hearts`);
    heartsBar.title = `${total} hearts`;
}

/** Floating “+1 / -1” indicator near the hearts bar */
function showHeartDelta(textContent) {
    const heartsBar = document.getElementById("hearts-bar");
    if (!heartsBar) return;
    const bubble = document.createElement("span");
    bubble.className = "heart-delta";
    bubble.textContent = textContent;
    heartsBar.appendChild(bubble);
    bubble.addEventListener("animationend", () => bubble.remove(), { once: true });
}

export function showGameOver() {
    const gameover = document.getElementById("gameover");
    if (!gameover) return;
    gameover.setAttribute("aria-hidden", "false");
}
