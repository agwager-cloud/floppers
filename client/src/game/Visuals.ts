import Phaser from 'phaser';
import { characterById } from './characters';
import type { MatchState, PlayerState } from './types';
import { COLORS } from './Ui';

function wrapDisplayName(name: string, maxLineLength: number, maxLines = 2): string {
  const tokens = name.replace(/-/g, '- ').split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const token of tokens) {
    const cleaned = token.endsWith('-') ? token.slice(0, -1) + '-' : token;
    const candidate = current ? `${current} ${cleaned}` : cleaned;
    if (candidate.length <= maxLineLength || !current) {
      current = candidate;
      continue;
    }
    lines.push(current.replace(/\s+-/g, '-'));
    current = cleaned;
    if (lines.length === maxLines - 1) break;
  }

  if (current) lines.push(current.replace(/\s+-/g, '-'));
  const remaining = tokens.slice(lines.join(' ').replace(/-/g, '- ').split(/\s+/).filter(Boolean).length);
  if (remaining.length) {
    const extra = remaining.join(' ').replace(/\s+-/g, '-');
    lines[lines.length - 1] = `${lines[lines.length - 1]} ${extra}`.trim();
  }
  return lines.slice(0, maxLines).join('\n');
}

export function shrinkTextToFit(
  text: Phaser.GameObjects.Text,
  maxWidth: number,
  minFontSize = 7,
): Phaser.GameObjects.Text {
  let size = Number.parseFloat(String(text.style.fontSize)) || 12;
  while (text.width > maxWidth && size > minFontSize) {
    size -= 0.5;
    text.setFontSize(size);
  }
  return text;
}

function drawSinglet(scene: Phaser.Scene, primary: number, secondary: number, accent: number): Phaser.GameObjects.Container {
  const shell = scene.add.graphics();
  shell.fillStyle(primary, 1);
  shell.lineStyle(2.5, accent, 1);
  const bodyPoints = [
    new Phaser.Geom.Point(-19, -31),
    new Phaser.Geom.Point(-11, -36),
    new Phaser.Geom.Point(-8, -31),
    new Phaser.Geom.Point(-6, -24),
    new Phaser.Geom.Point(-4, -18),
    new Phaser.Geom.Point(4, -18),
    new Phaser.Geom.Point(6, -24),
    new Phaser.Geom.Point(8, -31),
    new Phaser.Geom.Point(11, -36),
    new Phaser.Geom.Point(19, -31),
    new Phaser.Geom.Point(17, -18),
    new Phaser.Geom.Point(17, 28),
    new Phaser.Geom.Point(-17, 28),
    new Phaser.Geom.Point(-17, -18),
  ];
  shell.beginPath();
  shell.moveTo(bodyPoints[0].x, bodyPoints[0].y);
  for (const pt of bodyPoints.slice(1)) shell.lineTo(pt.x, pt.y);
  shell.closePath();
  shell.fillPath();
  shell.strokePath();

  const collarOuter = scene.add.graphics();
  collarOuter.lineStyle(4, accent, 1);
  collarOuter.beginPath();
  collarOuter.moveTo(-7, -33);
  collarOuter.lineTo(-4, -29);
  collarOuter.lineTo(0, -27);
  collarOuter.lineTo(4, -29);
  collarOuter.lineTo(7, -33);
  collarOuter.strokePath();

  const collarInner = scene.add.graphics();
  collarInner.lineStyle(2.25, secondary, 1);
  collarInner.beginPath();
  collarInner.moveTo(-5.2, -31);
  collarInner.lineTo(-2.5, -28.7);
  collarInner.lineTo(0, -27.8);
  collarInner.lineTo(2.5, -28.7);
  collarInner.lineTo(5.2, -31);
  collarInner.strokePath();

  const leftTrimOuter = scene.add.graphics();
  leftTrimOuter.lineStyle(3, accent, 1);
  leftTrimOuter.beginPath();
  leftTrimOuter.moveTo(-17, -30);
  leftTrimOuter.lineTo(-12, -33);
  leftTrimOuter.lineTo(-9, -28);
  leftTrimOuter.lineTo(-7, -22);
  leftTrimOuter.lineTo(-5, -16);
  leftTrimOuter.strokePath();

  const leftTrimInner = scene.add.graphics();
  leftTrimInner.lineStyle(1.8, secondary, 1);
  leftTrimInner.beginPath();
  leftTrimInner.moveTo(-15, -29);
  leftTrimInner.lineTo(-11.2, -31.2);
  leftTrimInner.lineTo(-8.7, -26.9);
  leftTrimInner.lineTo(-7, -21.7);
  leftTrimInner.lineTo(-5.2, -17.1);
  leftTrimInner.strokePath();

  const rightTrimOuter = scene.add.graphics();
  rightTrimOuter.lineStyle(3, accent, 1);
  rightTrimOuter.beginPath();
  rightTrimOuter.moveTo(17, -30);
  rightTrimOuter.lineTo(12, -33);
  rightTrimOuter.lineTo(9, -28);
  rightTrimOuter.lineTo(7, -22);
  rightTrimOuter.lineTo(5, -16);
  rightTrimOuter.strokePath();

  const rightTrimInner = scene.add.graphics();
  rightTrimInner.lineStyle(1.8, secondary, 1);
  rightTrimInner.beginPath();
  rightTrimInner.moveTo(15, -29);
  rightTrimInner.lineTo(11.2, -31.2);
  rightTrimInner.lineTo(8.7, -26.9);
  rightTrimInner.lineTo(7, -21.7);
  rightTrimInner.lineTo(5.2, -17.1);
  rightTrimInner.strokePath();

  const hemOuter = scene.add.graphics();
  hemOuter.lineStyle(2.2, accent, 0.95);
  hemOuter.beginPath();
  hemOuter.moveTo(-10.5, 24.6);
  hemOuter.lineTo(10.5, 24.6);
  hemOuter.strokePath();

  const hemInner = scene.add.graphics();
  hemInner.lineStyle(1.4, secondary, 1);
  hemInner.beginPath();
  hemInner.moveTo(-9, 22.5);
  hemInner.lineTo(9, 22.5);
  hemInner.strokePath();

  const sideInsetLeft = scene.add.graphics();
  sideInsetLeft.lineStyle(1.4, 0x000000, 0.08);
  sideInsetLeft.beginPath();
  sideInsetLeft.moveTo(-14, -11);
  sideInsetLeft.lineTo(-14, 21);
  sideInsetLeft.strokePath();

  const sideInsetRight = scene.add.graphics();
  sideInsetRight.lineStyle(1.4, 0x000000, 0.08);
  sideInsetRight.beginPath();
  sideInsetRight.moveTo(14, -11);
  sideInsetRight.lineTo(14, 21);
  sideInsetRight.strokePath();

  return scene.add.container(0, 0, [
    shell,
    collarOuter, collarInner,
    leftTrimOuter, leftTrimInner,
    rightTrimOuter, rightTrimInner,
    hemOuter, hemInner,
    sideInsetLeft, sideInsetRight,
  ]);
}

export function createJerseyBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  primary: number,
  secondary: number,
  accent: number,
  number: number,
  scale = 1,
): Phaser.GameObjects.Container {
  const singlet = drawSinglet(scene, primary, secondary, accent);
  const numberText = scene.add.text(0, 2, String(number), {
    fontFamily: 'Arial Black, Arial',
    fontSize: '22px',
    color: '#ffffff',
    stroke: '#050718',
    strokeThickness: 4,
  }).setOrigin(0.5);
  return scene.add.container(x, y, [singlet, numberText]).setScale(scale);
}

export function createBasketball(
  scene: Phaser.Scene,
  x: number,
  y: number,
  radius = 16,
): Phaser.GameObjects.Container {
  const seamWidth = Math.max(1.5, radius * 0.1);
  const ball = scene.add.circle(0, 0, radius, 0xf47a22)
    .setStrokeStyle(Math.max(2, radius * 0.12), 0x321407, 1);

  // Draw every seam with one local Graphics object. The old Phaser Line game
  // object could leave a stray segment extending left of the meter marker on
  // iPad. These bounded seams stay completely inside the basketball.
  const seams = scene.add.graphics();
  seams.lineStyle(seamWidth, 0x321407, 1);
  seams.lineBetween(-radius * 0.86, 0, radius * 0.86, 0);

  seams.beginPath();
  seams.moveTo(0, -radius * 0.87);
  seams.lineTo(0, radius * 0.87);
  seams.strokePath();

  seams.beginPath();
  seams.arc(-radius * 0.63, 0, radius * 0.82, -0.9, 0.9, false);
  seams.strokePath();

  seams.beginPath();
  seams.arc(radius * 0.63, 0, radius * 0.82, Math.PI - 0.9, Math.PI + 0.9, false);
  seams.strokePath();

  return scene.add.container(x, y, [ball, seams]);
}

export function createPlayerPortrait(
  scene: Phaser.Scene,
  x: number,
  y: number,
  characterId: string | undefined,
  displaySize = 100,
): Phaser.GameObjects.Container {
  const character = characterById(characterId);
  const faceKey = `player-face-${character.id}`;

  if (!scene.textures.exists(faceKey)) {
    const fallback = scene.add.circle(0, 0, displaySize * 0.4, character.skin)
      .setStrokeStyle(Math.max(2, displaySize * 0.035), character.accent, 1);
    return scene.add.container(x, y, [fallback]);
  }

  // A slightly enlarged, dark-tinted copy creates a clean silhouette around the
  // transparent portrait. It makes the face readable over every court/background
  // without bringing back the old circular portrait frame.
  const outline = scene.add.image(0, 2, faceKey)
    .setDisplaySize(displaySize * 1.065, displaySize * 1.065)
    .setTint(0x050718)
    .setAlpha(0.82);
  const portrait = scene.add.image(0, 0, faceKey)
    .setDisplaySize(displaySize, displaySize);

  return scene.add.container(x, y, [outline, portrait]);
}

export function createPlayerFigure(
  scene: Phaser.Scene,
  x: number,
  y: number,
  player: PlayerState,
  scale = 1,
): Phaser.GameObjects.Container {
  const character = characterById(player.characterId);
  const shadow = scene.add.ellipse(0, 75, 84, 22, 0x000000, 0.35);
  const skin = character.skin;

  const leftLeg = scene.add.rectangle(-17, 54, 14, 54, skin).setStrokeStyle(2, 0x513525, 0.5);
  const rightLeg = scene.add.rectangle(17, 54, 14, 54, skin).setStrokeStyle(2, 0x513525, 0.5);
  const leftSock = scene.add.rectangle(-17, 78, 14, 11, 0xffffff);
  const rightSock = scene.add.rectangle(17, 78, 14, 11, 0xffffff);
  const leftShoe = scene.add.ellipse(-17, 92, 24, 10, 0x18181d);
  const rightShoe = scene.add.ellipse(17, 92, 24, 10, 0x18181d);

  const shorts = scene.add.graphics();
  shorts.fillStyle(character.secondary, 1);
  shorts.lineStyle(3, character.accent, 1);
  shorts.fillRect(-26, 20, 52, 26);
  shorts.strokeRect(-26, 20, 52, 26);
  const waistband = scene.add.rectangle(0, 22, 52, 5, character.accent, 0.9);

  const leftArm = scene.add.rectangle(-36, -2, 12, 50, skin).setAngle(14).setStrokeStyle(2, 0x513525, 0.45);
  const rightArm = scene.add.rectangle(36, -2, 12, 50, skin).setAngle(-14).setStrokeStyle(2, 0x513525, 0.45);

  const singlet = drawSinglet(scene, character.primary, character.secondary, character.accent).setScale(1.55).setPosition(0, -5);
  const number = scene.add.text(0, -3, String(character.number), {
    fontFamily: 'Arial Black, Arial',
    fontSize: '28px',
    color: '#ffffff',
    stroke: '#000000',
    strokeThickness: 4,
  }).setOrigin(0.5);

  // The realistic portrait assets are tightly cropped around the head so
  // they can sit cleanly on top of the procedural singlet body. Raising the
  // portrait slightly improves the join point in Free Throw, Flop, and Final
  // Results scenes without affecting portrait uses elsewhere.
  const portrait = createPlayerPortrait(scene, 0, -73, character.id, 122);

  const name = scene.add.text(0, 102, wrapDisplayName(player.name, 14, 2), {
    fontFamily: 'Arial Black, Arial',
    fontSize: '15px',
    color: '#ffffff',
    stroke: '#050718',
    strokeThickness: 4,
    align: 'center',
    lineSpacing: -3,
  }).setOrigin(0.5, 0);

  return scene.add.container(x, y, [
    shadow, leftLeg, rightLeg, leftSock, rightSock, leftShoe, rightShoe,
    leftArm, rightArm, shorts, waistband, singlet, portrait, number, name,
  ]).setScale(scale);
}

export function createReferee(scene: Phaser.Scene, x: number, y: number, scale = 1): Phaser.GameObjects.Container {
  const shadow = scene.add.ellipse(0, 80, 85, 22, 0x000000, 0.35);
  const legs = [scene.add.rectangle(-19, 56, 18, 65, 0x1c1c24), scene.add.rectangle(19, 56, 18, 65, 0x1c1c24)];
  const arms = [scene.add.rectangle(-48, 0, 17, 78, 0x252733).setAngle(12), scene.add.rectangle(48, 0, 17, 78, 0x252733).setAngle(-12)];
  const body = scene.add.rectangle(0, 0, 82, 112, 0xc9cbd3).setStrokeStyle(4, 0x151723, 1);
  const stripes: Phaser.GameObjects.Rectangle[] = [];
  for (let i = -32; i <= 32; i += 16) stripes.push(scene.add.rectangle(i, 0, 7, 105, 0xeeeeee, 0.85));
  const collar = scene.add.triangle(0, -45, -25, -16, 25, -16, 0, 14, 0x1d3557);
  const head = scene.add.circle(0, -77, 32, 0xd8a073).setStrokeStyle(3, 0x2b1420, 1);
  const hair = scene.add.arc(0, -86, 32, 190, 350, false, 0x9197a4).setStrokeStyle(3, 0x9197a4, 1);
  const whistle = scene.add.circle(0, -62, 5, 0x111111);
  const label = scene.add.text(0, 112, 'REFEREE', { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffffff', stroke: '#050718', strokeThickness: 4 }).setOrigin(0.5);
  return scene.add.container(x, y, [shadow, ...legs, ...arms, body, ...stripes, collar, head, hair, whistle, label]).setScale(scale);
}

export function addScoreCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  player: PlayerState,
  score: number,
  active: boolean,
): Phaser.GameObjects.Container {
  const character = characterById(player.characterId);
  const bg = scene.add.rectangle(0, 0, 286, 106, 0x090d29, 0.95)
    .setStrokeStyle(active ? 5 : 3, active ? COLORS.gold : 0x8795d8, 1);
  const colorBar = scene.add.rectangle(-134, 0, 10, 94, character.primary, 1);
  const portrait = createPlayerPortrait(scene, -101, -1, character.id, 68);

  const userName = scene.add.text(-66, -30, player.name, {
    fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#ffffff',
  }).setOrigin(0, 0.5);
  shrinkTextToFit(userName, 144, 9);

  const parodyName = scene.add.text(-66, -7, character.name, {
    fontFamily: 'Arial Black, Arial', fontSize: '11px', color: '#7ee8ff',
  }).setOrigin(0, 0.5);
  shrinkTextToFit(parodyName, 144, 7);

  const details = scene.add.text(-66, 18, `${player.isBot ? 'BOT • ' : ''}${character.city} • #${character.number}`, {
    fontFamily: 'Arial, sans-serif', fontStyle: 'bold', fontSize: '10px', color: '#bec8f2',
  }).setOrigin(0, 0.5);
  shrinkTextToFit(details, 144, 7);

  const scoreText = scene.add.text(110, 6, String(score), {
    fontFamily: 'Arial Black, Arial', fontSize: '48px', color: active ? '#ffc928' : '#ffffff', stroke: '#000000', strokeThickness: 5,
  }).setOrigin(0.5);

  return scene.add.container(x, y, [bg, colorBar, portrait, userName, parodyName, details, scoreText]);
}

export function getMatchPlayers(match: MatchState, players: PlayerState[]): { a: PlayerState; b: PlayerState } {
  const fallback: PlayerState = { id: 'unknown', name: 'Unknown', isHost: false, isBot: true, connected: true };
  return {
    a: players.find((player) => player.id === match.playerAId) ?? fallback,
    b: players.find((player) => player.id === match.playerBId) ?? fallback,
  };
}
