"""Tones one misty-ridge photograph for a time of day and crops it to the phone's shape (960x2080).
python tone.py morning|dusk src.jpg out.jpg
morning: mirrored, zoomed a little toward the ridges, mapped from deep violet shadows to peach light.
dusk: the photo's own blue, with more colour and a cooler balance."""
import sys
from PIL import Image, ImageOps, ImageEnhance
import numpy as np
mode, src, dst = sys.argv[1:4]
im = Image.open(src).convert('RGB')
if mode == 'morning':
    im = ImageOps.mirror(im)
W, H = im.size
zoom = 0.88 if mode == 'morning' else 1.0          # share of the height that is kept, measured from the bottom
ch = int(H * zoom); cw = int(round(ch * 960 / 2080))
x0 = (W - cw) // 2 + (40 if mode == 'morning' else 120)
im = im.crop((x0, H - ch, x0 + cw, H)).resize((960, 2080), Image.LANCZOS)
if mode == 'morning':
    a = np.asarray(im).astype(np.float32) / 255
    L = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    L = np.clip((L - L.min()) / (L.max() - L.min()), 0, 1) ** 0.9
    stops = np.array([0.0, 0.22, 0.45, 0.68, 0.86, 1.0])
    cols = np.array([(22, 20, 52), (58, 44, 96), (128, 86, 132), (214, 138, 142), (250, 196, 160), (255, 232, 204)], dtype=np.float32) / 255
    out = np.stack([np.interp(L, stops, cols[:, c]) for c in range(3)], axis=2) * 0.9 + a * 0.1
else:
    a = np.asarray(ImageEnhance.Color(im).enhance(1.7)).astype(np.float32) / 255
    out = np.clip(a * np.array([0.82, 0.98, 1.14], dtype=np.float32), 0, 1)
    out = (out - 0.5) * 1.05 + 0.52
out = out + np.random.default_rng(2).normal(0, 0.004, out.shape)        # a little grain so the smooth sky does not band
Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst, quality=90, optimize=True, progressive=True)
