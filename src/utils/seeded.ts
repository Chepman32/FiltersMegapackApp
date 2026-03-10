/* eslint-disable no-bitwise */
export function seededRandom(seed: number): number {
  let value = seed + 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function seededRange(
  seed: number,
  min: number,
  max: number,
  precision = 3,
): number {
  const n = min + (max - min) * seededRandom(seed);
  const p = 10 ** precision;
  return Math.round(n * p) / p;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
