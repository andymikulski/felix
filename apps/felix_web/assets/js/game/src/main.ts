import { GameModeHotSeatScene } from "./scenes/GameModeHotSeatScene";
import { GameModeControllerScene } from "./scenes/GameModeControllerScene";
import { GameModeChoiceScene } from "./scenes/GameModeChoiceScene";
import { PhoenixChannelService } from "./services/PhoenixChannelService";

import { PhaserGameService } from "../../phasertron/services/PhaserGameService";
import { CastToPhaserGameService } from "../../phasertron/services/PhaserGameService.gen";
import { SceneService } from "../../phasertron/services/SceneService";
import ServiceContainer, { IService } from "../../phasertron/services/ServiceContainer";
import { CoroutineManager } from "../../phasertron/utils/Coroutines";
import { TriggerService } from "../../phasertron/utils/phaser/Triggers";
import { RVOService } from "../../phasertron/utils/rvo/RVOService";


import "./utils/phaser/PRDE";
declare global {
  interface Window {
    gameInfo: {
      game_id: string;
    };
  }
}


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
      new TriggerService(),
      new RVOService(),
      new PhoenixChannelService(),
      // Must be last!!
      new MainSceneStartupService(),
    ]);
  }
}

new StartupHandler();
