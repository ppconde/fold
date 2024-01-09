import { ControllerState } from '../scene/controllers/controller';

export interface IAnimationControls {
  previousTime: number;
  currentStep: number;
  totalSteps: number;
  currentState: ControllerState;
}