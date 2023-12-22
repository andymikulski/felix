import styled from 'styled-components';
import Phaser from 'phaser';
import React from 'react';
import GameScene from './GameScenes';
import PhaserReactDOMElement from '../utils/phaser/PRDE';

export default class TitleScreenScene extends Phaser.Scene {
  preload = () => {
    this.load.audio('title-screen', 'sounds/title-screen.mp3');
    this.load.audio('game-bg-music', 'sounds/game-music.mp3');

    this.load.image(
      'bg-1',
      'images/backgrounds/parallax-forest-back-trees.png'
    );
    this.load.image(
      'bg-2',
      'images/backgrounds/parallax-forest-middle-trees.png'
    );
    this.load.image('bg-3', 'images/backgrounds/parallax-forest-lights.png');
    this.load.image(
      'bg-4',
      'images/backgrounds/parallax-forest-front-trees.png'
    );
  };

  private layers: Phaser.GameObjects.TileSprite[] = [];
  private bgMusic: Phaser.Sound.BaseSound;
  private ui: PhaserReactDOMElement<any>;
  create = () => {
    this.cameras.main.fadeIn(500);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown);
    this.add.text(0, 0, 'TitleScreenScene', {
      color: '#fff',
      fontSize: '16px',
    });

    // this.bgMusic = this.sound.add('game-bg-music', {
    //   loop: true,
    //   volume: 0.1,
    // });
    // this.bgMusic.play();

    this.layers = [] as Phaser.GameObjects.TileSprite[];
    for (let i = 1; i < 5; i++) {
      const img = this.add
        .tileSprite(0, 0, 272, 160, 'bg-' + i)
        .setDepth(i)
        .setOrigin(0, 0)
        .setDisplaySize(this.scale.width, this.scale.height * 1.05);
      img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.layers.push(img);
      // img.setPipeline
      if (i <= 2 || i === 4) {
        img.setPipeline('waterSurface');
      }
    }

    const centerX = this.cameras.main.worldView.centerX;
    const centerY = this.cameras.main.worldView.centerY;

    this.ui = new PhaserReactDOMElement(this, centerX, centerY, TitleScreenUI, {
      onPlayerStart: this.gotoMainScreen,
    });
    this.add.existing(this.ui);
  };

  update = (_time: number, delta: number) => {
    const mouseX = this.scale.width / 2; // this.input.mousePointer.worldX;
    const mouseY = this.scale.height / 2; // this.input.mousePointer.worldY;

    for (let i = 0; i < this.layers.length; i++) {
      this.layers[i].tilePositionX +=
        0.001 * delta + i * Math.abs(mouseX / this.scale.width) * 0.1;
      this.layers[i].tilePositionY = (this.scale.height - mouseY) * 0.01;
    }
  };

  private isTransitioning = false;
  gotoMainScreen = () => {
    if (this.isTransitioning) {
      return;
    }
    this.isTransitioning = true;
    this.game.scene.add('main scene', GameScene) as GameScene;

    this.cameras.main.fadeOut(
      500,
      undefined,
      undefined,
      undefined,
      (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress >= 1) {
          this.scene.start('main scene');
        }
      }
    );
  };

  onShutdown = () => {
    this.bgMusic?.stop();
  };
}

const TitleContainer = styled.div`
  max-width: 400px;
  text-align: center;
  transform: translate(-50%, -50%);
  position: absolute;
  left: 50%;
  top: 50%;
`;
const TitleH1 = styled.h1`
  font-size: 32px;
  font-family: 'Whacky Joe';
  color: #fff;
  -webkit-text-stroke: 2px #000;
`;
const PlainNESButton = (props: any) => (
  <button
    {...props}
    className={['nes-btn', props.disabled && 'is-disabled', props.className]
      .filter(Boolean)
      .join(' ')}
  />
);
export const NESButton = styled(PlainNESButton)`
  font-family: 'Direct Message Bold';
`;

class TitleScreenUI extends React.PureComponent<{
  onPlayerStart: () => void;
}> {
  render() {
    return (
      <TitleContainer>
        <TitleH1>Game Name Here</TitleH1>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <button
            style={{
              margin: '2em 0 1em',
            }}
            onClick={this.props.onPlayerStart}
          >
            Start
          </button>
          <button disabled>Options</button>
        </div>
      </TitleContainer>
    );
  }
}
