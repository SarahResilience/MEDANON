import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractWords, recognizePage } from '../src/lib/ocrEngine.mjs';
const word = { text: 'Certificat', bbox: { x0: 10, y0: 20, x1: 100, y1: 40 } };
const blocks = [{ paragraphs: [{ lines: [{ words: [word] }] }] }];
test('v7 block geometry is available for redaction', () => {
  assert.deepEqual(extractWords({ blocks }), [{ str: 'Certificat', x: 10, y: 20, w: 90, h: 20 }]);
});
test('invalid geometry is rejected', () => {
  assert.deepEqual(extractWords({ words: [{ ...word, bbox: { x0: NaN } }] }), []);
});
test('sparse certificate retry requests blocks and recovers text', async () => {
  const modes = []; let calls = 0;
  const worker = {
    setParameters: async p => modes.push(p.tessedit_pageseg_mode),
    recognize: async (canvas, options, output) => {
      assert.equal(output.blocks, true);
      return { data: ++calls === 1 ? { text: '', confidence: 0 } : { text: 'Certificat', confidence: 90, blocks } };
    },
  };
  const result = await recognizePage(worker, {});
  assert.equal(result.words.length, 1);
  assert.equal(result.text, 'Certificat');
  assert.deepEqual(modes, ['3', '11']);
});
test('good full-page recognition avoids redundant retry', async () => {
  let calls = 0;
  const worker = { setParameters: async () => {}, recognize: async () => {
    calls++; return { data: { words: Array(30).fill(word), confidence: 90, text: 'Report' } };
  } };
  await recognizePage(worker, {});
  assert.equal(calls, 1);
});
