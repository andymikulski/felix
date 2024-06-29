import Phaser from 'phaser';

export default class FogOfWar {
  public fogTexture: Phaser.GameObjects.RenderTexture;
  private ratio: number;
  private eraserCursor: Phaser.GameObjects.Image | Phaser.GameObjects.Ellipse;

  private _alpha: number;
  public get alpha(): number {
    return this._alpha;
  }
  public set alpha(v: number) {
    this._alpha = v;
    this.fogTexture.alpha = v;
  }

  constructor(
    scene: Phaser.Scene,
    private worldWidth: number,
    private worldHeight: number,
    private fidelity: number = 128,
    public fogDecayRate: number = 0.0025,
    private revealTexture?: string
  ) {
    const ratio = worldWidth / worldHeight;
    this.ratio = ratio;
    this.fogTexture = scene.add.renderTexture(
      0,
      0,
      Math.ceil(this.fidelity * ratio),
      this.fidelity
    );

    this.fogTexture.fill(
      0,
      1,
      0,
      0,
      this.fogTexture.width,
      this.fogTexture.height
    );
    this.fogTexture.setDisplaySize(worldWidth, worldHeight);
    this.fogTexture.setDepth(-1000);

    // save texture under `fog-of-war` key
    this.fogTexture
      .saveTexture('fog-of-war')
      // ensure it has a smooth appearance
      .setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.eraserCursor = scene.add
      .image(0, 0, 'fog-dot') //.ellipse(0,0,32,32, 0xFFFFFF, 1.0)
      .setDisplaySize(20 * (this.fidelity / 128), 20 * (this.fidelity / 128))
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this._mask = this.fogTexture.createBitmapMask();
    this._mask.invertAlpha = true;

    // scene.input.on('pointermove', (pointer:Phaser.Input.Pointer) => {
    //   this.reveal(pointer.worldX, pointer.worldY);
    // })

    // Fill the texture so it starts out as pure black. (Not sure why this needs to be done twice.)
    // this.fogTexture.fill(0xFF0000, 1);

    // This prevents entities from being seen after leaving an area.
    // This also uses `-drawn` which is a stylized/simplified version of the map.
    // The result is that previously explored areas look more 'sketchy' and like drawings
    if (this.revealTexture) {
      const fg = scene.add
        .image(0, 0, this.revealTexture)
        .setOrigin(0, 0)
        .setDisplaySize(worldWidth, worldHeight)
        .setDepth(5000);
      fg.setMask(this.bitmapMask);
    }
  }

  private _mask: Phaser.Display.Masks.BitmapMask;
  public get bitmapMask(): Phaser.Display.Masks.BitmapMask {
    return this._mask;
  }

  getFogPixel = async (x: number, y: number): Promise<Phaser.Display.Color> => {
    const flippedY = this.fogTexture.height - y;

    return new Promise<Phaser.Display.Color>((res, rej) => {
      this.fogTexture.snapshotPixel(
        x,
        flippedY,
        (color: Phaser.Display.Color | HTMLImageElement) => {
          if (color instanceof HTMLImageElement) {
            console.log('got image element somehow');
            rej();
            return;
          }
          res(color);
        }
      );
    });
  };

  convertWorldToFogPos = (worldX: number, worldY: number) => {
    return {
      x: (worldX / this.worldWidth) * this.fidelity * this.ratio,
      y: (worldY / this.worldHeight) * this.fidelity,
    };
  };

  checkVisibilityAtPosition = async (
    worldX: number,
    worldY: number,
    width: number = 1,
    height: number = 1
  ) => {
    const texPos = this.convertWorldToFogPos(worldX, worldY);
    const pixel = await this.getFogPixel(texPos.x, texPos.y);
    return pixel.alpha <= 0;
  };

  reveal(worldX: number, worldY: number) {
    this.eraserCursor.x =
      (worldX / this.worldWidth) * this.fidelity * this.ratio;
    this.eraserCursor.y = (worldY / this.worldHeight) * this.fidelity;
    this.fogTexture.erase(this.eraserCursor);
  }

  growFog(amount: number) {
    this.fogTexture.fill(0x0, amount);
  }

  public updateFog: (
    delta: number,
    revealers: {
      x: number;
      y: number;
    }[]
  ) => void = throttle(
    (
      delta: number,
      revealers: {
        x: number;
        y: number;
      }[]
    ) => {
      this.growFog(delta * 2 * this.fogDecayRate);
      for (let i = 0; i < revealers.length; i++) {
        this.reveal(revealers[i].x, revealers[i].y);
      }
    },
    1000 / 30
  );
}

const throttle = function (innerFnc: Function, throttleTimeMs: number) {
  let throttleTimer: any;
  return function (...args: any[]) {
    if (throttleTimer) {
      return;
    }
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      innerFnc(...args);
    }, throttleTimeMs);
  };
};
