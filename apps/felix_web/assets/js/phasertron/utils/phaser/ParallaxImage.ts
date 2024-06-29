import Phaser from 'phaser';
import { throttle } from '../throttle';

export class ParallaxImage extends Phaser.GameObjects.Container {
  public image: Phaser.GameObjects.Sprite;
  public shadow: Phaser.GameObjects.Sprite;
  private line: Phaser.GameObjects.Line;

  private _showLine: boolean;
  public get showLine(): boolean {
    return this._showLine;
  }
  public set showLine(v: boolean) {
    this.line.setVisible(v);
    this._showLine = v;
  }

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    frame?: string
  ) {
    super(scene, x, y);
    scene.add.existing(this);

    this.shadow = scene.add
      .sprite(0, 0, texture, frame)
      .setTint(0x111111)
      .setAlpha(0.33);
    this.add(this.shadow);

    this.shadow.removeFromUpdateList();

    this.image = scene.add.sprite(0, 0, texture, frame);
    this.add(this.image);
    this.image.removeFromUpdateList();

    this.line = scene.add.line(
      this.image.x,
      this.image.y,
      this.shadow.x,
      this.shadow.y
    );
    this.line.setStrokeStyle(4, 0xff0000, 0.5).setOrigin(0, 0);
    this.line.removeFromUpdateList();
    this.add(this.line);

    this.bringToTop(this.image);
  }

  public setDepth = (value: number): this => {
    this.image.setDepth(value);
    return this;
  };

  private blurFX: any;

  offsetImage = () => {
    const camView = this.scene.cameras.main.worldView;

    const thisPos = {
      x: this.body?.position?.x || this.x,
      y: this.body?.position?.y || this.y,
    };
    if (this.parentContainer) {
      thisPos.x = this.parentContainer.x;
      thisPos.y = this.parentContainer.y;
    }

    let dist = Phaser.Math.Distance.Between(
      camView.centerX,
      camView.centerY,
      thisPos.x,
      thisPos.y
    );
    dist *= this.scene.cameras.main.zoom;
    const angle = Phaser.Math.Angle.Between(
      camView.centerX,
      camView.centerY,
      thisPos.x,
      thisPos.y
    );
    const z = Math.max(0, this.z);

    this.image.setPosition(
      Math.cos(angle) * (dist * 0.1 * (z * 0.5)),
      Math.sin(angle) * (dist * 0.1 * (z * 0.5))
    );

    this.shadow.setAlpha((1 - z / 4) * 0.25);
    this.shadow.setVisible(this.z > 0);
  };

  preUpdate = throttle(() => {
    this.offsetImage();

    this.line.setTo(this.image.x, this.image.y, this.shadow.x, this.shadow.y);

    // if (this.blurFX){
    //   this.blurFX.blur = this.z;
    // }
  }, 1000 / 90);

  setDisplaySize = (width: number, height: number): this => {
    this.image.setDisplaySize(width, height);
    return this;
  };

  setOrigin = (x: number, y: number): this => {
    this.image.setOrigin(x, y);
    return this;
  };
}
