import { AudioAssetPath } from "./constants.js";

// audio.js — web audio effects and buffered playback resources

let sharedAudioContext;
let cachedSirenBufferPromise;

const AudioAssetLoadErrorMessage = "Unable to load audio asset";
const AudioAssetDecodeErrorMessage = "Unable to decode audio asset";
const RandomValueMaximum = 0.999999;

const AudioBufferCache = new Map();
const AudioBufferPromiseCache = new Map();

const SirenGainLevel = Object.freeze({
    minimal: 0.0001,
    active: 0.85
});

const SirenEnvelopeTiming = Object.freeze({
    attackSeconds: 0.08,
    releaseSeconds: 0.18
});

const SirenLoopToleranceSeconds = 0.001;

const SirenAssetLoadErrorMessage = "Unable to load siren audio asset.";
const SirenAudioDecodingErrorMessage = "Unable to decode siren audio asset.";
const AudioAssetFetchUnsupportedMessage = "Audio asset loading requires fetch support.";

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

async function fetchAudioAssetData(assetPath) {
    const response = await fetch(assetPath);
    if (!response.ok) {
        throw new Error(`${AudioAssetLoadErrorMessage}: ${response.status}`);
    }
    return response.arrayBuffer();
}

async function decodeAudioDataAsync(context, audioData) {
    const decodeResult = context.decodeAudioData(audioData);
    if (decodeResult instanceof Promise) {
        return decodeResult;
    }
    return new Promise((resolve, reject) => {
        context.decodeAudioData(
            audioData,
            (buffer) => {
                resolve(buffer);
            },
            (error) => {
                reject(error || new Error(AudioAssetDecodeErrorMessage));
            }
        );
    });
}

async function loadAudioBuffer(context, assetPath) {
    if (AudioBufferCache.has(assetPath)) {
        return AudioBufferCache.get(assetPath);
    }
    if (AudioBufferPromiseCache.has(assetPath)) {
        return AudioBufferPromiseCache.get(assetPath);
    }
    const bufferPromise = fetchAudioAssetData(assetPath)
        .then((arrayBuffer) => decodeAudioDataAsync(context, arrayBuffer))
        .then((buffer) => {
            AudioBufferCache.set(assetPath, buffer);
            AudioBufferPromiseCache.delete(assetPath);
            return buffer;
        })
        .catch((error) => {
            AudioBufferPromiseCache.delete(assetPath);
            throw error;
        });
    AudioBufferPromiseCache.set(assetPath, bufferPromise);
    return bufferPromise;
}

export async function preloadNomNom() {
    const context = ensureAudioContext();
    await loadAudioBuffer(context, AudioAssetPath.NOM_NOM);
}

/* ---------- small helper envelopes ---------- */
function expTo(ctx, param, value, t, min = 0.0001) {
    const safe = Math.max(Math.abs(value), min);
    param.exponentialRampToValueAtTime(safe, t);
}

async function fetchSirenArrayBuffer() {
    if (typeof fetch !== "function") {
        throw new Error(AudioAssetFetchUnsupportedMessage);
    }
    const response = await fetch(AudioAssetPath.SIREN);
    if (!response?.ok) {
        throw new Error(SirenAssetLoadErrorMessage);
    }
    return response.arrayBuffer();
}

async function decodeSirenArrayBuffer(context, arrayBuffer) {
    if (!context?.decodeAudioData) {
        throw new Error(SirenAudioDecodingErrorMessage);
    }
    if (context.decodeAudioData.length >= 2) {
        return new Promise((resolve, reject) => {
            context.decodeAudioData(arrayBuffer, resolve, reject);
        });
    }
    const decoded = context.decodeAudioData(arrayBuffer);
    return decoded instanceof Promise ? decoded : Promise.resolve(decoded);
}

async function loadSirenBuffer(context) {
    if (!cachedSirenBufferPromise) {
        cachedSirenBufferPromise = (async () => {
            const arrayBuffer = await fetchSirenArrayBuffer();
            return decodeSirenArrayBuffer(context, arrayBuffer);
        })();
        try {
            await cachedSirenBufferPromise;
        } catch (error) {
            cachedSirenBufferPromise = null;
            throw error;
        }
    }
    return cachedSirenBufferPromise;
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
    const sirenBuffer = await loadSirenBuffer(context);

    const now = context.currentTime;
    const requestedDurationSeconds = Math.max(durationMs, 0) / 1000;
    const bufferDurationSeconds = Math.max(sirenBuffer?.duration ?? 0, 0);

    const masterGainNode = context.createGain();
    masterGainNode.gain.setValueAtTime(SirenGainLevel.minimal, now);
    masterGainNode.connect(context.destination);

    expTo(context, masterGainNode.gain, SirenGainLevel.active, now + SirenEnvelopeTiming.attackSeconds);

    const bufferSourceNode = context.createBufferSource();
    bufferSourceNode.buffer = sirenBuffer;
    const shouldLoopBuffer = requestedDurationSeconds - bufferDurationSeconds > SirenLoopToleranceSeconds;
    bufferSourceNode.loop = shouldLoopBuffer;
    bufferSourceNode.connect(masterGainNode);
    bufferSourceNode.start(now);

    await new Promise(resolve => setTimeout(resolve, durationMs));

    const releaseStartTime = Math.max(now + requestedDurationSeconds, context.currentTime);
    const releaseEndTime = releaseStartTime + SirenEnvelopeTiming.releaseSeconds;
    const currentGainLevel = Math.max(masterGainNode.gain.value ?? SirenGainLevel.active, SirenGainLevel.minimal);
    masterGainNode.gain.cancelScheduledValues?.(releaseStartTime);
    masterGainNode.gain.setValueAtTime(currentGainLevel, releaseStartTime);
    expTo(context, masterGainNode.gain, SirenGainLevel.minimal, releaseEndTime);

    bufferSourceNode.stop(releaseEndTime);
}

/* ---------- buffered "nom-nom" chew ---------- */
const NomNomPlaybackConfiguration = Object.freeze({
    quickRepeatDelaySeconds: 0.05,
    chewGapSeconds: 0.28,
    trailingAllowanceSeconds: 0.25,
    minimumDurationSeconds: 0.35,
    startOffsetSafetyMarginSeconds: 0.02,
    playbackGainLevel: 0.9,
    fallbackBufferDurationSeconds: 1.5
});

const NomNomMultiBiteMaximumSampleDurationSeconds = NomNomPlaybackConfiguration.chewGapSeconds;

function clampRandomValue(randomValue) {
    if (!Number.isFinite(randomValue)) {
        return 0;
    }
    if (randomValue < 0) {
        return 0;
    }
    if (randomValue > RandomValueMaximum) {
        return RandomValueMaximum;
    }
    return randomValue;
}

function determineBufferStartOffsetSeconds(buffer, randomGenerator) {
    const { startOffsetSafetyMarginSeconds, fallbackBufferDurationSeconds } = NomNomPlaybackConfiguration;
    const bufferDurationSeconds =
        typeof buffer?.duration === "number" && buffer.duration > 0
            ? buffer.duration
            : fallbackBufferDurationSeconds;
    const playableDurationSeconds = Math.max(bufferDurationSeconds - startOffsetSafetyMarginSeconds, 0);
    if (playableDurationSeconds === 0) {
        return 0;
    }
    const normalizedRandomValue = clampRandomValue(randomGenerator());
    return normalizedRandomValue * playableDurationSeconds;
}

function scheduleNomNomPlaybackAt(context, buffer, playbackStartTime, offsetSeconds) {
    const bufferSourceNode = context.createBufferSource();
    const playbackGainNode = context.createGain();
    bufferSourceNode.buffer = buffer;
    playbackGainNode.gain.setValueAtTime(
        NomNomPlaybackConfiguration.playbackGainLevel,
        playbackStartTime
    );
    bufferSourceNode.connect(playbackGainNode).connect(context.destination);
    bufferSourceNode.start(playbackStartTime, offsetSeconds);
}

async function getNomNomBuffer(context) {
    return loadAudioBuffer(context, AudioAssetPath.NOM_NOM);
}

export async function playNomNom(durationMs = 1200, randomGenerator = Math.random) {
    const context = ensureAudioContext();
    const audioBuffer = await getNomNomBuffer(context);

    const {
        quickRepeatDelaySeconds,
        chewGapSeconds,
        trailingAllowanceSeconds,
        minimumDurationSeconds
    } = NomNomPlaybackConfiguration;

    const startTimeSeconds = context.currentTime;
    const requestedDurationSeconds = Math.max(minimumDurationSeconds, Math.max(0, durationMs) / 1000);
    const knownBufferDurationSeconds =
        typeof audioBuffer?.duration === "number" && audioBuffer.duration > 0
            ? audioBuffer.duration
            : null;
    const shouldScheduleMultipleBites =
        knownBufferDurationSeconds === null ||
        knownBufferDurationSeconds <= NomNomMultiBiteMaximumSampleDurationSeconds;

    if (!shouldScheduleMultipleBites) {
        const bufferOffsetSeconds = determineBufferStartOffsetSeconds(audioBuffer, randomGenerator);
        scheduleNomNomPlaybackAt(context, audioBuffer, startTimeSeconds, bufferOffsetSeconds);
        return;
    }

    const playbackStartTimes = [
        startTimeSeconds,
        startTimeSeconds + quickRepeatDelaySeconds,
        startTimeSeconds + chewGapSeconds
    ];

    const finalBiteStartTime = startTimeSeconds + chewGapSeconds * 2;
    if (finalBiteStartTime - startTimeSeconds + trailingAllowanceSeconds <= requestedDurationSeconds) {
        playbackStartTimes.push(finalBiteStartTime);
    }

    playbackStartTimes.forEach((playbackStartTime) => {
        const bufferOffsetSeconds = determineBufferStartOffsetSeconds(audioBuffer, randomGenerator);
        scheduleNomNomPlaybackAt(context, audioBuffer, playbackStartTime, bufferOffsetSeconds);
    });
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
        preloadNomNom().catch(() => {});
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
