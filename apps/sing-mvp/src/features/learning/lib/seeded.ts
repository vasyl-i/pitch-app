/**
 * Tiny deterministic PRNG. Lesson generation and weekly-focus selection need
 * variety ("no two lessons identical") without losing determinism — the same
 * inputs must always produce the same lesson, so everything random is seeded
 * from stable facts (day key, streak, week key).
 */

/** FNV-1a 32-bit hash of a string → PRNG seed. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: fast, decent-quality 32-bit PRNG. Returns values in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickSeeded<T>(items: readonly T[], rand: () => number): T {
  return items[Math.floor(rand() * items.length)];
}
