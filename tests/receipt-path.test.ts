import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receiptPath, receiptReference } from '../src/lib/receipt-path.ts';

test('canonical references retain a stable object path', () => {
  assert.equal(receiptReference('gastos/abc.pdf'), 'storage://receipts/gastos/abc.pdf');
  assert.equal(receiptPath('storage://receipts/gastos/abc.pdf'), 'gastos/abc.pdf');
});

test('legacy and signed URLs resolve locally without keeping tokens or old hosts', () => {
  for (const mode of ['public', 'sign', 'authenticated']) {
    assert.equal(receiptPath(`https://old.supabase.co/storage/v1/object/${mode}/receipts/gastos/a%20b.pdf?token=old`), 'gastos/a b.pdf');
  }
});

test('malformed, foreign and traversal references are rejected', () => {
  for (const value of ['', '/file', '../file', 'gastos/../file', 'a//b', 'a\\b', 'a?token=x', 'javascript:alert(1)', 'https://example.com/file.pdf', 'https://old.supabase.co/storage/v1/object/public/election-photos/file.png']) {
    assert.throws(() => receiptPath(value));
  }
});
