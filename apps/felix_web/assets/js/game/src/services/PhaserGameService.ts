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
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x111111,
      scale: {
        mode: Phaser.Scale.RESIZE,
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
