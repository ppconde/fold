import { IControllerEvent, IStepEvent } from '../../components/controls/controls-component';
import { Origami } from '../models/origami/origami';

export enum ControllerState {
  Playing,
  Playing_Reverse,
  Stopped,
  Paused,
  Finished
}

export enum AnimationDirection {
  Forward,
  Reverse,
}

export class Controller {
  public currentState: ControllerState = ControllerState.Stopped;

  private static INITIAL_STEP = 0;

  private enablePlayEventDispatched = false;

  public currentStep: number = 0;

  private pauseEvent!: CustomEvent<IControllerEvent>;

  private disabledEvent!: CustomEvent<IControllerEvent>;

  private stepEvent!: CustomEvent<IStepEvent>;

  private clock: THREE.Clock;

  private origami: Origami;

  constructor(origami: Origami, clock: THREE.Clock) {
    this.origami = origami;
    this.clock = clock;
    // Adds event listeners to buttons
    document
      .getElementById('play-reverse-button')!
      .addEventListener('click', this.togglePlayAnimation.bind(this, AnimationDirection.Reverse));
    document
      .getElementById('play-button')!
      .addEventListener('click', this.togglePlayAnimation.bind(this, AnimationDirection.Forward));
    document
      .getElementById('refresh-button')!
      .addEventListener('click', this.resetAnimation.bind(this));

    this.stepEvent = new CustomEvent<IStepEvent>('controller:step', {
      detail: { currentStep: 0, totalSteps: this.origami.meshInstructions.length },
      cancelable: true,
    });
    document.dispatchEvent(this.stepEvent);
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
   * Used to reset the animation
   */
  private resetAnimation(): void {
    this.currentState = ControllerState.Stopped;
    this.currentStep = Controller.INITIAL_STEP;
    this.pauseEvent = new CustomEvent<IControllerEvent>('controller:pause', {
      detail: { value: true },
      cancelable: true
    });
    document.dispatchEvent(this.pauseEvent);
    this.stepEvent = new CustomEvent<IStepEvent>('controller:step', {
      detail: { currentStep: this.currentStep, totalSteps: this.origami.meshInstructions.length },
      cancelable: true,
    });
    document.dispatchEvent(this.stepEvent);
    this.enablePlay(AnimationDirection.Forward);
  }

  /**
   * Used to toggle animation on/off (play/pause)
   */
  private togglePlayAnimation(direction: AnimationDirection): void {
    if (this.currentState !== ControllerState.Paused && this.currentState !== ControllerState.Stopped) {
      this.currentState = ControllerState.Paused;
    }
    else {
      this.currentState = direction === AnimationDirection.Forward ? ControllerState.Playing : ControllerState.Playing_Reverse;
    }
  }

  /**
   * Used to set animation to a specific step
   */
  public increaseStepBy(step: number): void {
    this.currentStep += step;

    this.stepEvent = new CustomEvent<IStepEvent>('controller:step', {
      detail: { currentStep: this.currentStep, totalSteps: this.origami.meshInstructions.length },
      cancelable: true,
    });
    document.dispatchEvent(this.stepEvent);
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
  private enablePlay(direction: AnimationDirection): void {
    this.disabledEvent = new CustomEvent<IControllerEvent>(direction == AnimationDirection.Forward ? 'controller:play' : 'controller:play-reverse', {
      detail: { value: true },
    });
    document.dispatchEvent(this.disabledEvent);
    this.enablePlayEventDispatched = false;
  }

  /**
   * Used to disable play button
   */
  private disablePlay(direction: AnimationDirection): void {
    this.clock.stop();
    this.disabledEvent = new CustomEvent<IControllerEvent>(direction == AnimationDirection.Forward ? 'controller:play' : 'controller:play-reverse', {
      detail: { value: false },
    });
    document.dispatchEvent(this.disabledEvent);
    this.enablePlayEventDispatched = true;
  }

  /**
   * Used to update the origami
   */
  public update(): void {
    if (this.shouldDisablePlay(this.origami.meshInstructions.length)) {
      this.disablePlay(AnimationDirection.Forward);
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
