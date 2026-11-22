/* ═══════════════════════════════════════════════════════════════════════
   VIGILANT — cover sequence
   • CPU finite-difference water surface (wave equation), uploaded as R16F
   • GLSL refraction / dispersion / specular on a procedural gradient
   • Runtime signed-distance-field wordmark that dissolves into a portal
   ═══════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const coverEl = document.getElementById("cover");
  const canvas = document.getElementById("scene");
  const hintEl = document.getElementById("hint");
  const wordmarkEl = document.getElementById("heroWordmark");
  const root = document.documentElement;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const forced = parseFloat(new URLSearchParams(location.search).get("p"));

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const damp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => {
    const t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };

  /* ─────────────────────────── shaders ─────────────────────────── */

  const VERT = `#version 300 es
  precision highp float;
  in vec2 aPos;
  out vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }`;

  const FRAG = `#version 300 es
  precision highp float;
  in vec2 vUv;
  out vec4 fragColor;

  uniform vec2  uRes;
  uniform float uAspect;
  uniform float uTime;
  uniform sampler2D uH;
  uniform vec2  uTexel;
  uniform sampler2D uSdf;
  uniform vec2  uInkMin;
  uniform vec2  uInkMax;
  uniform float uSdfRange;
  uniform vec2  uTextSize;
  uniform vec2  uTextCenter;
  uniform float uZoom;
  uniform float uTextAlpha;
  uniform float uCoverAlpha;
  uniform float uGlow;
  uniform float uProgress;
  uniform float uHasSdf;

  uniform float uDebug;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float fall(float d, float r0, float r1) { return 1.0 - smoothstep(r0, r1, d); }

  /* ── stepped purple fan: layered panels rising left → right over near-black ── */
  vec3 gradientBg(vec2 uv) {
    float t = uTime;
    vec2 cp = vec2(uv.x * 1600.0, (1.0 - uv.y) * 1000.0);

    vec3 col = vec3(0.012, 0.009, 0.030);

    for (int i = 0; i < 13; i++) {
      float fi = float(i);
      float a = radians(-6.0 + 0.4 * fi) + 0.0018 * sin(t * 0.05 + fi * 0.7);
      float ca = cos(a);
      float sa = sin(a);
      vec2 c0 = vec2(-60.0 + 110.0 * fi, 690.0 - 55.0 * fi);
      vec2 d = cp - c0;
      vec2 q = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y);

      vec2 hs = vec2(410.0, 500.0);
      vec2 rq = abs(q - hs) - (hs - 32.0);
      float dist = length(max(rq, 0.0)) + min(max(rq.x, rq.y), 0.0) - 32.0;

      if (dist < 0.0) {
        float k = clamp(1.0 - abs(fi - 7.0) / 7.5, 0.0, 1.0);
        vec3 cDark = vec3(0.040, 0.016, 0.075);
        vec3 cBase = mix(vec3(0.075, 0.030, 0.140), vec3(0.231, 0.059, 0.431), k);
        float vt = clamp(q.y / 1000.0, 0.0, 1.0);
        vec3 cc = mix(cDark, cBase, smoothstep(0.0, 0.12, vt));

        /* dark seam along the exposed edge of the panel */
        cc *= mix(0.32, 1.0, smoothstep(0.0, 4.0, -dist));
        col = cc;
      }
    }

    /* pooled violet light behind the wordmark */
    float hd = length((uv - vec2(0.46, 0.50)) * vec2(uAspect * 0.86, 1.0));
    col += vec3(0.055, 0.038, 0.115) * exp(-hd * hd * 4.2);

    /* dark edges, deep bottom */
    float vd = length((uv - vec2(0.55, 0.52)) * vec2(1.28, 1.0));
    col *= mix(0.26, 1.0, 1.0 - smoothstep(0.30, 0.94, vd));
    col *= mix(1.0, 0.10, 1.0 - smoothstep(0.0, 0.40, uv.y));

    return col;
  }

  void main() {
    vec2 uv = vUv;
    vec2 t = uTexel;

    float hl = texture(uH, uv - vec2(t.x, 0.0)).r;
    float hr = texture(uH, uv + vec2(t.x, 0.0)).r;
    float hd = texture(uH, uv - vec2(0.0, t.y)).r;
    float hu = texture(uH, uv + vec2(0.0, t.y)).r;

    float nx = (hl - hr) * 2.8;
    float ny = (hu - hd) * 2.8;

    float sw = uTime;
    nx += cos(uv.x * 9.0 + sw * 0.52) * sin(uv.y * 6.5 - sw * 0.37) * 0.055;
    ny += sin(uv.x * 7.5 + sw * 0.44) * cos(uv.y * 8.0 - sw * 0.31) * 0.055;

    vec3 n = normalize(vec3(nx, ny, 1.0));

    if (uDebug > 0.5 && uDebug < 1.5) { fragColor = vec4(gradientBg(uv), 1.0); return; }
    if (uDebug > 1.5 && uDebug < 2.5) { fragColor = vec4(n * 0.5 + 0.5, 1.0); return; }
    if (uDebug > 2.5 && uDebug < 3.5) { fragColor = vec4(vec3(hl, hr, hd), 1.0); return; }

    vec2 refr = n.xy * 0.085;
    vec3 scene;
    scene.r = gradientBg(clamp(uv + refr * 1.07, 0.0, 1.0)).r;
    scene.g = gradientBg(clamp(uv + refr * 1.00, 0.0, 1.0)).g;
    scene.b = gradientBg(clamp(uv + refr * 0.93, 0.0, 1.0)).b;

    vec3 L = normalize(vec3(-0.42, 0.62, 0.66));
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    float ndh = max(dot(n, H), 0.0);
    float spec = pow(ndh, 420.0) * 1.15 + pow(ndh, 40.0) * 0.09;
    scene += vec3(0.62, 0.78, 1.0) * spec;

    float fres = pow(1.0 - max(n.z, 0.0), 6.0);
    scene += vec3(0.42, 0.55, 1.0) * fres * 0.10;

    float caust = pow(max(0.0, 1.0 - length(n.xy) * 4.0), 5.0);
    scene += vec3(0.45, 0.65, 1.0) * caust * 0.05;

    float vig = 1.0 - smoothstep(0.28, 1.30, length((uv - 0.5) * vec2(uAspect, 1.0)));
    scene *= mix(0.82, 1.02, vig);
    scene += (hash21(uv * uRes + fract(uTime)) - 0.5) * 0.016;

    /* ── wordmark portal ── */
    vec2 p = vec2((uv.x - 0.5) * uAspect, uv.y - 0.5);
    vec2 q = (p - uTextCenter) / uZoom;
    vec2 s = q / uTextSize + 0.5;
    vec2 suv = mix(uInkMin, uInkMax, s);
    float enc = texture(uSdf, suv).r;
    float d = (enc * 2.0 - 1.0) * uSdfRange;

    float w = max(fwidth(d) * 0.9, 0.0006);
    float fill = 1.0 - smoothstep(-w, w, d);
    if (uHasSdf < 0.5) { d = 64.0; fill = 0.0; w = 0.0006; }
    if (uDebug > 3.5 && uDebug < 4.5) { fragColor = vec4(vec3(fill), 1.0); return; }
    if (uDebug > 4.5 && uDebug < 5.5) { fragColor = vec4(texture(uSdf, suv).rrr, 1.0); return; }

    float portal = smoothstep(0.10, 0.80, 1.0 - uTextAlpha);
    /* the world behind the glass settles down as the letters open up */
    scene *= mix(1.0, 0.74, portal);

    float rim = exp(-max(d, 0.0) / 2.4);
    float lip = exp(-max(-d, 0.0) / 2.6);
    float meniscus = exp(-abs(d) / 1.9);

    vec3 glassTint = mix(vec3(0.80, 0.855, 1.0), vec3(1.0), smoothstep(0.15, 0.92, uv.y));
    vec3 textCol = glassTint;
    textCol += mix(vec3(0.85, 0.92, 1.0) * 0.55, vec3(1.0) * 0.30, portal) * rim;
    textCol += vec3(1.0) * meniscus * 0.10 * portal;
    textCol += vec3(0.92, 0.96, 1.0) * lip * 0.07 * portal;

    float glow = exp(-max(d, 0.0) / 16.0) * (1.0 - fill);
    scene += vec3(0.42, 0.52, 1.0) * glow * 0.14 * uGlow;
    scene += vec3(0.55, 0.66, 1.0) * rim * 0.24 * uCoverAlpha * (1.0 - fill * 0.55);

    float ta = fill * uTextAlpha;
    float ca = uCoverAlpha;

    /* ── what the letterforms reveal: the page, seen through liquid glass ── */
    vec3 pageCol;
    pageCol.r = gradientBg(clamp(uv + refr * 2.95, 0.0, 1.0)).r;
    pageCol.g = gradientBg(clamp(uv + refr * 2.35, 0.0, 1.0)).g;
    pageCol.b = gradientBg(clamp(uv + refr * 1.80, 0.0, 1.0)).b;
    pageCol += vec3(0.62, 0.72, 1.0) * spec * 1.25;
    pageCol += vec3(0.55, 0.75, 1.0) * caust * 0.35;
    vec2 pdl = p - uTextCenter;
    pageCol += vec3(0.40, 0.32, 0.92) * exp(-dot(pdl, pdl) / (uTextSize.x * uTextSize.x * 0.55)) * (0.10 + 0.45 * portal);
    /* light passing through the thickness of the glass */
    pageCol *= 1.0 + (0.22 * (s.y - 0.45) + 0.05) * portal;
    pageCol *= mix(1.0, 1.06, portal);

    float innerA = ca;

    vec3 straight = mix(scene, pageCol, fill);
    straight = mix(straight, textCol, ta);
    straight += vec3(0.72, 0.84, 1.0) * meniscus * 0.28 * portal * (1.0 - fill) * uCoverAlpha;
    float alpha = mix(ca, innerA, fill);

    fragColor = vec4(straight * alpha, alpha);
  }`;

  /* ───────────────────── signed distance field ───────────────────── */

  function edt(mask, w, h) {
    const N = w * h;
    const gx = new Int32Array(N);
    const gy = new Int32Array(N);
    const INF = 1 << 14;
    for (let i = 0; i < N; i++) {
      if (mask[i]) { gx[i] = 0; gy[i] = 0; }
      else { gx[i] = INF; gy[i] = INF; }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let bx = gx[i], by = gy[i];
        let best = bx * bx + by * by;
        if (x > 0) {
          const dx = gx[i - 1] - 1, dy = gy[i - 1], dd = dx * dx + dy * dy;
          if (dd < best) { best = dd; bx = dx; by = dy; }
        }
        if (y > 0) {
          const dx = gx[i - w], dy = gy[i - w] - 1, dd = dx * dx + dy * dy;
          if (dd < best) { best = dd; bx = dx; by = dy; }
        }
        if (x > 0 && y > 0) {
          const dx = gx[i - w - 1] - 1, dy = gy[i - w - 1] - 1, dd = dx * dx + dy * dy;
          if (dd < best) { best = dd; bx = dx; by = dy; }
        }
        if (x < w - 1 && y > 0) {
          const dx = gx[i - w + 1] + 1, dy = gy[i - w + 1] - 1, dd = dx * dx + dy * dy;
          if (dd < best) { best = dd; bx = dx; by = dy; }
        }
        gx[i] = bx; gy[i] = by;
      }
    }
    for (let y = h - 1; y >= 0; y--) {
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x;
        let bx = gx[i], by = gy[i];
        let best = bx * bx + by * by;
        if (x < w - 1) {
          const dx = gx[i + 1] + 1, dy = gy[i + 1], dd = dx * dx + dy * dy;
          if (dd < best) { best = dd; bx = dx; by = dy; }
        }
        if (y < h - 1) {
          const dx = gx[i + w], dy = gy[i + w] + 1, dd = dx * dx + dy * dy;
          if (dd < best) { best = dd; bx = dx; by = dy; }
        }
        if (x < w - 1 && y < h - 1) {
          const dx = gx[i + 1 + w] + 1, dy = gy[i + 1 + w] + 1, dd = dx * dx + dy * dy;
          if (dd < best) { best = dd; bx = dx; by = dy; }
        }
        if (x > 0 && y < h - 1) {
          const dx = gx[i - 1 + w] - 1, dy = gy[i - 1 + w] + 1, dd = dx * dx + dy * dy;
          if (dd < best) { best = dd; bx = dx; by = dy; }
        }
        gx[i] = bx; gy[i] = by;
      }
    }
    const out = new Float32Array(N);
    for (let i = 0; i < N; i++) out[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
    return out;
  }

  function buildSDF(text, family, weight, size, trackingEm) {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d", { willReadFrequently: true });
    const applyFont = (fontSize) => {
      ctx.font = `${weight} ${fontSize}px ${family}`;
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${trackingEm * fontSize}px`;
    };

    applyFont(size);
    let adv = ctx.measureText(text).width;
    let fs = size;
    const padRatio = 0.26;
    let pad = fs * padRatio;
    let w = Math.ceil(adv + pad * 2);
    let h = Math.ceil(fs * 1.28 + pad * 2);
    const MAXDIM = 2048;
    if (w > MAXDIM) {
      const k = MAXDIM / w;
      fs = Math.floor(fs * k);
      applyFont(fs);
      adv = ctx.measureText(text).width;
      pad = fs * padRatio;
      w = Math.ceil(adv + pad * 2);
      h = Math.ceil(fs * 1.28 + pad * 2);
    }
    c.width = w;
    c.height = h;
    applyFont(fs);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.fillText(text, w / 2, h / 2 + fs * 0.015);

    const px = ctx.getImageData(0, 0, w, h).data;
    const inside = new Uint8Array(w * h);
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let i = 0, j = 3; i < inside.length; i++, j += 4) {
      const on = px[j] > 127 ? 1 : 0;
      inside[i] = on;
      if (on) {
        const x = i % w, y = (i / w) | 0;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < 0) {
      minX = 0; minY = 0; maxX = w - 1; maxY = h - 1;
    }

    const outside = new Uint8Array(w * h);
    for (let i = 0; i < outside.length; i++) outside[i] = inside[i] ? 0 : 1;

    const dIn = edt(inside, w, h);
    const dOut = edt(outside, w, h);

    const R = 26;
    const data = new Uint8Array(w * h * 4);
    for (let i = 0; i < inside.length; i++) {
      const sd = dIn[i] - dOut[i]; // negative inside
      const v = Math.max(0, Math.min(255, Math.round(128 + (sd / R) * 127)));
      data[i * 4] = v;
      data[i * 4 + 3] = 255;
    }

    const inkW = maxX - minX + 1;
    const inkH = maxY - minY + 1;
    if (!isNaN(forced)) {
      window.__sdfPreview = c.toDataURL("image/png");
    }
    return {
      width: w,
      height: h,
      data,
      adv,
      inkW,
      inkH,
      range: R,
      inkMin: [minX / w, (maxY + 1) / h],
      inkMax: [(maxX + 1) / w, minY / h],
      family,
      weight,
    };
  }

  /* ─────────────────────────── app ─────────────────────────── */

  let finished = false;
  let raf = 0;
  let debugFreeze = false;
  let revealed = false;
  let hideTimer = 0;

  function revealPage() {
    if (revealed) return;
    revealed = true;
    finished = true;
    cancelAnimationFrame(raf);
    raf = 0;
    coverEl.classList.add("is-gone");
    document.body.classList.remove("locked");
    root.style.setProperty("--p", "1");
    root.style.setProperty("--aura", "0.22");
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (revealed) coverEl.classList.add("is-hidden");
    }, 900);
  }

  if (reduced) {
    revealPage();
    return;
  }

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: !isNaN(forced),
    powerPreference: "high-performance",
  });

  if (!gl) {
    revealPage();
    return;
  }

  history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(s), src);
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) {
    revealPage();
    return;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.bindAttribLocation(prog, 0, "aPos");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    revealPage();
    return;
  }
  gl.useProgram(prog);

  const U = {};
  const names = [
    "uRes", "uAspect", "uTime", "uH", "uTexel", "uSdf", "uInkMin", "uInkMax",
    "uSdfRange", "uTextSize", "uTextCenter", "uZoom", "uTextAlpha",
    "uCoverAlpha", "uGlow", "uProgress", "uHasSdf",
  ];
  names.forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
  U.uDebug = gl.getUniformLocation(prog, "uDebug");

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);

  /* height texture */
  const hTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, hTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, 1, 1, 0, gl.RED, gl.FLOAT, new Float32Array(1));
  let simEnabled = gl.getError() === gl.NO_ERROR;

  /* sdf texture */
  const sTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, sTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 0, 0, 255]));

  gl.useProgram(prog);
  gl.uniform1i(U.uH, 0);
  gl.uniform1i(U.uSdf, 1);

  /* ── water grid ── */
  const sim = { nx: 0, ny: 0, cur: null, prev: null, next: null, aspect: 1 };

  function rebuildSim() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const aspect = vw / vh;
    const ny = 190;
    const nx = Math.max(64, Math.min(420, Math.round(ny * aspect)));
    sim.nx = nx;
    sim.ny = ny;
    sim.aspect = aspect;
    sim.cur = new Float32Array(nx * ny);
    sim.prev = new Float32Array(nx * ny);
    sim.next = new Float32Array(nx * ny);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, hTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16F, nx, ny, 0, gl.RED, gl.FLOAT, sim.cur);
  }

  function addDrop(u, v, strength, radius) {
    const { nx, ny, cur } = sim;
    const cx = u * nx;
    const cy = v * ny;
    const rx = Math.max(1, (radius / sim.aspect) * nx);
    const ry = Math.max(1, radius * ny);
    const x0 = Math.max(0, Math.floor(cx - rx * 3));
    const x1 = Math.min(nx - 1, Math.ceil(cx + rx * 3));
    const y0 = Math.max(0, Math.floor(cy - ry * 3));
    const y1 = Math.min(ny - 1, Math.ceil(cy + ry * 3));
    for (let y = y0; y <= y1; y++) {
      const dy = (y - cy) / ry;
      const row = y * nx;
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / rx;
        cur[row + x] += strength * Math.exp(-(dx * dx + dy * dy) * 2.0);
      }
    }
  }

  function stepSim() {
    const { nx, ny, cur, prev, next } = sim;
    const d = 0.9964;
    for (let y = 1; y < ny - 1; y++) {
      const o = y * nx;
      for (let x = 1; x < nx - 1; x++) {
        const i = o + x;
        next[i] = ((cur[i - 1] + cur[i + 1] + cur[i - nx] + cur[i + nx]) * 0.5 - prev[i]) * d;
      }
    }
    for (let x = 0; x < nx; x++) {
      next[x] = 0;
      next[(ny - 1) * nx + x] = 0;
    }
    for (let y = 0; y < ny; y++) {
      next[y * nx] = 0;
      next[y * nx + nx - 1] = 0;
    }
    sim.prev = cur;
    sim.cur = next;
    sim.next = prev;
  }

  /* ── sizing ── */
  let sdf = null;
  let targetSize = [0.6, 0.1];
  let targetCenter = [0, 0];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    rebuildSim();
    measureTarget();
  }

  function measureTarget() {
    if (!sdf) return;
    const r = wordmarkEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const inkScale = sdf.inkW / sdf.adv;
    const inkW = Math.max(1, r.width * inkScale);
    const inkH = inkW * (sdf.inkH / sdf.inkW);
    targetSize = [inkW / vh, inkH / vh];
    targetCenter = [
      (r.left + r.width / 2 - vw / 2) / vh,
      (vh / 2 - (r.top + r.height / 2)) / vh,
    ];
  }

  /* ── text ── */
  function makeSdf() {
    const cs = getComputedStyle(wordmarkEl);
    const family = cs.fontFamily || "Inter, sans-serif";
    sdf = buildSDF("VIGILANT", family, 900, 190, -0.045);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sTex);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, sdf.width, sdf.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, sdf.data);
    gl.uniform2f(U.uInkMin, sdf.inkMin[0], sdf.inkMin[1]);
    gl.uniform2f(U.uInkMax, sdf.inkMax[0], sdf.inkMax[1]);
    gl.uniform1f(U.uSdfRange, sdf.range);
  }

  function loadFonts() {
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      window.setTimeout(finish, 1500);
      try {
        if (document.fonts && document.fonts.load) {
          document.fonts.load("900 120px Inter").then(() => window.setTimeout(finish, 60), finish);
        } else {
          finish();
        }
      } catch (e) {
        finish();
      }
    });
  }

  function boot() {
    resize();
    start();

    loadFonts().then(() => {
      try {
        makeSdf();
      } catch (e) {
        console.warn("sdf failed", e);
        revealPage();
        return;
      }
      resize();
      addDrop(0.5, 0.52, 0.16, 0.07);
      addDrop(0.2, 0.8, 0.09, 0.05);
      addDrop(0.8, 0.2, 0.08, 0.045);
    });
  }

  /* ── interaction + timeline ── */
  let progress = 0;
  let target = 0;
  let intro = 0;
  let last = performance.now();
  let elapsed = 0;
  let nextAmbient = 0;
  let pointer = null;
  let lastDrop = 0;
  let touchY = null;
  let hintAway = false;

  if (!isNaN(forced)) {
    target = clamp01(forced);
    progress = target;
    intro = 1;
  }

  function nudge(targetValue) {
    target = clamp01(targetValue);
    if (target > 0.03) dismissHint();
  }

  /* bring the fluid cover back when the visitor pulls up from the top of the page */
  function reenter(seed) {
    if (!revealed) return;
    revealed = false;
    finished = false;
    clearTimeout(hideTimer);
    coverEl.classList.remove("is-hidden");
    void coverEl.offsetWidth;
    coverEl.classList.remove("is-gone");
    document.body.classList.add("locked");
    window.scrollTo(0, 0);
    progress = 1;
    target = Math.min(0.985, clamp01(1 + seed));
    root.style.setProperty("--p", "1");
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function dismissHint() {
    if (hintAway) return;
    hintAway = true;
    hintEl.classList.add("is-away");
  }

  function onWheel(e) {
    if (revealed) {
      if (window.scrollY <= 0 && e.deltaY < 0) {
        e.preventDefault();
        reenter(e.deltaY / 1450);
      }
      return;
    }
    e.preventDefault();
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 26;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    nudge(target + dy / 1450);
    const now = performance.now();
    if (now - lastDrop > 90) {
      addDrop(0.5 + (Math.random() - 0.5) * 0.5, 0.35, 0.03, 0.05);
      lastDrop = now;
    }
  }

  function onTouchStart(e) {
    touchY = e.touches[0].clientY;
  }

  function onTouchMove(e) {
    if (touchY === null) return;
    const y = e.touches[0].clientY;
    if (revealed) {
      if (window.scrollY <= 0 && y - touchY > 10) {
        e.preventDefault();
        reenter((touchY - y) / 950);
      }
      touchY = y;
      return;
    }
    e.preventDefault();
    nudge(target + (touchY - y) / 950);
    touchY = y;
  }

  function onTouchEnd() { touchY = null; }

  function onKey(e) {
    if (revealed) {
      const up = e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home";
      if (up && window.scrollY <= 0) {
        e.preventDefault();
        reenter(-0.14);
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      nudge(target + 0.12);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      nudge(target - 0.12);
    } else if (e.key === "Enter") {
      nudge(1);
    } else if (e.key === "Escape") {
      nudge(1);
    }
  }

  function onPointerMove(e) {
    const r = canvas.getBoundingClientRect();
    const u = (e.clientX - r.left) / r.width;
    const v = 1 - (e.clientY - r.top) / r.height;
    const now = performance.now();
    if (pointer !== null && now - lastDrop > 26) {
      const dx = u - pointer[0];
      const dy = v - pointer[1];
      const speed = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 30);
      if (speed > 0.03) {
        addDrop(u, v, 0.05 + speed * 0.22, 0.035 + speed * 0.02);
        lastDrop = now;
      }
    }
    pointer = [u, v];

    /* Update scale highlight position for cover background */
    const highlight = document.querySelector(".scale-highlight");
    if (highlight && !revealed) {
      highlight.style.left = e.clientX + "px";
      highlight.style.top = e.clientY + "px";
      highlight.style.opacity = "0.45";
    }
  }

  function onPointerDown(e) {
    const r = canvas.getBoundingClientRect();
    addDrop((e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height, 0.55, 0.075);
  }

  function onPointerLeave() {
    pointer = null;
    const highlight = document.querySelector(".scale-highlight");
    if (highlight) highlight.style.opacity = "0";
  }

  function bind(on) {
    const m = on ? "addEventListener" : "removeEventListener";
    window[m]("wheel", onWheel, { passive: false });
    window[m]("touchstart", onTouchStart, { passive: true });
    window[m]("touchmove", onTouchMove, { passive: false });
    window[m]("touchend", onTouchEnd, { passive: true });
    window[m]("keydown", onKey);
    window[m]("resize", resize);
    canvas[m]("pointermove", onPointerMove);
    canvas[m]("pointerdown", onPointerDown);
    canvas[m]("pointerleave", onPointerLeave);
    hintEl[m]("click", skip);
  }

  function skip() { nudge(1); }

  function finish() {
    revealPage();
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (finished || debugFreeze) return;

    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;
    intro = Math.min(1, intro + dt / 1.45);

    progress += (target - progress) * Math.min(1, dt * 5.2);
    if (Math.abs(target - progress) < 0.0004) progress = target;

    const p = progress;
    const introEase = 1 - Math.pow(1 - intro, 3);
    const { zoom, textAlpha, coverAlpha } = curves(p);
    const zoomIn = zoom * (1 + 0.055 * (1 - introEase));
    const textIn = textAlpha * introEase;

    if (p > 0.995 && target > 0.995) {
      finish();
      return;
    }

    if (p > 0.03) dismissHint();
    else if (hintAway) {
      hintAway = false;
      hintEl.classList.remove("is-away");
    }
    if (p < 0.9) {
      if (elapsed > nextAmbient) {
        addDrop(0.08 + Math.random() * 0.84, 0.12 + Math.random() * 0.5, 0.015 + Math.random() * 0.035, 0.025 + Math.random() * 0.03);
        nextAmbient = elapsed + 0.55 + Math.random() * 1.6;
      }
      stepSim();
      if (simEnabled) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, hTex);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, sim.nx, sim.ny, gl.RED, gl.FLOAT, sim.cur);
      }
    }

    root.style.setProperty("--p", p.toFixed(4));
    const pulse = smoothstep(0.12, 0.42, p) * (1 - smoothstep(0.8, 1, p));
    root.style.setProperty("--aura", (0.22 + 0.6 * pulse).toFixed(3));
    drawFrame(zoomIn, textIn, coverAlpha);
  }

  function curves(p) {
    return {
      zoom: 1 + 4.6 * Math.pow(p, 2.25),
      textAlpha: 1 - smoothstep(0.26, 0.70, p),
      coverAlpha: 1 - smoothstep(0.66, 0.985, p),
    };
  }

  function drawFrame(zoom, textAlpha, coverAlpha, dbg) {
    const w = canvas.width;
    const h = canvas.height;
    gl.useProgram(prog);
    gl.uniform2f(U.uRes, w, h);
    gl.uniform1f(U.uAspect, w / h);
    gl.uniform1f(U.uTime, elapsed);
    gl.uniform2f(U.uTexel, 1 / sim.nx, 1 / sim.ny);
    gl.uniform2f(U.uTextSize, targetSize[0], targetSize[1]);
    gl.uniform2f(U.uTextCenter, targetCenter[0], targetCenter[1]);
    gl.uniform1f(U.uZoom, zoom);
    gl.uniform1f(U.uTextAlpha, textAlpha);
    gl.uniform1f(U.uCoverAlpha, coverAlpha);
    gl.uniform1f(U.uGlow, textAlpha);
    gl.uniform1f(U.uProgress, progress);
    gl.uniform1f(U.uHasSdf, sdf ? 1 : 0);
    gl.uniform1f(U.uDebug, dbg || 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, hTex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, sTex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function start() {
    bind(true);
    last = performance.now();
    if (!isNaN(forced)) {
      revealed = true; // Landing page features should work
      bind(false);
      raf = requestAnimationFrame(tick);
      return;
    }
    raf = requestAnimationFrame(tick);
  }

  boot();


  if (!isNaN(forced)) {
    window.__vig = {
      draw(pv, dbg) {
        const p = clamp01(pv);
        debugFreeze = true;
        progress = p;
        target = p;
        intro = 1;
        elapsed = 2.4;
        const { zoom, textAlpha, coverAlpha } = curves(p);
        drawFrame(zoom, textAlpha, coverAlpha, dbg || 0);
        root.style.setProperty("--p", p.toFixed(4));
        const pulse = smoothstep(0.12, 0.42, p) * (1 - smoothstep(0.8, 1, p));
        root.style.setProperty("--aura", (0.22 + 0.6 * pulse).toFixed(3));
        return { p, zoom, textAlpha, coverAlpha, size: targetSize, center: targetCenter, hasSdf: !!sdf, sim: [sim.nx, sim.ny], ink: sdf ? [sdf.inkMin[0], sdf.inkMin[1], sdf.inkMax[0], sdf.inkMax[1], sdf.inkW, sdf.inkH, sdf.adv, sdf.width, sdf.height] : null };
      },
      sim(n) {
        for (let i = 0; i < (n || 30); i++) stepSim();
        if (simEnabled) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, hTex);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, sim.nx, sim.ny, gl.RED, gl.FLOAT, sim.cur);
        }
      },
      drop(u, v, s, r) { addDrop(u, v, s, r); },
      stats() {
        let m = 0;
        for (let i = 0; i < sim.cur.length; i++) { const v = Math.abs(sim.cur[i]); if (v > m) m = v; }
        return { maxH: m, nx: sim.nx, ny: sim.ny };
      },
      ambient(n) {
        for (let i = 0; i < (n || 6); i++) {
          addDrop(0.1 + Math.random() * 0.8, 0.1 + Math.random() * 0.6, 0.05 + Math.random() * 0.09, 0.022 + Math.random() * 0.02);
          for (let k = 0; k < 12; k++) stepSim();
        }
        if (simEnabled) {
          gl.activeTexture(gl.TEXTURE0);
          gl.bindTexture(gl.TEXTURE_2D, hTex);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, sim.nx, sim.ny, gl.RED, gl.FLOAT, sim.cur);
        }
      },
    };
  }


  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else if (!finished) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  });

  /* ── Nav glass backdrop on inner page scroll ── */
  (function () {
    const navGlass = document.querySelector(".nav-glass");
    if (!navGlass) return;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const show = y > 60 && revealed; // Show after scrolling down on inner page
        navGlass.classList.toggle("visible", show);
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

})();
