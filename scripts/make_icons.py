#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = Path(__file__).resolve().parents[1] / "icons"
OUT.mkdir(exist_ok=True)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = max(1, size // 16)
    d.rounded_rectangle(
        [pad, pad, size - pad - 1, size - pad - 1],
        radius=size // 4,
        fill=(28, 25, 21, 255),
    )
    # gold speaker body
    cx, cy = size * 0.42, size * 0.5
    bw, bh = size * 0.16, size * 0.22
    d.rounded_rectangle(
        [cx - bw, cy - bh * 0.45, cx - bw * 0.15, cy + bh * 0.45],
        radius=max(1, size // 28),
        fill=(224, 196, 138, 255),
    )
    cone = [
        (cx - bw * 0.1, cy - bh * 0.35),
        (cx + bw * 0.85, cy - bh * 0.95),
        (cx + bw * 0.85, cy + bh * 0.95),
        (cx - bw * 0.1, cy + bh * 0.35),
    ]
    d.polygon(cone, fill=(224, 196, 138, 255))
    # sound waves
    for i, r in enumerate((0.18, 0.28)):
        box = [
            cx + size * 0.08,
            cy - size * r,
            cx + size * (0.08 + r * 1.15),
            cy + size * r,
        ]
        d.arc(box, start=310, end=50, fill=(246, 241, 232, 255), width=max(1, size // 22 - i))
    return img


for s in (16, 32, 48, 128):
    im = draw_icon(s)
    path = OUT / f"icon{s}.png"
    im.save(path)
    print(path, im.size)
