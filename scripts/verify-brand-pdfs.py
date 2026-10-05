from pathlib import Path
import argparse
import shutil
import hashlib
import json
import re
import subprocess
from PIL import Image, ImageChops
from pypdf import PdfReader
from pypdf.generic import ContentStream

parser = argparse.ArgumentParser(description='Verify and render isolated IPNC brand PDFs')
parser.add_argument('--output', type=Path, required=True)
parser.add_argument('--poppler', default=shutil.which('pdftoppm'))
args = parser.parse_args()
OUT = args.output.resolve()
POPLER = args.poppler
if not POPLER:
    raise RuntimeError('pdftoppm is required; pass --poppler with its absolute path.')
manifest = json.loads((OUT / 'generation.json').read_text())
master_path = Path(manifest['logo']['path'])
master_bytes = master_path.read_bytes()
assert hashlib.sha256(master_bytes).hexdigest() == manifest['logo']['sha256'], 'Master changed after PDF generation.'
master = Image.open(master_path).convert('RGB')
assert master.size == (1280, 1280)
for entry in manifest['sources']:
    source_path = Path(manifest['repo']) / entry['file']
    assert hashlib.sha256(source_path.read_bytes()).hexdigest() == entry['sha256'], f'Source changed after PDF generation: {entry["file"]}'
reports = []
for document in manifest['documents']:
    source = OUT / document['filename']
    reader = PdfReader(source)
    assert len(reader.pages) == document['pages']
    images = list(reader.pages[0].images)
    logo_images = [entry for entry in images if entry.image.size == master.size]
    assert logo_images, f'{source.name}: missing embedded 1280 master on first page.'
    assert any(ImageChops.difference(entry.image.convert('RGB'), master).getbbox() is None for entry in logo_images), f'{source.name}: embedded RGB pixels differ from the production master.'
    placements = []
    for page in reader.pages:
        page_placements = []
        recent_matrix = None
        for operands, operator in ContentStream(page.get_contents(), reader).operations:
            if operator == b'cm':
                recent_matrix = [float(value) for value in operands]
            if operator == b'Do':
                page_placements.append({'resource': str(operands[0]), 'matrix': recent_matrix})
        placements.append(page_placements)
    assert len(placements[0]) == 1, f'{source.name}: expected exactly one placed logo on the first page.'
    matrix = placements[0][0]['matrix']
    expected_side_mm = 22 if source.name.startswith('cronograma') else 20
    assert abs(matrix[0] - matrix[3]) < 0.0001 and matrix[1] == 0 and matrix[2] == 0, f'{source.name}: logo aspect ratio was changed.'
    assert abs(matrix[0] * 25.4 / 72 - expected_side_mm) < 0.0001, f'{source.name}: unexpected logo dimensions.'
    assert all(len(page_placements) == 0 for page_placements in placements[1:]), f'{source.name}: continuation-page behavior changed.'
    text = '\n'.join(page.extract_text() or '' for page in reader.pages)
    assert 'EVENTO_CANCELADO_FICTICIO_NAO_EXPORTAR' not in text
    assert 'Fictício' in text or 'fictício' in text
    for page_index, page in enumerate(reader.pages, 1):
        assert f'Página {page_index} de {len(reader.pages)}' in (page.extract_text() or ''), f'{source.name}: footer count is incorrect on page {page_index}.'
    render_prefix = OUT / source.stem
    for old_page in OUT.glob(source.stem + '-*.png'):
        if re.fullmatch(re.escape(source.stem) + r'-\d+\.png', old_page.name):
            old_page.unlink()
    subprocess.run([POPLER, '-r', '150', '-png', str(source), str(render_prefix)], check=True, capture_output=True)
    rendered = sorted([page for page in OUT.glob(source.stem + '-*.png') if re.fullmatch(re.escape(source.stem) + r'-\d+\.png', page.name)], key=lambda page: int(page.stem.rsplit('-', 1)[-1]))
    assert len(rendered) == len(reader.pages)
    logo_images[0].image.save(OUT / (source.stem + '-embedded-logo.png'))
    reports.append({
        'filename': source.name,
        'pages': len(reader.pages),
        'first_page_image_count': len(images),
        'embedded_master_size': list(logo_images[0].image.size),
        'embedded_rgb_pixels_match': True,
        'logo_size_mm': [expected_side_mm, expected_side_mm],
        'placed_image_counts_by_page': [len(page_placements) for page_placements in placements],
        'page_numbers_confirmed': True,
        'rendered_pages': [str(page) for page in rendered],
        'text': text,
    })
result = {'logo':manifest['logo'],'fixtureOnly':True,'documents':reports,'automatedResult':'passed','visualInspectionRecord':'visual-inspection.json'}
(OUT / 'inspection.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({key:value for key,value in result.items() if key!='documents'}, ensure_ascii=False, indent=2))
print(json.dumps([{key:value for key,value in report.items() if key!='text'} for report in reports], ensure_ascii=False, indent=2))
