import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deliverPdf } from '../src/lib/pdfDelivery.mjs';
import { textRedactions } from '../src/lib/textRedactions.mjs';
import { readFileSync } from 'node:fs';
const { detectPII, anonymizeText } = await import('data:text/javascript;base64,' + Buffer.from(readFileSync(new URL('../src/lib/detectors.js', import.meta.url))).toString('base64'));

test('Android saves through the system picker and reports actual completion', async () => {
  let input;
  const result = await deliverPdf({ output: () => 'data:application/pdf;base64,JVBERi0=' }, 'doc.pdf', {
    saveDocument: { savePdf: async (data) => { input = data; return { saved: true }; } },
  });
  assert.deepEqual(input, { data: 'JVBERi0=' });
  assert.equal(result, 'saved');
});
test('Android picker cancellation never reports that a file was saved', async () => {
  assert.equal(await deliverPdf({ output: () => 'data:application/pdf;base64,YQ==' }, 'doc.pdf', {
    saveDocument: { savePdf: async () => ({ saved: false }) },
  }), 'cancelled');
});

test('native PDF writes binary base64 and shares the actual local file URI', async () => {
  const events = [];
  const pdf = { output: () => 'data:application/pdf;base64,JVBERi0xLjQ=', save: () => assert.fail('browser download used') };
  const result = await deliverPdf(pdf, 'document.pdf', {
    cacheDirectory: 'CACHE',
    filesystem: { writeFile: async (options) => { events.push(options); return { uri: 'file:///cache/document.pdf' }; } },
    share: { share: async (options) => events.push(options) },
  });
  assert.equal(result, 'share');
  assert.equal(events[0].data, 'JVBERi0xLjQ=');
  assert.equal(events[0].directory, 'CACHE');
  assert.equal(events[0].encoding, undefined);
  assert.deepEqual(events[1].files, ['file:///cache/document.pdf']);
});
test('write failure never opens sharing or reports success', async () => {
  await assert.rejects(deliverPdf({ output: () => 'data:application/pdf;base64,YQ==' }, 'doc.pdf', {
    filesystem: { writeFile: async () => { throw new Error('disk full'); } },
    share: { share: () => assert.fail('must not share') },
  }), /disk full/);
});
test('cancellation is propagated without false download success', async () => {
  await assert.rejects(deliverPdf({ output: () => 'data:application/pdf;base64,YQ==' }, 'doc.pdf', {
    filesystem: { writeFile: async () => ({ uri: 'file:///cache/doc.pdf' }) },
    share: { share: async () => { throw new Error('cancelled'); } },
  }), /cancelled/);
});
test('browser waits for jsPDF save', async () => {
  let called = false;
  assert.equal(await deliverPdf({ save: async (name, options) => { assert.equal(name, 'doc.pdf'); assert.equal(options.returnPromise, true); called = true; } }, 'doc.pdf'), 'download');
  assert.ok(called);
});
test('copy masks repeated values and manual zones using page geometry', () => {
  const words = [0, 1, 2].map((i) => ({ str: 'Person', x: 10, y: i * 30, w: 60, h: 10 }));
  const offsets = words.map((_, i) => ({ pageIndex: 0, wordIndex: i, start: i * 7, end: i * 7 + 6 }));
  const boxes = words.map(({ x, y, w, h }) => ({ x, y, w, h }));
  const redactions = textRedactions([{ words }], offsets, new Map([[0, [
    { value: 'Person', category: 'identity', boxes: boxes.slice(0, 2) },
    { value: '(manuel)', category: 'other', boxes: boxes.slice(2) },
  ]]]));
  assert.equal(anonymizeText('Person Person Person', redactions), '[IDENTITÉ] [IDENTITÉ] [INFO]');
});
test('fictional lab header names, street addresses and repeated IDs are detected', () => {
  const text = 'Patient\nDUPONT, Marie anne\nAvenue des Lilas 42\nN° de client 123456\nVio-N° 9.876.543\nDUPONT, Marie anne\nN° demande 001/54.321.987\nHémoglobine 129\n0.401\nMCV 97';
  const cleaned = anonymizeText(text, detectPII(text));
  for (const sensitive of ['DUPONT', 'Lilas', '123456', '9.876.543', '54.321.987']) assert.ok(!cleaned.includes(sensitive), sensitive);
  assert.ok(cleaned.includes('Hémoglobine 129'));
  assert.ok(cleaned.includes('0.401'));
  assert.ok(cleaned.includes('MCV 97'));
});
