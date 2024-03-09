import {
  IControllerEvent,
  IControllerStepEvent,
  IControllerSpeedEvent
} from '../../components/controls/controls-component';
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
  Both = 3
}

const AnimationSpeeds: number[] = [0.5, 1, 2];

export class Controller {
  public currentState: ControllerState = ControllerState.Stopped;

  private static INITIAL_STEP = 0;

  private enablePlayEventDispatched = false;

  public currentStep: number = 0;

  private clock: THREE.Clock;

  private animationSpeed: number = 1;

  private origami: Origami;

  constructor(origami: Origami, clock: THREE.Clock) {
    this.origami = origami;
    this.clock = clock;
    // Adds event listeners to buttons
    document
      .getElementById('play-reverse-button')!
      .addEventListener('click', this.togglePlayAnimation.bind(this, AnimationDirection.Reverse));
    document.getElementById('speed-button')!.addEventListener('click', this.changeAnimationSpeed.bind(this));
    document.getElementById('refresh-button')!.addEventListener('click', this.resetAnimation.bind(this));
    document
      .getElementById('play-button')!
      .addEventListener('click', this.togglePlayAnimation.bind(this, AnimationDirection.Forward));

    document.dispatchEvent(
      new CustomEvent<IControllerStepEvent>('controller:step', {
        detail: { currentStep: 0, totalSteps: this.origami.meshInstructions.length },
        cancelable: true
      })
    );
  }

  /**
   * Used to pause animation
   */
  public pauseAnimation(direction: AnimationDirection): void {
    this.currentState = ControllerState.Paused;
    document.dispatchEvent(
      new CustomEvent('controller:pause', {
        detail: { value: false, direction: direction },
        cancelable: true
      })
    );
  }

  /**
   * Used to reset the animation
   */
  private resetAnimation(): void {
    this.currentState = ControllerState.Stopped;
    this.currentStep = Controller.INITIAL_STEP;
    document.dispatchEvent(
      new CustomEvent<IControllerEvent>('controller:pause', {
        detail: { value: false, direction: AnimationDirection.Both },
        cancelable: true
      })
    );
    document.dispatchEvent(
      new CustomEvent<IControllerStepEvent>('controller:step', {
        detail: { currentStep: this.currentStep, totalSteps: this.origami.meshInstructions.length },
        cancelable: true
      })
    );
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
   * Used to change the animation speed
   */
  private changeAnimationSpeed(): void {
    let idx = AnimationSpeeds.indexOf(this.animationSpeed);
    idx = (idx + 1) % AnimationSpeeds.length;
    this.animationSpeed = AnimationSpeeds[idx];

    document.dispatchEvent(
      new CustomEvent<IControllerSpeedEvent>('controller:speed', {
        detail: { speed: this.animationSpeed },
        cancelable: true
      })
    );
  }

  /**
   * Used to set animation to a specific step
   */
  public increaseStepBy(step: number): void {
    this.currentStep += step;

    document.dispatchEvent(
      new CustomEvent<IControllerStepEvent>('controller:step', {
        detail: { currentStep: this.currentStep, totalSteps: this.origami.meshInstructions.length },
        cancelable: true
      })
    );
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
    document.dispatchEvent(
      new CustomEvent<IControllerEvent>('controller:play', {
        detail: { value: true, direction: direction }
      })
    );
    this.enablePlayEventDispatched = false;
  }

  /**
   * Used to disable play button
   */
  private disablePlay(direction: AnimationDirection): void {
    this.clock.stop();
    document.dispatchEvent(
      new CustomEvent<IControllerEvent>('controller:play', {
        detail: { value: false, direction: direction }
      })
    );
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
        this.origami.playAnimationStep(this.animationSpeed, AnimationDirection.Forward);
        break;
      case ControllerState.Playing_Reverse:
        !this.clock.running && this.clock.start();
        this.origami.playAnimationStep(this.animationSpeed, AnimationDirection.Reverse);
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
