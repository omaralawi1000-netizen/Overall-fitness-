"""16-bit PNG -> 8-bit JPEG with a little noise before rounding, so smooth light never shows bands.
   python tojpg.py src.png dst.jpg [quality] [contrast] [saturation] [gain as r,g,b]"""
import sys, cv2, numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
q = int(sys.argv[3]) if len(sys.argv) > 3 else 92
contrast = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0   # gentle S-curve, 1 = off
sat = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
gain = [float(v) for v in sys.argv[6].split(',')] if len(sys.argv) > 6 else None   # lift and warm, e.g. 1.09,1.06,1.02
im = cv2.imread(src, cv2.IMREAD_UNCHANGED)
im = cv2.cvtColor(im[:, :, :3], cv2.COLOR_BGR2RGB).astype(np.float32)
if im.max() > 255:
    im /= 257.0
if contrast != 1.0:
    x = im / 255.0
    im = 255.0 * (x + (contrast - 1.0) * (x - 0.5) * 4 * x * (1 - x) * 1.6)
if sat != 1.0:
    g = im.mean(axis=2, keepdims=True)
    im = g + (im - g) * sat
if gain:
    im = im * np.array(gain, dtype=np.float32)
rng = np.random.default_rng(7)
shape = im.shape[:2] + (1,)
noise = rng.random(shape, dtype=np.float32) - rng.random(shape, dtype=np.float32)
out = np.clip(np.round(im + noise * 0.9), 0, 255).astype(np.uint8)
Image.fromarray(out).save(dst, quality=q, subsampling=0, optimize=True)
print(dst, out.shape)
