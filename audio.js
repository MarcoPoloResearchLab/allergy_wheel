// audio.js — fully synthesized sounds (no external files)

let sharedAudioContext;

function ensureAudioContext() {
    if (!sharedAudioContext) {
        sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (sharedAudioContext.state === "suspended") {
        sharedAudioContext.resume();
    }
    return sharedAudioContext;
}

/* ---------- small helper envelopes ---------- */
function expTo(ctx, param, value, t, min = 0.0001) {
    // clamp to >0 for exponential ramps
    const safe = Math.max(Math.abs(value), min);
    param.exponentialRampToValueAtTime(safe, t);
}

function linearTo(ctx, param, value, t) {
    param.linearRampToValueAtTime(value, t);
}

/* ---------- simple tick (unchanged) ---------- */
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

/* ---------- siren (unchanged) ---------- */
export async function playSiren(durationMs = 1800) {
    const context = ensureAudioContext();
    const carrier = context.createOscillator();
    const mod = context.createOscillator();
    const deviation = context.createGain();
    const out = context.createGain();

    carrier.type = "sine";
    mod.type = "sine";
    deviation.gain.value = 40;               // FM depth
    mod.frequency.setValueAtTime(4.2, context.currentTime);
    carrier.frequency.setValueAtTime(700, context.currentTime);

    out.gain.setValueAtTime(0.0001, context.currentTime);
    expTo(context, out.gain, 0.6, context.currentTime + 0.08);

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
/*
   We make a friendly “chew” using:
   - Body: triangle oscillator with slight downward pitch bend
   - Formant: bandpass filter to vowel-ize (~800–1200 Hz)
   - Crunch: short noise burst through a higher bandpass
   - Fast percussive gain envelope
   We schedule 2–3 syllables inside the requested duration.
*/
function scheduleChew(context, startTime) {
    const duration = 0.22;           // length of a single "nom"
    const endTime = startTime + duration;

    // Body oscillator
    const osc = context.createOscillator();
    osc.type = "triangle";
    const bodyFilter = context.createBiquadFilter();
    bodyFilter.type = "bandpass";
    bodyFilter.frequency.setValueAtTime(950, startTime); // vowel-ish color
    bodyFilter.Q.setValueAtTime(1.2, startTime);

    const bodyGain = context.createGain();
    bodyGain.gain.setValueAtTime(0.0001, startTime);
    // quick attack then decay
    expTo(context, bodyGain.gain, 0.45, startTime + 0.015);
    expTo(context, bodyGain.gain, 0.0001, endTime);

    // gentle downward pitch sweep (like a bite)
    osc.frequency.setValueAtTime(240, startTime);
    linearTo(context, osc.frequency, 180, endTime);

    osc.connect(bodyFilter).connect(bodyGain).connect(context.destination);
    osc.start(startTime);
    osc.stop(endTime);

    // Crunch noise
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

    // Schedule syllables evenly spaced within durationMs.
    const total = Math.max(350, durationMs) / 1000; // seconds
    const gap = 0.28;                               // spacing between "noms"
    let when = t0;

    // Make the first two accents a tad stronger by stacking a second filter pass.
    scheduleChew(context, when);
    scheduleChew(context, when + 0.05); // subtle doubling for a fuller first bite

    when += gap;
    scheduleChew(context, when);

    // Third chew if room remains
    when += gap;
    if (when - t0 + 0.25 <= total) {
        scheduleChew(context, when);
    }
}

/* ---------- prime on first user gesture (unchanged) ---------- */
export function primeAudioOnFirstGesture() {
    const onceHandler = () => {
        ensureAudioContext();
        window.removeEventListener("touchstart", onceHandler);
        window.removeEventListener("click", onceHandler);
    };
    window.addEventListener("touchstart", onceHandler, { once: true });
    window.addEventListener("click", onceHandler, { once: true });
}
