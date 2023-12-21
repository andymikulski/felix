export interface ICurve2D {
  getIndex(x: number, y: number): number;
  getXY(z: number): {
    x: number;
    y: number;
  };
}

export class ZOrderCurve implements ICurve2D {
  private bits: number = 2;
  constructor(
    private width: number,
    private height: number
  ) {
    this.bits = Math.ceil(Math.log2(width * height));
  }

  public static getIndex(x: number, y: number, bits: number) {
    // Interleave the bits of x and y
    var z = 0;
    for (var i = 0; i < bits; i++) {
      z |= ((x & (1 << i)) << i) | ((y & (1 << i)) << (i + 1));
    }
    return z;
  }

  public static getXY(z: number, bits: number) {
    var x = 0,
      y = 0;
    for (var i = 0; i < bits; i++) {
      x |= (z & (1 << (2 * i))) >> i;
      y |= (z & (1 << (2 * i + 1))) >> (i + 1);
    }
    return {
      x: x,
      y: y,
    };
  }

  public getIndex(x: number, y: number) {
    return ZOrderCurve.getIndex(x, y, this.bits);
  }

  public getXY(z: number) {
    return ZOrderCurve.getXY(z, this.bits);
  }
}
