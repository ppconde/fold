import { SceneManager } from './scene-manager';

export class Canvas {
  public canvas: HTMLCanvasElement;

  public sceneManager: SceneManager;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.sceneManager = new SceneManager(canvas);
    this.resizeCanvas = this.resizeCanvas.bind(this);
    this.init();
  }

  private init(): void {
    this.bindEventListeners();
    this.render();
  }

  /**
   * Overrides onresize event listener
   */
  private bindEventListeners(): void {
    window.onresize = this.resizeCanvas;
    this.resizeCanvas();
  }

  /**
   * Resizes canvas
   */
  private resizeCanvas(): void {
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';

    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;

    this.sceneManager.onWindowResize();
  }

  /**
   * Recursively calls render for each frame render
   */
  public render(): void {
    // Used for checking app performance
    window.debug.stats?.begin();

    requestAnimationFrame(this.render.bind(this));
    this.sceneManager.update();

    window.debug.stats?.end();
  }
}
