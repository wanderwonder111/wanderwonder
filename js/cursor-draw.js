(function () {
  const canvas = document.getElementById("draw-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const strokes = [];
  let px = 0;
  let py = 0;
  let frame = 0;
  let hasPointer = false;
  let mouseX = 0;
  let mouseY = 0;
  let smoothX = 0;
  let smoothY = 0;

  const config = {
    jitter: 2.5,
    noiseAmp: 3.5,
    noiseOffset: 3,
    noiseSpeed: 0.1,
    alpha: 0.45,
    lineWidth: 0.9,
    fadeAfterMs: 3000,
    fadeDurationMs: 2000,
    substeps: 10,
    smoothFactor: 0.5,
  };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function noise1D(x) {
    const i = Math.floor(x);
    const f = x - i;
    const u = f * f * (3 - 2 * f);
    const a = Math.sin((i + 1) * 127.1) * 43758.5453;
    const b = Math.sin((i + 2) * 127.1) * 43758.5453;
    const fa = a - Math.floor(a);
    const fb = b - Math.floor(b);
    return fa * (1 - u) + fb * u;
  }

  function strokeAlpha(age) {
    if (age >= config.fadeAfterMs) return 0;

    const fadeStart = config.fadeAfterMs - config.fadeDurationMs;
    if (age <= fadeStart) return config.alpha;

    const progress = (age - fadeStart) / config.fadeDurationMs;
    return config.alpha * (1 - progress);
  }

  function addStroke(x1, y1, x2, y2, t) {
    const steps = config.substeps;
    let lx = x1;
    let ly = y1;

    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const jx = (Math.random() - 0.5) * config.jitter * 0.65;
      const jy = (Math.random() - 0.5) * config.jitter * 0.08;
      const nx = x1 + (x2 - x1) * p + jx;
      const ny = y1 + (y2 - y1) * p + jy;
      strokes.push({ x1: lx, y1: ly, x2: nx, y2: ny, t });
      lx = nx;
      ly = ny;
    }
  }

  function pruneStrokes(now) {
    let i = 0;
    while (i < strokes.length) {
      if (now - strokes[i].t >= config.fadeAfterMs) {
        strokes.splice(i, 1);
      } else {
        i += 1;
      }
    }
  }

  function redraw() {
    const now = performance.now();
    pruneStrokes(now);

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.lineWidth = config.lineWidth;

    for (let i = 0; i < strokes.length; i++) {
      const s = strokes[i];
      const a = strokeAlpha(now - s.t);
      if (a <= 0) continue;

      ctx.strokeStyle = `rgba(0, 0, 0, ${a})`;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
  }

  function tick() {
    frame += 1;

    if (hasPointer && mouseX !== 0 && mouseY !== 0 && px !== 0 && py !== 0) {
      smoothX += (mouseX - smoothX) * config.smoothFactor;
      smoothY += (mouseY - smoothY) * config.smoothFactor;

      const n = (Math.random() - 0.5) * config.jitter;
      const wobble =
        (noise1D(frame * config.noiseSpeed) - 0.5) * 2 * config.noiseAmp;
      const x = smoothX - config.noiseOffset + wobble + n;
      const y = smoothY + n * 0.1;
      const t = performance.now();

      addStroke(px, py, x, y, t);
      px = x;
      py = y;
    }

    redraw();
    requestAnimationFrame(tick);
  }

  document.addEventListener(
    "mousemove",
    (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!hasPointer) {
        px = mouseX;
        py = mouseY;
        smoothX = mouseX;
        smoothY = mouseY;
        hasPointer = true;
      }
    },
    { passive: true }
  );

  document.addEventListener(
    "mouseleave",
    () => {
      hasPointer = false;
      px = 0;
      py = 0;
    },
    { passive: true }
  );

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();