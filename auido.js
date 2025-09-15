let ctx;
function ensure() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === "suspended") ctx.resume(); return ctx; }

export function playTick() {
  const c = ensure(); const o = c.createOscillator(); const g = c.createGain();
  o.type = "square"; o.frequency.setValueAtTime(1200, c.currentTime);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.2, c.currentTime + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.06);
  o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.07);
}
export async function playSiren(ms = 1800) {
  const c = ensure(); const car = c.createOscillator(); const mod = c.createOscillator(); const dev = c.createGain(); const out = c.createGain();
  car.type="sine"; mod.type="sine"; dev.gain.value=40; mod.frequency.setValueAtTime(4.2, c.currentTime); car.frequency.setValueAtTime(700, c.currentTime);
  out.gain.setValueAtTime(0.0001, c.currentTime); out.gain.exponentialRampToValueAtTime(0.6, c.currentTime + 0.08);
  mod.connect(dev); dev.connect(car.frequency); car.connect(out).connect(c.destination); car.start(); mod.start();
  await new Promise(r=>setTimeout(r, ms)); const end=c.currentTime+0.12; out.gain.exponentialRampToValueAtTime(0.0001, end); car.stop(end); mod.stop(end);
}
export function primeAudioOnFirstGesture() {
  const h = () => { ensure(); window.removeEventListener("touchstart", h); window.removeEventListener("click", h); };
  window.addEventListener("touchstart", h, { once:true }); window.addEventListener("click", h, { once:true });
}
