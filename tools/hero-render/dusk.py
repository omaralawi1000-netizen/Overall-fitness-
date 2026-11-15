"""Makes the two wallpapers behind /_prototypes/vesper/ from one photograph of a bay after sunset.
python dusk.py src.jpg out_dir
dusk.jpg: the photo's own light, the cloud turned a little from salmon toward rose.
night.jpg: the same frame about forty minutes later: deep blue, the cloud a dim rose, never black.
Both are 1152x2784 (the phone's width times three, a little taller than the screen so the picture can drift)."""
import sys
from PIL import Image
import numpy as np
src, out = sys.argv[1:3]
im = Image.open(src).convert('RGB')
W, H = im.size
cw = int(round(H * 1152 / 2784))
x0 = int(W * 0.50)
im = im.crop((x0, 0, x0 + cw, H)).resize((1152, 2784), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255
L = (a @ np.array([0.299, 0.587, 0.114], dtype=np.float32))[..., None]
warm = np.clip((a[..., 0:1] - a[..., 2:3]) * 3, 0, 1)                    # how far a pixel leans to salmon
rng = np.random.default_rng(12)


def save(arr, name):
    arr = arr + rng.normal(0, 0.004, arr.shape)                          # a little grain so the smooth sky does not band
    Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8)).save(f'{out}/{name}', quality=84, optimize=True, progressive=True)


dusk = a * (1 - warm * 0.22) + (a * np.array([1.0, 0.86, 1.04], dtype=np.float32)) * (warm * 0.22)
dusk = (dusk - 0.5) * 0.96 + 0.47
save(dusk, 'dusk.jpg')

night = L * 0.62 + a * 0.38                                              # less colour, as the light goes
night = night * np.array([0.50, 0.58, 0.84], dtype=np.float32)
night = night + warm * np.array([0.11, 0.015, 0.03], dtype=np.float32)   # the cloud keeps a little rose
night = night ** 1.1 * 0.94 + np.array([0.03, 0.045, 0.085], dtype=np.float32)
save(night, 'night.jpg')
