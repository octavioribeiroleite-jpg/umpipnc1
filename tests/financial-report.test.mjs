import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { generateFinancialReportPdf } from '../src/components/financas/financialReportPdf.ts';

const fixture = {
  id: 'fixture-only', description: 'COMPROVANTE FICTÍCIO', amount: 1,
  date: '2025-01-01', type: 'saida', category_id: null,
  category_name: 'TESTE ISOLADO', category_color: '#168052',
  receipt_url: 'fixture-only/receipt.pdf',
};
const input = (receipts = []) => ({
  selectedYear: '2025',
  chargeStats: { total: 0, pago: 0, pendente: 0, isento: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 },
  monthlyData: [], categoryData: [], receitasTransactions: [], despesasTransactions: receipts,
  despesasComComprovante: receipts, totalReceitas: 0, totalDespesas: receipts.length,
  saldo: -receipts.length, adimplenciaRate: 0,
  getSignedUrl: async () => 'https://fixture.invalid/receipt.pdf',
});

// Exercise the real PDF renderer while intercepting its only download boundary.
// No backend, browser, real receipt or filesystem download is used.
async function isolated(work, { fetch, readError = false } = {}) {
  const saved = [];
  const originalSave = jsPDF.API.save;
  const originalFetch = globalThis.fetch;
  const originalReader = globalThis.FileReader;
  jsPDF.API.save = function (filename) {
    saved.push({ filename, bytes: this.output('arraybuffer') });
    return this;
  };
  globalThis.fetch = fetch ?? (async () => { throw new Error('Network is forbidden in this fixture.'); });
  globalThis.FileReader = class {
    readAsDataURL(blob) {
      if (readError) return queueMicrotask(() => this.onerror?.(new Error('Fixture read failure')));
      blob.arrayBuffer().then(bytes => {
        this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`;
        this.onload?.();
      }, error => this.onerror?.(error));
    }
  };
  try { return await work(saved); }
  finally {
    if (originalSave === undefined) delete jsPDF.API.save;
    else jsPDF.API.save = originalSave;
    globalThis.fetch = originalFetch;
    if (originalReader === undefined) delete globalThis.FileReader;
    else globalThis.FileReader = originalReader;
  }
}

async function rejectsWithoutDownload(settings, options) {
  return isolated(async saved => {
    await assert.rejects(() => generateFinancialReportPdf(settings), error => {
      assert.match(error.message, /comprovante/i);
      assert.match(error.message, /PDF.*não.*baixado/i);
      assert.doesNotMatch(error.message, /fixture-only|fixture\.invalid|COMPROVANTE FICTÍCIO|secret/i);
      return true;
    });
    assert.equal(saved.length, 0);
  }, options);
}

test('legacy financial report without receipts renders and downloads one valid PDF', async () => {
  await isolated(async saved => {
    await generateFinancialReportPdf(input());
    assert.equal(saved.length, 1);
    assert.equal(saved[0].filename, 'Relatorio_Financeiro_2025.pdf');
    assert.ok((await PDFDocument.load(saved[0].bytes)).getPageCount() > 0);
  });
});

test('legacy PDF receipt keeps its existing signed-link policy without fetching PDF bytes', async () => {
  let signed = 0;
  await isolated(async saved => {
    await generateFinancialReportPdf({ ...input([fixture]), getSignedUrl: async () => { signed++; return 'https://fixture.invalid/receipt.pdf'; } });
    assert.equal(saved.length, 1);
    assert.ok(signed > 0);
    assert.match(Buffer.from(saved[0].bytes).toString('latin1'), /https:\/\/fixture\.invalid\/receipt\.pdf/);
  });
});

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==', 'base64');
test('legacy image receipt still embeds valid image bytes and downloads one PDF', async () => {
  await isolated(async saved => {
    await generateFinancialReportPdf(input([{ ...fixture, receipt_url: 'fixture-only/receipt.png' }]));
    assert.equal(saved.length, 1);
    const document = await PDFDocument.load(saved[0].bytes);
    assert.ok(document.context.enumerateIndirectObjects().some(([, object]) =>
      object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')));
  }, { fetch: async () => new Response(png, { headers: { 'Content-Type': 'image/png' } }) });
});

test('legacy report rejects unavailable signed receipt links without download or sensitive error details', async () => {
  await rejectsWithoutDownload({ ...input([fixture]), getSignedUrl: async () => { throw new Error('secret fixture-only URL'); } });
});

test('legacy report rejects a receipt link failure during the annex pass without download', async () => {
  let attempts = 0;
  await rejectsWithoutDownload({ ...input([fixture]), getSignedUrl: async () => {
    if (++attempts === 3) throw new Error('secret fixture-only late failure');
    return 'https://fixture.invalid/receipt.pdf';
  } });
  assert.equal(attempts, 3);
});

test('legacy report rejects a failed image download without saving a partial PDF', async () => {
  await rejectsWithoutDownload(input([{ ...fixture, receipt_url: 'fixture-only/receipt.png' }]), { fetch: async () => new Response('', { status: 403 }) });
});

test('legacy report rejects corrupt image bytes without saving a partial PDF', async () => {
  await rejectsWithoutDownload(input([{ ...fixture, receipt_url: 'fixture-only/receipt.png' }]), { fetch: async () => new Response('invalid fixture image', { headers: { 'Content-Type': 'image/png' } }) });
});

test('legacy report rejects unreadable image bytes without saving a partial PDF', async () => {
  await rejectsWithoutDownload(input([{ ...fixture, receipt_url: 'fixture-only/receipt.png' }]), {
    fetch: async () => new Response(png, { headers: { 'Content-Type': 'image/png' } }), readError: true,
  });
});
