// Tesseract v6/v7 returns word geometry inside blocks, when explicitly requested.
export function extractWords(data) {
  const raw = data.words || (data.blocks || []).flatMap(block =>
    (block.paragraphs || []).flatMap(paragraph =>
      (paragraph.lines || []).flatMap(line => line.words || [])));
  return raw.filter(word => word.text?.trim() && word.bbox &&
    [word.bbox.x0, word.bbox.y0, word.bbox.x1, word.bbox.y1].every(Number.isFinite) &&
    word.bbox.x1 > word.bbox.x0 && word.bbox.y1 > word.bbox.y0)
    .map(word => ({ str: word.text, x: word.bbox.x0, y: word.bbox.y0,
      w: word.bbox.x1 - word.bbox.x0, h: word.bbox.y1 - word.bbox.y0 }));
}

function resultFrom(data) {
  return { text: data.text || '', words: extractWords(data), confidence: data.confidence || 0 };
}

export async function recognizePage(worker, canvas) {
  await worker.setParameters({ tessedit_pageseg_mode: '3', user_defined_dpi: '300' });
  let best = resultFrom((await worker.recognize(canvas, {}, { text: true, blocks: true })).data);
  // Sparse mode handles short certificates, separated headers and signatures.
  if (best.words.length < 25 || best.confidence < 65) {
    await worker.setParameters({ tessedit_pageseg_mode: '11' });
    const retry = resultFrom((await worker.recognize(canvas, {}, { text: true, blocks: true })).data);
    // Prefer recovered coverage, provided the alternative is not much noisier.
    if ((!best.words.length && retry.words.length) ||
        (retry.words.length > best.words.length && retry.confidence >= best.confidence - 10) ||
        (retry.words.length >= best.words.length && retry.confidence > best.confidence)) best = retry;
  }
  return best;
}
