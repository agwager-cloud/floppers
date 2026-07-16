import Phaser from 'phaser';
import { characterById } from '../game/characters';
import { gameSession } from '../game/GameSession';
import { network } from '../game/Network';
import { routeForRoom } from '../game/SceneRouter';
import { addBackground, addButton, addHeader, addPanel, COLORS, showToast } from '../game/Ui';
import { createJerseyBadge, shrinkTextToFit } from '../game/Visuals';
import type { MatchState, PlayerState, RoomState } from '../game/types';

export class TournamentScene extends Phaser.Scene {
  private cleanups: Array<() => void> = [];
  private signature = '';

  constructor() {
    super('TournamentScene');
  }

  create(): void {
    addBackground(this, 'lobbyBg');
    this.add.rectangle(640, 360, 1280, 720, 0x050718, 0.4);
    const room = gameSession.room;
    const spectator = Boolean(gameSession.me?.isSpectator);
    addHeader(
      this,
      'FOSTER\'S FLOPPERS TOURNAMENT',
      room
        ? spectator
          ? `Round ${room.roundNumber} • SPECTATOR MODE • tap any LIVE matchup to watch`
          : `Round ${room.roundNumber} • Red cards are live • your matchup is highlighted in green`
        : 'Tournament bracket',
    );
    addPanel(this, 640, 378, 1210, 576, 0.93);

    if (!room) {
      showToast(this, 'No room state is available.');
      return;
    }

    this.signature = this.makeSignature(room);
    this.drawRoundProgress(room);
    this.drawCurrentRound(room);
    this.drawControls(room);

    this.cleanups.push(network.onState((nextRoom) => this.handleState(nextRoom)));
    this.cleanups.push(network.onError((message) => showToast(this, message)));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    if (room.status === 'ACTIVE') {
      const ownMatch = room.matches.find((match) => room.currentRoundMatchIds.includes(match.id) && match.phase !== 'COMPLETE' && (match.playerAId === gameSession.playerId || match.playerBId === gameSession.playerId));
      if (ownMatch) {
        gameSession.viewedMatchId = ownMatch.id;
        routeForRoom(this, room);
      }
    }
  }

  private drawRoundProgress(room: RoomState): void {
    const totalRounds = Math.log2(room.tournamentSize);
    const labels: string[] = [];
    for (let round = 1; round <= totalRounds; round += 1) labels.push(this.roundName(round, room.tournamentSize));
    const totalWidth = Math.min(1080, labels.length * 190);
    const gap = totalWidth / labels.length;
    const startX = 640 - totalWidth / 2 + gap / 2;

    labels.forEach((label, index) => {
      const round = index + 1;
      const active = round === room.roundNumber;
      const completed = round < room.roundNumber;
      this.add.rectangle(startX + index * gap, 108, Math.min(172, gap - 10), 30, active ? COLORS.gold : completed ? COLORS.green : 0x1a2454, 0.96)
        .setStrokeStyle(2, active ? 0xffffff : 0x7180c9, 0.9);
      this.add.text(startX + index * gap, 108, `${completed ? '✓ ' : ''}${label}`, {
        fontFamily: 'Arial Black, Arial', fontSize: labels.length > 4 ? '11px' : '13px', color: active ? '#10152f' : '#ffffff',
      }).setOrigin(0.5);
    });
  }

  private drawCurrentRound(room: RoomState): void {
    const matches = room.matches
      .filter((match) => room.currentRoundMatchIds.includes(match.id))
      .sort((a, b) => a.slot - b.slot);
    const count = matches.length;
    if (!count) return;

    const columns = count === 1 ? 1 : count <= 4 ? 2 : 4;
    const rows = Math.ceil(count / columns);
    const gapX = columns === 1 ? 0 : columns === 2 ? 34 : 18;
    const gapY = rows <= 2 ? 26 : 14;
    const areaWidth = 1110;
    const areaHeight = 430;
    const cardWidth = columns === 1 ? 650 : Math.floor((areaWidth - gapX * (columns - 1)) / columns);
    const cardHeight = Math.min(124, Math.floor((areaHeight - gapY * (rows - 1)) / rows));
    const gridWidth = columns * cardWidth + (columns - 1) * gapX;
    const gridHeight = rows * cardHeight + (rows - 1) * gapY;
    const startX = 640 - gridWidth / 2 + cardWidth / 2;
    const startY = 370 - gridHeight / 2 + cardHeight / 2;

    matches.forEach((match, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      this.drawMatchCard(match, room.players, startX + col * (cardWidth + gapX), startY + row * (cardHeight + gapY), cardWidth, cardHeight, room);
    });
  }

  private drawMatchCard(match: MatchState, players: PlayerState[], x: number, y: number, width: number, height: number, room: RoomState): void {
    const playerA = players.find((player) => player.id === match.playerAId);
    const playerB = players.find((player) => player.id === match.playerBId);
    const characterA = characterById(playerA?.characterId);
    const characterB = characterById(playerB?.characterId);
    const isCurrent = room.currentRoundMatchIds.includes(match.id);
    const live = isCurrent && room.status === 'ACTIVE' && match.phase !== 'COMPLETE';
    const complete = match.phase === 'COMPLETE';
    const ready = room.status === 'BRACKET' && match.phase === 'WAITING';
    const containsMe = playerA?.id === gameSession.playerId || playerB?.id === gameSession.playerId;
    const border = live ? COLORS.red : complete ? COLORS.green : ready ? COLORS.gold : 0x7180c9;
    const fill = containsMe ? 0x173f39 : live ? 0x273c80 : complete ? 0x15344b : 0x10183f;

    if (containsMe) {
      this.add.rectangle(x, y, width + 16, height + 16, 0x7df2a4, 0.30)
        .setStrokeStyle(3, 0xb7ffd0, 0.98);
    }
    const bg = this.add.rectangle(x, y, width, height, fill, 0.98)
      .setStrokeStyle(live ? 4 : 3, containsMe ? 0x7df2a4 : border, 1);

    const compact = height < 100;
    const jerseyScale = compact ? 0.34 : 0.44;
    const leftX = x - width / 2 + (compact ? 27 : 35);
    const nameX = leftX + (compact ? 25 : 33);
    const scoreX = x + width / 2 - (compact ? 23 : 29);
    const rowOffset = compact ? 24 : Math.max(30, height * 0.26);
    const availableNameWidth = Math.max(82, scoreX - nameX - 21);

    const addPlayerRow = (
      player: PlayerState | undefined,
      character: ReturnType<typeof characterById>,
      rowY: number,
      score: number,
      isWinner: boolean,
    ) => {
      createJerseyBadge(this, leftX, rowY, character.primary, character.secondary, character.accent, character.number, jerseyScale);

      const isMe = player?.id === gameSession.playerId;
      const actualLabel = `${isMe ? '★ ' : ''}${player?.name ?? 'TBD'}`;
      const actualName = this.add.text(nameX, rowY - (compact ? 7 : 9), actualLabel, {
        fontFamily: 'Arial Black, Arial',
        fontSize: compact ? '9px' : '12px',
        color: isMe ? '#fff04a' : isWinner ? '#67f2a8' : '#ffffff',
      }).setOrigin(0, 0.5);
      shrinkTextToFit(actualName, availableNameWidth, compact ? 6.5 : 8);

      const parodyName = this.add.text(nameX, rowY + (compact ? 7 : 10), character.name, {
        fontFamily: 'Arial Black, Arial',
        fontSize: compact ? '7.5px' : '9.5px',
        color: '#7ee8ff',
      }).setOrigin(0, 0.5);
      shrinkTextToFit(parodyName, availableNameWidth, compact ? 5.5 : 7);

      this.add.text(scoreX, rowY, String(score), {
        fontFamily: 'Arial Black, Arial',
        fontSize: compact ? '18px' : '25px',
        color: isWinner ? '#67f2a8' : '#ffffff',
        stroke: '#050718',
        strokeThickness: 3,
      }).setOrigin(0.5);
    };

    addPlayerRow(playerA, characterA, y - rowOffset, match.scoreA, match.winnerId === playerA?.id);
    addPlayerRow(playerB, characterB, y + rowOffset, match.scoreB, match.winnerId === playerB?.id);

    if (containsMe) {
      this.add.text(x + width / 2 - 8, y - height / 2 + 7, 'YOUR MATCH', {
        fontFamily: 'Arial Black, Arial',
        fontSize: compact ? '7px' : '9px',
        color: '#082319',
        backgroundColor: '#9affbd',
        padding: { x: 5, y: 2 },
      }).setOrigin(1, 0);
    }

    const status = live ? '● LIVE' : complete ? 'FINAL' : ready ? 'READY' : match.phase.replace('_', ' ');
    this.add.text(x, y, status, {
      fontFamily: 'Arial Black, Arial',
      fontSize: compact ? '8px' : '10px',
      color: live ? '#ff7182' : complete ? '#67f2a8' : ready ? '#fff04a' : '#cbd4ff',
      backgroundColor: 'rgba(5,7,24,.84)',
      padding: { x: 6, y: 2 },
    }).setOrigin(0.5);

    if (live) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setFillStyle(containsMe ? 0x20594c : 0x314993, 1));
      bg.on('pointerout', () => bg.setFillStyle(fill, 0.98));
      bg.on('pointerup', () => {
        gameSession.viewedMatchId = match.id;
        routeForRoom(this, room);
      });
    }
  }

  private drawControls(room: RoomState): void {
    const currentMatches = room.matches.filter((match) => room.currentRoundMatchIds.includes(match.id));
    const waiting = currentMatches.length > 0 && currentMatches.every((match) => match.phase === 'WAITING');
    const completed = currentMatches.length > 0 && currentMatches.every((match) => match.phase === 'COMPLETE');

    if (room.status === 'BRACKET' && waiting) {
      addButton(this, 640, 674, 340, 54, gameSession.isHost ? `BEGIN ${this.roundName(room.roundNumber, room.tournamentSize)}` : 'WAITING FOR HOST', () => {
        if (gameSession.isHost) network.send({ type: 'START_ROUND' });
      }, { fill: COLORS.green, fontSize: 20, disabled: !gameSession.isHost });
    } else if (room.status === 'ACTIVE') {
      const activeMessage = completed
        ? 'ROUND COMPLETE — PREPARING THE NEXT BRACKET'
        : gameSession.me?.isSpectator
          ? 'SPECTATOR MODE — TAP ANY LIVE MATCHUP TO WATCH'
          : 'ALL HUMAN MATCHUPS ARE PLAYING SIMULTANEOUSLY';
      this.add.text(640, 674, activeMessage, {
        fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffffff', backgroundColor: 'rgba(7,11,34,.94)', padding: { x: 18, y: 10 },
      }).setOrigin(0.5);
    }
  }

  private handleState(room: RoomState): void {
    gameSession.room = room;
    if (room.status === 'COMPLETE') {
      routeForRoom(this, room);
      return;
    }
    if (room.status === 'ACTIVE') {
      const match = gameSession.getRelevantMatch();
      if (match && match.phase !== 'COMPLETE') {
        routeForRoom(this, room);
        return;
      }
    }
    const nextSignature = this.makeSignature(room);
    if (nextSignature !== this.signature) this.scene.restart();
  }

  private makeSignature(room: RoomState): string {
    return JSON.stringify({ status: room.status, round: room.roundNumber, final: room.finalWinnerId, matches: room.matches.map((match) => [match.id, match.phase, match.scoreA, match.scoreB, match.winnerId]) });
  }

  private wrapName(name: string, maxLineLength = 18): string {
    const tokens = name.replace(/-/g, '- ').split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const token of tokens) {
      const cleaned = token.replace(/\s+-/g, '-');
      const candidate = current ? `${current} ${cleaned}` : cleaned;
      if (candidate.length <= maxLineLength || !current) current = candidate;
      else { lines.push(current.replace(/\s+-/g, '-')); current = cleaned; }
    }
    if (current) lines.push(current.replace(/\s+-/g, '-'));
    return lines.slice(0, 3).join('\n');
  }

  private roundName(round: number, size: number): string {
    const playersLeft = size / 2 ** (round - 1);
    if (playersLeft === 2) return 'FINAL';
    if (playersLeft === 4) return 'SEMI FINALS';
    if (playersLeft === 8) return 'QUARTER FINALS';
    return `ROUND ${round}`;
  }

  private cleanup(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}
