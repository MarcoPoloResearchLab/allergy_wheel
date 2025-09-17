// audio.js — fully synthesized sounds (no external files)

let sharedAudioContext;

const SirenToneConfiguration = Object.freeze([
    Object.freeze({ baseFrequencyHz: 650, sweepDepthHz: 70 }),
    Object.freeze({ baseFrequencyHz: 920, sweepDepthHz: 60 })
]);

const SirenTimingConfiguration = Object.freeze({
    attackSeconds: 0.08,
    releaseSeconds: 0.18,
    crossfadeIntervalSeconds: 0.55,
    fadeSeconds: 0.18,
    sweepPeriodSeconds: 2.0
});

const SirenGainLevel = Object.freeze({
    minimal: 0.0001,
    active: 0.85
});

const SirenOscillatorWaveform = "sine";
const WaveShaperOversampleSetting = "2x";

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

function createMildDistortionCurve(resolution = 256, intensity = 0.42) {
    const curve = new Float32Array(resolution);
    for (let index = 0; index < resolution; index++) {
        const normalizedPosition = (index / (resolution - 1)) * 2 - 1;
        curve[index] = Math.tanh(intensity * normalizedPosition);
    }
    return curve;
}

function scheduleToneAlternation(context, toneGainNodes, startTime, scheduleEndTime) {
    const { crossfadeIntervalSeconds, fadeSeconds } = SirenTimingConfiguration;
    const { minimal, active } = SirenGainLevel;
    for (let segmentIndex = 0, segmentStart = startTime; segmentStart < scheduleEndTime; segmentIndex += 1, segmentStart += crossfadeIntervalSeconds) {
        const toneIndex = segmentIndex % toneGainNodes.length;
        const toneGainNode = toneGainNodes[toneIndex];
        const gainParam = toneGainNode.gain;

        const fadeInStart = segmentStart;
        const fadeInEnd = Math.min(segmentStart + fadeSeconds, scheduleEndTime);
        gainParam.setValueAtTime(minimal, fadeInStart);
        linearTo(context, gainParam, active, fadeInEnd);

        const fadeOutStart = Math.min(segmentStart + crossfadeIntervalSeconds, scheduleEndTime);
        if (fadeOutStart > fadeInEnd) {
            gainParam.setValueAtTime(active, fadeOutStart);
        }
        linearTo(context, gainParam, minimal, fadeOutStart + fadeSeconds);
    }
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
    const now = context.currentTime;
    const requestedDurationSeconds = Math.max(durationMs, 0) / 1000;
    const scheduleEndTime = now + requestedDurationSeconds;

    const masterGainNode = context.createGain();
    masterGainNode.gain.setValueAtTime(SirenGainLevel.minimal, now);

    const colorationNode = context.createWaveShaper();
    colorationNode.curve = createMildDistortionCurve();
    colorationNode.oversample = WaveShaperOversampleSetting;

    masterGainNode.connect(colorationNode).connect(context.destination);
    expTo(context, masterGainNode.gain, 0.9, now + SirenTimingConfiguration.attackSeconds);

    const toneGainNodes = [];
    const toneControllers = [];

    for (const toneConfig of SirenToneConfiguration) {
        const toneGainNode = context.createGain();
        toneGainNode.gain.setValueAtTime(SirenGainLevel.minimal, now);

        const toneOscillator = context.createOscillator();
        toneOscillator.type = SirenOscillatorWaveform;
        toneOscillator.frequency.setValueAtTime(toneConfig.baseFrequencyHz, now);

        const modulationOscillator = context.createOscillator();
        modulationOscillator.type = SirenOscillatorWaveform;
        modulationOscillator.frequency.setValueAtTime(1 / SirenTimingConfiguration.sweepPeriodSeconds, now);

        const modulationGainNode = context.createGain();
        modulationGainNode.gain.setValueAtTime(toneConfig.sweepDepthHz, now);

        modulationOscillator.connect(modulationGainNode).connect(toneOscillator.frequency);

        toneOscillator.connect(toneGainNode).connect(masterGainNode);
        toneOscillator.start(now);
        modulationOscillator.start(now);

        toneGainNodes.push(toneGainNode);
        toneControllers.push({ toneOscillator, modulationOscillator });
    }

    scheduleToneAlternation(context, toneGainNodes, now, scheduleEndTime);

    await new Promise(r => setTimeout(r, durationMs));

    const releaseStartTime = Math.max(scheduleEndTime, context.currentTime);
    const releaseEndTime = releaseStartTime + SirenTimingConfiguration.releaseSeconds;
    expTo(context, masterGainNode.gain, SirenGainLevel.minimal, releaseEndTime);
    toneGainNodes.forEach(toneGainNode => {
        const gainParam = toneGainNode.gain;
        gainParam.cancelScheduledValues?.(releaseStartTime);
        gainParam.setValueAtTime(SirenGainLevel.minimal, releaseStartTime);
        linearTo(context, gainParam, SirenGainLevel.minimal, releaseEndTime);
    });

    for (const controller of toneControllers) {
        controller.toneOscillator.stop(releaseEndTime);
        controller.modulationOscillator.stop(releaseEndTime);
    }
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
