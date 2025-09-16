/* File: ui.js */
/* global document */
import { SCREEN_ALLERGY, SCREEN_WHEEL } from "./constants.js";

/* exclusive screens */
export function showScreen(screenName) {
    const bodyElement = document.body;
    const revealElement = document.getElementById("reveal");

    if (screenName === SCREEN_ALLERGY) {
        bodyElement.setAttribute("data-screen", SCREEN_ALLERGY);
        if (revealElement) revealElement.setAttribute("aria-hidden", "true");
    } else if (screenName === SCREEN_WHEEL) {
        bodyElement.setAttribute("data-screen", SCREEN_WHEEL);
        if (revealElement) revealElement.setAttribute("aria-hidden", "true");
    }
}

/* stop button visual state helpers (mirrored in app.js text switch) */
export function setWheelControlToStop() { /* no-op for API symmetry */ }
export function setWheelControlToStartGame() { /* no-op for API symmetry */ }

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
