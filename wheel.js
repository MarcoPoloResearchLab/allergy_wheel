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

function wrapLabel(drawingContext, text, maxWidth, fontPx) {
    drawingContext.font = `${fontPx}px "Fredoka One", sans-serif`;
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word;
        if (drawingContext.measureText(candidate).width <= maxWidth) {
            line = candidate;
        } else {
            if (line) lines.push(line);
            line = word;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function computeFontPx(drawingContext, labels, maxWidth, maxFontPx, minFontPx) {
    const textOnly = labels.map((entry) => (typeof entry === "string" ? entry : (entry?.label || "")));
    for (let size = maxFontPx; size >= minFontPx; size -= 1) {
        let fits = true;
        for (const label of textOnly) {
            const lines = wrapLabel(drawingContext, label, maxWidth, size);
            for (const line of lines) {
                if (drawingContext.measureText(line).width > maxWidth) {
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
            : (callback, delayMs) => setTimeout(callback, delayMs);
        this.clearTimeout = typeof fallbackGlobal.clearTimeout === "function"
            ? fallbackGlobal.clearTimeout.bind(fallbackGlobal)
            : (timerId) => clearTimeout(timerId);
        this.requestAnimationFrame = typeof fallbackGlobal.requestAnimationFrame === "function"
            ? fallbackGlobal.requestAnimationFrame.bind(fallbackGlobal)
            : (callback) => this.setTimeout(() => callback(this.getCurrentTime()), 16);
        this.cancelAnimationFrame = typeof fallbackGlobal.cancelAnimationFrame === "function"
            ? fallbackGlobal.cancelAnimationFrame.bind(fallbackGlobal)
            : (timerId) => this.clearTimeout(timerId);
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
        const drawingContext = this.drawingContext;
        if (!drawingContext) {
            return;
        }

        this._clearCanvas(drawingContext);

        const layout = this.ensureLayout();
        if (!this.segmentLabels.length) {
            this._renderEmptyWheel(drawingContext, layout);
            return;
        }

        this._renderWheelBase(drawingContext, layout);
        this._renderWheelSegments(drawingContext, layout);
        this._renderWheelCenterCap(drawingContext, layout);
        this._renderPointerIndicator(drawingContext, layout);
    }

    _clearCanvas(drawingContext) {
        const canvasSideLength = this.cssSideLengthPixels || 1;
        drawingContext.clearRect(0, 0, canvasSideLength, canvasSideLength);
    }

    _renderEmptyWheel(drawingContext, layout) {
        this._renderWheelBase(drawingContext, layout, "#f5f5f5");
        this._renderPointerIndicator(drawingContext, layout);
    }

    _renderWheelBase(drawingContext, layout, fillColor = "#fefefe") {
        this._renderCircle(drawingContext, layout.centerX, layout.centerY, layout.radius, fillColor, "#000", 6);
    }

    _renderWheelCenterCap(drawingContext, layout) {
        this._renderCircle(drawingContext, layout.centerX, layout.centerY, layout.radius * 0.08, "#fff", "#000", 2);
    }

    _renderCircle(drawingContext, centerX, centerY, radius, fillStyle, strokeStyle, lineWidth) {
        drawingContext.beginPath();
        drawingContext.arc(centerX, centerY, radius, 0, Math.PI * 2);
        drawingContext.fillStyle = fillStyle;
        drawingContext.fill();
        drawingContext.lineWidth = lineWidth;
        drawingContext.strokeStyle = strokeStyle;
        drawingContext.stroke();
    }

    _renderWheelSegments(drawingContext, layout) {
        for (let segmentIndex = 0; segmentIndex < layout.segmentCount; segmentIndex += 1) {
            this._renderWheelSegment(drawingContext, layout, segmentIndex);
        }
    }

    _renderWheelSegment(drawingContext, layout, segmentIndex) {
        const segmentStartAngle = this.currentAngleRadians + segmentIndex * layout.segmentAngle;
        const segmentEndAngle = segmentStartAngle + layout.segmentAngle;
        const segmentFillColor = segmentPalette[segmentIndex % segmentPalette.length];

        drawingContext.beginPath();
        drawingContext.moveTo(layout.centerX, layout.centerY);
        drawingContext.arc(layout.centerX, layout.centerY, layout.radius, segmentStartAngle, segmentEndAngle);
        drawingContext.closePath();
        drawingContext.fillStyle = segmentFillColor;
        drawingContext.fill();
        drawingContext.lineWidth = 2;
        drawingContext.strokeStyle = "#000";
        drawingContext.stroke();

        const segmentMidAngle = segmentStartAngle + layout.segmentAngle / 2;
        const segmentDescriptor = this.segmentLabels[segmentIndex];
        this._renderSegmentLabel(drawingContext, layout, segmentDescriptor, segmentMidAngle);
        this._renderSegmentEmoji(drawingContext, layout, segmentDescriptor, segmentMidAngle);
    }

    _renderSegmentLabel(drawingContext, layout, segmentDescriptor, segmentMidAngle) {
        if (!segmentDescriptor?.label) {
            return;
        }

        const wrappedLines = wrapLabel(drawingContext, segmentDescriptor.label, layout.chordWidth, layout.fontPx);

        drawingContext.save();
        drawingContext.translate(
            layout.centerX + Math.cos(segmentMidAngle) * layout.textBandRadius,
            layout.centerY + Math.sin(segmentMidAngle) * layout.textBandRadius
        );
        drawingContext.rotate(segmentMidAngle + Math.PI / 2);
        drawingContext.textAlign = "center";
        drawingContext.textBaseline = "middle";
        drawingContext.font = `${layout.fontPx}px "Fredoka One", sans-serif`;
        drawingContext.lineWidth = 3;
        drawingContext.strokeStyle = "#fff";
        drawingContext.fillStyle = "#111";

        for (let lineIndex = 0; lineIndex < wrappedLines.length; lineIndex += 1) {
            const verticalOffset = (lineIndex - (wrappedLines.length - 1) / 2) * layout.lineHeight;
            drawingContext.strokeText(wrappedLines[lineIndex], 0, verticalOffset);
            drawingContext.fillText(wrappedLines[lineIndex], 0, verticalOffset);
        }

        drawingContext.restore();
    }

    _renderSegmentEmoji(drawingContext, layout, segmentDescriptor, segmentMidAngle) {
        if (!segmentDescriptor?.emoji) {
            return;
        }

        drawingContext.save();
        drawingContext.translate(
            layout.centerX + Math.cos(segmentMidAngle) * layout.emojiRadius,
            layout.centerY + Math.sin(segmentMidAngle) * layout.emojiRadius
        );
        drawingContext.rotate(segmentMidAngle + Math.PI / 2);
        drawingContext.textAlign = "center";
        drawingContext.textBaseline = "middle";
        drawingContext.font = `${layout.emojiPx}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        drawingContext.fillText(segmentDescriptor.emoji, 0, 0);
        drawingContext.restore();
    }

    _renderPointerIndicator(drawingContext, layout) {
        const pointerColor = this.pointerTapActive ? PointerColor.ACTIVE : PointerColor.DEFAULT;
        const pointerTipX = layout.centerX;
        const pointerTipY = layout.centerY - layout.radius - 8;

        drawingContext.beginPath();
        drawingContext.moveTo(pointerTipX, pointerTipY);
        drawingContext.lineTo(pointerTipX - 20, pointerTipY - 40);
        drawingContext.lineTo(pointerTipX + 20, pointerTipY - 40);
        drawingContext.closePath();
        drawingContext.fillStyle = pointerColor;
        drawingContext.fill();
    }

    ensureLayout() {
        if (this.layout) {
            return this.layout;
        }

        if (!this.drawingContext) {
            throw new Error("Wheel has not been initialized with a drawing context");
        }

        const canvasSideLength = this.cssSideLengthPixels || 1;
        const centerX = canvasSideLength / 2;
        const centerY = canvasSideLength / 2;
        const radius = canvasSideLength * 0.45;

        const segmentDescriptors = this.segmentLabels;
        const segmentCount = Math.max(1, segmentDescriptors.length || 1);
        const segmentAngle = (2 * Math.PI) / segmentCount;

        const textBandRadius = radius * 0.70;
        const chordWidth = 2 * textBandRadius * Math.sin(segmentAngle / 2) * 0.88;

        const fontPx = computeFontPx(this.drawingContext, segmentDescriptors, chordWidth, 56, 18);
        const lineHeight = fontPx * 1.18;
        const emojiPx = Math.round(fontPx * 1.9);
        const emojiRadius = radius * 0.40;

        this.layout = {
            centerX,
            centerY,
            radius,
            segmentCount,
            segmentAngle,
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
        const { segmentCount, segmentAngle } = this.ensureLayout();
        const pointerAngle = -Math.PI / 2;
        let indexEstimate = (pointerAngle - this.currentAngleRadians) / segmentAngle - 0.5;
        let normalizedIndex = Math.round(indexEstimate);
        normalizedIndex = ((normalizedIndex % segmentCount) + segmentCount) % segmentCount;
        return normalizedIndex;
    }

    spin(requestedIndex) {
        if (this.isSpinning || !this.segmentLabels.length) {
            return;
        }

        const { segmentCount, segmentAngle } = this.ensureLayout();
        const chosenIndex = typeof requestedIndex === "number" && requestedIndex >= 0
            ? requestedIndex % segmentCount
            : Math.floor(Math.random() * segmentCount);
        const pointerAngle = -Math.PI / 2;
        const destinationAngle = pointerAngle - chosenIndex * segmentAngle - segmentAngle / 2;

        this._beginSpinAnimation(destinationAngle);
    }

    _beginSpinAnimation(destinationAngle) {
        this.cancelScheduledAnimation();
        this.spinStartAngleRadians = this.currentAngleRadians;
        this.spinTargetAngleRadians = destinationAngle + Math.PI * 2 * this.revolutions;
        this.spinStartTimestampMs = this.getCurrentTime();
        this.isSpinning = true;
        this.lastTickedSegmentIndex = this.getCurrentPointerSegmentIndex();
        this._scheduleNextAnimationFrame();
    }

    stop() {
        if (!this.isSpinning) {
            return;
        }

        this.cancelScheduledAnimation();
        this._finalizeSpin();
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

        const spinProgress = this._calculateSpinProgress();
        this._updateCurrentAngleFromProgress(spinProgress);
        this._emitSegmentBoundaryIfNeeded();

        this.draw();

        if (this._hasSpinCompleted(spinProgress)) {
            this._finalizeSpin();
            return;
        }

        this._scheduleNextAnimationFrame();
    }

    _calculateSpinProgress() {
        const elapsed = this.getCurrentTime() - this.spinStartTimestampMs;
        return Math.min(elapsed / this.spinDurationMs, 1);
    }

    _updateCurrentAngleFromProgress(progress) {
        const easedProgress = easeOutCubic(progress);
        this.currentAngleRadians = this.spinStartAngleRadians
            + easedProgress * (this.spinTargetAngleRadians - this.spinStartAngleRadians);
    }

    _emitSegmentBoundaryIfNeeded() {
        const currentIndex = this.getCurrentPointerSegmentIndex();
        if (currentIndex !== null && currentIndex !== this.lastTickedSegmentIndex) {
            this.lastTickedSegmentIndex = currentIndex;
            if (typeof this.onTickSegmentBoundary === "function") {
                this.onTickSegmentBoundary(currentIndex);
            }
        }
    }

    _hasSpinCompleted(progress) {
        return progress >= 1;
    }

    _finalizeSpin() {
        this.isSpinning = false;
        this.animationFrameRequestId = null;
        const winningIndex = this.getCurrentPointerSegmentIndex();
        if (winningIndex !== null) {
            this.lastTickedSegmentIndex = winningIndex;
        }
        if (typeof this.onSpinComplete === "function") {
            this.onSpinComplete(winningIndex);
        }
    }

    _scheduleNextAnimationFrame() {
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
