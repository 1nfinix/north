"""Write every North brand asset derived from `assets/north-mark.svg`.

Vector outputs are written directly; raster outputs are rasterized by
`render-png.mjs` (sharp) and composited with Pillow. Run from the repository root:
  python3 -I packages/north/ui-brand/scripts/render-assets.py
"""

import math
import os
import re
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.getcwd()
HERE = os.path.dirname(os.path.abspath(__file__))
MARK = os.path.join(HERE, '..', 'assets', 'north-mark.svg')
FONT = os.path.join(ROOT, 'packages/client/ui-theme/src/styles/montserrat-medium.woff2')
RESOURCES = os.path.join(ROOT, 'apps/desktop/resources')
INSTALLER = os.path.join(ROOT, 'apps/desktop/installer/assets')
NAVY, GOLD = '#111826', '#B7A06D'
NAVY_DARK, GOLD_DARK = '#E6E9F0', '#C9B47F'
TILE = '#FBFBFB'

source = open(MARK, encoding='utf-8').read()
PATH = re.search(r' d="([^"]+)"', source).group(1)
CX, CY, R = (float(v) for v in re.search(r'cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"', source).groups())


def mark(navy=NAVY, gold=GOLD, transform=None, group_id=None):
    body = (f'<g{f" transform={chr(34)}{transform}{chr(34)}" if transform else ""}>'
            f'<path fill="{navy}" fill-rule="evenodd" d="{PATH}"/>'
            f'<circle cx="{CX}" cy="{CY}" r="{R}" fill="{gold}"/></g>')
    # The tray renderer adds its own transform to the id-bearing group, so it stays bare.
    return f'<g id="{group_id}">{body}</g>' if group_id else body


def write(path, text):
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write(text)
    print('wrote', os.path.relpath(path, ROOT))


SHADOW = ('<filter id="tile-shadow" x="-8" y="-16" width="1120" height="1120" filterUnits="userSpaceOnUse" '
          'color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/>'
          '<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>'
          '<feOffset dy="8"/><feGaussianBlur stdDeviation="20"/><feComposite in2="hardAlpha" operator="out"/>'
          '<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0"/>'
          '<feBlend mode="normal" in2="BackgroundImageFix" result="shadow"/>'
          '<feBlend mode="normal" in="SourceGraphic" in2="shadow" result="shape"/></filter>')
# The application tile spans (40, 32)-(1064, 1056); its centre (552, 544) is
# the tray renderer's scaling origin. The mark fills 70 % of the tile.
GLYPH = 'translate(193.6 185.6) scale(0.7)'


def tile_icon(size, outer, rx, glyph_id=None):
    inner = (f'<g filter="url(#tile-shadow)"><rect{f" rx={chr(34)}{rx}{chr(34)}" if rx else ""} width="1024" height="1024" '
             f'transform="translate(40 32)" fill="{TILE}"/>{mark(transform=GLYPH, group_id=glyph_id)}</g>')
    body = f'<g transform="{outer}">{inner}</g>' if outer else inner
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}" fill="none" '
            f'xmlns="http://www.w3.org/2000/svg">\n{body}\n<defs>{SHADOW}</defs>\n</svg>\n')


def bundle_icon():
    """Plugin-manager icon: the mark on the required 36-unit canvas."""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">'
            f'{mark(transform="scale(0.03515625)")}</svg>\n')


def welcome_brand():
    style = ('<style>:root{--north-ink:#111826;--north-gold:#B7A06D}'
             '@media (prefers-color-scheme: dark){:root{--north-ink:#E6E9F0;--north-gold:#C9B47F}}</style>')
    glyph = (f'<g transform="translate(150 4) scale(0.03125)"><path fill="var(--north-ink)" fill-rule="evenodd" d="{PATH}"/>'
             f'<circle cx="{CX}" cy="{CY}" r="{R}" fill="var(--north-gold)"/></g>')
    text = ('<text x="192" y="29" fill="var(--north-ink)" font-size="24" font-weight="600" '
            'font-family="Montserrat, \'Segoe UI\', \'PingFang SC\', \'Microsoft YaHei\', sans-serif">North '
            '<tspan font-weight="500">诺思</tspan></text>')
    return (f'<svg width="472" height="40" viewBox="0 0 472 40" fill="none" xmlns="http://www.w3.org/2000/svg">'
            f'{style}{glyph}{text}</svg>\n')


def rasterize(jobs):
    """jobs: list of (svg_text, out_png, edge)."""
    with tempfile.TemporaryDirectory() as tmp:
        args = []
        for index, (svg, out, edge) in enumerate(jobs):
            src = os.path.join(tmp, f'{index}.svg')
            with open(src, 'w', encoding='utf-8') as handle:
                handle.write(svg)
            args += [src, out, str(edge)]
        subprocess.run(['node', os.path.join(HERE, 'render-png.mjs'), *args], check=True)


def mark_svg(navy=NAVY, gold=GOLD):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">{mark(navy, gold)}</svg>'


def installer_brand(mark_png, scale, text_rgba, out):
    w, h = 600 * scale, 196 * scale
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    cx, cy, radius = 300 * scale, 72 * scale, 64 * scale
    shadow = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((cx - radius, cy - radius + 6 * scale, cx + radius, cy + radius + 6 * scale), fill=(17, 24, 38, 40))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(8 * scale)))
    ImageDraw.Draw(canvas).ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(249, 250, 250, 255))
    glyph = Image.open(mark_png).convert('RGBA').resize((84 * scale, 84 * scale), Image.LANCZOS)
    canvas.alpha_composite(glyph, (cx - 42 * scale, cy - 42 * scale))
    font = ImageFont.truetype(FONT, 34 * scale)
    draw = ImageDraw.Draw(canvas)
    left, top, right, bottom = draw.textbbox((0, 0), 'North', font=font)
    draw.text(((w - (right - left)) / 2 - left, 176 * scale - bottom), 'North', font=font, fill=text_rgba)
    canvas.save(out)
    print('wrote', os.path.relpath(out, ROOT))


def uninstaller_sidebar(mark_png, out):
    canvas = Image.new('RGB', (164, 314), (243, 244, 246))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((22, 90, 142, 210), radius=12, fill=(251, 251, 251), outline=(217, 222, 231))
    glyph = Image.open(mark_png).convert('RGBA').resize((92, 92), Image.LANCZOS)
    canvas.paste(glyph, (36, 104), glyph)
    canvas.save(out)
    print('wrote', os.path.relpath(out, ROOT))


def running_indicator(mark_png, out):
    """28 px alpha mask, 60 frames at 50 ms: the mark swings like a settling needle."""
    base = Image.open(mark_png).convert('RGBA').resize((112, 112), Image.LANCZOS).getchannel('A')
    frames = []
    for index in range(60):
        angle = 20 * math.sin(2 * math.pi * index / 60)
        rotated = base.rotate(angle, resample=Image.BICUBIC).resize((28, 28), Image.LANCZOS)
        frames.append(Image.merge('LA', (Image.new('L', (28, 28), 0), rotated)))
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=50, loop=0, disposal=0, blend=0)
    print('wrote', os.path.relpath(out, ROOT))


def main():
    write(os.path.join(ROOT, 'apps/web/public/favicon.svg'), mark_svg() + '\n')
    write(os.path.join(ROOT, 'apps/web/public/favicon-dark.svg'), mark_svg(NAVY_DARK, GOLD_DARK) + '\n')
    write(os.path.join(ROOT, 'packages/north/bundle/icon.svg'), bundle_icon())
    icons = {
        'icon.svg': tile_icon(1104, None, None),
        'icon-macos.svg': tile_icon(1024, 'translate(100 100) scale(0.8046875) translate(-40 -32)', 230),
        'icon-windows.svg': tile_icon(1024, 'translate(32 32) scale(0.9375) translate(-40 -32)', 192, 'tray-glyph'),
    }
    for name, svg in icons.items():
        write(os.path.join(RESOURCES, name), svg)
    write(os.path.join(ROOT, 'apps/desktop/renderer/assets/welcome-brand.svg'), welcome_brand())
    with tempfile.TemporaryDirectory() as tmp:
        mark_png = os.path.join(tmp, 'mark.png')
        rasterize([
            (icons['icon.svg'], os.path.join(RESOURCES, 'icon.png'), 1104),
            (icons['icon-macos.svg'], os.path.join(RESOURCES, 'icon-macos.png'), 1024),
            (icons['icon-windows.svg'], os.path.join(RESOURCES, 'icon-windows.png'), 1024),
            (mark_svg(), mark_png, 512),
        ])
        installer_brand(mark_png, 1, (17, 24, 38, 255), os.path.join(INSTALLER, 'brand.png'))
        installer_brand(mark_png, 2, (17, 24, 38, 255), os.path.join(INSTALLER, 'brand-2x.png'))
        installer_brand(mark_png, 1, (250, 250, 250, 255), os.path.join(INSTALLER, 'brand-dark.png'))
        installer_brand(mark_png, 2, (250, 250, 250, 255), os.path.join(INSTALLER, 'brand-dark-2x.png'))
        uninstaller_sidebar(mark_png, os.path.join(INSTALLER, 'uninstaller-sidebar.png'))
        running_indicator(mark_png, os.path.join(ROOT, 'packages/client/ui-chat/src/client/chat/running-whale@2x.png'))


if __name__ == '__main__':
    sys.exit(main())
