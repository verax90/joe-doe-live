"""Draws public/og.png, the preview shown when a studio link is pasted in a chat.

Run from the repo root after `pnpm install` (it reads the fonts from node_modules):
    python3 scripts/og-image.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG = "#12151c"
FG = "#eceae4"
MUTED = "#9a9aa3"
ACCENT = "#d6ff4b"
STRING = "#b5e38a"
LINE = "#232838"

fonts = Path("node_modules/@fontsource")
syne = Path("node_modules/@fontsource-variable/syne/files/syne-latin-wght-normal.woff2")


def display(size):
    font = ImageFont.truetype(str(syne), size)
    font.set_variation_by_axes([700])
    return font


def mono(size, weight=400):
    return ImageFont.truetype(str(fonts / f"ibm-plex-mono/files/ibm-plex-mono-latin-{weight}-normal.woff2"), size)


img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# Code panel: one Strudel line and one Hydra line, coloured like the editor
panel = (72, 210, W - 72, 390)
draw.rounded_rectangle(panel, radius=14, fill="#1a1e28", outline=LINE, width=2)
code_font = mono(30)
lines = [
    [("s(", FG), ('"bd ~ ~ ~ sd ~ ~ bd"', STRING), (").lpf(", FG), ("3500", ACCENT), (")", FG)],
    [("osc(", FG), ("6", ACCENT), (", ", FG), ("0.03", ACCENT), (").kaleid(", FG), ("4", ACCENT), (").out()", FG)],
]
y = panel[1] + 36
for line in lines:
    x = panel[0] + 36
    for text, colour in line:
        draw.text((x, y), text, font=code_font, fill=colour)
        x += draw.textlength(text, font=code_font)
    y += 60

# Brand, same as the studio bar: joe doe · live
title = display(76)
x, y = 72, 72
for text, colour in [("joe doe", FG), (" · ", MUTED), ("live", ACCENT)]:
    draw.text((x, y), text, font=title, fill=colour)
    x += draw.textlength(text, font=title)

# Tagline and address
draw.text((72, 430), "Strudel + Hydra + MIDI, in the browser", font=mono(32), fill=FG)
draw.text((72, 480), "live.joedoe.dev", font=mono(32, 600), fill=ACCENT)

# The favicon's wave, stretched along the bottom edge
base = 565
wave = [(72, base), (560, base), (600, base - 34), (650, base + 34), (700, base - 34), (750, base + 34),
        (800, base - 34), (840, base), (W - 72, base)]
draw.line(wave, fill=ACCENT, width=8, joint="curve")

out = Path("public/og.png")
img.save(out, optimize=True)
print(f"{out} {out.stat().st_size // 1024} KB")
