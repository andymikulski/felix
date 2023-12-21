import MainScene from '../scenes/MainScene';
// import SplashScene from "../scenes/SplashScene";
import { IService } from './ServiceContainer';
import Phaser from 'phaser';

export interface IPhaserGameService {
  getGame(): Phaser.Game;
}

export class PhaserGameService implements IService, IPhaserGameService {
  game: Phaser.Game;

  initializeService(): void {
    // Insert UI container
    const container = document.createElement('div');
    container.id = 'container';
    document.body.appendChild(container);

    this.game = new Phaser.Game({
      width: 1024,
      height: 768,
      backgroundColor: 0x333333,
      scale: {
        mode: Phaser.Scale.FIT,
      },
      dom: {
        createContainer: true,
      },
      parent: container,
    });
  }

  onServicesReady(): void {}

  getGame(): Phaser.Game {
    return this.game;
  }
}
