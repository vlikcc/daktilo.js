/** Türkçe Q klavyenin harf satırları (varsayılan düzen). */
export const TURKISH_Q: readonly string[] = ['qwertyuıopğü', 'asdfghjklşi', 'zxcvbnmöç'];

// Satırlar yarım tuş kaydırmalı olduğundan komşular (r±1, c) ve çapraz (r-1, c+1) / (r+1, c-1).
const NEIGHBORS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [-1, 1],
  [1, -1],
  [1, 0],
] as const;

/** Klavyede verilen harfe komşu rastgele bir tuş döndürür (büyük/küçük harf korunur). */
export function neighborKey(
  char: string,
  rows: readonly string[] = TURKISH_Q,
  rand: () => number = Math.random,
): string {
  const lower = char.toLowerCase();
  const pool: string[] = [];
  rows.forEach((row, r) => {
    const c = row.indexOf(lower);
    if (c < 0) return;
    for (const [dr, dc] of NEIGHBORS) {
      const key = rows[r + dr]?.[c + dc];
      if (key) pool.push(key);
    }
  });
  const keys = pool.length ? pool : Array.from(rows[1] ?? rows[0] ?? char);
  const pick = keys[Math.floor(rand() * keys.length)];
  return char === lower ? pick : pick.toUpperCase();
}
