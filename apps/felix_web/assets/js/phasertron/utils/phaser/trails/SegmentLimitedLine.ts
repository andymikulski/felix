import Phaser from 'phaser';
import DoublyLinkedList from '../../data-structures/DoublyLinkedList';

export class SegmentLimitedLine extends Phaser.GameObjects.GameObject {
  private list: DoublyLinkedList<Phaser.GameObjects.GameObject> =
    new DoublyLinkedList<Phaser.GameObjects.GameObject>();
  private points: DoublyLinkedList<{
    x: number;
    y: number;
  }> = new DoublyLinkedList<{
    x: number;
    y: number;
  }>();

  private perPieceLengthSquared = 0;

  constructor(
    scene: Phaser.Scene,
    public length: number,
    public limit: number = 8,
    public lifetime: number = 2000,
    segmentFactoryFn: (
      fromPos: {
        x: number;
        y: number;
      },
      endPos: {
        x: number;
        y: number;
      }
    ) => Phaser.GameObjects.Image | Phaser.GameObjects.Line
  ) {
    super(scene, 'SegmentLimitedLine');
    this.perPieceLengthSquared = (this.length / this.limit) ** 2;
    this.createSegment = segmentFactoryFn ?? this.createSegment;
  }

  createDefaultLineSegment = (
    fromPos: {
      x: number;
      y: number;
    },
    endPos: {
      x: number;
      y: number;
    }
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Line => {
    throw new Error(
      'A segment factory function must be provided when instantiating a SegmentLimitedLine.'
    );
  };

  createSegment = this.createDefaultLineSegment;

  getLastPoint = () => {
    return this.points.head?.data;
  };

  addPoint = (value: { x: number; y: number }) => {
    const current = this.points.head?.data || {
      x: value.x,
      y: value.y,
    };
    const dist = Phaser.Math.Distance.BetweenPointsSquared(current, value);
    if (this.list.count && dist < this.perPieceLengthSquared) {
      return;
    }

    const newSegment = this.createSegment(current, value);

    this.list.insertFirst(newSegment);
    this.points.insertFirst({
      x: value.x,
      y: value.y,
    });

    const temp = {
      t: 0,
    };
    // fade out and delete
    this.scene.tweens.add({
      targets: temp,
      props: { t: 1 },
      duration: this.lifetime,
      onUpdate: (tween: Phaser.Tweens.Tween, target: typeof temp) => {
        newSegment.setAlpha(1 - target.t);
      },
      onComplete: () => {
        this.points.removeLast();
        this.list.removeLast()?.destroy();
      },
    });

    // Prevent infinite loops
    if (this.limit <= 0 || this.limit >= Infinity) {
      return newSegment;
    }

    while (this.list.count > this.limit) {
      this.points.removeLast();
      const del = this.list.removeLast();
      if (!del) {
        continue;
      }

      // fade out and delete
      this.scene.tweens.getTweensOf(del).forEach((x) => x?.stop()?.remove());
      const temp = {
        t: 0,
      };
      this.scene.tweens.add({
        targets: temp,
        props: {
          t: 1,
        },
        duration: 100,
        onUpdate: (tween: Phaser.Tweens.Tween, target: typeof temp) => {
          (del as any).setAlpha?.(1 - target.t);
        },
        onComplete: function () {
          del.destroy();
        },
      });
    }

    return newSegment;
  };
}
