import { CastToPhaserGameService } from './PhaserGameService.gen';
import ServiceContainer, { IService } from './ServiceContainer';

export interface ISceneService {
  getScene(): Phaser.Scene;
  getClock(): Phaser.Time.Clock;
}

export class SceneService implements IService, ISceneService {
  game: Phaser.Game;

  initializeService(): void {}
  onServicesReady(): void {
    const phaserService = ServiceContainer.getService(CastToPhaserGameService);
    this.game = phaserService.getGame();
  }
  getClock(): Phaser.Time.Clock {
    return this.getScene().time;
  }
  getScene(): Phaser.Scene {
    return this.game.scene.getScene('MainScene');
  }
}
