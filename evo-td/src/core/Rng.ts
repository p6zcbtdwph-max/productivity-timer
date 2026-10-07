/**
 * Deterministischer Zufallsgenerator (mulberry32).
 * Deterministisch, damit Replays/Tests reproduzierbar sind und der Seed
 * mit dem Spielstand gespeichert werden kann.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Gleichverteilte Zahl in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Ganzzahl in [min, max] (inklusive). */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Wahr mit Wahrscheinlichkeit p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Zufälliges Element eines nicht-leeren Arrays. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: leeres Array');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  getState(): number {
    return this.state;
  }

  setState(state: number): void {
    this.state = state >>> 0;
  }
}
