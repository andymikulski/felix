import Phaser from "phaser";
import ServiceContainer from "../services/ServiceContainer";
import { CastToPhoenixChannelService } from "../services/PhoenixChannelService.gen";
import { IPhoenixChannel } from "../services/PhoenixChannelService";
import ControllerPlayerUI from "../react/ControllerPlayerUI";


export class GameModeControllerScene extends Phaser.Scene {
  network: IPhoenixChannel;
  preload = () => { };
  create = () => {
    const channels = ServiceContainer.getService(CastToPhoenixChannelService);
    this.network = channels.getChannel("room:" + window.gameInfo.game_id);
    this.network.onConnect(this.setup);
  };

  setup = async () => {
    const { current_word, current_category } = await this.network.sendRPC<{
      current_word: string;
      current_category: string;
    }>("get_current");

    const cameraCenterX = this.cameras.main.centerX;
    const cameraCenterY = this.cameras.main.centerY;

    const controller = this.add.react(
      cameraCenterX,
      cameraCenterY,
      ControllerPlayerUI,
      {
        currentWord: current_word,
        onPass: () => {
          this.network.sendRPC("pass");
        },
        onCorrect: () => {
          this.network.sendRPC("complete");
        },
        onFail: () => {
          this.network.sendRPC("fail");
        },
      }
    );

    this.network.subscribe("game:update", (update) => {
      console.log("got game update...");
      controller.setProps({ currentWord: update.current_word });
    });

    this.network.subscribe("game:over", (update) => {
      // game over
      controller.destroy();

      console.log("done!!!");
    });
  };
  update = (time: number, delta: number) => { };
}
