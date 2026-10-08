// Use the same word geometry as the PDF, including manually selected zones.
export function textRedactions(pages, offsets, activeByPage) {
  const result = [];
  for (const [pageIndex, detections] of activeByPage) {
    for (const detection of detections) {
      const hits = offsets.filter((offset) => {
        if (offset.pageIndex !== pageIndex) return false;
        const word = pages[pageIndex]?.words[offset.wordIndex];
        return word && (detection.boxes || []).some((box) =>
          word.x < box.x + box.w && word.x + word.w > box.x &&
          word.y < box.y + box.h && word.y + word.h > box.y);
      });
      let range;
      let lastWord = -2;
      for (const hit of hits) {
        if (range && hit.wordIndex === lastWord + 1 && Math.abs(pages[pageIndex].words[hit.wordIndex].y - pages[pageIndex].words[lastWord].y) < pages[pageIndex].words[hit.wordIndex].h * 0.8) range.end = hit.end;
        else {
          range = { ...detection, start: hit.start, end: hit.end };
          result.push(range);
        }
        lastWord = hit.wordIndex;
      }
    }
  }
  return result;
}
