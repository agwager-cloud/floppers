import Phaser from 'phaser';
import { gameSession } from '../game/GameSession';
import { playFlopCommentary, playFlopCrowd } from '../game/Audio';
import { network } from '../game/Network';
import { routeForRoom } from '../game/SceneRouter';
import { addBackground, addButton, addHeader, addPanel, COLORS, playWhistle, showToast } from '../game/Ui';
import { addScoreCard, createPlayerFigure, createReferee, getMatchPlayers, shrinkTextToFit } from '../game/Visuals';
import type { RoomState } from '../game/types';

export class FlopScene extends Phaser.Scene {
  private cleanups: Array<() => void> = [];
  private matchId = '';
  private signature = '';
  private commentaryFinished = false;
  private pendingRoom?: RoomState;

  constructor() {
    super('FlopScene');
  }

  create(): void {
    const room = gameSession.room;
    const match = gameSession.getRelevantMatch();
    if (!room || !match) {
      this.scene.start('TournamentScene');
      return;
    }
    this.matchId = match.id;
    this.signature = this.makeSignature(match);
    this.commentaryFinished = false;
    this.pendingRoom = undefined;

    addBackground(this, 'courtBg');
    this.add.rectangle(640, 360, 1280, 720, 0x02040e, 0.18);
    addHeader(this, 'THE EGREGIOUS FOUL', 'The referee has seen enough. Prepare for an outrageously dramatic flop.');

    const { a, b } = getMatchPlayers(match, room.players);
    const shooter = room.players.find((player) => player.id === match.activeShooterId) ?? a;
    const defender = shooter.id === a.id ? b : a;

    addScoreCard(this, 180, 132, a, match.scoreA, shooter.id === a.id);
    addScoreCard(this, 1100, 132, b, match.scoreB, shooter.id === b.id);

    const isParticipant = match.playerAId === gameSession.playerId || match.playerBId === gameSession.playerId;
    if (!isParticipant) {
      addButton(this, 640, 150, 220, 38, '← BACK TO BRACKET', () => {
        gameSession.viewedMatchId = '';
        this.scene.start('TournamentScene');
      }, { fill: COLORS.blue, fontSize: 14 }).setDepth(200);
    }

    const flopper = createPlayerFigure(this, 455, 410, shooter, 0.92);
    const opponent = createPlayerFigure(this, 900, 405, defender, 0.88);
    const referee = createReferee(this, 650, 330, 0.72);

    // The uploaded Scott Foster portrait is isolated on a transparent background
    // and placed over the referee placeholder's head.
    const fosterFace = this.add.image(0, -78, 'fosterFace').setDisplaySize(74, 89);
    referee.add(fosterFace);

    this.add.text(405, 235, 'OFFENCE', {
      fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ffc928', stroke: '#050718', strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(920, 235, 'ALLEGED FOULER', {
      fontFamily: 'Arial Black, Arial', fontSize: '18px', color: '#ff7182', stroke: '#050718', strokeThickness: 5,
    }).setOrigin(0.5);

    addPanel(this, 640, 620, 900, 126, 0.93);
    this.add.text(640, 592, `“${match.commentary}”`, {
      fontFamily: 'Arial Black, Arial',
      fontSize: '23px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 820 },
      stroke: '#050718',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.add.text(640, 650, `FLOP STYLE: ${match.flopStyle.toUpperCase()}  •  Two free throws are coming`, {
      fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#ffc928',
    }).setOrigin(0.5);

    this.playContactAndFlop(flopper, opponent, referee, match.flopStyle.toLowerCase(), match.flopAudioKey);
    // Emergency fallback only. Normal scene progression waits for the spoken
    // commentary COMPLETE event, so every uploaded clip plays in full. The long
    // timeout is deliberately well beyond the longest current recording.
    this.time.delayedCall(15000, () => this.finishCommentary());

    this.cleanups.push(network.onState((nextRoom) => this.handleState(nextRoom)));
    this.cleanups.push(network.onError((message) => showToast(this, message)));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private playContactAndFlop(
    flopper: Phaser.GameObjects.Container,
    opponent: Phaser.GameObjects.Container,
    referee: Phaser.GameObjects.Container,
    style: string,
    audioKey?: string,
  ): void {
    // The defender now closes the distance first, so the ridiculous collapse
    // visibly happens after the players meet rather than from opposite ends.
    this.tweens.add({
      targets: opponent,
      x: 590,
      duration: 520,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.tweens.add({ targets: opponent, x: 690, angle: -8, duration: 250, ease: 'Back.Out' });
      },
    });
    this.tweens.add({ targets: flopper, x: 500, duration: 430, ease: 'Sine.Out' });

    this.time.delayedCall(500, () => {
      playWhistle(this);
      playFlopCrowd(this);
      const whistleText = this.add.text(675, 205, 'TWEET!', {
        fontFamily: 'Arial Black, Arial', fontSize: '38px', color: '#ffffff', stroke: '#ff365e', strokeThickness: 8,
      }).setOrigin(0.5).setAngle(-8);
      this.tweens.add({
        targets: whistleText,
        scale: 1.38,
        alpha: 0,
        duration: 900,
        ease: 'Back.Out',
        onComplete: () => whistleText.destroy(),
      });
      this.tweens.add({ targets: referee, angle: { from: -4, to: 4 }, duration: 170, yoyo: true, repeat: 3 });
      this.moveRefereeOutOfWay(referee, style);
      this.showContactBurst(565, 390);
      this.tweens.add({ targets: opponent, x: 735, angle: -16, scaleX: 0.82, scaleY: 0.82, duration: 360, yoyo: true, ease: 'Back.Out' });
      this.animateRidiculousFlop(flopper, style);
      this.time.delayedCall(420, () => {
        playFlopCommentary(this, audioKey, () => this.finishCommentary());
      });
    });
  }

  private animateRidiculousFlop(flopper: Phaser.GameObjects.Container, style: string): void {
    const washingMachine = style.includes('washing machine') || style.includes('tornado');
    const rewind = style.includes('replay rewind') || style.includes('boomerang');
    const pinball = style.includes('pinball') || style.includes('bowling ball');
    const teleport = style.includes('trade-deadline') || style.includes('moonwalk');
    const rocket = style.includes('four-point-line') || style.includes('rocket launch');
    const tumble = style.includes('barrel') || style.includes('tumbleweed') || style.includes('rolling thunder') || style.includes('luxury-tax');
    const airborne = style.includes('helicopter') || style.includes('windmill') || style.includes('starfish') || style.includes('moon-gravity');
    const cartwheel = style.includes('cartwheel') || style.includes('somersault');
    const slide = style.includes('penguin') || style.includes('banana') || style.includes('floor-is-lava') || style.includes('shopping trolley');
    const collapse = style.includes('five-stage') || style.includes('accordion') || style.includes('spaghetti') || style.includes('faint');
    const sprinkler = style.includes('sprinkler');
    const cannon = style.includes('mascot cannon') || style.includes('arena cannon');
    const trampoline = style.includes('trampoline') || style.includes('three-bounce');
    const glitch = style.includes('clone glitch') || style.includes('scoreboard glitch');
    const corkscrew = style.includes('corkscrew') || style.includes('drill-bit');
    const magnet = style.includes('scoreboard magnet') || style.includes('magnetic');

    if (washingMachine) {
      this.addMotionWord('SPIN CYCLE!', 610, 310, -8);
      this.tweens.add({
        targets: flopper,
        x: 625,
        y: 350,
        angle: 2520,
        scaleX: 0.84,
        scaleY: 0.84,
        duration: 1450,
        ease: 'Cubic.InOut',
        onComplete: () => {
          this.tweens.add({
            targets: flopper,
            x: 690,
            y: 485,
            angle: 3240,
            scaleX: 0.68,
            scaleY: 0.62,
            duration: 650,
            ease: 'Bounce.Out',
            onComplete: () => this.showImpactAftermath(flopper, 26),
          });
        },
      });
      this.time.delayedCall(760, () => this.addMotionWord('RINSE!', 685, 340, 12));
      return;
    }

    if (rewind) {
      this.addMotionWord('REPLAY!', 600, 330, -10);
      this.tweens.add({
        targets: flopper,
        x: 710,
        y: 480,
        angle: 900,
        scaleX: 0.72,
        scaleY: 0.62,
        duration: 850,
        ease: 'Cubic.In',
        onComplete: () => {
          this.addMotionWord('REWIND!', 620, 375, 9);
          this.tweens.add({
            targets: flopper,
            x: 535,
            y: 355,
            angle: 120,
            scaleX: 0.94,
            scaleY: 0.94,
            duration: 620,
            ease: 'Sine.InOut',
            onComplete: () => {
              this.tweens.add({
                targets: flopper,
                x: 675,
                y: 486,
                angle: 1620,
                scaleX: 0.68,
                scaleY: 0.62,
                duration: 820,
                ease: 'Bounce.Out',
                onComplete: () => this.showImpactAftermath(flopper, 25),
              });
            },
          });
        },
      });
      return;
    }

    if (pinball) {
      this.addMotionWord('BONK!', 565, 350, -12);
      this.tweens.add({
        targets: flopper,
        x: 720,
        y: 355,
        angle: 720,
        duration: 700,
        ease: 'Cubic.Out',
        onComplete: () => {
          this.showContactBurst(720, 355);
          this.addMotionWord('PING!', 735, 325, 12);
          this.tweens.add({
            targets: flopper,
            x: 520,
            y: 425,
            angle: -360,
            scaleX: 0.78,
            scaleY: 0.78,
            duration: 720,
            ease: 'Cubic.InOut',
            onComplete: () => {
              this.showContactBurst(520, 425);
              this.tweens.add({
                targets: flopper,
                x: 680,
                y: 485,
                angle: 1260,
                scaleX: 0.66,
                scaleY: 0.62,
                duration: 720,
                ease: 'Bounce.Out',
                onComplete: () => this.showImpactAftermath(flopper, 24),
              });
            },
          });
        },
      });
      return;
    }

    if (teleport) {
      this.addMotionWord('WRONG WAY!', 500, 330, -7);
      this.tweens.add({
        targets: flopper,
        x: 385,
        y: 415,
        angle: -180,
        duration: 650,
        ease: 'Back.InOut',
        onComplete: () => {
          flopper.setAlpha(0.15);
          this.time.delayedCall(120, () => {
            flopper.setPosition(600, 295).setAlpha(1).setAngle(720);
            this.addMotionWord('TRADED!', 610, 255, 8);
            this.tweens.add({
              targets: flopper,
              x: 685,
              y: 486,
              angle: 1800,
              scaleX: 0.68,
              scaleY: 0.62,
              duration: 1050,
              ease: 'Bounce.Out',
              onComplete: () => this.showImpactAftermath(flopper, 25),
            });
          });
        },
      });
      return;
    }

    if (rocket) {
      this.addMotionWord('LIFTOFF!', 570, 270, -10);
      this.tweens.add({
        targets: flopper,
        x: 585,
        y: 230,
        angle: 900,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: 850,
        ease: 'Cubic.Out',
        onComplete: () => {
          this.tweens.add({
            targets: flopper,
            x: 715,
            y: 486,
            angle: 2520,
            scaleX: 0.66,
            scaleY: 0.6,
            duration: 1200,
            ease: 'Bounce.Out',
            onComplete: () => this.showImpactAftermath(flopper, 27),
          });
        },
      });
      this.time.delayedCall(920, () => this.addMotionWord('FOUR POINTS!', 675, 285, 10));
      return;
    }

    if (cannon) {
      this.addMotionWord('MASCOT CANNON!', 585, 255, -9);
      this.showLaunchTrail(flopper.x, flopper.y - 20);
      this.tweens.add({
        targets: flopper,
        x: 610,
        y: 170,
        angle: 1260,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 900,
        ease: 'Cubic.Out',
        onUpdate: () => {
          if (Phaser.Math.Between(0, 3) === 0) this.spawnTrailStar(flopper.x, flopper.y + 55);
        },
        onComplete: () => {
          this.addMotionWord('WRONG BASKET!', 700, 235, 10);
          this.tweens.add({
            targets: flopper,
            x: 720,
            y: 486,
            angle: 3060,
            scaleX: 0.64,
            scaleY: 0.58,
            duration: 1350,
            ease: 'Bounce.Out',
            onComplete: () => this.showImpactAftermath(flopper, 28),
          });
        },
      });
      return;
    }

    if (trampoline) {
      this.addMotionWord('BOING!', 565, 345, -12);
      const bounce = (targetX: number, targetY: number, targetAngle: number, duration: number, next?: () => void) => {
        this.tweens.add({
          targets: flopper,
          x: targetX,
          y: targetY,
          angle: targetAngle,
          duration,
          ease: 'Quad.Out',
          onComplete: next,
        });
      };
      bounce(565, 260, 540, 560, () => {
        this.showFloorImpact(585, 470);
        this.addMotionWord('BOING AGAIN!', 625, 330, 9);
        bounce(640, 225, 1260, 620, () => {
          this.showFloorImpact(655, 470);
          this.addMotionWord('ONE MORE!', 690, 310, -7);
          bounce(705, 486, 2340, 980, () => this.showImpactAftermath(flopper, 28));
        });
      });
      return;
    }

    if (glitch) {
      this.addMotionWord('REPLAY ERROR!', 585, 315, -8);
      const positions = [
        { x: 535, y: 380, angle: -90 },
        { x: 710, y: 315, angle: 630 },
        { x: 565, y: 455, angle: 990 },
        { x: 690, y: 370, angle: 1530 },
      ];
      positions.forEach((position, index) => {
        this.time.delayedCall(index * 230, () => {
          flopper.setPosition(position.x, position.y).setAngle(position.angle).setAlpha(index % 2 ? 0.55 : 1);
          this.showContactBurst(position.x, position.y);
          this.spawnTrailStar(position.x + Phaser.Math.Between(-30, 30), position.y + Phaser.Math.Between(-30, 30));
        });
      });
      this.time.delayedCall(980, () => {
        flopper.setAlpha(1);
        this.addMotionWord('BUFFERING!', 650, 360, 11);
        this.tweens.add({
          targets: flopper,
          x: 675,
          y: 486,
          angle: 2520,
          scaleX: 0.68,
          scaleY: 0.6,
          duration: 1050,
          ease: 'Bounce.Out',
          onComplete: () => this.showImpactAftermath(flopper, 26),
        });
      });
      return;
    }

    if (corkscrew) {
      this.addMotionWord('ANKLE BREAKER!', 570, 300, -10);
      this.tweens.add({
        targets: flopper,
        x: 720,
        y: 385,
        angle: 2880,
        scaleX: 0.58,
        scaleY: 0.95,
        duration: 1650,
        ease: 'Sine.InOut',
        onUpdate: () => {
          if (Phaser.Math.Between(0, 4) === 0) this.spawnTrailStar(flopper.x, flopper.y - 20);
        },
        onComplete: () => {
          this.tweens.add({
            targets: flopper,
            x: 665,
            y: 486,
            angle: 3600,
            scaleX: 0.7,
            scaleY: 0.62,
            duration: 620,
            ease: 'Bounce.Out',
            onComplete: () => this.showImpactAftermath(flopper, 25),
          });
        },
      });
      return;
    }

    if (magnet) {
      this.addMotionWord('MAGNETISED!', 590, 320, 8);
      this.tweens.add({
        targets: flopper,
        x: 760,
        y: 325,
        angle: 620,
        duration: 620,
        ease: 'Back.In',
        onComplete: () => {
          this.addMotionWord('POLARITY FLIP!', 620, 300, -10);
          this.tweens.add({
            targets: flopper,
            x: 470,
            y: 400,
            angle: -720,
            duration: 700,
            ease: 'Back.InOut',
            onComplete: () => {
              this.tweens.add({
                targets: flopper,
                x: 680,
                y: 486,
                angle: 1440,
                scaleX: 0.66,
                scaleY: 0.6,
                duration: 850,
                ease: 'Bounce.Out',
                onComplete: () => this.showImpactAftermath(flopper, 26),
              });
            },
          });
        },
      });
      return;
    }

    if (tumble) {
      this.tweens.add({
        targets: flopper,
        x: 735,
        y: 480,
        angle: 1440,
        scaleX: 0.72,
        scaleY: 0.72,
        duration: 2050,
        ease: 'Cubic.InOut',
        onComplete: () => this.showImpactAftermath(flopper, 30),
      });
      this.time.delayedCall(720, () => this.addMotionWord('ROLL!', 625, 350, -12));
      return;
    }

    if (airborne) {
      this.tweens.add({
        targets: flopper,
        x: 590,
        y: 300,
        angle: style.includes('moon') ? 540 : 1080,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 880,
        ease: 'Cubic.Out',
        onComplete: () => {
          this.tweens.add({
            targets: flopper,
            x: 650,
            y: 485,
            angle: style.includes('starfish') ? 1530 : 1800,
            scaleX: 0.7,
            scaleY: 0.7,
            duration: 1050,
            ease: 'Bounce.Out',
            onComplete: () => this.showImpactAftermath(flopper, 30),
          });
        },
      });
      this.time.delayedCall(500, () => this.addMotionWord('WHEEEE!', 600, 270, 8));
      return;
    }

    if (cartwheel) {
      this.tweens.add({
        targets: flopper,
        x: 585,
        y: 345,
        angle: -720,
        duration: 920,
        ease: 'Cubic.InOut',
        onComplete: () => {
          this.tweens.add({
            targets: flopper, x: 675, y: 485, angle: -1170, scaleX: 0.72, scaleY: 0.72, duration: 900, ease: 'Bounce.Out',
            onComplete: () => this.showImpactAftermath(flopper, 30),
          });
        },
      });
      this.time.delayedCall(650, () => this.addMotionWord('FLIP!', 615, 320, -10));
      return;
    }

    if (slide) {
      this.tweens.add({
        targets: flopper,
        x: 730,
        y: 486,
        angle: style.includes('shopping') ? 300 : 90,
        scaleX: 0.92,
        scaleY: 0.48,
        duration: 1750,
        ease: 'Cubic.InOut',
        onComplete: () => this.showImpactAftermath(flopper, 18),
      });
      this.time.delayedCall(700, () => this.addMotionWord('SKRRRT!', 625, 430, -6));
      return;
    }

    if (collapse) {
      this.tweens.add({ targets: flopper, y: 430, angle: 18, scaleY: 0.82, duration: 320, ease: 'Sine.InOut' });
      this.time.delayedCall(300, () => this.tweens.add({ targets: flopper, x: 540, y: 452, angle: -28, scaleY: 0.62, duration: 360, ease: 'Sine.InOut' }));
      this.time.delayedCall(630, () => this.tweens.add({ targets: flopper, x: 585, y: 475, angle: 78, scaleX: 0.8, scaleY: 0.42, duration: 500, ease: 'Back.In' }));
      this.time.delayedCall(1080, () => this.tweens.add({
        targets: flopper, x: 625, angle: 450, duration: 700, ease: 'Cubic.Out',
        onComplete: () => this.showImpactAftermath(flopper, 25),
      }));
      this.time.delayedCall(850, () => this.addMotionWord('OH NO!', 590, 400, 10));
      return;
    }

    if (sprinkler) {
      this.tweens.add({ targets: flopper, x: 570, y: 480, angle: 90, scaleX: 0.78, scaleY: 0.62, duration: 620, ease: 'Back.In' });
      this.time.delayedCall(580, () => {
        this.tweens.add({ targets: flopper, angle: 810, x: 640, duration: 1250, ease: 'Sine.InOut' });
        this.tweens.add({ targets: flopper, scaleX: 0.62, scaleY: 0.82, duration: 190, yoyo: true, repeat: 5 });
        this.time.delayedCall(900, () => this.showImpactAftermath(flopper, 22));
      });
      this.time.delayedCall(800, () => this.addMotionWord('SPIN!', 620, 420, -14));
      return;
    }

    this.tweens.add({
      targets: flopper,
      x: 610,
      y: 482,
      angle: 540,
      scaleX: 0.74,
      scaleY: 0.68,
      duration: 1650,
      ease: 'Cubic.InOut',
      onComplete: () => this.showImpactAftermath(flopper, 25),
    });
    this.time.delayedCall(650, () => this.addMotionWord('WHOA!', 600, 365, 8));
  }

  private moveRefereeOutOfWay(referee: Phaser.GameObjects.Container, style: string): void {
    const moveLeft = style.includes('cartwheel') || style.includes('shopping') || style.includes('sprinkler');
    this.tweens.add({
      targets: referee,
      x: moveLeft ? 455 : 820,
      y: 265,
      angle: moveLeft ? -8 : 8,
      scaleX: 0.64,
      scaleY: 0.64,
      duration: 520,
      ease: 'Back.Out',
    });
  }

  private showContactBurst(x: number, y: number): void {
    this.cameras.main.shake(120, 0.0045);
    const ring = this.add.circle(x, y, 18, 0xfff04a, 0.16).setStrokeStyle(5, 0xfff04a, 0.95).setDepth(80);
    const burst = this.add.star(x, y, 10, 12, 38, 0xff7a45, 0.75).setDepth(79);
    this.tweens.add({ targets: [ring, burst], scale: 2.4, alpha: 0, duration: 520, ease: 'Cubic.Out', onComplete: () => { ring.destroy(); burst.destroy(); } });
  }

  private showFloorImpact(x: number, y: number): void {
    this.cameras.main.shake(110, 0.0035);
    const ringA = this.add.ellipse(x, y, 80, 24, 0xffffff, 0).setStrokeStyle(4, 0xffc928, 0.9).setDepth(75);
    const ringB = this.add.ellipse(x, y, 45, 14, 0xffffff, 0).setStrokeStyle(3, 0xff7182, 0.8).setDepth(75);
    this.tweens.add({ targets: [ringA, ringB], scaleX: 2.2, scaleY: 1.7, alpha: 0, duration: 650, ease: 'Cubic.Out', onComplete: () => { ringA.destroy(); ringB.destroy(); } });
  }

  private showImpactAftermath(flopper: Phaser.GameObjects.Container, floorOffset: number): void {
    this.showFloorImpact(flopper.x, flopper.y + floorOffset);
    this.showDizzyOrbit(flopper);
    this.showFlopJudges(flopper);
    this.showCartoonDazeBurst(flopper);

    const reactions = ['WHAT DAY IS IT?', 'COUNT THE SPINS!', 'CALL THE REPLAY!', 'WHERE IS THE RIM?', 'MAX-CONTRACT FLOP!'];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    this.time.delayedCall(180, () => this.addMotionWord(reaction, flopper.x, Math.max(250, flopper.y - 75), Phaser.Math.Between(-12, 12)));

    this.tweens.add({
      targets: flopper,
      angle: flopper.angle + Phaser.Math.Between(-20, 20),
      scaleX: flopper.scaleX * 1.08,
      scaleY: flopper.scaleY * 0.92,
      duration: 150,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.InOut',
    });
  }

  private showDizzyOrbit(flopper: Phaser.GameObjects.Container): void {
    const orbit = this.add.container(flopper.x, flopper.y - 52).setDepth(96);
    const outerOrbit = this.add.container(0, 0);
    const innerOrbit = this.add.container(0, 0);
    const ringA = this.add.ellipse(0, 0, 168, 54, 0xffffff, 0).setStrokeStyle(3, 0xfff04a, 0.86);
    const ringB = this.add.ellipse(0, 0, 120, 38, 0xffffff, 0).setStrokeStyle(2, 0x7ee8ff, 0.78).setAngle(18);

    const starA = this.add.star(-78, 0, 5, 7, 16, 0xfff04a, 1).setStrokeStyle(2, 0xffffff, 0.9);
    const starB = this.add.star(78, 0, 5, 7, 16, 0xff7182, 1).setStrokeStyle(2, 0xffffff, 0.9);
    const starC = this.add.star(0, -29, 5, 6, 13, 0x7ee8ff, 1).setStrokeStyle(2, 0xffffff, 0.85);
    const starD = this.add.star(0, 29, 5, 6, 13, 0xc084fc, 1).setStrokeStyle(2, 0xffffff, 0.85);
    const ballA = this.add.circle(-48, -19, 10, 0xf47a22, 1).setStrokeStyle(2, 0x321407, 1);
    const ballB = this.add.circle(48, 19, 8, 0xf47a22, 1).setStrokeStyle(2, 0x321407, 1);
    const whistle = this.add.text(0, 0, '?!', {
      fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#ffffff', stroke: '#4da3ff', strokeThickness: 5,
    }).setOrigin(0.5);

    outerOrbit.add([ringA, starA, starB, starC, starD]);
    innerOrbit.add([ringB, ballA, ballB, whistle]);
    orbit.add([outerOrbit, innerOrbit]);

    this.tweens.add({ targets: outerOrbit, angle: 1260, duration: 3600, ease: 'Linear' });
    this.tweens.add({ targets: innerOrbit, angle: -1080, duration: 3600, ease: 'Linear' });
    this.tweens.add({ targets: [starA, starB, starC, starD, ballA, ballB, whistle], scale: 1.35, duration: 210, yoyo: true, repeat: 9, ease: 'Sine.InOut' });
    this.tweens.add({
      targets: orbit,
      y: orbit.y - 24,
      alpha: 0,
      delay: 2850,
      duration: 750,
      ease: 'Cubic.In',
      onComplete: () => orbit.destroy(),
    });
  }

  private showFlopJudges(flopper: Phaser.GameObjects.Container): void {
    const cards = [
      { score: '10.0', xOffset: -130, width: 82, fontSize: 23 },
      { score: '11.0', xOffset: -30, width: 82, fontSize: 23 },
      { score: 'FLOP OF THE YEAR', xOffset: 105, width: 176, fontSize: 14 },
    ];

    cards.forEach(({ score, xOffset, width, fontSize }, index) => {
      const x = flopper.x + xOffset;
      const y = Math.min(545, flopper.y + 70 + (index % 2) * 8);
      const card = this.add.container(x, y).setDepth(92).setScale(0.2).setAlpha(0);
      const panel = this.add.rectangle(0, 0, width, 48, index === 1 ? 0xffc928 : 0xffffff, 0.96)
        .setStrokeStyle(4, 0x050718, 1);
      const label = this.add.text(0, 0, score, {
        fontFamily: 'Arial Black, Arial',
        fontSize: `${fontSize}px`,
        color: '#050718',
        align: 'center',
      }).setOrigin(0.5);
      shrinkTextToFit(label, width - 16, 10);
      card.add([panel, label]);
      this.tweens.add({
        targets: card,
        scale: 1,
        alpha: 1,
        angle: Phaser.Math.Between(-8, 8),
        delay: 250 + index * 150,
        duration: 360,
        ease: 'Back.Out',
      });
      this.tweens.add({
        targets: card,
        y: y - 35,
        alpha: 0,
        delay: 2250 + index * 120,
        duration: 650,
        ease: 'Cubic.In',
        onComplete: () => card.destroy(),
      });
    });
  }

  private showCartoonDazeBurst(flopper: Phaser.GameObjects.Container): void {
    const labels = ['FOUL?!', 'WHERE AM I?', 'SEND HELP!', 'REPLAY THAT!'];
    for (let index = 0; index < 7; index += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(35, 95);
      const star = this.add.star(
        flopper.x,
        flopper.y - 20,
        5,
        5,
        Phaser.Math.Between(10, 18),
        [0xfff04a, 0xff7182, 0x7ee8ff, 0xc084fc][index % 4],
        0.95,
      ).setStrokeStyle(2, 0xffffff, 0.85).setDepth(94);
      this.tweens.add({
        targets: star,
        x: flopper.x + Math.cos(angle) * distance,
        y: flopper.y - 20 + Math.sin(angle) * distance * 0.55,
        angle: Phaser.Math.Between(-540, 540),
        scale: 1.6,
        alpha: 0,
        duration: Phaser.Math.Between(900, 1450),
        ease: 'Cubic.Out',
        onComplete: () => star.destroy(),
      });
    }

    const label = labels[Math.floor(Math.random() * labels.length)];
    this.time.delayedCall(450, () => this.addMotionWord(label, flopper.x + 20, Math.max(245, flopper.y - 110), Phaser.Math.Between(-10, 10)));
  }

  private showLaunchTrail(x: number, y: number): void {
    for (let index = 0; index < 8; index += 1) {
      this.time.delayedCall(index * 80, () => this.spawnTrailStar(x + Phaser.Math.Between(-22, 22), y + index * 15));
    }
  }

  private spawnTrailStar(x: number, y: number): void {
    const star = this.add.star(x, y, 5, 4, 11, Phaser.Math.RND.pick([0xfff04a, 0xff7182, 0x7ee8ff]), 0.9)
      .setDepth(73)
      .setAngle(Phaser.Math.Between(-180, 180));
    this.tweens.add({
      targets: star,
      y: y + Phaser.Math.Between(20, 55),
      x: x + Phaser.Math.Between(-24, 24),
      angle: star.angle + Phaser.Math.Between(180, 540),
      scale: 0.25,
      alpha: 0,
      duration: Phaser.Math.Between(450, 760),
      ease: 'Cubic.In',
      onComplete: () => star.destroy(),
    });
  }

  private addMotionWord(label: string, x: number, y: number, angle: number): void {
    const word = this.add.text(x, y, label, {
      fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff', stroke: '#ff365e', strokeThickness: 7,
    }).setOrigin(0.5).setAngle(angle).setDepth(90);
    this.tweens.add({ targets: word, y: y - 35, scale: 1.35, alpha: 0, duration: 850, ease: 'Back.Out', onComplete: () => word.destroy() });
  }

  private finishCommentary(): void {
    if (this.commentaryFinished) return;
    this.commentaryFinished = true;
    if (this.pendingRoom) {
      const room = this.pendingRoom;
      this.pendingRoom = undefined;
      routeForRoom(this, room);
    }
  }

  private handleState(room: RoomState): void {
    gameSession.room = room;
    const match = room.matches.find((candidate) => candidate.id === this.matchId);
    if (!match || match.phase !== 'FLOP' || room.status !== 'ACTIVE') {
      if (!this.commentaryFinished) {
        this.pendingRoom = room;
        return;
      }
      routeForRoom(this, room);
      return;
    }
    const nextSignature = this.makeSignature(match);
    if (nextSignature !== this.signature) this.scene.restart();
  }

  private makeSignature(match: RoomState['matches'][number]): string {
    return JSON.stringify([match.id, match.phase, match.activeShooterId, match.scoreA, match.scoreB, match.commentary, match.flopStyle, match.flopAudioKey]);
  }

  private cleanup(): void {
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}
