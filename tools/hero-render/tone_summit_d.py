"""Tones the Summit D photo (Pexels 9446343, Yunus Tug: a peak above a sea of clouds) three ways and crops it to 960x2080:
dawn.jpg (before sunrise), first.jpg (first light, as shot), sunlit.jpg (the record). Needs pillow + numpy.
python tone_summit_d.py src.jpg out_dir"""
import sys
from PIL import Image
import numpy as np
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
W, H = im.size
# zoom 1.35x on the peak and put it at 52 % of the screen height, so it stands between the numbers and the glass
ch = round(H / 1.35); cw = round(ch * 960 / 2080); x0 = 816 - cw // 2; y0 = round(1452 - 0.52 * ch)
im = im.crop((x0, y0, x0 + cw, y0 + ch)).resize((960, 2080), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255
L = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
rng = np.random.default_rng(7)
def save(x, name):
    x = x + rng.normal(0, 0.0045, x.shape)
    Image.fromarray((np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{out}/{name}.jpg', quality=86, optimize=True, progressive=True)
# warmth mask: how pink/orange a pixel is (the clouds and the peak)
warm = np.clip((a[..., 0] - a[..., 2]) * 3 + 0.35, 0, 1)
# DAWN: before sunrise. clouds lose their pink to blue-lavender, sky goes deeper, everything a stop darker.
cool = np.stack([L * 0.78, L * 0.86, L * 1.08 + 0.04], 2)
dawn = a * (1 - warm[..., None]) * np.array([0.62, 0.78, 0.98]) + cool * warm[..., None] * np.array([0.92, 0.94, 1.0])
dawn = dawn * 0.80
save(dawn, 'dawn')
# FIRST LIGHT: as shot, a touch richer
first = np.clip((a - 0.5) * 1.04 + 0.5, 0, 1)
save(first, 'first')
# SUNLIT: the record. brighter, clouds golden, sky lighter
gold = np.stack([np.clip(L * 1.18 + 0.10, 0, 1), np.clip(L * 1.0 + 0.04, 0, 1), L * 0.78], 2)
sun = a * (1 - warm[..., None]) * np.array([1.05, 1.08, 1.06]) + gold * warm[..., None]
sun = np.clip(sun * 1.06 + 0.02, 0, 1)
save(sun, 'sunlit')
