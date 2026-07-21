import { gameSession } from './GameSession';
import type { ClientMessage, RoomState, ServerMessage } from './types';

type StateListener = (room: RoomState) => void;
type ErrorListener = (message: string) => void;
type WelcomeListener = () => void;
type ConnectionStatusListener = (message: string) => void;
type ConnectionProgressListener = (progress: ConnectionProgress) => void;

export interface ConnectionProgress {
  elapsedSeconds: number;
  attempt: number;
  progress: number;
  message: string;
}

// Keep a safe published fallback so an itch.io build can never accidentally
// connect to the itch.io iframe hostname when VITE_WS_URL is missing.
const DEFAULT_RENDER_WS_URL = 'wss://fosters-floppers-server.onrender.com';
const PUBLISHED_CONNECTION_WINDOW_MS = 100_000;
const LOCAL_CONNECTION_WINDOW_MS = 14_000;
const WEBSOCKET_ATTEMPT_TIMEOUT_MS = 14_000;
const RETRY_DELAY_MS = 2_500;

function isPrivateLanHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.startsWith('192.168.') || host.startsWith('10.')) return true;
  const match = host.match(/^172\.(\d+)\./);
  if (!match) return false;
  const secondOctet = Number(match[1]);
  return secondOctet >= 16 && secondOctet <= 31;
}

function makeRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function friendlyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? 'Connection failed.');
}

class NetworkService {
  private socket: WebSocket | null = null;
  private stateListeners = new Set<StateListener>();
  private errorListeners = new Set<ErrorListener>();
  private welcomeListeners = new Set<WelcomeListener>();
  private connectionStatusListeners = new Set<ConnectionStatusListener>();
  private connectionProgressListeners = new Set<ConnectionProgressListener>();
  private reconnecting = false;
  private connectionGeneration = 0;

  async hostRoom(name: string): Promise<void> {
    const requestId = makeRequestId();
    await this.requestWithRetries({ type: 'HOST_ROOM', name, requestId }, 'host');
  }

  async joinRoom(name: string, code: string): Promise<void> {
    const requestId = makeRequestId();
    await this.requestWithRetries({ type: 'JOIN_ROOM', name, code, requestId }, 'join');
  }

  send(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.emitError('The classroom server is not connected yet.');
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  onState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  onWelcome(listener: WelcomeListener): () => void {
    this.welcomeListeners.add(listener);
    return () => this.welcomeListeners.delete(listener);
  }

  onConnectionStatus(listener: ConnectionStatusListener): () => void {
    this.connectionStatusListeners.add(listener);
    return () => this.connectionStatusListeners.delete(listener);
  }

  onConnectionProgress(listener: ConnectionProgressListener): () => void {
    this.connectionProgressListeners.add(listener);
    return () => this.connectionProgressListeners.delete(listener);
  }

  isUsingPublishedServer(): boolean {
    return !isPrivateLanHost(window.location.hostname || 'localhost');
  }

  publishedServerHost(): string {
    try {
      return new URL(this.getWebSocketUrl().replace(/^ws/, 'http')).host;
    } catch {
      return 'fosters-floppers-server.onrender.com';
    }
  }

  private getWebSocketUrl(): string {
    const explicitUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
    if (explicitUrl) return explicitUrl.replace(/\/$/, '');

    const host = window.location.hostname || 'localhost';
    if (isPrivateLanHost(host)) return `ws://${host}:2567`;
    return DEFAULT_RENDER_WS_URL;
  }

  private async requestWithRetries(
    message: Extract<ClientMessage, { type: 'HOST_ROOM' | 'JOIN_ROOM' | 'RESUME_SESSION' }>,
    action: 'host' | 'join' | 'resume',
  ): Promise<void> {
    const generation = ++this.connectionGeneration;
    this.closeCurrentSocket();

    const wsUrl = this.getWebSocketUrl();
    const published = wsUrl.startsWith('wss://');
    const totalWindow = published ? PUBLISHED_CONNECTION_WINDOW_MS : LOCAL_CONNECTION_WINDOW_MS;
    const startedAt = Date.now();
    let attempt = 0;
    let lastError: unknown = new Error('Connection failed.');

    while (Date.now() - startedAt < totalWindow && generation === this.connectionGeneration) {
      attempt += 1;
      const elapsed = Date.now() - startedAt;
      const remaining = totalWindow - elapsed;
      const elapsedSeconds = Math.floor(elapsed / 1000);
      const progress = Math.min(0.96, elapsed / totalWindow);
      const progressMessage = this.progressMessage(action, attempt, elapsedSeconds, published);

      this.emitConnectionStatus(progressMessage.toUpperCase());
      this.emitConnectionProgress({ elapsedSeconds, attempt, progress, message: progressMessage });

      // Optional wake request only. School browser extensions can block normal
      // fetches, so the secure WebSocket attempt below always remains authoritative.
      if (published && (attempt === 1 || attempt % 4 === 0)) {
        void this.pokePublishedServer(attempt);
      }

      try {
        await this.openSocketAndRequest(
          wsUrl,
          message,
          Math.min(WEBSOCKET_ATTEMPT_TIMEOUT_MS, Math.max(2_000, remaining)),
          generation,
        );
        if (generation !== this.connectionGeneration) throw new Error('Connection attempt was replaced.');
        const finalElapsed = Math.floor((Date.now() - startedAt) / 1000);
        this.emitConnectionStatus('CONNECTED • LOADING CLASSROOM…');
        this.emitConnectionProgress({
          elapsedSeconds: finalElapsed,
          attempt,
          progress: 1,
          message: 'Classroom connected. Loading the player screen…',
        });
        return;
      } catch (error) {
        lastError = error;
        const text = friendlyError(error);

        // These are authoritative server responses and should be shown straight
        // away rather than being mistaken for a sleeping free server.
        if (/room code does not exist|already being used|already has|removed you|invalid|enter a player name/i.test(text)) {
          this.closeCurrentSocket();
          this.emitConnectionStatus('');
          throw new Error(text);
        }

        this.closeCurrentSocket();
        if (!published) {
          this.emitConnectionStatus('');
          throw new Error(text);
        }
      }

      const afterAttempt = Date.now() - startedAt;
      if (afterAttempt >= totalWindow || generation !== this.connectionGeneration) break;
      await this.delay(Math.min(RETRY_DELAY_MS, totalWindow - afterAttempt));
    }

    this.closeCurrentSocket();
    this.emitConnectionStatus('');
    const verb = action === 'host' ? 'create' : action === 'join' ? 'join' : 'rejoin';
    throw new Error(
      `Could not ${verb} the classroom after waiting up to 100 seconds. ` +
      `The last connection attempt reported: ${friendlyError(lastError)}`,
    );
  }

  private openSocketAndRequest(
    wsUrl: string,
    message: Extract<ClientMessage, { type: 'HOST_ROOM' | 'JOIN_ROOM' | 'RESUME_SESSION' }>,
    timeoutMs: number,
    generation: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      let settled = false;

      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };

      const fail = (reason: string) => {
        finish(() => {
          try { socket.close(); } catch { /* ignored */ }
          reject(new Error(reason));
        });
      };

      const onOpen = () => {
        if (generation !== this.connectionGeneration) {
          fail('Connection attempt was replaced.');
          return;
        }
        try {
          socket.send(JSON.stringify(message));
        } catch {
          fail('The classroom request could not be sent.');
        }
      };

      const onMessage = (event: MessageEvent) => {
        let parsed: ServerMessage;
        try {
          parsed = JSON.parse(String(event.data)) as ServerMessage;
        } catch {
          return;
        }

        if (parsed.type === 'ERROR') {
          fail(parsed.message || 'The server rejected the classroom request.');
          return;
        }

        if (parsed.type !== 'WELCOME') return;

        finish(() => {
          if (generation !== this.connectionGeneration) {
            try { socket.close(); } catch { /* ignored */ }
            reject(new Error('Connection attempt was replaced.'));
            return;
          }
          this.socket = socket;
          this.attachPermanentSocketListeners(socket);
          this.handleServerMessage(parsed);
          resolve();
        });
      };

      const onError = () => fail('Secure WebSocket connection failed.');
      const onClose = () => fail('Connection closed before the classroom finished loading.');
      const timeout = window.setTimeout(
        () => fail('The secure classroom connection did not finish opening yet.'),
        timeoutMs,
      );

      const cleanup = () => {
        window.clearTimeout(timeout);
        socket.removeEventListener('open', onOpen);
        socket.removeEventListener('message', onMessage);
        socket.removeEventListener('error', onError);
        socket.removeEventListener('close', onClose);
      };

      socket.addEventListener('open', onOpen);
      socket.addEventListener('message', onMessage);
      socket.addEventListener('error', onError);
      socket.addEventListener('close', onClose);
    });
  }

  private async pokePublishedServer(attempt: number): Promise<void> {
    const httpBase = this.getWebSocketUrl().replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
    const path = attempt % 2 === 0 ? '/' : '/api/status';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7_000);

    try {
      await fetch(`${httpBase}${path}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch {
      // Deliberately ignored. A blocked background fetch must not block the game.
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private progressMessage(
    action: 'host' | 'join' | 'resume',
    attempt: number,
    elapsedSeconds: number,
    published: boolean,
  ): string {
    if (!published) return attempt === 1 ? 'Connecting to the local classroom server…' : `Retrying the local server (attempt ${attempt})…`;

    const actionText = action === 'host' ? 'creating your classroom' : action === 'join' ? 'joining the classroom' : 'rejoining your classroom';
    if (elapsedSeconds < 12) return `Contacting the classroom server and ${actionText}…`;
    if (elapsedSeconds < 60) return `The free server is waking up. Retrying safely (attempt ${attempt})…`;
    if (elapsedSeconds < 85) return 'The server is taking longer than usual, but this is still within the normal free-server wait…';
    return `Final classroom connection checks are running (attempt ${attempt})…`;
  }

  private attachPermanentSocketListeners(socket: WebSocket): void {
    socket.addEventListener('message', (event) => this.handleMessage(event.data));
    socket.addEventListener('close', () => {
      if (this.socket !== socket) return;
      this.socket = null;
      const canResume = Boolean(gameSession.playerId && gameSession.room?.code);
      if (!canResume) {
        this.emitConnectionStatus('');
        this.emitError('Connection to the classroom server was lost.');
        return;
      }

      this.emitConnectionStatus('CONNECTION INTERRUPTED • RECONNECTING AUTOMATICALLY…');
      this.emitError('Connection interrupted — reconnecting automatically…');
      void this.resumeSession();
    });
    socket.addEventListener('error', () => {
      if (this.socket !== socket) return;
      this.emitConnectionStatus('CONNECTION INTERRUPTED • RECONNECTING AUTOMATICALLY…');
    });
  }

  private async resumeSession(): Promise<void> {
    if (this.reconnecting) return;
    const playerId = gameSession.playerId;
    const code = gameSession.room?.code;
    if (!playerId || !code) return;

    this.reconnecting = true;
    try {
      await this.requestWithRetries({ type: 'RESUME_SESSION', playerId, code }, 'resume');
      this.reconnecting = false;
    } catch (error) {
      this.emitConnectionStatus('');
      this.emitError(error instanceof Error
        ? `Automatic reconnect failed: ${error.message}`
        : 'Automatic reconnect failed. Refresh the page to rejoin.');
      this.reconnecting = false;
    }
  }

  private handleMessage(raw: unknown): void {
    try {
      const message = JSON.parse(String(raw)) as ServerMessage;
      this.handleServerMessage(message);
    } catch (error) {
      this.emitError(error instanceof Error ? error.message : 'Invalid server message.');
    }
  }

  private handleServerMessage(message: ServerMessage): void {
    if (message.type === 'WELCOME') {
      this.reconnecting = false;
      this.emitConnectionStatus('');
      gameSession.playerId = message.playerId;
      gameSession.room = message.room;
      this.welcomeListeners.forEach((listener) => listener());
      this.stateListeners.forEach((listener) => listener(message.room));
    } else if (message.type === 'ROOM_STATE') {
      gameSession.room = message.room;
      this.stateListeners.forEach((listener) => listener(message.room));
    } else if (message.type === 'ERROR') {
      this.emitError(message.message);
    }
  }

  private closeCurrentSocket(): void {
    const socket = this.socket;
    this.socket = null;
    if (!socket) return;
    if (socket.readyState < WebSocket.CLOSING) {
      try { socket.close(); } catch { /* ignored */ }
    }
  }

  private emitError(message: string): void {
    this.errorListeners.forEach((listener) => listener(message));
  }

  private emitConnectionStatus(message: string): void {
    this.connectionStatusListeners.forEach((listener) => listener(message));
  }

  private emitConnectionProgress(progress: ConnectionProgress): void {
    this.connectionProgressListeners.forEach((listener) => listener(progress));
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }
}

export const network = new NetworkService();
