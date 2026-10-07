export interface Scored<T> {
  item: T;
  score: number;
}

export const norm = (v: ArrayLike<number>): number => {
  let sum = 0;
  for (let i = 0; i < v.length; i += 1) sum += v[i] * v[i];
  return Math.sqrt(sum);
};

// Similaridade do cosseno entre dois vetores (-1 a 1). Vetor zerado = 0.
export const cosine = (
  a: ArrayLike<number>,
  b: ArrayLike<number>,
  normA = norm(a),
  normB = norm(b)
): number => {
  if (a.length !== b.length || normA === 0 || normB === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return dot / (normA * normB);
};

// Os `k` itens mais parecidos com a consulta, do melhor para o pior, ja
// descartando os abaixo do limite minimo.
export const topK = <T extends { vector: ArrayLike<number>; norm: number }>(
  query: ArrayLike<number>,
  items: T[],
  k: number,
  minScore: number
): Scored<T>[] => {
  const qn = norm(query);
  return items
    .map(item => ({ item, score: cosine(query, item.vector, qn, item.norm) }))
    .filter(s => s.score >= minScore)
    .sort((x, y) => y.score - x.score)
    .slice(0, k);
};
