// The tide: one WebGL2 pass draws the light-filled liquid, the frosted glass under the buttons and the countdown
// digits (drawn here so they can sink below the surface and bend). Physics lives in Tide; drawing in createRenderer.

export const N = 40; // wave columns across the screen

export class Spring {
  constructor(x, omega = 8, zeta = 1) { this.x = x; this.v = 0; this.t = x; this.w = omega; this.z = zeta; }
  set(x) { this.x = this.t = x; this.v = 0; }
  step(dt) {
    const n = Math.max(1, Math.ceil(dt / 0.004));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      const a = -this.w * this.w * (this.x - this.t) - 2 * this.z * this.w * this.v;
      this.v += a * h;
      this.x += this.v * h;
    }
  }
  get resting() { return Math.abs(this.x - this.t) < 1e-3 && Math.abs(this.v) < 1e-3; }
}

export class Tide {
  constructor() {
    this.W = 384;
    this.h = new Float32Array(N); // up is positive, css px
    this.v = new Float32Array(N);
    this.level = new Spring(0, 6.5, 0.5); // surface height from the bottom, css px
    this.slope = new Spring(0, 5.2, 0.2); // tilt; low damping so it sloshes
    this.fizz = 0;
    this.fizzTarget = 0.04;
    this.idle = 2.2;
  }
  splash(x, amount, width = 40) {
    for (let i = 0; i < N; i++) {
      const xi = (i / (N - 1)) * this.W;
      this.v[i] += amount * Math.exp(-((xi - x) ** 2) / (2 * width * width));
    }
  }
  stir(amount) {
    for (let i = 0; i < N; i++) this.v[i] += (Math.random() - 0.5) * amount;
  }
  surfaceAt(x, H) {
    const f = Math.min(Math.max(x / this.W, 0), 1) * (N - 1);
    const i = Math.floor(f);
    const a = this.h[i], b = this.h[Math.min(i + 1, N - 1)];
    return H - this.level.x - this.slope.x * (x - this.W / 2) - (a + (b - a) * (f - i));
  }
  step(dt, reduced) {
    this.level.step(dt);
    this.slope.step(dt);
    const n = Math.max(1, Math.ceil(dt / (1 / 240)));
    const k = dt / n;
    const { h, v } = this;
    const K = 16, D = reduced ? 6 : 1.5, S = 950;
    for (let s = 0; s < n; s++) {
      for (let i = 0; i < N; i++) {
        const l = h[i > 0 ? i - 1 : 0], r = h[i < N - 1 ? i + 1 : N - 1];
        v[i] += (-K * h[i] - D * v[i] + S * (l + r - 2 * h[i])) * k;
      }
      for (let i = 0; i < N; i++) h[i] += v[i] * k;
    }
    this.fizz += (this.fizzTarget - this.fizz) * (1 - Math.exp(-dt / 1.6));
  }
}

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
#define N ${N}
out vec4 outColor;
uniform vec2 uSize;
uniform float uDpr, uTime, uLevel, uSlope, uIdle, uFizz, uCaus, uSpark;
uniform float uH[N];
uniform vec3 uSurf, uDeep, uGlow;
uniform vec4 uRect[3];
uniform vec3 uRectP[3];
uniform sampler2D uAtlas;
uniform vec4 uCell;
uniform vec2 uAtlasSize;
uniform vec4 uBox;
uniform float uDigitA;
uniform int uSlots;
uniform vec4 uSlot[6];
uniform float uRoll[6];

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

float waveAt(float x) {
  float fx = clamp(x / uSize.x, 0., 1.) * float(N - 1);
  int i = int(floor(fx));
  float f = fx - float(i);
  float p0 = uH[max(i - 1, 0)], p1 = uH[i], p2 = uH[min(i + 1, N - 1)], p3 = uH[min(i + 2, N - 1)];
  return p1 + .5 * f * (p2 - p0 + f * (2. * p0 - 5. * p1 + 4. * p2 - p3 + f * (3. * (p1 - p2) + p3 - p0)));
}
float idleAt(float x) { return uIdle * (.6 * sin(x * .019 + uTime * 1.25) + .4 * sin(x * .043 - uTime * 1.85 + 1.3)); }
float surfaceY(float x) { return uSize.y - uLevel - uSlope * (x - uSize.x * .5) - waveAt(x) - idleAt(x); }

float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.28318, 6.28318) - 250.;
  vec2 i = p;
  float c = 1.;
  for (int n = 0; n < 4; n++) {
    float tt = t * (1. - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1. / length(vec2(p.x / (sin(i.x + tt) / .005), p.y / (cos(i.y + tt) / .005)));
  }
  c = 1.17 - pow(c / 4., 1.4);
  return pow(abs(c), 8.);
}

float bubbles(vec2 p, float depth) {
  if (uFizz < .002 || depth < 1.) return 0.;
  float acc = 0.;
  for (int L = 0; L < 2; L++) {
    float sz = L == 0 ? 36. : 20.;
    float sp = L == 0 ? 52. : 34.;
    vec2 q = vec2(p.x, p.y + uTime * sp) / sz;
    vec2 id = floor(q);
    float h = hash12(id + float(L) * 17.3);
    if (h > uFizz) continue;
    vec2 f = fract(q) - .5;
    vec2 o = vec2(hash12(id + 3.1) - .5, hash12(id + 7.7) - .5) * .5 + vec2(sin(uTime * 2.6 + h * 40.) * .1, 0.);
    float rr = mix(.035, .1, hash12(id + 11.)) * sz;
    vec2 dv = (f - o) * sz;
    float dd = length(dv);
    float disc = smoothstep(rr + .8, rr - .4, dd);
    float rim = smoothstep(rr * .55, rr, dd);
    float cap = smoothstep(rr * .6, 0., length(dv + vec2(rr * .35, rr * .35)));
    acc += disc * (.18 + .5 * rim + .9 * cap) * (L == 0 ? .55 : .35);
  }
  return acc * smoothstep(1., 22., depth);
}

// Gold dust for a record: tiny glints that drift up and twinkle (bubbles in gold would read as a drink).
float sparkle(vec2 p, float depth) {
  if (uSpark < .01 || depth < 1.) return 0.;
  vec2 q = vec2(p.x, p.y + uTime * 9.) / 24.;
  vec2 id = floor(q);
  float h = hash12(id + 41.);
  if (h > .3) return 0.;
  vec2 o = (vec2(hash12(id + 5.3), hash12(id + 9.1)) - .5) * .6;
  vec2 d = (fract(q) - .5 - o) * 24.;
  float tw = pow(.5 + .5 * sin(uTime * (1.6 + h * 5.) + h * 60.), 6.);
  float star = exp(-abs(d.x) * 1.4) * exp(-abs(d.y) * .3) + exp(-abs(d.y) * 1.4) * exp(-abs(d.x) * .3);
  return (star * .45 + exp(-dot(d, d) * .6)) * tw * uSpark * smoothstep(1., 18., depth);
}

vec3 bodyColor(float depth) {
  float dn = clamp(depth / (uLevel * .95 + 60.), 0., 1.);
  vec3 c = mix(uSurf, uDeep, pow(dn, .75));
  return c + uGlow * (.42 * exp(-depth / 12.) + .16 * exp(-depth / 70.));
}
// Light the liquid throws into the dark above it: a hot band at the surface and a wide wash that colours the room.
vec3 spillColor(float above) { return uGlow * (.30 * exp(-above / 30.) + .085 * exp(-above / 140.) + .05 * exp(-above / 420.)); }

// The scene as frosted glass would see it: the same liquid, with every edge and detail softened. No blur pass needed.
vec3 frostScene(vec2 p) {
  float d = p.y - (uSize.y - uLevel - uSlope * (p.x - uSize.x * .5) - waveAt(p.x));
  vec3 b = bodyColor(max(d, 0.) + 6.) + uGlow * .3 * exp(-abs(d) / 24.);
  return mix(spillColor(max(-d, 0.)), b, smoothstep(-20., 20., d));
}

float sdRBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }

float glyph(float idx, vec2 l, float slotW) {
  float S = uCell.w;
  vec2 c = vec2(l.x * S + (uCell.x - slotW * S) * .5, l.y * S);
  if (c.x < 0. || c.y < 0. || c.x > uCell.x || c.y > uCell.y) return 0.;
  vec2 cell = vec2(mod(idx, uCell.z), floor(idx / uCell.z)) * uCell.xy;
  return texture(uAtlas, (cell + c) / uAtlasSize).r;
}
float digits(vec2 q) {
  vec2 l = q - uBox.xy;
  float cov = 0.;
  float sh = uBox.w * .1;
  for (int s = 0; s < 6; s++) {
    if (s >= uSlots) break;
    vec4 sl = uSlot[s];
    float lx = l.x - sl.x;
    if (lx < -2. || lx > sl.y + 2.) continue;
    // The old digit sinks and fades, then the new one settles in from above; they never overlap.
    float r = uRoll[s];
    float a = clamp(r * 2., 0., 1.), b = clamp(r * 2. - 1., 0., 1.);
    a = a * a * (3. - 2. * a);
    b = 1. - (1. - b) * (1. - b);
    cov += glyph(sl.z, vec2(lx, l.y - a * sh), sl.y) * (1. - a);
    if (r > 0.) cov += glyph(sl.w, vec2(lx, l.y + (1. - b) * sh), sl.y) * b;
  }
  return min(cov, 1.);
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  float px = 1. / uDpr;
  float sy = surfaceY(p.x);
  float d = p.y - sy;
  float depth = max(d, 0.);
  float inside = smoothstep(-.7 * px, .7 * px, d);
  float slope = (surfaceY(p.x + 3.) - surfaceY(p.x - 3.)) / 6.;

  vec3 body = bodyColor(depth);
  float facing = clamp(.62 + slope * 2.4, .2, 1.);
  body += mix(uGlow, vec3(1.), .62) * exp(-depth / 1.15) * facing;
  if (depth < 280.) body += uGlow * caustic(p / 250. + vec2(uTime * .011, 0.), uTime * .38) * uCaus * exp(-depth / 120.);
  body += bubbles(p, depth) * mix(uGlow, vec3(1.), .55) * .85;
  body += sparkle(p, depth) * vec3(1., .96, .86);
  vec3 col = mix(spillColor(max(-d, 0.)), body, inside);

  if (uDigitA > .002 && p.y > uBox.y - 40. && p.y < uBox.y + uBox.w + 40. && p.x > uBox.x - 30. && p.x < uBox.x + uBox.z + 30.) {
    vec2 q = p;
    float bend = smoothstep(0., 3., depth);
    q.x += (-slope * 11. + sin(p.y * .055 + uTime * 2.2) * 1.4) * bend;
    q.y -= 3. * bend;
    float cov = digits(q) * uDigitA;
    vec3 under = mix(body, uGlow * 1.1 + vec3(.24), .8);
    col = mix(col, mix(vec3(.965, .972, .985), under, inside), cov);
  }

  for (int k = 0; k < 3; k++) {
    vec3 rp = uRectP[k];
    if (rp.z < .002) continue;
    vec4 r = uRect[k];
    vec2 c = r.xy + r.zw * .5;
    float sd = sdRBox(p - c, r.zw * .5, rp.x);
    float shd = sdRBox(p - c - vec2(0., 7.), r.zw * .5, rp.x);
    col *= 1. - .34 * rp.z * (1. - smoothstep(-6., 18., shd)) * step(0., sd);
    float m = smoothstep(.7 * px, -.7 * px, sd) * rp.z;
    if (m > 0.) {
      vec3 g = frostScene(p);
      bool milk = rp.y > 1.5;
      // Clear glass darkens over bright liquid so its white label stays readable.
      float lum = dot(g, vec3(.2126, .7152, .0722));
      vec3 glass = milk ? mix(g, vec3(.955, .96, .968), .9) + uGlow * .04 : g * (.8 - .36 * smoothstep(.15, .6, lum)) + vec3(.05) + uGlow * .02;
      float top = clamp(1. - (p.y - r.y) / r.w, 0., 1.);
      glass += exp(-abs(sd) / .9) * (.05 + .32 * top * top) * (milk ? .55 : 1.);
      col = mix(col, glass, m);
    }
  }

  col = min(col, vec3(1.));
  float n = hash12(gl_FragCoord.xy + fract(uTime * 7.) * 91.) + hash12(gl_FragCoord.xy * 1.37 + 17.) - 1.;
  col += n / 255. * step(.001, col.r + col.g + col.b);
  outColor = vec4(col, 1.);
}`;

const UNIFORMS = ['uSize', 'uDpr', 'uTime', 'uLevel', 'uSlope', 'uIdle', 'uFizz', 'uCaus', 'uSpark', 'uH', 'uSurf', 'uDeep', 'uGlow',
  'uRect', 'uRectP', 'uAtlas', 'uCell', 'uAtlasSize', 'uBox', 'uDigitA', 'uSlots', 'uSlot', 'uRoll'];

export function createRenderer(canvas, { keep = false } = {}) {
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance',
    preserveDrawingBuffer: keep,
  });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  try {
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    console.error(err);
    return null;
  }
  gl.useProgram(prog);
  const u = {};
  for (const name of UNIFORMS) u[name] = gl.getUniformLocation(prog, name);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 1, 1, 0, gl.RED, gl.UNSIGNED_BYTE, new Uint8Array(1));
  gl.uniform1i(u.uAtlas, 0);

  let W = 1, H = 1, scale = 1, atlas = null;
  const slotBuf = new Float32Array(24), rollBuf = new Float32Array(6);
  const rectBuf = new Float32Array(12), rectPBuf = new Float32Array(9);

  return {
    get scale() { return scale; },
    resize(w, h, s) {
      if (w === W && h === H && s === scale) return;
      W = w; H = h; scale = s;
      canvas.width = Math.round(w * s);
      canvas.height = Math.round(h * s);
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    // Glyphs 0–9 and ':' drawn once at device resolution, in two rows of six.
    buildAtlas(font, sizeCss, atlasScale) {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      const fontPx = Math.round(sizeCss * atlasScale);
      const set = () => { ctx.font = `${font.weight} ${fontPx}px ${font.family}`; };
      set();
      const glyphs = '0123456789:';
      const widths = [...glyphs].map((g) => ctx.measureText(g).width);
      const digitW = Math.max(...widths.slice(0, 10));
      const asc = ctx.measureText('0').actualBoundingBoxAscent;
      const cellW = Math.ceil(digitW + fontPx * 0.06), cellH = Math.ceil(fontPx * 1.18);
      c.width = cellW * 6; c.height = cellH * 2;
      set();
      // Opaque black first, so the red channel is the glyph's coverage (white on transparent would upload as solid 255).
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      [...glyphs].forEach((g, i) => ctx.fillText(g, (i % 6) * cellW + cellW / 2, Math.floor(i / 6) * cellH + (cellH + asc) / 2));
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, c);
      atlas = { cellW, cellH, atlasScale, w: c.width, h: c.height };
      return { digitW: digitW / atlasScale, colonW: widths[10] / atlasScale, boxH: cellH / atlasScale };
    },
    draw(s) {
      gl.uniform2f(u.uSize, W, H);
      gl.uniform1f(u.uDpr, scale);
      gl.uniform1f(u.uTime, s.time);
      gl.uniform1f(u.uLevel, s.tide.level.x);
      gl.uniform1f(u.uSlope, s.tide.slope.x);
      gl.uniform1f(u.uIdle, s.tide.idle);
      gl.uniform1f(u.uFizz, s.tide.fizz);
      gl.uniform1f(u.uCaus, s.color.caustics);
      gl.uniform1f(u.uSpark, s.color.spark);
      gl.uniform1fv(u.uH, s.tide.h);
      gl.uniform3fv(u.uSurf, s.color.surf);
      gl.uniform3fv(u.uDeep, s.color.deep);
      gl.uniform3fv(u.uGlow, s.color.glow);
      s.rects.forEach((r, i) => {
        rectBuf.set([r.x, r.y, r.w, r.h], i * 4);
        rectPBuf.set([r.r, r.kind, r.alpha], i * 3);
      });
      for (let i = s.rects.length; i < 3; i++) rectPBuf[i * 3 + 2] = 0;
      gl.uniform4fv(u.uRect, rectBuf);
      gl.uniform3fv(u.uRectP, rectPBuf);
      const dg = s.digits;
      if (atlas && dg.alpha > 0.002) {
        gl.uniform4f(u.uCell, atlas.cellW, atlas.cellH, 6, atlas.atlasScale);
        gl.uniform2f(u.uAtlasSize, atlas.w, atlas.h);
        gl.uniform4f(u.uBox, dg.box.x, dg.box.y, dg.box.w, dg.box.h);
        dg.slots.forEach((sl, i) => {
          slotBuf.set([sl.x, sl.w, sl.cur, sl.next], i * 4);
          rollBuf[i] = sl.roll;
        });
        gl.uniform1i(u.uSlots, dg.slots.length);
        gl.uniform4fv(u.uSlot, slotBuf);
        gl.uniform1fv(u.uRoll, rollBuf);
      }
      gl.uniform1f(u.uDigitA, atlas ? dg.alpha : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

// Colour follows recovery: hot just after the set, cooling through violet to a calm aqua when you're ready.
// Interpolated in OKLab so the journey stays vivid instead of going muddy halfway.
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function toLab([r, g, b]) {
  [r, g, b] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromLab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s].map((c) => Math.min(1, Math.max(0, gam(Math.max(0, c)))));
}
const stop = (surf, deep, glow) => ({ surf: toLab(hex(surf)), deep: toLab(hex(deep)), glow: toLab(hex(glow)) });
const HOT = stop('#ff4b2b', '#3f0416', '#ff9c5e');
const MID = stop('#a83cff', '#170548', '#d58cff');
const COOL = stop('#16cfc2', '#01202f', '#7dffe8');
const GOLD = stop('#eb9a2c', '#4a0c03', '#ffe9b0'); // molten: white-gold at the top, deep ember below
const mixLab = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export function paletteAt(p, gold) {
  const out = {};
  for (const key of ['surf', 'deep', 'glow']) {
    let c = p < 0.55 ? mixLab(HOT[key], MID[key], p / 0.55) : mixLab(MID[key], COOL[key], (p - 0.55) / 0.45);
    if (gold > 0) c = mixLab(c, GOLD[key], gold);
    out[key] = fromLab(c);
  }
  out.caustics = 0.16 + 0.3 * gold;
  out.spark = gold;
  return out;
}
