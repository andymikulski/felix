export default class SpringMath {
  private constructor() {}

  public static HalflifeToDamping(halflife: number): number {
    return (4 * 0.69314718056) / (halflife + 1e-5);
  }

  public static DampingRatioToStiffness(
    ratio: number,
    damping: number
  ): number {
    return this.Square(damping / (ratio * 2));
  }

  public static Square(val: number): number {
    return val * val;
  }

  public static FastNegExp(x: number): number {
    return 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  }

  // public static Sign(val: number) {
  //   const sign = Math.sign(val);
  //   return (sign === 0 ? 1 : sign) * Math.abs(val);
  // }

  public static Copysign(a: number, b: number): number {
    if (b <= 0.01 && b >= -0.01) {
      return 0;
    }

    return Math.abs(a) * Math.sign(b); // this.Sign(b);
  }

  public static FastAtan(x: number): number {
    var z = Math.abs(x);
    var w = z > 1 ? 1 / z : z;
    var y = (Math.PI / 4) * w - w * (w - 1) * (0.2447 + 0.0663 * w);
    return this.Copysign(z > 1 ? Math.PI / 2 - y : y, x);
  }
}
