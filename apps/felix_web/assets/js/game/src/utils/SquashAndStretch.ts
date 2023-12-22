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
      Math.max(
        this.minValue,
        Math.abs(mainVelocity / (this.mainDamping + 1e-4))
      ) -
      Math.max(
        this.minValue,
        Math.abs(secondaryVelocity / (this.secondaryDamping + 1e-4))
      )
    );
  }
}

export class SquashAndStretchVector2 {
  xSquash: SquashAndStretchNumber;
  ySquash: SquashAndStretchNumber;
  constructor(
    /**
     * Base values used when there is no velocity at all.
     */
    private baseValue: {
      x: number;
      y: number;
    },
    /**
     * Defines the sensitvity of the effect on the main axis. Higher = less sensitive
     */
    mainDamping: number,
    /**
     * Defines the sensitvity of the effect on the secondary axis. Higher = less sensitive
     */
    secondaryDamping: number,
    /**
     * Minimum values for the effect. Use this to prevent negative/inverted values, or to prevent
     * the effect from making the output value too small to be useful.
     */
    private minValue = {
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
    const val = {
      x: Math.max(this.minValue.x, this.xSquash.getValue(xVelocity, yVelocity)),
      y: Math.max(this.minValue.y, this.ySquash.getValue(yVelocity, xVelocity)),
    };

    return val;
  }
}
