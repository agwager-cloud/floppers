import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT ?? 2567);
const BASE_GREEN_HALF_WIDTH = 0.14;
// The green target tightens after each odd deuce threshold. Once a match has
// reached 3-3, the current pressure tier stays active until the next threshold
// (5-5, 7-7, 9-9, then 11-11+). At 11-11 the visible green zone is only just
// large enough to hold the marker, while the scoring tolerance becomes a tiny
// centre window so the release must be effectively perfect.
const GREEN_SUCCESS_HALF_WIDTHS = [BASE_GREEN_HALF_WIDTH, 0.115, 0.095, 0.078, 0.065, 0.012] as const;
const SHOT_CLOCK_MS = 10_000;
const DISTRACTION_WINDOW_MS = 6_000;
const DISTRACTION_DELAY_MS = 250;
const DISTRACTION_EFFECT_MS = 1_500;
const MATCH_WATCHDOG_INTERVAL_MS = 500;
const FREE_THROW_WATCHDOG_GRACE_MS = 1_200;
const SHOT_FLIGHT_WATCHDOG_GRACE_MS = 3_200;
const HUMAN_FLOP_SCENE_MS = 7_200;
const AUTOMATED_FLOP_SCENE_MS = 5_800;
const VALID_SIZES = new Set([2, 4, 8, 16, 32]);
// Coprime half-cycle pairs make the two markers travel at visibly different
// speeds while guaranteeing that they meet in the centre only at the two
// deliberately scheduled perfect-shot windows.
const METER_SPEED_PROFILES = [[1, 2], [2, 3], [3, 4]] as const;

const CHARACTER_IDS = [
  'luka-donut', 'shai-gorgeous', 'wemby-long', 'joke-itch', 'cade-cupcake', 'steph-currywurst',
  'tater-tot', 'ant-eddy', 'kevin-durantula', 'devin-cooker', 'ja-morantula', 'jimmy-buckets',
  'bam-omelette', 'damian-lizard', 'donovan-mitchell', 'trae-youngster', 'lamelo-balloon', 'zion-will-eat',
  'paolo-bankroll', 'franz-wagner', 'tyrese-haliburger', 'brunson-burner', 'karl-townhouse', 'embiid-embarrassed',
  'maxey-taxi', 'kawhi-claw', 'harden-garden', 'fox-trot', 'sabonis-bonus', 'chet-mix',
  'jaylen-brownie', 'scottie-barbecue', 'alperen-sengoon', 'jalen-greenbeans', 'austin-reaves', 'rudy-gobert',
  'draymond-green', 'jalen-rub-a-dub', 'giannis-auntie-taco-mayo', 'lebomb-flames',
];

const BOT_NAMES = [
  'Airball Albert', 'Backboard Barry', 'Brickhouse Brenda', 'Travelin Trevor', 'Flopzilla Frank', 'Whistle Wendy',
  'No-Look Noodle', 'Pump-Fake Pete', 'Double-Dribble Dave', 'Technical Terry', 'Benchwarmer Ben', 'Layup Larry',
  'Free-Throw Fiona', 'Crossover Colin', 'Buzzer-Beater Bob', 'Ankle-Breaker Annie', 'Shot-Clock Sharon', 'Paint-Camper Pam',
  'Screen-Setter Steve', 'Euro-Step Eugene', 'Rebound Randy', 'Hook-Shot Holly', 'Timeout Tina', 'Full-Court Fred',
  'Three-Point Theo', 'Box-Out Betty', 'Swish McDish', 'Loose-Ball Lou', 'Charge-Card Charlie', 'Rim-Rattler Rita',
  'Fast-Break Felix', 'Overtime Ollie',
];

const COMMENTARY = [
  'That contact was so light it may have been delivered by a passing cloud!',
  'He has rolled three suburbs away from the original foul!',
  'The referee is checking whether gravity itself committed the offence!',
  'That flop had a beginning, a middle, an interval and a sequel!',
  'Somebody call the theatre critics — this performance demands a review!',
  'The defender blinked and somehow caused a category-five collapse!',
  'That was less a fall and more a fully choreographed floor routine!',
  'The replay crew will need extra cameras to capture every rotation!',
  'He has appealed to the referee, the crowd and several nearby satellites!',
  'The whistle was blown mainly to stop the player rolling into the car park!',
  'There may have been contact, but the landing deserves its own trophy!',
  'The referee looks deeply unimpressed, which somehow makes it even funnier!',
  'That flop deserves slow motion, sad music, and an award ceremony!',
  "I've seen better flopping from my goldfish!",
  "He's a free-throw merchant!",
  'That flop was so expensive, it just put his team over the luxury tax!',
  'He hit the floor harder than a superstar demanding a trade!',
  'He flopped so far, Adam Silver is adding a four-point line where he landed!',
  "He got brushed by a shoelace and reacted like he'd been posterised by a freight train!",
  'He went down faster than a team tanking for the number-one draft pick!',
  'The defender breathed near him — and he entered the NBA concussion protocol!',
  'He sold that contact harder than a rebuilding team sells hope!',
  'That was a flagrant foul on the laws of physics!',
  'Somebody call the G League — his dignity has been reassigned!',
  "The contact was so light, even the shot clock didn't notice it!",
  'Scott Foster saw absolutely nothing — and somehow called three fouls!',
  'Call the Replay Center — someone just committed a foul from another time zone!',
  'He fell over before the defender even arrived — outstanding anticipation!',
];

const FLOP_STYLES = [
  'triple barrel roll', 'helicopter spin', 'slow-motion faint', 'reverse cartwheel', 'penguin belly slide',
  'invisible banana peel', 'dramatic lawn sprinkler', 'five-stage collapse', 'human tumbleweed', 'statue-to-spaghetti',
  'airborne starfish', 'possessed shopping trolley', 'double somersault appeal', 'floor-is-lava collapse',
  'windmill wobble', 'moon-gravity meltdown', 'accordion crumple', 'rolling thunder audition',
  'seven-spin washing machine', 'instant replay rewind', 'courtside pinball disaster', 'trade-deadline teleport',
  'four-point-line launch', 'referee-signal tornado', 'mascot audition cartwheel', 'luxury-tax tumble',
  'shot-clock boomerang', 'baseline bowling ball', 'free-throw merchant moonwalk', 'NBA logo rocket launch',
  'mascot cannon launch', 'arena cannon ejection', 'courtside trampoline disaster', 'three-bounce trampoline appeal',
  'instant replay clone glitch', 'scoreboard glitch teleport', 'ankle-breaker corkscrew', 'human drill-bit spin',
  'scoreboard magnet malfunction', 'magnetic baseline disaster',
];
const FLOP_AUDIO_KEYS = [
  'flop-banana', 'flop-blow-over', 'flop-boom-2', 'flop-butterfingers',
  'flop-embarassing', 'flop-floats', 'flop-get-that-outta-here', 'flop-here-comes',
  'flop-jokin', 'flop-kaboom', 'flop-king-james', 'flop-ouch',
  'flop-puts-boom', 'flop-section-c', 'flop-shove', 'flop-turn',
  'flop-slow-motion-award', 'flop-goldfish', 'flop-free-throw-merchant', 'flop-luxury-tax',
  'flop-trade-demand', 'flop-four-point-line', 'flop-shoelace-freight-train', 'flop-tanking-number-one-pick',
  'flop-concussion-protocol', 'flop-rebuilding-team-sells-hope', 'flop-laws-of-physics', 'flop-g-league-dignity',
  'flop-shot-clock-notice', 'flop-scott-foster-three-fouls', 'flop-replay-center-time-zone', 'flop-anticipation-flop',
 ] as const;
const FLOP_AUDIO_COMMENTARY: Record<string, string> = {
  'flop-slow-motion-award': 'That flop deserves slow motion, sad music, and an award ceremony!',
  'flop-goldfish': "I've seen better flopping from my goldfish!",
  'flop-free-throw-merchant': "He's a free-throw merchant!",
  'flop-luxury-tax': 'That flop was so expensive, it just put his team over the luxury tax!',
  'flop-trade-demand': 'He hit the floor harder than a superstar demanding a trade!',
  'flop-four-point-line': 'He flopped so far, Adam Silver is adding a four-point line where he landed!',
  'flop-shoelace-freight-train': "He got brushed by a shoelace and reacted like he'd been posterised by a freight train!",
  'flop-tanking-number-one-pick': 'He went down faster than a team tanking for the number-one draft pick!',
  'flop-concussion-protocol': 'The defender breathed near him — and he entered the NBA concussion protocol!',
  'flop-rebuilding-team-sells-hope': 'He sold that contact harder than a rebuilding team sells hope!',
  'flop-laws-of-physics': 'That was a flagrant foul on the laws of physics!',
  'flop-g-league-dignity': 'Somebody call the G League — his dignity has been reassigned!',
  'flop-shot-clock-notice': "The contact was so light, even the shot clock didn't notice it!",
  'flop-scott-foster-three-fouls': 'Scott Foster saw absolutely nothing — and somehow called three fouls!',
  'flop-replay-center-time-zone': 'Call the Replay Center — someone just committed a foul from another time zone!',
  'flop-anticipation-flop': 'He fell over before the defender even arrived — outstanding anticipation!',
};
const FREE_THROW_MADE_AUDIO_KEYS = [
  'free-throw-made-bullseye', 'free-throw-made-heating-2', 'free-throw-made-heating-up', 'free-throw-made-hole',
  'free-throw-made-it-s-good', 'free-throw-made-on-fire', 'free-throw-made-too-easy', 'free-throw-made-yes',
] as const;
const FREE_THROW_MISS_AUDIO_KEYS = [
  'free-throw-miss-airball', 'free-throw-miss-ballchucker', 'free-throw-miss-blind', 'free-throw-miss-empty',
  'free-throw-miss-no-good', 'free-throw-miss-no-surprise', 'free-throw-miss-no-way', 'free-throw-miss-not-close',
  'free-throw-miss-wild-shot',
] as const;


interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isBot: boolean;
  connected: boolean;
  isSpectator?: boolean;
  characterId?: string;
}

type RoomStatus = 'SETUP' | 'BRACKET' | 'ACTIVE' | 'COMPLETE';
type MatchPhase = 'WAITING' | 'FLOP' | 'FREE_THROW' | 'COMPLETE';

interface Match {
  id: string;
  round: number;
  slot: number;
  playerAId: string;
  playerBId: string;
  scoreA: number;
  scoreB: number;
  phase: MatchPhase;
  activeShooterId: string;
  attemptsRemaining: number;
  winnerId?: string;
  commentary: string;
  flopStyle: string;
  flopAudioKey: string;
  lastMadeAudioKey?: string;
  lastMissAudioKey?: string;
  distraction?: { type: string; byPlayerId: string; startedAt: number; expiresAt: number };
  distractionUsedByPlayerId?: string;
  lastDistractionAt?: number;
  shotInFlight: boolean;
  lastShot?: { id: string; shooterId: string; made: boolean; direction: number; power: number; resolvedAt: number; resultAudioKey: string };
  turnReadyAt?: number;
  turnStartedAt?: number;
  turnDeadlineAt?: number;
  distractionWindowClosesAt?: number;
  turnId?: string;
  meterFirstPerfectAt?: number;
  meterSecondPerfectAt?: number;
  meterDirectionHalfCycles?: number;
  meterPowerHalfCycles?: number;
  meterDirectionSign?: number;
  meterPowerSign?: number;
  autoShotScheduled?: boolean;
  phaseDeadlineAt?: number;
  completedAt?: number;
  floppedPlayerIds: string[];
}

interface Room {
  code: string;
  status: RoomStatus;
  players: Player[];
  tournamentSize: number;
  roundNumber: number;
  matches: Match[];
  currentRoundMatchIds: string[];
  finalWinnerId?: string;
  roundAdvanceAt?: number;
}

type ClientMessage =
  | { type: 'HOST_ROOM'; name: string }
  | { type: 'JOIN_ROOM'; name: string; code: string }
  | { type: 'RESUME_SESSION'; playerId: string; code: string }
  | { type: 'SELECT_CHARACTER'; characterId: string }
  | { type: 'SET_TOURNAMENT_SIZE'; size: number }
  | { type: 'CREATE_TOURNAMENT' }
  | { type: 'START_ROUND' }
  | { type: 'SHOT'; matchId: string; direction: number; power: number }
  | { type: 'DISTRACT'; matchId: string; distractionType: string }
  | { type: 'RESET_TOURNAMENT' }
  | { type: 'CHANGE_PLAYERS' }
  | { type: 'RETURN_TO_LOBBY' }
  | { type: 'KICK_PLAYER'; playerId: string };

interface ConnectionContext {
  roomCode?: string;
  playerId?: string;
}

const rooms = new Map<string, Room>();
const contexts = new Map<WebSocket, ConnectionContext>();
const scheduled = new Map<string, Set<NodeJS.Timeout>>();

const server = createServer((request, response) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/health' || request.url === '/') {
    response.writeHead(200);
    response.end(JSON.stringify({ ok: true, game: "Foster's Floppers", rooms: rooms.size }));
    return;
  }
  response.writeHead(404);
  response.end(JSON.stringify({ error: 'Not found' }));
});

const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  contexts.set(socket, {});

  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as ClientMessage;
      handleMessage(socket, message);
    } catch (error) {
      sendError(socket, error instanceof Error ? error.message : 'Invalid request.');
    }
  });

  socket.on('close', () => handleDisconnect(socket));
  socket.on('error', () => handleDisconnect(socket));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Foster's Floppers server listening on http://0.0.0.0:${PORT}`);
});

const matchWatchdog = setInterval(() => runMatchWatchdog(), MATCH_WATCHDOG_INTERVAL_MS);
matchWatchdog.unref();

function shutdown(signal: string): void {
  clearInterval(matchWatchdog);
  console.log(`${signal} received. Closing Foster's Floppers server gracefully.`);
  for (const socket of contexts.keys()) {
    try {
      socket.close(1001, 'Server restarting');
    } catch {
      // Ignore sockets that are already closed.
    }
  }
  wss.close(() => {
    server.close(() => process.exit(0));
  });
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

function handleMessage(socket: WebSocket, message: ClientMessage): void {
  if (!message || typeof message.type !== 'string') throw new Error('Invalid message.');
  if (message.type === 'HOST_ROOM') return hostRoom(socket, message.name);
  if (message.type === 'JOIN_ROOM') return joinRoom(socket, message.name, message.code);
  if (message.type === 'RESUME_SESSION') return resumeSession(socket, message.playerId, message.code);

  const context = contexts.get(socket);
  const room = context?.roomCode ? rooms.get(context.roomCode) : undefined;
  const player = room?.players.find((candidate) => candidate.id === context?.playerId);
  if (!room || !player) throw new Error('You are not currently in a room.');

  switch (message.type) {
    case 'SELECT_CHARACTER':
      selectCharacter(room, player, message.characterId);
      break;
    case 'SET_TOURNAMENT_SIZE':
      requireHost(player);
      setTournamentSize(room, message.size);
      break;
    case 'CREATE_TOURNAMENT':
      requireHost(player);
      createTournament(room);
      break;
    case 'START_ROUND':
      requireHost(player);
      startRound(room);
      break;
    case 'SHOT':
      handleHumanShot(room, player, message.matchId, message.direction, message.power);
      break;
    case 'DISTRACT':
      handleDistraction(room, player, message.matchId, message.distractionType);
      break;
    case 'RESET_TOURNAMENT':
    case 'RETURN_TO_LOBBY':
      requireHost(player);
      resetTournament(room);
      break;
    case 'CHANGE_PLAYERS':
      requireHost(player);
      resetTournament(room, true);
      break;
    case 'KICK_PLAYER':
      requireHost(player);
      kickPlayer(room, message.playerId);
      break;
    default:
      throw new Error('Unsupported request.');
  }
}

function hostRoom(socket: WebSocket, rawName: string): void {
  const name = sanitizeName(rawName);
  const code = createRoomCode();
  const player: Player = { id: randomUUID(), name, isHost: true, isBot: false, connected: true };
  const room: Room = {
    code,
    status: 'SETUP',
    players: [player],
    tournamentSize: 8,
    roundNumber: 0,
    matches: [],
    currentRoundMatchIds: [],
  };
  rooms.set(code, room);
  contexts.set(socket, { roomCode: code, playerId: player.id });
  send(socket, { type: 'WELCOME', playerId: player.id, room: serializeRoom(room) });
  broadcast(room);
}

function joinRoom(socket: WebSocket, rawName: string, rawCode: string): void {
  const name = sanitizeName(rawName);
  const code = String(rawCode ?? '').replace(/\D/g, '').slice(0, 5);
  const room = rooms.get(code);
  if (!room) throw new Error('That room code does not exist.');

  const humanCount = room.players.filter((player) => !player.isBot).length;
  const joiningLate = room.status !== 'SETUP';
  const maximumHumans = joiningLate ? 40 : 32;
  if (humanCount >= maximumHumans) {
    throw new Error(joiningLate
      ? 'This room already has 40 connected players and spectators.'
      : 'This room already has 32 tournament players.');
  }
  if (room.players.some((player) => !player.isBot && player.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('That player name is already being used in this room.');
  }

  const player: Player = {
    id: randomUUID(),
    name,
    isHost: false,
    isBot: false,
    connected: true,
    isSpectator: joiningLate,
  };
  room.players.push(player);
  contexts.set(socket, { roomCode: code, playerId: player.id });
  send(socket, { type: 'WELCOME', playerId: player.id, room: serializeRoom(room) });
  broadcast(room);
}

function resumeSession(socket: WebSocket, rawPlayerId: string, rawCode: string): void {
  const code = String(rawCode ?? '').replace(/\D/g, '').slice(0, 5);
  const playerId = String(rawPlayerId ?? '').trim();
  const room = rooms.get(code);
  const player = room?.players.find((candidate) => candidate.id === playerId && !candidate.isBot);
  if (!room || !player) throw new Error('Your previous room session is no longer available. Return to the start screen and join again.');

  // Remove any stale socket for this player before closing it. Otherwise its
  // close event could mark the freshly resumed player as disconnected again.
  for (const [existingSocket, context] of contexts.entries()) {
    if (existingSocket === socket) continue;
    if (context.roomCode !== code || context.playerId !== playerId) continue;
    contexts.delete(existingSocket);
    try {
      existingSocket.close(1000, 'Session resumed on another connection');
    } catch {
      // Ignore sockets that have already gone away.
    }
  }

  player.connected = true;
  contexts.set(socket, { roomCode: code, playerId });
  send(socket, { type: 'WELCOME', playerId, room: serializeRoom(room) });
  broadcast(room);
}

function selectCharacter(room: Room, player: Player, characterId: string): void {
  if (room.status !== 'SETUP') throw new Error('Characters cannot be changed after the bracket is created.');
  if (!CHARACTER_IDS.includes(characterId)) throw new Error('That character is unavailable.');
  const taken = room.players.some((candidate) => candidate.id !== player.id && candidate.characterId === characterId);
  if (taken) throw new Error('Another player just selected that character.');
  player.characterId = characterId;
  broadcast(room);
}

function setTournamentSize(room: Room, size: number): void {
  if (room.status !== 'SETUP') throw new Error('Return to the lobby before changing tournament size.');
  if (!VALID_SIZES.has(size)) throw new Error('Tournament size must be 2, 4, 8, 16 or 32.');
  const humans = room.players.filter((player) => !player.isBot && !player.isSpectator).length;
  if (humans > size) throw new Error(`There are ${humans} human players, so choose a bracket of at least ${nextPowerOfTwo(humans)}.`);
  room.tournamentSize = size;
  broadcast(room);
}

function createTournament(room: Room): void {
  if (room.status !== 'SETUP') throw new Error('A tournament already exists.');
  room.players = room.players.filter((player) => !player.isBot);
  const humans = room.players.filter((player) => !player.isSpectator);
  if (humans.some((player) => !player.characterId)) throw new Error('Every human player must choose a character first.');
  if (humans.length > room.tournamentSize) throw new Error('The selected bracket is too small for the connected players.');

  const usedCharacters = new Set(humans.map((player) => player.characterId));
  const availableCharacters = shuffle(CHARACTER_IDS.filter((id) => !usedCharacters.has(id)));
  const availableBotNames = shuffle([...BOT_NAMES]);
  const botsNeeded = room.tournamentSize - humans.length;

  for (let index = 0; index < botsNeeded; index += 1) {
    room.players.push({
      id: `bot-${randomUUID()}`,
      name: availableBotNames[index % availableBotNames.length] ?? `Bot ${index + 1}`,
      isHost: false,
      isBot: true,
      connected: true,
      characterId: availableCharacters[index % availableCharacters.length] ?? CHARACTER_IDS[(humans.length + index) % CHARACTER_IDS.length],
    });
  }

  const entrants = shuffle(room.players.filter((player) => !player.isSpectator).map((player) => player.id));
  room.matches = createMatches(entrants, 1);
  room.currentRoundMatchIds = room.matches.map((match) => match.id);
  room.roundNumber = 1;
  room.status = 'BRACKET';
  room.finalWinnerId = undefined;
  room.roundAdvanceAt = undefined;
  broadcast(room);
}

function startRound(room: Room): void {
  if (room.status !== 'BRACKET') throw new Error('The next round is not ready yet.');
  const matches = currentMatches(room);
  if (!matches.length || !matches.every((match) => match.phase === 'WAITING')) throw new Error('The bracket is not ready to start.');
  room.status = 'ACTIVE';
  for (const match of matches) {
    match.phase = 'FLOP';
    match.activeShooterId = match.playerAId;
    match.attemptsRemaining = 2;
    match.floppedPlayerIds = [];
    match.shotInFlight = false;
    match.lastShot = undefined;
    match.turnReadyAt = undefined;
    match.autoShotScheduled = false;
    assignFlopMoment(match);
  }
  broadcast(room);
  for (const match of matches) scheduleFlopTransition(room, match);
}

function scheduleFlopTransition(room: Room, match: Match): void {
  const allAutomated = isAutomated(room, match.playerAId) && isAutomated(room, match.playerBId);
  const delay = allAutomated ? AUTOMATED_FLOP_SCENE_MS : HUMAN_FLOP_SCENE_MS;
  match.phaseDeadlineAt = Date.now() + delay;
  schedule(room, match, delay, () => advanceToFreeThrow(room, match));
}

function advanceToFreeThrow(room: Room, match: Match): void {
  if (room.status !== 'ACTIVE' || match.phase !== 'FLOP') return;
  if (!match.floppedPlayerIds.includes(match.activeShooterId)) match.floppedPlayerIds.push(match.activeShooterId);
  match.phase = 'FREE_THROW';
  match.phaseDeadlineAt = undefined;
  match.shotInFlight = false;
  match.distraction = undefined;
  prepareFreeThrowTurn(room, match);
}

function prepareFreeThrowTurn(room: Room, match: Match): void {
  if (room.status !== 'ACTIVE' || match.phase !== 'FREE_THROW' || match.shotInFlight) return;

  match.phaseDeadlineAt = undefined;
  const now = Date.now();
  const turnId = randomUUID();
  match.turnId = turnId;
  match.turnStartedAt = now;
  match.turnDeadlineAt = now + SHOT_CLOCK_MS;
  match.distractionWindowClosesAt = now + DISTRACTION_WINDOW_MS;
  match.turnReadyAt = undefined;
  match.autoShotScheduled = false;
  match.distraction = undefined;
  match.distractionUsedByPlayerId = undefined;
  assignMeterProfile(match, now);

  maybeAutomatedDefenderDistracts(room, match, turnId);

  // Every free throw has a server-authoritative 10-second shot clock. If a
  // human does not press SHOOT, the server resolves the attempt using the
  // meter positions that correspond to the exact deadline.
  schedule(room, match, SHOT_CLOCK_MS, () => {
    if (
      room.status !== 'ACTIVE' ||
      match.phase !== 'FREE_THROW' ||
      match.shotInFlight ||
      match.turnId !== turnId ||
      match.activeShooterId === ''
    ) return;
    const values = calculateMeterValues(match, match.turnDeadlineAt ?? Date.now());
    resolveShot(room, match, values.direction, values.power);
  });

  if (isAutomated(room, match.activeShooterId)) {
    const defenderId = match.activeShooterId === match.playerAId ? match.playerBId : match.playerAId;
    const humanDefender = !isAutomated(room, defenderId);
    const allAutomated = isAutomated(room, match.playerAId) && isAutomated(room, match.playerBId);
    // Bots use the same two visible timing windows as human players, but no
    // longer make nearly every attempt. Their planned accuracy begins around
    // two-thirds and falls slightly as the clutch green zone tightens. This
    // creates more natural misses and makes long 10+ point deuce battles rarer.
    const minDelay = humanDefender ? 2300 : allAutomated ? 2100 : 2250;
    const maxDelay = 9300;
    const pressureLevel = meterPressureLevel(match);
    const baseMakeChance = humanDefender ? 0.68 : allAutomated ? 0.64 : 0.66;
    const plannedMakeChance = Math.max(0.52, baseMakeChance - pressureLevel * 0.02);
    const wantsMake = Math.random() < plannedMakeChance;
    const preferProtectedWindow = wantsMake && humanDefender && Math.random() < 0.72;
    const delay = chooseAutomatedShotDelay(match, now, minDelay, maxDelay, wantsMake, preferProtectedWindow);
    match.autoShotScheduled = true;
    match.turnReadyAt = now + delay;
    schedule(room, match, delay, () => {
      if (
        room.status !== 'ACTIVE' ||
        match.phase !== 'FREE_THROW' ||
        match.shotInFlight ||
        match.turnId !== turnId ||
        !isAutomated(room, match.activeShooterId)
      ) return;
      match.autoShotScheduled = false;
      match.turnReadyAt = undefined;
      takeAutomatedShot(room, match);
    });
  }

  broadcast(room);
}

function handleHumanShot(room: Room, player: Player, matchId: string, rawDirection: number, rawPower: number): void {
  const match = room.matches.find((candidate) => candidate.id === matchId);
  if (!match || room.status !== 'ACTIVE' || match.phase !== 'FREE_THROW') throw new Error('That free throw is no longer active.');
  if (match.shotInFlight) throw new Error('The basketball is already in the air.');
  if (match.activeShooterId !== player.id) throw new Error('It is not your turn to shoot.');
  const direction = clampNumber(rawDirection);
  const power = clampNumber(rawPower);
  resolveShot(room, match, direction, power);
}

function chooseAutomatedShotDelay(
  match: Match,
  now: number,
  minDelay: number,
  maxDelay: number,
  wantsMake: boolean,
  preferProtectedWindow = false,
): number {
  const matching: number[] = [];
  const protectedMatching: number[] = [];
  let bestDelay = minDelay;
  let bestScore = wantsMake ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  const protectedWindowStart = Math.max(
    (match.distractionWindowClosesAt ?? now) - now,
    (match.meterSecondPerfectAt ?? now) - now - 550,
  );

  // Search the exact deterministic meter path displayed by every client.
  // Ten-millisecond samples keep the release smooth and allow bots to locate
  // the very small perfect-release window used at 11-11 and beyond.
  for (let delay = minDelay; delay <= maxDelay; delay += 10) {
    const values = calculateMeterValues(match, now + delay);
    const made = inGreen(match, values.direction) && inGreen(match, values.power);
    if (made === wantsMake) {
      matching.push(delay);
      if (delay >= protectedWindowStart) protectedMatching.push(delay);
    }

    const centreDistance = Math.abs(values.direction - 0.5) + Math.abs(values.power - 0.5);
    if ((wantsMake && centreDistance < bestScore) || (!wantsMake && centreDistance > bestScore)) {
      bestScore = centreDistance;
      bestDelay = delay;
    }
  }

  if (preferProtectedWindow && protectedMatching.length) return randomChoice(protectedMatching);
  if (matching.length) return randomChoice(matching);
  return bestDelay;
}

function takeAutomatedShot(room: Room, match: Match): void {
  if (room.status !== 'ACTIVE' || match.phase !== 'FREE_THROW' || match.shotInFlight || !isAutomated(room, match.activeShooterId)) return;

  // Resolve the bot shot from the exact server-authoritative meter position at
  // this instant. Previously bots chose unrelated random meter values at the
  // moment of release, making the visible markers snap from a miss into the
  // green zone. Client and server now finish on the same smooth path.
  const values = calculateMeterValues(match, Date.now());
  resolveShot(room, match, values.direction, values.power);
}

function resolveShot(room: Room, match: Match, direction: number, power: number): void {
  if (match.phase !== 'FREE_THROW' || match.shotInFlight) return;
  match.shotInFlight = true;
  match.phaseDeadlineAt = Date.now() + SHOT_FLIGHT_WATCHDOG_GRACE_MS;
  match.autoShotScheduled = false;
  match.turnReadyAt = undefined;
  match.turnStartedAt = undefined;
  match.turnDeadlineAt = undefined;
  match.distractionWindowClosesAt = undefined;
  match.turnId = undefined;
  match.meterFirstPerfectAt = undefined;
  match.meterSecondPerfectAt = undefined;
  match.meterDirectionHalfCycles = undefined;
  match.meterPowerHalfCycles = undefined;
  match.meterDirectionSign = undefined;
  match.meterPowerSign = undefined;
  const made = inGreen(match, direction) && inGreen(match, power);
  if (made) {
    if (match.activeShooterId === match.playerAId) match.scoreA += 1;
    else match.scoreB += 1;
  }
  match.attemptsRemaining = Math.max(0, match.attemptsRemaining - 1);
  const resultAudioKey = made
    ? randomChoiceAvoiding(FREE_THROW_MADE_AUDIO_KEYS, match.lastMadeAudioKey)
    : randomChoiceAvoiding(FREE_THROW_MISS_AUDIO_KEYS, match.lastMissAudioKey);
  if (made) match.lastMadeAudioKey = resultAudioKey;
  else match.lastMissAudioKey = resultAudioKey;
  match.lastShot = {
    id: randomUUID(),
    shooterId: match.activeShooterId,
    made,
    direction,
    power,
    resolvedAt: Date.now(),
    resultAudioKey,
  };
  match.distraction = undefined;
  broadcast(room);

  // Keep the scene stable long enough for every client to watch the ball fly.
  schedule(room, match, 2200, () => finishResolvedShot(room, match));
}

function finishResolvedShot(room: Room, match: Match): void {
  if (room.status !== 'ACTIVE' || match.phase !== 'FREE_THROW' || !match.shotInFlight) return;
  match.shotInFlight = false;
  match.phaseDeadlineAt = undefined;
  match.distraction = undefined;
  match.distractionUsedByPlayerId = undefined;

  const winnerId = determineWinner(match);
  if (winnerId) {
    completeMatch(room, match, winnerId);
    return;
  }

  if (match.attemptsRemaining > 0) {
    prepareFreeThrowTurn(room, match);
    return;
  }

  switchShooter(match);
  match.distraction = undefined;

  // Each player gets one ridiculous foul/flop introduction followed by two free throws.
  // Once both players have flopped, the match moves into a faster alternating
  // one-free-throw rhythm until somebody reaches 3 points with a two-point margin.
  if (!match.floppedPlayerIds.includes(match.activeShooterId)) {
    match.attemptsRemaining = 2;
    match.phase = 'FLOP';
    assignFlopMoment(match);
    broadcast(room);
    scheduleFlopTransition(room, match);
    return;
  }

  match.attemptsRemaining = 1;
  match.phase = 'FREE_THROW';
  prepareFreeThrowTurn(room, match);
}

function handleDistraction(room: Room, player: Player, matchId: string, rawType: string): void {
  const match = room.matches.find((candidate) => candidate.id === matchId);
  if (!match || room.status !== 'ACTIVE' || match.phase !== 'FREE_THROW') throw new Error('That matchup is not accepting distractions.');
  if (match.shotInFlight) throw new Error('Too late — the basketball is already in the air.');
  const defenderId = match.activeShooterId === match.playerAId ? match.playerBId : match.playerAId;
  if (player.id !== defenderId) throw new Error('Only the defending player can distract the shooter.');
  if (match.distractionUsedByPlayerId === player.id) throw new Error('You already used your distraction for this free throw.');

  const cleanType = String(rawType || 'DISTRACTION').replace(/[^A-Za-z0-9 '\-]/g, '').slice(0, 24).toUpperCase();
  if (!['FOAM FINGER', 'BAD DANCE', 'SQUEAKY SHOES'].includes(cleanType)) throw new Error('That distraction is unavailable.');

  const now = Date.now();
  if (now >= (match.distractionWindowClosesAt ?? 0)) {
    throw new Error('The distraction window is closed. The shooter has the final four seconds undisturbed.');
  }
  match.lastDistractionAt = now;
  match.distractionUsedByPlayerId = player.id;
  match.distraction = {
    type: cleanType,
    byPlayerId: player.id,
    startedAt: now + DISTRACTION_DELAY_MS,
    expiresAt: now + DISTRACTION_DELAY_MS + DISTRACTION_EFFECT_MS,
  };
  broadcast(room);
}

function maybeAutomatedDefenderDistracts(room: Room, match: Match, turnId: string): void {
  const defenderId = match.activeShooterId === match.playerAId ? match.playerBId : match.playerAId;
  if (!isAutomated(room, defenderId) || isAutomated(room, match.activeShooterId) || Math.random() > 0.45) return;
  schedule(room, match, randomBetween(900, 4200), () => {
    if (
      match.phase !== 'FREE_THROW' ||
      match.shotInFlight ||
      match.turnId !== turnId ||
      match.distractionUsedByPlayerId
    ) return;
    const now = Date.now();
    if (now >= (match.distractionWindowClosesAt ?? 0)) return;
    match.distractionUsedByPlayerId = defenderId;
    match.distraction = {
      type: randomChoice(['FOAM FINGER', 'BAD DANCE', 'SQUEAKY SHOES']),
      byPlayerId: defenderId,
      startedAt: now + DISTRACTION_DELAY_MS,
      expiresAt: now + DISTRACTION_DELAY_MS + DISTRACTION_EFFECT_MS,
    };
    broadcast(room);
  });
}

function completeMatch(room: Room, match: Match, winnerId: string): void {
  match.phase = 'COMPLETE';
  match.completedAt = Date.now();
  match.phaseDeadlineAt = undefined;
  match.shotInFlight = false;
  match.autoShotScheduled = false;
  match.turnReadyAt = undefined;
  match.turnStartedAt = undefined;
  match.turnDeadlineAt = undefined;
  match.distractionWindowClosesAt = undefined;
  match.turnId = undefined;
  match.meterFirstPerfectAt = undefined;
  match.meterSecondPerfectAt = undefined;
  match.meterDirectionHalfCycles = undefined;
  match.meterPowerHalfCycles = undefined;
  match.meterDirectionSign = undefined;
  match.meterPowerSign = undefined;
  match.winnerId = winnerId;
  match.attemptsRemaining = 0;
  match.distraction = undefined;
  match.distractionUsedByPlayerId = undefined;
  clearMatchTimers(room, match);
  broadcast(room);

  const matches = currentMatches(room);
  if (!matches.every((candidate) => candidate.phase === 'COMPLETE')) return;

  room.roundAdvanceAt = Date.now() + 2400;
  schedule(room, match, 2400, () => advanceCompletedRound(room));
}

function advanceCompletedRound(room: Room): void {
  if (room.status !== 'ACTIVE') return;
  const matches = currentMatches(room);
  if (!matches.length || !matches.every((candidate) => candidate.phase === 'COMPLETE')) return;
  if ((room.roundAdvanceAt ?? 0) > Date.now()) return;

  room.roundAdvanceAt = undefined;
  if (matches.length === 1) {
    room.status = 'COMPLETE';
    room.finalWinnerId = matches[0].winnerId;
    broadcast(room);
    return;
  }

  const winners = matches.map((candidate) => candidate.winnerId).filter((id): id is string => Boolean(id));
  if (winners.length !== matches.length) return;
  room.roundNumber += 1;
  const nextMatches = createMatches(winners, room.roundNumber);
  room.matches.push(...nextMatches);
  room.currentRoundMatchIds = nextMatches.map((candidate) => candidate.id);
  room.status = 'BRACKET';
  broadcast(room);
}

function resetTournament(room: Room, clearCharacters = false): void {
  clearRoomTimers(room);
  room.players = room.players.filter((player) => !player.isBot);
  for (const player of room.players) {
    player.isSpectator = false;
    if (clearCharacters) player.characterId = undefined;
  }
  room.status = 'SETUP';
  room.roundNumber = 0;
  room.matches = [];
  room.currentRoundMatchIds = [];
  room.finalWinnerId = undefined;
  room.roundAdvanceAt = undefined;
  broadcast(room);
}

function kickPlayer(room: Room, playerId: string): void {
  if (room.status !== 'SETUP') throw new Error('Players can only be removed before the bracket is created.');
  const target = room.players.find((player) => player.id === playerId);
  if (!target || target.isHost || target.isBot) throw new Error('That player cannot be removed.');
  room.players = room.players.filter((player) => player.id !== playerId);
  for (const [socket, context] of contexts.entries()) {
    if (context.playerId === playerId && context.roomCode === room.code) {
      sendError(socket, 'The host removed you from the room.');
      socket.close();
    }
  }
  broadcast(room);
}

function handleDisconnect(socket: WebSocket): void {
  const context = contexts.get(socket);
  contexts.delete(socket);
  if (!context?.roomCode || !context.playerId) return;
  const room = rooms.get(context.roomCode);
  const player = room?.players.find((candidate) => candidate.id === context.playerId);
  if (!room || !player) return;
  player.connected = false;
  if (room.status === 'SETUP' && !player.isHost) {
    room.players = room.players.filter((candidate) => candidate.id !== player.id);
  }
  if (room.status === 'ACTIVE') {
    const match = currentMatches(room).find((candidate) => candidate.phase === 'FREE_THROW' && candidate.activeShooterId === player.id);
    if (match) prepareFreeThrowTurn(room, match);
  }
  broadcast(room);
  if (player.isHost && room.status === 'SETUP' && room.players.filter((candidate) => !candidate.isBot && candidate.connected).length === 0) {
    clearRoomTimers(room);
    rooms.delete(room.code);
  }
}

function createMatches(playerIds: string[], round: number): Match[] {
  const matches: Match[] = [];
  for (let index = 0; index < playerIds.length; index += 2) {
    const initialAudioKey = randomChoice(FLOP_AUDIO_KEYS);
    matches.push({
      id: `r${round}-m${index / 2 + 1}-${randomUUID().slice(0, 6)}`,
      round,
      slot: index / 2,
      playerAId: playerIds[index],
      playerBId: playerIds[index + 1],
      scoreA: 0,
      scoreB: 0,
      phase: 'WAITING',
      activeShooterId: playerIds[index],
      attemptsRemaining: 2,
      floppedPlayerIds: [],
      shotInFlight: false,
      commentary: FLOP_AUDIO_COMMENTARY[initialAudioKey] ?? randomChoice(COMMENTARY),
      flopStyle: randomChoice(FLOP_STYLES),
      flopAudioKey: initialAudioKey,
    });
  }
  return matches;
}

function assignFlopMoment(match: Match): void {
  const audioKey = randomChoiceAvoiding(FLOP_AUDIO_KEYS, match.flopAudioKey);
  match.flopAudioKey = audioKey;
  match.commentary = FLOP_AUDIO_COMMENTARY[audioKey] ?? randomChoice(COMMENTARY);
  match.flopStyle = randomChoice(FLOP_STYLES);
}

function determineWinner(match: Match): string | undefined {
  const margin = Math.abs(match.scoreA - match.scoreB);
  if (Math.max(match.scoreA, match.scoreB) >= 3 && margin >= 2) {
    return match.scoreA > match.scoreB ? match.playerAId : match.playerBId;
  }
  return undefined;
}

function switchShooter(match: Match): void {
  match.activeShooterId = match.activeShooterId === match.playerAId ? match.playerBId : match.playerAId;
}

function currentMatches(room: Room): Match[] {
  const ids = new Set(room.currentRoundMatchIds);
  return room.matches.filter((match) => ids.has(match.id));
}

function isAutomated(room: Room, playerId: string): boolean {
  const player = room.players.find((candidate) => candidate.id === playerId);
  return !player || player.isBot || !player.connected;
}

function assignMeterProfile(match: Match, now: number): void {
  const firstDelay = randomBetween(2650, 3350);
  const secondDelay = randomBetween(8050, 8700);
  const selected = randomChoice(METER_SPEED_PROFILES);
  const swap = Math.random() < 0.5;
  match.meterFirstPerfectAt = now + firstDelay;
  match.meterSecondPerfectAt = now + Math.max(secondDelay, firstDelay + 4600);
  match.meterDirectionHalfCycles = swap ? selected[1] : selected[0];
  match.meterPowerHalfCycles = swap ? selected[0] : selected[1];
  match.meterDirectionSign = Math.random() < 0.5 ? -1 : 1;
  match.meterPowerSign = Math.random() < 0.5 ? -1 : 1;
}

function calculateMeterValues(match: Match, at: number): { direction: number; power: number } {
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
    const progress = (at - firstPerfectAt) / (secondPerfectAt - firstPerfectAt);
    direction = 0.5 + 0.5 * (match.meterDirectionSign ?? 1) * Math.sin(Math.PI * directionHalfCycles * progress);
    power = 0.5 + 0.5 * (match.meterPowerSign ?? 1) * Math.sin(Math.PI * powerHalfCycles * progress);
  } else {
    // Backwards-compatible fallback for any turn created before this hotfix.
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
      direction += Math.sin(effectElapsed * 0.021) * 0.12 * strength;
    } else if (distraction.type === 'BAD DANCE') {
      power += Math.sin(effectElapsed * 0.018 + 1.1) * 0.12 * strength;
    } else if (distraction.type === 'SQUEAKY SHOES') {
      const pulse = Math.sin(effectElapsed * 0.028) * 0.07 * strength;
      direction += pulse;
      power -= pulse * 0.85;
    }
  }

  return {
    direction: Math.max(0, Math.min(1, direction)),
    power: Math.max(0, Math.min(1, power)),
  };
}

function meterPressureLevel(match: Match): number {
  const lowerScore = Math.min(match.scoreA, match.scoreB);
  if (lowerScore < 3) return 0;
  // 3-3/4-4 use tier 1, 5-5/6-6 tier 2, and so on. The tier persists
  // between ties so the target does not suddenly widen after one made shot.
  return Math.min(GREEN_SUCCESS_HALF_WIDTHS.length - 1, Math.floor((lowerScore - 3) / 2) + 1);
}

function greenHalfWidth(match: Match): number {
  return GREEN_SUCCESS_HALF_WIDTHS[meterPressureLevel(match)] ?? BASE_GREEN_HALF_WIDTH;
}

function inGreen(match: Match, value: number): boolean {
  const halfWidth = greenHalfWidth(match);
  return value >= 0.5 - halfWidth && value <= 0.5 + halfWidth;
}

function runMatchWatchdog(): void {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status !== 'ACTIVE') continue;

    for (const match of currentMatches(room)) {
      try {
        if (match.phase === 'FLOP') {
          if (match.phaseDeadlineAt !== undefined && now >= match.phaseDeadlineAt + FREE_THROW_WATCHDOG_GRACE_MS) {
            console.warn(`Watchdog advanced overdue flop scene ${room.code}/${match.id}.`);
            advanceToFreeThrow(room, match);
          }
          continue;
        }

        if (match.phase !== 'FREE_THROW') continue;

        if (match.shotInFlight) {
          const resolvedAt = match.lastShot?.resolvedAt ?? match.phaseDeadlineAt ?? now;
          if (now >= resolvedAt + SHOT_FLIGHT_WATCHDOG_GRACE_MS) {
            console.warn(`Watchdog completed overdue shot animation ${room.code}/${match.id}.`);
            finishResolvedShot(room, match);
          }
          continue;
        }

        if (match.turnDeadlineAt === undefined || match.turnId === undefined) {
          console.warn(`Watchdog rebuilt missing free-throw turn ${room.code}/${match.id}.`);
          prepareFreeThrowTurn(room, match);
          continue;
        }

        if (now >= match.turnDeadlineAt + FREE_THROW_WATCHDOG_GRACE_MS) {
          console.warn(`Watchdog resolved expired shot clock ${room.code}/${match.id}.`);
          const values = calculateMeterValues(match, match.turnDeadlineAt);
          resolveShot(room, match, values.direction, values.power);
        }
      } catch (error) {
        console.error(`Match watchdog failed for ${room.code}/${match.id}:`, error);
      }
    }

    if (
      room.roundAdvanceAt !== undefined &&
      now >= room.roundAdvanceAt + FREE_THROW_WATCHDOG_GRACE_MS &&
      currentMatches(room).every((match) => match.phase === 'COMPLETE')
    ) {
      try {
        console.warn(`Watchdog advanced completed round in room ${room.code}.`);
        advanceCompletedRound(room);
      } catch (error) {
        console.error(`Round watchdog failed for room ${room.code}:`, error);
      }
    }
  }
}

function schedule(room: Room, match: Match, delayMs: number, callback: () => void): void {
  const key = timerKey(room, match);
  const set = scheduled.get(key) ?? new Set<NodeJS.Timeout>();
  const timer = setTimeout(() => {
    set.delete(timer);
    if (!set.size) scheduled.delete(key);
    try {
      callback();
    } catch (error) {
      console.error(`Scheduled match task failed for ${key}:`, error);
      // The independent watchdog below will repair overdue match state instead
      // of allowing one failed callback to freeze the entire tournament.
    }
  }, delayMs);
  set.add(timer);
  scheduled.set(key, set);
}

function clearMatchTimers(room: Room, match: Match): void {
  const key = timerKey(room, match);
  const set = scheduled.get(key);
  if (!set) return;
  for (const timer of set) clearTimeout(timer);
  scheduled.delete(key);
}

function clearRoomTimers(room: Room): void {
  for (const [key, set] of scheduled.entries()) {
    if (!key.startsWith(`${room.code}:`)) continue;
    for (const timer of set) clearTimeout(timer);
    scheduled.delete(key);
  }
}

function timerKey(room: Room, match: Match): string {
  return `${room.code}:${match.id}`;
}

function broadcast(room: Room): void {
  const payload = JSON.stringify({ type: 'ROOM_STATE', room: serializeRoom(room) });
  for (const [socket, context] of contexts.entries()) {
    if (context.roomCode === room.code && socket.readyState === WebSocket.OPEN) socket.send(payload);
  }
}

function send(socket: WebSocket, payload: unknown): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function sendError(socket: WebSocket, message: string): void {
  send(socket, { type: 'ERROR', message });
}

function serializeRoom(room: Room): Room {
  return {
    ...room,
    players: room.players.map((player) => ({ ...player })),
    matches: room.matches.map(({ lastDistractionAt: _hidden, autoShotScheduled: _autoHidden, lastMadeAudioKey: _madeHidden, lastMissAudioKey: _missHidden, ...match }) => ({ ...match })),
    currentRoundMatchIds: [...room.currentRoundMatchIds],
  };
}

function requireHost(player: Player): void {
  if (!player.isHost) throw new Error('Only the host can do that.');
}

function sanitizeName(rawName: string): string {
  const name = String(rawName ?? '').replace(/[^A-Za-z0-9 '\-_.]/g, '').trim().slice(0, 18);
  if (!name) throw new Error('Enter a player name.');
  return name;
}

function createRoomCode(): string {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const code = String(Math.floor(10000 + Math.random() * 90000));
    if (!rooms.has(code)) return code;
  }
  throw new Error('Could not create a unique room code. Try again.');
}

function clampNumber(value: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error('Invalid meter value.');
  return Math.max(0, Math.min(1, parsed));
}

function randomChoice<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomChoiceAvoiding<T>(items: readonly T[], previous?: T): T {
  if (items.length <= 1) return items[0];
  const choices = previous === undefined ? items : items.filter((item) => item !== previous);
  return randomChoice(choices.length ? choices : items);
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function shuffle<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(2, value)));
}
