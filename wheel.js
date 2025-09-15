/* global window */

const wheelState = {
    canvasElement: null,
    drawingContext: null,
    segmentLabels: [],
    currentAngleRadians: 0,

    isSpinning: false,
    spinStartAngleRadians: 0,
    spinTargetAngleRadians: 0,
    spinStartTimestampMs: 0,
    spinDurationMs: 2600,

    cssSideLengthPixels: 0,
    resizeObserver: null,

    lastTickedSegmentIndex: null,
    onTickSegmentBoundary: null,
    onSpinComplete: null,

    // Pointer tap animation state
    pointerTapActive: false,
    pointerTapDurationMs: 70
};

/* vibrant, alternating palette for a beautiful wheel */
const segmentPalette = [
    "#FF6B6B","#FFD166","#06D6A0","#4D96FF","#C77DFF","#FF9F1C",
    "#2EC4B6","#EF476F","#70C1B3","#9B5DE5","#F15BB5","#00BBF9"
];

function computeCssSquareSide(wrapperElement) {
    const rect = wrapperElement.getBoundingClientRect();
    let measuredWidth = rect.width;
    let measuredHeight = rect.height;
    if (!measuredWidth) measuredWidth = wrapperElement.offsetWidth || Math.floor(window.innerWidth * 0.9);
    if (!measuredHeight) measuredHeight = wrapperElement.offsetHeight || measuredWidth;
    return Math.max(1, Math.min(measuredWidth, measuredHeight));
}

function resizeCanvasBackingStore() {
    if (!wheelState.canvasElement) return;
    const wrapperElement = wheelState.canvasElement.parentElement || wheelState.canvasElement;
    const cssSide = computeCssSquareSide(wrapperElement);
    wheelState.cssSideLengthPixels = cssSide;

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    wheelState.canvasElement.style.width = `${cssSide}px`;
    wheelState.canvasElement.style.height = `${cssSide}px`;

    const backingWidth = Math.round(cssSide * dpr);
    const backingHeight = Math.round(cssSide * dpr);
    if (wheelState.canvasElement.width !== backingWidth) wheelState.canvasElement.width = backingWidth;
    if (wheelState.canvasElement.height !== backingHeight) wheelState.canvasElement.height = backingHeight;

    const ctx = wheelState.drawingContext;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
}

let windowResizeDebounceHandle = null;
window.addEventListener("resize", () => {
    if (windowResizeDebounceHandle) clearTimeout(windowResizeDebounceHandle);
    windowResizeDebounceHandle = setTimeout(() => {
        resizeCanvasBackingStore();
        drawWheel();
    }, 120);
});

export function ensureWheelSize() {
    resizeCanvasBackingStore();
    drawWheel();
}

export function initWheel(canvasElement) {
    wheelState.canvasElement = canvasElement;
    wheelState.drawingContext = canvasElement.getContext("2d");
    canvasElement.style.display = "block";

    const wrapperElement = canvasElement.parentElement || canvasElement;
    if ("ResizeObserver" in window) {
        wheelState.resizeObserver = new ResizeObserver(() => {
            resizeCanvasBackingStore();
            drawWheel();
        });
        wheelState.resizeObserver.observe(wrapperElement);
    }

    resizeCanvasBackingStore();
    drawWheel();
}

export function setWheelLabels(labelArray) {
    wheelState.segmentLabels = Array.isArray(labelArray)
        ? labelArray.map((text) => (text == null ? "" : String(text))).filter((text) => text.length > 0)
        : [];
    wheelState.lastTickedSegmentIndex = null;
}

export function registerSpinCallbacks(callbacks) {
    wheelState.onTickSegmentBoundary = callbacks && typeof callbacks.onTick === "function" ? callbacks.onTick : null;
    wheelState.onSpinComplete = callbacks && typeof callbacks.onStop === "function" ? callbacks.onStop : null;
}

export function setSpinDurationMs(ms) {
    wheelState.spinDurationMs = typeof ms === "number" && ms > 0 ? ms : wheelState.spinDurationMs;
}

/* ---------- Beautiful curved text helpers ---------- */

/** Measure how much angle (radians) a text occupies along an arc for a given font size. */
function measureArcAngle(ctx, text, radius, fontPx, letterSpacingPx) {
    ctx.save();
    ctx.font = `${fontPx}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
    let totalWidth = 0;
    for (let i = 0; i < text.length; i++) {
        totalWidth += ctx.measureText(text[i]).width;
        if (i !== text.length - 1) totalWidth += letterSpacingPx;
    }
    ctx.restore();
    return totalWidth / radius; // angle = arc length / radius
}

/** Draw text centered in a segment, along the arc, with outline for contrast. */
function drawArcTextCentered(ctx, text, centerX, centerY, radius, midAngle, segmentSweep) {
    // Target to use ~85% of angular width for padding from borders
    const usableSweep = segmentSweep * 0.85;

    // Start with a large size and shrink to fit
    const maxPx = Math.max(14, Math.floor(radius * 0.16));
    const minPx = 10;
    let fontPx = maxPx;
    let letterSpacingPx = Math.max(1, Math.round(fontPx * 0.08));

    // Decrease font until text fits within usable sweep
    for (; fontPx >= minPx; fontPx -= 1) {
        letterSpacingPx = Math.max(1, Math.round(fontPx * 0.08));
        const ang = measureArcAngle(ctx, text, radius, fontPx, letterSpacingPx);
        if (ang <= usableSweep) break;
    }

    // Compute total angle at final size
    const totalAngle = measureArcAngle(ctx, text, radius, fontPx, letterSpacingPx);
    let startAngle = midAngle - totalAngle / 2;

    ctx.save();
    ctx.font = `${fontPx}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic"; // use alphabetic so lowercases sit nicely on baseline

    const strokeWidth = Math.max(2, Math.round(fontPx * 0.14));
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = "#ffffff";  // white halo for contrast on bright slices
    ctx.fillStyle = "#000000";

    // Draw each glyph along the arc
    for (let i = 0; i < text.length; i++) {
        const glyph = text[i];
        const glyphWidth = ctx.measureText(glyph).width;
        const glyphAngle = glyphWidth / radius;

        const angle = startAngle + glyphAngle / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        ctx.save();
        // Upright text tangent to the arc; rotate so text is readable from outside
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);

        ctx.strokeText(glyph, 0, 0);
        ctx.fillText(glyph, 0, 0);

        ctx.restore();

        startAngle += glyphAngle;
        // add letter-spacing as extra angle
        startAngle += (i !== text.length - 1 ? letterSpacingPx / radius : 0);
    }

    ctx.restore();
}

/* ---------- Rendering ---------- */
export function drawWheel() {
    const ctx = wheelState.drawingContext;
    if (!ctx) return;

    const view = wheelState.cssSideLengthPixels || 1;
    const centerX = view / 2;
    const centerY = view / 2;
    const wheelRadius = Math.min(view, view) * 0.45;

    ctx.clearRect(0, 0, view, view);

    // base circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, wheelRadius, 0, Math.PI * 2, false);
    ctx.fillStyle = "#f5f5f5";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#000";
    ctx.stroke();

    const labels = wheelState.segmentLabels;
    if (!labels.length) return;

    const segmentCount = labels.length;
    const segmentAngle = (Math.PI * 2) / segmentCount;

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
        const startA = wheelState.currentAngleRadians + segmentIndex * segmentAngle;
        const endA = startA + segmentAngle;

        // slice fill
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, wheelRadius, startA, endA, false);
        ctx.closePath();
        ctx.fillStyle = segmentPalette[segmentIndex % segmentPalette.length];
        ctx.fill();

        // slice border
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#000";
        ctx.stroke();

        // label: draw beautifully along the arc at ~0.68 * radius
        const midA = startA + segmentAngle / 2;
        const labelRadius = wheelRadius * 0.72; // slightly inward so text never clips border
        drawArcTextCentered(ctx, labels[segmentIndex], centerX, centerY, labelRadius, midA, segmentAngle);
    }

    // center hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, wheelRadius * 0.08, 0, Math.PI * 2, false);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";
    ctx.stroke();

    // === BIG TOP POINTER (outside the wheel, pointing down into the wheel) ===
    const pointerGap = Math.max(6, wheelRadius * 0.012); // idle gap above rim
    const tipX = centerX;
    const tipY = wheelState.pointerTapActive
        ? centerX - wheelRadius // (we correct below) left here to show intent; corrected next line
        : centerX - wheelRadius - pointerGap;

    // correction for tipY using centerY
    const fixedTipY = wheelState.pointerTapActive
        ? centerY - wheelRadius
        : centerY - wheelRadius - pointerGap;

    const pointerLength = wheelRadius * 0.24;
    const halfBase = pointerLength * 0.65;

    ctx.beginPath();
    ctx.moveTo(tipX, fixedTipY);
    ctx.lineTo(tipX - halfBase, fixedTipY - pointerLength);
    ctx.lineTo(tipX + halfBase, fixedTipY - pointerLength);
    ctx.closePath();
    ctx.fillStyle = "#000";
    ctx.fill();
}

function easeOutCubic(t) {
    const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
    const inverted = 1 - clamped;
    return 1 - inverted * inverted * inverted;
}

function getCurrentPointerSegmentIndex() {
    const labels = wheelState.segmentLabels;
    if (!labels.length) return null;
    const segA = (Math.PI * 2) / labels.length;
    const pointerAngle = -Math.PI / 2;
    const relative = (wheelState.currentAngleRadians - pointerAngle) % (Math.PI * 2);
    const normalized = (relative + Math.PI * 2) % (Math.PI * 2);
    const index = Math.floor(normalized / segA);
    return index;
}

function animationFrameStep() {
    if (!wheelState.isSpinning) return;

    const elapsed = performance.now() - wheelState.spinStartTimestampMs;
    const t = Math.min(elapsed / wheelState.spinDurationMs, 1);
    const eased = easeOutCubic(t);
    wheelState.currentAngleRadians =
        wheelState.spinStartAngleRadians +
        eased * (wheelState.spinTargetAngleRadians - wheelState.spinStartAngleRadians);

    const currentIndex = getCurrentPointerSegmentIndex();
    if (currentIndex !== null && currentIndex !== wheelState.lastTickedSegmentIndex) {
        wheelState.lastTickedSegmentIndex = currentIndex;
        if (typeof wheelState.onTickSegmentBoundary === "function") {
            wheelState.onTickSegmentBoundary(currentIndex);
        }
    }

    drawWheel();

    if (t >= 1) {
        wheelState.isSpinning = false;
        snapToNearestWinner();
        const winnerIndex = getCurrentPointerSegmentIndex();
        if (typeof wheelState.onSpinComplete === "function" && winnerIndex !== null) {
            wheelState.onSpinComplete(winnerIndex);
        }
        return;
    }
    window.requestAnimationFrame(animationFrameStep);
}

function snapToNearestWinner() {
    const labels = wheelState.segmentLabels;
    if (!labels.length) return;
    const segA = (Math.PI * 2) / labels.length;
    const pointerAngle = -Math.PI / 2;
    const relative = (wheelState.currentAngleRadians - pointerAngle) % (Math.PI * 2);
    const normalized = (relative + Math.PI * 2) % (Math.PI * 2);
    const index = Math.floor(normalized / segA);
    wheelState.currentAngleRadians = pointerAngle + index * segA + segA / 2;
    drawWheel();
}

export function spinToIndex(requestedIndex) {
    const labels = wheelState.segmentLabels;
    if (!labels.length) return;
    if (labels.length === 1 && labels[0] === "No matches") return;
    if (wheelState.isSpinning) return;

    const count = labels.length;
    const chosen =
        typeof requestedIndex === "number" && requestedIndex >= 0
            ? requestedIndex % count
            : Math.floor(Math.random() * count);

    const segA = (Math.PI * 2) / count;
    const pointerAngle = -Math.PI / 2;
    const destination = pointerAngle + chosen * segA + segA / 2;

    wheelState.spinStartAngleRadians = wheelState.currentAngleRadians;
    wheelState.spinTargetAngleRadians = destination + Math.PI * 2 * 4; // drama
    wheelState.spinStartTimestampMs = performance.now();
    wheelState.isSpinning = true;
    wheelState.lastTickedSegmentIndex = getCurrentPointerSegmentIndex();
    window.requestAnimationFrame(animationFrameStep);
}

/** stop immediately, snap, and fire onSpinComplete with current index */
export function forceStopSpin() {
    if (!wheelState.segmentLabels.length) return;
    wheelState.isSpinning = false;
    snapToNearestWinner();
    const winnerIndex = getCurrentPointerSegmentIndex();
    if (typeof wheelState.onSpinComplete === "function" && winnerIndex !== null) {
        wheelState.onSpinComplete(winnerIndex);
    }
}

/** brief downward tap so the pointer tip touches the rim; used on tick */
export function triggerPointerTap() {
    wheelState.pointerTapActive = true;
    setTimeout(() => {
        wheelState.pointerTapActive = false;
        drawWheel();
    }, wheelState.pointerTapDurationMs);
    drawWheel();
}
