import Phaser from 'phaser';
import { SegmentLimitedLine } from './SegmentLimitedLine';

export class FootstepTrail extends Phaser.GameObjects.GameObject {
  private line: SegmentLimitedLine;
  private lastRun = -1;

  constructor(
    public scene: Phaser.Scene,
    public target: {
      x: number;
      y: number;
    },
    public length: number = 10,
    public segmentCount: number = 10,
    public color: number = 0xff0000,
    public updateRate: number = 1000 / 4,
    public lifetime: number = 2000,
    public imageKey: string
  ) {
    super(scene, 'LineTrail');

    let strobe = Math.random() > 0.5; // for better variation
    this.line = new SegmentLimitedLine(
      scene,
      length,
      segmentCount,
      // color,
      lifetime,
      // 1,
      (
        fromPos: {
          x: number;
          y: number;
        },
        endPos: {
          x: number;
          y: number;
        }
      ) => {
        strobe = !strobe;
        const print = scene.add
          .image(endPos.x, endPos.y + 16, this.imageKey)
          .setScale(0.1)
          .setFlipX(strobe)
          .setAlpha(0.25);
        print.removeFromUpdateList();
        print.setRotation(
          Phaser.Math.Angle.BetweenPoints(fromPos, endPos) + Math.PI / 2
        );
        return print;
      }
    );

    // ensure preUpdate runs on LineTrail
    scene.add.existing(this);
  }

  public setVisible = (show: boolean) => {
    if (show) {
      this.updatePositioning();
    }
    return this;
  };

  private updatePositioning = () => {
    this.line.addPoint({
      x: this.target.x,
      y: this.target.y,
    });
  };

  preUpdate = (timestamp: number, delta: number) => {
    if (timestamp - this.lastRun < this.updateRate) {
      return;
    }
    this.lastRun = timestamp;
    this.updatePositioning();
  };
}
