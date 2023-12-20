import { IAnimationControls } from '../../../types/controller.types';
import { IControllerEvent } from '../../components/controls/controls-component';

export class Controller {

  public static STEP_TIME = 1000;

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
      .getElementById('play-pause-button')!
      .addEventListener('click', this.togglePlayAnimation.bind(this));
    document
      .getElementById('stop-button')!
      .addEventListener('click', this.stopAnimation.bind(this));
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
  public pauseAnimation(): void {
    this.animationControls.isPlaying = false;
    this.pauseEvent = new CustomEvent('controller:pause', {
      detail: { value: this.animationControls.isPlaying },
      cancelable: true,
    });
    document.dispatchEvent(this.pauseEvent);
  }

  /**
   * Used to check if animation is playing
   */
  public isPlayingAnimation(): boolean {
    return this.animationControls.isPlaying;
  }

  /**
   * Used to stop animation
   */
  public stopAnimation(): void {
    this.animationControls.isPlaying = false;
    this.animationControls.isStopped = true;
    this.animationControls.currentStep = this.INITIAL_STEP;
    this.pauseEvent = new CustomEvent<IControllerEvent>('pause', {
      detail: { value: true },
      cancelable: true,
    });
    document.dispatchEvent(this.pauseEvent);
    this.enablePlay();
  }

  /**
   * Used to check if animation is stopped
   */
  public isStopped(): boolean {
    return this.animationControls.isStopped;
  }

  /**
   * Used to toggle animation on/off (play/pause)
   */
  public togglePlayAnimation(): void {
    this.animationControls.isPlaying = !this.animationControls.isPlaying;
    this.animationControls.isStopped = false;
  }

  /**
   * Used to set animation to a specific step
   */
  public increaseStepBy(step: number): void {
    this.animationControls.currentStep += step;
  }

  /**
   * Used to check if play button should be disabled
   * @param total
   */
  public shouldDisablePlay(total: number): boolean {
    return (
      !this.enablePlayEventDispatched &&
      this.animationControls.currentStep >= total
    );
  }

  /**
   * Used to enable play button
   */
  public enablePlay(): void {
    this.disabledEvent = new CustomEvent<IControllerEvent>('controller:play', {
      detail: { value: true },
    });
    document.dispatchEvent(this.disabledEvent);
    this.enablePlayEventDispatched = false;
  }

  /**
   * Used to disable play button
   */
  public disablePlay(): void {
    this.disabledEvent = new CustomEvent<IControllerEvent>('controller:play', {
      detail: { value: false },
    });
    document.dispatchEvent(this.disabledEvent);
    this.enablePlayEventDispatched = true;
  }
}
