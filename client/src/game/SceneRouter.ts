import Phaser from 'phaser';
import { gameSession } from './GameSession';
import type { RoomState } from './types';

export function routeForRoom(scene: Phaser.Scene, room: RoomState): void {
  gameSession.room = room;
  if (room.status === 'COMPLETE') {
    if (scene.scene.key !== 'FinalResultsScene') scene.scene.start('FinalResultsScene');
    return;
  }

  if (room.status === 'ACTIVE') {
    const match = gameSession.getRelevantMatch();
    if (!match || match.phase === 'COMPLETE') {
      if (scene.scene.key !== 'TournamentScene') scene.scene.start('TournamentScene');
      return;
    }
    if (match.phase === 'FLOP' && scene.scene.key !== 'FlopScene') {
      scene.scene.start('FlopScene');
    } else if (match.phase === 'FREE_THROW' && scene.scene.key !== 'FreeThrowScene') {
      scene.scene.start('FreeThrowScene');
    }
    return;
  }

  if (room.status === 'BRACKET') {
    if (scene.scene.key !== 'TournamentScene') scene.scene.start('TournamentScene');
    return;
  }

  if (room.status === 'SETUP') {
    if (gameSession.me?.characterId) {
      if (scene.scene.key !== 'LobbyScene') scene.scene.start('LobbyScene');
    } else if (scene.scene.key !== 'CharacterSelectScene') {
      scene.scene.start('CharacterSelectScene');
    }
  }
}
