/* The picture behind the workout: the real equipment for this set, rendered, sharp at the top and melting into a
   colour field at the bottom (Oura's mountain idea, but the picture is your own bar, loaded with this set's plates).
   It renders only when something changes (a weight, a focus pull, a light sweep, a new exercise), never in a loop.
   Pipeline: scene (linear HDR, MSAA) → 4 blur levels at 1/2…1/16 size → one composite pass that picks the blur level
   by height, lays the field over the bottom, tone maps and dithers (no banding in the dark). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const { Vector3 } = THREE;
const RM = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- materials ---------- */
const chrome = () => new THREE.MeshPhysicalMaterial({ color: 0xd9dade, metalness: 1, roughness: 0.2 });
const satin = () => new THREE.MeshPhysicalMaterial({ color: 0xb9bbc0, metalness: 1, roughness: 0.32 });
const paint = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.2 });

/* Calibrated plates (IPF colours, real sizes in metres). Heaviest go on first. */
const PLATES = [
  { kg: 25, d: 0.45, t: 0.027, color: 0x7e0a10, ink: '#f4efe6' },
  { kg: 20, d: 0.45, t: 0.0226, color: 0x123a8a, ink: '#f4efe6' },
  { kg: 15, d: 0.4, t: 0.021, color: 0xc99510, ink: '#141414' },
  { kg: 10, d: 0.325, t: 0.021, color: 0x146a35, ink: '#f4efe6' },
  { kg: 5, d: 0.228, t: 0.02, color: 0xe9e6de, ink: '#151515' },
  { kg: 2.5, d: 0.19, t: 0.015, color: 0x121214, ink: '#e9e6de' },
  { kg: 1.25, d: 0.16, t: 0.012, chrome: true },
  { kg: 0.5, d: 0.134, t: 0.008, chrome: true },
];
export function platesFor(total, bar = 20) {
  let side = Math.max(0, (total - bar) / 2);
  const out = [];
  for (const p of PLATES) while (side >= p.kg - 1e-6) { out.push(p); side -= p.kg; }
  return out;
}

/* A lathe profile with every corner softened: points right next to each corner keep flat faces flat and turn the corner
   into a tiny rounded edge that catches the light, like a machined part. Profile = [radius, position along the axis]. */
function lathe(profile, eps = 0.0007, segs = 128) {
  const pts = [];
  const near = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), k = Math.min(eps, l / 3) / l; return new THREE.Vector2(a[0] + dx * k, a[1] + dy * k); };
  profile.forEach((p, i) => {
    if (profile[i - 1]) pts.push(near(p, profile[i - 1]));
    pts.push(new THREE.Vector2(p[0], p[1]));
    if (profile[i + 1]) pts.push(near(p, profile[i + 1]));
  });
  const g = new THREE.LatheGeometry(pts, segs);
  g.rotateZ(-Math.PI / 2); // lathe axis Y → the bar's axis X
  return g;
}
const shadowed = (grp) => { grp.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return grp; };

function canvasTex(size, draw, srgb = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const FONT = (w, px) => `${w} ${px}px Geist, system-ui, sans-serif`;

/* Lettering on a plate's outer face, drawn once per plate kind. */
const faceCache = new Map();
function faceTexture(p, rOut) {
  if (faceCache.has(p.kg)) return faceCache.get(p.kg);
  const tex = canvasTex(1024, (g, S) => {
    const px = S / 2 / rOut;
    g.fillStyle = '#' + new THREE.Color(p.color).getHexString(THREE.SRGBColorSpace);
    g.fillRect(0, 0, S, S);
    g.translate(S / 2, S / 2);
    g.fillStyle = g.strokeStyle = p.ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const big = p.d >= 0.3;
    const rText = big ? 0.158 : p.d / 2 * 0.74, h = big ? 0.064 : p.d * 0.15;
    for (const rot of big ? [0, Math.PI] : [0]) {
      g.save();
      g.rotate(rot);
      g.font = FONT(600, h * px);
      g.fillText(String(p.kg), 0, -rText * px);
      g.font = FONT(600, h * 0.34 * px);
      g.fillText('KG', 0, -(rText - h * 0.68) * px);
      g.restore();
    }
    if (!big) return;
    // a thin ring and the maker's line along it, like a calibrated plate
    g.lineWidth = 0.0016 * px;
    g.globalAlpha = 0.85;
    g.beginPath(); g.arc(0, 0, 0.098 * px, 0, Math.PI * 2); g.stroke();
    g.font = FONT(500, 0.0105 * px);
    const line = `AVEN · CALIBRATED · ${p.kg} KG · ±10 G · `;
    for (const start of [Math.PI * 0.62, -Math.PI * 0.38]) {
      [...line].forEach((ch, i, a) => {
        g.save(); g.rotate(start + (i / a.length) * Math.PI * 0.76 + Math.PI / 2); g.fillText(ch, 0, -0.112 * px); g.restore();
      });
    }
  });
  faceCache.set(p.kg, tex);
  return tex;
}

/* Text cut into metal: a roughness map where the letters are rougher (they show as a duller line). */
function engraving(draw) {
  return canvasTex(512, (g, s) => {
    g.fillStyle = '#242424';
    g.fillRect(0, 0, s, s);
    g.translate(s / 2, s / 2);
    g.fillStyle = g.strokeStyle = '#9a9a9a';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    draw(g, s);
  }, false);
}

function plateMesh(p) {
  const R = p.d / 2, t = p.t, rh = 0.0252;
  const grp = new THREE.Group();
  if (p.chrome) {
    const body = new THREE.Mesh(lathe([[rh, t / 2], [R * 0.55, t / 2], [R * 0.6, t / 2 - 0.0012], [R - 0.004, t / 2 - 0.0012], [R, t / 2 - 0.003], [R, -t / 2 + 0.003], [R - 0.004, -t / 2], [rh, -t / 2], [rh, t / 2]]), chrome());
    const face = new THREE.Mesh(new THREE.RingGeometry(rh + 0.004, R - 0.0042, 128, 1), chrome());
    face.material.roughnessMap = engraving((g, s) => {
      const px = s / 2 / R;
      g.font = FONT(600, 0.016 * px);
      g.fillText(`${p.kg} KG`, 0, -R * 0.78 * px);
      g.lineWidth = 0.0009 * px;
      g.beginPath(); g.arc(0, 0, R * 0.6 * px, 0, Math.PI * 2); g.stroke();
    });
    face.rotation.y = Math.PI / 2;
    face.position.x = t / 2 - 0.0011;
    grp.add(body, face);
    return shadowed(grp);
  }
  const lip = Math.min(0.012, R * 0.1), rec = 0.0016, rb = 0.043;
  const body = new THREE.Mesh(lathe([
    [rb, -t / 2 + rec], [R - lip - 0.004, -t / 2 + rec], [R - lip, -t / 2], [R - 0.0025, -t / 2], [R, -t / 2 + 0.0025],
    [R, t / 2 - 0.0025], [R - 0.0025, t / 2], [R - lip, t / 2], [R - lip - 0.004, t / 2 - rec], [rb, t / 2 - rec],
  ]), paint(p.color));
  const fm = paint(0xffffff);
  fm.map = faceTexture(p, R - lip - 0.004);
  const face = new THREE.Mesh(new THREE.RingGeometry(rb, R - lip - 0.004, 128, 1), fm);
  face.rotation.y = Math.PI / 2;
  face.position.x = t / 2 - rec + 0.00005;
  const hub = new THREE.Mesh(lathe([[rh, t / 2 + 0.001], [rb + 0.002, t / 2 + 0.001], [rb + 0.002, -t / 2 - 0.001], [rh, -t / 2 - 0.001], [rh, t / 2 + 0.001]], 0.0006), satin());
  grp.add(body, face, hub);
  return shadowed(grp);
}

function knurl(repeat) {
  const t = canvasTex(64, (g) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#000';
    g.lineWidth = 3;
    for (let i = -64; i <= 128; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke();
      g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 64, 0); g.stroke();
    }
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  return t;
}

/* The studio: one seamless sweep (floor curving up into the wall, like a product photo), so there is never a horizon
   line. Unlit black: only the reflection and the halo give it shape (lit dark rubber reads as brown). The floor part is
   a little see-through, so the mirrored equipment under it shows as a reflection; the wall part is solid. */
function sweepBackdrop(dir) {
  const W = 14, Dw = 1.7, Rc = 0.9, H = 6, near = -5, flatEnd = Dw - Rc;
  const prof = [];
  for (let i = 0; i <= 12; i++) prof.push([near + (flatEnd - near) * (i / 12), 0]);
  for (let i = 1; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push([flatEnd + Math.sin(a) * Rc, Rc - Math.cos(a) * Rc]); }
  for (let i = 1; i <= 8; i++) prof.push([Dw, Rc + (H - Rc) * (i / 8)]);
  let len = 0;
  const L = prof.map((p, i) => (i ? (len += Math.hypot(p[0] - prof[i - 1][0], p[1] - prof[i - 1][1])) : 0));
  const pos = [], uv = [], idx = [];
  prof.forEach(([d, y], i) => {
    for (const u of [-1, 1]) { pos.push(u * W / 2, y, d); uv.push((u + 1) / 2, L[i] / len); }
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  const alpha = canvasTex(256, (cx) => {
    const gr = cx.createLinearGradient(0, 256, 0, 0); // canvas bottom = v 0 (the near floor)
    gr.addColorStop(0, 'rgb(228,228,228)');
    gr.addColorStop(L[12] / len, 'rgb(228,228,228)');
    gr.addColorStop(L[24] / len, 'rgb(255,255,255)');
    gr.addColorStop(1, 'rgb(255,255,255)');
    cx.fillStyle = gr;
    cx.fillRect(0, 0, 256, 256);
  }, false);
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, alphaMap: alpha, depthWrite: false }));
  mesh.rotation.y = Math.atan2(dir.x, dir.z); // local +d points away from the camera
  return mesh;
}

/* ---------- equipment ---------- */

/* Barbell: one sleeve with this set's plates and a collar, resting on its biggest plates. */
function makeBarbell(load) {
  const g = new THREE.Group();
  const SLEEVE = 0.415;
  const sleeve = new THREE.Mesh(lathe([[0.001, 0], [0.025, 0], [0.025, SLEEVE - 0.004], [0.0232, SLEEVE - 0.0015], [0.0215, SLEEVE], [0.001, SLEEVE]], 0.0006), chrome());
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.0212, 64), satin());
  cap.material.roughnessMap = engraving((c, s) => {
    const px = s / 2 / 0.0212;
    c.lineWidth = 0.0004 * px;
    c.beginPath(); c.arc(0, 0, 0.0172 * px, 0, Math.PI * 2); c.stroke();
    c.font = FONT(600, 0.0062 * px); c.fillText('20', 0, -0.0012 * px);
    c.font = FONT(600, 0.0026 * px); c.fillText('KG', 0, 0.0052 * px);
  });
  cap.rotation.y = Math.PI / 2;
  cap.position.x = SLEEVE + 0.0002;
  const inner = new THREE.Mesh(lathe([[0.014, -0.034], [0.032, -0.034], [0.0365, -0.031], [0.0365, -0.003], [0.033, 0], [0.014, 0]]), chrome());
  const shaftMat = satin();
  shaftMat.bumpMap = knurl([40, 6]);
  shaftMat.bumpScale = 0.6;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.4, 48, 1, true), shaftMat);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.x = -0.734;
  // a slim lock-jaw collar: black anodised ring with a chrome band where the thumb presses
  const ano = new THREE.MeshPhysicalMaterial({ color: 0x18191c, metalness: 0.7, roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const collar = new THREE.Group();
  collar.add(
    new THREE.Mesh(lathe([[0.0256, -0.018], [0.043, -0.018], [0.046, -0.015], [0.046, 0.015], [0.043, 0.018], [0.0256, 0.018], [0.0256, -0.018]]), ano),
    new THREE.Mesh(lathe([[0.0465, -0.006], [0.0478, -0.0045], [0.0478, 0.0045], [0.0465, 0.006]], 0.0004), chrome()),
  );
  const plates = new THREE.Group();
  const ground = sweepBackdrop(new Vector3(-0.902, 0, -0.432));
  g.add(shadowed(sleeve), cap, shadowed(inner), shadowed(shaft), shadowed(collar), plates, ground);

  let stack = []; // [{ kg, mesh, at }]
  const layout = (kgs) => {
    let x = 0.004;
    return kgs.map((p) => { const at = x + p.t / 2; x += p.t + 0.0015; return { p, at }; }).concat([{ end: x }]);
  };
  const restOn = (kgs) => -Math.max(0.0, ...kgs.map((p) => p.d / 2));
  function place(kg) {
    const L = layout(platesFor(kg));
    const end = L.pop().end;
    stack.forEach((s) => plates.remove(s.mesh));
    stack = L.map(({ p, at }) => { const mesh = plateMesh(p); mesh.position.x = at; plates.add(mesh); return { kg: p.kg, p, mesh, at }; });
    collar.position.x = end + 0.018;
    ground.position.y = restOn(L.map((s) => s.p));
  }
  place(load);

  /* Loading the bar: the collar comes off, plates that change slide off the sleeve and fade, the new ones slide on,
     the collar goes back. Plates that stay never move. */
  function loadTo(kg, tick) {
    const want = platesFor(kg);
    let keep = 0;
    while (keep < stack.length && keep < want.length && stack[keep].kg === want[keep].kg) keep++;
    const going = stack.slice(keep);
    const L = layout(want);
    const end = L.pop().end;
    const coming = L.slice(keep).map(({ p, at }) => {
      const mesh = plateMesh(p);
      mesh.position.x = at + 0.16;
      mesh.traverse((o) => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 0; } });
      plates.add(mesh);
      return { kg: p.kg, p, mesh, at };
    });
    going.forEach((s) => s.mesh.traverse((o) => { if (o.isMesh) o.material.transparent = true; }));
    const c0 = collar.position.x, c1 = end + 0.018;
    const out = Math.max(...going.map((s) => s.at), c0 - 0.018) + 0.06;
    const fadeTo = (m, a) => m.traverse((o) => { if (o.isMesh) o.material.opacity = a; });
    const easeOut = (t) => 1 - (1 - t) ** 3, easeIn = (t) => t * t;
    const ground0 = ground.position.y, ground1 = restOn(want);
    return tick(RM.matches ? 1 : 620, (t) => {
      // 0–0.45: collar and leaving plates slide out; 0.35–1: new plates and collar slide in
      const a = Math.min(1, t / 0.45), b = Math.max(0, (t - 0.35) / 0.65);
      for (const s of going) { s.mesh.position.x = s.at + easeIn(a) * 0.18; fadeTo(s.mesh, 1 - a); }
      for (const s of coming) { s.mesh.position.x = s.at + (1 - easeOut(b)) * 0.16; fadeTo(s.mesh, Math.min(1, b * 1.6)); }
      collar.position.x = b > 0 ? out + (c1 - out) * easeOut(b) : c0 + (out - c0) * easeIn(a);
      ground.position.y = ground0 + (ground1 - ground0) * easeOut(b);
    }).then(() => {
      going.forEach((s) => plates.remove(s.mesh));
      coming.forEach((s) => s.mesh.traverse((o) => { if (o.isMesh) { o.material.transparent = false; o.material.opacity = 1; } }));
      stack = stack.slice(0, keep).concat(coming);
    });
  }
  return {
    group: g, ground,
    shot: { pos: new Vector3(1.6, 0.06, 0.74), look: new Vector3(0.05, 0, 0), fov: 33, shift: 0.36 },
    loadTo,
  };
}

/* Dumbbells: a pair of round urethane dumbbells on the floor, the number on the near end. */
function makeDumbbells(load) {
  const g = new THREE.Group();
  const R = 0.1, HL = 0.105, HW = 0.0675;
  const ure = () => new THREE.MeshPhysicalMaterial({ color: 0x1b1c1f, roughness: 0.5, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.35 });
  const faceMats = [];
  const numberTex = (kg) => canvasTex(512, (c, s) => {
    const px = s / 2 / (R - 0.008);
    c.fillStyle = '#1b1c1f';
    c.fillRect(0, 0, s, s);
    c.translate(s / 2, s / 2);
    c.fillStyle = '#efe9df';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = FONT(600, 0.05 * px);
    c.fillText(String(kg), 0, -0.004 * px);
    c.font = FONT(600, 0.015 * px);
    c.fillText('KG', 0, 0.035 * px);
    c.strokeStyle = '#efe9df';
    c.globalAlpha = 0.5;
    c.lineWidth = 0.0012 * px;
    c.beginPath(); c.arc(0, 0, 0.074 * px, 0, Math.PI * 2); c.stroke();
  });
  const one = (kg) => {
    const d = new THREE.Group();
    const handleMat = satin();
    handleMat.bumpMap = knurl([10, 3]);
    handleMat.bumpScale = 0.5;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, HW * 2, 48, 1, true), handleMat);
    handle.rotation.z = Math.PI / 2;
    d.add(handle);
    for (const side of [-1, 1]) {
      const head = new THREE.Mesh(lathe([[0.017, 0], [R - 0.012, 0], [R - 0.003, 0.004], [R, 0.012], [R, HL - 0.012], [R - 0.003, HL - 0.004], [R - 0.012, HL], [0.03, HL], [0.017, HL]], 0.0009), ure());
      head.scale.x = side;
      head.position.x = side * HW;
      // a steel ring where the head meets the handle
      const ring = new THREE.Mesh(lathe([[0.017, -0.006], [0.032, -0.006], [0.032, 0], [0.017, 0]], 0.0005), chrome());
      ring.scale.x = side;
      ring.position.x = side * HW;
      d.add(head, ring);
      const fm = new THREE.MeshPhysicalMaterial({ map: numberTex(kg), roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.35 });
      faceMats.push(fm);
      const face = new THREE.Mesh(new THREE.CircleGeometry(R - 0.008, 96), fm);
      face.rotation.y = side * Math.PI / 2;
      face.position.x = side * (HW + HL + 0.0002);
      d.add(face);
    }
    return shadowed(d);
  };
  const a = one(load), b = one(load);
  a.position.set(0.02, 0, 0.0);
  b.position.set(-0.07, 0, -0.27);
  b.rotation.y = 0.12;
  const ground = sweepBackdrop(new Vector3(-0.902, 0, -0.432));
  ground.position.y = -R;
  g.add(a, b, ground);
  return {
    group: g, ground,
    shot: { pos: new Vector3(1.3, 0.1, 0.62), look: new Vector3(0.16, -0.01, -0.06), fov: 33, shift: 0.38 },
    // a new number on the faces; the screen cross-fades to it (a dumbbell isn't "loaded")
    loadTo(kg, tick, swap) { return swap(() => faceMats.forEach((m) => { m.map.dispose(); m.map = numberTex(kg); m.needsUpdate = true; })); },
  };
}

/* Cable stack: black plates with their numbers, two guide rods, and the pin in the plate you picked. */
function makeCable(load) {
  const g = new THREE.Group();
  const N = 20, STEP = 5, PH = 0.024, GAP = 0.0012, PW = 0.3, PD = 0.15;
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x141416, roughness: 0.48, metalness: 0.2, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const geo = new RoundedBoxGeometry(PW, PH, PD, 3, 0.0022);
  const labelGeo = new THREE.PlaneGeometry(0.05, PH * 0.62);
  const top = 0.06;
  for (let i = 0; i < N; i++) {
    const y = top - i * (PH + GAP);
    const m = new THREE.Mesh(geo, steel);
    m.position.y = y;
    g.add(m);
    const label = new THREE.Mesh(labelGeo, new THREE.MeshPhysicalMaterial({
      map: canvasTex(128, (c, s) => {
        c.fillStyle = '#141416'; c.fillRect(0, 0, s, s);
        c.fillStyle = '#e8e2d6'; c.textAlign = 'right'; c.textBaseline = 'middle';
        c.font = FONT(600, s * 0.58);
        c.save(); c.scale(1, 0.5 / 0.62 * 1.6); c.fillText(String((i + 1) * STEP), s * 0.92, s * 0.5 / (0.5 / 0.62 * 1.6)); c.restore();
      }), roughness: 0.5, clearcoat: 0.35,
    }));
    label.position.set(PW / 2 - 0.035, y, PD / 2 + 0.0004);
    g.add(label);
    // the hole the pin goes into
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.0065, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    hole.position.set(0, y, PD / 2 + 0.0004);
    g.add(hole);
  }
  // the top plate that carries the cable, and the guide rods
  const head = new THREE.Mesh(new RoundedBoxGeometry(PW, 0.05, PD, 3, 0.004), steel);
  head.position.y = top + PH / 2 + 0.028;
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 2, 12), new THREE.MeshPhysicalMaterial({ color: 0x0b0b0c, roughness: 0.6 }));
  cable.position.y = top + 1.05;
  g.add(head, cable);
  for (const x of [-0.12, 0.12]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 3, 32), chrome());
    rod.position.set(x, 0, 0);
    g.add(rod);
  }
  // the pin: a chrome rod with a red knob, pushed into the plate you picked
  const pin = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.16, 24), chrome());
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = 0;
  const knob = new THREE.Mesh(lathe([[0.004, 0], [0.016, 0], [0.019, 0.006], [0.019, 0.03], [0.016, 0.036], [0.004, 0.036]], 0.0008, 64), paint(0x9b0d16));
  knob.rotation.y = -Math.PI / 2;
  knob.position.z = 0.08;
  pin.add(shaft, knob);
  g.add(shadowed(pin));
  const pinY = (kg) => top - (Math.round(kg / STEP) - 1) * (PH + GAP);
  const IN = PD / 2 - 0.068, OUT = IN + 0.12;
  pin.position.set(0, pinY(load), IN);
  shadowed(g);
  // heavy weights put the pin low in the stack: the camera goes down with it
  const shot = { pos: new Vector3(0.62, 0.12, 1.25), look: new Vector3(0.0, -0.02, 0.0), fov: 29, shift: 0.3 };
  const base = [shot.pos.y, shot.look.y];
  const aim = (y) => { const dy = Math.min(0, y - pinY(30)); shot.pos.y = base[0] + dy; shot.look.y = base[1] + dy; };
  aim(pin.position.y);
  return {
    group: g, ground: null, shot,
    /* Pin out, along the stack, pin in. */
    loadTo(kg, tick) {
      const y0 = pin.position.y, y1 = pinY(kg);
      const ease = (t) => 0.5 - Math.cos(Math.PI * Math.min(1, Math.max(0, t))) / 2;
      return tick(RM.matches ? 1 : 640, (t) => {
        const a = ease(t / 0.3), b = ease((t - 0.25) / 0.5), c = ease((t - 0.7) / 0.3);
        pin.position.z = IN + (OUT - IN) * (a - c);
        pin.position.y = y0 + (y1 - y0) * b;
        aim(pin.position.y);
      });
    },
  };
}

const KINDS = { barbell: makeBarbell, dumbbells: makeDumbbells, cable: makeCable };

/* ---------- the studio light ---------- */
function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 20, 20), new THREE.MeshBasicMaterial({ color: 0x050506, side: THREE.BackSide })));
  const fall = canvasTex(128, (c) => { // a soft box brighter at the top: flat metal shows a gradient, never a flat tint
    const gr = c.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.55, '#555'); gr.addColorStop(1, '#000');
    c.fillStyle = gr; c.fillRect(0, 0, 128, 128);
  }, false);
  const o = new Vector3();
  const panel = (w, h, pos, k, color = 0xffffff, map = null) => {
    const m = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, map });
    m.color.multiplyScalar(k);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.copy(pos);
    p.lookAt(o);
    env.add(p);
  };
  panel(7, 2.2, new Vector3(-1, 6.5, 3), 9, 0xfff4ea); // large soft key overhead, a little in front
  panel(0.8, 8, new Vector3(6.5, 0.5, 1.5), 12, 0xffe2cc); // tall strip, right: warm edges and chrome
  panel(0.6, 7, new Vector3(-6, 0.5, -1), 4, 0xd6e2ff); // tall strip, left, cool
  panel(3, 1.2, new Vector3(2, 2, 7), 1.2); // small front fill
  panel(10, 10, new Vector3(0, -7, 1), 0.18); // faint floor bounce
  panel(4, 3, new Vector3(6, 2.4, -3.2), 1.8, 0xfff0e6); // what painted faces mirror: a sheen
  panel(6, 5, new Vector3(6.2, -0.4, -2.6), 0.8, 0xffffff, fall); // what flat chrome faces mirror: a falling grey
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.02).texture;
  pm.dispose();
  return tex;
}

/* ---------- post ---------- */
const VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const BLUR = /* glsl */`
uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
void main(){
  vec4 c = texture2D(tex, vUv) * 0.2270270270;
  vec2 o1 = dir * 1.3846153846, o2 = dir * 3.2307692308;
  c += (texture2D(tex, vUv + o1) + texture2D(tex, vUv - o1)) * 0.3162162162;
  c += (texture2D(tex, vUv + o2) + texture2D(tex, vUv - o2)) * 0.0702702703;
  gl_FragColor = c;
}`;
const COPY = /* glsl */`uniform sampler2D tex; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tex, vUv); }`;
const COMPOSITE = /* glsl */`
#include <common>
#include <dithering_pars_fragment>
uniform sampler2D t0, t1, t2, t3, t4, tPrev;
uniform float focusY, spread, defocus, prevMix, prevZoom, curZoom, dim;
uniform vec3 field;
varying vec2 vUv;
vec4 pick(float l, vec2 uv){
  l = clamp(l, 0., 4.);
  vec4 c = texture2D(t0, uv) * max(0., 1. - abs(l));
  c += texture2D(t1, uv) * max(0., 1. - abs(l - 1.));
  c += texture2D(t2, uv) * max(0., 1. - abs(l - 2.));
  c += texture2D(t3, uv) * max(0., 1. - abs(l - 3.));
  c += texture2D(t4, uv) * max(0., 1. - abs(l - 4.));
  return c;
}
void main(){
  vec2 uv = (vUv - vec2(.5, .66)) / curZoom + vec2(.5, .66);
  float y = vUv.y;
  // blur grows below the focus line, slowly at first, like a lens's depth of field
  float b = clamp((focusY - y) / spread, 0., 1.);
  b = b * b * (3. - 2. * b);
  float l = mix(b * 4., 2.4 + b * 1.6, defocus);
  vec4 s = pick(l, uv);
  vec3 col = s.rgb;
  // a breath of halation from the blurrier levels, as on film
  col += texture2D(t3, uv).rgb * 0.05 + texture2D(t4, uv).rgb * 0.05;
  // below the picture the field takes over: no edge anywhere
  float f = smoothstep(focusY - 0.06, focusY - 0.5, y);
  col = mix(col, field * (0.9 + 0.3 * y), f * 0.93);
  col *= 1. - defocus * 0.3;
  col *= 1. - dim;
  if (prevMix > 0.) {
    vec2 pu = (vUv - vec2(.5, .66)) / prevZoom + vec2(.5, .66);
    col = mix(col, texture2D(tPrev, pu).rgb, prevMix);
  }
  gl_FragColor = vec4(col, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <dithering_fragment>
}`;

/** thumb: a small square picture for lists (thumbs.html), framed in the middle, almost no blur. */
export async function createStage(canvas, { thumb = false } = {}) {
  await Promise.all([document.fonts.load(FONT(600, 40)), document.fonts.load(FONT(500, 40))]).catch(() => {});
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 0.85;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);

  // one soft key from above left of the camera, a cool rim from behind, and a sweep light kept dark until a record
  const key = new THREE.SpotLight(0xfff6ee, 22, 0, 0.3, 1, 2);
  key.position.set(1.3, 1.45, 1.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 4;
  const rim = new THREE.DirectionalLight(0xffd9bd, 2.2);
  rim.position.set(-1.0, 0.9, -1.3);
  const sweep = new THREE.PointLight(0xfff1dc, 0, 0, 2);
  scene.add(key, key.target, rim, sweep);

  // the halo: light thrown on the wall behind the equipment, in the exercise's colour
  const haloTex = canvasTex(256, (c) => {
    const gr = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    for (let i = 0; i <= 10; i++) { const t = i / 10; gr.addColorStop(t, `rgba(255,255,255,${(Math.exp(-t * t * 4.2) - Math.exp(-4.2)) / (1 - Math.exp(-4.2))})`); }
    c.fillStyle = gr; c.fillRect(0, 0, 256, 256);
  });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), new THREE.MeshBasicMaterial({ map: haloTex, color: 0x4a0a16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.renderOrder = 1;
  scene.add(halo);

  const rig = new THREE.Group();
  scene.add(rig);

  // render targets
  const half = { type: THREE.HalfFloatType, depthBuffer: false };
  const rtScene = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const levels = [1, 2, 3, 4].map(() => [new THREE.WebGLRenderTarget(1, 1, half), new THREE.WebGLRenderTarget(1, 1, half)]);
  const prevs = [new THREE.WebGLRenderTarget(1, 1, half), new THREE.WebGLRenderTarget(1, 1, half)]; // what was on screen, two so one can be read while the other is written
  const qcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const qscene = new THREE.Scene();
  qscene.add(quad);
  const flat = { depthTest: false, depthWrite: false, toneMapped: false };
  const blurMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: BLUR, uniforms: { tex: { value: null }, dir: { value: new THREE.Vector2() } }, ...flat });
  const copyMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: COPY, uniforms: { tex: { value: null } }, ...flat });
  const U = {
    t0: { value: rtScene.texture }, t1: { value: levels[0][0].texture }, t2: { value: levels[1][0].texture },
    t3: { value: levels[2][0].texture }, t4: { value: levels[3][0].texture }, tPrev: { value: prevs[0].texture },
    focusY: { value: 0.72 }, spread: { value: 0.32 }, defocus: { value: 0 }, prevMix: { value: 0 }, prevZoom: { value: 1 },
    curZoom: { value: 1 }, dim: { value: 0 },
    field: { value: new THREE.Color(0x1a0a10) },
  };
  if (thumb) { U.focusY.value = 0.36; U.spread.value = 0.4; }
  const compMat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: COMPOSITE, uniforms: U, depthTest: false, depthWrite: false, dithering: true });
  const pass = (mat, target) => { quad.material = mat; renderer.setRenderTarget(target); renderer.render(qscene, qcam); };

  let W = 1, H = 1, kit = null, dirty = true;
  /* Lens shift: the subject sits in the top part of a tall frame without tilting the camera (no converging lines). */
  function frameCamera() {
    if (!kit) return;
    const s = kit.shot;
    camera.fov = thumb ? s.fov * 0.56 : s.fov;
    camera.aspect = W / H;
    camera.position.copy(s.pos);
    camera.lookAt(s.look);
    camera.updateProjectionMatrix();
    camera.projectionMatrix.elements[9] = thumb ? -0.06 : -s.shift;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    key.target.position.copy(s.look).add(new Vector3(0, 0.16, 0.05)); // the light falls off down the subject
    const back = s.look.clone().sub(s.pos).setY(0).normalize();
    halo.position.copy(s.look).addScaledVector(back, 1.1).setY(s.look.y + 0.05);
    halo.lookAt(s.pos.x, halo.position.y, s.pos.z);
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = Math.max(1, Math.round(r.width * dpr));
    H = Math.max(1, Math.round(r.height * dpr));
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    rtScene.setSize(W, H);
    levels.forEach(([a, b], i) => { const k = 2 ** (i + 1); a.setSize(Math.ceil(W / k), Math.ceil(H / k)); b.setSize(Math.ceil(W / k), Math.ceil(H / k)); });
    prevs.forEach((t) => t.setSize(W, H));
    frameCamera();
    dirty = true;
    draw();
  }

  /* The floor shows the equipment once mirrored under it; then the floor, then the equipment. */
  function renderScene() {
    renderer.setRenderTarget(rtScene);
    renderer.clear();
    const ground = kit?.ground;
    if (ground) {
      const fy = ground.position.y;
      ground.visible = false;
      rig.scale.y = -1;
      rig.position.y = 2 * fy;
      renderer.render(scene, camera);
      rig.scale.y = 1;
      rig.position.y = 0;
      ground.visible = true;
      renderer.clearDepth();
      renderer.autoClear = false;
    }
    renderer.render(scene, camera);
    renderer.autoClear = true;
    let src = rtScene;
    for (const [a, b] of levels) {
      copyMat.uniforms.tex.value = src.texture;
      pass(copyMat, a);
      blurMat.uniforms.tex.value = a.texture;
      blurMat.uniforms.dir.value.set(1.6 / a.width, 0);
      pass(blurMat, b);
      blurMat.uniforms.tex.value = b.texture;
      blurMat.uniforms.dir.value.set(0, 1.6 / a.height);
      pass(blurMat, a);
      src = a;
    }
    dirty = false;
  }
  function draw() {
    if (!kit) return;
    if (dirty) renderScene();
    pass(compMat, null);
  }

  /* One animation at a time per job, drawn on the next frames only while it runs. fn gets 0→1. */
  let raf = 0;
  const jobs = new Set();
  function loop() {
    raf = 0;
    const now = performance.now();
    for (const j of [...jobs]) {
      const t = Math.min(1, (now - j.start) / j.dur);
      j.fn(t);
      if (j.scene) dirty = true;
      if (t >= 1) { jobs.delete(j); j.done(); }
    }
    draw();
    if (jobs.size) raf = requestAnimationFrame(loop);
  }
  function run(dur, fn, { scene: sc = true, id = null } = {}) {
    if (id) for (const j of jobs) if (j.id === id) { jobs.delete(j); j.done(); }
    return new Promise((done) => {
      jobs.add({ start: performance.now(), dur: Math.max(1, dur), fn, done, scene: sc, id });
      if (!raf) raf = requestAnimationFrame(loop);
    });
  }
  const tickScene = (dur, fn) => run(dur, (t) => { fn(t); frameCamera(); }, { scene: true });

  /* Cross-fade from what's on screen now to a changed picture: the old one grows a touch as it fades. */
  async function crossfade(change, dur = 520) {
    const into = prevs.find((t) => t.texture !== U.tPrev.value);
    pass(compMat, into);
    U.tPrev.value = into.texture;
    U.prevMix.value = 1;
    change();
    dirty = true;
    await run(RM.matches ? 1 : dur, (t) => {
      const e = 1 - (1 - t) ** 3;
      U.prevMix.value = 1 - e;
      U.prevZoom.value = 1 + 0.05 * e;
      U.curZoom.value = 0.97 + 0.03 * e;
    }, { scene: false, id: 'xfade' });
    U.prevMix.value = 0;
    U.curZoom.value = 1;
  }

  function setLook(o) {
    for (const [k, v] of Object.entries(o)) {
      if (k === 'halo') halo.material.color.set(v);
      else if (U[k]?.value?.isColor) U[k].value.set(v);
      else if (U[k]) U[k].value = v;
    }
  }

  return {
    /** Show an exercise's equipment. With fade, the old picture dissolves into the new one. */
    async show(kind, load, look, { fade = false } = {}) {
      const apply = () => {
        if (kit) { rig.remove(kit.group); }
        kit = KINDS[kind](load);
        rig.add(kit.group);
        if (look) setLook(look);
        frameCamera();
        dirty = true;
      };
      if (fade && kit) await crossfade(apply, 640);
      else { apply(); resize(); pass(compMat, prevs[1]); } // also builds the fade's shader now, not mid-fade
    },
    /** Put this weight on: plates slide, the pin moves, or the numbers change. */
    load(kg) { return kit.loadTo(kg, tickScene, (change) => crossfade(change, 320)); },
    /** Rest: the lens lets go of the bar (1), or finds it again (0), over ms. */
    focus(to, ms = 700) {
      const from = U.defocus.value;
      return run(RM.matches ? 1 : ms, (t) => { const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2; U.defocus.value = from + (to - from) * e; }, { scene: false, id: 'focus' });
    },
    /** A new record: a light passes across the metal and the paint, and the room warms for a moment. */
    sweep() {
      if (!kit) return Promise.resolve();
      const s = kit.shot, side = new Vector3().subVectors(s.look, s.pos).cross(new Vector3(0, 1, 0)).normalize();
      // the light moves where the faces mirror it, so its highlight runs across them
      const mirror = s.pos.clone(); mirror.z = -mirror.z * 0.4;
      return run(RM.matches ? 1 : 1500, (t) => {
        const e = t * t * (3 - 2 * t);
        sweep.position.copy(mirror).addScaledVector(side, (e - 0.5) * 2.2).setY(0.5 - e * 0.3);
        sweep.intensity = Math.sin(Math.PI * t) * 2.4;
      }, { scene: true, id: 'sweep' }).then(() => { sweep.intensity = 0; dirty = true; draw(); });
    },
    /** Darken the picture under a sheet. */
    dim(to, ms = 300) {
      const from = U.dim.value;
      return run(RM.matches ? 1 : ms, (t) => { U.dim.value = from + (to - from) * (1 - (1 - t) ** 3); }, { scene: false, id: 'dim' });
    },
    /** The picture as it is now, as an image address (drawn and read in the same task, so nothing is lost). */
    snapshot() { dirty = true; draw(); return canvas.toDataURL('image/webp', 0.86); },
    resize,
  };
}
