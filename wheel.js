/* File: wheel.js */
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
    spinDurationMs: 30000, // default ~30s (app can override)
    revolutions: 4,        // default turns (app can override)

    cssSideLengthPixels: 0,
    resizeObserver: null,

    lastTickedSegmentIndex: null,
    onTickSegmentBoundary: null,
    onSpinComplete: null,

    pointerTapActive: false,
    pointerTapDurationMs: 70,

    // Cached layout (recomputed only when labels or size change)
    layout: null
};

const segmentPalette = [
    "#FF6B6B","#FFD166","#06D6A0","#4D96FF","#C77DFF","#FF9F1C",
    "#2EC4B6","#EF476F","#70C1B3","#9B5DE5","#F15BB5","#00BBF9"
];

function computeCssSquareSide(wrapperElement) {
    const rect = wrapperElement.getBoundingClientRect();
    let w = rect.width || wrapperElement.offsetWidth || window.innerWidth * 0.9;
    let h = rect.height || wrapperElement.offsetHeight || w;
    return Math.max(1, Math.min(w, h));
}

function resizeCanvasBackingStore() {
    if (!wheelState.canvasElement) return;
    const cssSide = computeCssSquareSide(wheelState.canvasElement.parentElement || wheelState.canvasElement);
    wheelState.cssSideLengthPixels = cssSide;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    wheelState.canvasElement.style.width = `${cssSide}px`;
    wheelState.canvasElement.style.height = `${cssSide}px`;
    wheelState.canvasElement.width = Math.round(cssSide * dpr);
    wheelState.canvasElement.height = Math.round(cssSide * dpr);
    const ctx = wheelState.drawingContext;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    // Invalidate cached layout when size changes
    wheelState.layout = null;
}

let resizeTimer;
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resizeCanvasBackingStore(); drawWheel(); }, 120);
});

export function ensureWheelSize() { resizeCanvasBackingStore(); drawWheel(); }
export function initWheel(c) {
    wheelState.canvasElement = c;
    wheelState.drawingContext = c.getContext("2d");
    if ("ResizeObserver" in window) {
        wheelState.resizeObserver = new ResizeObserver(() => { resizeCanvasBackingStore(); drawWheel(); });
        wheelState.resizeObserver.observe(c.parentElement || c);
    }
    resizeCanvasBackingStore();
    drawWheel();
}

/**
 * Accepts an array of either strings or objects {label, emoji}
 */
export function setWheelLabels(arr) {
    const norm = Array.isArray(arr) ? arr : [];
    wheelState.segmentLabels = norm
        .map(item => {
            if (typeof item === "string") return { label: item, emoji: "" };
            const label = String(item?.label || "");
            const emoji = String(item?.emoji || "");
            return { label, emoji };
        })
        .filter(obj => obj.label);
    wheelState.lastTickedSegmentIndex = null;
    // Invalidate cached layout when labels change
    wheelState.layout = null;
}
export function registerSpinCallbacks(cbs) {
    wheelState.onTickSegmentBoundary = cbs?.onTick || null;
    wheelState.onSpinComplete = cbs?.onStop || null;
}
export function setSpinDurationMs(ms) { if (ms>0) wheelState.spinDurationMs=ms; }
export function setRevolutions(n) { if (typeof n==="number" && n>=1) wheelState.revolutions = n; }

/* Convenience helpers for “fresh” spins */
export function scrambleStartAngle() {
    wheelState.currentAngleRadians = Math.random() * Math.PI * 2;
    drawWheel();
}
export function resetForNewSpin({ randomizeStart = true } = {}) {
    wheelState.isSpinning = false;
    if (randomizeStart) scrambleStartAngle();
    wheelState.lastTickedSegmentIndex = null;
    drawWheel();
}

/* ---- text wrapping helpers ---- */
function wrapLabel(ctx, text, maxWidth, fontPx) {
    ctx.font = `${fontPx}px "Fredoka One", sans-serif`;
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width <= maxWidth) {
            line = test;
        } else {
            if (line) lines.push(line);
            line = word;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function computeFontPx(ctx, labels, maxWidth, maxFontPx, minFontPx) {
    const onlyText = labels.map(l => (typeof l === "string" ? l : (l?.label || "")));
    for (let size = maxFontPx; size >= minFontPx; size--) {
        let fits = true;
        for (const l of onlyText) {
            const lines = wrapLabel(ctx, l, maxWidth, size);
            for (const ln of lines) {
                if (ctx.measureText(ln).width > maxWidth) { fits = false; break; }
            }
            if (!fits) break;
        }
        if (fits) return size;
    }
    return minFontPx;
}

/* ---- compute and cache layout (font sizes, radii) ---- */
function ensureLayout() {
    if (wheelState.layout) return wheelState.layout;

    const ctx = wheelState.drawingContext;
    const side = wheelState.cssSideLengthPixels || 1;
    const cx = side/2, cy = side/2, R = side*0.45;

    const items = wheelState.segmentLabels;
    const N = Math.max(1, items.length || 1);
    const segAngle = 2 * Math.PI / N;

    // Bands and widths
    const textBandRadius = R * 0.70; // slightly further out to allow bigger text
    const chordWidth = 2 * textBandRadius * Math.sin(segAngle/2) * 0.88; // allow more width

    // Make labels BIGGER: raise max font bound
    const fontPx = computeFontPx(ctx, items, chordWidth, /*max*/ 56, /*min*/ 18);
    const lineHeight = fontPx * 1.18;

    // Emoji near center, sized relative to text
    const emojiPx = Math.round(fontPx * 1.9);
    const emojiRadius = R * 0.40;

    wheelState.layout = {
        cx, cy, R,
        N, segAngle,
        textBandRadius, chordWidth,
        fontPx, lineHeight,
        emojiPx, emojiRadius
    };
    return wheelState.layout;
}

/* ---- draw wheel ---- */
export function drawWheel() {
    const ctx = wheelState.drawingContext;
    if (!ctx) return;
    const side = wheelState.cssSideLengthPixels||1;
    ctx.clearRect(0,0,side,side);

    const L = wheelState.segmentLabels;
    if (!L.length) {
        // draw base circle anyway
        const { cx, cy, R } = ensureLayout();
        ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
        ctx.fillStyle="#f5f5f5"; ctx.fill(); ctx.lineWidth=6; ctx.strokeStyle="#000"; ctx.stroke();
        drawPointer(ctx, cx, cy, R);
        return;
    }

    const {
        cx, cy, R,
        N, segAngle,
        textBandRadius, chordWidth,
        fontPx, lineHeight,
        emojiPx, emojiRadius
    } = ensureLayout();

    // Base ring
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fillStyle="#fefefe"; ctx.fill(); ctx.lineWidth=6; ctx.strokeStyle="#000"; ctx.stroke();

    for (let i=0;i<N;i++) {
        const a0=wheelState.currentAngleRadians+i*segAngle, a1=a0+segAngle;
        // segment fill
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,a0,a1); ctx.closePath();
        ctx.fillStyle=segmentPalette[i%segmentPalette.length]; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.stroke();

        const mid=a0+segAngle/2;
        const { label, emoji } = L[i];
        const lines=wrapLabel(ctx,label,chordWidth,fontPx);

        // Text (upright towards center)
        ctx.save();
        ctx.translate(cx+Math.cos(mid)*textBandRadius, cy+Math.sin(mid)*textBandRadius);
        ctx.rotate(mid+Math.PI/2);
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.font=`${fontPx}px "Fredoka One", sans-serif`;
        ctx.lineWidth=3; ctx.strokeStyle="#fff"; ctx.fillStyle="#111";
        for (let j=0;j<lines.length;j++){
            const y=(j-(lines.length-1)/2)*lineHeight;
            ctx.strokeText(lines[j],0,y);
            ctx.fillText(lines[j],0,y);
        }
        ctx.restore();

        // Emoji nearer to center
        if (emoji) {
            ctx.save();
            ctx.translate(cx+Math.cos(mid)*emojiRadius, cy+Math.sin(mid)*emojiRadius);
            ctx.rotate(mid+Math.PI/2);
            ctx.textAlign="center"; ctx.textBaseline="middle";
            ctx.font=`${emojiPx}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
            ctx.fillText(emoji, 0, 0);
            ctx.restore();
        }
    }

    // center hub
    ctx.beginPath(); ctx.arc(cx,cy,R*0.08,0,Math.PI*2); ctx.fillStyle="#fff"; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.stroke();

    drawPointer(ctx, cx, cy, R);
}

function drawPointer(ctx, cx, cy, R) {
    const tipX=cx, tipY=cy-R-8;
    ctx.beginPath();
    ctx.moveTo(tipX,tipY);
    ctx.lineTo(tipX-20,tipY-40);
    ctx.lineTo(tipX+20,tipY-40);
    ctx.closePath();
    ctx.fillStyle="#000";
    ctx.fill();
}

/* ---- spin engine ---- */
function easeOutCubic(t){t=Math.min(Math.max(t,0),1);return 1-Math.pow(1-t,3);}

/**
 * Compute which segment is under the fixed pointer (triangle at -PI/2).
 * We invert the geometry so the segment whose MID aligns to the pointer returns its index.
 */
function getCurrentPointerSegmentIndex(){
    const L=wheelState.segmentLabels; if(!L.length) return null;
    const { N, segAngle } = ensureLayout();
    const pa=-Math.PI/2;
    // Current angle is the start angle of segment 0. Map to index whose mid hits the pointer.
    let x = (pa - wheelState.currentAngleRadians) / segAngle - 0.5; // segments from 0's mid to pointer
    let idx = Math.round(x);
    // normalize to [0, N)
    idx = ((idx % N) + N) % N;
    return idx;
}

function step(){
    if(!wheelState.isSpinning)return;
    const t=Math.min((performance.now()-wheelState.spinStartTimestampMs)/wheelState.spinDurationMs,1);
    const eased=easeOutCubic(t);
    wheelState.currentAngleRadians=wheelState.spinStartAngleRadians+eased*(wheelState.spinTargetAngleRadians-wheelState.spinStartAngleRadians);
    const idx=getCurrentPointerSegmentIndex();
    if(idx!==null&&idx!==wheelState.lastTickedSegmentIndex){
        wheelState.lastTickedSegmentIndex=idx;
        wheelState.onTickSegmentBoundary?.(idx);
    }
    drawWheel();
    if(t>=1){wheelState.isSpinning=false;const win=getCurrentPointerSegmentIndex();wheelState.onSpinComplete?.(win);return;}
    requestAnimationFrame(step);
}

export function spinToIndex(reqIdx){
    const L=wheelState.segmentLabels; if(!L.length||wheelState.isSpinning) return;
    const { N, segAngle } = ensureLayout();
    const idx=(typeof reqIdx==="number"&&reqIdx>=0)?reqIdx%N:Math.floor(Math.random()*N);
    const pa=-Math.PI/2;

    // We want the MID of segment `idx` to align to the fixed pointer at angle `pa`.
    // Since `currentAngleRadians` represents the START angle of segment 0,
    // set destination so that: current + idx*segA + segA/2 === pa (mod 2π)
    const dest = pa - idx*segAngle - segAngle/2;

    wheelState.spinStartAngleRadians=wheelState.currentAngleRadians;
    wheelState.spinTargetAngleRadians=dest+Math.PI*2*wheelState.revolutions; // add revolutions
    wheelState.spinStartTimestampMs=performance.now();
    wheelState.isSpinning=true;
    wheelState.lastTickedSegmentIndex=getCurrentPointerSegmentIndex();
    requestAnimationFrame(step);
}

export function forceStopSpin(){
    wheelState.isSpinning=false;
    const idx=getCurrentPointerSegmentIndex();
    wheelState.onSpinComplete?.(idx);
}
export function triggerPointerTap(){
    wheelState.pointerTapActive=true;
    setTimeout(()=>{wheelState.pointerTapActive=false;drawWheel();},wheelState.pointerTapDurationMs);
    drawWheel();
}
