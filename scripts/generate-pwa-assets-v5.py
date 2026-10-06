#!/usr/bin/env python3
"""Derive installation assets from the complete, approved IPNC transparent PNG.

Requires Pillow. Never modifies the source, redraws, recolors, crops, removes
alpha pixels, or enlarges artwork. PNG encoding is lossless after proportional
Lanczos reduction. Ordinary icons remain transparent to avoid a separate tile
on the native splash. Opaque Apple/maskable icons use the global page background.
"""

from pathlib import Path
import argparse
import hashlib
import json
import math

import PIL
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps

BACKGROUND = "#f7fbf8"
INK = "#123b2e"
LANCZOS = Image.Resampling.LANCZOS


def digest(data):
    return hashlib.sha256(data).hexdigest()


def compose(source, size, art_limit, opaque):
    scale = min(1, art_limit / source.width, art_limit / source.height)
    dimensions = tuple(max(1, math.floor(value * scale)) for value in source.size)
    artwork = source.copy() if dimensions == source.size else source.resize(dimensions, LANCZOS)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    position = ((size - artwork.width) // 2, (size - artwork.height) // 2)
    layer.paste(artwork, position)
    result = Image.alpha_composite(Image.new("RGBA", layer.size, BACKGROUND), layer).convert("RGB") if opaque else layer
    return result, layer, {
        "canvas_size": [size, size],
        "art_canvas_size": list(artwork.size),
        "art_alpha_bbox": list(layer.getchannel("A").getbbox()),
        "placement": list(position),
        "opaque_background": BACKGROUND if opaque else None,
        "resampling": "LANCZOS reduction only",
        "upscale_applied": False,
    }


def mask(size, shape):
    output = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(output)
    if shape == "circle":
        draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    elif shape == "rounded":
        draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * 0.22), fill=255)
    elif shape == "squircle":
        half = size / 2
        for y in range(size):
            for x in range(size):
                if abs((x + 0.5 - half) / half) ** 4 + abs((y + 0.5 - half) / half) ** 4 <= 1:
                    output.putpixel((x, y), 255)
    return output


def font(size):
    path = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
    return ImageFont.truetype(str(path), size=size) if path.exists() else ImageFont.load_default(size=size)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True, help="New derivative/QA directory")
    args = parser.parse_args()
    source_path = args.source.resolve()
    original_bytes = source_path.read_bytes()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    with Image.open(source_path) as source_image:
        assert source_image.format == "PNG" and source_image.mode == "RGBA"
        assert min(source_image.size) >= 512, "An installation icon must never upscale a thumbnail"
        source = source_image.copy()

    images = {}
    compositions = {}
    maskable_layer = None
    for filename, size, art_limit, opaque in [
        ("icon-192x192-v5.png", 192, 192, False),
        ("icon-512x512-v5.png", 512, 512, False),
        # Check the actual nonzero artwork pixels against the guaranteed safe
        # circle below. Transparent corners need not reduce the complete mark.
        ("icon-maskable-512x512-v5.png", 512, 320, True),
        ("apple-touch-icon-v5.png", 180, 180, True),
    ]:
        result, layer, metadata = compose(source, size, art_limit, opaque)
        result.save(output / filename, format="PNG", compress_level=9)
        compositions[filename] = metadata
        images[filename] = result
        if "maskable" in filename:
            maskable_layer = layer

    safe_radius = 512 * 0.4
    bounds = maskable_layer.getchannel("A").getbbox()
    alpha = maskable_layer.getchannel("A")
    # Include the corners of each nonzero alpha pixel, rather than only its
    # centre. This proves that the complete sampled artwork is safe, including
    # very faint source pixels; no thresholding or noise removal is applied.
    pixel_radius = max(
        math.hypot(x + dx - 256, y + dy - 256)
        for y in range(bounds[1], bounds[3])
        for x in range(bounds[0], bounds[2])
        if alpha.getpixel((x, y))
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1))
    )
    assert pixel_radius < safe_radius, "The complete mark must fit in the guaranteed maskable safe circle"
    masks = {}
    shape_results = {}
    for shape in ("circle", "rounded", "squircle"):
        launcher_mask = mask(512, shape)
        alpha = maskable_layer.getchannel("A")
        removed = ImageChops.difference(alpha, ImageChops.multiply(alpha, launcher_mask)).getbbox()
        assert removed is None, "A launcher mask must not remove any artwork alpha pixel"
        image = images["icon-maskable-512x512-v5.png"].convert("RGBA")
        image.putalpha(launcher_mask)
        masks[shape] = image
        shape_results[shape] = {"artwork_pixels_clipped": False}

    sheet = Image.new("RGB", (1200, 680), "#e5ece7")
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 16), "IPNC PWA v5 - official artwork, proportions and alpha preserved", font=font(21), fill=INK)
    safe_preview = images["icon-maskable-512x512-v5.png"].copy()
    ImageDraw.Draw(safe_preview).ellipse((51.2, 51.2, 460.8, 460.8), outline="#c97815", width=2)
    samples = [
        (images["icon-192x192-v5.png"], "192 any / transparent"),
        (images["icon-512x512-v5.png"], "512 any / transparent"),
        (safe_preview, "Maskable / complete safe circle"),
        (images["apple-touch-icon-v5.png"], "Apple 180 / page background"),
        (masks["circle"], "Circle / no artwork clipped"),
        (masks["rounded"], "Rounded / no artwork clipped"),
        (masks["squircle"], "Squircle / no artwork clipped"),
        (source, "Master / unchanged transparent PNG"),
    ]
    for index, (image, label) in enumerate(samples):
        x, y = 24 + (index % 4) * 294, 64 + (index // 4) * 302
        draw.rounded_rectangle((x, y, x + 270, y + 280), radius=12, fill=BACKGROUND)
        preview = ImageOps.contain(image, (220, 220), LANCZOS)
        sheet.paste(preview, (x + (270 - preview.width) // 2, y + 12 + (220 - preview.height) // 2), preview if preview.mode == "RGBA" else None)
        draw.text((x + 10, y + 246), label, font=font(13), fill=INK)
    sheet.save(output / "qa-pwa-icons-v5.png", format="PNG", compress_level=9)

    assert source_path.read_bytes() == original_bytes, "The official master must remain byte-identical"
    metadata = {
        "pipeline": "scripts/generate-pwa-assets-v5.py",
        "pillow_version": PIL.__version__,
        "source": {"filename": source_path.name, "size": list(source.size), "sha256": digest(original_bytes), "alpha_range": list(source.getchannel("A").getextrema()), "alpha_bbox": list(source.getchannel("A").getbbox())},
        "processing": {"complete_source_canvas_preserved": True, "crop_applied": False, "upscale_applied": False, "redraw_applied": False, "recolor_applied": False, "source_master_modified": False, "png_encoding": "lossless"},
        "compositions": compositions,
        "maskable": {"safe_circle_center": [256, 256], "safe_circle_radius": safe_radius, "alpha_bbox": list(bounds), "maximum_artwork_pixel_corner_radius": pixel_radius, "safe_radius_margin": safe_radius - pixel_radius, "complete_art_inside_safe_circle": True, "launcher_shapes": shape_results},
        "files": [{"filename": filename, "sha256": digest((output / filename).read_bytes()), "mode": image.mode, "dimensions": list(image.size)} for filename, image in images.items()],
    }
    (output / "pwa-asset-metadata-v5.json").write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"source_unchanged": True, "output": str(output), "maskable_alpha_bbox": bounds, "safe_margin_px": safe_radius - pixel_radius}))


if __name__ == "__main__":
    main()
