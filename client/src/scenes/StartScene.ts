import Phaser from 'phaser';
import { network, type ConnectionProgress } from '../game/Network';
import { gameSession } from '../game/GameSession';
import { routeForRoom } from '../game/SceneRouter';
import { CanvasTextInput } from '../game/CanvasTextInput';
import { addBackground, addButton, addSoundToggle, COLORS, showToast } from '../game/Ui';

export class StartScene extends Phaser.Scene {
  private nameInput?: CanvasTextInput;
  private codeInput?: CanvasTextInput;
  private busy = false;
  private hostButton?: Phaser.GameObjects.Container;
  private joinButton?: Phaser.GameObjects.Container;
  private controlBarObjects: Phaser.GameObjects.Rectangle[] = [];
  private connectionPanel?: Phaser.GameObjects.Container;
  private connectionTitle?: Phaser.GameObjects.Text;
  private connectionDetail?: Phaser.GameObjects.Text;
  private connectionElapsed?: Phaser.GameObjects.Text;
  private connectionProgressFill?: Phaser.GameObjects.Graphics;
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
    this.controlBarObjects = [];
    this.hostButton = undefined;
    this.joinButton = undefined;

    addBackground(this, 'titleBg');
    this.add.rectangle(640, 360, 1280, 720, 0x02040e, 0.025);

    // Compact single-row control bar positioned in the clear arena-light area
    // beneath the title. All pieces are retained so the row can be hidden while
    // the fixed classroom connection panel is displayed.
    const shadow = this.add.rectangle(692, 252, 480, 42, 0x000000, 0.24);
    const bar = this.add.rectangle(688, 248, 480, 42, 0x10183f, 0.7)
      .setStrokeStyle(2, 0x6f7eff, 0.9);
    this.controlBarObjects.push(shadow, bar);

    this.nameInput = new CanvasTextInput(this, {
      id: 'playerName',
      x: 530,
      y: 248,
      width: 142,
      height: 30,
      placeholder: 'NAME',
      maxLength: 18,
      onInput: (value) => value.replace(/[^A-Za-z0-9 '\-_.]/g, '').slice(0, 18),
    });

    this.hostButton = addButton(this, 645, 248, 74, 30, 'HOST', () => this.hostGame(), {
      fill: COLORS.gold,
      fontSize: 12,
    });

    this.codeInput = new CanvasTextInput(this, {
      id: 'roomCode',
      x: 760,
      y: 248,
      width: 112,
      height: 30,
      placeholder: 'CODE',
      maxLength: 5,
      inputMode: 'numeric',
      onInput: (value) => value.replace(/\D/g, '').slice(0, 5),
    });

    this.joinButton = addButton(this, 868, 248, 74, 30, 'JOIN', () => this.joinGame(), {
      fill: COLORS.blue,
      fontSize: 12,
    });

    addSoundToggle(this);
    this.createConnectionPanel();

    this.cleanups.push(network.onConnectionProgress((progress) => this.updateConnectionPanel(progress)));
    this.cleanups.push(network.onWelcome(() => {
      this.updateConnectionPanel({
        elapsedSeconds: 0,
        attempt: 1,
        progress: 1,
        message: 'Classroom connected. Loading the player screen…',
      });
      const room = gameSession.room;
      if (room) routeForRoom(this, room);
      else this.scene.start('CharacterSelectScene');
    }));
    this.cleanups.push(network.onError((message) => {
      if (!this.scene.isActive()) return;
      this.showConnectionFailure(message);
    }));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private createConnectionPanel(): void {
    const container = this.add.container(688, 370).setDepth(60).setVisible(false);
    const background = this.add.graphics();
    background.fillStyle(0xeaf2ff, 0.98);
    background.fillRoundedRect(-250, -92, 500, 184, 24);
    background.lineStyle(4, 0x94b7ff, 1);
    background.strokeRoundedRect(-250, -92, 500, 184, 24);

    this.connectionTitle = this.add.text(0, -64, 'Connecting to classroom server', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '23px',
      color: '#102346',
      align: 'center',
    }).setOrigin(0.5);

    this.connectionDetail = this.add.text(0, -20, 'Preparing the classroom connection…', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#18345f',
      align: 'center',
      wordWrap: { width: 440 },
    }).setOrigin(0.5);

    const progressBack = this.add.graphics();
    progressBack.fillStyle(0xc6d0e0, 1);
    progressBack.fillRoundedRect(-205, 32, 410, 14, 7);

    this.connectionProgressFill = this.add.graphics();

    this.connectionElapsed = this.add.text(0, 67, 'Waiting 0 seconds · free servers can take 60–100 seconds', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '14px',
      color: '#506078',
      align: 'center',
      wordWrap: { width: 440 },
    }).setOrigin(0.5);

    container.add([
      background,
      this.connectionTitle,
      this.connectionDetail,
      progressBack,
      this.connectionProgressFill,
      this.connectionElapsed,
    ]);
    this.connectionPanel = container;
  }

  private async hostGame(): Promise<void> {
    if (this.busy) return;
    const name = this.nameInput?.value ?? '';
    if (!name) {
      showToast(this, 'Enter your player name first.');
      this.nameInput?.focus();
      return;
    }

    this.beginConnection('Creating your classroom…');
    try {
      await network.hostRoom(name);
    } catch (error) {
      if (this.scene.isActive()) this.showConnectionFailure(error);
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

    this.beginConnection('Joining the classroom…');
    try {
      await network.joinRoom(name, code);
    } catch (error) {
      if (this.scene.isActive()) this.showConnectionFailure(error);
    }
  }

  private beginConnection(message: string): void {
    this.setBusy(true);
    this.connectionPanel?.setVisible(true);
    this.connectionTitle?.setText('Connecting to classroom server').setColor('#102346');
    this.connectionDetail?.setText(message).setColor('#18345f');
    this.connectionElapsed?.setText('Waiting 0 seconds · free servers can take 60–100 seconds').setColor('#506078');
    this.drawProgress(0, false);
  }

  private updateConnectionPanel(progress: ConnectionProgress): void {
    if (!this.busy || !this.scene.isActive()) return;
    this.connectionPanel?.setVisible(true);
    this.connectionTitle?.setText('Connecting to classroom server').setColor('#102346');
    this.connectionDetail?.setText(progress.message).setColor('#18345f');
    this.connectionElapsed?.setText(
      progress.progress >= 1
        ? 'Connected · loading classroom'
        : `Waiting ${progress.elapsedSeconds} seconds · free servers can take 60–100 seconds`,
    ).setColor('#506078');
    this.drawProgress(progress.progress, false);
  }

  private showConnectionFailure(error: unknown): void {
    const raw = error instanceof Error ? error.message : String(error ?? 'Connection failed.');
    this.setBusy(false);
    this.connectionPanel?.setVisible(true);
    this.connectionTitle?.setText('Could not connect to the classroom server').setColor('#8f2020');
    this.connectionDetail?.setText(this.connectionFailureMessage(raw)).setColor('#7f2020');
    this.connectionElapsed?.setText('The Host and Join buttons are ready to try again.').setColor('#506078');
    this.drawProgress(1, true);
  }

  private connectionFailureMessage(raw: string): string {
    if (/room code does not exist|already being used|already has|enter a player name/i.test(raw)) return raw;
    return `The classroom did not connect after waiting up to 100 seconds. If it works in InPrivate/Incognito but not in a normal window, a browser extension or school filter is blocking this game. Ask IT to allow ${network.publishedServerHost()} and secure WebSocket connections.`;
  }

  private drawProgress(progress: number, failed: boolean): void {
    const safe = Math.max(0, Math.min(1, progress));
    this.connectionProgressFill?.clear();
    this.connectionProgressFill?.fillStyle(failed ? 0xe52c2c : safe >= 1 ? 0x27a85b : 0x2d66e8, 1);
    this.connectionProgressFill?.fillRoundedRect(-205, 32, Math.max(6, 410 * safe), 14, 7);
  }

  private setBusy(busy: boolean): void {
    this.busy = busy;

    // Close the mobile keyboard before the status card appears. The controls
    // are then hidden rather than enlarged, so nothing can drop below the
    // viewport on a phone, iPad or laptop.
    this.nameInput?.element.blur();
    this.codeInput?.element.blur();
    if (busy) window.setTimeout(() => window.scrollTo(0, 0), 0);

    for (const object of this.controlBarObjects) object.setVisible(!busy);
    this.setInputVisible(this.nameInput, !busy);
    this.setInputVisible(this.codeInput, !busy);

    for (const button of [this.hostButton, this.joinButton]) {
      if (!button) continue;
      button.setVisible(!busy);
      const background = button.list[0] as Phaser.GameObjects.Rectangle | undefined;
      if (!background) continue;
      if (busy) background.disableInteractive();
      else background.setInteractive({ useHandCursor: true });
    }
  }

  private setInputVisible(input: CanvasTextInput | undefined, visible: boolean): void {
    if (!input) return;
    input.element.style.visibility = visible ? 'visible' : 'hidden';
    input.element.disabled = !visible;
  }

  private cleanup(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.nameInput?.destroy();
    this.codeInput?.destroy();
    this.nameInput = undefined;
    this.codeInput = undefined;
    this.connectionPanel?.destroy(true);
    this.connectionPanel = undefined;
    this.connectionTitle = undefined;
    this.connectionDetail = undefined;
    this.connectionElapsed = undefined;
    this.connectionProgressFill = undefined;
    this.hostButton = undefined;
    this.joinButton = undefined;
    this.controlBarObjects = [];
  }
}
