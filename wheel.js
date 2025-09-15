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

    pointerTapActive: false,
    pointerTapDurationMs: 70
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

export function setWheelLabels(arr) {
    wheelState.segmentLabels = Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
    wheelState.lastTickedSegmentIndex = null;
}
export function registerSpinCallbacks(cbs) {
    wheelState.onTickSegmentBoundary = cbs?.onTick || null;
    wheelState.onSpinComplete = cbs?.onStop || null;
}
export function setSpinDurationMs(ms) { if (ms>0) wheelState.spinDurationMs=ms; }

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
    for (let size = maxFontPx; size >= minFontPx; size--) {
        let fits = true;
        for (const l of labels) {
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

/* ---- draw wheel ---- */
export function drawWheel() {
    const ctx = wheelState.drawingContext;
    if (!ctx) return;
    const side = wheelState.cssSideLengthPixels||1;
    const cx=side/2, cy=side/2, R=side*0.45;
    ctx.clearRect(0,0,side,side);

    // Base
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fillStyle="#f5f5f5"; ctx.fill(); ctx.lineWidth=6; ctx.strokeStyle="#000"; ctx.stroke();

    const labels = wheelState.segmentLabels; if (!labels.length) return;
    const N = labels.length, segA = 2*Math.PI/N;
    const textBandR = R*0.65;
    const chordW = 2*textBandR*Math.sin(segA/2)*0.8;

    const fontPx = computeFontPx(ctx, labels, chordW, 32, 16);
    const lineH = fontPx*1.2;

    for (let i=0;i<N;i++) {
        const a0=wheelState.currentAngleRadians+i*segA, a1=a0+segA;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,a0,a1); ctx.closePath();
        ctx.fillStyle=segmentPalette[i%segmentPalette.length]; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.stroke();

        const mid=a0+segA/2;
        const label=labels[i];
        const lines=wrapLabel(ctx,label,chordW,fontPx);
        ctx.save();
        ctx.translate(cx+Math.cos(mid)*textBandR, cy+Math.sin(mid)*textBandR);
        ctx.rotate(mid+Math.PI/2); // keep upright horizontally
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.font=`${fontPx}px "Fredoka One", sans-serif`;
        ctx.lineWidth=3; ctx.strokeStyle="#fff"; ctx.fillStyle="#111";
        for (let j=0;j<lines.length;j++){
            const y=(j-(lines.length-1)/2)*lineH;
            ctx.strokeText(lines[j],0,y);
            ctx.fillText(lines[j],0,y);
        }
        ctx.restore();
    }

    // center hub
    ctx.beginPath(); ctx.arc(cx,cy,R*0.08,0,Math.PI*2); ctx.fillStyle="#fff"; ctx.fill(); ctx.lineWidth=2; ctx.strokeStyle="#000"; ctx.stroke();

    // pointer
    const tipX=cx, tipY=cy-R-8;
    ctx.beginPath(); ctx.moveTo(tipX,tipY); ctx.lineTo(tipX-20,tipY-40); ctx.lineTo(tipX+20,tipY-40); ctx.closePath(); ctx.fillStyle="#000"; ctx.fill();
}

/* ---- spin engine ---- */
function easeOutCubic(t){t=Math.min(Math.max(t,0),1);return 1-Math.pow(1-t,3);}

/**
 * Compute which segment is under the fixed pointer (triangle at -PI/2).
 * We invert the geometry so the segment whose MID aligns to the pointer returns its index.
 */
function getCurrentPointerSegmentIndex(){
    const L=wheelState.segmentLabels; if(!L.length) return null;
    const N=L.length, segA=2*Math.PI/N, pa=-Math.PI/2;
    // Current angle is the start angle of segment 0. Map to index whose mid hits the pointer.
    let x = (pa - wheelState.currentAngleRadians) / segA - 0.5; // number of segments from 0's mid to pointer
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
    const N=L.length, idx=(typeof reqIdx==="number"&&reqIdx>=0)?reqIdx%N:Math.floor(Math.random()*N);
    const segA=2*Math.PI/N, pa=-Math.PI/2;

    // We want the MID of segment `idx` to align to the fixed pointer at angle `pa`.
    // Since `currentAngleRadians` represents the START angle of segment 0,
    // set destination so that: current + idx*segA + segA/2 === pa (mod 2π)
    const dest = pa - idx*segA - segA/2;

    wheelState.spinStartAngleRadians=wheelState.currentAngleRadians;
    wheelState.spinTargetAngleRadians=dest+Math.PI*2*4; // add revolutions
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
