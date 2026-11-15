"""Cuts one photograph into depth layers for the Depth prototype (site/_prototypes/summit-depth/).
python layers.py <scene> <src.jpg> <outdir>     (scenes are listed in SCENES below)

Depth comes from Depth Anything V2 small (ONNX, about 100 MB, downloaded once to ~/.cache/a2-depth/;
needs: pip install onnxruntime pillow numpy). Nothing of the model goes into the repo.
Writes <scene>-back.jpg (the whole picture, with the near subject painted out so nothing doubles when the
layers slide apart) and <scene>-front.webp (only the near subject, soft-edged, transparent elsewhere).
The number on screen sits between the two, so the mountain steps in front of it.
Both are 1040x2160: the 384x832 screen plus 16 px on every side for parallax, at 2.5x."""
import sys, os, urllib.request
import numpy as np
from PIL import Image, ImageFilter

OUT_W, OUT_H = 1040, 2160
# crop: (centre x as a share of width, top y in source px, crop width in source px); thr: depth band of the near subject
SCENES = {
  'today':     dict(cx=.47, y0=160, w=1300, thr=(.10, .16), ext=500, grade='dawn'),
  'chest':     dict(cx=.48, y0=620, w=1150, thr=(.14, .20), ext=640,   grade='clear'),
  'back':      dict(cx=.34, y0=0,   w=1450, thr=(.07, .12), ext=200, top=420, grade='fog'),
  'shoulders': dict(cx=.60, y0=900, w=750,  thr=(.17, .22), ext=0,   grade='dusk'),
  'arms':      dict(cx=.22, y0=200, w=1120, thr=(.10, .16), ext=300,   grade='clear'),
}

def model():
    p = os.path.expanduser('~/.cache/a2-depth/dav2s.onnx')
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        urllib.request.urlretrieve('https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx', p)
    return p

def depth(im):
    import onnxruntime as ort
    W, H = im.size; s = 728 / max(W, H)
    w, h = int(round(W * s / 14)) * 14, int(round(H * s / 14)) * 14
    x = np.asarray(im.resize((w, h), Image.BICUBIC)).astype(np.float32) / 255
    x = ((x - [.485, .456, .406]) / [.229, .224, .225]).transpose(2, 0, 1)[None].astype(np.float32)
    sess = ort.InferenceSession(model(), providers=['CPUExecutionProvider'])
    d = sess.run(None, {sess.get_inputs()[0].name: x})[0].squeeze()
    d = (d - d.min()) / (d.max() - d.min())
    return np.asarray(Image.fromarray((d * 65535).astype(np.uint16)).resize((W, H), Image.BICUBIC), dtype=np.float32) / 65535

def box(a, r):
    c = np.cumsum(np.cumsum(np.pad(a, ((r + 1, r), (r + 1, r)), mode='edge'), 0), 1)
    return (c[2*r+1:, 2*r+1:] - c[:-2*r-1, 2*r+1:] - c[2*r+1:, :-2*r-1] + c[:-2*r-1, :-2*r-1]) / (2*r+1)**2

def guided(I, p, r=6, eps=4e-4):
    mI, mp = box(I, r), box(p, r)
    a = (box(I * p, r) - mI * mp) / (box(I * I, r) - mI * mI + eps)
    b = mp - a * mI
    return box(a, r) * I + box(b, r)

def pushpull(img, known):
    """Fills unknown pixels from their surroundings (coarse to fine), for painting the subject out of the back layer."""
    if min(known.shape) < 4:
        k = known[..., None]; m = (img * k).sum((0, 1)) / max(k.sum(), 1e-6)
        return np.where(k > 0, img, m)
    h, w = known.shape; h2, w2 = (h + 1) // 2, (w + 1) // 2
    pi = np.pad(img * known[..., None], ((0, h2*2-h), (0, w2*2-w), (0, 0)), mode='edge')
    pk = np.pad(known, ((0, h2*2-h), (0, w2*2-w)), mode='edge')
    si = pi.reshape(h2, 2, w2, 2, 3).sum((1, 3)); sk = pk.reshape(h2, 2, w2, 2).sum((1, 3))
    small = pushpull(si / np.maximum(sk, 1e-6)[..., None], (sk > 0).astype(np.float32))
    up = np.dstack([np.asarray(Image.fromarray(small[..., i].astype(np.float32)).resize((w, h), Image.BILINEAR)) for i in range(3)])
    k = known[..., None]
    return img * k + up * (1 - k)

def grade(a, kind):
    L = a @ np.array([.299, .587, .114], dtype=np.float32)
    if kind == 'dawn':      # keep the pink, a touch deeper at the top so white type reads
        a = a * (1 - .16 * np.linspace(1, 0, a.shape[0])[:, None, None] ** 1.5)
    elif kind == 'fog':     # pale sea fog turned to a cool slate so white type reads on it
        a = np.clip((a - .5) * 1.12 + .42, 0, 1) * np.array([.86, .95, 1.04], dtype=np.float32)
        a = a * (1 - .30 * np.linspace(1, 0, a.shape[0])[:, None, None] ** 1.2)
    elif kind == 'dusk':    # the misty ridges' own blue, richer
        g = a + (a - L[..., None]) * .7
        a = np.clip(g * np.array([.82, .98, 1.14], dtype=np.float32), 0, 1)
        a = (a - .5) * 1.05 + .5
    elif kind == 'clear':
        a = a * (1 - .10 * np.linspace(1, 0, a.shape[0])[:, None, None] ** 1.5)
    return np.clip(a, 0, 1)

def main(scene, src, outdir):
    c = SCENES[scene]
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255
    d = depth(im)
    if c['ext']:            # the picture is too short for the phone: mirror the soft cloud band below it
        a = np.concatenate([a, a[-1:-c['ext']-1:-1]], 0); d = np.concatenate([d, d[-1:-c['ext']-1:-1]], 0)
    if c.get('top'):        # flat fog sky: grow it upward from the top rows so the rock can sit lower and smaller
        k = c['top']; band = a[:24].mean(0, keepdims=True); dz = np.zeros((k, d.shape[1]), np.float32)
        a = np.concatenate([np.repeat(band, k, 0), a], 0); d = np.concatenate([dz, d], 0)
    H, W = d.shape
    w = c['w']; h = int(round(w * OUT_H / OUT_W)); x0 = int(np.clip(c['cx'] * W - w / 2, 0, W - w)); y0 = min(c['y0'], H - h)
    a = a[y0:y0+h, x0:x0+w]; d = d[y0:y0+h, x0:x0+w]
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).resize((OUT_W, OUT_H), Image.LANCZOS)).astype(np.float32) / 255
    d = np.asarray(Image.fromarray(d).resize((OUT_W, OUT_H), Image.BICUBIC))
    t0, t1 = c['thr']
    m = np.clip((d - t0) / (t1 - t0), 0, 1); m = m * m * (3 - 2 * m)
    gray = a @ np.array([.299, .587, .114], dtype=np.float32)
    m = np.clip(guided(gray, m), 0, 1)
    m = np.clip((m - .08) / .84, 0, 1)
    a = grade(a, c['grade'])
    a = a + np.random.default_rng(3).normal(0, .004, a.shape).astype(np.float32)   # grain against banding
    # back: the subject painted out, from a slightly grown mask so no rim is left
    grown = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))).astype(np.float32) / 255
    back = pushpull(a, (grown < .02).astype(np.float32))
    back = np.asarray(Image.fromarray((np.clip(back, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    back = back * grown[..., None] + a * (1 - grown[..., None])
    os.makedirs(outdir, exist_ok=True)
    Image.fromarray((np.clip(back, 0, 1) * 255 + .5).astype(np.uint8)).save(f'{outdir}/{scene}-back.jpg', quality=80, optimize=True, progressive=True)
    rgba = np.dstack([np.clip(a, 0, 1), m]); 
    Image.fromarray((rgba * 255 + .5).astype(np.uint8), 'RGBA').save(f'{outdir}/{scene}-front.webp', quality=82, method=6)
    print(scene, 'crop', (x0, y0, w, h), 'front share', round(float(m.mean()), 3))

if __name__ == '__main__':
    main(*sys.argv[1:4])
