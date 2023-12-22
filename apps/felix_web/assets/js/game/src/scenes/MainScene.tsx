import Phaser from "phaser";
import "../utils/phaser/PRDE";

import Vector2Spring from "../utils/springs/Vector2Spring";
import { SquashAndStretchVector2 } from "../utils/SquashAndStretch";
import ServiceContainer from "../services/ServiceContainer";
import { CastToPhoenixChannelService } from "../services/PhoenixChannelService.gen";
import QuakeEffect, { QuakeEffectMode } from "../utils/phaser/fx/QuakeEffect";
import React, { FormEvent } from "react";

import styled from 'styled-components';
import PhaserReactDOMElement from "../utils/phaser/PRDE";
import ReactDOM from "react-dom";

declare global {
  interface Window {
    gameInfo: {
      game_id: string;
    };
  }
}

const PromptContainer = styled.div`
  background-color: #fff;
  padding: 5px;
  border-radius: 5px;
  box-shadow: 0 0 5px #000;
`;

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
      <PromptContainer>
        <form onSubmit={this.onFormSubmit}>
          <h2>input text here</h2>
          <input
            type="text"
            defaultValue={this.state.currentInput}
            onChange={this.onInputChange}
            onBlur={this.onInputChange}
          />
        </form>
      </PromptContainer>
    );
  }
}

const ConnectingDialogContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
`;


const ConnectingDialogContent = styled.div`
  background-color: #fff;
  padding: 5px;
  border-radius: 5px;
  box-shadow: 0 0 5px #000;
  z-index: 1;
  position: absolute;
  display: inline;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
`;

const ConnectingDialogBackgroundDim = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  background-color: #000;
  opacity: 0.7;
  width: 100%;
  height: 100%;
  z-index: 0;
`;

class ConnectingDialog extends React.PureComponent {
  container: HTMLDivElement;
  constructor(props: any) {
    super(props);
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
  }

  componentWillUnmount() {
    document.body.removeChild(this.container);
  }

  render() {
    return ReactDOM.createPortal(
      <>
        <ConnectingDialogContainer>
          <ConnectingDialogBackgroundDim />
          <ConnectingDialogContent>connecting...</ConnectingDialogContent>
        </ConnectingDialogContainer>
      </>
      , this.container);
  }
}


const marioWidth = 32;
const marioHeight = 32;

export default class MainScene extends Phaser.Scene {
  private mario: Phaser.GameObjects.Image;
  private marioSpring = new Vector2Spring(0.125, 0.5);
  private marioSquash = new SquashAndStretchVector2(
    { x: marioWidth, y: marioHeight },
    25,
    100
  );

  private cameraSpring = new Vector2Spring(1, 1);

  preload = () => {
    this.load.image("mario", "https://i.imgur.com/nKgMvuj.png");
    // this.load.image("background", "https://i.imgur.com/dzpw15B.jpg");
    this.load.image("fog-dot", "https://i.imgur.com/anJLPER.png");
  };
  create = () => {
    const channels = ServiceContainer.getService(CastToPhoenixChannelService);
    const network = channels.getChannel("room:" + window.gameInfo.game_id);

    let connectionDialog: PhaserReactDOMElement<{}> | null = null;

    if (!network.isConnected) {
      connectionDialog = this.add.react(0, 0, ConnectingDialog);
    }

    network.onConnect(() => {
      if (connectionDialog) {
        connectionDialog.destroy();
        connectionDialog = null;
      }

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

      this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        this.marioSpring.setGoal({ x: pointer.worldX, y: pointer.worldY });
      });

    });

    this.mario = this.add
      .image(32, 32, "mario")
      .setDisplaySize(marioWidth, marioHeight);
  };

  update = (time: number, deltaMs: number) => {
    this.marioSpring.update(deltaMs / 1000);
    this.mario.x = this.marioSpring.Value.x;
    this.mario.y = this.marioSpring.Value.y;

    this.cameraSpring.setGoal(this.mario);
    this.cameraSpring.update(deltaMs / 1000);
    this.cameras.main.setScroll(
      this.cameraSpring.Value.x - this.scale.width / 2,
      this.cameraSpring.Value.y - this.scale.height / 2
    );


    const size = this.marioSquash.getValue(
      this.marioSpring.Velocity.x,
      this.marioSpring.Velocity.y
    );
    this.mario.setDisplaySize(size.x, size.y);
  };
}
