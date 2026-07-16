import Phaser from 'phaser';
import { playWinnerAnnouncement, stopWinnerAnnouncement } from '../game/Audio';
import { characterById } from '../game/characters';
import { gameSession } from '../game/GameSession';
import { network } from '../game/Network';
import { routeForRoom } from '../game/SceneRouter';
import { addBackground, addButton, addHeader, addPanel, COLORS, showToast } from '../game/Ui';
import { createPlayerFigure, shrinkTextToFit } from '../game/Visuals';

export class FinalResultsScene extends Phaser.Scene {
  private cleanups: Array<() => void> = [];

  constructor() {
    super('FinalResultsScene');
  }

  create(): void {
    const room = gameSession.room;
    addBackground(this, 'lobbyBg');
    this.add.rectangle(640, 360, 1280, 720, 0x050718, 0.3);
    addHeader(this, 'FOSTER\'S FLOPPERS CHAMPION', 'The tournament is complete. One player has flopped, distracted and free-thrown their way to glory.');
    addPanel(this, 640, 390, 930, 560, 0.9);

    const winner = room?.players.find((player) => player.id === room.finalWinnerId);
    if (!winner) {
      showToast(this, 'The winner could not be loaded.');
      return;
    }
    const character = characterById(winner.characterId);

    this.add.text(640, 125, 'AND THE WINNER IS…', {
      fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffffff', stroke: '#050718', strokeThickness: 6,
    }).setOrigin(0.5);

    createPlayerFigure(this, 430, 385, winner, 0.86);
    this.drawTrophy(790, 365);

    const userName = this.add.text(640, 548, winner.name.toUpperCase(), {
      fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#ffc928', stroke: '#050718', strokeThickness: 8,
    }).setOrigin(0.5);
    shrinkTextToFit(userName, 760, 24);

    const parodyName = this.add.text(640, 590, character.name.toUpperCase(), {
      fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#7ee8ff', stroke: '#050718', strokeThickness: 5,
    }).setOrigin(0.5);
    shrinkTextToFit(parodyName, 760, 15);

    this.add.text(640, 621, `${character.city.toUpperCase()} • #${character.number} • FOSTER'S FLOPPERS TROPHY WINNER`, {
      fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);

    if (gameSession.isHost) {
      addButton(this, 510, 676, 230, 52, 'PLAY AGAIN', () => network.send({ type: 'RESET_TOURNAMENT' }), {
        fill: COLORS.green,
        fontSize: 19,
      });
      addButton(this, 770, 676, 230, 52, 'CHANGE PLAYERS', () => network.send({ type: 'CHANGE_PLAYERS' }), {
        fill: COLORS.blue,
        fontSize: 17,
      });
    } else {
      this.add.text(640, 675, 'Waiting for the host to play again or change players', { fontSize: '17px', color: '#dbe1ff' }).setOrigin(0.5);
    }

    this.createConfetti();
    this.time.delayedCall(450, () => playWinnerAnnouncement(this, character.id));

    this.cleanups.push(network.onState((nextRoom) => {
      gameSession.room = nextRoom;
      if (nextRoom.status !== 'COMPLETE') routeForRoom(this, nextRoom);
    }));
    this.cleanups.push(network.onError((message) => showToast(this, message)));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
  }

  private drawTrophy(x: number, y: number): void {
    const glow = this.add.circle(x, y, 145, 0xffc928, 0.12);
    this.tweens.add({ targets: glow, scale: 1.18, alpha: 0.28, duration: 900, yoyo: true, repeat: -1 });
    this.add.ellipse(x, y - 42, 165, 128, 0xffc928).setStrokeStyle(7, 0xffffff, 0.95);
    this.add.rectangle(x, y + 60, 46, 120, 0xffc928).setStrokeStyle(6, 0xffffff, 0.95);
    this.add.rectangle(x, y + 130, 150, 42, 0x6d3b15).setStrokeStyle(6, 0xffc928, 1);
    this.add.arc(x - 92, y - 45, 58, 260, 100, false).setStrokeStyle(16, 0xffc928, 1);
    this.add.arc(x + 92, y - 45, 58, 80, 280, false).setStrokeStyle(16, 0xffc928, 1);
    this.add.text(x, y - 49, 'FF', { fontFamily: 'Arial Black, Arial', fontSize: '42px', color: '#11183b', stroke: '#ffffff', strokeThickness: 3 }).setOrigin(0.5);
    this.add.text(x, y + 130, 'FLOPPERS TROPHY', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
  }

  private createConfetti(): void {
    for (let i = 0; i < 70; i += 1) {
      const piece = this.add.rectangle(Phaser.Math.Between(70, 1210), Phaser.Math.Between(-250, -20), Phaser.Math.Between(5, 11), Phaser.Math.Between(10, 22), Phaser.Display.Color.RandomRGB(90).color, 0.95).setAngle(Phaser.Math.Between(0, 180));
      this.tweens.add({
        targets: piece,
        y: 760,
        x: piece.x + Phaser.Math.Between(-120, 120),
        angle: piece.angle + Phaser.Math.Between(360, 980),
        duration: Phaser.Math.Between(2500, 5200),
        delay: Phaser.Math.Between(0, 1600),
        repeat: -1,
      });
    }
  }

  private cleanup(): void {
    stopWinnerAnnouncement();
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
  }
}
