import Phaser from 'phaser';
import { CHARACTERS } from '../game/characters';
import { playPlayerName } from '../game/Audio';
import { gameSession } from '../game/GameSession';
import { network } from '../game/Network';
import { routeForRoom } from '../game/SceneRouter';
import { addBackground, addButton, addHeader, COLORS, showToast } from '../game/Ui';
import { createJerseyBadge, createPlayerPortrait, shrinkTextToFit } from '../game/Visuals';
import type { CharacterDefinition, RoomState } from '../game/types';

export class CharacterSelectScene extends Phaser.Scene {
  private selectedId = '';
  private cardMap = new Map<string, Phaser.GameObjects.Container>();
  private cleanups: Array<() => void> = [];
  private selectionPreview?: Phaser.GameObjects.Container;
  private stateSignature = '';

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    addBackground(this, 'lobbyBg');
    this.add.rectangle(640, 360, 1280, 720, 0x050718, 0.28);
    addHeader(this, 'CHOOSE YOUR FLOPPER');

    this.selectedId = gameSession.me?.characterId ?? '';
    this.stateSignature = this.makeSignature(gameSession.room);
    this.drawGrid();

    this.refreshSelectionPreview();

    addButton(this, 640, 676, 270, 52, 'CONFIRM PLAYER', () => {
      if (!this.selectedId) {
        showToast(this, 'Choose a character first.');
        return;
      }
      this.scene.start('LobbyScene');
    }, { fill: COLORS.gold, fontSize: 21 });

    this.cleanups.push(network.onState((room) => this.handleState(room)));
    this.cleanups.push(network.onError((message) => showToast(this, message)));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private drawGrid(): void {
    const columns = 8;
    const cardWidth = 144;
    const cardHeight = 90;
    const startX = 76;
    const startY = 125;
    const gapX = 161;
    const gapY = 97;
    const taken = new Set(
      (gameSession.room?.players ?? [])
        .filter((player) => !player.isBot && player.id !== gameSession.playerId && player.characterId)
        .map((player) => player.characterId),
    );

    CHARACTERS.forEach((character, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = startX + col * gapX;
      const y = startY + row * gapY;
      const unavailable = taken.has(character.id);
      const selected = this.selectedId === character.id;

      const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, selected ? 0x3d3f18 : 0x10183f, unavailable ? 0.52 : 0.97)
        .setStrokeStyle(selected ? 4 : 2, selected ? COLORS.gold : character.accent, 1);
      const jersey = createJerseyBadge(this, -43, -2, character.primary, character.secondary, character.accent, character.number, 0.7);
      jersey.setAlpha(unavailable ? 0.44 : 1);

      const name = this.add.text(21, -26, this.wrapCharacterName(character.name), {
        fontFamily: 'Arial Black, Arial',
        fontSize: '10px',
        color: unavailable ? '#8790af' : '#ffffff',
        align: 'center',
        lineSpacing: -4,
      }).setOrigin(0.5, 0.5);
      const city = this.add.text(21, 28, character.city.toUpperCase(), {
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        fontSize: '8px',
        color: selected ? '#fff6a5' : '#b9c3e6',
      }).setOrigin(0.5);

      const children: Phaser.GameObjects.GameObject[] = [bg, jersey, name, city];
      if (unavailable) {
        const takenLabel = this.add.text(-43, 29, 'TAKEN', {
          fontFamily: 'Arial Black, Arial', fontSize: '8px', color: '#ff9aab', backgroundColor: '#3b1020', padding: { x: 3, y: 1 },
        }).setOrigin(0.5);
        children.push(takenLabel);
      }

      const container = this.add.container(x, y, children);
      this.cardMap.set(character.id, container);
      if (!unavailable) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => container.setScale(this.selectedId === character.id ? 1.04 : 1.025));
        bg.on('pointerout', () => container.setScale(this.selectedId === character.id ? 1.04 : 1));
        bg.on('pointerup', () => this.selectCharacter(character));
      }
      if (selected) container.setScale(1.04).setDepth(5);
    });
  }

  private selectCharacter(character: CharacterDefinition): void {
    if (this.selectedId === character.id) return;
    this.selectedId = character.id;
    network.send({ type: 'SELECT_CHARACTER', characterId: character.id });
    playPlayerName(this, character.id);
    this.refreshSelectionPreview();
    this.cardMap.forEach((card, id) => card.setScale(id === character.id ? 1.04 : 1).setDepth(id === character.id ? 5 : 0));
  }

  private refreshSelectionPreview(): void {
    this.selectionPreview?.destroy(true);

    const selected = CHARACTERS.find((character) => character.id === this.selectedId);
    const panel = this.add.rectangle(0, 0, 600, 72, 0x070b22, 0.96)
      .setStrokeStyle(3, selected ? selected.accent : 0x8795d8, 1);

    if (!selected) {
      const prompt = this.add.text(0, 0, 'SELECT A CHARACTER TO SEE THEIR PORTRAIT', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '17px',
        color: '#ffffff',
        stroke: '#050718',
        strokeThickness: 3,
      }).setOrigin(0.5);
      this.selectionPreview = this.add.container(640, 610, [panel, prompt]).setDepth(20);
      return;
    }

    const accentBar = this.add.rectangle(-291, 0, 8, 62, selected.primary, 1);
    const portrait = createPlayerPortrait(this, -247, 0, selected.id, 70);
    const heading = this.add.text(-198, -19, 'SELECTED FLOPPER', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '11px',
      color: '#fff6a5',
      letterSpacing: 1,
    }).setOrigin(0, 0.5);
    const name = this.add.text(-198, 1, selected.name.toUpperCase(), {
      fontFamily: 'Arial Black, Arial',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#050718',
      strokeThickness: 3,
    }).setOrigin(0, 0.5);
    shrinkTextToFit(name, 470, 13);
    const details = this.add.text(-198, 23, `${selected.city.toUpperCase()} • #${selected.number}`, {
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      fontSize: '11px',
      color: '#7ee8ff',
    }).setOrigin(0, 0.5);

    this.selectionPreview = this.add.container(640, 610, [panel, accentBar, portrait, heading, name, details]).setDepth(20);
  }

  private handleState(room: RoomState): void {
    gameSession.room = room;
    if (room.status !== 'SETUP') {
      routeForRoom(this, room);
      return;
    }
    const serverSelection = gameSession.me?.characterId ?? '';
    const nextSignature = this.makeSignature(room);
    if (serverSelection !== this.selectedId || nextSignature !== this.stateSignature) {
      this.selectedId = serverSelection;
      this.scene.restart();
    }
  }

  private makeSignature(room: RoomState | null): string {
    return JSON.stringify((room?.players ?? []).filter((player) => !player.isBot).map((player) => [player.id, player.characterId]));
  }

  private wrapCharacterName(name: string): string {
    const tokens = name.replace(/-/g, '- ').split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = '';
    for (const token of tokens) {
      const cleaned = token.replace(/\s+-/g, '-');
      const candidate = current ? `${current} ${cleaned}` : cleaned;
      if (candidate.length <= 12 || !current) {
        current = candidate;
      } else {
        lines.push(current.replace(/\s+-/g, '-'));
        current = cleaned;
      }
    }
    if (current) lines.push(current.replace(/\s+-/g, '-'));
    return lines.slice(0, 3).join('\n');
  }

  private cleanup(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}
