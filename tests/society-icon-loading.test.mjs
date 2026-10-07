import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createImagePreloader } from '../src/lib/preload-images.ts';

const asset = { src: '/icons/saf-192.webp', srcSet: '/icons/saf-96.webp 96w, /icons/saf-192.webp 192w', sizes: '(max-width: 479px) 3.5rem, 4.75rem' };
function fixture() {
  const created = [], selected = [];
  const preload = createImagePreloader(() => {
    const image = { decode: async () => { image.decoded = true; }, set src(value) { selected.push({ src: value, srcSet: this.srcset, sizes: this.sizes, priority: this.fetchPriority }); } };
    created.push(image); return image;
  });
  return { preload, created, selected };
}

test('responsive warmup selects the same resource as the card before setting src, without duplicate requests', async () => {
  const f = fixture(); f.preload([asset]); f.preload([asset]);
  assert.equal(f.created.length, 1);
  assert.deepEqual(f.selected, [{ src: asset.src, srcSet: asset.srcSet, sizes: asset.sizes, priority: 'low' }]);
  assert.equal(f.created[0].decoding, 'async');
  f.created[0].onload(); await Promise.resolve();
  assert.equal(f.created[0].decoded, true);
});

test('a failed warmup can retry without discarding other successful icons or a later retry', () => {
  const f = fixture(), other = { ...asset, srcSet: '/icons/ucp-192.webp 192w' };
  f.preload([asset, other]); f.created[0].onerror(); f.preload([asset, other]);
  assert.equal(f.created.length, 3);
  f.created[0].onerror(); f.preload([asset]);
  assert.equal(f.created.length, 3, 'An old error must not erase the replacement');
});

test('async decode failure never rejects the entry flow or forces another download', async () => {
  const f = fixture(); f.preload([asset]);
  f.created[0].decode = () => Promise.reject(new Error('Synthetic decode failure'));
  f.created[0].onload(); await Promise.resolve(); await Promise.resolve();
  f.preload([asset]); assert.equal(f.created.length, 1);
});

test('responsive society copies retain approved masters and a lower transfer budget at every density', () => {
  const folder = new URL('../src/assets/societies/', import.meta.url);
  const metadata = JSON.parse(readFileSync(new URL('optimized/metadata.json', folder)));
  assert.deepEqual(Object.keys(metadata.icons).sort(), ['pastor', 'saf', 'ucp', 'ump', 'upa', 'uph']);
  const totals = { 96: 0, 192: 0, 256: 0, 384: 0 }; let original = 0;
  for (const [slug, icon] of Object.entries(metadata.icons)) {
    const master = readFileSync(new URL(`${slug}.png`, folder));
    assert.equal(createHash('sha256').update(master).digest('hex'), icon.master_sha256);
    original += master.length;
    for (const [size, copy] of Object.entries(icon.copies)) {
      const encoded = readFileSync(new URL(`optimized/${copy.file}`, folder));
      assert.equal(encoded.subarray(0, 4).toString(), 'RIFF');
      assert.equal(encoded.subarray(8, 12).toString(), 'WEBP');
      assert.equal(encoded.length, copy.bytes);
      assert.equal(createHash('sha256').update(encoded).digest('hex'), copy.sha256);
      totals[size] += encoded.length;
    }
  }
  assert.ok(totals[96] < original * 0.1, 'Desktop 1x icons should transfer less than 10% of the original set');
  assert.ok(totals[192] < original * 0.25, 'Mobile 3x icons should transfer less than 25% of the original set');
  assert.ok(totals[256] < original * 0.4);
  assert.ok(totals[384] < original * 0.7, 'Full-resolution fallback should still be lighter');
});
