"""Turns one wide mountain photo into the Summit C panorama: the four tabs sit side by side on it,
so the wallpaper slides a little when you change tab. Two tones of the same place: dawn and blue hour.
python pano.py dawn|dusk src.jpg out.jpg   (src: Pexels 34742289, 4267x2400)
Output: 1308x1664 (654x832 css px at 2x)."""
import sys
from PIL import Image
import numpy as np
mode, src, dst = sys.argv[1:4]
im = Image.open(src).convert('RGB')
W, H = im.size
x0 = int(W - 654 * H / 832)                      # keep the right part: the highest peaks sit in Today's window
im = im.crop((x0, 0, W, H)).resize((1308, 1664), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255
h = a.shape[0]
y = (np.arange(h, dtype=np.float32) / h)[:, None, None]
def blend(img, col, w):
    return img * (1 - w) + np.array(col, dtype=np.float32) / 255 * w
# The sky has no detail, so it is repainted as a real dawn or blue-hour gradient (dark enough for white text up top).
# Sky mask: warm pixels (red well above blue). Snow and the blue ridges stay the photograph.
sky = np.maximum(np.clip(((a[..., 0] - a[..., 2]) - 0.12) / 0.16, 0, 1)[..., None], (y < 0.42).astype(np.float32)) * (y < 0.62)
def ramp(stops):
    ys = np.array([s[0] for s in stops], dtype=np.float32)
    cs = np.array([s[1] for s in stops], dtype=np.float32) / 255
    yy = y[:, 0, 0]
    return np.stack([np.interp(yy, ys, cs[:, c]) for c in range(3)], axis=1)[:, None, :]
if mode == 'dawn':
    g = ramp([(0, (24, 28, 66)), (0.16, (44, 46, 100)), (0.30, (110, 78, 128)), (0.40, (206, 120, 120)), (0.47, (244, 166, 120)), (0.53, (250, 196, 146))])
    a = a * (1 - sky) + g * sky
    a = blend(a, (38, 58, 92), np.clip((y - 0.66) / 0.34, 0, 1) ** 1.2 * 0.42)   # bright fog calms down under the glass
else:
    g = ramp([(0, (10, 14, 38)), (0.18, (22, 30, 70)), (0.32, (52, 54, 104)), (0.42, (120, 92, 140)), (0.48, (196, 132, 150)), (0.53, (214, 160, 168))])
    a = a * (1 - sky) + g * sky
    m = (y >= 0).astype(np.float32) * np.clip((y - 0.47) / 0.08, 0, 1)             # the land falls into blue hour
    a = a * (1 - m * (1 - np.array([0.62, 0.68, 0.92], dtype=np.float32)))
    a = blend(a, (14, 22, 48), np.clip((y - 0.62) / 0.38, 0, 1) ** 1.1 * 0.48)
a = a + np.random.default_rng(3).normal(0, 0.0045, a.shape)  # fine grain so the smooth sky does not band
Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)).save(dst, quality=86, optimize=True, progressive=True)
