import Phaser from "phaser";
import ServiceContainer from "../services/ServiceContainer";
import { CastToPhoenixChannelService } from "../services/PhoenixChannelService.gen";
import { IPhoenixChannel } from "../services/PhoenixChannelService";
import React from "react";


class HotSeatUI extends React.PureComponent<{ currentWord: string; timeLeft: number; }> {
  state = {
    timeDisplayed: 0,
  }


  getDerivedStateFromProps(nextProps: Readonly<{ currentWord: string; timeLeft: number; }>, prevState: Readonly<{ timeDisplayed: number; }>): { timeDisplayed: number; } {
    return {
      timeDisplayed: this.props.timeLeft,
    };
  }

  componentDidMount(): void {
    this.tickClock();
  }


  tickClock = () => {
    this.setState({
      timeDisplayed: this.state.timeDisplayed - 1000,
    });

    if (this.state.timeDisplayed > 0) {
      setTimeout(this.tickClock, 1000);
    }
  }

  render() {
    console.log('uhhhh');
    return (
      <div style={{color: 'white'}}>
        <div>Current Word: {this.props.currentWord}</div>
        <div>Time Left: {Math.ceil(this.props.timeLeft / 1000)} seconds</div>
      </div>
    );
  }
}


export class GameModeHotSeatScene extends Phaser.Scene {
  network: IPhoenixChannel;
  preload = () => { };
  create = () => {
    const channels = ServiceContainer.getService(CastToPhoenixChannelService);
    this.network = channels.getChannel("room:" + window.gameInfo.game_id);
    this.network.onConnect(this.setup);
  };

  setup = async () => {
    const { current_word, current_category, time_left_ms } = await this.network.sendRPC<{
      current_word: string;
      current_category: string;
      time_left_ms: number;
    }>("get_current");

    const cameraCenterX = this.cameras.main.centerX;
    const cameraCenterY = this.cameras.main.centerY;

    // const text = this.add.text(cameraCenterX, cameraCenterY, current_word, {
    //   fontFamily: "Arial",
    //   fontSize: "3vw",
    //   color: "#fff",
    // });

    const ui = this.add.react(cameraCenterX, cameraCenterY, HotSeatUI, { currentWord: current_word, timeLeft: time_left_ms });

    setInterval(()=>{
      ui.setProps({ timeLeft: ui.props.timeLeft - 1000 });
    }, 1000);

    this.network.subscribe('game:start', ()=>{

    });

    this.network.subscribe("game:update", (update) => {
      ui.setProps({ currentWord: update.current_word });
    });

    this.network.subscribe("game:over", (update) => {
      // game over
      ui.setProps({ currentWord: "GAME OVER" });
    });
  };
  update = (time: number, delta: number) => { };
}
