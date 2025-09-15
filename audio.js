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

export function playTick() {
    const context = ensureAudioContext();
    const oscillatorNode = context.createOscillator();
    const gainNode = context.createGain();
    oscillatorNode.type = "square";
    oscillatorNode.frequency.setValueAtTime(1200, context.currentTime);
    gainNode.gain.setValueAtTime(0.0001, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.2, context.currentTime + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.06);
    oscillatorNode.connect(gainNode).connect(context.destination);
    oscillatorNode.start();
    oscillatorNode.stop(context.currentTime + 0.07);
}

export async function playSiren(durationMs = 1800) {
    const context = ensureAudioContext();
    const carrierOscillator = context.createOscillator();
    const modulatorOscillator = context.createOscillator();
    const deviationGain = context.createGain();
    const outputGain = context.createGain();

    carrierOscillator.type = "sine";
    modulatorOscillator.type = "sine";
    deviationGain.gain.value = 40;
    modulatorOscillator.frequency.setValueAtTime(4.2, context.currentTime);
    carrierOscillator.frequency.setValueAtTime(700, context.currentTime);

    outputGain.gain.setValueAtTime(0.0001, context.currentTime);
    outputGain.gain.exponentialRampToValueAtTime(0.6, context.currentTime + 0.08);

    modulatorOscillator.connect(deviationGain);
    deviationGain.connect(carrierOscillator.frequency);
    carrierOscillator.connect(outputGain).connect(context.destination);
    carrierOscillator.start();
    modulatorOscillator.start();

    await new Promise(resolveDelay => setTimeout(resolveDelay, durationMs));
    const fadeEnd = context.currentTime + 0.12;
    outputGain.gain.exponentialRampToValueAtTime(0.0001, fadeEnd);
    carrierOscillator.stop(fadeEnd);
    modulatorOscillator.stop(fadeEnd);
}

export function primeAudioOnFirstGesture() {
    const onceHandler = () => {
        ensureAudioContext();
        window.removeEventListener("touchstart", onceHandler);
        window.removeEventListener("click", onceHandler);
    };
    window.addEventListener("touchstart", onceHandler, { once: true });
    window.addEventListener("click", onceHandler, { once: true });
}
