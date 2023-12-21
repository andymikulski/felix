export enum QuakeEffectMode {
  /**
   * Quake gradually gets stronger as it approaches time limit
   */
  StrongerOverTime = 0,
  /**
   * Quake starts strong, gradually settles back to position (default)
   */
  WeakerOverTime = -1,
}

// "normal" number distribution between 0 - 1
const rand = () => (Math.random() + Math.random() + Math.random()) / 3;

/**
 * Simple effect to shake something. Has two modes: `QuakeOverTime.ASC` and `QuakeOverTime.DESC`.
 *   - `StrongerOverTime` means the shake will start 'low' ramp up over time.
 *     (This is good if something is about to blow up.)
 *   - `WeakerOverTime` - the default setting - means the shake will start strong and settle over time.
 *     (This is good for a door slam, or big monster slowly stomping around.)
 *
 * ---
 *
 * Usage is quite simple; the `QuakeEffect` class will add itself to the scene and clean everything up
 * once finished on its own. This means creating a quake effect is a single line of code:
 * ```ts
 * new QuakeEffect(scene, yourObjWithPosition, 0.5, 500);
 * ```
 */
export default class QuakeEffect extends Phaser.GameObjects.GameObject {
  originalOffset: {
    x: number;
    y: number;
  };
  quakeOffset: {
    x: number;
    y: number;
  };
  timeStart: number;
  callbacks: Function[] = [];

  constructor(
    scene: Phaser.Scene,
    private target: {
      x: number;
      y: number;
    },
    private intensity: number,
    private durationMs: number,
    private mode: QuakeEffectMode = QuakeEffectMode.WeakerOverTime
  ) {
    super(scene, 'QuakeEffect');
    this.originalOffset = {
      x: this.target.x,
      y: this.target.y,
    };
    this.quakeOffset = {
      x: 0,
      y: 0,
    };

    scene.add.existing(this);
  }

  public addCallback = (callback: () => void) => {
    this.callbacks.push(callback);
  };

  preUpdate = (timestamp: number, _delta: number) => {
    this.timeStart = this.timeStart || timestamp;
    const timeElapsed = timestamp - this.timeStart;

    this.quakeOffset.x =
      Math.cos(timeElapsed) *
      (rand() > 0.5 ? -1 : 1) *
      rand() *
      (this.intensity * (this.mode + timeElapsed / this.durationMs));

    this.quakeOffset.y =
      Math.sin(timeElapsed) *
      (rand() > 0.5 ? -1 : 1) *
      rand() *
      (this.intensity * (this.mode + timeElapsed / this.durationMs));

    this.target.x = this.originalOffset.x + this.quakeOffset.x;
    this.target.y = this.originalOffset.y + this.quakeOffset.y;

    if (timeElapsed >= this.durationMs) {
      this.target.x = this.originalOffset.x;
      this.target.y = this.originalOffset.y;

      this.callbacks.forEach((callback) => callback());
      this.destroy();
    }
  };
}
