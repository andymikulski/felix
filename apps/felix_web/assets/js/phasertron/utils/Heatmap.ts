import { HeatMapRenderer } from './HeatmapRenderer';
import { stackBlurInPlace } from './StackBlur';
import { ICurve2D, RowMajorOrderCurve } from './ZOrderCurve';

export type HeatMapPixel = number;

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

  getPixels(): { [idx: number]: HeatMapPixel };

  createHeatSource(
    x: number,
    y: number,
    intensity: number,
    radius: number
  ): IHeatSource;
  removeHeatSource(source: IHeatSource): void;
}

export interface IHeatSource {
  getPosition(): { x: number; y: number };
  getIntensity(): number;
  getRadius(): number;
}

export type HeatMapPOI = {
  value: number;
  x: number;
  y: number;
};

export default class HeatMap2D implements IHeatMap {
  public curve: ICurve2D;
  private pixels: HeatMapPixel[] = [];

  private observedMaxValue: number = 0;
  private observedMinValue: number = 0;

  public getResolutionScale = () => this.scale;
  public getMaxObservedValue = () => this.observedMaxValue;
  public getMinObservedValue = () => this.observedMinValue;
  public getWidth = () => this.width;
  public getHeight = () => this.height;
  public getMaxValue = () => this.maxValue;
  public getMinValue = () => this.minValue;
  public getPixels = () => this.pixels;
  debugDisplay: HeatMapRenderer;

  constructor(
    private width: number,
    private height: number,
    private minValue: number = 0,
    private maxValue: number = 255,
    public containHeat: boolean = false,
    private blurRate: number = 2,
    private scale: number = 1
  ) {
    this.curve = new RowMajorOrderCurve(width, height);
    this.debugDisplay = new HeatMapRenderer(this);
  }

  public setValueAt = (
    x: number,
    y: number,
    value: number,
    radius: number = 0
  ) => {
    x = Math.floor(x * this.scale);
    y = Math.floor(y * this.scale);

    if (radius === 0) {
      const idx = this.curve.getIndex(x, y);
      this.pixels[idx] = value;
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
    x = Math.floor(x * this.scale);
    y = Math.floor(y * this.scale);

    if (radius === 0) {
      const idx = this.curve.getIndex(x, y);
      this.pixels[idx] = (this.pixels[idx] ?? this.minValue) + value;
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
    originX = Math.floor(originX * this.scale);
    originY = Math.floor(originY * this.scale);
    radius *= this.scale;

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
          nextVal += pixels[idx] ?? this.minValue;
        }
        nextVal = this.clampMinMax(nextVal);
        pixels[idx] = nextVal;
      }
    }
  };

  public getValueAt = (x: number, y: number) => {
    x = Math.floor(x * this.scale);
    y = Math.floor(y * this.scale);

    const idx = this.curve.getIndex(x, y);
    return this.pixels[idx] ?? this.minValue;
  };

  private stackBlur = () => {
    stackBlurInPlace(
      this.pixels,
      this.width, // * this.scale,
      this.height, // * this.scale,
      this.blurRate
    );
    return this.pixels;
  };

  private stepDelta = 0;
  private fixedTimeStep = 1000 / 12;
  public fixedUpdate = (deltaTime: number) => {
    // this.debugDisplay.draw();

    this.stepDelta += deltaTime;
    if (this.stepDelta > this.fixedTimeStep * 50) {
      this.stepDelta = this.fixedTimeStep * 50;
    }

    while (this.stepDelta >= this.fixedTimeStep) {
      this.stepDelta -= this.fixedTimeStep;
      this.emitFromHeatSources();
      this.stackBlur();
    }
  };

  // heat sources
  private heatSources: IHeatSource[] = [];
  public createHeatSource = (
    x: number,
    y: number,
    intensity: number,
    radius: number
  ): IHeatSource => {
    x *= this.scale;
    y *= this.scale;
    radius *= this.scale;
    const src = new HeatSource(x, y, intensity, radius);
    this.heatSources.push(src);
    return src;
  };
  public registerHeatSource = (src: IHeatSource) => {
    if (!this.heatSources.includes(src)) {
      this.heatSources.push(src);
    }
    return src;
  };

  removeHeatSource = (source: IHeatSource) => {
    this.heatSources = this.heatSources.filter((x) => x !== source);
  };

  private emitFromHeatSources = () => {
    for (let i = 0; i < this.heatSources.length; i++) {
      const { x, y } = this.heatSources[i].getPosition();
      this.addValueAt(
        x / this.scale,
        y / this.scale,
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
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
  getIntensity(): number {
    return this.intensity;
  }
}
