import { SceneManager } from './scene-manager';

export class Canvas {
	constructor(canvas) {
		this.canvas = canvas;
		this.sceneManager = new SceneManager(canvas);
		this.init();
	}

  init = () => {
  	this.bindEventListeners();
  	this.render();
  };

  /**
   * Overrides onresize event listener
   */
  bindEventListeners = () => {
  	window.onresize = this.resizeCanvas;
  	this.resizeCanvas();
  };

  /**
   * Resizes canvas
   */
  resizeCanvas = () => {
  	this.canvas.style.width = '100%';
  	this.canvas.style.height = '100%';

  	this.canvas.width = this.canvas.offsetWidth;
  	this.canvas.height = this.canvas.offsetHeight;

  	this.sceneManager.onWindowResize();
  };

  /**
   * Recursively calls render for each frame update
   */
  render = (time) => {
  	requestAnimationFrame(this.render);
  	this.sceneManager.update(time);
  };
}
