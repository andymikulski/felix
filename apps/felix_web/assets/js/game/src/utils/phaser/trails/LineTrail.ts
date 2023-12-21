import Phaser from 'phaser';
import { SegmentLimitedLine } from './SegmentLimitedLine';

export class LineTrail extends Phaser.GameObjects.GameObject {
  private line: SegmentLimitedLine;
  private lastRun = -1;
  public strobe = true;
  private leadingLine: Phaser.GameObjects.Line;

  constructor(
    public scene: Phaser.Scene,
    public target: {
      x: number;
      y: number;
    },
    public length: number = 10,
    public segmentCount: number = 10,
    public color: number = 0xff0000,
    public isDashed: boolean = false,
    private updateRate: number = 1000 / 4,
    private lifetime: number = 2000,
    private lineThickness: number = 1
  ) {
    super(scene, 'LineTrail');

    this.line = new SegmentLimitedLine(
      scene,
      length,
      segmentCount,
      lifetime,
      (
        fromPos: {
          x: number;
          y: number;
        },
        endPos: {
          x: number;
          y: number;
        }
      ): Phaser.GameObjects.Image | Phaser.GameObjects.Line => {
        const newLine = this.scene.add
          .line(0, 0, fromPos.x, fromPos.y, endPos.x, endPos.y, this.color, 1)
          .setOrigin(0, 0)
          .setLineWidth(this.lineThickness);

        newLine.setDepth(1000);
        return newLine;
      }
    );

    this.leadingLine = scene.add.line(0, 0, 0, 0, 0, 0, color, 1);
    this.leadingLine.setLineWidth(this.lineThickness);
    this.leadingLine.setVisible(isDashed ? false : true);

    scene.add.existing(this);
  }

  public setVisible = (show: boolean) => {
    if (show) {
      this.updatePositioning();
    }
    return this;
  };

  private updatePositioning = () => {
    const segment = this.line.addPoint({
      x: this.target.x,
      y: this.target.y,
    });
    if (!segment) {
      return;
    }
    this.strobe = !this.strobe;
    segment.setVisible(this.isDashed ? this.strobe : true);
  };

  preUpdate = (timestamp: number, delta: number) => {
    const last = this.line.getLastPoint();
    if (last) {
      this.leadingLine.setTo(this.target.x, this.target.y, last.x, last.y);
      if (this.isDashed) {
        this.leadingLine.setVisible(!this.strobe);
      }
    }

    if (timestamp - this.lastRun < this.updateRate) {
      return;
    }
    this.lastRun = timestamp;
    this.updatePositioning();
  };
}
