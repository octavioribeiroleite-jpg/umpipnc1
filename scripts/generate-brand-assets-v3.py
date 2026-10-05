#!/usr/bin/env python3
"""Compose IPNC v3 assets from the complete transparent Canva PNG.

Requires Python 3 and Pillow. The source and exact master remain untouched.
Production assets use only proportional reduction and alpha compositing on
#123b2e; no element is cropped, redrawn, recolored, sharpened or enlarged.
The QA contact sheet enlarges small previews for visual inspection only.
The output directory is disposable: this script never writes to the checkout.
"""

from pathlib import Path
import argparse
import hashlib
import json
import math
import shutil

import PIL
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps

BACKGROUND = "#123b2e"
LANCZOS = Image.Resampling.LANCZOS
NEAREST = Image.Resampling.NEAREST
ICO_SIZES = [16, 32, 48, 64, 128, 256]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_png(image, path):
    image.save(path, format="PNG", compress_level=9)


def compose(source, size, art_limit):
    # ImageOps.contain permits enlargement; the explicit limit prevents it.
    limit = min(1, art_limit / source.width, art_limit / source.height)
    art_size = tuple(max(1, math.floor(dimension * limit)) for dimension in source.size)
    art = source.copy() if art_size == source.size else source.resize(art_size, LANCZOS)
    position = ((size - art.width) // 2, (size - art.height) // 2)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    layer.paste(art, position)
    result = Image.alpha_composite(Image.new("RGBA", layer.size, BACKGROUND), layer).convert("RGB")
    return result, layer, {
        "canvas_size": [size, size],
        "art_size": list(art.size),
        "placement": list(position),
        "art_alpha_bbox": list(layer.getchannel("A").getbbox()),
        "resampling": "none" if art.size == source.size else "LANCZOS reduction only",
        "upscale_applied": False,
    }


def shape_mask(size, shape):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    if shape == "circle":
        draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    elif shape == "rounded":
        draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * 0.22), fill=255)
    elif shape == "squircle":
        # Deterministic fourth-order superellipse, for QA only.
        half = size / 2
        for y in range(size):
            for x in range(size):
                if abs((x + 0.5 - half) / half) ** 4 + abs((y + 0.5 - half) / half) ** 4 <= 1:
                    mask.putpixel((x, y), 255)
    else:
        raise ValueError(shape)
    return mask


def font(size):
    path = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
    return ImageFont.truetype(str(path), size=size) if path.exists() else ImageFont.load_default(size=size)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Complete 403 x 348 transparent Canva PNG")
    parser.add_argument("--output", type=Path, required=True, help="Disposable assets and QA directory")
    args = parser.parse_args()
    source_path = args.source.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    with Image.open(source_path) as png:
        assert png.format == "PNG" and png.mode == "RGBA" and png.size == (403, 348)
        source = png.copy()

    master_path = output / "logo-ipnc.png"
    shutil.copyfile(source_path, master_path)
    assert master_path.read_bytes() == source_path.read_bytes()
    compositions = {}
    images = {}
    for filename, size, art_limit in [
        ("icon-192x192-v3.png", 192, 168),
        ("icon-512x512-v3.png", 512, 448),
        ("icon-maskable-512x512-v3.png", 512, 304),
        ("apple-touch-icon-v3.png", 180, 156),
        ("favicon-32x32-v3.png", 32, 28),
        ("ipnc-social-v3.png", 1200, 960),
    ]:
        result, layer, metadata = compose(source, size, art_limit)
        write_png(result, output / filename)
        compositions[filename] = metadata
        images[filename] = result
        if "maskable" in filename:
            maskable_layer = layer

    maskable = images["icon-maskable-512x512-v3.png"]
    safe_radius = 512 * 0.4
    bbox = maskable_layer.getchannel("A").getbbox()
    max_corner_radius = max(math.hypot(x - 256, y - 256) for x in (bbox[0], bbox[2]) for y in (bbox[1], bbox[3]))
    assert max_corner_radius < safe_radius
    # Assert every source-content alpha pixel survives every launcher shape.
    shape_checks = {}
    masked_images = {}
    for shape in ("circle", "rounded", "squircle"):
        mask = shape_mask(512, shape)
        alpha = maskable_layer.getchannel("A")
        surviving_alpha = ImageChops.multiply(alpha, mask)
        clipped_bbox = ImageChops.difference(alpha, surviving_alpha).getbbox()
        assert clipped_bbox is None
        preview = maskable.convert("RGBA")
        preview.putalpha(mask)
        masked_images[shape] = preview
        shape_checks[shape] = {"source_pixels_clipped": False, "clipped_alpha_bbox": clipped_bbox}

    frames = [compose(source, size, math.floor(size * 0.875))[0] for size in ICO_SIZES]
    ico_path = output / "favicon-v3.ico"
    frames[-1].save(ico_path, format="ICO", sizes=[(n, n) for n in ICO_SIZES], append_images=frames[:-1])
    with Image.open(ico_path) as ico:
        assert sorted(ico.ico.sizes()) == [(n, n) for n in ICO_SIZES]
        for size, frame in zip(ICO_SIZES, frames):
            assert ImageChops.difference(frame, ico.ico.getimage((size, size)).convert("RGB")).getbbox() is None
            if size == 32:
                assert frame.tobytes() == images["favicon-32x32-v3.png"].tobytes()

    # Contact sheet is visual evidence only; nearest enlargement shows favicon pixels.
    sheet = Image.new("RGB", (1360, 1000), "#e5e7eb")
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 16), "IPNC v3 - no production upscale; QA previews may enlarge", font=font(24), fill=BACKGROUND)

    def tile(im, label, x, y, preview_size=220, resample=LANCZOS):
        draw.rounded_rectangle((x, y, x + 308, y + 290), radius=12, fill="white")
        preview = ImageOps.contain(im, (preview_size, preview_size), resample)
        position = (x + (308 - preview.width) // 2, y + 12 + (220 - preview.height) // 2)
        sheet.paste(preview, position, preview if preview.mode == "RGBA" else None)
        draw.text((x + 12, y + 245), label, font=font(16), fill=BACKGROUND)

    qa_safe = maskable.copy()
    ImageDraw.Draw(qa_safe).ellipse((51.2, 51.2, 460.8, 460.8), outline="#f59e0b", width=2)
    for index, (im, label) in enumerate([
        (images["icon-192x192-v3.png"], "Install 192: art 168 x 145"),
        (images["icon-512x512-v3.png"], "Install 512: art 403 x 348"),
        (qa_safe, "Maskable 512: safe circle r204.8"),
        (images["apple-touch-icon-v3.png"], "Apple 180: complete mark"),
        (masked_images["circle"], "Launcher: circle"),
        (masked_images["rounded"], "Launcher: rounded square"),
        (masked_images["squircle"], "Launcher: squircle"),
        (images["ipnc-social-v3.png"], "Social 1200: native 403 x 348 art"),
    ]):
        tile(im, label, 24 + (index % 4) * 332, 66 + (index // 4) * 314)
    for index, (size, frame) in enumerate(zip(ICO_SIZES, frames)):
        x, y = 24 + index * 220, 706
        draw.rounded_rectangle((x, y, x + 196, y + 267), radius=12, fill="white")
        preview = frame.resize((160, 160), NEAREST)
        sheet.paste(preview, (x + 18, y + 12))
        draw.text((x + 12, y + 189), f"ICO {size}px", font=font(16), fill=BACKGROUND)
        if size <= 64:
            sheet.paste(frame, (x + 18, y + 218))
    contact_path = output / "qa-contact-sheet-v3.png"
    write_png(sheet, contact_path)

    metadata = {
        "pipeline": "scripts/generate-brand-assets-v3.py",
        "pillow_version": PIL.__version__,
        "source": {"path": str(source_path), "size": list(source.size), "mode": source.mode, "sha256": sha(source_path.read_bytes()), "alpha_bbox": list(source.getchannel("A").getbbox())},
        "master": {"copied_bytes_identically": True, "sha256": sha(master_path.read_bytes()), "rgba_pixel_sha256": sha(source.tobytes())},
        "processing": {"complete_art_in_every_output": True, "crop_applied": False, "upscale_applied": False, "redraw_applied": False, "recolor_applied": False, "background": BACKGROUND, "png_encoding": "lossless"},
        "compositions": compositions,
        "maskable": {"safe_circle_center": [256, 256], "safe_circle_radius": safe_radius, "art_alpha_bbox": list(bbox), "maximum_art_bbox_corner_radius": max_corner_radius, "safe_radius_margin": safe_radius - max_corner_radius, "complete_art_inside_safe_circle": True, "launcher_shapes": shape_checks},
        "favicon": {"ico_sizes": ICO_SIZES, "complete_art_in_all_frames": True, "direct_reduction_from_source_per_frame": True, "png32_matches_ico32": True},
        "qa": {"contact_sheet": contact_path.name, "preview_enlargement_for_inspection_only": True, "production_pixels_not_modified": True},
        "files": [],
    }
    for path in sorted(output.glob("*.png")) + [ico_path]:
        with Image.open(path) as im:
            metadata["files"].append({"filename": path.name, "bytes": path.stat().st_size, "sha256": sha(path.read_bytes()), "mode": im.mode, "size": list(im.size)})
    metadata_path = output / "asset-metadata-v3.json"
    metadata_path.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"output": str(output), "metadata": str(metadata_path), "master_bytes_identical": True, "maskable_bbox": bbox, "maskable_safe_margin": safe_radius - max_corner_radius, "upscale_applied": False}))


if __name__ == "__main__":
    main()
