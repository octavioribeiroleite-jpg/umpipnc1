#!/usr/bin/env python3
"""Generate responsive, lossless WebP copies of the approved society PNGs.

Preserve the complete artwork, alpha and aspect ratio. Only proportional
Lanczos reduction is applied; the 384px copy preserves every RGBA source pixel.
Use --check to verify decoded pixels and unchanged masters without writing.
Requires Pillow with WebP support.
"""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/assets/societies'
OUTPUT = SOURCE / 'optimized'
SOCIETIES = ('saf', 'ucp', 'ump', 'upa', 'uph', 'pastor')
SIZES = (96, 192, 256, 384)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if not args.check:
        OUTPUT.mkdir(parents=True, exist_ok=True)
    metadata = {'encoding': 'lossless WebP, method=6, exact=True', 'resampling': 'proportional Lanczos reduction only', 'icons': {}}
    for slug in SOCIETIES:
        master = SOURCE / f'{slug}.png'
        original = master.read_bytes()
        with Image.open(master) as source:
            assert source.format == 'PNG' and source.size == (384, 384)
            rgba = source.convert('RGBA')
            profile = {'icc_profile': source.info['icc_profile']} if source.info.get('icc_profile') else {}
        copies = {}
        for size in SIZES:
            expected = rgba if size == 384 else rgba.resize((size, size), Image.Resampling.LANCZOS)
            target = OUTPUT / f'{slug}-{size}.webp'
            if not args.check:
                expected.save(target, 'WEBP', lossless=True, method=6, exact=True, **profile)
            with Image.open(target) as decoded:
                assert decoded.format == 'WEBP' and decoded.size == expected.size
                assert decoded.convert('RGBA').tobytes() == expected.tobytes(), f'Lossy or changed artwork: {target.name}'
            copies[str(size)] = {'file': target.name, 'bytes': target.stat().st_size, 'sha256': digest(target.read_bytes()), 'rgba_exact': True}
        assert master.read_bytes() == original, f'Master changed: {master.name}'
        metadata['icons'][slug] = {'master_sha256': digest(original), 'master_bytes': len(original), 'copies': copies}
    if args.check:
        assert json.loads((OUTPUT / 'metadata.json').read_text()) == metadata
    else:
        (OUTPUT / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print(json.dumps({'checked': args.check, 'original_bytes': sum(i['master_bytes'] for i in metadata['icons'].values()), 'responsive_bytes': {str(n): sum(i['copies'][str(n)]['bytes'] for i in metadata['icons'].values()) for n in SIZES}, 'rgba_exact': True, 'masters_unchanged': True}))


if __name__ == '__main__':
    main()
