import { GameModeChoiceScene, GameModeControllerScene, GameModeHotSeatScene } from "./scenes/GameScenes";
import { PhaserGameService } from "./services/PhaserGameService";
import { CastToPhaserGameService } from "./services/PhaserGameService.gen";
import { PhoenixChannelService } from "./services/PhoenixChannelService";
import { SceneService } from "./services/SceneService";
import ServiceContainer, { IService } from "./services/ServiceContainer";
import { CoroutineManager } from "./utils/Coroutines";
import { TriggerManager } from "./utils/phaser/Triggers";
import { RVOService } from "./utils/rvo/RVOManager";


class MainSceneStartupService implements IService {
  onServicesReady(): void { }
  initializeService(): Promise<void> {
    const game = ServiceContainer.getService(CastToPhaserGameService).getGame();
    // Attach main scene only after all services have instantiated,
    // because there is likely to be code inside the Scene that depends on those services.
    game.scene.add('ModeChoice', GameModeChoiceScene, true);
    game.scene.add('ModeController', GameModeControllerScene, false);
    game.scene.add('ModeHotSeat', GameModeHotSeatScene, false);


    return new Promise((res) => {
      const check = () => {
        const scene = game.scene.getScene('ModeChoice');
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
