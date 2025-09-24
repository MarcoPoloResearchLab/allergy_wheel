// @ts-check

import { AudioAssetPath, AudioErrorMessage, BrowserEventName } from "../constants.js";

// audio.js — web audio effects and buffered playback resources

let sharedAudioContext;
let cachedSirenBufferPromise;

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

const AudioUnlockEventNames = Object.freeze([
    BrowserEventName.POINTER_DOWN,
    BrowserEventName.TOUCH_START,
    BrowserEventName.CLICK,
    BrowserEventName.KEY_DOWN
]);


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
        const oscillatorNode = context.createOscillator();
        const gainNode = context.createGain();
        gainNode.gain.setValueAtTime(0.0001, context.currentTime);
        oscillatorNode.connect(gainNode).connect(context.destination);
        oscillatorNode.start();
        oscillatorNode.stop(context.currentTime + 0.01);
        context.resume?.();
    } catch {}
}

async function fetchAudioAssetData(assetPath) {
    const response = await fetch(assetPath);
    if (!response.ok) {
        throw new Error(`${AudioErrorMessage.ASSET_LOAD_FAILURE}: ${response.status}`);
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
                reject(error || new Error(AudioErrorMessage.ASSET_DECODE_FAILURE));
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

/**
 * Preloads the "nom nom" chewing sound so that later playback starts without delay.
 *
 * @returns {Promise<void>} A promise that resolves when the audio buffer is cached.
 */
export async function preloadNomNom() {
    const context = ensureAudioContext();
    await loadAudioBuffer(context, AudioAssetPath.NOM_NOM);
}

/* ---------- small helper envelopes ---------- */
/**
 * Applies an exponential ramp to the provided audio parameter, ensuring the value never reaches zero.
 *
 * @param {AudioParam} audioParam - Parameter whose value will be ramped.
 * @param {number} targetValue - Desired value to reach.
 * @param {number} targetTime - Time, in seconds, when the value should be reached.
 * @param {number} [minimumValue=0.0001] - Smallest allowed absolute value to avoid invalid ramps.
 */
function applyExponentialRamp(audioParam, targetValue, targetTime, minimumValue = 0.0001) {
    const safeTargetValue = Math.max(Math.abs(targetValue), minimumValue);
    audioParam.exponentialRampToValueAtTime(safeTargetValue, targetTime);
}

async function fetchSirenArrayBuffer() {
    if (typeof fetch !== "function") {
        throw new Error(AudioErrorMessage.FETCH_UNSUPPORTED);
    }
    const response = await fetch(AudioAssetPath.SIREN);
    if (!response?.ok) {
        throw new Error(AudioErrorMessage.SIREN_ASSET_LOAD_FAILURE);
    }
    return response.arrayBuffer();
}

async function decodeSirenArrayBuffer(context, arrayBuffer) {
    if (!context?.decodeAudioData) {
        throw new Error(AudioErrorMessage.SIREN_DECODE_FAILURE);
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
/**
 * Plays a short percussive tick sound used while the wheel spins.
 */
export function playTick() {
    const context = ensureAudioContext();
    const oscillatorNode = context.createOscillator();
    const gainNode = context.createGain();
    oscillatorNode.type = "square";
    oscillatorNode.frequency.setValueAtTime(1200, context.currentTime);
    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    applyExponentialRamp(gainNode.gain, 0.25, context.currentTime + 0.005);
    applyExponentialRamp(gainNode.gain, 0.0001, context.currentTime + 0.06);
    oscillatorNode.connect(gainNode).connect(context.destination);
    oscillatorNode.start();
    oscillatorNode.stop(context.currentTime + 0.07);
}

/* ---------- siren ---------- */
/**
 * Plays the looping ambulance siren audio for the provided duration.
 *
 * @param {number} [durationMs=1800] - Desired playback duration in milliseconds.
 * @returns {Promise<void>} A promise that resolves when playback finishes.
 */
export async function playSiren(durationMs = 1800) {
    const context = ensureAudioContext();
    const sirenBuffer = await loadSirenBuffer(context);

    const now = context.currentTime;
    const requestedDurationSeconds = Math.max(durationMs, 0) / 1000;
    const bufferDurationSeconds = Math.max(sirenBuffer?.duration ?? 0, 0);

    const masterGainNode = context.createGain();
    masterGainNode.gain.setValueAtTime(SirenGainLevel.minimal, now);
    masterGainNode.connect(context.destination);

    applyExponentialRamp(
        masterGainNode.gain,
        SirenGainLevel.active,
        now + SirenEnvelopeTiming.attackSeconds
    );

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
    applyExponentialRamp(masterGainNode.gain, SirenGainLevel.minimal, releaseEndTime);

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

function scheduleNomNomPlaybackAt(
    context,
    buffer,
    playbackStartTime,
    offsetSeconds,
    optionalStopTimeSeconds = null
) {
    const bufferSourceNode = context.createBufferSource();
    const playbackGainNode = context.createGain();
    bufferSourceNode.buffer = buffer;
    playbackGainNode.gain.setValueAtTime(
        NomNomPlaybackConfiguration.playbackGainLevel,
        playbackStartTime
    );
    bufferSourceNode.connect(playbackGainNode).connect(context.destination);
    bufferSourceNode.start(playbackStartTime, offsetSeconds);
    if (
        typeof optionalStopTimeSeconds === "number" &&
        Number.isFinite(optionalStopTimeSeconds)
    ) {
        const clampedStopTimeSeconds = Math.max(optionalStopTimeSeconds, playbackStartTime);
        bufferSourceNode.stop(clampedStopTimeSeconds);
    }
}

async function getNomNomBuffer(context) {
    return loadAudioBuffer(context, AudioAssetPath.NOM_NOM);
}

/**
 * Plays the "nom nom" chewing sound. When the clip is short, multiple overlapping bites are scheduled.
 *
 * @param {number} [durationMs=1200] - Requested playback duration in milliseconds.
 * @param {() => number} [randomGenerator=Math.random] - Random generator used to vary buffer offsets.
 * @returns {Promise<void>} A promise that resolves once playback scheduling completes.
 */
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
        const stopTimeSeconds =
            typeof knownBufferDurationSeconds === "number"
                ? startTimeSeconds + knownBufferDurationSeconds
                : null;
        scheduleNomNomPlaybackAt(
            context,
            audioBuffer,
            startTimeSeconds,
            0,
            stopTimeSeconds
        );
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
/**
 * Plays the celebratory melody and sparkle effect when the player wins.
 */
export function playWin() {
    const audioContext = ensureAudioContext();
    const masterGainNode = audioContext.createGain();
    masterGainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    applyExponentialRamp(masterGainNode.gain, 0.9, audioContext.currentTime + 0.05);
    masterGainNode.connect(audioContext.destination);

    // Simple I–V–vi–IV style arpeggio in C major (C, G, A, F) + sparkle
    const notesHz = [261.63, 392.00, 440.00, 349.23];
    const melodyStartTime = audioContext.currentTime + 0.02;

    for (let noteIndex = 0; noteIndex < notesHz.length; noteIndex += 1) {
        const oscillatorNode = audioContext.createOscillator();
        const noteGainNode = audioContext.createGain();
        const noteStartTime = melodyStartTime + noteIndex * 0.18;
        oscillatorNode.type = "triangle";
        oscillatorNode.frequency.setValueAtTime(notesHz[noteIndex], noteStartTime);
        noteGainNode.gain.setValueAtTime(0.0001, noteStartTime);
        applyExponentialRamp(noteGainNode.gain, 0.7, noteStartTime + 0.03);
        applyExponentialRamp(noteGainNode.gain, 0.0001, noteStartTime + 0.28);
        oscillatorNode.connect(noteGainNode).connect(masterGainNode);
        oscillatorNode.start(noteStartTime);
        oscillatorNode.stop(noteStartTime + 0.3);
    }

    // Sparkle noise burst at the end
    const sparkleDelayTime = melodyStartTime + notesHz.length * 0.18 + 0.05;
    const sparkleDurationSeconds = 0.2;
    const noiseBuffer = audioContext.createBuffer(
        1,
        Math.floor(audioContext.sampleRate * sparkleDurationSeconds),
        audioContext.sampleRate
    );
    const noiseBufferData = noiseBuffer.getChannelData(0);
    for (let sampleIndex = 0; sampleIndex < noiseBufferData.length; sampleIndex += 1) {
        const normalizedPosition = sampleIndex / noiseBufferData.length;
        noiseBufferData[sampleIndex] = (Math.random() * 2 - 1) * (1 - normalizedPosition);
    }
    const noiseSourceNode = audioContext.createBufferSource();
    noiseSourceNode.buffer = noiseBuffer;
    const noiseFilterNode = audioContext.createBiquadFilter();
    noiseFilterNode.type = "highpass";
    noiseFilterNode.frequency.setValueAtTime(3000, sparkleDelayTime);
    const noiseGainNode = audioContext.createGain();
    noiseGainNode.gain.setValueAtTime(0.0001, sparkleDelayTime);
    applyExponentialRamp(noiseGainNode.gain, 0.4, sparkleDelayTime + 0.02);
    applyExponentialRamp(noiseGainNode.gain, 0.0001, sparkleDelayTime + sparkleDurationSeconds);
    noiseSourceNode.connect(noiseFilterNode).connect(noiseGainNode).connect(masterGainNode);
    noiseSourceNode.start(sparkleDelayTime);
    noiseSourceNode.stop(sparkleDelayTime + sparkleDurationSeconds);

    // Fade out the master gain after ~1s
    const fadeOutEndTime = sparkleDelayTime + sparkleDurationSeconds + 0.15;
    applyExponentialRamp(masterGainNode.gain, 0.0001, fadeOutEndTime);
}

/* ---------- prime on first user gesture ---------- */
/**
 * Unlocks the audio context after the first user interaction so Web Audio playback becomes reliable.
 */
export function primeAudioOnFirstGesture() {
    const onceHandler = () => {
        unlockAudioNow();
        preloadNomNom().catch(() => {});
        AudioUnlockEventNames.forEach((eventName) =>
            window.removeEventListener(eventName, onceHandler, true)
        );
    };
    AudioUnlockEventNames.forEach((eventName) =>
        window.addEventListener(eventName, onceHandler, { once: true, capture: true })
    );
    document.addEventListener(BrowserEventName.VISIBILITY_CHANGE, () => {
        if (document.visibilityState === "visible") {
            try { ensureAudioContext().resume?.(); } catch {}
        }
    });
}
