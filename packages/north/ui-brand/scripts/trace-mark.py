"""Trace the North compass mark from its source PNG into a master SVG.

The navy shape is traced with marching squares on the alpha channel and
simplified with Ramer-Douglas-Peucker; the gold centre is fitted as a circle.
Usage: python3 -I trace-mark.py <source.png> <out.svg>
"""

import sys

import numpy as np
from PIL import Image

NAVY = '#111826'
GOLD = '#B7A06D'
VIEWBOX = 1024
EPSILON = 0.2  # RDP tolerance in source pixels
PADDING = 0.02  # margin around the content square, as a fraction of its side


def load_fields(path):
    rgba = np.asarray(Image.open(path).convert('RGBA'), dtype=np.float64) / 255.0
    alpha = rgba[..., 3]
    gold = (rgba[..., 0] > 0.4) & (alpha > 0.05)
    navy = np.where(gold, 0.0, alpha)
    return navy, gold, alpha.shape


def marching_squares(field, level=0.5):
    """Return closed loops of (x, y) points where field crosses level."""
    f = np.pad(field, 1)
    tl, tr = f[:-1, :-1], f[:-1, 1:]
    bl, br = f[1:, :-1], f[1:, 1:]
    case = ((tl > level) * 8 + (tr > level) * 4 + (br > level) * 2 + (bl > level) * 1).astype(np.int8)
    ys, xs = np.nonzero((case != 0) & (case != 15))

    def interp(a, b):
        return 0.5 if a == b else (level - a) / (b - a)

    # Edge ids: ('h', y, x) top edge of cell (x..x+1 at row y); ('v', y, x) left edge.
    def point(edge):
        kind, y, x = edge
        if kind == 'h':
            t = interp(f[y, x], f[y, x + 1])
            return (x + t - 1.0, y - 1.0)
        t = interp(f[y, x], f[y + 1, x])
        return (x - 1.0, y + t - 1.0)

    table = {
        1: [('L', 'B')], 2: [('B', 'R')], 3: [('L', 'R')], 4: [('T', 'R')],
        5: [('L', 'T'), ('B', 'R')], 6: [('T', 'B')], 7: [('L', 'T')],
        8: [('T', 'L')], 9: [('T', 'B')], 10: [('T', 'R'), ('L', 'B')],
        11: [('T', 'R')], 12: [('L', 'R')], 13: [('B', 'R')], 14: [('L', 'B')],
    }
    # Each crossing edge joins exactly two segments; walk the undirected graph.
    links = {}
    for y, x in zip(ys.tolist(), xs.tolist()):
        edges = {'T': ('h', y, x), 'B': ('h', y + 1, x), 'L': ('v', y, x), 'R': ('v', y, x + 1)}
        for a, b in table[int(case[y, x])]:
            links.setdefault(edges[a], []).append(edges[b])
            links.setdefault(edges[b], []).append(edges[a])
    loops, seen = [], set()
    for start in links:
        if start in seen:
            continue
        loop, prev, edge = [], None, start
        while edge not in seen:
            seen.add(edge)
            loop.append(point(edge))
            options = [e for e in links[edge] if e != prev and e not in seen]
            if not options:
                break
            prev, edge = edge, options[0]
        if len(loop) > 8:
            loops.append(loop)
    return loops


def rdp(points, eps):
    pts = np.asarray(points)
    keep = np.zeros(len(pts), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        a, b = pts[i], pts[j]
        seg = pts[i + 1:j]
        d = b - a
        norm = np.hypot(*d)
        rel = seg - a
        dist = np.abs(d[0] * rel[:, 1] - d[1] * rel[:, 0]) / norm if norm > 0 else np.hypot(*rel.T)
        k = int(np.argmax(dist))
        if dist[k] > eps:
            m = i + 1 + k
            keep[m] = True
            stack += [(i, m), (m, j)]
    return pts[keep]


def simplify_closed(loop, eps):
    pts = np.asarray(loop)
    far = int(np.argmax(np.hypot(*(pts - pts[0]).T)))
    first = rdp(pts[:far + 1], eps)
    second = rdp(np.vstack([pts[far:], pts[:1]]), eps)
    return np.vstack([first[:-1], second[:-1]])


def main(source, out):
    navy, gold, _ = load_fields(source)
    loops = [simplify_closed(loop, EPSILON) for loop in marching_squares(navy)]
    allpts = np.vstack(loops)
    (x0, y0), (x1, y1) = allpts.min(axis=0), allpts.max(axis=0)
    side = max(x1 - x0, y1 - y0) * (1 + 2 * PADDING)
    ox, oy = (x0 + x1 - side) / 2, (y0 + y1 - side) / 2
    scale = VIEWBOX / side

    def fit(x, y):
        return (x - ox) * scale, (y - oy) * scale

    parts = []
    for pts in loops:
        parts.append('M' + 'L'.join('%.1f %.1f' % fit(x, y) for x, y in pts) + 'Z')
    gy, gx = np.nonzero(gold)
    cx, cy = fit(gx.mean(), gy.mean())
    r = np.sqrt(gold.sum() / np.pi) * scale
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEWBOX} {VIEWBOX}">'
        f'<path fill="{NAVY}" fill-rule="evenodd" d="{"".join(parts)}"/>'
        f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{GOLD}"/></svg>\n'
    )
    with open(out, 'w', encoding='utf-8') as handle:
        handle.write(svg)
    print(f'loops={len(parts)} bytes={len(svg)} crop=({ox:.1f},{oy:.1f},{side:.1f}) gold=({cx:.1f},{cy:.1f}) r={r:.1f}')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
