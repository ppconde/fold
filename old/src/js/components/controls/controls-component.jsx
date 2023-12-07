import React, { useEffect, useState } from 'react';

export const ControlsComponent = () => {

	const [isPlaying, setIsPlaying] = useState(false);
	const [isEnabled, setIsEnabled] = useState(true);

	useEffect(() => {
		const handlePause = (event) => {
			event.preventDefault();
			event.stopPropagation();
			setIsPlaying(event.detail.value);
		}
		const handleIsEnabled = (event) => {
			event.preventDefault();
			event.stopPropagation();
			setIsEnabled(event.detail.value);
		}

		document.addEventListener('pause', handlePause.bind(this));
		document.addEventListener('enableplay', handleIsEnabled.bind(this));

		// Clean up the event listeners when the component unmounts
		return () => {
			document.removeEventListener('pause', handlePause.bind(this));
			document.removeEventListener('enableplay', handleIsEnabled.bind(this));
		}
	}, []);

	const handleSetIsPlaying = (isPlaying) => setIsPlaying(isPlaying);

	return (
		<div className="controls-wrapper">
			<div className="controls">
				<button
					style={{ pointerEvents: isEnabled ? 'auto' : 'none' }}
					disabled={!isEnabled}
					id="play-pause-button"
					className="control"
					onClick={handleSetIsPlaying.bind(this, !isPlaying)}
				>
					{isPlaying ? '⏸︎' : '⏵︎'}
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
	)
}
