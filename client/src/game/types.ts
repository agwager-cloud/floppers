export type RoomStatus = 'SETUP' | 'BRACKET' | 'ACTIVE' | 'COMPLETE';
export type MatchPhase = 'WAITING' | 'FLOP' | 'FREE_THROW' | 'COMPLETE';

export interface CharacterDefinition {
  id: string;
  name: string;
  city: string;
  number: number;
  primary: number;
  secondary: number;
  accent: number;
  skin: number;
}

export interface PlayerState {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  isSpectator?: boolean;
  characterId?: string;
}

export interface MatchState {
  id: string;
  round: number;
  slot: number;
  playerAId: string;
  playerBId: string;
  scoreA: number;
  scoreB: number;
  phase: MatchPhase;
  activeShooterId: string;
  attemptsRemaining: number;
  floppedPlayerIds: string[];
  shotInFlight: boolean;
  lastShot?: {
    id: string;
    shooterId: string;
    made: boolean;
    direction: number;
    power: number;
    resolvedAt: number;
    resultAudioKey?: string;
  };
  turnReadyAt?: number;
  turnStartedAt?: number;
  turnDeadlineAt?: number;
  distractionWindowClosesAt?: number;
  turnId?: string;
  meterFirstPerfectAt?: number;
  meterSecondPerfectAt?: number;
  meterDirectionHalfCycles?: number;
  meterPowerHalfCycles?: number;
  meterDirectionSign?: number;
  meterPowerSign?: number;
  winnerId?: string;
  commentary: string;
  flopStyle: string;
  flopAudioKey?: string;
  distraction?: {
    type: string;
    byPlayerId: string;
    startedAt: number;
    expiresAt: number;
  };
  distractionUsedByPlayerId?: string;
}

export interface RoomState {
  code: string;
  status: RoomStatus;
  players: PlayerState[];
  tournamentSize: number;
  roundNumber: number;
  matches: MatchState[];
  currentRoundMatchIds: string[];
  finalWinnerId?: string;
}

export type ClientMessage =
  | { type: 'HOST_ROOM'; name: string }
  | { type: 'JOIN_ROOM'; name: string; code: string }
  | { type: 'SELECT_CHARACTER'; characterId: string }
  | { type: 'SET_TOURNAMENT_SIZE'; size: number }
  | { type: 'CREATE_TOURNAMENT' }
  | { type: 'START_ROUND' }
  | { type: 'SHOT'; matchId: string; direction: number; power: number }
  | { type: 'DISTRACT'; matchId: string; distractionType: string }
  | { type: 'RESET_TOURNAMENT' }
  | { type: 'CHANGE_PLAYERS' }
  | { type: 'RETURN_TO_LOBBY' }
  | { type: 'KICK_PLAYER'; playerId: string };

export type ServerMessage =
  | { type: 'WELCOME'; playerId: string; room: RoomState }
  | { type: 'ROOM_STATE'; room: RoomState }
  | { type: 'ERROR'; message: string };
