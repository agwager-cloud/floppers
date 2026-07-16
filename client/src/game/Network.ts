import { gameSession } from './GameSession';
import type { ClientMessage, RoomState, ServerMessage } from './types';

type StateListener = (room: RoomState) => void;
type ErrorListener = (message: string) => void;
type WelcomeListener = () => void;
type ConnectionStatusListener = (message: string) => void;

const RENDER_WAKE_TIMEOUT_MS = 75_000;
const WEBSOCKET_ATTEMPT_TIMEOUT_MS = 12_000;
const RETRY_DELAY_MS = 2_000;

class NetworkService {
  private socket: WebSocket | null = null;
  private connectPromise: Promise<void> | null = null;
  private stateListeners = new Set<StateListener>();
  private errorListeners = new Set<ErrorListener>();
  private welcomeListeners = new Set<WelcomeListener>();
  private connectionStatusListeners = new Set<ConnectionStatusListener>();

  connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

    const wsUrl = this.getWebSocketUrl();
    this.connectPromise = this.connectWithRetry(wsUrl)
      .finally(() => {
        this.connectPromise = null;
      });

    return this.connectPromise;
  }

  send(message: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.emitError('The server is not connected yet.');
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

  private getWebSocketUrl(): string {
    const explicitUrl = (import.meta.env.VITE_WS_URL as string | undefined)?.trim();
    if (explicitUrl) return explicitUrl.replace(/\/$/, '');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    return `${protocol}//${host}:2567`;
  }

  private async connectWithRetry(wsUrl: string): Promise<void> {
    const isRemoteSecureServer = wsUrl.startsWith('wss://');
    const deadline = Date.now() + (isRemoteSecureServer ? RENDER_WAKE_TIMEOUT_MS : WEBSOCKET_ATTEMPT_TIMEOUT_MS);

    this.emitConnectionStatus(
      isRemoteSecureServer
        ? 'WAKING GAME SERVER • THIS CAN TAKE UP TO 60 SECONDS'
        : 'CONNECTING TO LOCAL GAME SERVER…',
    );

    // A normal HTTPS request reliably wakes a sleeping Render free service.
    // Failure here is not fatal because the WebSocket retries below can also
    // wake and connect to the service.
    if (isRemoteSecureServer) void this.tryWakeHttpServer(wsUrl, deadline);

    let lastError: Error | null = null;
    let attempt = 0;

    while (Date.now() < deadline) {
      attempt += 1;
      this.emitConnectionStatus(
        attempt === 1 ? 'CONNECTING TO GAME SERVER…' : `SERVER IS WAKING • RETRYING (${attempt})…`,
      );

      try {
        const socket = await this.openSocket(wsUrl);
        this.socket = socket;
        this.attachPermanentSocketListeners(socket);
        this.emitConnectionStatus('CONNECTED');
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Could not connect to the game server.');
        if (Date.now() + RETRY_DELAY_MS >= deadline) break;
        await this.delay(RETRY_DELAY_MS);
      }
    }

    this.socket = null;
    this.emitConnectionStatus('');
    throw lastError ?? new Error(`Unable to reach ${wsUrl}`);
  }

  private async tryWakeHttpServer(wsUrl: string, deadline: number): Promise<void> {
    const healthUrl = wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:') + '/health';
    const remaining = Math.max(1_000, deadline - Date.now());
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), remaining);

    try {
      await fetch(healthUrl, {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
        signal: controller.signal,
      });
    } catch {
      // WebSocket retry loop below remains the source of truth.
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private openSocket(wsUrl: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(wsUrl);
      let settled = false;

      const finishWithError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        try {
          socket.close();
        } catch {
          // Ignore close errors on a failed connection attempt.
        }
        reject(new Error(`Unable to reach ${wsUrl}`));
      };

      const finishWithSuccess = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(socket);
      };

      const cleanup = () => {
        window.clearTimeout(timeout);
        socket.removeEventListener('open', finishWithSuccess);
        socket.removeEventListener('error', finishWithError);
        socket.removeEventListener('close', finishWithError);
      };

      const timeout = window.setTimeout(finishWithError, WEBSOCKET_ATTEMPT_TIMEOUT_MS);
      socket.addEventListener('open', finishWithSuccess, { once: true });
      socket.addEventListener('error', finishWithError, { once: true });
      socket.addEventListener('close', finishWithError, { once: true });
    });
  }

  private attachPermanentSocketListeners(socket: WebSocket): void {
    socket.addEventListener('message', (event) => this.handleMessage(event.data));
    socket.addEventListener('close', () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.emitConnectionStatus('');
      this.emitError('Connection to the game server was lost. Refresh to reconnect.');
    });
    socket.addEventListener('error', () => {
      if (this.socket !== socket) return;
      this.emitError('The game server connection encountered an error.');
    });
  }

  private handleMessage(raw: unknown): void {
    try {
      const message = JSON.parse(String(raw)) as ServerMessage;
      if (message.type === 'WELCOME') {
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
    } catch (error) {
      this.emitError(error instanceof Error ? error.message : 'Invalid server message.');
    }
  }

  private emitError(message: string): void {
    this.errorListeners.forEach((listener) => listener(message));
  }

  private emitConnectionStatus(message: string): void {
    this.connectionStatusListeners.forEach((listener) => listener(message));
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }
}

export const network = new NetworkService();
