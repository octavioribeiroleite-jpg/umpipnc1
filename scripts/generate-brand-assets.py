#!/usr/bin/env python3
"""Derive IPNC icons from the user-approved JPEG, with no generated artwork.

Run with Python and Pillow. All paths are local; the checkout is never modified.
PNG master preserves exactly the decoded RGB pixels and original ICC profile.
Only favicon uses the separately authorized crop containing leaves and book.
"""

from pathlib import Path
import argparse
import hashlib
import json
import math
import shutil

import PIL
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps, ImageStat

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, required=True, help='Official 1280-square JPEG export')
parser.add_argument('--output', type=Path, required=True, help='Directory for generated assets and QA')
args = parser.parse_args()
SOURCE = args.source.resolve()
HERE = args.output.resolve()
LANCZOS = Image.Resampling.LANCZOS
NEAREST = Image.Resampling.NEAREST


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_png(im, filename, icc):
    target = HERE / filename
    im.save(target, format="PNG", compress_level=9, icc_profile=icc)
    return target


def render_masked(im, shape):
    mask = Image.new("L", im.size, 0)
    draw = ImageDraw.Draw(mask)
    if shape == "circle":
        draw.ellipse((0, 0, im.width - 1, im.height - 1), fill=255)
    elif shape == "rounded":
        draw.rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=112, fill=255)
    elif shape == "squircle":
        # Deterministic fourth-order superellipse; this mask is QA only.
        a = im.width / 2
        for y in range(im.height):
            for x in range(im.width):
                if abs((x + 0.5 - a) / a) ** 4 + abs((y + 0.5 - a) / a) ** 4 <= 1:
                    mask.putpixel((x, y), 255)
    result = im.convert("RGBA")
    result.putalpha(mask)
    return result


def font(size):
    path = Path("/System/Library/Fonts/Supplemental/Arial.ttf")
    return ImageFont.truetype(str(path), size=size) if path.exists() else ImageFont.load_default(size=size)


def main():
    HERE.mkdir(parents=True, exist_ok=True)
    original = HERE / "source-approved-original.jpg"
    shutil.copyfile(SOURCE, original)
    with Image.open(original) as jpeg:
        assert jpeg.size == (1280, 1280) and jpeg.mode == "RGB"
        icc = jpeg.info.get("icc_profile")
        source_exif_orientation = jpeg.getexif().get(274)
        source = jpeg.copy()

    # No crop, color correction, sharpening, transparency or EXIF orientation.
    master_path = write_png(source, "logo-ipnc.png", icc)
    with Image.open(master_path) as png:
        assert png.mode == source.mode and png.size == source.size
        assert png.tobytes() == source.tobytes()
        assert png.info.get("icc_profile") == icc

    generated = [master_path]
    for filename, size in [
        ("icon-192x192-v2.png", 192),
        ("icon-512x512-v2.png", 512),
        ("apple-touch-icon-v2.png", 180),
        ("ipnc-social-v2.png", 1200),
    ]:
        generated.append(write_png(source.resize((size, size), LANCZOS), filename, icc))

    # An actual image patch, containing no lettering/outline, samples the cream.
    cream_sample_box = (180, 160, 240, 240)
    cream = tuple(ImageStat.Stat(source.crop(cream_sample_box)).median)
    maskable = Image.new("RGB", (512, 512), cream)
    complete_art = source.resize((288, 288), LANCZOS)
    maskable.paste(complete_art, (112, 112))
    generated.append(write_png(maskable, "icon-maskable-512x512-v2.png", icc))

    # The whole 288-square, including the supplied artwork background, is safe:
    # sqrt(144^2 + 144^2) = 203.64675 < radius 0.4*512 = 204.8.
    safe_radius = 0.4 * 512
    max_corner_radius = math.hypot(144, 144)
    assert max_corner_radius < safe_radius
    assert ImageChops.difference(maskable.crop((112, 112, 400, 400)), complete_art).getbbox() is None

    # Only this output is cropped. Search leaves/book within an explicit ROI
    # ending above the first IPNC letter, then pad the detected bbox by 10 px.
    symbol_roi = (220, 50, 1080, 651)
    xs, ys = [], []
    pixels = source.load()
    for y in range(symbol_roi[1], symbol_roi[3]):
        for x in range(symbol_roi[0], symbol_roi[2]):
            r, g, b = pixels[x, y]
            green = g - r >= 8 and g - b >= 4 and r < 200
            gold = r - b >= 25 and g - b >= 15 and r >= 140
            if green or gold:
                xs.append(x)
                ys.append(y)
    detected_symbol_bbox = (min(xs), min(ys), max(xs) + 1, max(ys) + 1)
    assert detected_symbol_bbox == (268, 79, 1031, 636)
    crop_box = tuple(v + delta for v, delta in zip(detected_symbol_bbox, (-10, -10, 10, 10)))
    assert crop_box == (258, 69, 1041, 646)
    assert crop_box[3] < 667  # IPNC lettering begins below the crop.
    symbol = source.crop(crop_box)
    fitted_symbol = ImageOps.contain(symbol, (240, 240), LANCZOS)
    favicon_base = Image.new("RGB", (256, 256), cream)
    placement = ((256 - fitted_symbol.width) // 2, (256 - fitted_symbol.height) // 2)
    favicon_base.paste(fitted_symbol, placement)
    ico_path = HERE / "favicon-v2.ico"
    ico_sizes = [16, 32, 48, 64, 128, 256]
    favicon_base.save(ico_path, format="ICO", sizes=[(n, n) for n in ico_sizes])
    generated.append(ico_path)
    generated.append(write_png(favicon_base.resize((32, 32), LANCZOS), "favicon-32x32-v2.png", icc))
    with Image.open(ico_path) as ico:
        assert sorted(ico.ico.sizes()) == [(n, n) for n in ico_sizes]
        for n in ico_sizes:
            assert ico.ico.getimage((n, n)).size == (n, n)

    # Visual QA: actual output pixels, masks, and nearest enlarged favicon frames.
    sheet = Image.new("RGB", (1280, 1250), "#e5e7eb")
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 14), "IPNC - deterministic assets from approved JPEG", font=font(25), fill="#14291f")
    draw.text((24, 50), "Full artwork kept in master, installation icons and social image; only favicon uses symbol crop.", font=font(17), fill="#334155")

    def tile(im, label, x, y, size=200, resample=LANCZOS):
        draw.rectangle((x, y, x + 284, y + 276), fill="white")
        preview = ImageOps.contain(im, (size, size), resample)
        if preview.mode == "RGBA":
            sheet.paste(preview, (x + (284 - preview.width) // 2, y + 13 + (size - preview.height) // 2), preview)
        else:
            sheet.paste(preview, (x + (284 - preview.width) // 2, y + 13 + (size - preview.height) // 2))
        draw.text((x + 12, y + 227), label, font=font(17), fill="#14291f")

    for i, (filename, label) in enumerate([
        ("logo-ipnc.png", "Master 1280 - exact RGB"),
        ("icon-192x192-v2.png", "Install any 192"),
        ("icon-512x512-v2.png", "Install any 512"),
        ("apple-touch-icon-v2.png", "Apple touch 180"),
    ]):
        with Image.open(HERE / filename) as im:
            tile(im, label, 24 + i * 312, 94)

    qa_safe = maskable.copy()
    qa_draw = ImageDraw.Draw(qa_safe)
    qa_draw.ellipse((51.2, 51.2, 460.8, 460.8), outline="#ea580c", width=2)
    for i, (im, label) in enumerate([
        (qa_safe, "Maskable 512 / 80% safe circle"),
        (render_masked(maskable, "circle"), "Mask: circle"),
        (render_masked(maskable, "rounded"), "Mask: rounded rectangle"),
        (render_masked(maskable, "squircle"), "Mask: squircle"),
    ]):
        tile(im, label, 24 + i * 312, 394)

    with Image.open(ico_path) as ico:
        for i, n in enumerate(ico_sizes):
            x, y = 24 + (i % 4) * 312, 694 + (i // 4) * 276
            tile(ico.ico.getimage((n, n)), f"Favicon {n}px - nearest zoom", x, y, size=192, resample=NEAREST)
            original_frame = ico.ico.getimage((n, n))
            if n <= 64:
                sheet.paste(original_frame, (x + 220, y + 196))
    tile(source.crop(crop_box), "Approved symbol crop only", 648, 970)
    with Image.open(HERE / "ipnc-social-v2.png") as im:
        tile(im, "Social 1200 - full composition", 960, 970)
    contact_path = write_png(sheet, "qa-contact-sheet.png", None)

    metadata = {
        "pipeline": "generate_assets.py",
        "pillow_version": PIL.__version__,
        "source": {
            "supplied_path": str(SOURCE),
            "preserved_original": original.name,
            "format": "JPEG",
            "mode": source.mode,
            "size": list(source.size),
            "sha256": sha(original.read_bytes()),
            "bytes": original.stat().st_size,
            "icc_profile_bytes": len(icc or b""),
            "icc_profile_sha256": sha(icc) if icc else None,
            "exif_orientation": source_exif_orientation,
        },
        "master_pixel_verification": {
            "decoded_jpeg_rgb_sha256": sha(source.tobytes()),
            "png_rgb_sha256": sha(Image.open(master_path).tobytes()),
            "equal_mode": True,
            "equal_resolution": True,
            "equal_every_decoded_pixel": True,
            "original_icc_profile_preserved": True,
            "pixel_difference_bbox": None,
            "crop_applied": False,
            "color_transform_applied": False,
            "background_removed": False,
            "alpha_added": False,
        },
        "processing": {
            "png_compression": 9,
            "normal_icons_social_resampling": "LANCZOS from full master",
            "pixel_color_changes": "Only resampling and cream padding in derived maskable/favicon; master unchanged",
            "art_redrawn_or_generated": False,
            "automatic_exif_transpose": False,
        },
        "colors": {
            "cream_padding_rgb": list(cream),
            "cream_padding_hex": "#" + "".join(f"{n:02x}" for n in cream),
            "cream_sampling_method": "Per-channel median of JPEG patch",
            "cream_sample_box": list(cream_sample_box),
            "leaf_dark_green_sample": {"xy": [645, 220], "rgb": list(source.getpixel((645, 220)))},
            "gold_vein_sample": {"xy": [830, 346], "rgb": list(source.getpixel((830, 346)))},
        },
        "maskable": {
            "size": [512, 512],
            "mode": "RGB (opaque)",
            "whole_source_art_scaled_to": [288, 288],
            "whole_source_art_placement": [112, 112],
            "complete_art_box": [112, 112, 400, 400],
            "safe_circle_center": [256, 256],
            "safe_circle_diameter_fraction": 0.8,
            "safe_circle_radius": safe_radius,
            "maximum_complete_art_corner_radius": max_corner_radius,
            "safe_radius_margin_at_art_corners": safe_radius - max_corner_radius,
            "complete_art_inside_safe_circle": True,
            "complete_art_pixels_preserved_after_resampling": True,
            "crop_applied": False,
        },
        "favicon": {
            "authorized_exception": "Only leaves/book emblem, without IPNC wordmark or lower decorative band",
            "source_roi": list(symbol_roi),
            "detected_color_foreground_bbox": list(detected_symbol_bbox),
            "source_crop_box_with_10px_padding": list(crop_box),
            "source_crop_size": list(symbol.size),
            "base_size": [256, 256],
            "symbol_fitted_size": list(fitted_symbol.size),
            "symbol_placement": list(placement),
            "ico_frame_sizes": ico_sizes,
            "png_frame_size": 32,
            "aspect_ratio_preserved": True,
            "contains_ipnc_letters": False,
        },
        "qa_contact_sheet": contact_path.name,
        "files": [],
    }
    for path in [original, *generated, contact_path]:
        with Image.open(path) as im:
            entry = {
                "filename": path.name,
                "sha256": sha(path.read_bytes()),
                "bytes": path.stat().st_size,
                "format": im.format,
                "mode": im.mode,
                "resolution": list(im.size),
                "alpha_channel": "A" in im.getbands(),
            }
            if im.format == "ICO":
                entry["frames"] = [list(s) for s in sorted(im.ico.sizes())]
            metadata["files"].append(entry)
    metadata_path = HERE / "asset-metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"output_directory": str(HERE), "metadata": str(metadata_path), "files_generated": len(generated), "master_exact_pixel_match": True, "cream_rgb": cream, "favicon_crop_box": crop_box}))


if __name__ == "__main__":
    main()
