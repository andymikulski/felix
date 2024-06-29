import { ColorGradient } from './ColorGradient';
import HeatMap2D from './Heatmap';
import { throttle } from './throttle';

export class HeatMapRenderer {
  public canvas: HTMLCanvasElement;
  public context: CanvasRenderingContext2D;
  private fontSize: number;

  private colorSets = [
    // viridisColors
    new ColorGradient([
      [68, 1, 84],
      [72, 35, 116],
      [64, 67, 135],
      [52, 94, 141],
      [41, 120, 142],
      [32, 144, 140],
      [34, 167, 132],
      [68, 190, 112],
      [121, 209, 81],
      [189, 222, 38],
      [253, 231, 36],
    ]),

    // typicalColors
    new ColorGradient([
      [0, 0, 0],
      [0, 0, 255],
      [0, 255, 0],
      [255, 255, 0],
      [255, 165, 0],
      [255, 0, 0],
    ]),

    // plasmaColors
    new ColorGradient([
      [13, 8, 135],
      [75, 32, 159],
      [125, 58, 179],
      [168, 90, 188],
      [211, 134, 187],
      [250, 177, 168],
      [252, 214, 118],
      [255, 251, 54],
      [255, 255, 255],
    ]),

    // divergingColorBrewer
    new ColorGradient([
      [49, 54, 149],
      [69, 117, 180],
      [116, 173, 209],
      [171, 217, 233],
      [224, 243, 248],
      [254, 224, 144],
      [253, 174, 97],
      [244, 109, 67],
      [215, 48, 39],
    ]),

    // colorBrewerRdBl
    new ColorGradient([
      [103, 0, 31],
      [178, 24, 43],
      [214, 96, 77],
      [244, 165, 130],
      [253, 219, 199],
      [209, 229, 240],
      [146, 197, 222],
      [67, 147, 195],
      [33, 102, 172],
      [5, 48, 97],
    ]),
  ];

  private colorIdx = 0;
  private colorScheme = this.colorSets[this.colorIdx];
  squareSize: number;

  constructor(
    private map: HeatMap2D,
    public container?: HTMLElement
  ) {
    this.squareSize = map.getResolutionScale();
    this.setupCanvas(
      map.getWidth() * map.getResolutionScale(),
      map.getHeight() * map.getResolutionScale()
    );
  }

  private setupCanvas(width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    (this.container ?? document.body).appendChild(canvas);
    this.canvas = canvas;
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D;
  }

  private getHeatColor = (t: number) => {
    return this.colorScheme.getColorAsRGBString(t);
  };

  public toggleColorScheme = (next: boolean) => {
    this.colorIdx += next ? 1 : -1;
    this.colorIdx %= this.colorSets.length;
    this.colorScheme = this.colorSets[this.colorIdx];
  };

  public draw = throttle(() => {
    const { squareSize, canvas, context, fontSize } = this;
    const pixels = this.map.getPixels();

    this.context.fillStyle = this.colorScheme.getColorAsRGBString(0);
    this.context.fillRect(0, 0, canvas.width, canvas.height);

    for (const id in pixels) {
      const px = pixels[id];
      const t = px / (this.map.getMaxValue() + 0.0001);
      context.fillStyle = this.getHeatColor(t);

      const { x, y } = this.map.curve.getXY(parseFloat(id));

      context.fillRect(x / squareSize, y / squareSize, 1, 1);
    }
  }, 1000);
}
