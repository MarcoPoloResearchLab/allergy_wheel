// audio.js — fully synthesized sounds (no external files)

let sharedAudioContext;

function ensureAudioContext() {
    if (!sharedAudioContext) {
        sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    try {
        sharedAudioContext.resume?.();
    } catch {}
    return sharedAudioContext;
}

function unlockAudioNow() {
    const context = ensureAudioContext();
    try {
        const osc = context.createOscillator();
        const gain = context.createGain();
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        osc.connect(gain).connect(context.destination);
        osc.start();
        osc.stop(context.currentTime + 0.01);
        context.resume?.();
    } catch {}
}

/* ---------- small helper envelopes ---------- */
function expTo(ctx, param, value, t, min = 0.0001) {
    const safe = Math.max(Math.abs(value), min);
    param.exponentialRampToValueAtTime(safe, t);
}

function linearTo(ctx, param, value, t) {
    param.linearRampToValueAtTime(value, t);
}

/* ---------- simple tick ---------- */
export function playTick() {
    const context = ensureAudioContext();
    const oscillatorNode = context.createOscillator();
    const gainNode = context.createGain();
    oscillatorNode.type = "square";
    oscillatorNode.frequency.setValueAtTime(1200, context.currentTime);
    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    expTo(context, gainNode.gain, 0.25, context.currentTime + 0.005);
    expTo(context, gainNode.gain, 0.0001, context.currentTime + 0.06);
    oscillatorNode.connect(gainNode).connect(context.destination);
    oscillatorNode.start();
    oscillatorNode.stop(context.currentTime + 0.07);
}

/* ---------- siren ---------- */
export async function playSiren(durationMs = 1800) {
    const context = ensureAudioContext();
    const carrier = context.createOscillator();
    const mod = context.createOscillator();
    const deviation = context.createGain();
    const out = context.createGain();

    carrier.type = "sine";
    mod.type = "sine";
    deviation.gain.value = 40;
    mod.frequency.setValueAtTime(4.2, context.currentTime);
    carrier.frequency.setValueAtTime(700, context.currentTime);

    out.gain.setValueAtTime(0.0001, context.currentTime);
    expTo(context, out.gain, 0.8, context.currentTime + 0.08);

    mod.connect(deviation);
    deviation.connect(carrier.frequency);
    carrier.connect(out).connect(context.destination);
    carrier.start();
    mod.start();

    await new Promise(r => setTimeout(r, durationMs));
    const fadeEnd = context.currentTime + 0.12;
    expTo(context, out.gain, 0.0001, fadeEnd);
    carrier.stop(fadeEnd);
    mod.stop(fadeEnd);
}

/* ---------- synthesized "nom-nom" chew ---------- */
function scheduleChew(context, startTime) {
    const duration = 0.22;
    const endTime = startTime + duration;

    const osc = context.createOscillator();
    osc.type = "triangle";
    const bodyFilter = context.createBiquadFilter();
    bodyFilter.type = "bandpass";
    bodyFilter.frequency.setValueAtTime(950, startTime);
    bodyFilter.Q.setValueAtTime(1.2, startTime);

    const bodyGain = context.createGain();
    bodyGain.gain.setValueAtTime(0.0001, startTime);
    expTo(context, bodyGain.gain, 0.60, startTime + 0.015);
    expTo(context, bodyGain.gain, 0.0001, endTime);

    osc.frequency.setValueAtTime(240, startTime);
    linearTo(context, osc.frequency, 180, endTime);

    osc.connect(bodyFilter).connect(bodyGain).connect(context.destination);
    osc.start(startTime);
    osc.stop(endTime);

    const crunchDur = 0.08;
    const crunchStart = startTime + 0.02;
    const noiseBuf = context.createBuffer(1, Math.floor(context.sampleRate * crunchDur), context.sampleRate);
    const channel = noiseBuf.getChannelData(0);
    for (let index = 0; index < channel.length; index++) {
        channel[index] = (Math.random() * 2 - 1) * 0.7;
    }
    const noise = context.createBufferSource();
    noise.buffer = noiseBuf;

    const crunchFilter = context.createBiquadFilter();
    crunchFilter.type = "bandpass";
    crunchFilter.frequency.setValueAtTime(1700, crunchStart);
    crunchFilter.Q.setValueAtTime(2.0, crunchStart);

    const noiseGain = context.createGain();
    noiseGain.gain.setValueAtTime(0.0001, crunchStart);
    expTo(context, noiseGain.gain, 0.35, crunchStart + 0.01);
    expTo(context, noiseGain.gain, 0.0001, crunchStart + crunchDur);

    noise.connect(crunchFilter).connect(noiseGain).connect(context.destination);
    noise.start(crunchStart);
    noise.stop(crunchStart + crunchDur);
}

export function playNomNom(durationMs = 1200) {
    const context = ensureAudioContext();
    const t0 = context.currentTime;

    const total = Math.max(350, durationMs) / 1000;
    const gap = 0.28;
    let when = t0;

    scheduleChew(context, when);
    scheduleChew(context, when + 0.05);

    when += gap;
    scheduleChew(context, when);

    when += gap;
    if (when - t0 + 0.25 <= total) {
        scheduleChew(context, when);
    }
}

/* ---------- triumphant win melody ---------- */
export function playWin() {
    const ctx = ensureAudioContext();
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, ctx.currentTime);
    expTo(ctx, out.gain, 0.9, ctx.currentTime + 0.05);
    out.connect(ctx.destination);

    // Simple I–V–vi–IV style arpeggio in C major (C, G, A, F) + sparkle
    const notesHz = [261.63, 392.00, 440.00, 349.23];
    const start = ctx.currentTime + 0.02;

    for (let i = 0; i < notesHz.length; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(notesHz[i], start + i * 0.18);
        g.gain.setValueAtTime(0.0001, start + i * 0.18);
        expTo(ctx, g.gain, 0.7, start + i * 0.18 + 0.03);
        expTo(ctx, g.gain, 0.0001, start + i * 0.18 + 0.28);
        o.connect(g).connect(out);
        o.start(start + i * 0.18);
        o.stop(start + i * 0.18 + 0.3);
    }

    // Sparkle noise burst at the end
    const sparkleDelay = start + notesHz.length * 0.18 + 0.05;
    const dur = 0.2;
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const nf = ctx.createBiquadFilter();
    nf.type = "highpass";
    nf.frequency.setValueAtTime(3000, sparkleDelay);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, sparkleDelay);
    expTo(ctx, ng.gain, 0.4, sparkleDelay + 0.02);
    expTo(ctx, ng.gain, 0.0001, sparkleDelay + dur);
    noise.connect(nf).connect(ng).connect(out);
    noise.start(sparkleDelay);
    noise.stop(sparkleDelay + dur);

    // Fade out the master gain after ~1s
    const end = sparkleDelay + dur + 0.15;
    expTo(ctx, out.gain, 0.0001, end);
}

/* ---------- prime on first user gesture ---------- */
export function primeAudioOnFirstGesture() {
    const onceHandler = () => {
        unlockAudioNow();
        ["pointerdown", "touchstart", "click", "keydown"].forEach((type) =>
            window.removeEventListener(type, onceHandler, true)
        );
    };
    ["pointerdown", "touchstart", "click", "keydown"].forEach((type) =>
        window.addEventListener(type, onceHandler, { once: true, capture: true })
    );
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            try { ensureAudioContext().resume?.(); } catch {}
        }
    });
}
