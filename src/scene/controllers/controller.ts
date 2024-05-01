import * as THREE from 'three';
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
  Forward,
  Reverse,
  Both
}

export class Controller {
  private currentState: ControllerState = ControllerState.Stopped;

  private static INITIAL_STEP = 0;

  private static ANIMATION_SPEED_MULTIPLIERS: number[] = [0.5, 1, 1.5, 2];

  private currentStep: number = 0;

  private clock: THREE.Clock;

  public speedMultiplier: number = 1;

  private origami: Origami;

  constructor(origami: Origami, clock: THREE.Clock) {
    this.origami = origami;
    this.clock = clock;
    // Adds event listeners to buttons
    document
      .getElementById('play-reverse-button')!
      .addEventListener('click', this.togglePlayAnimation.bind(this, AnimationDirection.Reverse));
    document.getElementById('speed-button')!.addEventListener('click', this.changeAnimationSpeedMultiplier.bind(this));
    document.getElementById('refresh-button')!.addEventListener('click', this.resetAnimation.bind(this));
    document
      .getElementById('play-button')!
      .addEventListener('click', this.togglePlayAnimation.bind(this, AnimationDirection.Forward));

    document.dispatchEvent(
      new CustomEvent<IControllerStepEvent>('controller:step', {
        detail: { currentStep: 0, totalSteps: this.origami.faceInstructions.length },
        cancelable: true
      })
    );
  }

  /**
   * Used to pause animation
   */
  public finishAnimation(direction: AnimationDirection): void {
    this.clock.stop();
    this.currentState = ControllerState.Finished;
    this.currentStep += direction === AnimationDirection.Reverse ? -1 : 1;
    this.origami.checkPointsOutlines(this.currentStep);
    document.dispatchEvent(
      new CustomEvent('controller:pause', {
        detail: { value: false, direction: direction },
        cancelable: true
      })
    );
    document.dispatchEvent(
      new CustomEvent<IControllerStepEvent>('controller:step', {
        detail: { currentStep: this.currentStep, totalSteps: this.origami.faceInstructions.length },
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
    this.origami.checkPointsOutlines(this.currentStep);
    document.dispatchEvent(
      new CustomEvent<IControllerEvent>('controller:pause', {
        detail: { value: false, direction: AnimationDirection.Both },
        cancelable: true
      })
    );
    document.dispatchEvent(
      new CustomEvent<IControllerStepEvent>('controller:step', {
        detail: { currentStep: this.currentStep, totalSteps: this.origami.faceInstructions.length },
        cancelable: true
      })
    );
  }

  /**
   * Used to toggle animation on/off (play/pause)
   */
  private togglePlayAnimation(direction: AnimationDirection): void {
    if (this.currentState !== ControllerState.Playing && this.currentState !== ControllerState.Playing_Reverse) {
      this.currentState =
        direction === AnimationDirection.Reverse ? ControllerState.Playing_Reverse : ControllerState.Playing;
    } else {
      this.currentState = ControllerState.Paused;
    }

    document.dispatchEvent(
      new CustomEvent<IControllerEvent>('controller:enable', {
        detail: {
          value: this.currentStep === ControllerState.Paused,
          direction: direction === AnimationDirection.Reverse ? AnimationDirection.Forward : AnimationDirection.Reverse
        },
        cancelable: true
      })
    );
  }

  /**
   * Used to change the animation speed multiplier
   */
  private changeAnimationSpeedMultiplier(): void {
    // cycle trought the defined speeds
    let idx = Controller.ANIMATION_SPEED_MULTIPLIERS.indexOf(this.speedMultiplier);
    idx = (idx + 1) % Controller.ANIMATION_SPEED_MULTIPLIERS.length;
    this.speedMultiplier = Controller.ANIMATION_SPEED_MULTIPLIERS[idx];

    document.dispatchEvent(
      new CustomEvent<IControllerSpeedEvent>('controller:speed', {
        detail: { speed: this.speedMultiplier },
        cancelable: true
      })
    );
  }

  /**
   * Used to update the origami
   */
  public update(): void {
    switch (this.currentState) {
      case ControllerState.Playing:
        !this.clock.running && this.clock.start();
        this.origami.playAnimationStep(this.currentStep, AnimationDirection.Forward);
        break;
      case ControllerState.Playing_Reverse:
        !this.clock.running && this.clock.start();
        this.origami.playAnimationStep(this.currentStep - 1, AnimationDirection.Reverse);
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
