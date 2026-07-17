import Phaser from 'phaser';
import { gameSession } from './GameSession';
import {
  CROWD_AUDIO,
  FLOP_AUDIO,
  FLOP_CROWD_AUDIO,
  FREE_THROW_MADE_AUDIO,
  FREE_THROW_MISS_AUDIO,
  PLAYER_NAME_AUDIO,
  WINNER_INTRO_AUDIO,
  type AudioAssetDefinition,
} from './AudioManifest';

const MUSIC_VOLUME = 0.12;
const DUCKED_MUSIC_VOLUME = 0.035;
const WHISTLE_VOLUME = 0.72;
const PLAYER_NAME_VOLUME = 0.86;
const COMMENTARY_VOLUME = 0.88;
const RESULT_VOLUME = 0.84;
const CROWD_VOLUME = 0.54;
const FLOP_CROWD_VOLUME = 0.28;
const FLOP_CROWD_DUCKED_VOLUME = 0.11;
const WINNER_INTRO_VOLUME = 0.9;

let backgroundMusic: Phaser.Sound.BaseSound | undefined;
let unlockListenerAttached = false;
let activePlayerName: Phaser.Sound.BaseSound | undefined;
let activeCommentary: Phaser.Sound.BaseSound | undefined;
let activeResult: Phaser.Sound.BaseSound | undefined;
let activeCrowd: Phaser.Sound.BaseSound | undefined;
let activeFlopCrowd: Phaser.Sound.BaseSound | undefined;
let activeWinnerSequence: Phaser.Sound.BaseSound | undefined;
let winnerSequenceToken = 0;
let duckingSounds = 0;
let lastMadeKey = '';
let lastMissKey = '';
let lastFlopKey = '';
let lastFlopCrowdKey = '';

function applySoundVolume(sound: Phaser.Sound.BaseSound, volume: number): void {
  const adjustable = sound as unknown as { setVolume?: (value: number) => unknown };
  adjustable.setVolume?.(volume);
}

function setMusicVolume(volume: number): void {
  if (!backgroundMusic || backgroundMusic.pendingRemove) return;
  applySoundVolume(backgroundMusic, volume);
}

function beginDuck(): void {
  duckingSounds += 1;
  setMusicVolume(DUCKED_MUSIC_VOLUME);
}

function endDuck(): void {
  duckingSounds = Math.max(0, duckingSounds - 1);
  if (duckingSounds === 0) setMusicVolume(MUSIC_VOLUME);
}

function getBackgroundMusic(scene: Phaser.Scene): Phaser.Sound.BaseSound | undefined {
  if (!scene.cache.audio.exists('backgroundMusic')) return undefined;
  if (!backgroundMusic || backgroundMusic.pendingRemove) {
    backgroundMusic = scene.sound.add('backgroundMusic', {
      loop: true,
      volume: MUSIC_VOLUME,
    });
  }
  return backgroundMusic;
}

function startBackgroundMusic(scene: Phaser.Scene): void {
  const music = getBackgroundMusic(scene);
  if (!music || !gameSession.soundEnabled) return;
  const targetVolume = duckingSounds > 0 ? DUCKED_MUSIC_VOLUME : MUSIC_VOLUME;
  applySoundVolume(music, targetVolume);
  if (music.isPaused) {
    music.resume();
    return;
  }
  if (!music.isPlaying) music.play({ loop: true, volume: targetVolume });
}

function chooseDifferent(definitions: AudioAssetDefinition[], previousKey: string): AudioAssetDefinition | undefined {
  if (!definitions.length) return undefined;
  const choices = definitions.length > 1 ? definitions.filter((item) => item.key !== previousKey) : definitions;
  return choices[Math.floor(Math.random() * choices.length)] ?? definitions[0];
}

function playVoice(
  scene: Phaser.Scene,
  key: string,
  volume: number,
  onFinished?: () => void,
): Phaser.Sound.BaseSound | undefined {
  if (!gameSession.soundEnabled || !key || !scene.cache.audio.exists(key)) {
    onFinished?.();
    return undefined;
  }

  const sound = scene.sound.add(key, { volume });
  let finished = false;
  beginDuck();

  const finish = () => {
    if (finished) return;
    finished = true;
    endDuck();
    onFinished?.();
    if (!sound.pendingRemove) sound.destroy();
  };

  sound.once(Phaser.Sound.Events.COMPLETE, finish);
  sound.once(Phaser.Sound.Events.STOP, finish);
  sound.play();
  return sound;
}

export function ensureBackgroundMusic(scene: Phaser.Scene): void {
  if (!scene.cache.audio.exists('backgroundMusic')) return;

  if (scene.sound.locked) {
    if (!unlockListenerAttached) {
      unlockListenerAttached = true;
      scene.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        unlockListenerAttached = false;
        startBackgroundMusic(scene);
      });
    }
    return;
  }

  startBackgroundMusic(scene);
}

export function setSoundEnabled(scene: Phaser.Scene, enabled: boolean): void {
  gameSession.soundEnabled = enabled;
  const music = getBackgroundMusic(scene);
  if (!music) return;
  if (!enabled) {
    winnerSequenceToken += 1;
    activePlayerName?.stop();
    activeCommentary?.stop();
    activeResult?.stop();
    activeCrowd?.stop();
    activeFlopCrowd?.stop();
    activeWinnerSequence?.stop();
    if (music.isPlaying) music.pause();
    return;
  }
  startBackgroundMusic(scene);
}

export function playRecordedWhistle(scene: Phaser.Scene): void {
  if (!gameSession.soundEnabled || !scene.cache.audio.exists('refereeWhistle')) return;
  scene.sound.play('refereeWhistle', { volume: WHISTLE_VOLUME });
}

export function playPlayerName(scene: Phaser.Scene, characterId: string, onFinished?: () => void): void {
  const definition = PLAYER_NAME_AUDIO[characterId];
  if (!definition) {
    onFinished?.();
    return;
  }
  if (activePlayerName?.isPlaying) activePlayerName.stop();
  activePlayerName = playVoice(scene, definition.key, PLAYER_NAME_VOLUME, () => {
    activePlayerName = undefined;
    onFinished?.();
  });
}

export function playFlopCommentary(
  scene: Phaser.Scene,
  requestedKey: string | undefined,
  onFinished: () => void,
): string | undefined {
  const requested = requestedKey && requestedKey !== lastFlopKey
    ? FLOP_AUDIO.find((item) => item.key === requestedKey)
    : undefined;
  const definition = requested ?? chooseDifferent(FLOP_AUDIO, lastFlopKey);
  if (!definition) {
    onFinished();
    return undefined;
  }
  lastFlopKey = definition.key;

  const startCommentary = () => {
    if (!scene.scene.isActive()) {
      onFinished();
      return;
    }
    if (activeCommentary?.isPlaying) activeCommentary.stop();
    activeCommentary = playVoice(scene, definition.key, COMMENTARY_VOLUME, () => {
      activeCommentary = undefined;
      onFinished();
    });
  };

  // A long free-throw result call can still be finishing when the server moves
  // into the next flop. Poll until it is complete rather than allowing two
  // commentary recordings to play over one another.
  const waitForResultAudio = () => {
    if (!scene.scene.isActive()) {
      onFinished();
      return;
    }
    if (activeResult?.isPlaying) {
      scene.time.delayedCall(80, waitForResultAudio);
      return;
    }
    startCommentary();
  };

  waitForResultAudio();
  return definition.key;
}

export function playFlopCrowd(scene: Phaser.Scene): string | undefined {
  if (!gameSession.soundEnabled) return undefined;
  const definition = chooseDifferent(FLOP_CROWD_AUDIO, lastFlopCrowdKey);
  if (!definition || !scene.cache.audio.exists(definition.key)) return undefined;

  lastFlopCrowdKey = definition.key;
  if (activeFlopCrowd?.isPlaying) activeFlopCrowd.stop();
  const sound = scene.sound.add(definition.key, { volume: FLOP_CROWD_VOLUME });
  activeFlopCrowd = sound;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (activeFlopCrowd === sound) activeFlopCrowd = undefined;
    if (!sound.pendingRemove) sound.destroy();
  };
  sound.once(Phaser.Sound.Events.COMPLETE, finish);
  sound.once(Phaser.Sound.Events.STOP, finish);
  sound.play();

  // Keep the opening crowd hit energetic with the whistle, then quickly lower
  // it so the spoken flop commentary remains clear.
  scene.time.delayedCall(650, () => {
    if (!sound.pendingRemove && sound.isPlaying) applySoundVolume(sound, FLOP_CROWD_DUCKED_VOLUME);
  });
  scene.time.delayedCall(1900, () => {
    if (!sound.pendingRemove && sound.isPlaying) applySoundVolume(sound, 0.065);
  });
  return definition.key;
}

export function playCrowd(scene: Phaser.Scene): void {
  if (activeCrowd?.isPlaying) activeCrowd.stop();
  activeCrowd = playVoice(scene, CROWD_AUDIO.key, CROWD_VOLUME, () => {
    activeCrowd = undefined;
  });
}

export function playFreeThrowResult(
  scene: Phaser.Scene,
  made: boolean,
  requestedKey?: string,
  onFinished?: () => void,
): string | undefined {
  if (activeResult?.isPlaying) activeResult.stop();
  const definitions = made ? FREE_THROW_MADE_AUDIO : FREE_THROW_MISS_AUDIO;
  const previous = made ? lastMadeKey : lastMissKey;
  const requested = requestedKey && requestedKey !== previous
    ? definitions.find((item) => item.key === requestedKey)
    : undefined;
  const definition = requested ?? chooseDifferent(definitions, previous);
  if (!definition) {
    if (made) playCrowd(scene);
    onFinished?.();
    return undefined;
  }

  if (made) lastMadeKey = definition.key;
  else lastMissKey = definition.key;

  activeResult = playVoice(scene, definition.key, RESULT_VOLUME, () => {
    activeResult = undefined;
    onFinished?.();
  });
  if (made) playCrowd(scene);
  return definition.key;
}

export function playWinnerAnnouncement(scene: Phaser.Scene, characterId: string): void {
  winnerSequenceToken += 1;
  const token = winnerSequenceToken;
  activeWinnerSequence?.stop();
  activePlayerName?.stop();
  activeCrowd?.stop();

  const playWinnerName = () => {
    if (token !== winnerSequenceToken) return;
    const definition = PLAYER_NAME_AUDIO[characterId];
    if (!definition) {
      playWinnerCrowd();
      return;
    }
    activeWinnerSequence = playVoice(scene, definition.key, PLAYER_NAME_VOLUME, playWinnerCrowd);
  };

  const playWinnerCrowd = () => {
    if (token !== winnerSequenceToken) return;
    activeWinnerSequence = playVoice(scene, CROWD_AUDIO.key, CROWD_VOLUME, () => {
      if (token === winnerSequenceToken) activeWinnerSequence = undefined;
    });
  };

  activeWinnerSequence = playVoice(scene, WINNER_INTRO_AUDIO.key, WINNER_INTRO_VOLUME, playWinnerName);
}

export function stopWinnerAnnouncement(): void {
  winnerSequenceToken += 1;
  activeWinnerSequence?.stop();
  activeWinnerSequence = undefined;
}
