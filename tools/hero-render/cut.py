"""Cut-out of the barbell: the graded JPEG with the mask render as alpha. python cut.py graded.jpg mask.png out.webp"""
import sys, numpy as np
from PIL import Image
jpg, mask, out = sys.argv[1:4]
m = np.asarray(Image.open(mask).convert('L'))
ys, xs = np.where(m > 127)
print('bbox css', round(xs.min() / 2.5), round(ys.min() / 2.5), round(xs.max() / 2.5), round(ys.max() / 2.5))
im = Image.open(jpg).convert('RGB'); im.putalpha(Image.fromarray(m))
im.save(out, quality=88, method=6)
