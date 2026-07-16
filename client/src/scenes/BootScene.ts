import Phaser from 'phaser';
import {
  FLOP_AUDIO,
  FREE_THROW_MADE_AUDIO,
  FREE_THROW_MISS_AUDIO,
  PLAYER_NAME_AUDIO,
  WINNER_INTRO_AUDIO,
  CROWD_AUDIO,
  FLOP_CROWD_AUDIO,
} from '../game/AudioManifest';
import { CHARACTERS } from '../game/characters';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload(): void {
    this.load.image('titleBg', 'assets/floppersTitleBg.jpg');
    this.load.image('courtBg', 'assets/floppersCourt.jpg');
    this.load.image('lobbyBg', 'assets/floppersLobbyResultsScene.jpg');
    this.load.image('gameBg', 'assets/floppersGameScene.jpg');
    this.load.image('fosterFace', 'assets/fosterFace.png');
    CHARACTERS.forEach((character) => {
      this.load.image(`player-face-${character.id}`, `assets/playerFaces/${character.id}.png`);
    });
    this.load.audio('backgroundMusic', 'assets/flopperMusic.mp3');
    this.load.audio('refereeWhistle', 'assets/whistle.mp3');

    Object.values(PLAYER_NAME_AUDIO).forEach(({ key, path }) => this.load.audio(key, path));
    this.load.audio(WINNER_INTRO_AUDIO.key, WINNER_INTRO_AUDIO.path);
    this.load.audio(CROWD_AUDIO.key, CROWD_AUDIO.path);
    [...FLOP_AUDIO, ...FLOP_CROWD_AUDIO, ...FREE_THROW_MADE_AUDIO, ...FREE_THROW_MISS_AUDIO]
      .forEach(({ key, path }) => this.load.audio(key, path));
  }

  create(): void {
    this.scene.start('StartScene');
  }
}
