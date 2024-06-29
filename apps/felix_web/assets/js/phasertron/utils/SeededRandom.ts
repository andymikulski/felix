// Constants for the LCG algorithm
const a = 1664525;
const c = 1013904223;
const m = Math.pow(2, 32);

export default class SeededRandom {
  constructor(private seed: number) {}

  next() {
    // Update the seed
    this.seed = (a * this.seed + c) % m;
    // Return a float in [0, 1)
    return this.seed / m;
  }
}
