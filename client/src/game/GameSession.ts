import type { MatchState, PlayerState, RoomState } from './types';

class Session {
  playerId = '';
  room: RoomState | null = null;
  soundEnabled = true;
  viewedMatchId = '';

  get me(): PlayerState | undefined {
    return this.room?.players.find((player) => player.id === this.playerId);
  }

  get isHost(): boolean {
    return Boolean(this.me?.isHost);
  }

  getRelevantMatch(): MatchState | undefined {
    const room = this.room;
    if (!room) return undefined;

    const ownActive = room.matches.find(
      (match) =>
        room.currentRoundMatchIds.includes(match.id) &&
        match.phase !== 'COMPLETE' &&
        (match.playerAId === this.playerId || match.playerBId === this.playerId),
    );
    if (ownActive) {
      this.viewedMatchId = ownActive.id;
      return ownActive;
    }

    if (this.viewedMatchId) {
      return room.matches.find((match) => match.id === this.viewedMatchId);
    }

    return undefined;
  }

  playerById(id: string): PlayerState | undefined {
    return this.room?.players.find((player) => player.id === id);
  }
}

export const gameSession = new Session();
