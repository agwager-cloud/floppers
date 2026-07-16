import Phaser from 'phaser';
import { network } from '../game/Network';
import { gameSession } from '../game/GameSession';
import { routeForRoom } from '../game/SceneRouter';
import { CanvasTextInput } from '../game/CanvasTextInput';
import { addBackground, addButton, addSoundToggle, COLORS, showToast } from '../game/Ui';

export class StartScene extends Phaser.Scene {
  private nameInput?: CanvasTextInput;
  private codeInput?: CanvasTextInput;
  private busy = false;
  private serverStatusText?: Phaser.GameObjects.Text;
  private cleanups: Array<() => void> = [];

  constructor() {
    super('StartScene');
  }

  create(): void {
    gameSession.room = null;
    gameSession.playerId = '';
    gameSession.viewedMatchId = '';
    this.busy = false;
    this.cleanups = [];

    addBackground(this, 'titleBg');
    this.add.rectangle(640, 360, 1280, 720, 0x02040e, 0.025);

    // Compact single-row control bar positioned in the clear arena-light area
    // beneath the game title and above every background player.
    this.add.rectangle(640 + 4, 248 + 4, 480, 42, 0x000000, 0.24);
    this.add.rectangle(640, 248, 480, 42, 0x10183f, 0.7)
      .setStrokeStyle(2, 0x6f7eff, 0.9);

    this.nameInput = new CanvasTextInput(this, {
      id: 'playerName',
      x: 482,
      y: 248,
      width: 142,
      height: 30,
      placeholder: 'NAME',
      maxLength: 18,
      onInput: (value) => value.replace(/[^A-Za-z0-9 '\-_.]/g, '').slice(0, 18),
    });

    addButton(this, 597, 248, 74, 30, 'HOST', () => this.hostGame(), {
      fill: COLORS.gold,
      fontSize: 12,
    });

    this.codeInput = new CanvasTextInput(this, {
      id: 'roomCode',
      x: 712,
      y: 248,
      width: 112,
      height: 30,
      placeholder: 'CODE',
      maxLength: 5,
      inputMode: 'numeric',
      onInput: (value) => value.replace(/\D/g, '').slice(0, 5),
    });

    addButton(this, 820, 248, 74, 30, 'JOIN', () => this.joinGame(), {
      fill: COLORS.blue,
      fontSize: 12,
    });

    addSoundToggle(this);

    this.serverStatusText = this.add.text(640, 282, '', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '14px',
      color: '#ffe56f',
      stroke: '#050718',
      strokeThickness: 4,
      align: 'center',
    }).setOrigin(0.5).setDepth(30);

    this.cleanups.push(network.onConnectionStatus((message) => {
      this.serverStatusText?.setText(message);
      this.serverStatusText?.setVisible(Boolean(message));
    }));
    this.cleanups.push(network.onWelcome(() => {
      this.serverStatusText?.setText('').setVisible(false);
      const room = gameSession.room;
      if (room) routeForRoom(this, room);
      else this.scene.start('CharacterSelectScene');
    }));
    this.cleanups.push(network.onError((message) => {
      this.busy = false;
      this.serverStatusText?.setText('').setVisible(false);
      showToast(this, message);
    }));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private async hostGame(): Promise<void> {
    if (this.busy) return;
    const name = this.nameInput?.value ?? '';
    if (!name) {
      showToast(this, 'Enter your player name first.');
      this.nameInput?.focus();
      return;
    }
    this.busy = true;
    try {
      await network.connect();
      network.send({ type: 'HOST_ROOM', name });
    } catch (error) {
      this.busy = false;
      showToast(this, error instanceof Error ? error.message : 'Could not connect to the server.');
    }
  }

  private async joinGame(): Promise<void> {
    if (this.busy) return;
    const name = this.nameInput?.value ?? '';
    const code = (this.codeInput?.value ?? '').replace(/\D/g, '').slice(0, 5);
    if (!name || code.length !== 5) {
      showToast(this, 'Enter a name and a five-digit room code.');
      if (!name) this.nameInput?.focus();
      else this.codeInput?.focus();
      return;
    }
    this.busy = true;
    try {
      await network.connect();
      network.send({ type: 'JOIN_ROOM', name, code });
    } catch (error) {
      this.busy = false;
      showToast(this, error instanceof Error ? error.message : 'Could not connect to the server.');
    }
  }

  private cleanup(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.nameInput?.destroy();
    this.codeInput?.destroy();
    this.nameInput = undefined;
    this.codeInput = undefined;
    this.serverStatusText?.destroy();
    this.serverStatusText = undefined;
  }
}
