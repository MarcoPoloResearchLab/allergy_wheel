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
/**
 * Tunable parameters for the synthesized chewing effect. Values are grouped by
 * their role so that designers can experiment with the feel of each bite
 * without diving into the implementation details.
 */
const NomNomChewParameters = Object.freeze({
    mix: Object.freeze({
        silentGainLevel: 0.0001
    }),
    durations: Object.freeze({
        chewSeconds: 0.22,
        toneAttackSeconds: 0.015,
        crunchNoiseSeconds: 0.08,
        crunchBaseOffsetSeconds: 0.02,
        crunchOffsetJitterSeconds: 0.012,
        crunchGainAttackSeconds: 0.01,
        thumpDurationSeconds: 0.12,
        thumpAttackSeconds: 0.008,
        formantReleaseSeconds: 0.18
    }),
    tone: Object.freeze({
        waveform: "triangle",
        baseFrequencyHz: 240,
        targetFrequencyHz: 180,
        gainPeakLevel: 0.60,
        pitchVariationRatio: 0.10
    }),
    bodyFilter: Object.freeze({
        type: "bandpass",
        frequencyHz: 950,
        qFactor: 1.2
    }),
    thump: Object.freeze({
        waveform: "sine",
        baseFrequencyHz: 68,
        gainPeakLevel: 0.28,
        frequencyVariationRatio: 0.08
    }),
    crunchNoise: Object.freeze({
        amplitudeScale: 0.7,
        filterType: "bandpass",
        filterFrequencyHz: 1700,
        filterFrequencyJitterHz: 220,
        filterQ: 2.0,
        filterQJitter: 0.6,
        gainPeakLevel: 0.35,
        minimumFilterFrequencyHz: 80,
        minimumFilterQ: 0.4
    }),
    mouthFormant: Object.freeze({
        filterType: "lowpass",
        startFrequencyHz: 2200,
        endFrequencyHz: 1100,
        qFactor: 2.6
    })
});

function clampToMinimum(value, minimum) {
    return Math.max(value, minimum);
}

function randomMultiplier(randomGenerator, variationRatio) {
    if (variationRatio <= 0) {
        return 1;
    }
    const deviation = (randomGenerator() * 2 - 1) * variationRatio;
    return 1 + deviation;
}

function randomOffset(randomGenerator, spread) {
    if (spread <= 0) {
        return 0;
    }
    return (randomGenerator() * 2 - 1) * spread;
}

function scheduleChew(context, startTime, randomGenerator = Math.random) {
    const {
        mix,
        durations,
        tone,
        bodyFilter,
        thump,
        crunchNoise,
        mouthFormant
    } = NomNomChewParameters;

    const chewEndTime = startTime + durations.chewSeconds;
    const crunchStartOffsetSeconds = clampToMinimum(
        durations.crunchBaseOffsetSeconds + randomOffset(randomGenerator, durations.crunchOffsetJitterSeconds),
        0
    );
    const crunchStartTime = startTime + crunchStartOffsetSeconds;
    const crunchEndTime = crunchStartTime + durations.crunchNoiseSeconds;

    const tonePitchMultiplier = randomMultiplier(randomGenerator, tone.pitchVariationRatio);
    const toneStartFrequencyHz = tone.baseFrequencyHz * tonePitchMultiplier;
    const toneEndFrequencyHz = tone.targetFrequencyHz * tonePitchMultiplier;

    const thumpFrequencyHz = thump.baseFrequencyHz * randomMultiplier(randomGenerator, thump.frequencyVariationRatio);

    const crunchFilterFrequencyHz = clampToMinimum(
        crunchNoise.filterFrequencyHz + randomOffset(randomGenerator, crunchNoise.filterFrequencyJitterHz),
        crunchNoise.minimumFilterFrequencyHz
    );
    const crunchFilterQ = clampToMinimum(
        crunchNoise.filterQ + randomOffset(randomGenerator, crunchNoise.filterQJitter),
        crunchNoise.minimumFilterQ
    );

    const mouthReleaseEndTime = crunchEndTime + durations.formantReleaseSeconds;

    const mouthResonanceFilter = context.createBiquadFilter();
    mouthResonanceFilter.type = mouthFormant.filterType;
    mouthResonanceFilter.frequency.setValueAtTime(mouthFormant.startFrequencyHz, startTime);
    mouthResonanceFilter.Q.setValueAtTime(mouthFormant.qFactor, startTime);
    linearTo(context, mouthResonanceFilter.frequency, mouthFormant.endFrequencyHz, mouthReleaseEndTime);
    mouthResonanceFilter.connect(context.destination);

    const toneOscillator = context.createOscillator();
    toneOscillator.type = tone.waveform;
    toneOscillator.frequency.setValueAtTime(toneStartFrequencyHz, startTime);
    linearTo(context, toneOscillator.frequency, toneEndFrequencyHz, chewEndTime);

    const bodyFilterNode = context.createBiquadFilter();
    bodyFilterNode.type = bodyFilter.type;
    bodyFilterNode.frequency.setValueAtTime(bodyFilter.frequencyHz, startTime);
    bodyFilterNode.Q.setValueAtTime(bodyFilter.qFactor, startTime);

    const bodyGainNode = context.createGain();
    bodyGainNode.gain.setValueAtTime(mix.silentGainLevel, startTime);
    expTo(context, bodyGainNode.gain, tone.gainPeakLevel, startTime + durations.toneAttackSeconds);
    expTo(context, bodyGainNode.gain, mix.silentGainLevel, chewEndTime);

    toneOscillator.connect(bodyFilterNode).connect(bodyGainNode).connect(mouthResonanceFilter);
    toneOscillator.start(startTime);
    toneOscillator.stop(chewEndTime);

    const thumpOscillator = context.createOscillator();
    thumpOscillator.type = thump.waveform;
    thumpOscillator.frequency.setValueAtTime(thumpFrequencyHz, startTime);

    const thumpGainNode = context.createGain();
    thumpGainNode.gain.setValueAtTime(mix.silentGainLevel, startTime);
    expTo(context, thumpGainNode.gain, thump.gainPeakLevel, startTime + durations.thumpAttackSeconds);
    expTo(context, thumpGainNode.gain, mix.silentGainLevel, startTime + durations.thumpDurationSeconds);

    thumpOscillator.connect(thumpGainNode).connect(mouthResonanceFilter);
    thumpOscillator.start(startTime);
    thumpOscillator.stop(startTime + durations.thumpDurationSeconds);

    const noiseBuffer = context.createBuffer(
        1,
        Math.floor(context.sampleRate * durations.crunchNoiseSeconds),
        context.sampleRate
    );
    const noiseChannel = noiseBuffer.getChannelData(0);
    for (let sampleIndex = 0; sampleIndex < noiseChannel.length; sampleIndex += 1) {
        noiseChannel[sampleIndex] = (Math.random() * 2 - 1) * crunchNoise.amplitudeScale;
    }
    const noiseSource = context.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const crunchFilterNode = context.createBiquadFilter();
    crunchFilterNode.type = crunchNoise.filterType;
    crunchFilterNode.frequency.setValueAtTime(crunchFilterFrequencyHz, crunchStartTime);
    crunchFilterNode.Q.setValueAtTime(crunchFilterQ, crunchStartTime);

    const noiseGainNode = context.createGain();
    noiseGainNode.gain.setValueAtTime(mix.silentGainLevel, crunchStartTime);
    expTo(context, noiseGainNode.gain, crunchNoise.gainPeakLevel, crunchStartTime + durations.crunchGainAttackSeconds);
    expTo(context, noiseGainNode.gain, mix.silentGainLevel, crunchEndTime);

    noiseSource.connect(crunchFilterNode).connect(noiseGainNode).connect(mouthResonanceFilter);
    noiseSource.start(crunchStartTime);
    noiseSource.stop(crunchEndTime);
}

export function playNomNom(durationMs = 1200, randomGenerator = Math.random) {
    const context = ensureAudioContext();
    const t0 = context.currentTime;

    const total = Math.max(350, durationMs) / 1000;
    const gap = 0.28;
    let when = t0;

    scheduleChew(context, when, randomGenerator);
    scheduleChew(context, when + 0.05, randomGenerator);

    when += gap;
    scheduleChew(context, when, randomGenerator);

    when += gap;
    if (when - t0 + 0.25 <= total) {
        scheduleChew(context, when, randomGenerator);
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
