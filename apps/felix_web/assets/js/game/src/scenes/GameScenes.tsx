import Phaser from "phaser";
import "../utils/phaser/PRDE";

import ServiceContainer from "../services/ServiceContainer";
import { CastToPhoenixChannelService } from "../services/PhoenixChannelService.gen";
import { IPhoenixChannel } from "../services/PhoenixChannelService";
import ControllerPlayerUI from "../react/ControllerPlayerUI";
import ModeChoiceUI from "../react/ModeChoiceUI";
import QuakeEffect from "../utils/phaser/fx/QuakeEffect";

declare global {
  interface Window {
    gameInfo: {
      game_id: string;
    };
  }
}


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

    const choiceDialog = this.add.react(cameraCenterX, cameraCenterY, ModeChoiceUI, {
      onHotSeat: () => {
        // hot seat
        this.scene.stop('ModeChoice');
        this.scene.start('ModeHotSeat');
      }, onController: () => {
        // controller
        this.scene.stop('ModeChoice');
        this.scene.start('ModeController');
      }
    });
  };

  update = (time: number, deltaMs: number) => {
  };
}


export class GameModeControllerScene extends Phaser.Scene {
  network: IPhoenixChannel;
  preload = () => { }
  create = () => {
    const channels = ServiceContainer.getService(CastToPhoenixChannelService);
    this.network = channels.getChannel("room:" + window.gameInfo.game_id);
    this.network.onConnect(this.setup);
  }

  setup = async () => {
    const {current_word, current_category} = await this.network.sendRPC<{current_word:string, current_category:string}>('get_current');

    const cameraCenterX = this.cameras.main.centerX;
    const cameraCenterY = this.cameras.main.centerY;

    const controller = this.add.react(cameraCenterX, cameraCenterY, ControllerPlayerUI, {
      currentWord: current_word,
      onPass: () => {
        this.network.sendRPC('pass');
      },
      onCorrect: () => {
        this.network.sendRPC('complete');
      },
      onFail: () => {
        this.network.sendRPC('fail');
      }
    });

    this.network.subscribe('game:update', (update) => {
      console.log('got game update...');
      controller.setProps({currentWord: update.current_word});
    });

    this.network.subscribe('game:over', (update) => {
      // game over
      controller.destroy();

      console.log('done!!!');
    });
  }
  update = (time: number, delta: number) => { }
}



export class GameModeHotSeatScene extends Phaser.Scene {
  network: IPhoenixChannel;
  preload = () => { }
  create = () => {
    const channels = ServiceContainer.getService(CastToPhoenixChannelService);
    this.network = channels.getChannel("room:" + window.gameInfo.game_id);
    this.network.onConnect(this.setup);
  }

  setup = async () => {
    const {current_word, current_category} = await this.network.sendRPC<{current_word:string, current_category:string}>('get_current');

    const cameraCenterX = this.cameras.main.centerX;
    const cameraCenterY = this.cameras.main.centerY;

    const text = this.add.text(cameraCenterX, cameraCenterY, current_word, {fontFamily: 'Arial', fontSize: '3vw', color: '#fff'});

    this.network.subscribe('game:update', (update) => {
      text.setText(update.current_word);
    });

    this.network.subscribe('game:over', (update) => {
      // game over
      text.setText('GAME OVER');
    });
  }
  update = (time: number, delta: number) => { }
}