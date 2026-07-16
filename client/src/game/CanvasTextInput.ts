import Phaser from 'phaser';

interface CanvasTextInputOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  id: string;
  placeholder: string;
  maxLength: number;
  inputMode?: 'text' | 'numeric';
  onInput?: (value: string) => string;
}

/**
 * A real HTML input positioned from the live Phaser canvas bounds.
 * This avoids Phaser DOM-container drift after browser zoom, fullscreen,
 * mobile keyboard changes and iPad orientation changes.
 */
export class CanvasTextInput {
  readonly element: HTMLInputElement;

  private readonly scene: Phaser.Scene;
  private readonly options: CanvasTextInputOptions;
  private readonly resizeHandler = () => this.syncToCanvas();
  private readonly pointerDownHandler = () => this.captureFocusLayout();
  private readonly focusHandler = () => this.lockForEditing();
  private readonly blurHandler = () => this.unlockAfterEditing();
  private syncTimer = 0;
  private editing = false;
  private lockedCanvasRect?: { left: number; top: number; width: number; height: number };

  constructor(scene: Phaser.Scene, options: CanvasTextInputOptions) {
    this.scene = scene;
    this.options = options;
    const input = document.createElement('input');
    input.id = options.id;
    input.type = 'text';
    input.maxLength = options.maxLength;
    input.placeholder = options.placeholder;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.inputMode = options.inputMode ?? 'text';
    input.setAttribute('aria-label', options.placeholder);
    input.className = 'canvas-anchored-input';
    input.style.position = 'fixed';
    input.style.zIndex = '10000';
    input.style.margin = '0';
    input.style.boxSizing = 'border-box';
    input.style.borderRadius = '10px';
    input.style.border = '3px solid #8ea3ff';
    input.style.background = 'rgba(7, 11, 34, 0.97)';
    input.style.color = '#ffffff';
    input.style.fontFamily = 'Arial Black, Arial, sans-serif';
    input.style.fontWeight = '900';
    input.style.textAlign = 'center';
    input.style.outline = 'none';
    input.style.transform = 'translate(-50%, -50%)';
    input.style.transformOrigin = 'center center';
    input.style.pointerEvents = 'auto';
    input.style.touchAction = 'manipulation';
    input.style.webkitAppearance = 'none';

    if (options.onInput) {
      input.addEventListener('input', () => {
        const next = options.onInput?.(input.value) ?? input.value;
        if (next !== input.value) input.value = next;
      });
    }

    input.addEventListener('pointerdown', this.pointerDownHandler, { passive: true });
    input.addEventListener('touchstart', this.pointerDownHandler, { passive: true });
    input.addEventListener('focus', this.focusHandler);
    input.addEventListener('blur', this.blurHandler);

    document.body.appendChild(input);
    this.element = input;
    this.syncToCanvas();

    window.addEventListener('resize', this.resizeHandler, { passive: true });
    window.addEventListener('orientationchange', this.resizeHandler, { passive: true });
    window.visualViewport?.addEventListener('resize', this.resizeHandler, { passive: true });
    window.visualViewport?.addEventListener('scroll', this.resizeHandler, { passive: true });
    this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.syncTimer = window.setInterval(() => this.syncToCanvas(), 180);
  }

  get value(): string {
    return this.element.value.trim();
  }

  focus(): void {
    this.element.focus({ preventScroll: true });
  }

  destroy(): void {
    window.clearInterval(this.syncTimer);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('orientationchange', this.resizeHandler);
    window.visualViewport?.removeEventListener('resize', this.resizeHandler);
    window.visualViewport?.removeEventListener('scroll', this.resizeHandler);
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resizeHandler);
    this.element.removeEventListener('pointerdown', this.pointerDownHandler);
    this.element.removeEventListener('touchstart', this.pointerDownHandler);
    this.element.removeEventListener('focus', this.focusHandler);
    this.element.removeEventListener('blur', this.blurHandler);
    this.element.remove();
  }

  private captureFocusLayout(): void {
    if (this.editing || !this.element.isConnected) return;
    const rect = this.scene.game.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.lockedCanvasRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }

  private lockForEditing(): void {
    this.captureFocusLayout();
    this.editing = true;
    this.syncToCanvas();

    // Mobile Safari can resize or pan the visual viewport when the keyboard
    // opens. Re-centre the page while keeping the inputs anchored to the
    // pre-keyboard canvas geometry so they do not jump upward while typing.
    window.requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      this.syncToCanvas();
    });
    window.setTimeout(() => {
      window.scrollTo(0, 0);
      this.syncToCanvas();
    }, 260);
  }

  private unlockAfterEditing(): void {
    this.editing = false;
    this.lockedCanvasRect = undefined;
    window.requestAnimationFrame(() => this.syncToCanvas());
  }

  private syncToCanvas(): void {
    if (!this.element.isConnected) return;
    const canvas = this.scene.game.canvas;
    const liveRect = canvas.getBoundingClientRect();
    const rect = this.editing && this.lockedCanvasRect ? this.lockedCanvasRect : liveRect;
    if (rect.width <= 0 || rect.height <= 0) return;

    const scaleX = rect.width / 1280;
    const scaleY = rect.height / 720;
    const fontScale = Math.max(0.72, Math.min(scaleX, scaleY));
    this.element.style.left = `${rect.left + this.options.x * scaleX}px`;
    this.element.style.top = `${rect.top + this.options.y * scaleY}px`;
    this.element.style.width = `${this.options.width * scaleX}px`;
    this.element.style.height = `${this.options.height * scaleY}px`;
    // iOS Safari automatically zooms focused inputs below 16px, which makes
    // the whole Start Scene appear to jump. Never render these below 16px.
    this.element.style.fontSize = `${Math.max(16, 20 * fontScale)}px`;
    this.element.style.padding = `0 ${Math.max(8, 14 * scaleX)}px`;
  }
}
