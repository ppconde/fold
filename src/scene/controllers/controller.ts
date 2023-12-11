import { IControllerEvent } from "../../components/controls/controls-component";

interface IAnimationControls {
  previousTime: number;
  isPlaying: boolean;
  isStopped: boolean;
  currentStep: number;
  totalSteps: number;
  playDisabled: boolean;
}

export class Controller {
  static STEP_TIME = 1000;

  private INITIAL_STEP = 0;

  private enablePlayEventDispatched = false;

  public animationControls: IAnimationControls = {
    previousTime: 0,
    isPlaying: false,
    isStopped: true,
    currentStep: this.INITIAL_STEP,
    totalSteps: 0,
    playDisabled: false,
  };

  private pauseEvent!: CustomEvent<{ value: boolean }>;

  private disabledEvent!: CustomEvent<{ value: boolean }>;

  constructor() {
    // Adds event listeners to buttons
    document
      .getElementById("play-pause-button")!
      .addEventListener("click", this.togglePlayAnimation);
    document
      .getElementById("stop-button")!
      .addEventListener("click", this.stopAnimation);
  }

  /**
   * Used to play animation
   */
  public playAnimation(): void {
    this.animationControls.isPlaying = true;
    this.animationControls.isStopped = false;
  }

  /**
   * Used to pause animation
   */
  public pauseAnimation() {
    this.animationControls.isPlaying = false;
    this.pauseEvent = new CustomEvent("controller:pause", {
      detail: { value: this.animationControls.isPlaying },
      cancelable: true,
    });
    document.dispatchEvent(this.pauseEvent);
  }

  /**
   * Used to check if animation is playing
   */
  public isPlayingAnimation() {
    return this.animationControls.isPlaying;
  }

  /**
   * Used to stop animation
   */
  public stopAnimation() {
    this.animationControls.isPlaying = false;
    this.animationControls.isStopped = true;
    this.animationControls.currentStep = this.INITIAL_STEP;
    this.pauseEvent = new CustomEvent<IControllerEvent>("pause", {
      detail: { value: true },
      cancelable: true,
    });
    document.dispatchEvent(this.pauseEvent);
    this.enablePlay();
  }

  /**
   * Used to check if animation is stopped
   */
  public isStopped() {
    return this.animationControls.isStopped;
  }

  /**
   * Used to toggle animation on/off (play/pause)
   */
  public togglePlayAnimation() {
    this.animationControls.isPlaying = !this.animationControls.isPlaying;
    this.animationControls.isStopped = false;
  }

  /**
   * Used to set animation to a specific step
   */
  public increaseStepBy(step: number) {
    this.animationControls.currentStep += step;
  }

  /**
   * Used to set animation to a specific step
   * @param total
   */
  public shouldDisablePlay(total: number) {
    return (
      !this.enablePlayEventDispatched &&
      this.animationControls.currentStep >= total
    );
  }

  /**
   * Used to enable play button
   */
  public enablePlay() {
    this.disabledEvent = new CustomEvent<IControllerEvent>("controller:play", {
      detail: { value: true },
    });
    document.dispatchEvent(this.disabledEvent);
    this.enablePlayEventDispatched = false;
  }

  /**
   * Used to disable play button
   */
  public disablePlay() {
    this.disabledEvent = new CustomEvent<IControllerEvent>("controller:play", {
      detail: { value: false },
    });
    document.dispatchEvent(this.disabledEvent);
    this.enablePlayEventDispatched = true;
  }
}
