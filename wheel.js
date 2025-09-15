const TAU = Math.PI * 2;

export class Wheel {
  constructor(canvas, labels) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.labels = labels;
    this.segment = labels.length ? TAU / labels.length : 0;
    this.pos = 0;               // angular position
    this.vel = 0;               // angular velocity
    this.stopIntent = false;

    // tuned physics
    this.accel = 18;
    this.maxVel = 12;
    this.dragSpin = 0.3;
    this.dragStop = 2.6;
    this.minStopVel = 0.35;
    this.pointer = -Math.PI / 2;

    this.last = 0;
    this.raf = null;

    this.palette = ["#ff8fab","#ffd6a5","#fdffb6","#caffbf","#9bf6ff","#a0c4ff","#bdb2ff","#ffc6ff","#fcd5ce","#f1c0e8","#e9ff70","#ffd166","#06d6a0","#90caf9","#f48fb1"];

    this.resizeToCss();
  }

  resizeToCss() {
    const cssW = this.canvas.clientWidth, cssH = this.canvas.clientHeight;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  onStop(cb) { this.onStopCb = cb; }

  start() {
    if (!this.labels.length) { this.draw(); return; }
    this.stopIntent = false;
    this.vel = Math.max(this.vel, 2);
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.step.bind(this));
    }
  }

  requestStop() { this.stopIntent = true; }

  step(ts) {
    const dt = Math.min(0.05, (ts - this.last) / 1000);
    this.last = ts;
    this.physics(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.step.bind(this));
  }

  physics(dt) {
    if (!this.stopIntent) {
      this.vel += this.accel * dt;
      if (this.vel > this.maxVel) this.vel = this.maxVel;
      if (this.vel > 0) this.vel = Math.max(0, this.vel - this.dragSpin * dt);
    } else {
      this.vel = Math.max(0, this.vel - this.dragStop * dt);
      if (this.vel <= this.minStopVel) {
        const idx = this.indexAtPointer();
        const center = this.centerAngleFor(idx);
        const pointerAligned = (this.pointer - this.pos) % TAU;
        const normalized = ((pointerAligned % TAU) + TAU) % TAU;
        const delta = ((center - normalized + Math.PI) % TAU) - Math.PI;
        this.pos = norm(this.pos - delta);
        this.vel = 0;
      }
    }
    this.pos = norm(this.pos + this.vel * dt);
    if (this.stopIntent && this.vel === 0) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
      this.onStopCb && this.onStopCb(this.indexAtPointer());
    }
  }

  indexAtPointer() {
    const a = norm(this.pointer - this.pos);
    return Math.floor(a / this.segment);
  }

  centerAngleFor(i) { return norm(i * this.segment + this.segment / 2); }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const cx = w / 2, cy = h / 2, r = Math.min(cx, cy) - 8;

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.pos);

    if (!this.labels.length) {
      // Empty state
      ctx.fillStyle = "#333";
      ctx.font = "bold 24px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No dishes loaded", 0, 0);
      ctx.restore();
      return;
    }

    for (let i = 0; i < this.labels.length; i++) {
      const start = i * this.segment, end = start + this.segment;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, start, end); ctx.closePath();
      ctx.fillStyle = this.palette[i % this.palette.length]; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = "#000"; ctx.stroke();

      const mid = start + this.segment / 2;
      ctx.save(); ctx.rotate(mid); ctx.translate(r * 0.68, 0); ctx.rotate(Math.PI / 2);
      ctx.fillStyle = "#000"; ctx.font = "bold " + Math.max(14, Math.floor(r * 0.08)) + "px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const label = this.labels[i], maxW = r * 0.6, lines = wrap(ctx, label, maxW), lh = Math.max(16, Math.floor(r * 0.09));
      const offY = -((lines.length - 1) * lh) / 2;
      for (let li = 0; li < lines.length; li++) ctx.fillText(lines[li], 0, offY + li * lh, maxW);
      ctx.restore();
    }

    // hub
    ctx.beginPath(); ctx.arc(0, 0, Math.max(20, r * 0.12), 0, TAU); ctx.fillStyle = "#fff"; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = "#000"; ctx.stroke();

    ctx.restore();
  }
}

function wrap(ctx, text, max) {
  const words = String(text).split(/\s+/), lines = []; let cur = "";
  for (const w of words) { const t = cur ? cur + " " + w : w; if (ctx.measureText(t).width <= max) cur = t; else { if (cur) lines.push(cur); cur = w; } }
  if (cur) lines.push(cur);
  if (lines.length > 3) { const a = lines.slice(0, 2); let b = lines.slice(2).join(" "); while (ctx.measureText(b + "…").width > max && b.length) b = b.slice(0, -1); return [...a, b + "…"]; }
  return lines;
}
function norm(a){ a%=TAU; if(a<0) a+=TAU; return a; }
