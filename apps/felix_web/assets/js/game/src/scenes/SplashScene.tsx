import Phaser from 'phaser';
import TitleScene from './TitleScene';
import QuakeEffect from '../utils/phaser/fx/QuakeEffect';

export default class SplashScene extends Phaser.Scene {
  preload = () => {
    this.load.image('company-logo', 'images/logo/awful-games-logo-white.png');
  };

  overlayRect?: Phaser.GameObjects.Rectangle;
  logoEffect: QuakeEffect;
  create = () => {
    this.overlayRect = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0)
      .setDepth(1000)
      .setOrigin(0, 0);

    this.add.text(0, 0, 'splash screen');

    const logo = this.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      'company-logo'
    );

    this.input.on('pointerdown', () => {
      this.gotoNextTitleScene();
    });

    this.input.keyboard.on('keydown', (evt: KeyboardEvent) => {
      if (
        evt.code === 'Space' ||
        evt.code === 'Enter' ||
        evt.code === 'Escape'
      ) {
        this.gotoNextTitleScene();
        return true;
      }
    });

    setTimeout(() => {
      this.tweens.add({
        targets: this.overlayRect,
        props: {
          alpha: 0,
        },
        duration: 100,
        onStart: () => {
          this.logoEffect = new QuakeEffect(this, logo, 1, 10000);
        },
      });
    }, 1000);

    setTimeout(() => {
      this.gotoNextTitleScene();
    }, 3_000);
  };

  private isTransitioning = false;
  gotoNextTitleScene = () => {
    if (this.isTransitioning) {
      return;
    }
    this.isTransitioning = true;

    this.cameras.main.fadeOut(
      100,
      undefined,
      undefined,
      undefined,
      (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress >= 1) {
          this.logoEffect?.destroy(true);

          this.game.scene.add('title scene', TitleScene) as TitleScene;
          this.scene.start('title scene');
        }
      }
    );
  };
}
