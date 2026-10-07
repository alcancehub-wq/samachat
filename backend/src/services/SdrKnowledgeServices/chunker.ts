export const MAX_CHUNK_CHARS = 900;
export const CHUNK_OVERLAP_CHARS = 120;

// Parte o texto em trechos de ate `maxChars`, respeitando paragrafos e frases.
// Cada trecho novo recomeca com o final do anterior (`overlap`), para uma
// informacao que cai na fronteira nao se perder.
export const splitIntoChunks = (
  text: string,
  maxChars = MAX_CHUNK_CHARS,
  overlap = CHUNK_OVERLAP_CHARS
): string[] => {
  const clean = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  // 1) unidades pequenas: paragrafos; paragrafo longo vira frases; frase
  // longissima vira fatias duras.
  const units: string[] = [];
  clean.split(/\n{2,}/).forEach(paragraph => {
    const p = paragraph.trim();
    if (!p) return;
    if (p.length <= maxChars) {
      units.push(p);
      return;
    }
    const sentences = p.match(/[^.!?\n]+[.!?]*\s*/g) || [p];
    sentences.forEach(sentence => {
      const s = sentence.trim();
      if (!s) return;
      for (let i = 0; i < s.length; i += maxChars) {
        units.push(s.slice(i, i + maxChars));
      }
    });
  });

  // 2) junta unidades ate encher o trecho.
  const chunks: string[] = [];
  let current = "";
  units.forEach(unit => {
    if (!current) {
      current = unit;
    } else if (current.length + 2 + unit.length <= maxChars) {
      current += `\n\n${unit}`;
    } else {
      chunks.push(current);
      current = unit;
    }
  });
  if (current) chunks.push(current);

  // 3) sobreposicao: cada trecho (menos o primeiro) comeca com o fim do anterior,
  // cortado no inicio de uma palavra.
  if (overlap <= 0 || chunks.length < 2) return chunks;
  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const tail = chunks[i - 1].slice(-overlap);
    const firstSpace = tail.indexOf(" ");
    const trimmed = firstSpace > 0 && firstSpace < tail.length - 1 ? tail.slice(firstSpace + 1) : tail;
    return `${trimmed}\n\n${chunk}`;
  });
};
