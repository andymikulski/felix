import { SceneService } from '../../game/src/services/SceneService';
import { PhaserGameService } from '../../game/src/services/PhaserGameService';
import ServiceContainer, { IService } from '../../game/src/services/ServiceContainer';
import { CoroutineManager } from '../../game/src/utils/Coroutines';
import { TriggerManager } from '../../game/src/utils/phaser/Triggers';
import { CastToPhaserGameService } from '../../game/src/services/PhaserGameService.gen';
import { RVOService } from '../../game/src/utils/rvo/RVOManager';
import { PhoenixChannelService } from '../../game/src/services/PhoenixChannelService';
import LobbyScene from './LobbyScene';

import "../../game/src/utils/phaser/PRDE";

class MainSceneStartupService implements IService {
  onServicesReady(): void { }
  initializeService(): Promise<void> {
    const game = ServiceContainer.getService(CastToPhaserGameService).getGame();
    // Attach main scene only after all services have instantiated,
    // because there is likely to be code inside the Scene that depends on those services.
    game.scene.add('MainScene', LobbyScene, true);

    return new Promise((res) => {
      const check = () => {
        const scene = game.scene.getScene('MainScene');
        if (scene) {
          res();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
}

class StartupHandler {
  constructor() {
    ServiceContainer.initialize([
      new PhaserGameService(),
      new SceneService(),
      new CoroutineManager(),
      new TriggerManager(),
      new RVOService(),
      new PhoenixChannelService(),
      // Must be last!!
      new MainSceneStartupService(),
    ]);
  }
}

new StartupHandler();
