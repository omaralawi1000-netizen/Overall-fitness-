// Sand: every number on the workout screen is made of grains, and every finished set becomes a layer of sand.
//
// How it stays cheap: each grain stores where it was, how fast it moved and where it is going. The vertex shader works
// out its position from the time alone (a critically damped spring, or a fall with gravity and air drag), so the CPU only
// writes grains when something happens (a tick, a digit changing, an edit). Grains that land are drawn once into a
// "ground" texture and then forgotten, so the pile can grow forever at no cost.

const FAMILY = 'Archivo';
const STRIDE = 24;            // floats per grain
const BLOCK = 7000;           // grains per character
const NBLOCK = 12;
const RING = 26000;           // grains in the air
const CAP = BLOCK * NBLOCK + RING;
const COLW = 2;               // width of one heightfield column, css px
const K = 1.35;               // air drag, 1/s
const G = 1500;               // gravity, css px/s²
const SPACING = 1.18;         // grain spacing inside a glyph, css px
const SLOPE = 0.55;           // steepest step between two columns before sand slides

// ---------- shaders ----------

const VS_FULL = `#version 300 es
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2. - 1., 0., 1.); }`;

const FS_SKY = `#version 300 es
precision highp float;
uniform vec2 u_css; uniform float u_dpr;
uniform vec3 u_zen, u_mid, u_low, u_glow, u_pore;
uniform float u_glowAmt, u_horY;
uniform highp sampler2D u_hl; uniform int u_ncol;
out vec4 o;
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(.06711056, .00583715)))); }
float hl(float x){
  float c = x / ${COLW}. - .5; float i = floor(c); float f = c - i;
  float a = texelFetch(u_hl, ivec2(clamp(int(i), 0, u_ncol - 1), 0), 0).r;
  float b = texelFetch(u_hl, ivec2(clamp(int(i) + 1, 0, u_ncol - 1), 0), 0).r;
  return mix(a, b, f);
}
void main(){
  vec2 p = vec2(gl_FragCoord.x, u_css.y * u_dpr - gl_FragCoord.y) / u_dpr;
  float t = clamp(p.y / u_horY, 0., 1.);
  vec3 c = mix(u_zen, u_mid, smoothstep(0., .62, t));
  c = mix(c, u_low, smoothstep(.42, 1., t) * smoothstep(.42, 1., t));
  vec2 d = (p - vec2(u_css.x * .5, u_horY + 14.)) / vec2(u_css.x * .9, u_css.y * .15);
  c += u_glow * exp(-dot(d, d) * 1.6) * u_glowAmt;
  vec2 d2 = (p - vec2(u_css.x * .5, u_horY)) / vec2(u_css.x * 1.6, u_css.y * .5);
  c += u_glow * .14 * exp(-dot(d2, d2) * 2.) * u_glowAmt;
  float below = p.y - (u_css.y - hl(p.x));
  if (below > .8) c = mix(u_pore, u_pore * .5, clamp(below / 160., 0., 1.));
  c += (ign(gl_FragCoord.xy) - .5) * (1.6 / 255.);
  o = vec4(c, 1.);
}`;

const FS_TEX = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
out vec4 o;
void main(){ o = texelFetch(u_tex, ivec2(gl_FragCoord.xy), 0); }`;

const VS_GRAIN = `#version 300 es
precision highp float;
layout(location=0) in vec4 a0; // from.xyz, t0
layout(location=1) in vec4 a1; // vel.xyz, mode: 0 hidden, 1 spring, 2 fall, 3 dissolve
layout(location=2) in vec4 a2; // to.xyz, landing time (fall) or fade length (dissolve)
layout(location=3) in vec4 a3; // normal from .xy, normal to .zw
layout(location=4) in vec4 a4; // palette (0 = the number itself), spring speed, fade-in, layer shade
layout(location=5) in vec4 a5; // size, tone, phase, glint
uniform float u_now, u_dpr, u_rot, u_persp, u_heat, u_spec;
uniform vec2 u_css, u_figC, u_win;
uniform int u_pass;
uniform vec3 u_alb, u_emit, u_light, u_amb;
uniform vec3 u_pal[16];
out vec4 v_col; out float v_soft;

void hide(){ gl_Position = vec4(-3., -3., 0., 1.); gl_PointSize = 0.; v_col = vec4(0.); v_soft = 1.; }
vec3 rotY(vec3 v, float a){ float c = cos(a), s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }
vec3 unpack(vec2 n){ return vec3(n, sqrt(max(0., 1. - dot(n, n)))); }

void main(){
  float mode = a1.w;
  if (mode < .5) { hide(); return; }
  float t = u_now - a0.w;
  vec3 p; vec3 n = vec3(0., 0., 1.);
  float alpha = 1.; float look = 0.;
  if (u_pass == 1) {
    if (mode < 1.5 || mode > 2.5 || a2.w <= u_win.x || a2.w > u_win.y) { hide(); return; }
    p = vec3(a2.xy, 0.); look = 1.;
  } else if (mode < 1.5 || mode > 2.5) {
    float w = a4.y, tt = max(t, 0.), e = exp(-w * tt);
    vec3 d = a0.xyz - a2.xyz;
    p = a2.xyz + (d + (a1.xyz + w * d) * tt) * e;
    n = unpack(mix(a3.xy, a3.zw, 1. - (1. + w * tt) * e));
    if (a4.z > 0.) alpha *= smoothstep(0., a4.z, t);
    if (mode > 2.5) { alpha *= 1. - smoothstep(0., a2.w, tt); if (alpha <= .003) { hide(); return; } }
    if (a4.x < .5) {
      p = rotY(p - vec3(u_figC, 0.), u_rot) + vec3(u_figC, 0.);
      n = rotY(n, u_rot);
    } else look = 1.;
  } else {
    if (u_now >= a2.w) { hide(); return; }
    if (t <= 0.) { p = a0.xyz; n = unpack(a3.zw); }
    else {
      vec3 vt = vec3(0., ${G}. / ${K}, 0.);
      p = a0.xyz + vt * t + (a1.xyz - vt) * (1. - exp(-${K} * t)) / ${K};
      look = smoothstep(0., .5, t);
      n = unpack(a3.zw * (1. - look));
    }
  }
  if (u_pass == 2 && (a4.x > .5 || mode > 1.5 || gl_VertexID % 14 != 0)) { hide(); return; }

  float sc = u_persp / max(u_persp - p.z, 1.);
  vec2 c0 = vec2(u_css.x * .5, u_figC.y);
  vec2 sp = c0 + (p.xy - c0) * sc;
  gl_Position = vec4(sp.x / u_css.x * 2. - 1., 1. - sp.y / u_css.y * 2., 0., 1.);
  float dof = abs(p.z) * .028;
  float sz = a5.x * sc * (1. + dof) * (u_pass == 1 ? 1.12 : 1.);

  vec3 L = normalize(u_light);
  vec3 alb = u_alb * (.78 + .44 * a5.y);
  vec3 fig = alb * (u_amb + max(dot(n, L), 0.) * vec3(1., .92, .8));
  fig += u_spec * pow(max(dot(n, normalize(L + vec3(0., 0., 1.))), 0.), 22.) * vec3(1., .88, .62);
  fig += u_emit * u_heat * (.45 + .55 * a5.y);
  if (a5.w > .5) fig += vec3(1., .95, .86) * pow(max(0., sin(u_now * (.9 + a5.z * .5) + a5.z * 41.)), 28.) * (.55 + u_spec);
  int pi = int(a4.x + .5);
  vec3 lay = u_pal[pi] * (.76 + .48 * a5.y) * (u_pass == 1 ? a4.w : 1.);
  if (a5.w > .5 && pi == 10) lay = mix(lay, vec3(1., .94, .78), .55);
  vec3 col = mix(fig, lay, look);
  alpha /= (1. + dof) * (1. + dof);
  if (u_pass == 2) { sz = 26.; alpha *= .045 * u_heat; col = u_emit; }
  gl_PointSize = clamp(sz * u_dpr, 0., 96.);
  v_soft = u_pass == 2 ? 0. : mix(.42, .82, clamp(dof, 0., 1.));
  v_col = vec4(col * alpha, alpha);
}`;

const FS_GRAIN = `#version 300 es
precision mediump float;
in vec4 v_col; in float v_soft;
out vec4 o;
void main(){
  vec2 q = gl_PointCoord * 2. - 1.;
  float d = dot(q, q);
  float a = v_soft == 0. ? exp(-d * 3.2) * (1. - d) : 1. - smoothstep(v_soft * v_soft, 1., d);
  if (a <= .004) discard;
  o = v_col * a;
}`;

// ---------- small helpers ----------

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(6.2831853 * r()); }

// Position along a Hilbert curve on a 1024 grid: nearby points get nearby numbers, so sorting two clouds by it and
// pairing them in order makes each grain travel a short way.
function hilbert(x, y) {
  const n = 1024;
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) { x = n - 1 - x; y = n - 1 - y; }
      const t = x; x = y; y = t;
    }
  }
  return d;
}

function hilbertOrder(xs, ys, box) {
  const n = xs.length, keys = new Float64Array(n);
  const sx = 1023 / Math.max(1, box[2] - box[0]), sy = 1023 / Math.max(1, box[3] - box[1]);
  for (let i = 0; i < n; i++) {
    const hx = Math.max(0, Math.min(1023, (xs[i] - box[0]) * sx)) | 0;
    const hy = Math.max(0, Math.min(1023, (ys[i] - box[1]) * sy)) | 0;
    keys[i] = hilbert(hx, hy) * 262144 + i;
  }
  keys.sort();
  const out = new Int32Array(n);
  for (let i = 0; i < n; i++) out[i] = keys[i] % 262144;
  return out;
}

// One shape for every grain in flight on the CPU, so the hot loops stay fast.
class Grain {
  constructor(x, y, z, vx, vy, vz, nx, ny, fadeIn, size, tone, phase, glint) {
    this.x = x; this.y = y; this.z = z; this.vx = vx; this.vy = vy; this.vz = vz; this.nx = nx; this.ny = ny;
    this.fadeIn = fadeIn; this.size = size; this.tone = tone; this.phase = phase; this.glint = glint;
  }
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);

// ---------- the renderer ----------

export class Sand {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: true, powerPreference: 'high-performance' });
    if (!gl) throw new Error('webgl2');
    this.gl = gl;
    this.data = new Float32Array(CAP * STRIDE);
    this.dirty = [];
    this.slots = [];
    this.freeBlocks = Array.from({ length: NBLOCK }, (_, i) => NBLOCK - 1 - i);
    this.ring = 0;
    this.glyphs = new Map();
    this.gcan = document.createElement('canvas');
    this.gctx = this.gcan.getContext('2d', { willReadFrequently: true });
    this.r = rng(7);
    this.t0 = performance.now();
    this.lastBake = -1e9;
    this.hlq = [];
    this.hit = { x: 0, y: 0, t: 0, c: 0, h: 0, shade: 1 };
    this.layers = [];
    this.layer = null;
    this.u = { rot: 0, heat: 1, spec: 0.25, alb: hex('#f4d3a1'), emit: hex('#ff9a55'), light: [-0.55, -0.75, 0.7], amb: [0.22, 0.24, 0.42] };
    this.sky = null;
    this.figC = [0, 0];
    this.pal = new Float32Array(48);
    this.anims = new Set();
    this.build();
  }

  now() { return (performance.now() - this.t0) / 1000; }

  build() {
    const gl = this.gl;
    const prog = (vs, fs) => {
      const p = gl.createProgram();
      for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        gl.attachShader(p, s);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {};
      const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) {
        const name = gl.getActiveUniform(p, i).name.replace('[0]', '');
        u[name] = gl.getUniformLocation(p, name);
      }
      return { p, u };
    };
    this.pSky = prog(VS_FULL, FS_SKY);
    this.pTex = prog(VS_FULL, FS_TEX);
    this.pGrain = prog(VS_GRAIN, FS_GRAIN);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 6; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 4, gl.FLOAT, false, STRIDE * 4, i * 16);
    }
    this.empty = gl.createVertexArray();
    this.hlTex = gl.createTexture();
  }

  // Size the canvas and the ground. Called once per scene; the app rebuilds the scene after a real resize.
  resize(cssW, cssH, ground) {
    const gl = this.gl;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.W = cssW; this.H = cssH; this.ground = ground;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.ncol = Math.ceil(cssW / COLW) + 1;
    this.Hf = new Float32Array(this.ncol);   // the surface sand is heading for
    this.HL = new Float32Array(this.ncol);   // the surface sand has reached
    gl.bindTexture(gl.TEXTURE_2D, this.hlTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.ncol, 1, 0, gl.RED, gl.FLOAT, this.HL);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    if (this.fbo) { gl.deleteFramebuffer(this.fbo); gl.deleteTexture(this.fboTex); }
    this.fboTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    this.fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.fboTex, 0);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.data.fill(0);
    this.dirty = [[0, CAP]];
    this.slots = [];
    this.freeBlocks = Array.from({ length: NBLOCK }, (_, i) => NBLOCK - 1 - i);
    this.hlq = [];
    this.layers = [];
    this.layer = null;
    this.lastBake = this.now();
  }

  setPalette(i, h) { this.pal.set(hex(h), i * 3); }

  // ---------- glyphs ----------

  font(size) { return `900 ${size}px ${FAMILY}`; }

  glyph(ch, size) {
    const key = ch + '@' + size;
    let g = this.glyphs.get(key);
    if (g) return g;
    const S = 2, ctx = this.gctx;
    const setFont = (px) => { ctx.font = this.font(px); ctx.fontStretch = 'expanded'; };
    setFont(size * S);
    const adv = ctx.measureText(ch).width / S;
    const pad = Math.ceil(size * 0.1) * S;
    const W = Math.ceil(adv * S) + pad * 2, H = Math.ceil(size * S * 1.22) + pad * 2;
    const base = Math.ceil(size * S * 0.98) + pad;
    this.gcan.width = W; this.gcan.height = H;
    setFont(size * S);
    ctx.fillStyle = '#fff';
    ctx.fillText(ch, pad, base);
    const img = ctx.getImageData(0, 0, W, H).data;
    const A = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) A[i] = img[i * 4 + 3] / 255;
    // two box blurs give a soft relief: it bends the normals at the edges and lifts the middle of each stroke
    const rad = Math.max(2, Math.round(size * S * 0.05));
    const B = boxBlur(boxBlur(A, W, H, rad), W, H, rad);
    const r = rng(ch.charCodeAt(0) * 131 + size);
    const step = SPACING * S;
    const pts = [];
    const depth = size * 0.06, slope = 3.2 * rad;
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        const px = x + r() * step, py = y + r() * step;
        const ix = px | 0, iy = py | 0;
        if (ix < 2 || iy < 2 || ix >= W - 2 || iy >= H - 2) continue;
        if (A[iy * W + ix] < 0.5) continue;
        const gx = (B[iy * W + ix + 2] - B[iy * W + ix - 2]) * slope / 4;
        const gy = (B[(iy + 2) * W + ix] - B[(iy - 2) * W + ix]) * slope / 4;
        const l = Math.hypot(-gx, -gy, 1);
        pts.push((px - pad) / S, (py - base) / S, B[iy * W + ix] * depth, -gx / l, -gy / l);
      }
    }
    // shuffle so that any first n points are an even sample of the glyph: thinning a digit is just using fewer
    const n = pts.length / 5;
    for (let i = n - 1; i > 0; i--) {
      const j = (r() * (i + 1)) | 0;
      for (let k = 0; k < 5; k++) { const t = pts[i * 5 + k]; pts[i * 5 + k] = pts[j * 5 + k]; pts[j * 5 + k] = t; }
    }
    g = { adv, n, pts: new Float32Array(pts) };
    this.glyphs.set(key, g);
    return g;
  }

  // Lay out lines of text: [{id, text, size, cx, by, tabular, dens}] → slots with pen positions.
  layout(lines) {
    const slots = [];
    const boxes = {};
    for (const line of lines) {
      const chars = [...line.text];
      const digitAdv = line.tabular ? Math.max(...'0123456789'.split('').map((d) => this.glyph(d, line.size).adv)) : 0;
      const track = (line.track ?? -0.02) * line.size;
      const cells = chars.map((c) => {
        const g = this.glyph(c, line.size);
        const cell = line.tabular && /\d/.test(c) ? digitAdv : g.adv;
        return { c, g, cell };
      });
      const total = cells.reduce((s, c) => s + c.cell, 0) + track * (cells.length - 1);
      let x = line.cx - total / 2;
      cells.forEach((c, i) => {
        slots.push({ line: line.id, idx: i, ch: c.c, size: line.size, g: c.g, x: x + (c.cell - c.g.adv) / 2, by: line.by,
          want: Math.floor(c.g.n * (line.dens ?? 1)), block: -1, count: 0 });
        x += c.cell + track;
      });
      boxes[line.id] = { left: line.cx - total / 2, right: line.cx + total / 2, top: line.by - line.size * 0.72, bottom: line.by };
    }
    return { slots, boxes };
  }

  measure(lines) { return this.layout(lines).boxes; }

  // ---------- grain storage ----------

  mark(lo, hi) {
    const l = this.dirty[this.dirty.length - 1];
    if (l && l[1] === lo) l[1] = hi; else this.dirty.push([lo, hi]);
  }

  // Where a grain is right now (the same maths as the shader).
  state(i, now = this.now()) {
    const d = this.data, o = i * STRIDE;
    const mode = d[o + 7];
    const s = new Grain(d[o], d[o + 1], d[o + 2], 0, 0, 0, d[o + 14], d[o + 15], 0, d[o + 20], d[o + 21], d[o + 22], d[o + 23]);
    const t = now - d[o + 3];
    if (mode === 1 || mode === 3) {
      const w = d[o + 17], tt = Math.max(t, 0), e = Math.exp(-w * tt);
      for (let k = 0; k < 3; k++) {
        const dd = d[o + k] - d[o + 8 + k], v = d[o + 4 + k];
        const pos = d[o + 8 + k] + (dd + (v + w * dd) * tt) * e;
        const vel = t > 0 ? e * (v - w * (v + w * dd) * tt) : 0;
        if (k === 0) { s.x = pos; s.vx = vel; } else if (k === 1) { s.y = pos; s.vy = vel; } else { s.z = pos; s.vz = vel; }
      }
      const p = 1 - (1 + w * tt) * e;
      s.nx = d[o + 12] + (d[o + 14] - d[o + 12]) * p;
      s.ny = d[o + 13] + (d[o + 15] - d[o + 13]) * p;
    }
    return s;
  }

  write(i, f) {
    const d = this.data, o = i * STRIDE;
    d[o] = f.x; d[o + 1] = f.y; d[o + 2] = f.z; d[o + 3] = f.t0;
    d[o + 4] = f.vx; d[o + 5] = f.vy; d[o + 6] = f.vz; d[o + 7] = f.mode;
    d[o + 8] = f.tx; d[o + 9] = f.ty; d[o + 10] = f.tz; d[o + 11] = f.param || 0;
    d[o + 12] = f.nx0; d[o + 13] = f.ny0; d[o + 14] = f.nx1; d[o + 15] = f.ny1;
    d[o + 16] = f.pal || 0; d[o + 17] = f.w || 0; d[o + 18] = f.fadeIn || 0; d[o + 19] = f.shade || 1;
    d[o + 20] = f.size; d[o + 21] = f.tone; d[o + 22] = f.phase; d[o + 23] = f.glint;
  }

  hideRange(lo, hi) {
    for (let i = lo; i < hi; i++) this.data[i * STRIDE + 7] = 0;
    if (hi > lo) this.mark(lo, hi);
  }

  // A new grain with its own random size, tone and sparkle.
  fresh(x, y, z, vx, vy, vz, fadeIn, glint = 0.045) {
    const r = this.r;
    return new Grain(x, y, z, vx, vy, vz, 0, 0, fadeIn, 1.35 + r() * 0.8, r(), r() * 6.283, r() < glint ? 1 : 0);
  }

  // ---------- falling and landing ----------

  // Start a new layer: grains that fall from now on settle into it with this colour and roughly this thickness.
  beginLayer(pal, grains, thick) {
    this.layer = { pal, base: Float32Array.from(this.Hf), dh: (thick * this.ncol) / Math.max(1, grains), thick };
  }

  endLayer(meta) {
    if (!this.layer) return null;
    const rec = { ...meta, pal: this.layer.pal, base: this.layer.base, top: Float32Array.from(this.Hf) };
    this.layers.push(rec);
    this.layer = null;
    return rec;
  }

  // Height (css px from the bottom) of a layer's middle and its thickness at x.
  layerAt(rec, x) {
    const c = Math.max(0, Math.min(this.ncol - 1, Math.round(x / COLW)));
    return { bottom: rec.base[c], top: rec.top[c] };
  }

  surfaceAt(x) {
    const c = Math.max(0, Math.min(this.ncol - 1, Math.round(x / COLW)));
    return this.Hf[c];
  }

  meanSurface() { let s = 0; for (let i = 0; i < this.ncol; i++) s += this.HL[i]; return s / this.ncol; }

  // Where a grain thrown from (x0, y0) at (vx, vy) comes to rest on the sand, and when. Results go in this.hit.
  land(x0, y0, vx, vy, t0) {
    const vt = G / K, Hf = this.Hf, n = this.ncol, gnd = this.ground, last = n - 1;
    let x = x0, y = y0;
    // coarse steps along the same path as the shader to find the frame it lands in, then halve down to 1/960 s
    let lo = 0, hi = 0;
    for (let s = 0; s < 180; s++) {
      hi += 1 / 30;
      const e = (1 - Math.exp(-K * hi)) / K;
      x = x0 + vx * e; y = y0 + vt * hi + (vy - vt) * e;
      const c = x < 0 ? 0 : x >= n * COLW ? last : (x / COLW) | 0;
      if (y >= gnd - Hf[c]) break;
      lo = hi;
    }
    for (let k = 0; k < 6; k++) {
      const m = (lo + hi) / 2, e = (1 - Math.exp(-K * m)) / K;
      const xm = x0 + vx * e, ym = y0 + vt * m + (vy - vt) * e;
      const c = xm < 0 ? 0 : xm >= n * COLW ? last : (xm / COLW) | 0;
      if (ym >= gnd - Hf[c]) { hi = m; x = xm; } else lo = m;
    }
    let c = x < 0 ? 0 : x >= n * COLW ? last : (x / COLW) | 0;
    // roll downhill while the slope is too steep to hold a grain
    for (let k = 0; k < 8; k++) {
      const h = Hf[c], l = c > 0 ? Hf[c - 1] : 1e9, r = c < last ? Hf[c + 1] : 1e9;
      if (h - Math.min(l, r) > SLOPE) c = l < r ? c - 1 : c + 1; else break;
    }
    const h = Hf[c];
    const L = this.layer, H = this.hit;
    Hf[c] += L ? L.dh * (0.7 + this.r() * 0.6) : 0.1;
    H.x = c * COLW + this.r() * COLW;
    H.y = gnd - h - this.r() * 0.6;
    H.t = t0 + hi;
    H.c = c; H.h = h;
    H.shade = 0.8 + 0.28 * (L ? Math.min(1, (h - L.base[c]) / Math.max(1, L.thick)) : 1);
  }

  // Send one grain (current state s) falling into the current layer, leaving at time t0.
  fall(s, t0, vx, vy, vz = 0) {
    const i = BLOCK * NBLOCK + this.ring;
    this.ring = (this.ring + 1) % RING;
    this.land(s.x, s.y, vx, vy, t0);
    const H = this.hit, d = this.data, o = i * STRIDE;
    d[o] = s.x; d[o + 1] = s.y; d[o + 2] = s.z; d[o + 3] = t0; d[o + 4] = vx; d[o + 5] = vy; d[o + 6] = vz; d[o + 7] = 2;
    d[o + 8] = H.x; d[o + 9] = H.y; d[o + 10] = 0; d[o + 11] = H.t;
    d[o + 12] = s.nx; d[o + 13] = s.ny; d[o + 14] = s.nx; d[o + 15] = s.ny;
    d[o + 16] = this.layer ? this.layer.pal : 1; d[o + 17] = 0; d[o + 18] = 0; d[o + 19] = H.shade;
    d[o + 20] = s.size; d[o + 21] = s.tone; d[o + 22] = s.phase; d[o + 23] = s.glint;
    this.mark(i, i + 1);
    this.hlq.push(H.t, H.c, H.h);
  }

  // Lay sand down instantly (for the ground that exists before the screen opens).
  pour(pal, grains, thick, xFn) {
    this.beginLayer(pal, grains, thick);
    const now = this.now();
    let batch = 0;
    for (let k = 0; k < grains; k++) {
      const x = xFn(this.r);
      const s = this.fresh(x, -10, 0, 0, 0, 0, 0, pal === 10 ? 0.3 : 0.03);
      const i = BLOCK * NBLOCK + batch;
      let c = Math.max(0, Math.min(this.ncol - 1, Math.floor(x / COLW)));
      const Hf = this.Hf;
      for (let q = 0; q < 10; q++) {
        const h = Hf[c], l = c > 0 ? Hf[c - 1] : 1e9, r = c < this.ncol - 1 ? Hf[c + 1] : 1e9;
        if (h - Math.min(l, r) > SLOPE) c = l < r ? c - 1 : c + 1; else break;
      }
      const h = Hf[c];
      Hf[c] += this.layer.dh * (0.7 + this.r() * 0.6);
      const frac = Math.min(1, (h - this.layer.base[c]) / thick);
      this.write(i, { x: c * COLW, y: this.ground - h, z: 0, t0: now - 2, vx: 0, vy: 0, vz: 0, mode: 2,
        tx: c * COLW + this.r() * COLW, ty: this.ground - h - this.r() * 0.6, tz: 0, param: now - 1,
        nx0: 0, ny0: 0, nx1: 0, ny1: 0, pal, shade: 0.8 + 0.28 * frac, size: s.size, tone: s.tone, phase: s.phase, glint: s.glint });
      batch++;
      if (batch === RING || k === grains - 1) {
        const lo = BLOCK * NBLOCK;
        this.mark(lo, lo + batch);
        this.bakeNow(-1e9, now);
        this.hideRange(lo, lo + batch);
        batch = 0;
      }
    }
    this.HL.set(this.Hf);
    this.hlDirty = true;
    this.lastBake = Math.max(this.lastBake, now);
  }

  // Lay down the dunes and layers that exist before the screen opens.
  shapeGround(fn) {
    for (let c = 0; c < this.ncol; c++) this.Hf[c] = fn(c * COLW);
  }

  // ---------- figures (the big numbers) ----------

  // Move the numbers on screen to new text. Characters that stay the same keep their own grains; everything else is
  // re-poured from the grains that are free. o: {omega, stagger(x,y)→s, surplus:'fall'|'dissolve', spawn:'air'|'near',
  // burst, fallOver (s), matchAll}
  setFigure(lines, o = {}) {
    const now = this.now();
    const { slots: neu, boxes } = this.layout(lines);
    const old = this.slots;
    const w0 = o.omega ?? 11;
    const r = this.r;
    const stag = o.stagger || (() => 0);
    const surplus = [];
    const pool = [];
    // which old slots stay put (same character, same line, same place in the line)
    const pairs = new Map();
    if (!o.matchAll) {
      const byLine = (arr) => arr.reduce((m, s) => (m.get(s.line) || m.set(s.line, []).get(s.line)).push(s) && m, new Map());
      const ol = byLine(old), nl = byLine(neu);
      for (const [id, ns] of nl) {
        const os = ol.get(id);
        if (!os) continue;
        const same = (a, b) => a.ch === b.ch && a.size === b.size;
        if (os.length === ns.length) ns.forEach((s, i) => { if (same(os[i], s)) pairs.set(s, os[i]); });
        else for (let i = 0; i < Math.min(os.length, ns.length) && same(os[i], ns[i]); i++) pairs.set(ns[i], os[i]);
      }
    }
    const kept = new Set(pairs.values());
    for (const s of old) {
      if (kept.has(s)) continue;
      const b = s.block * BLOCK;
      for (let i = 0; i < s.count; i++) pool.push(this.state(b + i, now));
      this.hideRange(b, b + s.count);
      this.freeBlocks.push(s.block);
    }
    if (o.shed && pool.length) {
      for (let i = pool.length - 1; i >= 0; i--) {
        if (r() < o.shed) { surplus.push(pool[i]); pool[i] = pool[pool.length - 1]; pool.pop(); }
      }
    }
    const spawnAt = [];   // [slot, point index] that need a grain from somewhere
    const d = this.data;
    const put = (slot, i, st, t0, w) => {   // write() unrolled for a spring towards point i of the slot's glyph
      const g = slot.g.pts, k = i * 5, o = (slot.block * BLOCK + i) * STRIDE;
      d[o] = st.x; d[o + 1] = st.y; d[o + 2] = st.z; d[o + 3] = t0; d[o + 4] = st.vx; d[o + 5] = st.vy; d[o + 6] = st.vz; d[o + 7] = 1;
      d[o + 8] = slot.x + g[k]; d[o + 9] = slot.by + g[k + 1]; d[o + 10] = g[k + 2]; d[o + 11] = 0;
      d[o + 12] = st.nx; d[o + 13] = st.ny; d[o + 14] = g[k + 3]; d[o + 15] = g[k + 4];
      d[o + 16] = 0; d[o + 17] = w; d[o + 18] = st.fadeIn; d[o + 19] = 1;
      d[o + 20] = st.size; d[o + 21] = st.tone; d[o + 22] = st.phase; d[o + 23] = st.glint;
    };
    // kept characters: slide as one piece if they moved, drop or gain grains if the density changed
    for (const [ns, os] of pairs) {
      ns.block = os.block;
      const b = ns.block * BLOCK;
      const moved = Math.abs(ns.x - os.x) > 0.01 || Math.abs(ns.by - os.by) > 0.01;
      const keep = Math.min(os.count, ns.want);
      if (moved) {
        for (let i = 0; i < keep; i++) {
          const st = this.state(b + i, now);
          put(ns, i, st, now + stag(st.x, st.y) * 0.4, w0 * (0.9 + r() * 0.2));
        }
        this.mark(b, b + keep);
      }
      for (let i = ns.want; i < os.count; i++) surplus.push(this.state(b + i, now));
      this.hideRange(b + ns.want, b + os.count);
      for (let i = os.count; i < ns.want; i++) spawnAt.push([ns, i]);
      ns.count = ns.want;
    }
    // changed characters: pour the free grains into them, each grain going to a nearby spot
    const targets = [];
    for (const s of neu) {
      if (pairs.has(s)) continue;
      s.block = this.freeBlocks.pop();
      s.count = s.want;
      for (let i = 0; i < s.want; i++) targets.push(s, i);
    }
    const nt = targets.length / 2;
    if (nt && pool.length) {
      const tx = new Float32Array(nt), ty = new Float32Array(nt);
      for (let j = 0; j < nt; j++) {
        const s = targets[j * 2], k = targets[j * 2 + 1] * 5;
        tx[j] = s.x + s.g.pts[k]; ty[j] = s.by + s.g.pts[k + 1];
      }
      const np = pool.length, px = new Float32Array(np), py = new Float32Array(np);
      for (let i = 0; i < np; i++) { px[i] = pool[i].x; py[i] = pool[i].y; }
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [xs, ys] of [[tx, ty], [px, py]]) {
        for (let i = 0; i < xs.length; i++) {
          const x = xs[i], y = ys[i];
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      const box = [x0, y0, x1, y1];
      const ot = hilbertOrder(tx, ty, box), op = hilbertOrder(px, py, box);
      const used = new Uint8Array(pool.length);
      if (pool.length >= nt) {
        for (let j = 0; j < nt; j++) {
          const pi = op[Math.floor((j * pool.length) / nt)];
          used[pi] = 1;
          const st = pool[pi];
          if (o.burst) { st.vx += gauss(r) * o.burst; st.vy += gauss(r) * o.burst - o.burst * 0.4; st.vz += Math.abs(gauss(r)) * o.burst * 0.9; }
          const s = targets[ot[j] * 2], i = targets[ot[j] * 2 + 1];
          put(s, i, st, now + stag(st.x, st.y), w0 * (0.85 + r() * 0.3));
        }
        pool.forEach((p, i) => { if (!used[i]) surplus.push(p); });
      } else {
        let last = -1;
        for (let j = 0; j < nt; j++) {
          const pj = Math.floor((j * pool.length) / nt);
          const s = targets[ot[j] * 2], i = targets[ot[j] * 2 + 1];
          const first = pj !== last;
          last = pj;
          const p = pool[op[pj]];
          // the first grain to a spot is the real one; any extra is a new grain that fades in beside it
          const st = first ? p : this.fresh(p.x + gauss(r) * 2, p.y + gauss(r) * 2, p.z, p.vx, p.vy, p.vz, 0.25);
          if (!first) { st.nx = p.nx; st.ny = p.ny; }
          put(s, i, st, now + stag(st.x, st.y), w0 * (0.85 + r() * 0.3));
        }
      }
    } else {
      for (let j = 0; j < nt; j++) spawnAt.push([targets[j * 2], targets[j * 2 + 1]]);
      surplus.push(...pool);
    }
    // grains that come from nowhere: out of the air in a slow swirl, or quietly in place
    const cx = this.figC[0], cy = this.figC[1];
    for (const [s, i] of spawnAt) {
      const k = i * 5, gx = s.x + s.g.pts[k], gy = s.by + s.g.pts[k + 1];
      let st;
      if (o.spawn === 'air') {
        // a slow vortex: each grain starts further round a wide circle, closer to the eye, and curls in to its place
        const d0 = Math.hypot(gx - cx, (gy - cy) / 0.75), a0 = Math.atan2((gy - cy) / 0.75, gx - cx);
        const a = a0 + 0.8 + r() * 0.9, R = d0 + 60 + r() * 140, sp = 110 + r() * 150;
        st = this.fresh(cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.75, 30 + r() * 110,
          Math.sin(a) * sp, -Math.cos(a) * sp * 0.75, 0, 0.3 + r() * 0.25);
        put(s, i, st, now + (o.spawnDelay || 0) + d0 * 0.0016 + r() * 0.14, (o.spawnOmega ?? 5.2) * (0.85 + r() * 0.3));
      } else {
        st = this.fresh(gx + gauss(r) * 3, gy + gauss(r) * 3, 0, 0, 0, 0, 0.3);
        put(s, i, st, now + r() * 0.2, w0);
      }
    }
    for (const s of neu) if (s.block >= 0) this.mark(s.block * BLOCK, s.block * BLOCK + s.count);
    // grains with nowhere to go: fall into the layer below, or fade away like dust
    const over = o.fallOver ?? 0.3;
    for (const st of surplus) {
      if (o.surplus === 'fall' && this.layer) {
        const vx = st.vx * 0.3 + gauss(r) * (o.spread ?? 150), vy = st.vy * 0.3 - r() * 60;
        this.fall(st, now + r() * over, vx, vy, st.vz * 0.3);
      } else this.dissolve(st, now + r() * 0.15);
    }
    this.slots = neu;
    return boxes;
  }

  dissolve(st, t0) {
    const i = BLOCK * NBLOCK + this.ring;
    this.ring = (this.ring + 1) % RING;
    const r = this.r;
    this.write(i, { x: st.x, y: st.y, z: st.z, t0, vx: st.vx, vy: st.vy, vz: st.vz, mode: 3,
      tx: st.x + gauss(r) * 14, ty: st.y - 18 - r() * 40, tz: st.z + 20 + r() * 60, param: 0.5 + r() * 0.4,
      nx0: st.nx, ny0: st.ny, nx1: 0, ny1: 0, pal: 0, w: 3.5, size: st.size, tone: st.tone, phase: st.phase, glint: st.glint });
    this.mark(i, i + 1);
  }

  figureCount() { return this.slots.reduce((s, x) => s + x.count, 0); }

  // Everything that is still a number pours down into the current layer.
  dropFigure(o = {}) {
    const now = this.now(), r = this.r;
    const all = [];
    for (const s of this.slots) {
      const b = s.block * BLOCK;
      for (let i = 0; i < s.count; i++) all.push(this.state(b + i, now));
      this.hideRange(b, b + s.count);
      this.freeBlocks.push(s.block);
    }
    this.slots = [];
    const over = o.over ?? 0.6;
    // the bottom of each digit lets go first, like a sandcastle giving way
    let ymin = Infinity, ymax = -Infinity;
    for (const s of all) { if (s.y < ymin) ymin = s.y; if (s.y > ymax) ymax = s.y; }
    // in the order they let go, so the ones that land first lie underneath (a typed sort: fast for 10k grains)
    const keys = new Float64Array(all.length);
    for (let i = 0; i < all.length; i++) keys[i] = Math.round((ymax - all[i].y) * 16) * 262144 + i;
    keys.sort();
    for (let j = 0; j < keys.length; j++) {
      const s = all[keys[j] % 262144];
      const u = (ymax - s.y) / Math.max(1, ymax - ymin);
      this.fall(s, now + u * over + r() * 0.08, gauss(r) * (o.spread ?? 170), -r() * 50, 0);
    }
  }

  // ---------- frame ----------

  bakeNow(from, to) {
    const gl = this.gl;
    this.flush();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.drawGrains(1, to, [from, to]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  flush() {
    if (!this.dirty.length) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    this.dirty.sort((a, b) => a[0] - b[0]);
    let [lo, hi] = this.dirty[0];
    const send = () => gl.bufferSubData(gl.ARRAY_BUFFER, lo * STRIDE * 4, this.data, lo * STRIDE, (hi - lo) * STRIDE);
    for (let k = 1; k < this.dirty.length; k++) {
      const [a, b] = this.dirty[k];
      if (a <= hi + 64) hi = Math.max(hi, b); else { send(); lo = a; hi = b; }
    }
    send();
    this.dirty = [];
  }

  drawGrains(pass, now, win) {
    const gl = this.gl, P = this.pGrain, u = P.u, U = this.u;
    gl.useProgram(P.p);
    gl.bindVertexArray(this.vao);
    gl.uniform1f(u.u_now, now);
    gl.uniform1f(u.u_dpr, this.dpr);
    gl.uniform2f(u.u_css, this.W, this.H);
    gl.uniform1i(u.u_pass, pass);
    gl.uniform2f(u.u_win, win ? win[0] : 0, win ? win[1] : 0);
    gl.uniform2f(u.u_figC, this.figC[0], this.figC[1]);
    gl.uniform1f(u.u_rot, U.rot);
    gl.uniform1f(u.u_persp, 900);
    gl.uniform1f(u.u_heat, U.heat);
    gl.uniform1f(u.u_spec, U.spec);
    gl.uniform3fv(u.u_alb, U.alb);
    gl.uniform3fv(u.u_emit, U.emit);
    gl.uniform3fv(u.u_light, U.light);
    gl.uniform3fv(u.u_amb, U.amb);
    gl.uniform3fv(u.u_pal, this.pal);
    const used = this.slots.reduce((m, sl) => Math.max(m, sl.block + 1), 0);
    if (pass !== 1 && used) gl.drawArrays(gl.POINTS, 0, used * BLOCK);
    if (pass !== 2) gl.drawArrays(gl.POINTS, BLOCK * NBLOCK, RING);
  }

  // Animate one of the look values (heat, rotation, colours…) with an easing curve.
  tween(key, to, dur, ease = easeInOut, done) {
    const U = this.u, from = Array.isArray(U[key]) ? U[key].slice() : U[key];
    for (const a of this.anims) if (a.key === key) this.anims.delete(a);
    this.anims.add({ key, from, to, t0: this.now(), dur, ease, done });
  }

  skyTo(sky, dur) {
    const from = this.sky ? { ...this.sky } : sky;
    this.skyAnim = { from, to: sky, t0: this.now(), dur };
    if (!this.sky) this.sky = { ...sky };
  }

  frame() {
    const gl = this.gl, now = this.now();
    for (const a of [...this.anims]) {
      const k = Math.min(1, (now - a.t0) / a.dur), e = a.ease(k);
      this.u[a.key] = Array.isArray(a.from) ? a.from.map((v, i) => v + (a.to[i] - v) * e) : a.from + (a.to - a.from) * e;
      if (k >= 1) { this.anims.delete(a); a.done && a.done(); }
    }
    if (this.skyAnim) {
      const A = this.skyAnim, k = Math.min(1, (now - A.t0) / A.dur), e = easeInOut(k);
      for (const key in A.to) {
        const f = A.from[key], t = A.to[key];
        this.sky[key] = Array.isArray(t) ? t.map((v, i) => f[i] + (v - f[i]) * e) : f + (t - f) * e;
      }
      if (k >= 1) this.skyAnim = null;
    }
    // sand that has landed joins the ground
    if (this.hlq.length) {
      const q = this.hlq, keep = [];
      for (let i = 0; i < q.length; i += 3) {
        if (q[i] <= now) { const c = q[i + 1]; if (q[i + 2] - 1 > this.HL[c]) { this.HL[c] = q[i + 2] - 1; this.hlDirty = true; } }
        else keep.push(q[i], q[i + 1], q[i + 2]);
      }
      this.hlq = keep;
    }
    if (this.hlDirty) {
      gl.bindTexture(gl.TEXTURE_2D, this.hlTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.ncol, 1, gl.RED, gl.FLOAT, this.HL);
      this.hlDirty = false;
    }
    this.bakeNow(this.lastBake, now);
    this.lastBake = now;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.disable(gl.BLEND);
    const S = this.pSky, s = this.sky;
    gl.useProgram(S.p);
    gl.bindVertexArray(this.empty);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.hlTex);
    gl.uniform1i(S.u.u_hl, 0);
    gl.uniform1i(S.u.u_ncol, this.ncol);
    gl.uniform2f(S.u.u_css, this.W, this.H);
    gl.uniform1f(S.u.u_dpr, this.dpr);
    for (const k of ['zen', 'mid', 'low', 'glow', 'pore']) gl.uniform3fv(S.u['u_' + k], s[k]);
    gl.uniform1f(S.u.u_glowAmt, s.glowAmt);
    gl.uniform1f(S.u.u_horY, this.H - this.meanSurface());
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.pTex.p);
    gl.bindTexture(gl.TEXTURE_2D, this.fboTex);
    gl.uniform1i(this.pTex.u.u_tex, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    this.drawGrains(0, now);
    gl.blendFunc(gl.ONE, gl.ONE);
    this.drawGrains(2, now);
  }
}

export function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
export function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

function boxBlur(src, W, H, r) {
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H), n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let acc = 0;
    const row = y * W;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) {
      tmp[row + x] = acc / n;
      acc += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc / n;
      acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
  return out;
}
