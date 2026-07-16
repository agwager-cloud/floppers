import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { StartScene } from './scenes/StartScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { LobbyScene } from './scenes/LobbyScene';
import { TournamentScene } from './scenes/TournamentScene';
import { FlopScene } from './scenes/FlopScene';
import { FreeThrowScene } from './scenes/FreeThrowScene';
import { FinalResultsScene } from './scenes/FinalResultsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#080b22',
  scene: [
    BootScene,
    StartScene,
    CharacterSelectScene,
    LobbyScene,
    TournamentScene,
    FlopScene,
    FreeThrowScene,
    FinalResultsScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  input: {
    activePointers: 4,
  },
  dom: {
    createContainer: true,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
};

new Phaser.Game(config);
