import { Vector2Like } from './springs/Vector2Spring';

/**
 * Generates a list of points that are generally evenly distributed, similar to poisson-disk.
 * The difference is that this algorithm is deterministic, so it will always generate the same
 * points given the same inputs.
 *
 * Usage example:
```
const noise = new HaltonSequence2D();
const screenWidth = 500;
const screenHeight = 500;

// You can use `next` to pull new values from the sequence
for (let i = 0; i < numDotsToDisplay; i++) {
  const rand = noise.next();
  const x = rand.x * screenWidth;
  const y = rand.y * screenHeight;
  // place something at (x, y)
}

// You can also use `take` which will provide a queryable list
for(const rand of noise.take(numDotsToDisplay)) {
  const x = rand.x * screenWidth;
  const y = rand.y * screenHeight;
  // do something with (x, y)
};
```
 */

/**
 * Halton sequences are deterministic, quasi-random algorithms that appear to be 'dispersed' enough
 * that they can serve as alternatives to Perlin or Simplex noise.
 *
 * This is the 1D variant, returning float values between 0 and 1, exclusive.
 */
export class HaltonSequence implements Iterable<number> {
  private n: number = 0;
  private d: number = 1;
  private readonly base: number;

  constructor(base: number = 2) {
    this.base = base;
  }

  public next(): number {
    const x = this.d - this.n;
    let y: number;
    if (x === 1) {
      this.n = 1;
      this.d *= this.base;
    } else {
      y = Math.floor(this.d / this.base);
      while (x <= y) {
        y = Math.floor(y / this.base);
      }
      this.n = (this.base + 1) * y - x;
    }
    return this.n / this.d;
  }

  public take(count: number): number[] {
    const values: number[] = [];
    for (let i = 0; i < count; i++) {
      values.push(this.next());
    }
    return values;
  }

  public [Symbol.iterator](): IterableIterator<number> {
    const generator = function* (sequence: HaltonSequence) {
      while (true) {
        yield sequence.next();
      }
    };
    return generator(this);
  }
}

/**
 * Halton sequences are deterministic, quasi-random algorithms that appear to be 'dispersed' enough
 * that they can serve as alternatives to Perlin or Simplex noise.
 *
 * This is the 2D variant, returning a Vector2-like object with x/y values between 0 and 1, exclusive.
 */
export class HaltonSequence2D implements Iterable<Vector2Like> {
  private readonly sequenceX: HaltonSequence;
  private readonly sequenceY: HaltonSequence;

  constructor(baseX: number = 2, baseY: number = 3) {
    this.sequenceX = new HaltonSequence(baseX);
    this.sequenceY = new HaltonSequence(baseY);
  }

  public next(): {
    x: number;
    y: number;
  } {
    return {
      x: this.sequenceX.next(),
      y: this.sequenceY.next(),
    };
  }

  public take(count: number): Vector2Like[] {
    const values: Vector2Like[] = [];
    for (let i = 0; i < count; i++) {
      values.push(this.next());
    }
    return values;
  }

  public [Symbol.iterator](): IterableIterator<Vector2Like> {
    const generator = function* (sequence: HaltonSequence2D) {
      while (true) {
        yield sequence.next();
      }
    };
    return generator(this);
  }
}
