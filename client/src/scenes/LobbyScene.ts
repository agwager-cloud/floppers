import Phaser from 'phaser';
import { CHARACTERS, characterById } from '../game/characters';
import { gameSession } from '../game/GameSession';
import { network } from '../game/Network';
import { routeForRoom } from '../game/SceneRouter';
import { addBackground, addButton, addHeader, addPanel, COLORS, showToast } from '../game/Ui';
import { createJerseyBadge, shrinkTextToFit } from '../game/Visuals';
import type { PlayerState, RoomState } from '../game/types';

const BOT_PREVIEW_NAMES = [
  'Airball Albert', 'Backboard Barry', 'Brickhouse Brenda', 'Travelin Trevor', 'Flopzilla Frank', 'Whistle Wendy',
  'No-Look Noodle', 'Pump-Fake Pete', 'Double-Dribble Dave', 'Technical Terry', 'Benchwarmer Ben', 'Layup Larry',
  'Free-Throw Fiona', 'Crossover Colin', 'Buzzer-Beater Bob', 'Ankle-Breaker Annie', 'Shot-Clock Sharon', 'Paint-Camper Pam',
  'Screen-Setter Steve', 'Euro-Step Eugene', 'Rebound Randy', 'Hook-Shot Holly', 'Timeout Tina', 'Full-Court Fred',
  'Three-Point Theo', 'Box-Out Betty', 'Swish McDish', 'Loose-Ball Lou', 'Charge-Card Charlie', 'Rim-Rattler Rita',
  'Fast-Break Felix', 'Overtime Ollie',
];

export class LobbyScene extends Phaser.Scene {
  private cleanups: Array<() => void> = [];
  private currentSize = 8;
  private signature = '';

  constructor() {
    super('LobbyScene');
  }

  create(): void {
    addBackground(this, 'lobbyBg');
    this.add.rectangle(640, 360, 1280, 720, 0x050718, 0.3);
    addHeader(this, 'TOURNAMENT LOBBY');

    this.currentSize = gameSession.room?.tournamentSize ?? 8;
    this.signature = this.makeSignature(gameSession.room);
    addPanel(this, 438, 384, 808, 572, 0.91);
    addPanel(this, 1068, 384, 350, 572, 0.93);

    this.add.text(74, 96, `BRACKET ENTRANTS • ${this.currentSize}`, { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff' });
    this.drawPlayers(this.buildPreviewEntries());
    this.drawHostControls();

    this.cleanups.push(network.onState((room) => this.handleState(room)));
    this.cleanups.push(network.onError((message) => showToast(this, message)));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private buildPreviewEntries(): PlayerState[] {
    const humans = gameSession.room?.players.filter((player) => !player.isBot) ?? [];
    const actualBots = gameSession.room?.players.filter((player) => player.isBot) ?? [];
    if (actualBots.length) return [...humans, ...actualBots].slice(0, this.currentSize);

    const used = new Set(humans.map((player) => player.characterId).filter(Boolean));
    const availableCharacters = CHARACTERS.filter((character) => !used.has(character.id));
    const previews: PlayerState[] = [];
    const botsNeeded = Math.max(0, this.currentSize - humans.length);
    for (let index = 0; index < botsNeeded; index += 1) {
      previews.push({
        id: `preview-bot-${index}`,
        name: BOT_PREVIEW_NAMES[index % BOT_PREVIEW_NAMES.length],
        isHost: false,
        isBot: true,
        connected: true,
        characterId: availableCharacters[index % availableCharacters.length]?.id,
      });
    }
    return [...humans, ...previews];
  }

  private drawPlayers(players: PlayerState[]): void {
    const maxSlots = 32;
    for (let index = 0; index < maxSlots; index += 1) {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 145 + col * 194;
      const y = 151 + row * 62;
      const inBracket = index < this.currentSize;
      const player = inBracket ? players[index] : undefined;
      const character = characterById(player?.characterId);
      const bg = this.add.rectangle(x, y, 176, 50, player ? 0x18265a : 0x090d29, player ? 0.97 : inBracket ? 0.68 : 0.35)
        .setStrokeStyle(2, player ? character.accent : inBracket ? 0x6474bb : 0x303858, inBracket ? 0.92 : 0.45);

      if (player) {
        const jersey = createJerseyBadge(this, x - 67, y, character.primary, character.secondary, character.accent, character.number, 0.38);
        if (player.id.startsWith('preview-bot-')) jersey.setAlpha(0.82);

        const actualName = this.add.text(x - 44, y - 13, `${index + 1}. ${player.name}`, {
          fontFamily: 'Arial Black, Arial', fontSize: '10px', color: player.id === gameSession.playerId ? '#fff04a' : '#ffffff',
        }).setOrigin(0, 0.5);
        shrinkTextToFit(actualName, 111, 6.5);

        const parodyName = this.add.text(x - 44, y + 1, character.name, {
          fontFamily: 'Arial Black, Arial', fontSize: '8px', color: '#7ee8ff',
        }).setOrigin(0, 0.5);
        shrinkTextToFit(parodyName, 111, 5.5);

        const role = player.isHost ? 'HOST' : player.isBot ? 'BOT • AUTO-FILL' : character.city.toUpperCase();
        const roleText = this.add.text(x - 44, y + 15, role, {
          fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: '7px', color: player.isHost ? '#ffc928' : player.isBot ? '#67f2a8' : '#b9c3e6',
        }).setOrigin(0, 0.5);
        shrinkTextToFit(roleText, 111, 5.5);

        if (gameSession.isHost && !player.isHost && !player.isBot) {
          const kick = this.add.text(x + 72, y, '×', { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ff7182' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          kick.on('pointerup', () => network.send({ type: 'KICK_PLAYER', playerId: player.id }));
        }
      } else {
        this.add.text(x, y, inBracket ? `${index + 1}. OPEN` : `${index + 1}. NOT IN BRACKET`, {
          fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: inBracket ? '11px' : '9px', color: inBracket ? '#7885b9' : '#434b70',
        }).setOrigin(0.5);
      }
      bg.setDepth(0);
    }
  }

  private drawHostControls(): void {
    const x = 1068;
    this.add.text(x, 128, gameSession.isHost ? 'HOST SETTINGS' : 'WAITING FOR HOST', {
      fontFamily: 'Arial Black, Arial', fontSize: '21px', color: '#ffffff',
    }).setOrigin(0.5);

    this.add.text(x, 176, 'TOURNAMENT SIZE', { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#cbd4ff' }).setOrigin(0.5);
    const sizes = [2, 4, 8, 16, 32];
    sizes.forEach((size, index) => {
      addButton(this, 955 + (index % 3) * 118, 225 + Math.floor(index / 3) * 58, 105, 44, String(size), () => {
        if (!gameSession.isHost) return;
        network.send({ type: 'SET_TOURNAMENT_SIZE', size });
      }, { fill: size === this.currentSize ? COLORS.gold : COLORS.blue, fontSize: 18, disabled: !gameSession.isHost });
    });

    const humanCount = gameSession.room?.players.filter((player) => !player.isBot).length ?? 0;
    const botsNeeded = Math.max(0, this.currentSize - humanCount);
    this.add.text(x, 357, `HUMANS  ${humanCount}\nAUTO-FILL BOTS  ${botsNeeded}\nTOTAL ENTRANTS  ${this.currentSize}`, {
      fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffff', align: 'center', lineSpacing: 9,
    }).setOrigin(0.5);

    this.add.text(x, 470, 'The green BOT cards on the left preview every automatic entrant. Press Create Bracket to lock them in and randomise the matchups.', {
      fontSize: '13px', color: '#cbd4ff', align: 'center', wordWrap: { width: 292 }, lineSpacing: 5,
    }).setOrigin(0.5);

    addButton(this, x, 584, 292, 68, gameSession.isHost ? `CREATE ${this.currentSize}-PLAYER\nBRACKET` : 'WAITING FOR HOST', () => {
      if (!gameSession.isHost) return;
      network.send({ type: 'CREATE_TOURNAMENT' });
    }, { fill: COLORS.green, fontSize: 16, disabled: !gameSession.isHost });
  }

  private handleState(room: RoomState): void {
    gameSession.room = room;
    if (room.status !== 'SETUP') {
      routeForRoom(this, room);
      return;
    }
    const nextSignature = this.makeSignature(room);
    if (nextSignature !== this.signature) this.scene.restart();
  }

  private makeSignature(room: RoomState | null): string {
    return JSON.stringify({ size: room?.tournamentSize, players: (room?.players ?? []).map((player) => [player.id, player.name, player.characterId]) });
  }


  private cleanup(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}
