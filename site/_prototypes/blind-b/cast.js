// Cast: the liquid-metal surface behind the workout screen.
// One WebGL2 canvas, three passes a frame:
//   1. ripples   a wave equation on a small texture (taps, drops, splashes)
//   2. height    every raised thing (numbers, set beads, the button) as one height map, in CSS px
//   3. shade     normals from the height map, a studio light environment, chrome / black liquid / glass, heat
// Numbers are signed-distance glyphs, so one number can melt into another.

const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const SIM = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uPrev; uniform vec2 uTexel; uniform float uDamp;
uniform vec4 uDrop[6]; uniform int uDrops;
void main(){
  vec2 c = texture(uPrev, vUv).rg;
  float l = texture(uPrev, vUv - vec2(uTexel.x, 0.0)).r;
  float r = texture(uPrev, vUv + vec2(uTexel.x, 0.0)).r;
  float d = texture(uPrev, vUv - vec2(0.0, uTexel.y)).r;
  float u = texture(uPrev, vUv + vec2(0.0, uTexel.y)).r;
  float h = ((l + r + u + d) * 0.5 - c.g) * uDamp;
  vec2 e = min(vUv, 1.0 - vUv);
  h *= mix(0.94, 1.0, smoothstep(0.0, 0.08, min(e.x, e.y)));
  for (int i = 0; i < 6; i++) {
    if (i >= uDrops) break;
    vec2 q = (vUv - uDrop[i].xy) / uTexel;
    h += uDrop[i].w * exp(-dot(q, q) / (uDrop[i].z * uDrop[i].z));
  }
  o = vec4(h, c.r, 0.0, 1.0);
}`;

const HEIGHT = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform vec2 uRes;
uniform sampler2D uAtlas; uniform vec2 uAtlasSize; uniform vec2 uCell;
uniform float uFs, uSpread, uBase, uMid, uCap;
uniform vec4 uSlot[8];   // centre x, baseline y, font size (css px), height 0..1
uniform vec4 uGlyph[8];  // glyph A, glyph B, mix, bulge
uniform vec4 uBead[6];   // centre x, y, radius, height
uniform vec4 uBeadX[6];  // fill (ring -> sphere), 0, 0, 0
uniform vec4 uPill;      // centre x, y, half w, half h
uniform vec4 uPillP;     // edge radius, height, press, 0
uniform sampler2D uWave; uniform float uWaveAmp;
uniform float uTime, uSwell;
uniform int uHotSlots;

// cubic B-spline from four bilinear taps: smooth slopes, so reflections don't step at atlas texels
vec4 cubic(float v){ vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v; vec4 s = n * n * n; float x = s.x, y = s.y - 4.0 * s.x, z = s.z - 4.0 * s.y + 6.0 * s.x; return vec4(x, y, z, 6.0 - x - y - z) / 6.0; }
float atlasCubic(vec2 t){
  t -= 0.5; vec2 f = fract(t); t -= f;
  vec4 xc = cubic(f.x), yc = cubic(f.y);
  vec4 c = t.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xc.xz + xc.yw, yc.xz + yc.yw);
  vec4 off = (c + vec4(xc.yw, yc.yw) / s) / uAtlasSize.xxyy;
  float a = texture(uAtlas, off.xz).r, b = texture(uAtlas, off.yz).r, d = texture(uAtlas, off.xw).r, e = texture(uAtlas, off.yw).r;
  float sx = s.x / (s.x + s.y), sy = s.z / (s.z + s.w);
  return mix(mix(e, d, sx), mix(b, a, sx), sy);
}
float glyphSd(float g, vec2 c){
  if (g < -0.5) return min(length(c - vec2(uMid, uBase - uCap * 0.5)), uSpread);
  if (c.x < 0.0 || c.x > uCell.x || c.y < 0.0 || c.y > uCell.y) return uSpread;
  float v = atlasCubic(vec2(g * uCell.x + clamp(c.x, 2.0, uCell.x - 2.0), c.y));
  return (0.5 - v) * 2.0 * uSpread;
}
// a rounded edge of radius b, a soft dome on top, and a small meniscus where it meets the liquid
float relief(float sd, float b){
  float x = clamp(-sd / b, 0.0, 1.0);
  float body = b * (1.0 - (1.0 - x) * (1.0 - x));
  float dome = b * 0.45 * smoothstep(0.0, 1.0, clamp(-sd / (3.5 * b), 0.0, 1.0));
  float men = sd > 0.0 ? b * 0.22 * pow(max(0.0, 1.0 - sd / (1.1 * b)), 2.0) : 0.0;
  return body + dome + men;
}
void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  float h = 0.0, metal = 0.0, glass = 0.0, bend = 0.0, near = 0.0;
  for (int i = 0; i < 8; i++) {
    vec4 s = uSlot[i];
    if (s.z <= 0.0 || s.w <= 0.001) continue;
    float k = uFs / s.z;
    vec2 c = (p - s.xy) * k + vec2(uMid, uBase);
    if (c.x < -uSpread || c.x > uCell.x + uSpread || c.y < -uSpread || c.y > uCell.y + uSpread) continue;
    vec4 g = uGlyph[i];
    float sd = mix(glyphSd(g.x, c), glyphSd(g.y, c), g.z);
    float w = sin(3.14159 * g.z);
    sd -= g.w * w * (1.0 + 0.5 * sin(p.x * 0.07 + uTime * 5.0) * sin(p.y * 0.05 - uTime * 4.0));
    float hm = clamp(s.w, 0.0, 1.2);
    sd += (1.0 - min(hm, 1.0)) * 7.0;          // thins out as it sinks
    float sdc = sd / k;
    float b = s.z * 0.042;
    float hh = relief(sdc, b) * s.w;
    if (hh > h) { h = hh; bend = clamp((p.y - (s.y - uCap / uFs * s.z * 0.5)) / (uCap / uFs * s.z * 0.5), -1.3, 1.3); }
    metal = max(metal, smoothstep(0.6, -0.6, sdc) * smoothstep(0.0, 0.3, hm));
    if (i < uHotSlots) { float g = 1.0 - smoothstep(0.0, s.z * 0.13, sdc); near = max(near, g * g * smoothstep(0.0, 0.3, hm)); }
  }
  for (int i = 0; i < 6; i++) {
    vec4 bd = uBead[i];
    if (bd.z <= 0.0 || bd.w <= 0.001) continue;
    float d = length(p - bd.xy);
    float r = bd.z;
    if (d > r * 1.6) continue;
    float f = uBeadX[i].x;
    float hs = r * 0.85 * sqrt(max(0.0, 1.0 - (d / r) * (d / r)));
    float rr = r * 0.74, tw = r * 0.2;
    float dd = abs(d - rr);
    float hr = tw * sqrt(max(0.0, 1.0 - (dd / tw) * (dd / tw)));
    float sdS = d - r, sdR = dd - tw;
    float sd = mix(sdR, sdS, f);
    float men = sd > 0.0 ? r * 0.12 * pow(max(0.0, 1.0 - sd / (r * 0.35)), 2.0) : 0.0;
    float hh = (mix(hr, hs, f) + men) * bd.w;
    if (hh > h) h = hh;
    metal = max(metal, smoothstep(0.6, -0.6, sd) * smoothstep(0.0, 0.3, bd.w));
  }
  if (uPill.z > 0.0 && uPillP.y > 0.001) {
    float rad = uPill.w;
    vec2 q = abs(p - uPill.xy) - (uPill.zw - rad);
    float sd = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rad;
    float b = uPillP.x;
    float x = clamp(-sd / b, 0.0, 1.0);
    float body = b * (1.0 - (1.0 - x) * (1.0 - x));
    float dome = b * 0.6 * smoothstep(0.0, 1.0, clamp(-sd / (uPill.w * 1.2), 0.0, 1.0));
    float men = sd > 0.0 ? b * 0.25 * pow(max(0.0, 1.0 - sd / b), 2.0) : 0.0;
    float hh = (body + dome * (1.0 - 1.6 * uPillP.z) + men) * uPillP.y;
    if (hh > h) { h = hh; bend = clamp((p.y - uPill.y) / uPill.w, -1.0, 1.0) * 0.8; }
    glass = smoothstep(0.6, -0.6, sd) * smoothstep(0.0, 0.3, uPillP.y);
  }
  h += texture(uWave, vec2(vUv.x, vUv.y)).r * uWaveAmp;
  h += uSwell * (sin(p.x * 0.011 + uTime * 0.31) * sin(p.y * 0.0072 - uTime * 0.23) + 0.6 * sin((p.x * 0.6 + p.y) * 0.0135 + uTime * 0.41));
  o = vec4(h, metal - glass, near, bend);
}`;

const SHADE = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uH; uniform vec2 uHTexel; uniform float uPx;
uniform vec2 uRes; uniform float uTime;
uniform mat3 uTilt;
uniform vec3 uHorizon; uniform vec3 uStripL; uniform vec3 uStripR; uniform float uKey;
uniform float uGold; uniform float uSweep;
uniform float uHeat;
uniform float uPillGlow; uniform vec3 uPillTint; uniform vec4 uPillC; uniform float uSpill;
uniform sampler2D uWave;

float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float box(vec2 p, vec2 b, float e){ return 1.0 - smoothstep(-e, e, sdBox(p, b)); }

vec3 env(vec3 r, float rough){
  vec2 q = r.xy / (1.0 + max(r.z, -0.9));
  float L = length(q);
  float e = 0.02 + rough * 0.3;
  // sky above a horizon a little below eye level, dark ground under it
  float hz = -0.06;
  float sky = smoothstep(hz - e * 0.5, hz + e * 0.5, q.y);
  vec3 skyC = mix(vec3(0.20, 0.215, 0.25), vec3(0.95, 0.97, 1.02), smoothstep(hz, 0.55, q.y));
  vec3 gndC = mix(vec3(0.012, 0.013, 0.016), vec3(0.06, 0.062, 0.07), smoothstep(-0.2, -0.9, q.y));
  vec3 c = mix(gndC, skyC, sky);
  c += uHorizon * 0.9 * exp(-pow((q.y - hz + 0.02) / (0.022 + rough * 0.2), 2.0));
  // key softbox, two strips, the rim of the room
  c += vec3(1.0, 0.98, 0.95) * uKey * box(q - vec2(0.0, 0.5), vec2(0.34, 0.06), e);
  c += uStripL * box(q - vec2(-0.70, 0.08), vec2(0.045, 0.40), e);
  c += uStripR * box(q - vec2(0.72, -0.02), vec2(0.035, 0.46), e);
  float ring = exp(-pow((L - 0.96) / (0.07 + rough * 0.25), 2.0));
  c += uHorizon * ring * 0.6;
  c *= mix(1.0, 0.25, smoothstep(1.05, 1.5, L));
  return c;
}

// cooling metal: white, yellow, orange, deep red, nothing
vec3 blackbody(float t){
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(0.0), vec3(0.55, 0.035, 0.0), smoothstep(0.0, 0.3, t));
  c = mix(c, vec3(1.7, 0.42, 0.03), smoothstep(0.25, 0.6, t));
  c = mix(c, vec3(2.6, 1.35, 0.35), smoothstep(0.55, 0.85, t));
  return mix(c, vec3(2.7, 2.0, 1.15), smoothstep(0.85, 1.0, t));
}

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main(){
  vec2 p = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  vec4 c = texture(uH, vUv);
  float hl = texture(uH, vUv - vec2(uHTexel.x, 0.0)).r;
  float hr = texture(uH, vUv + vec2(uHTexel.x, 0.0)).r;
  float hu = texture(uH, vUv + vec2(0.0, uHTexel.y)).r;
  float hd = texture(uH, vUv - vec2(0.0, uHTexel.y)).r;
  float dx = (hr - hl) / (2.0 * uPx);
  float dy = (hd - hu) / (2.0 * uPx);
  vec3 N = normalize(vec3(-dx, dy, 1.0));
  float mM = max(c.g, 0.0), gM = max(-c.g, 0.0);
  N = normalize(N + vec3(0.0, -c.a * 0.62, 0.0) * max(mM, gM));
  vec3 P = vec3(p.x, uRes.y - p.y, c.r);
  vec3 eye = vec3(uRes.x * 0.5, uRes.y * 0.62, 1000.0);
  vec3 V = normalize(eye - P);
  vec3 R = uTilt * reflect(-V, N);
  float ndv = clamp(dot(N, V), 0.0, 1.0);

  // black liquid
  float Fl = 0.045 + 0.955 * pow(1.0 - ndv, 5.0);
  vec3 room = env(R, 0.0);
  vec3 liquid = vec3(0.0012, 0.0013, 0.0018) + room * Fl * 0.22;

  // chrome, silver turning gold; a faint oil-film colour on the steep edges
  vec3 tint = mix(vec3(0.93, 0.94, 0.96), vec3(1.0, 0.74, 0.36), uGold);
  float steep = smoothstep(0.12, 0.75, 1.0 - N.z);
  vec3 film = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + ndv * 1.7 + 0.15));
  vec3 metal = room * tint * mix(vec3(1.0), film * 1.25, steep * 0.32 * (1.0 - uGold));

  // glass: dark, glossy, lit from inside
  float Fg = 0.05 + 0.95 * pow(1.0 - ndv, 3.0);
  vec3 glass = vec3(0.012, 0.013, 0.016) + room * Fg * 1.1;
  float lower = smoothstep(-0.9, 1.0, c.a / 0.8);
  float shimmer = 0.85 + 0.15 * sin(p.x * 0.045 - uTime * 1.6 + c.a * 2.0);
  glass += uPillTint * uPillGlow * (0.22 + 1.05 * lower * lower) * shimmer * smoothstep(0.2, 0.9, N.z);

  // heat: freshly cast numbers glow, then cool from the bottom up while you rest
  float hot = 0.0;
  if (uHeat > 0.001) {
    hot = clamp(uHeat * 1.45 - 0.25 - 0.22 * c.a, 0.0, 1.0) * smoothstep(0.85, 1.0, c.b) * (0.74 + 0.26 * N.z * N.z);
    metal *= mix(1.0, 0.18, smoothstep(0.15, 0.75, hot));
  }

  vec3 col = mix(liquid, metal, mM);
  col = mix(col, glass, gM);

  if (uHeat > 0.001) {
    col += blackbody(hot) * mM * (0.45 + 0.55 * pow(N.z, 3.0)) * (0.92 + 0.08 * sin(p.x * 0.08 + p.y * 0.05 + uTime * 2.0));
    col += blackbody(uHeat * 0.72) * c.b * (1.0 - mM) * 0.36;
  }

  // when a set is logged, a ring of the button's light runs out across the liquid
  if (uSpill > 0.0 && uSpill < 1.0) {
    float wv = texture(uWave, vUv).r;
    float d = length((p - uPillC.xy) * vec2(1.0, 1.25)) + wv * 12.0;
    float r = uPillC.w + 820.0 * uSpill * (1.0 - 0.4 * uSpill);
    float w = 5.0 + 22.0 * uSpill;
    float ring = exp(-pow((d - r) / w, 2.0)) * smoothstep(0.0, 0.08, uSpill) * pow(1.0 - uSpill, 2.0);
    col += uPillTint * ring * (1.0 - mM) * (1.0 - gM) * 0.45;
  }

  // a light sweep over the metal (records)
  if (uSweep > -0.5) {
    float steep = smoothstep(0.12, 0.75, 1.0 - N.z);
    float s = (p.x + p.y * 0.35) / uRes.x;
    float band = exp(-pow((s - uSweep) / 0.045, 2.0)) + 0.35 * exp(-pow((s - uSweep + 0.09) / 0.02, 2.0));
    col += vec3(1.0, 0.84, 0.55) * band * mM * (0.6 + 1.6 * steep);
  }

  // tone map, gamma, dither (the phone bands on soft gradients)
  col = 1.0 - exp(-col * 1.35);
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 61.0) - 0.5) / 255.0 * 1.5;
  o = vec4(col, 1.0);
}`;

// ---------- small spring ----------
class Spring {
  constructor(value = 0, k = 170, c = 22) { this.x = value; this.v = 0; this.to = value; this.k = k; this.c = c; }
  set(to, k, c) { this.to = to; if (k) this.k = k; if (c) this.c = c; return this; }
  snap(x) { this.x = this.to = x; this.v = 0; return this; }
  step(dt) {
    // semi-implicit Euler in small substeps: stable at any frame rate
    const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n;
    for (let i = 0; i < n; i++) { this.v += (-this.k * (this.x - this.to) - this.c * this.v) * h; this.x += this.v * h; }
    if (Math.abs(this.v) < 1e-4 && Math.abs(this.x - this.to) < 1e-4) { this.x = this.to; this.v = 0; }
    return this.x;
  }
}

const easeMelt = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------- glyph atlas (signed distance fields) ----------
const CHARS = '0123456789.,:';
const FS = 200, CW = 208, CH = 256, BASE = 200, SPREAD = 32;

function edt1d(grid, offset, stride, length, f, v, z) {
  v[0] = 0; z[0] = -1e20; z[1] = 1e20;
  for (let q = 0; q < length; q++) f[q] = grid[offset + q * stride];
  for (let q = 1, k = 0, s = 0; q < length; q++) {
    do { const r = v[k]; s = (f[q] - f[r] + q * q - r * r) / (q - r) / 2; } while (s <= z[k] && --k > -1);
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
  }
  for (let q = 0, k = 0; q < length; q++) {
    while (z[k + 1] < q) k++;
    const r = v[k], qr = q - r;
    grid[offset + q * stride] = f[r] + qr * qr;
  }
}
function edt(data, w, h) {
  const n = Math.max(w, h), f = new Float64Array(n), v = new Uint16Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) edt1d(data, x, w, h, f, v, z);
  for (let y = 0; y < h; y++) edt1d(data, y * w, 1, w, f, v, z);
}

function buildAtlas(family, weight) {
  const W = CW * CHARS.length, H = CH;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = `${weight} ${FS}px ${family}`;
  const adv = {};
  [...CHARS].forEach((ch, i) => { ctx.fillText(ch, i * CW + CW / 2, BASE); adv[ch] = ctx.measureText(ch).width / FS; });
  const cap = ctx.measureText('0').actualBoundingBoxAscent / FS;
  const img = ctx.getImageData(0, 0, W, H).data;
  const outer = new Float64Array(W * H), inner = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const a = img[i * 4] / 255;
    if (a >= 0.999) { outer[i] = 1e20; inner[i] = 0; }
    else if (a <= 0.001) { outer[i] = 0; inner[i] = 1e20; }
    else { const d = 0.5 - a; outer[i] = d > 0 ? d * d : 0; inner[i] = d < 0 ? d * d : 0; }
  }
  edt(outer, W, H); edt(inner, W, H);
  // a distance field from pixels wobbles by a fraction of a pixel; a light blur removes the wobble
  // (which chrome would otherwise show as stair steps) and barely moves the edge
  let d = new Float32Array(W * H), t = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = Math.sqrt(outer[i]) - Math.sqrt(inner[i]);
  const K = [1, 4, 6, 4, 1].map((v) => v / 16);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let a = 0; for (let k = -2; k <= 2; k++) a += K[k + 2] * d[y * W + Math.min(W - 1, Math.max(0, x + k))]; t[y * W + x] = a; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let a = 0; for (let k = -2; k <= 2; k++) a += K[k + 2] * t[Math.min(H - 1, Math.max(0, y + k)) * W + x]; d[y * W + x] = a; }
  }
  const out = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = Math.max(0, Math.min(1, 0.5 + d[i] / (2 * SPREAD)));
  const digitAdv = Math.max(...[...'0123456789'].map((c) => adv[c]));
  return { data: out, W, H, adv, digitAdv, cap };
}

// ---------- the renderer ----------
export function createCast(canvas, { family = 'Geist', weight = 860, quality } = {}) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance', desynchronized: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) return null;

  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const program = (fs) => {
    const p = gl.createProgram(); gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  };
  const pSim = program(SIM), pH = program(HEIGHT), pS = program(SHADE);

  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const tex = (w, h, ifmt, fmt, type, data, filter = gl.LINEAR) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data); return t;
  };
  const target = (w, h) => { const t = tex(w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; };

  const atlas = buildAtlas(family, weight);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const atlasTex = tex(atlas.W, atlas.H, gl.R16F, gl.RED, gl.FLOAT, atlas.data);

  let cssW = 0, cssH = 0, scale = quality || Math.min(window.devicePixelRatio || 1, 2), hT = null, sim = [null, null], simW = 0, simH = 0, cur = 0;
  const freeTarget = (t) => { if (t) { gl.deleteTexture(t.t); gl.deleteFramebuffer(t.f); } };
  function resize() {
    freeTarget(hT); sim.forEach(freeTarget);
    cssW = window.innerWidth; cssH = window.innerHeight;
    canvas.width = Math.round(cssW * scale); canvas.height = Math.round(cssH * scale);
    hT = target(canvas.width, canvas.height);
    simW = Math.round(cssW / 3); simH = Math.round(cssH / 3);
    sim = [target(simW, simH), target(simW, simH)];
    for (const s of sim) { gl.bindFramebuffer(gl.FRAMEBUFFER, s.f); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
  }
  resize();

  // ---------- scene state ----------
  const lines = new Map();      // id -> { slots, n, height: Spring, text }
  const beads = [];             // { x, y, r, h: Spring, fill: Spring }
  const pill = { x: 0, y: 0, hw: 0, hh: 0, h: new Spring(0, 160, 18), press: new Spring(0, 900, 40), glow: new Spring(0.6, 120, 20), spill: -1 };
  const mood = {
    gold: new Spring(0, 60, 14), heat: new Spring(0, 60, 14), key: new Spring(3.2, 60, 16),
    horizon: [0.10, 0.34, 1.0], horizonTo: [0.10, 0.34, 1.0],
  };
  let sweep = -1, sweepT = 0, drops = [];
  const tilt = { x: new Spring(0, 30, 11), y: new Spring(0, 30, 11), has: false, base: null };

  function addLine(id, n) { const slots = []; for (let i = 0; i < n; i++) slots.push({ gA: -1, gB: -1, t: 1, from: null, to: null, start: 0, dur: 1, delay: 0 }); lines.set(id, { slots, height: new Spring(0, 170, 17), text: '', box: null }); }

  function layout(text, box, maxSize, tracking = -0.035) {
    const advs = [...text].map((ch) => (/\d/.test(ch) ? atlas.digitAdv : atlas.adv[ch] ?? 0.3));
    const em = advs.reduce((a, b) => a + b, 0) + tracking * Math.max(0, text.length - 1);
    const S = Math.min(maxSize, box.h / (atlas.cap * 1.18), box.w / Math.max(em, 0.5));
    let x = box.x + (box.w - em * S) / 2;
    const by = box.y + box.h / 2 + (atlas.cap * S) / 2;
    return { S, by, width: em * S, left: x, pos: advs.map((a) => { const cx = x + (a * S) / 2; x += (a + tracking) * S; return { cx, by, S }; }) };
  }

  function setText(id, text, { box, maxSize = 999, instant = false, stagger = 0.04, dur = 0.52 } = {}) {
    const L = lines.get(id); if (box) L.box = box; L.maxSize = maxSize;
    const lay = layout(text, L.box, maxSize);
    const now = performance.now() / 1000;
    let changed = 0;
    L.slots.forEach((s, i) => {
      const ch = text[i];
      const g = ch === undefined ? -1 : CHARS.indexOf(ch);
      const pos = ch === undefined ? null : lay.pos[i];
      const curPos = currentPos(s);
      const shown = s.t >= 0.5 ? s.gB : s.gA;
      const target = pos || curPos || { cx: L.box.x + L.box.w / 2, by: lay.by, S: lay.S };
      if (instant) { s.gA = s.gB = g; s.t = 1; s.from = s.to = target; s.start = 0; return; }
      const samePos = curPos && Math.abs(curPos.cx - target.cx) < 0.3 && Math.abs(curPos.S - target.S) < 0.3;
      if (g === shown && samePos && s.t >= 1) return;
      s.gA = shown; s.gB = g;
      s.from = curPos || target; s.to = target;
      s.start = now; s.dur = g === shown ? dur * 0.9 : dur; s.t = 0;
      s.delay = g === shown ? 0 : (changed++) * stagger;
    });
    L.text = text;
    return lay;
  }
  function currentPos(s) {
    if (!s.from || !s.to) return s.to || s.from;
    const e = easeMelt(Math.min(1, s.t));
    return { cx: s.from.cx + (s.to.cx - s.from.cx) * e, by: s.from.by + (s.to.by - s.from.by) * e, S: s.from.S + (s.to.S - s.from.S) * e };
  }

  function drop(x, y, amp = 1, r = 2.2) { drops.push([x / cssW, 1 - y / cssH, r, amp]); if (drops.length > 6) drops.shift(); }

  // tilt the room with the phone (Android Chrome gives orientation without a prompt)
  window.addEventListener('deviceorientation', (e) => {
    if (e.beta == null) return;
    if (!tilt.base) tilt.base = { b: e.beta, g: e.gamma };
    tilt.has = true;
    const cl = (v) => Math.max(-28, Math.min(28, v));
    tilt.x.set(cl(e.beta - tilt.base.b) * Math.PI / 180 * 0.55);
    tilt.y.set(cl(e.gamma - tilt.base.g) * Math.PI / 180 * 0.55);
    // let the resting angle drift so a new grip doesn't leave the room skewed
    tilt.base.b += (e.beta - tilt.base.b) * 0.004; tilt.base.g += (e.gamma - tilt.base.g) * 0.004;
  });

  // ---------- frame ----------
  const U = (prog) => prog.u;
  const slotBuf = new Float32Array(32), glyphBuf = new Float32Array(32), beadBuf = new Float32Array(24), beadXBuf = new Float32Array(24), dropBuf = new Float32Array(24);
  let last = performance.now(), time = 0, simAcc = 0, raf = 0, running = false;
  const frameLog = [];

  let best = 1, slowChecks = 0, checkAt = 0;
  function adapt(now) {
    if (quality || now < checkAt) return;
    checkAt = now + 1;
    const a = frameLog.slice(-60).sort((x, y) => x - y);
    if (a.length < 60) return;
    best = Math.min(best, a[3]);                       // the screen's own frame time, near enough
    const median = a[30];
    slowChecks = median > best * 1.35 ? slowChecks + 1 : 0;
    if (slowChecks >= 2 && scale > 1.2) { scale = Math.max(1.2, scale * 0.8); slowChecks = 0; resize(); frameLog.length = 0; }
  }
  function frame(nowMs) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (nowMs - last) / 1000)); last = nowMs; time += dt;
    frameLog.push(dt); if (frameLog.length > 240) frameLog.shift();
    adapt(nowMs / 1000);
    const now = nowMs / 1000;

    // advance glyph morphs and springs
    let si = 0;
    for (const L of lines.values()) {
      L.height.step(dt);
      for (const s of L.slots) {
        if (s.t < 1 && s.start) s.t = Math.max(0, Math.min(1, (now - s.start - s.delay) / s.dur));
        const p = currentPos(s);
        const e = easeMelt(s.t);
        const pop = s.gA !== s.gB ? 1 + 0.035 * Math.sin(Math.PI * e) : 1;
        const dip = s.gA !== s.gB ? 1 - 0.32 * Math.sin(Math.PI * e) : 1;
        if (p && (s.gA >= 0 || s.gB >= 0)) { slotBuf.set([p.cx, p.by, p.S * pop, L.height.x * dip], si * 4); }
        else slotBuf.set([0, 0, 0, 0], si * 4);
        glyphBuf.set([s.gA, s.gB, s.gA === s.gB ? 1 : e, p ? (FS * 0.034) : 0], si * 4);
        si++;
      }
    }
    for (; si < 8; si++) slotBuf.set([0, 0, 0, 0], si * 4);
    beads.forEach((b, i) => { b.h.step(dt); b.fill.step(dt); beadBuf.set([b.x, b.y, b.r, Math.max(-0.2, b.h.x)], i * 4); beadXBuf.set([Math.max(0, Math.min(1.05, b.fill.x)), 0, 0, 0], i * 4); });
    for (let i = beads.length; i < 6; i++) beadBuf.set([0, 0, 0, 0], i * 4);
    pill.h.step(dt); pill.press.step(dt); pill.glow.step(dt); if (pill.spill >= 0) { pill.spill += dt / 1.1; if (pill.spill >= 1) pill.spill = -1; }
    mood.gold.step(dt); mood.heat.step(dt); mood.key.step(dt);
    for (let i = 0; i < 3; i++) mood.horizon[i] += (mood.horizonTo[i] - mood.horizon[i]) * Math.min(1, dt * 3);
    if (sweep > -0.5) { sweepT += dt; sweep = -0.3 + sweepT * 1.1; if (sweep > 1.8) sweep = -1; }
    tilt.x.step(dt); tilt.y.step(dt);
    const ax = tilt.has ? tilt.x.x : Math.sin(time * 0.21) * 0.05;
    const ay = tilt.has ? tilt.y.x : Math.sin(time * 0.16 + 1.3) * 0.07;

    gl.bindVertexArray(vao);
    // 1. ripples, fixed 240 steps a second
    simAcc += dt; let steps = 0;
    gl.useProgram(pSim.p); gl.viewport(0, 0, simW, simH);
    gl.uniform2f(U(pSim).uTexel, 1 / simW, 1 / simH); gl.uniform1f(U(pSim).uDamp, 0.987);
    while (simAcc >= 1 / 240 && steps < 8) {
      simAcc -= 1 / 240; steps++;
      const nd = steps === 1 ? drops.length : 0;
      if (nd) { dropBuf.fill(0); drops.forEach((d, i) => dropBuf.set(d, i * 4)); gl.uniform4fv(U(pSim).uDrop, dropBuf); drops = []; }
      gl.uniform1i(U(pSim).uDrops, nd);
      gl.bindFramebuffer(gl.FRAMEBUFFER, sim[1 - cur].f);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sim[cur].t); gl.uniform1i(U(pSim).uPrev, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3); cur = 1 - cur;
    }
    if (steps === 8) simAcc = 0;

    // 2. height
    gl.useProgram(pH.p); gl.bindFramebuffer(gl.FRAMEBUFFER, hT.f); gl.viewport(0, 0, hT.w, hT.h);
    const u = U(pH);
    gl.uniform2f(u.uRes, cssW, cssH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, atlasTex); gl.uniform1i(u.uAtlas, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sim[cur].t); gl.uniform1i(u.uWave, 1);
    gl.uniform2f(u.uAtlasSize, atlas.W, atlas.H); gl.uniform2f(u.uCell, CW, CH);
    gl.uniform1f(u.uFs, FS); gl.uniform1f(u.uSpread, SPREAD); gl.uniform1f(u.uBase, BASE); gl.uniform1f(u.uMid, CW / 2); gl.uniform1f(u.uCap, atlas.cap * FS);
    gl.uniform4fv(u.uSlot, slotBuf); gl.uniform4fv(u.uGlyph, glyphBuf);
    gl.uniform4fv(u.uBead, beadBuf); gl.uniform4fv(u.uBeadX, beadXBuf);
    gl.uniform4f(u.uPill, pill.x, pill.y, pill.hw, pill.hh); gl.uniform4f(u.uPillP, 9, Math.max(0, pill.h.x), Math.max(0, pill.press.x), 0);
    gl.uniform1f(u.uWaveAmp, 3.6); gl.uniform1i(u.uHotSlots, 5); gl.uniform1f(u.uTime, time); gl.uniform1f(u.uSwell, 3.2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 3. shade
    gl.useProgram(pS.p); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height);
    const v = U(pS);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hT.t); gl.uniform1i(v.uH, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sim[cur].t); gl.uniform1i(v.uWave, 1);
    gl.uniform2f(v.uHTexel, 1 / hT.w, 1 / hT.h); gl.uniform1f(v.uPx, 1 / scale);
    gl.uniform2f(v.uRes, cssW, cssH); gl.uniform1f(v.uTime, time);
    const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay);
    gl.uniformMatrix3fv(v.uTilt, false, [cy, sx * sy, -cx * sy, 0, cx, sx, sy, -sx * cy, cx * cy]);
    gl.uniform3fv(v.uHorizon, mood.horizon);
    gl.uniform3f(v.uStripL, 0.55, 0.78, 1.25); gl.uniform3f(v.uStripR, 1.35, 1.0, 0.72);
    gl.uniform1f(v.uKey, mood.key.x);
    gl.uniform1f(v.uGold, Math.max(0, Math.min(1, mood.gold.x))); gl.uniform1f(v.uSweep, sweep);
    gl.uniform1f(v.uHeat, Math.max(0, Math.min(1, mood.heat.x)));
    gl.uniform1f(v.uPillGlow, pill.glow.x);
    gl.uniform4f(v.uPillC, pill.x, pill.y, pill.hw, pill.hh); gl.uniform1f(v.uSpill, pill.spill); gl.uniform3f(v.uPillTint, 1.25, 0.46, 0.12);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', () => { resize(); });

  return {
    atlas, addLine, setText, lines, beads, pill, mood, drop, start,
    sweep() { sweep = -0.2; sweepT = 0; },
    setBeads(list) {
      // keep springs for beads that still exist, so nothing pops
      while (beads.length > list.length) beads.pop();
      list.forEach((b, i) => {
        if (!beads[i]) beads[i] = { x: b.x, y: b.y, r: b.r, h: new Spring(0, 190, 15), fill: new Spring(b.fill, 260, 16) };
        Object.assign(beads[i], { x: b.x, y: b.y, r: b.r });
      });
    },
    stats() { const a = frameLog.slice(); return { frames: a.length, avgMs: (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)) * 1000, worstMs: Math.max(0, ...a) * 1000, scale }; },
    get size() { return { w: cssW, h: cssH }; },
  };
}
