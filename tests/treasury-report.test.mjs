import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { generateTreasuryReport, reportTotals } from '../src/lib/treasury-report.ts';
const entry = { id: 'fixture-entry', fund_id: 'fixture-fund', kind: 'income', status: 'confirmed', occurred_on: '2025-04-01', person_name: 'PESSOA FICTÍCIA - TESTE', description: 'Documento exclusivo para teste automatizado. Pix dividido entre camisa, mensalidade e per capita.', amount_cents: 10010, shirt_cents: 6000, monthly_fee_cents: 3010, per_capita_cents: 1000, balance_after_cents: 15010 };
const attachment = { id:'fixture-attachment', entry_id:entry.id, path:'test.pdf',filename:'COMPROVANTE FICTÍCIO.pdf', mime_type:'application/pdf' };
const report = { year:2025, funds:[{id:entry.fund_id,name:'SOCIEDADE FICTÍCIA PARA TESTE',abbreviation:'TESTE'}], opening_cents:5000,reserved_cents:1000,pending_count:2,entries:[entry],attachments:[attachment] };
test('report accounts for carry-forward and reserves without counting allocations twice',()=>{
 assert.deepEqual(reportTotals(report),{income:10010,expense:0,closing:15010,available:14010});
 assert.throws(()=>reportTotals({...report,entries:[{...entry,status:'pending'}]}),/confirmados/);
});
test('PDF reports render actual ledger and annual copies every source PDF page and image',async()=>{
 const source=await PDFDocument.create(); source.addPage(); source.addPage(); const bytes=await source.save();
 const normal=await generateTreasuryReport(report,{generatedAt:new Date('2025-12-31T12:00:00Z')});
 const annual=await generateTreasuryReport(report,{annual:true,loadAttachment:async()=>bytes,generatedAt:new Date('2025-12-31T12:00:00Z')});
 assert.equal(new TextDecoder().decode(normal.subarray(0,5)),'%PDF-');
 const normalDoc=await PDFDocument.load(normal); const annualDoc=await PDFDocument.load(annual);
 assert.ok(annualDoc.getPageCount()>=normalDoc.getPageCount()+3);
 mkdirSync('tmp/pdfs',{recursive:true});writeFileSync('tmp/pdfs/tesouraria-teste-relatorio.pdf',normal);writeFileSync('tmp/pdfs/tesouraria-teste-anual.pdf',annual);
 const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64'));
 const withImage=await generateTreasuryReport({...report,attachments:[{...attachment,mime_type:'image/png',filename:'TESTE.png'}]},{annual:true,loadAttachment:async()=>png});
 assert.ok((await PDFDocument.load(withImage)).getPageCount()>=normalDoc.getPageCount()+2);
});
test('annual report fails explicitly for missing, unreadable or unlinked attachments',async()=>{
 await assert.rejects(()=>generateTreasuryReport(report,{annual:true}),/comprovantes/);
 await assert.rejects(()=>generateTreasuryReport(report,{annual:true,loadAttachment:async()=>{throw new Error('Arquivo indisponível');}}),/indisponível/);
 await assert.rejects(()=>generateTreasuryReport(report,{annual:true,loadAttachment:async()=>new Uint8Array([1,2,3])}),/incorporar/);
 await assert.rejects(()=>generateTreasuryReport({...report,attachments:[{...attachment,entry_id:'outro'}]},{annual:true,loadAttachment:async()=>new Uint8Array()}),/sem lançamento/);
});
test('long entries paginate instead of clipping and totals do not depend on statement page',async()=>{
 const long={...entry,description:'Texto de teste com acentos, valores e composição. '.repeat(10),person_name:'Pessoa fictícia para teste de quebra de linha '.repeat(2)};
 const bytes=await generateTreasuryReport({...report,entries:Array.from({length:1005},(_,i)=>({...long,id:`fixture-${i}`,balance_after_cents:5000+(i+1)*10010})),attachments:[]});
 assert.ok((await PDFDocument.load(bytes)).getPageCount()>50);
});
