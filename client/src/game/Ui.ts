import Phaser from 'phaser';
import { gameSession } from './GameSession';
import { ensureBackgroundMusic, playRecordedWhistle, setSoundEnabled } from './Audio';

export const COLORS = {
  navy: 0x070b22,
  panel: 0x10183f,
  panel2: 0x18265a,
  gold: 0xffc928,
  orange: 0xff8a1f,
  green: 0x39d98a,
  red: 0xff4d67,
  blue: 0x4da3ff,
  white: 0xffffff,
  muted: 0xb9c3e6,
};

export function addBackground(scene: Phaser.Scene, key: string): Phaser.GameObjects.Image {
  ensureBackgroundMusic(scene);
  return scene.add.image(640, 360, key).setDisplaySize(1280, 720);
}

export function addPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha = 0.9,
): Phaser.GameObjects.Rectangle {
  const shadow = scene.add.rectangle(x + 7, y + 9, width, height, 0x000000, 0.35).setStrokeStyle(2, 0x000000, 0.4);
  const panel = scene.add.rectangle(x, y, width, height, COLORS.panel, alpha).setStrokeStyle(3, 0x6f7eff, 0.85);
  shadow.setDepth(panel.depth - 1);
  return panel;
}

export function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  options: { fill?: number; fontSize?: number; disabled?: boolean } = {},
): Phaser.GameObjects.Container {
  const fill = options.fill ?? COLORS.gold;
  const bg = scene.add.rectangle(0, 0, width, height, fill, options.disabled ? 0.35 : 0.98)
    .setStrokeStyle(3, 0xffffff, 0.85);
  const text = scene.add.text(0, 0, label, {
    fontFamily: 'Arial Black, Arial',
    fontSize: `${options.fontSize ?? 22}px`,
    color: options.fill === COLORS.red ? '#ffffff' : '#0b102c',
    align: 'center',
    wordWrap: { width: width - 18, useAdvancedWrap: true },
    lineSpacing: -2,
  }).setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]);
  if (!options.disabled) {
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => container.setScale(1.04));
    bg.on('pointerout', () => container.setScale(1));
    bg.on('pointerdown', () => container.setScale(0.98));
    bg.on('pointerup', () => {
      container.setScale(1.04);
      onClick();
    });
  }
  return container;
}

export function addHeader(scene: Phaser.Scene, title: string, subtitle?: string): void {
  scene.add.rectangle(640, 38, 1280, 76, 0x050718, 0.84).setStrokeStyle(2, 0x6f7eff, 0.65);
  scene.add.text(28, 9, title, {
    fontFamily: 'Arial Black, Arial',
    fontSize: '30px',
    color: '#ffffff',
    stroke: '#060713',
    strokeThickness: 6,
  });
  if (subtitle) {
    scene.add.text(30, 46, subtitle, {
      fontSize: '13px',
      color: '#cbd4ff',
      wordWrap: { width: 800, useAdvancedWrap: true },
      maxLines: 2,
    }).setOrigin(0, 0.5);
  }
  addRoomCode(scene);
  addSoundToggle(scene);
}

export function addRoomCode(scene: Phaser.Scene): Phaser.GameObjects.Text {
  const code = gameSession.room?.code ?? '-----';
  return scene.add.text(1020, 15, `ROOM ${code}`, {
    fontFamily: 'Arial Black, Arial',
    fontSize: '22px',
    color: '#ffffff',
    backgroundColor: '#29346d',
    padding: { x: 14, y: 8 },
  }).setOrigin(0.5, 0);
}

export function addSoundToggle(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const refreshLabel = () => (gameSession.soundEnabled ? 'SOUND ON' : 'SOUND OFF');
  const bg = scene.add.rectangle(0, 0, 120, 38, 0x121a43, 0.95).setStrokeStyle(2, 0xffffff, 0.7).setInteractive({ useHandCursor: true });
  const label = scene.add.text(0, 0, refreshLabel(), { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5);
  const container = scene.add.container(1190, 35, [bg, label]);
  bg.on('pointerup', () => {
    setSoundEnabled(scene, !gameSession.soundEnabled);
    label.setText(refreshLabel());
  });
  return container;
}

export function showToast(scene: Phaser.Scene, message: string, color = 0xff4d67): void {
  const box = scene.add.rectangle(640, 650, 760, 52, color, 0.96).setStrokeStyle(2, 0xffffff, 0.8).setDepth(1000);
  const text = scene.add.text(640, 650, message, { fontFamily: 'Arial Black, Arial', fontSize: '19px', color: '#ffffff' }).setOrigin(0.5).setDepth(1001);
  scene.tweens.add({ targets: [box, text], alpha: 0, delay: 3000, duration: 500, onComplete: () => { box.destroy(); text.destroy(); } });
}

export function playWhistle(scene: Phaser.Scene): void {
  playRecordedWhistle(scene);
}
