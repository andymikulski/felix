export class SquashAndStretchNumber {
  constructor(
    private baseValue: number,
    private mainDamping: number,
    private secondaryDamping: number,
    private minValue: number = baseValue / 4
  ) {}

  public getValue(mainVelocity: number, secondaryVelocity: number) {
    return (
      this.baseValue + // Start with base value
      Math.max(this.minValue, Math.abs(mainVelocity / this.mainDamping)) -
      Math.max(
        this.minValue,
        Math.abs(secondaryVelocity / this.secondaryDamping)
      )
    );
  }
}

export class SquashAndStretchVector2 {
  xSquash: SquashAndStretchNumber;
  ySquash: SquashAndStretchNumber;
  constructor(
    baseValue: {
      x: number;
      y: number;
    },
    mainDamping: number,
    secondaryDamping: number,
    minValue = {
      x: baseValue.x / 4,
      y: baseValue.y / 4,
    }
  ) {
    this.xSquash = new SquashAndStretchNumber(
      baseValue.x,
      mainDamping,
      secondaryDamping,
      minValue.x
    );
    this.ySquash = new SquashAndStretchNumber(
      baseValue.y,
      mainDamping,
      secondaryDamping,
      minValue.y
    );
  }

  public getValue(xVelocity: number, yVelocity: number) {
    return {
      x: this.xSquash.getValue(xVelocity, yVelocity),
      y: this.xSquash.getValue(yVelocity, xVelocity),
    };
  }
}
