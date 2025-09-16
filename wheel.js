/* File: wheel.js */
/* global window */

const DEFAULT_SPIN_DURATION_MS = 30000;
const DEFAULT_REVOLUTIONS = 4;
const POINTER_TAP_DURATION_MS = 70;
const RESIZE_DEBOUNCE_DELAY_MS = 120;

const segmentPalette = [
    "#FF6B6B","#FFD166","#06D6A0","#4D96FF","#C77DFF","#FF9F1C",
    "#2EC4B6","#EF476F","#70C1B3","#9B5DE5","#F15BB5","#00BBF9"
];

const PointerColor = Object.freeze({
    DEFAULT: "#000000",
    ACTIVE: "#DD3333"
});

function computeCssSquareSide(wrapperElement, windowReference) {
    if (!wrapperElement) {
        return 1;
    }
    const hasBoundingClientRect = typeof wrapperElement.getBoundingClientRect === "function";
    const rect = hasBoundingClientRect ? wrapperElement.getBoundingClientRect() : null;
    const widthCandidate = (rect && rect.width)
        || wrapperElement.offsetWidth
        || (typeof windowReference.innerWidth === "number" ? windowReference.innerWidth * 0.9 : 0);
    const heightCandidate = (rect && rect.height)
        || wrapperElement.offsetHeight
        || widthCandidate;
    return Math.max(1, Math.min(widthCandidate, heightCandidate));
}

function wrapLabel(ctx, text, maxWidth, fontPx) {
    ctx.font = `${fontPx}px "Fredoka One", sans-serif`;
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width <= maxWidth) {
            line = candidate;
        } else {
            if (line) lines.push(line);
            line = word;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function computeFontPx(ctx, labels, maxWidth, maxFontPx, minFontPx) {
    const textOnly = labels.map((entry) => (typeof entry === "string" ? entry : (entry?.label || "")));
    for (let size = maxFontPx; size >= minFontPx; size -= 1) {
        let fits = true;
        for (const label of textOnly) {
            const lines = wrapLabel(ctx, label, maxWidth, size);
            for (const line of lines) {
                if (ctx.measureText(line).width > maxWidth) {
                    fits = false;
                    break;
                }
            }
            if (!fits) break;
        }
        if (fits) return size;
    }
    return minFontPx;
}

function drawPointer(ctx, cx, cy, radius, isTapActive) {
    const pointerColor = isTapActive ? PointerColor.ACTIVE : PointerColor.DEFAULT;
    const tipX = cx;
    const tipY = cy - radius - 8;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - 20, tipY - 40);
    ctx.lineTo(tipX + 20, tipY - 40);
    ctx.closePath();
    ctx.fillStyle = pointerColor;
    ctx.fill();
}

function easeOutCubic(t) {
    const clamped = Math.min(Math.max(t, 0), 1);
    return 1 - Math.pow(1 - clamped, 3);
}

export class Wheel {
    constructor({ windowReference = (typeof window !== "undefined" ? window : globalThis) } = {}) {
        this.windowReference = windowReference;
        this.canvasElement = null;
        this.drawingContext = null;
        this.segmentLabels = [];
        this.currentAngleRadians = 0;

        this.isSpinning = false;
        this.spinStartAngleRadians = 0;
        this.spinTargetAngleRadians = 0;
        this.spinStartTimestampMs = 0;
        this.spinDurationMs = DEFAULT_SPIN_DURATION_MS;
        this.revolutions = DEFAULT_REVOLUTIONS;

        this.cssSideLengthPixels = 0;
        this.resizeObserver = null;
        this.layout = null;

        this.lastTickedSegmentIndex = null;
        this.onTickSegmentBoundary = null;
        this.onSpinComplete = null;

        this.pointerTapActive = false;
        this.pointerTapDurationMs = POINTER_TAP_DURATION_MS;
        this.pointerTapTimerId = null;

        this.resizeTimerId = null;
        this.windowResizeListenerAttached = false;
        this.animationFrameRequestId = null;

        this.boundAnimationStep = this.handleAnimationStep.bind(this);
        this.boundWindowResizeHandler = this.handleWindowResize.bind(this);

        const fallbackGlobal = this.windowReference;
        this.setTimeout = typeof fallbackGlobal.setTimeout === "function"
            ? fallbackGlobal.setTimeout.bind(fallbackGlobal)
            : (fn, delay) => setTimeout(fn, delay);
        this.clearTimeout = typeof fallbackGlobal.clearTimeout === "function"
            ? fallbackGlobal.clearTimeout.bind(fallbackGlobal)
            : (id) => clearTimeout(id);
        this.requestAnimationFrame = typeof fallbackGlobal.requestAnimationFrame === "function"
            ? fallbackGlobal.requestAnimationFrame.bind(fallbackGlobal)
            : (fn) => this.setTimeout(() => fn(this.getCurrentTime()), 16);
        this.cancelAnimationFrame = typeof fallbackGlobal.cancelAnimationFrame === "function"
            ? fallbackGlobal.cancelAnimationFrame.bind(fallbackGlobal)
            : (id) => this.clearTimeout(id);
    }

    initialize(canvasElement) {
        if (!canvasElement || typeof canvasElement.getContext !== "function") {
            throw new Error("Wheel requires a canvas element with a 2d context");
        }

        this.canvasElement = canvasElement;
        this.drawingContext = canvasElement.getContext("2d");
        if (!this.drawingContext) {
            throw new Error("Wheel could not acquire a 2d drawing context");
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        const { ResizeObserver } = this.windowReference;
        if (typeof ResizeObserver === "function") {
            this.resizeObserver = new ResizeObserver(() => {
                this.resizeCanvasBackingStore();
                this.draw();
            });
            const target = canvasElement.parentElement || canvasElement;
            if (target) {
                this.resizeObserver.observe(target);
            }
        }

        if (!this.windowResizeListenerAttached && typeof this.windowReference.addEventListener === "function") {
            this.windowReference.addEventListener("resize", this.boundWindowResizeHandler);
            this.windowResizeListenerAttached = true;
        }

        this.resizeCanvasBackingStore();
        this.draw();
    }

    ensureSize() {
        this.resizeCanvasBackingStore();
        this.draw();
    }

    setLabels(labelEntries) {
        const normalized = Array.isArray(labelEntries) ? labelEntries : [];
        this.segmentLabels = normalized
            .map((entry) => {
                if (typeof entry === "string") {
                    return { label: entry, emoji: "" };
                }
                const label = String(entry?.label || "");
                const emoji = String(entry?.emoji || "");
                return { label, emoji };
            })
            .filter((entry) => Boolean(entry.label));
        this.lastTickedSegmentIndex = null;
        this.layout = null;
    }

    registerSpinCallbacks(callbacks) {
        this.onTickSegmentBoundary = typeof callbacks?.onTick === "function" ? callbacks.onTick : null;
        this.onSpinComplete = typeof callbacks?.onStop === "function" ? callbacks.onStop : null;
    }

    setSpinDuration(durationMs) {
        if (typeof durationMs === "number" && durationMs > 0) {
            this.spinDurationMs = durationMs;
        }
    }

    setRevolutions(revolutionsCount) {
        if (typeof revolutionsCount === "number" && revolutionsCount >= 1) {
            this.revolutions = revolutionsCount;
        }
    }

    scrambleStartAngle() {
        this.currentAngleRadians = Math.random() * Math.PI * 2;
        this.draw();
    }

    resetForNewSpin({ randomizeStart = true } = {}) {
        this.cancelScheduledAnimation();
        this.isSpinning = false;
        if (randomizeStart) {
            this.scrambleStartAngle();
        }
        this.lastTickedSegmentIndex = null;
        if (!randomizeStart) {
            this.draw();
        }
    }

    draw() {
        const ctx = this.drawingContext;
        if (!ctx) {
            return;
        }

        const side = this.cssSideLengthPixels || 1;
        ctx.clearRect(0, 0, side, side);

        const labels = this.segmentLabels;
        if (!labels.length) {
            const { cx, cy, R } = this.ensureLayout();
            ctx.beginPath();
            ctx.arc(cx, cy, R, 0, Math.PI * 2);
            ctx.fillStyle = "#f5f5f5";
            ctx.fill();
            ctx.lineWidth = 6;
            ctx.strokeStyle = "#000";
            ctx.stroke();
            drawPointer(ctx, cx, cy, R, this.pointerTapActive);
            return;
        }

        const {
            cx,
            cy,
            R,
            N,
            segAngle,
            textBandRadius,
            chordWidth,
            fontPx,
            lineHeight,
            emojiPx,
            emojiRadius
        } = this.ensureLayout();

        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = "#fefefe";
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#000";
        ctx.stroke();

        for (let index = 0; index < N; index += 1) {
            const startAngle = this.currentAngleRadians + index * segAngle;
            const endAngle = startAngle + segAngle;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, R, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = segmentPalette[index % segmentPalette.length];
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#000";
            ctx.stroke();

            const midAngle = startAngle + segAngle / 2;
            const { label, emoji } = labels[index];
            const wrappedLines = wrapLabel(ctx, label, chordWidth, fontPx);

            ctx.save();
            ctx.translate(
                cx + Math.cos(midAngle) * textBandRadius,
                cy + Math.sin(midAngle) * textBandRadius
            );
            ctx.rotate(midAngle + Math.PI / 2);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `${fontPx}px "Fredoka One", sans-serif`;
            ctx.lineWidth = 3;
            ctx.strokeStyle = "#fff";
            ctx.fillStyle = "#111";
            for (let lineIndex = 0; lineIndex < wrappedLines.length; lineIndex += 1) {
                const y = (lineIndex - (wrappedLines.length - 1) / 2) * lineHeight;
                ctx.strokeText(wrappedLines[lineIndex], 0, y);
                ctx.fillText(wrappedLines[lineIndex], 0, y);
            }
            ctx.restore();

            if (emoji) {
                ctx.save();
                ctx.translate(
                    cx + Math.cos(midAngle) * emojiRadius,
                    cy + Math.sin(midAngle) * emojiRadius
                );
                ctx.rotate(midAngle + Math.PI / 2);
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.font = `${emojiPx}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
                ctx.fillText(emoji, 0, 0);
                ctx.restore();
            }
        }

        ctx.beginPath();
        ctx.arc(cx, cy, R * 0.08, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#000";
        ctx.stroke();

        drawPointer(ctx, cx, cy, R, this.pointerTapActive);
    }

    ensureLayout() {
        if (this.layout) {
            return this.layout;
        }

        if (!this.drawingContext) {
            throw new Error("Wheel has not been initialized with a drawing context");
        }

        const side = this.cssSideLengthPixels || 1;
        const cx = side / 2;
        const cy = side / 2;
        const radius = side * 0.45;

        const items = this.segmentLabels;
        const segmentCount = Math.max(1, items.length || 1);
        const segmentAngle = (2 * Math.PI) / segmentCount;

        const textBandRadius = radius * 0.70;
        const chordWidth = 2 * textBandRadius * Math.sin(segmentAngle / 2) * 0.88;

        const fontPx = computeFontPx(this.drawingContext, items, chordWidth, 56, 18);
        const lineHeight = fontPx * 1.18;
        const emojiPx = Math.round(fontPx * 1.9);
        const emojiRadius = radius * 0.40;

        this.layout = {
            cx,
            cy,
            R: radius,
            N: segmentCount,
            segAngle: segmentAngle,
            textBandRadius,
            chordWidth,
            fontPx,
            lineHeight,
            emojiPx,
            emojiRadius
        };

        return this.layout;
    }

    getCurrentPointerSegmentIndex() {
        if (!this.segmentLabels.length) {
            return null;
        }
        const { N, segAngle } = this.ensureLayout();
        const pointerAngle = -Math.PI / 2;
        let indexEstimate = (pointerAngle - this.currentAngleRadians) / segAngle - 0.5;
        let normalizedIndex = Math.round(indexEstimate);
        normalizedIndex = ((normalizedIndex % N) + N) % N;
        return normalizedIndex;
    }

    spinToIndex(requestedIndex) {
        if (this.isSpinning || !this.segmentLabels.length) {
            return;
        }

        const { N, segAngle } = this.ensureLayout();
        const chosenIndex = typeof requestedIndex === "number" && requestedIndex >= 0
            ? requestedIndex % N
            : Math.floor(Math.random() * N);
        const pointerAngle = -Math.PI / 2;
        const destinationAngle = pointerAngle - chosenIndex * segAngle - segAngle / 2;

        this.cancelScheduledAnimation();
        this.spinStartAngleRadians = this.currentAngleRadians;
        this.spinTargetAngleRadians = destinationAngle + Math.PI * 2 * this.revolutions;
        this.spinStartTimestampMs = this.getCurrentTime();
        this.isSpinning = true;
        this.lastTickedSegmentIndex = this.getCurrentPointerSegmentIndex();
        this.animationFrameRequestId = this.requestAnimationFrame(this.boundAnimationStep);
    }

    forceStop() {
        this.cancelScheduledAnimation();
        this.isSpinning = false;
        const index = this.getCurrentPointerSegmentIndex();
        if (typeof this.onSpinComplete === "function") {
            this.onSpinComplete(index);
        }
        this.draw();
    }

    triggerPointerTap() {
        this.pointerTapActive = true;
        this.draw();
        if (this.pointerTapTimerId !== null) {
            this.clearTimeout(this.pointerTapTimerId);
        }
        this.pointerTapTimerId = this.setTimeout(() => {
            this.pointerTapActive = false;
            this.pointerTapTimerId = null;
            this.draw();
        }, this.pointerTapDurationMs);
    }

    handleWindowResize() {
        if (this.resizeTimerId !== null) {
            this.clearTimeout(this.resizeTimerId);
        }
        this.resizeTimerId = this.setTimeout(() => {
            this.resizeCanvasBackingStore();
            this.draw();
        }, RESIZE_DEBOUNCE_DELAY_MS);
    }

    resizeCanvasBackingStore() {
        if (!this.canvasElement || !this.drawingContext) {
            return;
        }
        const element = this.canvasElement.parentElement || this.canvasElement;
        const cssSideLength = computeCssSquareSide(element, this.windowReference);
        this.cssSideLengthPixels = cssSideLength;
        const pixelRatio = Math.max(1, Math.floor(this.windowReference.devicePixelRatio || 1));
        this.canvasElement.style.width = `${cssSideLength}px`;
        this.canvasElement.style.height = `${cssSideLength}px`;
        this.canvasElement.width = Math.round(cssSideLength * pixelRatio);
        this.canvasElement.height = Math.round(cssSideLength * pixelRatio);
        this.drawingContext.setTransform(1, 0, 0, 1, 0, 0);
        this.drawingContext.scale(pixelRatio, pixelRatio);
        this.layout = null;
    }

    cancelScheduledAnimation() {
        if (this.animationFrameRequestId !== null) {
            this.cancelAnimationFrame(this.animationFrameRequestId);
            this.animationFrameRequestId = null;
        }
    }

    handleAnimationStep() {
        if (!this.isSpinning) {
            return;
        }
        const elapsed = this.getCurrentTime() - this.spinStartTimestampMs;
        const progress = Math.min(elapsed / this.spinDurationMs, 1);
        const eased = easeOutCubic(progress);

        this.currentAngleRadians = this.spinStartAngleRadians
            + eased * (this.spinTargetAngleRadians - this.spinStartAngleRadians);

        const currentIndex = this.getCurrentPointerSegmentIndex();
        if (currentIndex !== null && currentIndex !== this.lastTickedSegmentIndex) {
            this.lastTickedSegmentIndex = currentIndex;
            if (typeof this.onTickSegmentBoundary === "function") {
                this.onTickSegmentBoundary(currentIndex);
            }
        }

        this.draw();

        if (progress >= 1) {
            this.isSpinning = false;
            this.animationFrameRequestId = null;
            const winner = this.getCurrentPointerSegmentIndex();
            if (typeof this.onSpinComplete === "function") {
                this.onSpinComplete(winner);
            }
            return;
        }

        this.animationFrameRequestId = this.requestAnimationFrame(this.boundAnimationStep);
    }

    getCurrentTime() {
        const performanceLike = this.windowReference.performance
            || (typeof performance !== "undefined" ? performance : null);
        if (performanceLike && typeof performanceLike.now === "function") {
            return performanceLike.now();
        }
        return Date.now();
    }
}
