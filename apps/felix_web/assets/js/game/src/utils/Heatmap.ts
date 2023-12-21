import { ICurve2D, ZOrderCurve } from './ZOrderCurve';

export type HeatMapPixel = {
  x: number;
  y: number;
  value: number;
};

export interface IHeatMap {
  getMaxObservedValue(): number;
  getMinObservedValue(): number;
  getWidth(): number;
  getHeight(): number;
  getMaxValue(): number;
  getMinValue(): number;

  setValueAt(x: number, y: number, value: number, radius: number): void;
  addValueAt(x: number, y: number, adjustment: number, radius: number): void;
  getValueAt(x: number, y: number): void;

  fixedUpdate(deltaTime: number): void;

  getPixels(): {
    [idx: number]: HeatMapPixel;
  };

  createHeatSource(
    x: number,
    y: number,
    intensity: number,
    radius: number
  ): HeatSource;
  removeHeatSource(source: HeatSource): void;
}

export interface IHeatSource {
  getPosition(): {
    x: number;
    y: number;
  };
  getIntensity(): number;
  getRadius(): number;
}

export default class HeatMap2D implements IHeatMap {
  // See my post about z-order curves!
  private curve: ICurve2D;
  private pixels: {
    [idx: number]: HeatMapPixel;
  } = {};
  private pixelsBuffer: {
    [idx: number]: HeatMapPixel;
  } = {};

  private observedMaxValue: number = 0;
  private observedMinValue: number = 0;

  public getMaxObservedValue = () => this.observedMaxValue;
  public getMinObservedValue = () => this.observedMinValue;
  public getWidth = () => this.width;
  public getHeight = () => this.height;
  public getMaxValue = () => this.maxValue;
  public getMinValue = () => this.minValue;
  public getPixels = () => this.pixels;

  constructor(
    private width: number,
    private height: number,
    private minValue: number = 0,
    private maxValue: number = 255,
    public containHeat: boolean = false,
    private decayRate: number = 0.01
  ) {
    this.curve = new ZOrderCurve(width, height);
  }

  public setValueAt = (
    x: number,
    y: number,
    value: number,
    radius: number = 0
  ) => {
    if (radius === 0) {
      const idx = this.curve.getIndex(x, y);
      this.pixels[idx] = { x, y, value };
    } else {
      this.setRadialValueAt(x, y, value, radius, false);
    }
  };

  public addValueAt = (
    x: number,
    y: number,
    value: number,
    radius: number = 0
  ) => {
    // ensure x/y are ints
    x = Math.floor(x);
    y = Math.floor(y);
    if (radius === 0) {
      const idx = this.curve.getIndex(x, y);
      this.pixels[idx] = {
        x,
        y,
        value: (this.pixels[idx]?.value ?? this.minValue) + value,
      };
    } else {
      this.setRadialValueAt(x, y, value, radius, true);
    }
  };

  private clampMinMax = (v: number) => {
    return Math.min(this.maxValue, Math.max(this.minValue, v));
  };

  private setRadialValueAt = (
    originX: number,
    originY: number,
    value: number,
    radius: number,
    add?: boolean
  ) => {
    const { pixels } = this;
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const dist = x * x + y * y;
        if (dist > radius * radius) {
          continue;
        }

        const ratio = 1 - dist / (radius * radius + 1e-4);

        var idx = this.curve.getIndex(originX + x, originY + y);
        const val = value * ratio;

        let nextVal = Math.max(val, this.minValue);

        if (add) {
          nextVal += pixels[idx]?.value ?? this.minValue;
        }
        nextVal = this.clampMinMax(nextVal);
        pixels[idx] = {
          x: originX + x,
          y: originY + y,
          value: nextVal,
        };
      }
    }
  };

  public getValueAt = (x: number, y: number) => {
    const idx = this.curve.getIndex(x, y);
    return this.pixels[idx]?.value ?? this.minValue;
  };

  private kernel: [number[], number[], number[]] = [
    // [0.05, 0.1, 0.05],
    // [0.1, 1, 0.1],
    // [0.05, 0.1, 0.05]

    // no blur
    // [0, 0, 0],
    // [0, 1, 0],
    // [0, 0, 0]

    [Math.sqrt(2) / 2, 1, Math.sqrt(2) / 2],
    [1, 1, 1],
    [Math.sqrt(2) / 2, 1, Math.sqrt(2) / 2],

    // [1, 1, 1],
    // [1, -8, 1],
    // [1, 1, 1]
  ];

  private boxBlur = () => {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const pxId = this.curve.getIndex(x, y);
        let runningValue = 0;
        let totalWeight = 0;
        var tX;
        var tY;
        for (let blurY = -1; blurY <= 1; blurY++) {
          for (let blurX = -1; blurX <= 1; blurX++) {
            tX = x + blurX;
            tY = y + blurY;

            const weight = this.kernel[blurY + 1][blurX + 1];

            if (tX < 0 || tY < 0 || tX >= this.width || tY >= this.height) {
              if (this.containHeat) {
                totalWeight += weight;
                runningValue += this.minValue * weight;
              }
            } else {
              totalWeight += weight;
              const idx = this.curve.getIndex(tX, tY);
              const value = this.pixels[idx]?.value || this.minValue;
              runningValue += value * weight;
            }
          }
        }

        let nextVal = totalWeight === 0 ? 0 : runningValue / totalWeight; // now it is a weighted average
        nextVal *= 1 - this.decayRate;
        nextVal = this.clampMinMax(nextVal);

        this.observedMaxValue =
          nextVal > this.observedMaxValue ? nextVal : this.observedMaxValue;
        this.observedMinValue =
          nextVal < this.observedMinValue ? nextVal : this.observedMinValue;

        if (nextVal <= this.minValue + 0.01) {
          delete this.pixelsBuffer[pxId];
        } else {
          this.pixelsBuffer[pxId] = {
            x,
            y,
            value: nextVal,
          };
        }
      }
    }

    [this.pixels, this.pixelsBuffer] = [this.pixelsBuffer, this.pixels];
    return this.pixels;
  };

  private stepDelta = 0;
  private fixedTimeStep = 1000 / 24;
  public fixedUpdate = (deltaTime: number) => {
    this.stepDelta += deltaTime;
    if (this.stepDelta > this.fixedTimeStep * 50) {
      this.stepDelta = this.fixedTimeStep * 50;
    }

    while (this.stepDelta >= this.fixedTimeStep) {
      this.stepDelta -= this.fixedTimeStep;
      this.emitFromHeatSources();
      this.boxBlur();
    }
  };

  // heat sources
  private heatSources: HeatSource[] = [];
  public createHeatSource = (
    x: number,
    y: number,
    intensity: number,
    radius: number
  ): HeatSource => {
    const src = new HeatSource(x, y, intensity, radius);
    this.heatSources.push(src);
    return src;
  };
  public registerHeatSource = (src: HeatSource) => {
    this.heatSources.push(src);
    return src;
  };

  removeHeatSource = (source: HeatSource) => {
    this.heatSources = this.heatSources.filter((x) => x !== source);
  };

  private emitFromHeatSources = () => {
    for (let i = 0; i < this.heatSources.length; i++) {
      const { x, y } = this.heatSources[i].getPosition();
      this.addValueAt(
        x,
        y,
        this.heatSources[i].getIntensity(),
        this.heatSources[i].getRadius()
      );
    }
  };
}

export class HeatSource implements IHeatSource {
  constructor(
    public x: number,
    public y: number,
    public intensity: number,
    public radius: number
  ) {}
  getRadius(): number {
    return this.radius;
  }
  getPosition(): {
    x: number;
    y: number;
  } {
    return {
      x: this.x,
      y: this.y,
    };
  }
  getIntensity(): number {
    return this.intensity;
  }
}
