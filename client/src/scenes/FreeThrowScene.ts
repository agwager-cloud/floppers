import Phaser from 'phaser';
import { gameSession } from '../game/GameSession';
import { playFreeThrowResult } from '../game/Audio';
import { network } from '../game/Network';
import { routeForRoom } from '../game/SceneRouter';
import { addBackground, addButton, addHeader, addPanel, COLORS, showToast } from '../game/Ui';
import { addScoreCard, createBasketball, createPlayerFigure, getMatchPlayers } from '../game/Visuals';
import type { MatchState, RoomState } from '../game/types';

const CROSS_X = 1015;
const CROSS_Y = 530;
const HORIZONTAL_RANGE = 286;
const VERTICAL_RANGE = 220;
const animatedShotIds = new Set<string>();
const revealedScoreShotIds = new Set<string>();

// These are the visible zone sizes. At 11-11+ the server uses an even smaller
// scoring tolerance inside this basketball-sized target, requiring a virtually
// perfect centre release.
const GREEN_VISUAL_HALF_WIDTHS = [0.14, 0.115, 0.095, 0.078, 0.065, 0.055] as const;

function meterPressureLevel(match: MatchState): number {
  const lowerScore = Math.min(match.scoreA, match.scoreB);
  if (lowerScore < 3) return 0;
  return Math.min(GREEN_VISUAL_HALF_WIDTHS.length - 1, Math.floor((lowerScore - 3) / 2) + 1);
}

function greenHalfWidth(match: MatchState): number {
  return GREEN_VISUAL_HALF_WIDTHS[meterPressureLevel(match)] ?? GREEN_VISUAL_HALF_WIDTHS[0];
}

function pressureThreshold(level: number): number {
  return level <= 0 ? 0 : 3 + (level - 1) * 2;
}

export class FreeThrowScene extends Phaser.Scene {
  private cleanups: Array<() => void> = [];
  private matchId = '';
  private shooterId = '';
  private stateSignature = '';
  private directionValue = 0.5;
  private powerValue = 0.5;
  private directionBall?: Phaser.GameObjects.Container;
  private powerBall?: Phaser.GameObjects.Container;
  private attemptsText?: Phaser.GameObjects.Text;
  private resultText?: Phaser.GameObjects.Text;
  private countdownText?: Phaser.GameObjects.Text;
  private fairnessText?: Phaser.GameObjects.Text;
  private distractionStatusText?: Phaser.GameObjects.Text;
  private distractionButtons: Phaser.GameObjects.Container[] = [];
  private distractionWindowClosed = false;
  private lastCountdownSecond = -1;
  private scoreCards: Phaser.GameObjects.Container[] = [];
  private shotLocked = false;
  private animationPlaying = false;
  private pendingRefresh = false;
  private pendingRouteRoom?: RoomState;
  private lastAnimatedShotId = '';
  private lastDistractionSignature = '';
  private localDistractionUsed = false;
  private turnId = '';
  private distractionUseSignature = '';
  private keyboardShoot?: Phaser.Input.Keyboard.Key;
  private restartQueued = false;
  private resultAudioFinished = true;

  constructor() {
    super('FreeThrowScene');
  }

  create(): void {
    // Phaser restarts reuse the same Scene instance, so all transition guards and
    // references must be reset here. Leaving restartQueued=true caused the scene
    // to stop refreshing after a bot's first free throw.
    this.cleanups = [];
    this.restartQueued = false;
    this.resultAudioFinished = true;
    this.animationPlaying = false;
    this.pendingRefresh = false;
    this.pendingRouteRoom = undefined;
    this.lastAnimatedShotId = '';
    this.lastDistractionSignature = '';
    this.localDistractionUsed = false;
    this.turnId = '';
    this.distractionUseSignature = '';
    this.lastCountdownSecond = -1;
    this.keyboardShoot = undefined;
    this.directionBall = undefined;
    this.powerBall = undefined;
    this.attemptsText = undefined;
    this.resultText = undefined;
    this.countdownText = undefined;
    this.fairnessText = undefined;
    this.distractionStatusText = undefined;
    this.distractionButtons = [];
    this.distractionWindowClosed = false;
    this.scoreCards = [];

    const room = gameSession.room;
    const match = gameSession.getRelevantMatch();
    if (!room || !match) {
      this.scene.start('TournamentScene');
      return;
    }

    this.matchId = match.id;
    this.shooterId = match.activeShooterId;
    this.stateSignature = this.makeSignature(match);
    this.shotLocked = match.shotInFlight;
    this.turnId = match.turnId ?? '';
    this.distractionUseSignature = match.distractionUsedByPlayerId ?? '';
    this.localDistractionUsed = match.distractionUsedByPlayerId === gameSession.playerId;

    addBackground(this, 'gameBg');
    this.add.rectangle(640, 360, 1280, 720, 0x02040e, 0.11);
    addHeader(this, 'FREE THROW PRESSURE', 'Make the two basketball markers overlap inside the green centre of the cross, then press SHOOT.');
    this.refreshScoreCards(match, room);

    const shooter = room.players.find((player) => player.id === match.activeShooterId);
    if (shooter) createPlayerFigure(this, 640, 535, shooter, 0.86).setDepth(8);

    this.attemptsText = this.add.text(640, 102, this.attemptLabel(match), {
      fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff', backgroundColor: 'rgba(7,11,34,.93)', padding: { x: 14, y: 7 },
    }).setOrigin(0.5).setDepth(20);

    this.drawCrossMeter(match);
    if (!match.shotInFlight) {
      const values = this.calculateMeterValues(match, Date.now());
      this.directionValue = values.direction;
      this.powerValue = values.power;
      this.positionMeterBalls();
    }
    this.updateShotClock(match);
    this.drawRoleControls(match, room);
    this.updateDistractionWindow(match);

    this.resultText = this.add.text(640, 320, '', {
      fontFamily: 'Arial Black, Arial', fontSize: '44px', color: '#ffffff', stroke: '#050718', strokeThickness: 9,
    }).setOrigin(0.5).setDepth(120).setAlpha(0);

    if (this.input.keyboard) {
      this.keyboardShoot = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.keyboardShoot.on('down', () => this.attemptShot());
    }

    this.cleanups.push(network.onState((nextRoom) => this.handleState(nextRoom)));
    this.cleanups.push(network.onError((message) => {
      const current = gameSession.room?.matches.find((candidate) => candidate.id === this.matchId);
      if (!current?.shotInFlight) this.shotLocked = false;
      this.localDistractionUsed = current?.distractionUsedByPlayerId === gameSession.playerId;
      showToast(this, message);
    }));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    if (match.lastShot && match.shotInFlight) {
      this.directionValue = match.lastShot.direction;
      this.powerValue = match.lastShot.power;
      this.positionMeterBalls();
      this.time.delayedCall(80, () => this.animateShot(match.lastShot!));
    }
  }

  update(): void {
    const room = gameSession.room;
    const match = room?.matches.find((candidate) => candidate.id === this.matchId);
    if (!room || !match || !this.directionBall || !this.powerBall) return;

    const shooter = room.players.find((player) => player.id === match.activeShooterId);
    const shooterIsAutomated = !shooter || shooter.isBot || !shooter.connected;

    if (!match.shotInFlight && !this.shotLocked) {
      // When a bot reaches its scheduled release moment, freeze the markers at
      // that exact server-authoritative point so the shot looks smooth instead
      // of jumping from a miss into the green zone when the network update lands.
      if (shooterIsAutomated && match.turnReadyAt && Date.now() >= match.turnReadyAt) {
        const values = this.calculateMeterValues(match, match.turnReadyAt);
        this.directionValue = values.direction;
        this.powerValue = values.power;
        this.shotLocked = true;
      } else {
        const values = this.calculateMeterValues(match, Date.now());
        this.directionValue = values.direction;
        this.powerValue = values.power;
      }
      this.positionMeterBalls();
    }

    this.updateDistractionVisuals(match);
    this.updateShotClock(match);
    this.updateDistractionWindow(match);
  }

  private drawCrossMeter(match: MatchState): void {
    this.countdownText = this.add.text(CROSS_X, 286, 'SHOT CLOCK 10', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '28px',
      color: '#67f2a8',
      stroke: '#050718',
      strokeThickness: 7,
      backgroundColor: 'rgba(7,11,34,.90)',
      padding: { x: 12, y: 5 },
    }).setOrigin(0.5).setDepth(40);

    this.fairnessText = this.add.text(CROSS_X, 330, 'DISTRACTIONS OPEN', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '11px',
      color: '#7ee8ff',
      stroke: '#050718',
      strokeThickness: 4,
      backgroundColor: 'rgba(7,11,34,.78)',
      padding: { x: 8, y: 3 },
    }).setOrigin(0.5).setDepth(40);

    this.add.text(CROSS_X, 362, 'DIRECTION + POWER', {
      fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#ffffff', stroke: '#050718', strokeThickness: 4,
    }).setOrigin(0.5);
    const pressureLevel = meterPressureLevel(match);
    const pressureScore = pressureThreshold(pressureLevel);
    const meterInstruction = pressureLevel > 0
      ? pressureLevel === GREEN_VISUAL_HALF_WIDTHS.length - 1
        ? 'PERFECT RELEASE • 11-11+'
        : `CLUTCH ZONE • ${pressureScore}-${pressureScore}`
      : 'OVERLAP BOTH BASKETBALLS';
    this.add.text(CROSS_X, 385, meterInstruction, {
      fontFamily: 'Arial Black, Arial', fontSize: '10px',
      color: pressureLevel > 0 ? '#fff04a' : '#cbd4ff', stroke: '#050718', strokeThickness: 3,
    }).setOrigin(0.5);

    const halfHorizontal = (HORIZONTAL_RANGE + 34) / 2;
    const halfVertical = (VERTICAL_RANGE + 34) / 2;
    const armHalf = 19;
    const cross = this.add.graphics();
    cross.fillStyle(0x090d29, 0.97);
    cross.lineStyle(3, 0xffffff, 0.92);
    cross.beginPath();
    cross.moveTo(CROSS_X - armHalf, CROSS_Y - halfVertical);
    cross.lineTo(CROSS_X + armHalf, CROSS_Y - halfVertical);
    cross.lineTo(CROSS_X + armHalf, CROSS_Y - armHalf);
    cross.lineTo(CROSS_X + halfHorizontal, CROSS_Y - armHalf);
    cross.lineTo(CROSS_X + halfHorizontal, CROSS_Y + armHalf);
    cross.lineTo(CROSS_X + armHalf, CROSS_Y + armHalf);
    cross.lineTo(CROSS_X + armHalf, CROSS_Y + halfVertical);
    cross.lineTo(CROSS_X - armHalf, CROSS_Y + halfVertical);
    cross.lineTo(CROSS_X - armHalf, CROSS_Y + armHalf);
    cross.lineTo(CROSS_X - halfHorizontal, CROSS_Y + armHalf);
    cross.lineTo(CROSS_X - halfHorizontal, CROSS_Y - armHalf);
    cross.lineTo(CROSS_X - armHalf, CROSS_Y - armHalf);
    cross.closePath();
    cross.fillPath();
    cross.strokePath();

    const halfGreen = greenHalfWidth(match);
    const horizontalGreenWidth = Math.max(24, HORIZONTAL_RANGE * halfGreen * 2);
    const verticalGreenHeight = Math.max(24, VERTICAL_RANGE * halfGreen * 2);
    const centreGlowSize = Math.max(16, Math.min(28, horizontalGreenWidth - 5, verticalGreenHeight - 5));
    this.add.rectangle(CROSS_X, CROSS_Y, horizontalGreenWidth, 30, COLORS.green, 0.95);
    this.add.rectangle(CROSS_X, CROSS_Y, 30, verticalGreenHeight, COLORS.green, 0.95);
    this.add.rectangle(CROSS_X, CROSS_Y, centreGlowSize, centreGlowSize, 0xfff04a, 0.26);

    this.add.text(CROSS_X - HORIZONTAL_RANGE / 2 - 22, CROSS_Y, 'L', { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(CROSS_X + HORIZONTAL_RANGE / 2 + 22, CROSS_Y, 'R', { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(CROSS_X, CROSS_Y - VERTICAL_RANGE / 2 - 23, 'HIGH', { fontFamily: 'Arial Black, Arial', fontSize: '11px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(CROSS_X, CROSS_Y + VERTICAL_RANGE / 2 + 23, 'LOW', { fontFamily: 'Arial Black, Arial', fontSize: '11px', color: '#ffffff' }).setOrigin(0.5);

    this.directionBall = createBasketball(this, CROSS_X - HORIZONTAL_RANGE / 2, CROSS_Y, 11).setDepth(30);
    this.powerBall = createBasketball(this, CROSS_X, CROSS_Y + VERTICAL_RANGE / 2, 11).setDepth(31);
  }

  private positionMeterBalls(): void {
    if (!this.directionBall || !this.powerBall) return;
    this.directionBall.x = CROSS_X - HORIZONTAL_RANGE / 2 + this.directionValue * HORIZONTAL_RANGE;
    this.directionBall.y = CROSS_Y;
    this.powerBall.x = CROSS_X;
    this.powerBall.y = CROSS_Y + VERTICAL_RANGE / 2 - this.powerValue * VERTICAL_RANGE;
  }

  private drawRoleControls(match: MatchState, room: RoomState): void {
    const isParticipant = match.playerAId === gameSession.playerId || match.playerBId === gameSession.playerId;
    const isShooter = match.activeShooterId === gameSession.playerId;
    const defenderId = match.activeShooterId === match.playerAId ? match.playerBId : match.playerAId;
    const isDefender = defenderId === gameSession.playerId;
    const shooter = room.players.find((player) => player.id === match.activeShooterId);
    const distractionUsed = match.distractionUsedByPlayerId === gameSession.playerId || this.localDistractionUsed;
    const distractionWindowOpen = Date.now() < (match.distractionWindowClosesAt ?? 0);
    const distractionDisabled = distractionUsed || !distractionWindowOpen;

    addPanel(this, 190, 500, 315, 260, 0.93);

    if (match.shotInFlight) {
      this.add.text(190, 430, 'SHOT IN THE AIR!', { fontFamily: 'Arial Black, Arial', fontSize: '23px', color: '#fff04a' }).setOrigin(0.5);
      this.add.text(190, 500, 'Watch the full flight of the basketball. The next turn will not begin until the shot animation finishes.', {
        fontSize: '16px', color: '#ffffff', align: 'center', wordWrap: { width: 270 }, lineSpacing: 6,
      }).setOrigin(0.5);
      return;
    }

    if (isShooter) {
      this.add.text(190, 406, 'YOU ARE SHOOTING', { fontFamily: 'Arial Black, Arial', fontSize: '21px', color: '#67f2a8' }).setOrigin(0.5);
      this.add.text(190, 467, 'Time the two moving basketballs so they overlap in the green centre of the cross before the shot clock expires.', {
        fontSize: '15px', color: '#ffffff', align: 'center', wordWrap: { width: 270 }, lineSpacing: 5,
      }).setOrigin(0.5);
      addButton(this, 190, 570, 245, 62, 'SHOOT!', () => this.attemptShot(), { fill: COLORS.gold, fontSize: 27 });
      this.add.text(190, 620, 'Touch SHOOT or press SPACE', { fontSize: '12px', color: '#cbd4ff' }).setOrigin(0.5);
    } else if (isDefender) {
      this.add.text(190, 385, 'DISTRACT THE SHOOTER', { fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ff9aab' }).setOrigin(0.5);
      this.add.text(190, 414, `${shooter?.name ?? 'The opponent'} is lining up the shot. Choose only one distraction.`, {
        fontSize: '12px', color: '#ffffff', align: 'center', wordWrap: { width: 274 }, lineSpacing: 3,
      }).setOrigin(0.5);

      this.distractionButtons = [
        addButton(this, 190, 466, 245, 38, 'FOAM FINGER — RANDOM', () => this.distract('FOAM FINGER'), {
          fill: COLORS.blue, fontSize: 11, disabled: distractionDisabled,
        }),
        addButton(this, 190, 514, 245, 38, 'BAD DANCE — SHAKE', () => this.distract('BAD DANCE'), {
          fill: COLORS.orange, fontSize: 11, disabled: distractionDisabled,
        }),
        addButton(this, 190, 562, 245, 38, 'SQUEAK SHOES — HIDE BALLS', () => this.distract('SQUEAKY SHOES'), {
          fill: COLORS.red, fontSize: 11, disabled: distractionDisabled,
        }),
      ];

      this.distractionStatusText = this.add.text(190, 612, distractionUsed
        ? 'DISTRACTION USED FOR THIS SHOT'
        : distractionWindowOpen
          ? 'USE ONCE BEFORE THE FINAL 4 SECONDS'
          : 'WINDOW CLOSED — SHOOTER IS PROTECTED', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '10px',
        color: distractionUsed ? '#67f2a8' : distractionWindowOpen ? '#fff04a' : '#7ee8ff',
        align: 'center',
      }).setOrigin(0.5);
    } else {
      this.add.text(190, 425, isParticipant ? 'WAITING FOR YOUR TURN' : 'SPECTATOR MODE', {
        fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#ffffff',
      }).setOrigin(0.5);
      this.add.text(190, isParticipant ? 505 : 486, isParticipant
        ? 'The opponent is shooting. Your distraction controls appear whenever you are the active defender.'
        : 'You are watching this matchup live. Return to the bracket at any time to choose another LIVE game.', {
        fontSize: '15px', color: '#dbe1ff', align: 'center', wordWrap: { width: 270 }, lineSpacing: 5,
      }).setOrigin(0.5);

      if (!isParticipant) {
        addButton(this, 190, 582, 245, 48, '← BACK TO BRACKET', () => {
          gameSession.viewedMatchId = '';
          this.scene.start('TournamentScene');
        }, { fill: COLORS.blue, fontSize: 15 });
      }
    }
  }

  private attemptShot(): void {
    const match = gameSession.room?.matches.find((candidate) => candidate.id === this.matchId);
    if (!match || match.phase !== 'FREE_THROW' || match.activeShooterId !== gameSession.playerId || match.shotInFlight || this.shotLocked) return;

    // Freeze the meter at the exact positions the player can currently see.
    // The server receives this same snapshot, so the markers never jump to a
    // different release point when the network confirmation arrives.
    const releaseDirection = this.directionValue;
    const releasePower = this.powerValue;
    this.shotLocked = true;
    this.directionValue = releaseDirection;
    this.powerValue = releasePower;
    this.positionMeterBalls();
    this.countdownText?.setText('SHOT AWAY').setColor('#ffffff').setScale(1);
    this.fairnessText?.setText('RELEASE LOCKED').setColor('#67f2a8');

    // Give immediate tactile-looking feedback without moving the markers away
    // from the chosen release point.
    const releaseMarkers = [this.directionBall, this.powerBall].filter(Boolean) as Phaser.GameObjects.Container[];
    this.tweens.killTweensOf(releaseMarkers);
    this.tweens.add({
      targets: releaseMarkers,
      scale: 1.12,
      duration: 70,
      yoyo: true,
      ease: 'Sine.Out',
    });

    network.send({ type: 'SHOT', matchId: match.id, direction: releaseDirection, power: releasePower });
  }

  private distract(distractionType: string): void {
    const match = gameSession.room?.matches.find((candidate) => candidate.id === this.matchId);
    if (!match || match.phase !== 'FREE_THROW') {
      showToast(this, 'That free throw has already finished.');
      return;
    }
    const defenderId = match.activeShooterId === match.playerAId ? match.playerBId : match.playerAId;
    if (defenderId !== gameSession.playerId) {
      this.queueRestart();
      return;
    }
    if (match.shotInFlight) {
      showToast(this, 'Too late — the basketball is already in the air.');
      return;
    }
    if (Date.now() >= (match.distractionWindowClosesAt ?? 0)) {
      showToast(this, 'Distraction window closed — the shooter gets the final four seconds undisturbed.', COLORS.blue);
      this.updateDistractionWindow(match);
      return;
    }
    if (this.localDistractionUsed || match.distractionUsedByPlayerId === gameSession.playerId) {
      showToast(this, 'You already used your distraction for this free throw.', COLORS.orange);
      return;
    }
    this.localDistractionUsed = true;
    network.send({ type: 'DISTRACT', matchId: match.id, distractionType });
  }

  private handleState(room: RoomState): void {
    gameSession.room = room;
    const match = room.matches.find((candidate) => candidate.id === this.matchId);

    if (!match || match.phase !== 'FREE_THROW' || room.status !== 'ACTIVE') {
      // Do not enter the next flop scene until both the ball-flight animation
      // and the free-throw commentary audio have completed. This prevents the
      // result call and the next flop commentary from playing at the same time.
      if (this.animationPlaying || !this.resultAudioFinished) this.pendingRouteRoom = room;
      else this.safeRoute(room);
      return;
    }

    const nextSignature = this.makeSignature(match);
    const nextTurnId = match.turnId ?? '';
    const nextDistractionUse = match.distractionUsedByPlayerId ?? '';
    const defenderId = match.activeShooterId === match.playerAId ? match.playerBId : match.playerAId;
    const turnChanged = Boolean(this.turnId && nextTurnId && nextTurnId !== this.turnId);
    const roleChanged = match.activeShooterId !== this.shooterId;
    const defenderControlsChanged = defenderId === gameSession.playerId && nextDistractionUse !== this.distractionUseSignature;

    if (!this.animationPlaying && !match.shotInFlight && (turnChanged || roleChanged)) {
      this.queueRestart();
      return;
    }

    this.stateSignature = nextSignature;
    this.turnId = nextTurnId;
    this.distractionUseSignature = nextDistractionUse;
    this.localDistractionUsed = nextDistractionUse === gameSession.playerId;

    // Do not restart the defender's scene when their distraction is accepted.
    // Restarting previously destroyed the camera shake before the distracting
    // player could see it. Instead, update the controls in place.
    if (defenderControlsChanged && this.localDistractionUsed) {
      this.distractionButtons.forEach((button) => {
        button.setAlpha(0.42);
        const background = button.list[0] as Phaser.GameObjects.Rectangle | undefined;
        background?.disableInteractive();
      });
      this.distractionStatusText
        ?.setText('DISTRACTION USED FOR THIS SHOT')
        .setColor('#67f2a8');
    }

    this.attemptsText?.setText(this.attemptLabel(match));
    this.refreshScoreCards(match, room);
    this.updateShotClock(match);

    if (match.distraction && match.distraction.expiresAt > Date.now()) {
      const signature = `${match.distraction.byPlayerId}:${match.distraction.type}:${match.distraction.expiresAt}`;
      if (signature !== this.lastDistractionSignature) {
        this.lastDistractionSignature = signature;
        const defender = room.players.find((player) => player.id === match.distraction?.byPlayerId);
        const effect = match.distraction.type === 'FOAM FINGER'
          ? `random meter jam — ${(match.distraction.mode ?? 'DIRECTION').toLowerCase()} affected`
          : match.distraction.type === 'BAD DANCE'
            ? 'screen shake for 3 seconds'
            : 'basketballs hidden for 3 seconds';
        showToast(this, `${defender?.name ?? 'The defender'} used ${match.distraction.type} — ${effect}!`, COLORS.orange);

        // Everyone currently watching this live matchup should see Bad Dance,
        // including the shooter, defender and spectators. That makes the effect
        // obvious and keeps all viewers visually in sync.
        if (match.distraction.type === 'BAD DANCE') {
          const startDelay = Math.max(0, (match.distraction.startedAt ?? Date.now()) - Date.now());
          const duration = Math.max(500, (match.distraction.expiresAt ?? Date.now() + 500) - Math.max(Date.now(), match.distraction.startedAt ?? Date.now()));
          this.time.delayedCall(startDelay, () => {
            if (this.scene.isActive()) this.cameras.main.shake(duration, 0.0038, true);
          });
        }
      }
    }

    if (match.lastShot && match.shotInFlight && match.lastShot.id !== this.lastAnimatedShotId) {
      this.shotLocked = true;
      // Keep the meter exactly where it was visually released. Moving the
      // markers to the server result here caused the noticeable last-moment
      // jump reported by human shooters.
      this.animateShot(match.lastShot);
      return;
    }

    if (this.animationPlaying) {
      this.pendingRefresh = true;
      return;
    }

    if (match.activeShooterId !== this.shooterId || (!match.shotInFlight && this.shotLocked)) {
      this.queueRestart();
    }
  }

  private calculateMeterValues(match: MatchState, at: number): { direction: number; power: number } {
    const firstPerfectAt = match.meterFirstPerfectAt;
    const secondPerfectAt = match.meterSecondPerfectAt;
    const directionHalfCycles = match.meterDirectionHalfCycles;
    const powerHalfCycles = match.meterPowerHalfCycles;
    let direction: number;
    let power: number;

    if (
      firstPerfectAt !== undefined &&
      secondPerfectAt !== undefined &&
      secondPerfectAt > firstPerfectAt &&
      directionHalfCycles !== undefined &&
      powerHalfCycles !== undefined
    ) {
      // Each free throw receives a random shared speed profile from the server.
      // Coprime half-cycle counts make the markers move differently but bring
      // both through the exact centre twice: once during the distraction window
      // and once later in the protected final four seconds.
      const progress = (at - firstPerfectAt) / (secondPerfectAt - firstPerfectAt);
      direction = 0.5 + 0.5 * (match.meterDirectionSign ?? 1) * Math.sin(Math.PI * directionHalfCycles * progress);
      power = 0.5 + 0.5 * (match.meterPowerSign ?? 1) * Math.sin(Math.PI * powerHalfCycles * progress);
    } else {
      // Backwards-compatible fallback for a turn started before this hotfix.
      const startedAt = match.turnStartedAt ?? at;
      const elapsed = Math.max(0, at - startedAt);
      direction = 0.5 + 0.5 * Math.sin(elapsed * 0.00165);
      power = 0.5 + 0.5 * Math.sin(elapsed * 0.00205 + 1.55);
    }

    const distraction = match.distraction;
    if (distraction && at >= distraction.startedAt && distraction.expiresAt > at) {
      const effectElapsed = at - distraction.startedAt;
      const fadeIn = Math.min(1, effectElapsed / 260);
      const fadeOut = Math.min(1, (distraction.expiresAt - at) / 360);
      const strength = fadeIn * fadeOut;
      if (distraction.type === 'FOAM FINGER') {
        const sway = Math.sin(effectElapsed * 0.022) * 0.12 * strength;
        if (distraction.mode === 'POWER') power += sway;
        else if (distraction.mode === 'BOTH') {
          direction += sway;
          power -= sway * 0.9;
        } else direction += sway;
      }
    }

    return {
      direction: Phaser.Math.Clamp(direction, 0, 1),
      power: Phaser.Math.Clamp(power, 0, 1),
    };
  }

  private updateDistractionVisuals(match: MatchState): void {
    if (!this.directionBall || !this.powerBall) return;
    const distraction = match.distraction;
    const active = distraction && Date.now() >= distraction.startedAt && distraction.expiresAt > Date.now();
    if (active && distraction.type === 'SQUEAKY SHOES') {
      this.directionBall.setAlpha(0);
      this.powerBall.setAlpha(0);
    } else {
      this.directionBall.setAlpha(1);
      this.powerBall.setAlpha(1);
    }
  }

  private updateDistractionWindow(match: MatchState): void {
    if (match.shotInFlight || this.shotLocked) {
      this.fairnessText?.setText(match.shotInFlight ? 'SHOT IN FLIGHT' : 'RELEASE LOCKED').setColor('#ffffff');
      return;
    }
    const remainingMs = Math.max(0, (match.distractionWindowClosesAt ?? 0) - Date.now());
    const open = remainingMs > 0;
    const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
    this.fairnessText
      ?.setText(open ? `DISTRACTIONS OPEN • ${seconds}s` : 'NO NEW DISTRACTIONS • FINAL 4 SECONDS')
      .setColor(open ? '#7ee8ff' : '#67f2a8');

    if (open === !this.distractionWindowClosed) return;
    this.distractionWindowClosed = !open;
    if (!open && !this.localDistractionUsed) {
      this.distractionButtons.forEach((button) => button.setAlpha(0.42));
      this.distractionStatusText
        ?.setText('WINDOW CLOSED — SHOOTER IS PROTECTED')
        .setColor('#7ee8ff');
    }
  }

  private updateShotClock(match: MatchState): void {
    if (!this.countdownText?.active) return;
    if (match.shotInFlight || this.shotLocked) {
      this.countdownText.setText('SHOT AWAY').setColor('#ffffff').setScale(1);
      this.lastCountdownSecond = -1;
      return;
    }

    const remainingMs = Math.max(0, (match.turnDeadlineAt ?? Date.now()) - Date.now());
    const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const colour = seconds <= 1 ? '#ff4d67' : seconds === 2 ? '#ff922b' : seconds === 3 ? '#fff04a' : '#67f2a8';
    this.countdownText.setText(`SHOT CLOCK ${seconds}`).setColor(colour);

    if (seconds !== this.lastCountdownSecond) {
      this.lastCountdownSecond = seconds;
      this.tweens.killTweensOf(this.countdownText);
      this.countdownText.setScale(1);
      if (seconds <= 3) {
        this.tweens.add({
          targets: this.countdownText,
          scale: 1.22,
          duration: 180,
          yoyo: true,
          ease: 'Back.Out',
        });
      }
    }
  }

  private animateShot(shot: NonNullable<MatchState['lastShot']>): void {
    if (this.animationPlaying || shot.id === this.lastAnimatedShotId || animatedShotIds.has(shot.id)) return;
    this.animationPlaying = true;
    this.lastAnimatedShotId = shot.id;
    animatedShotIds.add(shot.id);
    if (animatedShotIds.size > 80) {
      const oldest = animatedShotIds.values().next().value as string | undefined;
      if (oldest) animatedShotIds.delete(oldest);
    }
    const ball = createBasketball(this, 650, 492, 17).setDepth(110);
    const startX = 650;
    const startY = 492;
    const made = shot.made;
    const directionMiss = shot.direction < 0.36 ? -1 : shot.direction > 0.64 ? 1 : 0;
    const powerMiss = shot.power < 0.36 ? -1 : shot.power > 0.64 ? 1 : 0;
    const missSide = directionMiss || powerMiss || (Math.random() < 0.5 ? -1 : 1);
    const targetX = made ? 640 : 640 + missSide * (directionMiss ? 42 : 28);
    // The rim centre in floppersGameScene is approximately y=218. Aim slightly
    // above it so a made shot visibly descends through the hoop rather than flying low.
    const targetY = made ? 205 : powerMiss > 0 ? 176 : 216;
    const controlX = 640 + (shot.direction - 0.5) * 105;
    const controlY = shot.power > 0.64 ? 22 : shot.power < 0.36 ? 96 : 48;
    const progress = { value: 0 };
    let collisionShown = false;

    this.tweens.add({
      targets: progress,
      value: 1,
      duration: 1950,
      ease: 'Sine.InOut',
      onUpdate: () => {
        const t = progress.value;
        if (t <= 0.8) {
          const q = t / 0.8;
          const inv = 1 - q;
          ball.x = inv * inv * startX + 2 * inv * q * controlX + q * q * targetX;
          ball.y = inv * inv * startY + 2 * inv * q * controlY + q * q * targetY;
          ball.setScale(1 - q * 0.23);
        } else {
          const q = (t - 0.8) / 0.2;
          if (!collisionShown) {
            collisionShown = true;
            this.showShotResult(made, shot.resultAudioKey);
            if (!made) this.cameras.main.shake(120, 0.004);
          }
          if (made) {
            ball.x = Phaser.Math.Linear(targetX, 640, q);
            ball.y = Phaser.Math.Linear(targetY, 338, q);
            ball.setScale(0.77 - q * 0.12);
          } else {
            ball.x = Phaser.Math.Linear(targetX, 640 + missSide * 185, q);
            ball.y = targetY + 205 * q - Math.sin(q * Math.PI) * 85;
            ball.angle += 12;
            ball.setScale(0.77 + q * 0.08);
          }
        }
        ball.angle += made ? 5 : 8;
      },
      onComplete: () => {
        ball.destroy();
        this.animationPlaying = false;

        // The server already knows whether the shot scored, but the visible
        // scorecards stay on the pre-shot total until the ball animation has
        // fully finished. Reveal the point now for shooters, defenders and
        // spectators at exactly the same visual moment.
        revealedScoreShotIds.add(shot.id);
        if (revealedScoreShotIds.size > 100) {
          const oldest = revealedScoreShotIds.values().next().value as string | undefined;
          if (oldest) revealedScoreShotIds.delete(oldest);
        }
        const scoreRoom = gameSession.room;
        const scoreMatch = scoreRoom?.matches.find((candidate) => candidate.id === this.matchId);
        if (scoreRoom && scoreMatch) this.refreshScoreCards(scoreMatch, scoreRoom);

        this.time.delayedCall(180, () => {
          const latestRoom = gameSession.room;
          const latestMatch = latestRoom?.matches.find((candidate) => candidate.id === this.matchId);
          if (this.pendingRouteRoom) {
            if (!this.resultAudioFinished) return;
            const nextRoom = this.pendingRouteRoom;
            this.pendingRouteRoom = undefined;
            this.safeRoute(nextRoom);
            return;
          }
          if (!latestRoom || !latestMatch || latestRoom.status !== 'ACTIVE' || latestMatch.phase !== 'FREE_THROW') {
            if (latestRoom) this.safeRoute(latestRoom);
            return;
          }
          if (!latestMatch.shotInFlight || this.pendingRefresh || latestMatch.activeShooterId !== this.shooterId) this.queueRestart();
        });
      },
    });
  }

  private showShotResult(made: boolean, resultAudioKey?: string): void {
    this.resultAudioFinished = false;
    playFreeThrowResult(this, made, resultAudioKey, () => {
      this.resultAudioFinished = true;
      if (!this.scene.isActive() || !this.pendingRouteRoom || this.animationPlaying) return;
      const nextRoom = this.pendingRouteRoom;
      this.pendingRouteRoom = undefined;
      this.safeRoute(nextRoom);
    });
    this.resultText?.setText(made ? 'SWISH! +1' : 'CLANG! MISSED').setColor(made ? '#67f2a8' : '#ff7182').setAlpha(1).setScale(0.65);
    this.tweens.add({ targets: this.resultText, scale: 1.16, alpha: 0, duration: 1050, ease: 'Back.Out' });
    const flash = this.add.circle(640, 218, made ? 55 : 38, made ? COLORS.green : COLORS.red, 0.36).setDepth(105);
    this.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 650, onComplete: () => flash.destroy() });
  }

  private refreshScoreCards(match: MatchState, room: RoomState): void {
    this.scoreCards.forEach((card) => card.destroy());
    const { a, b } = getMatchPlayers(match, room.players);
    let displayScoreA = match.scoreA;
    let displayScoreB = match.scoreB;

    // A made shot is applied by the authoritative server when it is released so
    // match logic remains safe. Visually hide that pending point while the ball
    // is still travelling, then reveal it in animateShot.onComplete().
    const pendingShot = match.lastShot;
    if (
      match.shotInFlight
      && pendingShot?.made
      && !revealedScoreShotIds.has(pendingShot.id)
    ) {
      if (pendingShot.shooterId === match.playerAId) displayScoreA = Math.max(0, displayScoreA - 1);
      if (pendingShot.shooterId === match.playerBId) displayScoreB = Math.max(0, displayScoreB - 1);
    }

    this.scoreCards = [
      addScoreCard(this, 175, 145, a, displayScoreA, match.activeShooterId === a.id),
      addScoreCard(this, 1105, 145, b, displayScoreB, match.activeShooterId === b.id),
    ];
    this.scoreCards.forEach((card) => card.setDepth(25));
  }

  private safeRoute(room: RoomState): void {
    if (this.restartQueued || !this.scene.isActive()) return;
    this.restartQueued = true;
    this.time.delayedCall(0, () => {
      if (!this.scene.isActive()) return;
      routeForRoom(this, room);
    });
  }

  private queueRestart(): void {
    if (this.restartQueued || !this.scene.isActive()) return;
    this.restartQueued = true;
    this.time.delayedCall(0, () => {
      if (!this.scene.isActive()) return;
      this.scene.restart();
    });
  }

  private attemptLabel(match: MatchState): string {
    if (match.shotInFlight) return 'BASKETBALL IN FLIGHT — WATCH THE SHOT';
    const alternating = match.floppedPlayerIds.length >= 2 && match.attemptsRemaining === 1;
    return alternating
      ? 'FIRST TO 3 • WIN BY TWO • ONE FREE THROW EACH'
      : `${match.attemptsRemaining} FREE THROW${match.attemptsRemaining === 1 ? '' : 'S'} REMAINING`;
  }

  private makeSignature(match: MatchState): string {
    return JSON.stringify([
      match.id,
      match.phase,
      match.activeShooterId,
      match.scoreA,
      match.scoreB,
      match.attemptsRemaining,
      match.floppedPlayerIds,
      match.shotInFlight,
      match.lastShot?.id,
      match.turnId,
      match.turnDeadlineAt,
      match.meterFirstPerfectAt,
      match.meterSecondPerfectAt,
      match.meterDirectionHalfCycles,
      match.meterPowerHalfCycles,
      match.meterDirectionSign,
      match.meterPowerSign,
      match.distractionWindowClosesAt,
      match.distractionUsedByPlayerId,
      match.distraction?.type,
      match.distraction?.expiresAt,
    ]);
  }

  private cleanup(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    this.keyboardShoot?.destroy();
    this.keyboardShoot = undefined;
    this.countdownText = undefined;
    this.fairnessText = undefined;
    this.distractionStatusText = undefined;
    this.distractionButtons = [];
    this.distractionWindowClosed = false;
    this.directionBall = undefined;
    this.powerBall = undefined;
  }
}
