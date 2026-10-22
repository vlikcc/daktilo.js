// Türkçe Q klavye; satırlar yarım tuş kaydırmalı olduğundan komşular (r±1, c) ve çapraz (r-1, c+1) / (r+1, c-1).
const ROWS = ['qwertyuıopğü', 'asdfghjklşi', 'zxcvbnmöç'];
const NEIGHBORS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [-1, 1],
  [1, -1],
  [1, 0],
] as const;

/** Klavyede verilen harfe komşu rastgele bir tuş döndürür (büyük/küçük harf korunur). */
export function neighborKey(char: string, rand: () => number = Math.random): string {
  const lower = char.toLowerCase();
  const pool: string[] = [];
  ROWS.forEach((row, r) => {
    const c = row.indexOf(lower);
    if (c < 0) return;
    for (const [dr, dc] of NEIGHBORS) {
      const key = ROWS[r + dr]?.[c + dc];
      if (key) pool.push(key);
    }
  });
  const keys = pool.length ? pool : ROWS[1].split('');
  const pick = keys[Math.floor(rand() * keys.length)];
  return char === lower ? pick : pick.toUpperCase();
}
