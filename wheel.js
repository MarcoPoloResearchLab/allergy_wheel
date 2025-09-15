/* global window */

const wheelState = {
    canvasElement: null,
    drawingContext: null,
    segmentLabels: [],
    currentAngleRadians: 0,

    // spin
    isSpinning: false,
    spinStartAngleRadians: 0,
    spinTargetAngleRadians: 0,
    spinStartTimestampMs: 0,
    spinDurationMs: 2600,

    // sizing
    cssSideLengthPixels: 0,
    resizeObserver: null
};

/* ---------- sizing ---------- */
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

    const devicePixelRatioRounded = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    wheelState.canvasElement.style.width = `${cssSide}px`;
    wheelState.canvasElement.style.height = `${cssSide}px`;

    const backingWidth = Math.round(cssSide * devicePixelRatioRounded);
    const backingHeight = Math.round(cssSide * devicePixelRatioRounded);
    if (wheelState.canvasElement.width !== backingWidth) wheelState.canvasElement.width = backingWidth;
    if (wheelState.canvasElement.height !== backingHeight) wheelState.canvasElement.height = backingHeight;

    const drawingContext = wheelState.drawingContext;
    drawingContext.setTransform(1, 0, 0, 1, 0, 0);
    drawingContext.scale(devicePixelRatioRounded, devicePixelRatioRounded);
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

/* ---------- initialization ---------- */
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
}

/* ---------- drawing ---------- */
export function drawWheel() {
    const drawingContext = wheelState.drawingContext;
    if (!drawingContext) return;

    const viewWidth = wheelState.cssSideLengthPixels || 1;
    const viewHeight = wheelState.cssSideLengthPixels || 1;
    const centerX = viewWidth / 2;
    const centerY = viewHeight / 2;
    const wheelRadius = Math.min(viewWidth, viewHeight) * 0.45;

    drawingContext.clearRect(0, 0, viewWidth, viewHeight);

    // base disk
    drawingContext.beginPath();
    drawingContext.arc(centerX, centerY, wheelRadius, 0, Math.PI * 2, false);
    drawingContext.fillStyle = "#e6e6e6";
    drawingContext.fill();
    drawingContext.lineWidth = 2;
    drawingContext.strokeStyle = "#000";
    drawingContext.stroke();

    const labelList = wheelState.segmentLabels;
    if (!labelList.length) return;

    const segmentCount = labelList.length;
    const segmentAngle = (Math.PI * 2) / segmentCount;

    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
        const segmentStartAngle = wheelState.currentAngleRadians + segmentIndex * segmentAngle;
        const segmentEndAngle = segmentStartAngle + segmentAngle;

        // segment border
        drawingContext.beginPath();
        drawingContext.moveTo(centerX, centerY);
        drawingContext.arc(centerX, centerY, wheelRadius, segmentStartAngle, segmentEndAngle, false);
        drawingContext.closePath();
        drawingContext.strokeStyle = "#000";
        drawingContext.lineWidth = 2;
        drawingContext.stroke();

        // label
        const labelMidAngle = segmentStartAngle + segmentAngle / 2;
        const textX = centerX + Math.cos(labelMidAngle) * wheelRadius * 0.68;
        const textY = centerY + Math.sin(labelMidAngle) * wheelRadius * 0.68;
        const needsFlip = Math.cos(labelMidAngle) < 0;

        drawingContext.save();
        drawingContext.translate(textX, textY);
        drawingContext.rotate(needsFlip ? labelMidAngle + Math.PI : labelMidAngle);
        drawingContext.textAlign = "center";
        drawingContext.textBaseline = "middle";
        drawingContext.font = `${Math.floor(wheelRadius * 0.12)}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
        drawingContext.fillStyle = "#000";
        drawingContext.fillText(labelList[segmentIndex], 0, 0, wheelRadius * 0.9);
        drawingContext.restore();
    }

    // center hub
    drawingContext.beginPath();
    drawingContext.arc(centerX, centerY, wheelRadius * 0.08, 0, Math.PI * 2, false);
    drawingContext.fillStyle = "#fff";
    drawingContext.fill();
    drawingContext.lineWidth = 2;
    drawingContext.strokeStyle = "#000";
    drawingContext.stroke();

    // top pointer (inside canvas)
    const pointerLength = wheelRadius * 0.16;
    drawingContext.beginPath();
    drawingContext.moveTo(centerX, centerY - wheelRadius - 8);
    drawingContext.lineTo(centerX - pointerLength * 0.35, centerY - wheelRadius + pointerLength * 0.08);
    drawingContext.lineTo(centerX + pointerLength * 0.35, centerY - wheelRadius + pointerLength * 0.08);
    drawingContext.closePath();
    drawingContext.fillStyle = "#000";
    drawingContext.fill();
}

/* ---------- spin ---------- */
function easeOutCubic(normalizedTime) {
    const clamped = normalizedTime < 0 ? 0 : normalizedTime > 1 ? 1 : normalizedTime;
    const inverted = 1 - clamped;
    return 1 - inverted * inverted * inverted;
}

function animationFrameStep() {
    if (!wheelState.isSpinning) return;
    const elapsed = performance.now() - wheelState.spinStartTimestampMs;
    const normalized = Math.min(elapsed / wheelState.spinDurationMs, 1);
    const eased = easeOutCubic(normalized);
    wheelState.currentAngleRadians =
        wheelState.spinStartAngleRadians +
        eased * (wheelState.spinTargetAngleRadians - wheelState.spinStartAngleRadians);

    drawWheel();

    if (normalized >= 1) {
        wheelState.isSpinning = false;
        snapToNearestWinner();
        return;
    }
    window.requestAnimationFrame(animationFrameStep);
}

function snapToNearestWinner() {
    const labelList = wheelState.segmentLabels;
    if (!labelList.length) return;
    const segmentAngle = (Math.PI * 2) / labelList.length;
    const pointerAngle = -Math.PI / 2;
    const relativeAngle = (wheelState.currentAngleRadians - pointerAngle) % (Math.PI * 2);
    const normalizedAngle = (relativeAngle + Math.PI * 2) % (Math.PI * 2);
    const winnerIndex = Math.floor(normalizedAngle / segmentAngle);
    wheelState.currentAngleRadians = pointerAngle + winnerIndex * segmentAngle + segmentAngle / 2;
    drawWheel();
}

export function spinToIndex(requestedIndex) {
    const labelList = wheelState.segmentLabels;
    if (!labelList.length) return;
    if (labelList.length === 1 && labelList[0] === "No matches") return;
    if (wheelState.isSpinning) return;

    const segmentCount = labelList.length;
    const chosenIndex =
        typeof requestedIndex === "number" && requestedIndex >= 0
            ? requestedIndex % segmentCount
            : Math.floor(Math.random() * segmentCount);

    const segmentAngle = (Math.PI * 2) / segmentCount;
    const pointerAngle = -Math.PI / 2;
    const destinationAngle = pointerAngle + chosenIndex * segmentAngle + segmentAngle / 2;

    wheelState.spinStartAngleRadians = wheelState.currentAngleRadians;
    wheelState.spinTargetAngleRadians = destinationAngle + Math.PI * 2 * 4;
    wheelState.spinStartTimestampMs = performance.now();
    wheelState.isSpinning = true;
    window.requestAnimationFrame(animationFrameStep);
}
