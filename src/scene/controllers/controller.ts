import { IControllerEvent } from '../../components/controls/controls-component';
import { Origami } from '../models/origami/origami';

export enum ControllerState {
  Playing,
  Stopped,
  Paused,
  Finished
}

export class Controller {
  public currentState: ControllerState = ControllerState.Stopped;

  private static INITIAL_STEP = 0;

  private enablePlayEventDispatched = false;

  public currentStep: number = 0;

  private pauseEvent!: CustomEvent<{ value: boolean }>;

  private disabledEvent!: CustomEvent<{ value: boolean }>;

  private clock: THREE.Clock;

  private origami: Origami;

  constructor(origami: Origami, clock: THREE.Clock) {
    this.origami = origami;
    this.clock = clock;
    // Adds event listeners to buttons
    document.getElementById('play-pause-button')!.addEventListener('click', this.togglePlayAnimation.bind(this));
    document.getElementById('stop-button')!.addEventListener('click', this.stopAnimation.bind(this));
  }

  /**
   * Used to pause animation
   */
  public pauseAnimation(): void {
    this.currentState = ControllerState.Paused;
    this.pauseEvent = new CustomEvent('controller:pause', {
      detail: { value: false },
      cancelable: true
    });
    document.dispatchEvent(this.pauseEvent);
  }

  /**
   * Used to stop animation
   */
  private stopAnimation(): void {
    this.currentState = ControllerState.Stopped;
    this.currentStep = Controller.INITIAL_STEP;
    this.pauseEvent = new CustomEvent<IControllerEvent>('controller:pause', {
      detail: { value: true },
      cancelable: true
    });
    document.dispatchEvent(this.pauseEvent);
    this.enablePlay();
  }

  /**
   * Used to toggle animation on/off (play/pause)
   */
  private togglePlayAnimation(): void {
    this.currentState =
      this.currentState === ControllerState.Paused || this.currentState === ControllerState.Stopped
        ? ControllerState.Playing
        : ControllerState.Paused;
  }

  /**
   * Used to set animation to a specific step
   */
  public increaseStepBy(step: number): void {
    this.currentStep += step;
  }

  /**
   * Used to check if play button should be disabled
   * @param totalSteps
   */
  private shouldDisablePlay(totalSteps: number): boolean {
    return !this.enablePlayEventDispatched && this.currentStep >= totalSteps;
  }

  /**
   * Used to enable play button
   */
  private enablePlay(): void {
    this.disabledEvent = new CustomEvent<IControllerEvent>('controller:play', {
      detail: { value: true }
    });
    document.dispatchEvent(this.disabledEvent);
    this.enablePlayEventDispatched = false;
  }

  /**
   * Used to disable play button
   */
  private disablePlay(): void {
    this.clock.stop();
    this.disabledEvent = new CustomEvent<IControllerEvent>('controller:play', {
      detail: { value: false }
    });
    document.dispatchEvent(this.disabledEvent);
    this.enablePlayEventDispatched = true;
  }

  /**
   * Used to update the origami
   */
  public update(): void {
    if (this.shouldDisablePlay(this.origami.meshInstructions.length)) {
      this.disablePlay();
    } else {
      this.handleAnimation();
    }
  }

  /**
   * Used to handle animation
   */
  private handleAnimation(): void {
    switch (this.currentState) {
      case ControllerState.Playing:
        !this.clock.running && this.clock.start();
        this.origami.playAnimationStep();
        break;
      case ControllerState.Paused:
        this.clock.start();
        break;
      case ControllerState.Stopped:
        this.clock.stop();
        this.origami.resetOrigami();
        break;
      default:
        break;
    }
  }
}
