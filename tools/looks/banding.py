"""Banding check for the looks screenshots.

Banding is a staircase: three or more long stretches of one exact colour in a row, each a tiny step (1-3 levels)
brighter (or darker) than the last. That is what a smooth gradient looks like when it is rounded to 8 bits
without dither. Two flat fills that happen to meet (a pane on the ground) make one step, not a staircase, so they
are not counted. Dithered gradients never form long stretches.

usage: python3 tools/looks/banding.py <png> [<png> ...]
Prints, per image, how many band edges it found and where (css px, at DPR 2).
"""
import sys
import numpy as np
from PIL import Image

MIN_RUN = 16      # device px (8 css px): shorter stretches are invisible
MAX_STEP = 3      # a step this small between two long stretches is a band edge


def runs(line):
    """Start, length and colour of each stretch of identical colour along a 1-D line of RGB pixels."""
    change = np.any(line[1:] != line[:-1], axis=1)
    starts = np.concatenate([[0], np.nonzero(change)[0] + 1])
    lens = np.diff(np.concatenate([starts, [len(line)]]))
    return starts, lens


def band_edges(img, axis):
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    if axis == 1:
        a = a.transpose(1, 0, 2)
    found = []
    for i in range(0, a.shape[1], 4):          # every 4th column (or row)
        line = a[:, i, :]
        st, ln = runs(line)
        for k in range(len(st) - 2):
            if ln[k] >= MIN_RUN and ln[k + 1] >= MIN_RUN and ln[k + 2] >= MIN_RUN:
                d1 = line[st[k + 1]] - line[st[k]]
                d2 = line[st[k + 2]] - line[st[k + 1]]
                s1, s2 = np.abs(d1).max(), np.abs(d2).max()
                same_way = np.sign(d1.sum()) == np.sign(d2.sum())
                if 0 < s1 <= MAX_STEP and 0 < s2 <= MAX_STEP and same_way:
                    found.append((i, int(st[k + 1])))
    return found


for path in sys.argv[1:]:
    im = Image.open(path)
    v = band_edges(im, 0)   # walking down each column
    h = band_edges(im, 1)   # walking along each row
    pts = [(x // 2, y // 2) for x, y in v] + [(y // 2, x // 2) for x, y in h]
    where = ''
    if pts:
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        where = f'  around x {min(xs)}-{max(xs)}, y {min(ys)}-{max(ys)} css px'
    print(f'{path.split("/")[-1]:32s} staircases: {len(pts):4d}{where}')
