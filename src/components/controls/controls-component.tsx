import { useEffect, useState } from 'react';
import { AnimationDirection } from '../../scene/controllers/controller';

export interface IControllerEvent {
  value: boolean;
  direction: AnimationDirection;
}

export interface IControllerSpeedEvent {
  speed: number;
}

export interface IControllerStepEvent {
  currentStep: number;
  totalSteps: number;
}

export const ControlsComponent = () => {
  const [isPlayingForward, setIsPlayingForward] = useState(false);
  const [isEnabledForward, setIsEnabledForward] = useState(true);
  const [isPlayingReverse, setIsPlayingReverse] = useState(false);
  const [isEnabledReverse, setIsEnabledReverse] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);

  useEffect(() => {
    /**
     * Handle the pause event
     * @param event
     */
    const handlePause = (event: CustomEvent<IControllerEvent>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.detail.direction == AnimationDirection.Forward) {
        setIsPlayingForward(event.detail.value);
      } else {
        setIsPlayingReverse(event.detail.value);
      }
    };

    /**
     * Handle the steps event
     * @param event
     */
    const handleSteps = (event: CustomEvent<IControllerStepEvent>) => {
      event.preventDefault();
      event.stopPropagation();
      setCurrentStep(event.detail.currentStep);
      setTotalSteps(event.detail.totalSteps);
      setIsEnabledForward(event.detail.currentStep < event.detail.totalSteps);
      setIsEnabledReverse(event.detail.currentStep != 0);
    };

    /**
     * Handle the speed event
     * @param event
     */
    const handleSpeed = (event: CustomEvent<IControllerSpeedEvent>) => {
      event.preventDefault();
      event.stopPropagation();
      setAnimationSpeed(event.detail.speed);
    };

    document.addEventListener('controller:pause', handlePause.bind(this));
    document.addEventListener('controller:step', handleSteps.bind(this));
    document.addEventListener('controller:speed', handleSpeed.bind(this));

    // Clean up the event listeners when the component unmounts
    return () => {
      document.removeEventListener('controller:pause', handlePause.bind(this));
      document.removeEventListener('controller:step', handleSteps.bind(this));
      document.removeEventListener('controller:speed', handleSpeed.bind(this));
    };
  }, []);

  const handleSetIsPlayingForward = (isPlaying: boolean) => setIsPlayingForward(isPlaying);
  const handleSetIsPlayingReverse = (isPlaying: boolean) => setIsPlayingReverse(isPlaying);

  return (
    <div className="controls-wrapper">
      <div className="controls">
        <button
          style={{ pointerEvents: isEnabledReverse ? 'auto' : 'none' }}
          disabled={!isEnabledReverse}
          id="play-reverse-button"
          className="control"
          onClick={handleSetIsPlayingReverse.bind(this, !isPlayingReverse)}
        >
          {isPlayingReverse ? '⏸' : '⏴'}
        </button>
        <button id="speed-button" className="control">
          {animationSpeed}x
        </button>
        <button id="refresh-button" className="control" onClick={handleSetIsPlayingForward.bind(this, false)}>
          ↻
        </button>
        <button
          style={{ pointerEvents: isEnabledForward ? 'auto' : 'none' }}
          disabled={!isEnabledForward}
          id="play-button"
          className="control"
          onClick={handleSetIsPlayingForward.bind(this, !isPlayingForward)}
        >
          {isPlayingForward ? '⏸' : '⏵︎'}
        </button>
      </div>
      <div className="pagination">
        {currentStep} / {totalSteps}
      </div>
    </div>
  );
};
