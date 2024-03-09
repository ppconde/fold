import { useEffect, useState } from 'react';

export interface IControllerEvent {
  value: boolean;
}

export interface IStepEvent {
  currentStep: number;
  totalSteps: number;
}

export const ControlsComponent = () => {
  const [isPlayingForward, setIsPlayingForward] = useState(false);
  const [isEnabledForward, setIsEnabledForward] = useState(true);
  const [isPlayingReverse, setIsPlayingReverse] = useState(false);
  const [isEnabledReverse, setIsEnabledReverse] = useState(true);
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
      setIsPlayingReverse(event.detail.value);
      setIsPlayingForward(event.detail.value);
    };

    /**
     * Handle the play event
     * @param event
     */
    const handleIsEnabled = (event: CustomEvent<IControllerEvent>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsEnabledReverse(event.detail.value);
      setIsEnabledForward(event.detail.value);
    };

    /**
     * Handle the steps event
     * @param event
     */
    const handleSteps = (event: CustomEvent<IStepEvent>) => {
      event.preventDefault();
      event.stopPropagation();
      setCurrentStep(event.detail.currentStep);
      setTotalSteps(event.detail.totalSteps);
    };

    document.addEventListener('controller:pause', handlePause.bind(this));
    document.addEventListener('controller:play', handleIsEnabled.bind(this));
    document.addEventListener('controller:step', handleSteps.bind(this));

    // Clean up the event listeners when the component unmounts
    return () => {
      document.removeEventListener('controller:pause', handlePause.bind(this));
      document.removeEventListener('controller:play', handleIsEnabled.bind(this));
      document.removeEventListener('controller:step', handleSteps.bind(this));
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
        <button
          id="refresh-button"
          className="control"
          onClick={handleSetIsPlayingForward.bind(this, false)}
        >
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
