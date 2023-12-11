import { useEffect, useState } from "react";

export interface IControllerEvent {
  value: boolean;
}

export const ControlsComponent = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    /**
     * Handle the pause event
     * @param event
     */
    const handlePause = (event: CustomEvent<IControllerEvent>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsPlaying(event.detail.value);
    };

    /**
     * Handle the play event
     * @param event
     */
    const handleIsEnabled = (event: CustomEvent<IControllerEvent>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsEnabled(event.detail.value);
    };

    document.addEventListener("controller:pause", handlePause.bind(this));
    document.addEventListener("controller:play", handleIsEnabled.bind(this));

    // Clean up the event listeners when the component unmounts
    return () => {
      document.removeEventListener("controller:pause", handlePause.bind(this));
      document.removeEventListener(
        "controller:play",
        handleIsEnabled.bind(this)
      );
    };
  }, []);

  const handleSetIsPlaying = (isPlaying: boolean) => setIsPlaying(isPlaying);

  return (
    <div className="controls-wrapper">
      <div className="controls">
        <button
          style={{ pointerEvents: isEnabled ? "auto" : "none" }}
          disabled={!isEnabled}
          id="play-pause-button"
          className="control"
          onClick={handleSetIsPlaying.bind(this, !isPlaying)}
        >
          {isPlaying ? "⏸︎" : "⏵︎"}
        </button>
        <button
          id="stop-button"
          className="control"
          onClick={handleSetIsPlaying.bind(this, false)}
        >
          ⏹︎
        </button>
      </div>
    </div>
  );
};
