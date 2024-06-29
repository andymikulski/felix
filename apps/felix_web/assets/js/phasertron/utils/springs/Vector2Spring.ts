import FloatSpring from './FloatSpring';
import { ISpring } from './ISpring';

export type Vector2Like = {
  x: number;
  y: number;
};

export default class Vector2Spring implements ISpring<Vector2Like> {
  private _xSpring: FloatSpring;
  private _ySpring: FloatSpring;

  constructor(halflife: number, dampingRatio: number);
  constructor(
    xHalflife: number,
    xDamping: number,
    yHalflife: number,
    yDamping: number
  );
  constructor(
    arg1: number = 1,
    arg2: number = 0.5,
    arg3?: number,
    arg4?: number
  ) {
    const xHalflife = arg1;
    const yHalflife = arg3 ?? arg1;

    const xDamping = arg2;
    const yDamping = arg4 ?? arg2;

    this._xSpring = new FloatSpring(xHalflife, xDamping);
    this._ySpring = new FloatSpring(yHalflife, yDamping);

    this.setValue({
      x: 0,
      y: 0,
    });
    this.setGoal({
      x: 0,
      y: 0,
    });
  }

  // Fields ----
  private _value: Vector2Like = { x: 0, y: 0 };
  public get Value(): Vector2Like {
    return this._value;
  }
  public set Value(value: Vector2Like) {
    this._value = value;
  }
  private _goalValue: Vector2Like = { x: 0, y: 0 };
  public get GoalValue(): Vector2Like {
    return this._goalValue;
  }
  public set GoalValue(value: Vector2Like) {
    this._goalValue = value;
  }
  private _goalVelocity: Vector2Like = { x: 0, y: 0 };
  public get GoalVelocity(): Vector2Like {
    return this._goalVelocity;
  }
  public set GoalVelocity(value: Vector2Like) {
    this._goalVelocity = value;
  }
  private _velocity: Vector2Like = { x: 0, y: 0 };
  public get Velocity(): Vector2Like {
    return this._velocity;
  }
  public set Velocity(value: Vector2Like) {
    this._velocity = value;
  }

  public setDamping = (x: number, y?: number) => {
    this._xSpring.setDamping(x);
    this._ySpring.setDamping(typeof y === 'undefined' ? x : y);
  };
  public setHalfLife = (x: number, y?: number) => {
    this._xSpring.setHalfLife(x);
    this._ySpring.setHalfLife(typeof y === 'undefined' ? x : y);
  };
  // --------

  public update(deltaTimeSec: number): Vector2Like {
    this._value.x = this._xSpring.update(deltaTimeSec);
    this._value.y = this._ySpring.update(deltaTimeSec);

    this._velocity.x = this._xSpring.Velocity;
    this._velocity.y = this._ySpring.Velocity;

    this._goalVelocity.x = this._xSpring.GoalVelocity;
    this._goalVelocity.y = this._ySpring.GoalVelocity;

    return this._value;
  }

  public setGoalX(target: number) {
    this._xSpring.setGoal(target);
    this._goalValue.x = target;
  }

  public setGoalY(target: number) {
    this._ySpring.setGoal(target);
    this._goalValue.y = target;
  }

  public setGoal(target: Vector2Like) {
    this._xSpring.setGoal(target.x);
    this._ySpring.setGoal(target.y);

    this._goalValue.x = target.x;
    this._goalValue.y = target.y;
  }

  public setValue(value: Vector2Like) {
    this._xSpring.setValue(value.x);
    this._ySpring.setValue(value.y);
  }

  public predict(futureDeltaTimeSec: number): Vector2Like {
    return {
      x: this._xSpring.predict(futureDeltaTimeSec),
      y: this._ySpring.predict(futureDeltaTimeSec),
    };
  }
}
