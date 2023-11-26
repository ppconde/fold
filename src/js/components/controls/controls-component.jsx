import React, { useEffect, useState } from 'react';

export const ControlsComponent = () => {

	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		console.log('isPlaying: ', isPlaying);
	}, [isPlaying]);


	const renderSteps = () => {
		return Array.from({ length: 5 }, (_, i) => (
			<div key={`step-${i}`} className="step" id={`step-${i}`} />
		));
	}

	return (
		<div className="controls-wrapper">
			<div className="steps">
				{renderSteps()}
			</div>
			<div className="controls">
				<button id="play-pause-button" className="control" onClick={() => setIsPlaying((p) => !p)}>{isPlaying ? '⏸︎' : '⏵︎'}</button>
				<button id="stop-button" className="control" onClick={() => setIsPlaying(false)}>⏹︎</button>
			</div>
		</div>
	)
}
