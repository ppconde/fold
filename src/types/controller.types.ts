export interface IAnimationControls {
    previousTime: number;
    isPlaying: boolean;
    isStopped: boolean;
    currentStep: number;
    totalSteps: number;
    playDisabled: boolean;
  }