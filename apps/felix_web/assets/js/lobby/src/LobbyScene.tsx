import Phaser from "phaser";
import React, { FormEvent } from "react";
import { CastToPhoenixChannelService } from "../../game/src/services/PhoenixChannelService.gen";
import ServiceContainer from "../../game/src/services/ServiceContainer";
import { SquashAndStretchVector2 } from "../../game/src/utils/SquashAndStretch";
import QuakeEffect, { QuakeEffectMode } from "../../game/src/utils/phaser/fx/QuakeEffect";
import Vector2Spring from "../../game/src/utils/springs/Vector2Spring";

type PromptProps = {
  onSubmit: (input: string) => void;
};
class Prompt extends React.PureComponent<PromptProps> {
  state = {
    currentInput: "",
  };

  onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ currentInput: e.target.value });
  };

  onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    this.props.onSubmit(this.state.currentInput);
  };

  render(): React.ReactNode {
    return (
      <div>
        <form onSubmit={this.onFormSubmit}>
          <h2>input text here</h2>
          <input
            type="text"
            defaultValue={this.state.currentInput}
            onChange={this.onInputChange}
            onBlur={this.onInputChange}
          />
        </form>
      </div>
    );
  }
}

export default class LobbyScene extends Phaser.Scene {
  private mario: Phaser.GameObjects.Image;
  private marioSpring = new Vector2Spring(0.125, 0.5);
  private marioSquash = new SquashAndStretchVector2({ x: 32, y: 32 }, 25, 100);

  preload = () => {
    this.load.image("mario", "https://i.imgur.com/nKgMvuj.png");
    // this.load.image("background", "https://i.imgur.com/dzpw15B.jpg");
    this.load.image("fog-dot", "https://i.imgur.com/anJLPER.png");
  };
  create = () => {
    const channelService = ServiceContainer.getService(CastToPhoenixChannelService);
    const network = channelService.getChannel("lobby");

    network.subscribe("shout", (msg: string) => {
      // display message in a random spot on the screen
      const txt = this.add.text(
        Phaser.Math.Between(0, 800),
        Phaser.Math.Between(0, 600),
        msg,
        {
          color: "#fff",
          fontSize: "16px",
        }
      );

      new QuakeEffect(this, txt, 25, 1000, QuakeEffectMode.WeakerOverTime);
    });

    network.sendRPC("shout", "hello world!");

    this.add.react(25, 25, Prompt, {
      onSubmit: (input: string) => {
        network.sendRPC("shout", input);
      },
    });

    this.mario = this.add.image(32, 32, "mario").setDisplaySize(32, 32);

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.marioSpring.setGoal(pointer);
    });
  };

  update = (time: number, deltaMs: number) => {
    this.marioSpring.update(deltaMs / 1000);

    this.mario.x = this.marioSpring.Value.x;
    this.mario.y = this.marioSpring.Value.y;

    const size = this.marioSquash.getValue(
      this.marioSpring.Velocity.x,
      this.marioSpring.Velocity.y
    );
    this.mario.setDisplaySize(size.x, size.y);
  };
}
