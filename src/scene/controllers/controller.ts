import { IControllerEvent, IControllerStepEvent } from '../../components/controls/controls-component';
import { Origami } from '../models/origami/origami';

export enum ControllerState {
  Playing,
  Playing_Reverse,
  Stopped,
  Paused,
  Finished
}

export enum AnimationDirection {
  Forward = 1,
  Reverse = 2,
  Both = 3,
}

export class Controller {
  public currentState: ControllerState = ControllerState.Stopped;

  private static INITIAL_STEP = 0;

  private enablePlayEventDispatched = false;

  public currentStep: number = 0;

  private pauseEvent!: CustomEvent<IControllerEvent>;

  private disabledEvent!: CustomEvent<IControllerEvent>;

  private stepEvent!: CustomEvent<IControllerStepEvent>;

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
    document.getElementById('refresh-button')!.addEventListener('click', this.resetAnimation.bind(this));

    this.stepEvent = new CustomEvent<IControllerStepEvent>('controller:step', {
      detail: { currentStep: 0, totalSteps: this.origami.meshInstructions.length },
      cancelable: true,
    });
    document.dispatchEvent(this.stepEvent);
  }

  /**
   * Used to pause animation
   */
  public pauseAnimation(direction: AnimationDirection): void {
    this.currentState = ControllerState.Paused;
    this.pauseEvent = new CustomEvent('controller:pause', {
      detail: { value: false, direction: direction },
      cancelable: true,
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
      detail: { value: false, direction: AnimationDirection.Both },
      cancelable: true,
    });
    document.dispatchEvent(this.pauseEvent);
    this.stepEvent = new CustomEvent<IControllerStepEvent>('controller:step', {
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
    } else {
      this.currentState =
        direction === AnimationDirection.Reverse ? ControllerState.Playing_Reverse : ControllerState.Playing;
    }
  }

  /**
   * Used to set animation to a specific step
   */
  public increaseStepBy(step: number): void {
    this.currentStep += step;

    this.stepEvent = new CustomEvent<IControllerStepEvent>('controller:step', {
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
    this.disabledEvent = new CustomEvent<IControllerEvent>('controller:play', {
      detail: { value: true, direction: direction },
    });
    document.dispatchEvent(this.disabledEvent);
    this.enablePlayEventDispatched = false;
  }

  /**
   * Used to disable play button
   */
  private disablePlay(direction: AnimationDirection): void {
    this.clock.stop();
    this.disabledEvent = new CustomEvent<IControllerEvent>('controller:play', {
      detail: { value: false, direction: direction },
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
    } else if (this.shouldDisablePlay(Controller.INITIAL_STEP)) {
      this.disablePlay(AnimationDirection.Reverse);
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
        this.origami.playAnimationStep(AnimationDirection.Forward);
        break;
      case ControllerState.Playing_Reverse:
        !this.clock.running && this.clock.start();
        this.origami.playAnimationStep(AnimationDirection.Reverse);
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
