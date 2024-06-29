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
      width: window.screen.availWidth,
      height: window.screen.availHeight,
      backgroundColor: 0xfefefe,
      scale: {
        mode: Phaser.Scale.RESIZE,
      },
      dom: {
        createContainer: true,
      },
      disableContextMenu: true,
      parent: container,
      // pixelArt: true,
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
        },
      },
    });
  }

  onServicesReady(): void {}

  getGame(): Phaser.Game {
    return this.game;
  }
}
