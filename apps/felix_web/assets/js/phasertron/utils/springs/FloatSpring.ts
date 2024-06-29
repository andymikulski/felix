import { ISpring } from './ISpring';
import SpringMath from './SpringMath';

export default class FloatSpring implements ISpring<number> {
  private halflife: number;
  private dampingRatio: number;

  private _value: number = 0;
  public get Value(): number {
    return this._value;
  }
  private set Value(value: number) {
    this._value = value;
  }

  private _goalValue: number = 0;
  public get GoalValue(): number {
    return this._goalValue;
  }
  private set GoalValue(value: number) {
    this._goalValue = value;
  }

  public get GoalVelocity(): number {
    return 0;
  }

  public setDamping = (value: number) => {
    this.dampingRatio = value;
  };

  public setHalfLife = (value: number) => {
    this.halflife = value;
  };

  public Velocity: number = 0;

  constructor(halflife: number = 1, dampingRatio: number = 0.5) {
    this.halflife = halflife;
    this.dampingRatio = dampingRatio;
  }

  public setGoal(target: number): void {
    this.GoalValue = target;
  }

  public setValue(value: number): void {
    this.Value = value;
    this.Velocity = 0;
  }

  public update(deltaTimeSec: number): number {
    const result = FloatSpring.spring_damper_exact_ratio(
      this.Value,
      this.Velocity,
      this.GoalValue,
      0,
      this.dampingRatio,
      this.halflife,
      deltaTimeSec
    );

    this.Value = result.x;
    this.Velocity = result.y;

    return result.x;
  }

  public predict(timeSec: number): number {
    const result = FloatSpring.spring_damper_exact_ratio(
      this.Value,
      this.Velocity,
      this.GoalValue,
      0,
      this.dampingRatio,
      this.halflife,
      timeSec
    );

    return result.x;
  }

  private static spring_damper_exact_ratio(
    x: number,
    v: number,
    xGoal: number,
    vGoal: number,
    dampingRatio: number,
    halflife: number,
    dt: number,
    eps: number = 1e-5
  ): {
    x: number;
    y: number;
  } {
    const d = SpringMath.HalflifeToDamping(halflife);
    const s = SpringMath.DampingRatioToStiffness(dampingRatio, d);
    const c = xGoal + (d * vGoal) / (s + eps);
    const y = d / 2;

    if (Math.abs(s - (d * d) / 4) < eps) {
      // Critically Damped
      const j0 = x - c;
      const j1 = v + j0 * y;

      const eydt = SpringMath.FastNegExp(y * dt);

      x = j0 * eydt + dt * j1 * eydt + c;
      v = -y * j0 * eydt - y * dt * j1 * eydt + j1 * eydt;
    } else if (s - (d * d) / 4 > 0) {
      // Under Damped
      const w = Math.sqrt(s - (d * d) / 4);
      let j = Math.sqrt(
        Math.pow(v + y * (x - c), 2) / (w * w + eps) + Math.pow(x - c, 2)
      );
      const p = SpringMath.FastAtan((v + (x - c) * y) / (-(x - c) * w + eps));
      j = x - c > 0 ? j : -j;

      const eydt = SpringMath.FastNegExp(y * dt);

      x = j * eydt * Math.cos(w * dt + p) + c;
      v =
        -y * j * eydt * Math.cos(w * dt + p) -
        w * j * eydt * Math.sin(w * dt + p);
    } else if (s - (d * d) / 4 < 0) {
      // Over Damped
      const y0 = (d + Math.sqrt(d * d - 4 * s)) / 2;
      const y1 = (d - Math.sqrt(d * d - 4 * s)) / 2;
      const j1 = (c * y0 - x * y0 - v) / (y1 - y0);
      const j0 = x - j1 - c;

      const ey0dt = SpringMath.FastNegExp(y0 * dt);
      const ey1dt = SpringMath.FastNegExp(y1 * dt);

      x = j0 * ey0dt + j1 * ey1dt + c;
      v = -y0 * j0 * ey0dt - y1 * j1 * ey1dt;
    }

    return { x, y: v };
  }
}
