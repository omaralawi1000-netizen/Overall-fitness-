/* Aven 2 blur test, shared by the compare page (index.html) and the speed test (perf.html).
   It keeps nothing on the phone between visits: this address also hosts old Aven.
   The chosen method lives only in the address (?m=B). */
(() => {
  'use strict';
  const PERF = document.body.dataset.page === 'perf';
  const ORDER = ['A', 'B', 'C', 'D', 'E'];
  const NAMES = { A: 'Live', B: 'Live + grain', C: 'Copy', D: 'Picture', E: 'Fake' };
  const NOTES = { A: 'browser blurs behind', B: 'live blur + grain', C: 'blurred copy', D: 'not live', E: 'no blur, the baseline' };
  const RADIUS = { top: 16, bar: 24, sheet: 32 };
  const TINT = 'rgba(14, 16, 26, .30)';
  const FAKE_TINT = 'linear-gradient(180deg, rgba(40, 43, 60, .84), rgba(22, 24, 36, .88))';
  const TOP_TINT = 'linear-gradient(180deg, rgba(7, 8, 18, .45), rgba(7, 8, 18, 0))';
  const TOP_FAKE = 'linear-gradient(180deg, rgba(7, 8, 18, .94), rgba(7, 8, 18, .62) 45%, rgba(7, 8, 18, 0))';
  const W = innerWidth, H = innerHeight;
  const DPR = Math.min(window.devicePixelRatio || 1, 4);
  const root = document.documentElement;
  root.style.setProperty('--W', W + 'px');
  root.style.setProperty('--H', H + 'px');
  const SHEET_H = Math.round(H * 0.86);
  root.style.setProperty('--sheetH', SHEET_H + 'px');

  const params = new URLSearchParams(location.search);
  const asked = (params.get('m') || '').toUpperCase();
  let method = ORDER.includes(asked) ? asked : 'A';
  let split = PERF ? false : !ORDER.includes(asked);

  const make = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const rng = (seed) => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ---------- Sky: soft colour blobs, computed in full precision and dithered once ---------- */
  const BASE = [7, 8, 18];
  const BLOBS = [
    { x: 0.12, y: 0.10, s: 0.34, c: [31, 181, 166], a: 0.85 },
    { x: 0.95, y: 0.30, s: 0.38, c: [123, 77, 255], a: 0.90 },
    { x: 0.08, y: 0.62, s: 0.36, c: [255, 122, 61], a: 0.80 },
    { x: 0.88, y: 0.82, s: 0.30, c: [255, 61, 139], a: 0.75 },
    { x: 0.52, y: 0.45, s: 0.22, c: [42, 107, 255], a: 0.55 },
    { x: 0.42, y: 1.02, s: 0.30, c: [20, 200, 120], a: 0.50 },
  ];
  const SKY_RES = 2;
  function paintSky(blur, sat, pad = 0) {
    const w = Math.round((W + 2 * pad) * SKY_RES), h = Math.round((H + 2 * pad) * SKY_RES);
    const c = make('canvas', 'sky-art');
    c.width = w; c.height = h;
    if (pad) { c.style.width = W + 2 * pad + 'px'; c.style.height = H + 2 * pad + 'px'; }
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = img.data;
    // A gaussian blob blurred by a gaussian is a wider gaussian, so the pre-blurred sky is exact.
    const bl = BLOBS.map((b) => {
      const s = b.s * W, s2 = Math.sqrt(s * s + blur * blur), k = (b.a * s * s) / (s2 * s2);
      const gx = new Float32Array(w), gy = new Float32Array(h), px = b.x * W, py = b.y * H, q = 2 * s2 * s2;
      for (let x = 0; x < w; x++) { const X = (x + 0.5) / SKY_RES - pad - px; gx[x] = Math.exp(-(X * X) / q); }
      for (let y = 0; y < h; y++) { const Y = (y + 0.5) / SKY_RES - pad - py; gy[y] = Math.exp(-(Y * Y) / q); }
      return { gx, gy, r: b.c[0] * k, g: b.c[1] * k, b: b.c[2] * k };
    });
    const n = bl.length, rnd = rng(11), gyRow = new Float32Array(n);
    const s = sat;
    const m = [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s];
    let i = 0;
    for (let y = 0; y < h; y++) {
      for (let j = 0; j < n; j++) gyRow[j] = bl[j].gy[y];
      for (let x = 0; x < w; x++) {
        let r = BASE[0], g = BASE[1], b = BASE[2];
        for (let j = 0; j < n; j++) { const f = bl[j].gx[x] * gyRow[j], o = bl[j]; r += o.r * f; g += o.g * f; b += o.b * f; }
        if (s !== 1) { const R = r, G = g, B = b; r = m[0] * R + m[1] * G + m[2] * B; g = m[3] * R + m[4] * G + m[5] * B; b = m[6] * R + m[7] * G + m[8] * B; }
        d[i] = r + rnd() + rnd() - 0.5; d[i + 1] = g + rnd() + rnd() - 0.5; d[i + 2] = b + rnd() + rnd() - 0.5; d[i + 3] = 255;
        i += 4;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  const copyCanvas = (src) => {
    const c = make('canvas', src.className);
    c.width = src.width; c.height = src.height;
    c.style.cssText = src.style.cssText;
    c.getContext('2d').drawImage(src, 0, 0);
    return c;
  };

  // The sky's slow drift ("Sky" button). Every copy of the sky runs the same animation at the same time.
  const SKY_KF = [
    { transform: 'translate3d(0, 0, 0) scale(1)' },
    { transform: `translate3d(${-0.06 * W}px, ${0.04 * H}px, 0) scale(1.16)` },
    { transform: `translate3d(${0.04 * W}px, ${-0.03 * H}px, 0) scale(1.1)` },
  ];
  let skyAnims = [];
  let skyOn = false;
  function skyAnimate(node) {
    const a = node.animate(SKY_KF, { duration: 14000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    const lead = skyAnims[0];
    a.pause();
    a.currentTime = lead ? lead.currentTime : 0;
    if (skyOn) a.play();
    skyAnims.push(a);
    return node;
  }
  function setSky(on) {
    skyOn = on;
    const t = skyAnims[0].currentTime;
    for (const a of skyAnims) { a.currentTime = t; if (on) a.play(); else a.pause(); }
    skyBtn.classList.toggle('on', on);
  }

  /* ---------- Grain: one small tile, one tile pixel per screen pixel ---------- */
  {
    const n = 128, c = make('canvas'), x = c.getContext('2d');
    c.width = c.height = n;
    const img = x.createImageData(n, n), r = rng(7);
    for (let i = 0; i < n * n; i++) {
      const v = Math.round(128 + (r() + r() - 1) * 110);
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    root.style.setProperty('--noise', `url(${c.toDataURL('image/png')})`);
    root.style.setProperty('--grain', n / DPR + 'px');
  }
  const grain = (opacity, fade) => {
    const g = make('div', 'grain' + (fade ? ' fade' : ''));
    g.style.opacity = opacity;
    return g;
  };

  /* ---------- The page that scrolls under the glass ---------- */
  const speedLinks = ORDER.map((m) => `<a href="perf.html?m=${m}">${m}</a>`).join('');
  const FEED = `
    <section class="intro">
      <p class="kicker">Aven 2 · ${PERF ? 'speed test' : 'blur test'}</p>
      <h1>${PERF ? `${method} · ${NAMES[method]}` : 'Which glass looks best?'}</h1>
      <p class="lead">${PERF
        ? 'Only this method is on the page. The test runs by itself; then it is your turn.'
        : 'The top edge, the bar and the sheet are cut into five strips: A B C D E, left to right. Tap a letter at the top to fill the screen with one.'}</p>
      <ul class="methods">
        <li><b>A</b><span><em>Live.</em> The browser blurs whatever is behind.</span></li>
        <li><b>B</b><span><em>Live + grain.</em> A, plus fine grain and a layered top edge. The zero-banding try.</span></li>
        <li><b>C</b><span><em>Copy.</em> A blurred copy of the page under the glass. It may trail by a frame.</span></li>
        <li><b>D</b><span><em>Picture.</em> The sky, blurred in advance. Not live: the page does not show through.</span></li>
        <li><b>E</b><span><em>Fake.</em> No blur, only tint and grain. The speed baseline.</span></li>
      </ul>
      <p class="t13">Look for steps in the dark gradient (banding), shimmer at the edges, glass trailing your finger, and how small text reads through it. Tap Sky to make the background move.</p>
      ${PERF ? '' : `<p class="t13">Speed test, one method at a time:</p>\n      <nav class="speed">${speedLinks}</nav>`}
    </section>
    <canvas class="photo" data-photo="sunset"></canvas>
    <section class="numbers"><div class="big">82.5<small> × 8</small></div><p class="cap">Bench press, top set. Last time 80 × 8.</p></section>
    <section class="log">
      <h2>Today</h2>
      <ol>
        <li><b>Bench press</b><span>82.5 × 8 · 82.5 × 7 · 80 × 8</span></li>
        <li><b>Incline dumbbell</b><span>30 × 10 · 30 × 9 · 27.5 × 10</span></li>
        <li><b>Overhead press</b><span>50 × 6 · 47.5 × 8</span></li>
        <li><b>Cable fly</b><span>17.5 × 12 · 17.5 × 12</span></li>
        <li><b>Triceps pushdown</b><span>35 × 12 · 35 × 11 · 32.5 × 12</span></li>
      </ol>
      <p class="t13">This is 13 px text. It has to stay readable as it slides under the glass. If letters smear into the tint, or shimmer while you scroll, that method loses here.</p>
    </section>
    <section class="band dark"><p>Dark, slow gradient: the worst case for banding. Look at it through the sheet and the bar, at full brightness.</p></section>
    <canvas class="photo" data-photo="city"></canvas>
    <section class="numbers"><div class="big">1 840<small> kcal</small></div><p class="cap">142 g protein of 180. Dinner closes it.</p></section>
    <section class="band bright"><p>Bright and saturated: does the glass go muddy or stay clean?</p></section>
    <section class="detail"><div class="stripes"></div><div class="chars">AaBb 0123 ×÷</div><div class="checks"></div></section>
    <canvas class="photo" data-photo="plates"></canvas>
    <section class="log">
      <h2>Last week</h2>
      <ol>
        <li><b>Monday</b><span>Wrestling · 90 min</span></li>
        <li><b>Tuesday</b><span>Push · 52 min · 14 sets</span></li>
        <li><b>Wednesday</b><span>Wrestling · 75 min</span></li>
        <li><b>Thursday</b><span>Pull · 48 min · 13 sets</span></li>
        <li><b>Saturday</b><span>Legs · 61 min · 15 sets</span></li>
      </ol>
    </section>
    <p class="end">End of the page.</p>`;

  const sky = make('div'); sky.id = 'sky';
  const scroller = make('div', 'scroller');
  const feed = make('main', 'feed', FEED);
  scroller.append(feed);
  document.body.append(sky, scroller);
  const skyArt = paintSky(0, 1);
  sky.append(skyArt);
  skyAnimate(skyArt);

  // Photos, drawn in script so the page needs no files.
  const PW = W - 32, PH = Math.round((PW * 2) / 3);
  const PHOTOS = {
    sunset(x, w, h, r) {
      let g = x.createLinearGradient(0, 0, 0, h * 0.74);
      g.addColorStop(0, '#2b1c5a'); g.addColorStop(0.45, '#c2447a'); g.addColorStop(1, '#ffb057');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#fff';
      for (let i = 0; i < 90; i++) { x.globalAlpha = 0.3 + r() * 0.7; const s = 1.5 + r() * 2; x.fillRect(r() * w, r() * h * 0.35, s, s); }
      x.globalAlpha = 1;
      const sx = w * 0.62, sy = h * 0.56;
      g = x.createRadialGradient(sx, sy, 0, sx, sy, h * 0.32);
      g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.25, 'rgba(255,200,120,.85)'); g.addColorStop(1, 'rgba(255,150,80,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#fff3d6'; x.beginPath(); x.arc(sx, sy, h * 0.07, 0, 7); x.fill();
      for (const [col, base, amp] of [['#5a2a5e', 0.52, 0.09], ['#3a1d48', 0.6, 0.07], ['#21122e', 0.67, 0.05]]) {
        x.fillStyle = col; x.beginPath(); x.moveTo(0, h); x.lineTo(0, h * base);
        for (let px = 0; px <= w + 1; px += w / 48) x.lineTo(px, h * base - Math.abs(Math.sin(px * 0.011 + r() * 0.5)) * h * amp * 2 - r() * h * amp * 0.5);
        x.lineTo(w, h); x.fill();
      }
      const wy = h * 0.74; x.fillStyle = '#160c22'; x.fillRect(0, wy, w, h - wy);
      for (let i = 0; i < 70; i++) {
        const yy = wy + r() * (h - wy), ww = (20 + r() * 140) * (1 - ((yy - wy) / (h - wy)) * 0.5);
        x.fillStyle = `rgba(255,${(170 + r() * 60) | 0},${(110 + r() * 60) | 0},${0.25 + r() * 0.5})`;
        x.fillRect(sx - ww / 2 + (r() - 0.5) * 50, yy, ww, 2 + r() * 3);
      }
    },
    city(x, w, h, r) {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#060a1f'); g.addColorStop(1, '#1a1240');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      const cols = ['255,90,120', '80,200,255', '255,200,80', '160,110,255', '90,255,190'];
      for (let i = 0; i < 70; i++) {
        const cx = r() * w, cy = r() * h * 0.7, rr = 10 + r() * 60, c = cols[i % 5];
        const bg = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
        bg.addColorStop(0, `rgba(${c},.55)`); bg.addColorStop(0.8, `rgba(${c},.35)`); bg.addColorStop(1, `rgba(${c},0)`);
        x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, rr, 0, 7); x.fill();
      }
      let bx = 0;
      while (bx < w) {
        const bw = 40 + r() * 90, bh = h * (0.3 + r() * 0.45);
        x.fillStyle = '#0b0d1c'; x.fillRect(bx, h - bh, bw - 5, bh);
        for (let yy = h - bh + 10; yy < h - 8; yy += 13) for (let xx = bx + 6; xx < bx + bw - 14; xx += 10) {
          if (r() < 0.45) { x.fillStyle = r() < 0.8 ? 'rgba(255,214,140,.92)' : 'rgba(140,220,255,.92)'; x.fillRect(xx, yy, 5, 6); }
        }
        bx += bw;
      }
    },
    plates(x, w, h) {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1d1f26'); g.addColorStop(1, '#0c0d11');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#15161b'; x.fillRect(0, h * 0.8, w, h * 0.2);
      const by = h * 0.5;
      x.fillStyle = '#b9bec9'; x.fillRect(0, by - 7, w, 14);
      x.fillStyle = 'rgba(0,0,0,.35)'; for (let k = 0; k < w; k += 5) x.fillRect(k, by - 7, 2, 14);
      const plate = (cx, cy, R, col, label) => {
        x.fillStyle = col; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill();
        x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = R * 0.04;
        for (const f of [0.92, 0.62, 0.34]) { x.beginPath(); x.arc(cx, cy, R * f, 0, 7); x.stroke(); }
        x.fillStyle = 'rgba(255,255,255,.16)'; x.beginPath(); x.arc(cx - R * 0.3, cy - R * 0.35, R * 0.5, 0, 7); x.fill();
        x.fillStyle = '#d9dde5'; x.beginPath(); x.arc(cx, cy, R * 0.16, 0, 7); x.fill();
        x.fillStyle = '#111'; x.beginPath(); x.arc(cx, cy, R * 0.07, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.font = `800 ${R * 0.24}px system-ui, sans-serif`; x.fillText(label, cx, cy - R * 0.48);
        x.font = `700 ${R * 0.12}px system-ui, sans-serif`; x.fillText('KG', cx, cy + R * 0.48);
      };
      plate(w * 0.74, by, h * 0.36, '#1f5fd6', '20');
      plate(w * 0.3, by, h * 0.42, '#d8262f', '25');
    },
  };
  feed.querySelectorAll('canvas.photo').forEach((c, i) => {
    c.width = PW * 2; c.height = PH * 2;
    PHOTOS[c.dataset.photo](c.getContext('2d'), c.width, c.height, rng(31 + i));
  });
  const scrollMax = () => scroller.scrollHeight - scroller.clientHeight;

  function feedCopy(pad) {
    const c = feed.cloneNode(true);
    c.setAttribute('aria-hidden', 'true');
    // Full-width bands reach into the pad too, so the blur pulls in band colour (as live blur's mirrored edge does), not sky.
    c.querySelectorAll('.band').forEach((b) => {
      b.style.marginLeft = b.style.marginRight = -(16 + pad) + 'px';
      b.style.paddingLeft = b.style.paddingRight = 16 + pad + 'px';
    });
    const src = feed.querySelectorAll('canvas'), dst = c.querySelectorAll('canvas');
    dst.forEach((d, i) => { d.width = src[i].width; d.height = src[i].height; d.getContext('2d').drawImage(src[i], 0, 0); });
    return c;
  }

  /* ---------- Glass surfaces ---------- */
  const top = make('div', 'surface top');
  const bar = make('div', 'surface bar');
  const sheetEl = make('div', 'surface sheet');
  top.append(make('div', 'panes'), make('div', 'labels'));
  bar.append(make('div', 'panes'), make('div', 'edge'), make('div', 'labels'), make('div', 'content'));
  sheetEl.append(make('div', 'panes'), make('div', 'edge'), make('div', 'labels'), make('div', 'content'));
  const controls = make('nav', 'controls');
  document.body.append(top, controls, bar, sheetEl);

  bar.querySelector('.content').innerHTML = `
    ${PERF ? '<div class="label">' : '<button class="label" id="splitBtn" type="button">'}<b id="lbl"></b><span id="sub"></span>${PERF ? '</div>' : '</button>'}
    <button class="btn" id="sheetBtn" type="button">Sheet</button>
    <button class="btn" id="skyBtn" type="button">Sky</button>
    <div class="fps" id="fps">–<small>script fps</small></div>`;
  sheetEl.querySelector('.content').innerHTML = `
    <div class="grabber"></div>
    <header><h2>Sheet</h2><button class="close" id="closeBtn" type="button" aria-label="Close">×</button></header>
    <div class="chart"><i style="height:38%"></i><i style="height:52%"></i><i style="height:47%"></i><i style="height:61%"></i><i style="height:58%"></i><i style="height:70%"></i><i style="height:66%"></i><i style="height:84%"></i></div>
    <ul class="rows">
      <li><b>Bench press</b><span>82.5 × 8</span></li>
      <li><b>Incline dumbbell</b><span>30 × 10</span></li>
      <li><b>Overhead press</b><span>50 × 6</span></li>
      <li><b>Cable fly</b><span>17.5 × 12</span></li>
    </ul>
    <p class="t13">Drag me up, flick me down, or catch me halfway.</p>`;
  const $ = (id) => document.getElementById(id);
  const lbl = $('lbl'), sub = $('sub'), fpsEl = $('fps'), skyBtn = $('skyBtn');

  // Each surface: its kind and where it sits on screen (measured without any transform).
  const SURF = [
    { el: top, kind: 'top' },
    { el: bar, kind: 'bar' },
    { el: sheetEl, kind: 'sheet' },
  ];
  let posList = [];
  let scrollBound = [];
  const blurredSky = {}, paddedSky = {};

  function setPos(p, sheetY) {
    const y = p.surf.kind === 'sheet' ? sheetY : 0;
    p.el.style.transform = `translate3d(${-(p.surf.left + p.x + p.pad)}px, ${-(p.surf.top + y + p.pad)}px, 0)`;
  }
  function bindScroll(node) {
    if ('ScrollTimeline' in window) {
      node.animate(
        [{ transform: 'translate3d(0, 0, 0)' }, { transform: `translate3d(0, ${-scrollMax()}px, 0)` }],
        { timeline: new ScrollTimeline({ source: scroller, axis: 'block' }), fill: 'both', easing: 'linear' },
      );
    } else {
      node.style.transform = `translate3d(0, ${-scroller.scrollTop}px, 0)`;
      scrollBound.push(node);
    }
  }
  scroller.addEventListener('scroll', () => {
    if (!scrollBound.length) return;
    const t = `translate3d(0, ${-scroller.scrollTop}px, 0)`;
    for (const n of scrollBound) n.style.transform = t;
  }, { passive: true });

  function pane(m, surf, x, w) {
    const kind = surf.kind, r = RADIUS[kind], isTop = kind === 'top';
    const p = make('div', 'pane');
    p.style.left = x + 'px';
    p.style.width = w + 'px';
    const tint = () => { const t = make('div'); t.style.background = isTop ? TOP_TINT : TINT; return t; };
    const live = (node, px, sat) => {
      const f = `blur(${px}px)` + (sat ? ' saturate(1.5)' : '');
      node.style.backdropFilter = f;
      node.style.webkitBackdropFilter = f;
    };
    if (m === 'A') {
      live(p, r, true);
      p.style.background = isTop ? TOP_TINT : TINT;
      if (isTop) p.classList.add('fade');
    } else if (m === 'B') {
      if (isTop) {
        // Progressive edge: five live layers, stronger blur nearer the top, each faded into the next.
        const n = 5, s = 100 / (n + 1);
        for (let i = 0; i < n; i++) {
          const l = make('div');
          live(l, 2 ** i, i === n - 1);
          const g = i === n - 1
            ? `linear-gradient(to top, transparent ${i * s}%, #000 ${(i + 1) * s}%)`
            : `linear-gradient(to top, transparent ${i * s}%, #000 ${(i + 1) * s}%, #000 ${(i + 2) * s}%, transparent ${(i + 3) * s}%)`;
          l.style.webkitMaskImage = g; l.style.maskImage = g;
          p.append(l);
        }
        p.append(tint(), grain(0.06, true));
      } else {
        live(p, r, true);
        p.style.background = TINT;
        p.append(grain(0.05));
      }
    } else if (m === 'C') {
      p.classList.add('clip');
      if (isTop) p.classList.add('fade');
      const pos = make('div', 'pos');
      // The copy reaches 3r past every screen edge, so the blur's soft rim falls off-screen and nothing sharp leaks in.
      const pad = 3 * r;
      pos.style.filter = `blur(${r}px) saturate(1.5)`;
      pos.style.width = W + 2 * pad + 'px';
      pos.style.height = H + 2 * pad + 'px';
      pos.style.background = 'var(--bg)';
      if (!paddedSky[pad]) paddedSky[pad] = paintSky(0, 1, pad);
      pos.append(skyAnimate(copyCanvas(paddedSky[pad])));
      const sc = make('div', 'copy-scroll');
      sc.style.left = pad + 'px';
      sc.style.top = pad + 'px';
      sc.style.width = scroller.clientWidth + 'px';
      sc.append(feedCopy(pad));
      pos.append(sc);
      p.append(pos, tint());
      posList.push({ el: pos, surf, x, pad });
      bindScroll(sc);
    } else if (m === 'D') {
      p.classList.add('clip');
      if (isTop) p.classList.add('fade');
      const pos = make('div', 'pos');
      if (!blurredSky[r]) blurredSky[r] = paintSky(r, 1.5);
      pos.append(skyAnimate(copyCanvas(blurredSky[r])));
      p.append(pos, tint());
      posList.push({ el: pos, surf, x, pad: 0 });
    } else {
      p.style.background = isTop ? TOP_FAKE : FAKE_TINT;
      p.append(grain(0.07, isTop));
    }
    return p;
  }

  function build() {
    for (const a of skyAnims.slice(1)) a.cancel();
    skyAnims = skyAnims.slice(0, 1);
    posList = [];
    scrollBound = [];
    for (const surf of SURF) {
      const el = surf.el;
      el.classList.toggle('split', split);
      el.classList.toggle('solo', !split);
      surf.left = el.offsetLeft;
      surf.top = el.offsetTop;
      const w = el.offsetWidth;
      const panes = el.querySelector('.panes'), labels = el.querySelector('.labels');
      panes.textContent = '';
      labels.textContent = '';
      if (split) {
        ORDER.forEach((m, i) => {
          const x = Math.round((i * w) / 5), x2 = Math.round(((i + 1) * w) / 5);
          panes.append(pane(m, surf, x, x2 - x));
          if (surf.kind !== 'bar') {
            const tag = make('i', '', `<b>${m}</b>`);
            tag.style.left = x + 'px'; tag.style.width = x2 - x + 'px';
            labels.append(tag);
          }
        });
      } else {
        panes.append(pane(method, surf, 0, w));
      }
    }
    for (const p of posList) setPos(p, sheet.yShown);
    if (split) { lbl.textContent = 'Split · A B C D E'; sub.textContent = 'tap a letter above'; }
    else { lbl.textContent = `${method} · ${NAMES[method]}`; sub.textContent = PERF ? NOTES[method] : 'tap here for split'; }
    controls.querySelectorAll('[data-m]').forEach((b) => b.classList.toggle('on', !split && b.dataset.m === method));
    if (skyOn) setSky(true);
  }

  /* ---------- Sheet: a spring you can grab at any moment ---------- */
  const DET = { closed: SHEET_H + 132, half: SHEET_H - Math.round(H * 0.5), full: 0 };
  const RESPONSE = 0.42;
  const sheet = { y: DET.closed, yShown: DET.closed, v: 0, target: DET.closed, zeta: 1, anim: false, drag: null, hidden: true };
  function springTo(target, v, zeta) {
    sheet.target = target;
    if (v != null) sheet.v = v;
    sheet.zeta = zeta || 1;
    sheet.anim = true;
    applySheet();
  }
  function stepSpring(dt) {
    const k = (2 * Math.PI / RESPONSE) ** 2, c = (4 * Math.PI * sheet.zeta) / RESPONSE;
    for (let t = dt; t > 0; t -= 1 / 480) {
      const h = Math.min(t, 1 / 480);
      sheet.v += (-k * (sheet.y - sheet.target) - c * sheet.v) * h;
      sheet.y += sheet.v * h;
    }
    if (Math.abs(sheet.v) < 3 && Math.abs(sheet.y - sheet.target) < 0.25) { sheet.y = sheet.target; sheet.v = 0; sheet.anim = false; }
  }
  function applySheet() {
    const y = Math.round(sheet.y * DPR) / DPR;
    sheet.yShown = y;
    sheetEl.style.transform = `translate3d(0, ${y}px, 0)`;
    const hidden = !sheet.anim && !sheet.drag && sheet.y >= DET.closed - 0.5;
    if (hidden !== sheet.hidden) { sheet.hidden = hidden; sheetEl.style.visibility = hidden ? 'hidden' : 'visible'; }
    for (const p of posList) if (p.surf.kind === 'sheet') setPos(p, y);
  }
  const nearest = (y) => [DET.closed, DET.half, DET.full].reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
  const isOpen = () => sheet.target !== DET.closed;
  function toggleSheet() { springTo(isOpen() ? DET.closed : DET.half, null, 1); }

  sheetEl.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    sheet.anim = false;
    sheet.v = 0;
    // Caught above the top: undo the rubber band so the sheet stays under the finger.
    const y0 = sheet.y < DET.full ? DET.full - Math.pow(DET.full - sheet.y, 1 / 0.7) : sheet.y;
    sheet.drag = { id: e.pointerId, p0: e.clientY, y0, s: [[e.timeStamp, sheet.y]] };
    sheetEl.setPointerCapture(e.pointerId);
  });
  sheetEl.addEventListener('pointermove', (e) => {
    const d = sheet.drag;
    if (!d || e.pointerId !== d.id) return;
    let y = d.y0 + e.clientY - d.p0;
    if (y < DET.full) y = DET.full - Math.pow(DET.full - y, 0.7);
    sheet.y = y;
    d.s.push([e.timeStamp, sheet.y]);
    if (d.s.length > 10) d.s.shift();
    applySheet();
  });
  const release = (e) => {
    const d = sheet.drag;
    if (!d || e.pointerId !== d.id) return;
    sheet.drag = null;
    d.s.push([e.timeStamp, sheet.y]);
    const recent = d.s.filter((p) => e.timeStamp - p[0] < 90);
    let v = 0;
    if (recent.length >= 2 && e.type === 'pointerup') {
      const a = recent[0], b = recent[recent.length - 1];
      v = ((b[1] - a[1]) / Math.max(1, b[0] - a[0])) * 1000;
    }
    springTo(nearest(sheet.y + v * 0.2), v, Math.abs(v) > 900 ? 0.82 : 1);
  };
  sheetEl.addEventListener('pointerup', release);
  sheetEl.addEventListener('pointercancel', release);

  /* ---------- One frame loop: the sheet spring and the frame meter ---------- */
  let last = 0, chipAt = 0, rec = null;
  const stamps = [];
  function frame(t) {
    if (last) {
      const dt = t - last;
      if (rec) rec.push(dt);
      if (sheet.anim) { stepSpring(Math.min(dt / 1000, 1 / 30)); applySheet(); }
    }
    last = t;
    stamps.push(t);
    while (stamps.length && t - stamps[0] > 1000) stamps.shift();
    if (t - chipAt > 300) { chipAt = t; fpsEl.innerHTML = `${stamps.length}<small>script fps</small>`; }
    requestAnimationFrame(frame);
  }

  /* ---------- Controls ---------- */
  $('sheetBtn').addEventListener('click', toggleSheet);
  $('closeBtn').addEventListener('click', () => springTo(DET.closed, null, 1));
  skyBtn.addEventListener('click', () => setSky(!skyOn));

  if (!PERF) {
    controls.innerHTML = ORDER.map((m) => `<button class="pill" type="button" data-m="${m}">${m}</button>`).join('');
    controls.addEventListener('click', (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      split = false;
      method = b.dataset.m;
      history.replaceState(null, '', `?m=${method}`);
      build();
    });
    $('splitBtn').addEventListener('click', () => {
      if (split) return;
      split = true;
      history.replaceState(null, '', location.pathname);
      build();
    });
  } else {
    controls.innerHTML = ORDER.map((m) => `<a class="pill${m === method ? ' on' : ''}" href="perf.html?m=${m}" data-m="${m}">${m}</a>`).join('');
  }

  build();
  applySheet();
  requestAnimationFrame(frame);

  // A real size change (not the usual small jitter) needs a fresh layout: the sky and copies are drawn at this size.
  let resizeTimer = 0;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (Math.abs(innerWidth - W) > 2 || Math.abs(innerHeight - H) > 80) location.reload();
      else build();
    }, 250);
  });

  if (!PERF) return;

  /* ---------- Speed test ---------- */
  const card = make('section', 'card');
  document.body.append(card);
  const nextFrame = () => new Promise((r) => requestAnimationFrame(r));
  const wait = async (ms) => { const t0 = performance.now(); while (performance.now() - t0 < ms) await nextFrame(); };
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
  async function scrollTo(to, ms) {
    const from = scroller.scrollTop, t0 = performance.now();
    for (;;) {
      const t = Math.min(1, (performance.now() - t0) / ms);
      scroller.scrollTop = from + (to - from) * ease(t);
      if (t >= 1) break;
      await nextFrame();
    }
  }
  async function sheetTo(y) { springTo(y, 0, 1); while (sheet.anim) await nextFrame(); }
  async function sheetCatch() {
    // Open, catch it halfway (as if a finger grabbed it), hold, then let it go up to full.
    springTo(DET.half, 0, 1);
    const from = sheet.y, mid = from - (from - DET.half) / 2;
    while (sheet.anim && sheet.y > mid) await nextFrame();
    sheet.anim = false; sheet.v = 0;
    await wait(250);
    await sheetTo(DET.full);
  }
  const status = (s) => { sub.textContent = s; };
  const results = [];
  function summarise(name, d) {
    const n = d.length, dur = d.reduce((a, b) => a + b, 0);
    const sorted = [...d].sort((a, b) => a - b);
    return {
      name, n,
      fps: n ? Math.round((n * 1000) / dur) : 0,
      slow: n ? Math.round((d.filter((x) => x > 12.5).length * 100) / n) : 0,
      hitches: d.filter((x) => x > 20.8).length,
      worst: n ? Math.round(sorted[n - 1]) : 0,
      median: n ? sorted[n >> 1] : 0,
    };
  }
  async function phase(name, fn) {
    status(name);
    rec = [];
    await fn();
    const d = rec;
    rec = null;
    results.push(summarise(name, d));
  }
  const chrome = (navigator.userAgent.match(/Chrome\/(\d+)/) || [])[1];
  const methodLinks = ORDER.map((m) => `<a class="pill${m === method ? ' on' : ''}" href="perf.html?m=${m}">${m}</a>`).join('') + '<a class="pill wide" href="./">All</a>';

  function showStart() {
    card.innerHTML = `
      <h2>Speed test · ${method} ${NAMES[method]}</h2>
      <p>Tap Start, then don't touch the phone. It scrolls, moves the sheet and moves the sky by itself, for about 20 seconds.</p>
      <p class="dim">Battery saver off. Run E first: it is the baseline the others are compared with.</p>
      <div class="row"><button class="btn on" id="go" type="button">Start</button></div>
      <nav>${methodLinks}</nav>`;
    card.hidden = false;
    $('go').addEventListener('click', run);
  }
  function showResults() {
    const rows = results.map((r) => `<tr><td>${r.name}</td><td>${r.fps}</td><td>${r.slow}%</td><td>${r.hitches}</td><td>${r.worst} ms</td></tr>`).join('');
    const scripted = results.filter((r) => r.name !== 'Your turn');
    const all = scripted.length ? scripted.reduce((a, r) => a + r.median, 0) / scripted.length : 0;
    const sixty = all > 12.5;
    card.innerHTML = `
      <h2>${method} · ${NAMES[method]}</h2>
      <table><tr><th></th><th>fps</th><th>slow</th><th>hitches</th><th>worst</th></tr>${rows}</table>
      ${sixty ? '<p class="warn">These are script frames. On this phone Chrome runs scripts at about 60 fps even while the screen shows 120 Hz (seen 1 Nov with Show refresh rate on), so about 60 here is normal. Use this card for stutters (hitches) and to compare methods, not to read the refresh rate.</p>' : ''}
      <p class="dim">slow = frames over 12.5 ms, which miss 120 Hz. hitches = frames over 21 ms, a visible stutter. worst = the longest frame. The meter only sees frames the page makes, so your eye counts too.</p>
      <p class="dim">Chrome ${chrome || '?'} · ${W}×${H} · ${DPR}×</p>
      <div class="row"><button class="btn" id="again" type="button">Run again</button><button class="btn on" id="mine" type="button">Your turn, 15 s</button></div>
      <p class="dim">Your turn: scroll, drag and flick the sheet, tap Sky, for 15 seconds.</p>
      <nav>${methodLinks}</nav>`;
    card.hidden = false;
    $('again').addEventListener('click', () => { results.length = 0; run(); });
    $('mine').addEventListener('click', yourTurn);
  }
  async function run() {
    card.hidden = true;
    status('Hands off… starting');
    if (skyOn) setSky(false);
    await sheetTo(DET.closed);
    await scrollTo(0, 300);
    await wait(1200);
    await phase('Scroll', async () => { await scrollTo(2600, 2500); await wait(150); await scrollTo(0, 2500); });
    await phase('Sheet', async () => { await sheetCatch(); await wait(200); await sheetTo(DET.closed); await wait(150); });
    await phase('Scroll + sheet', async () => { await sheetTo(DET.half); await scrollTo(1800, 2000); await scrollTo(0, 2000); });
    await phase('Sky moving', async () => { setSky(true); await wait(4000); setSky(false); await sheetTo(DET.closed); });
    status(NOTES[method]);
    showResults();
  }
  async function yourTurn() {
    card.hidden = true;
    const old = results.findIndex((r) => r.name === 'Your turn');
    if (old >= 0) results.splice(old, 1);
    rec = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 15000) {
      status(`Your turn · ${Math.ceil((15000 - (performance.now() - t0)) / 1000)} s`);
      await wait(250);
    }
    const d = rec;
    rec = null;
    results.push(summarise('Your turn', d));
    status(NOTES[method]);
    showResults();
  }
  showStart();
})();
