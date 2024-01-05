import Phaser from "phaser";
import ServiceContainer from "../services/ServiceContainer";
import { CastToPhoenixChannelService } from "../services/PhoenixChannelService.gen";
import ModeChoiceUI from "../react/ModeChoiceUI";
import { IPhoenixChannel } from "../services/PhoenixChannelService";


export class GameModeChoiceScene extends Phaser.Scene {
  preload = () => { };
  create = () => {
    const channels = ServiceContainer.getService(CastToPhoenixChannelService);

    // Calling `getChannel` here will create the connection and start the join process
    // We don't need to respond until the user chooses which mode they are playing,
    // which ultimately will just make the connection time seem really fast
    channels.getChannel("room:" + window.gameInfo.game_id);

    // get center point for main camera
    const cameraCenterX = this.cameras.main.centerX;
    const cameraCenterY = this.cameras.main.centerY;

    const choiceDialog = this.add.react(
      cameraCenterX,
      cameraCenterY,
      ModeChoiceUI,
      {
        onHotSeat: () => {
          // hot seat
          this.scene.stop("ModeChoice");
          this.scene.start("ModeHotSeat");
        },
        onController: () => {
          // controller
          this.scene.stop("ModeChoice");
          this.scene.start("ModeController");
        },
      }
    );
  };

  update = (time: number, deltaMs: number) => { };
}



class ConnectionDialog {
  constructor(private scene:Phaser.Scene, private channel: IPhoenixChannel) {

  }
}