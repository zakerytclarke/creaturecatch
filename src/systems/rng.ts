// Small, seedable PRNG (mulberry32). Deterministic given a seed, which makes the
// battle/catch/spawn systems unit-testable.
export class RNG {
  private state: number;

  constructor(seed = (Math.random() * 2 ** 32) >>> 0) {
    this.state = seed >>> 0;
  }

  // Returns a float in [0, 1).
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Integer in [min, max] inclusive.
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  // Float in [min, max).
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// A shared instance for gameplay (non-deterministic). Systems accept an RNG for testing.
export const gameRng = new RNG();

// Deterministic 32-bit hash of a string, handy for stable per-species variation.
export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
