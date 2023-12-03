import React, { useEffect, useState } from 'react';

export const ControlsComponent = () => {

	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		const handlePause = (event) => setIsPlaying(event.target.value)
		document.addEventListener('pause', handlePause.bind(this));

		// Clean up the event listener when the component unmounts
		return () => document.removeEventListener('pause', handlePause.bind(this))
	}, []);

	const handleSetIsPlaying = (isPlaying) => setIsPlaying(isPlaying)

	return (
		<div className="controls-wrapper">
			<div className="controls">
				<button
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
