export interface ISpring<TValue> {
  Value: TValue;
  GoalValue: TValue;
  GoalVelocity: TValue;
  Velocity: TValue;

  update(deltaTimeSec: number): TValue;
  setGoal(target: TValue): void;
  setValue(value: TValue): void;

  predict(futureDeltaTimeSec: number): TValue;
}
