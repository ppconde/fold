import React, { useEffect, useState } from 'react';

export const ControlsComponent = () => {

	const [isPlaying, setIsPlaying] = useState(false);

	return (
		<div className="controls-wrapper">
			<div className="controls">
				<button
					id="play-pause-button"
					className="control"
					onClick={() => setIsPlaying((p) => !p)}
				>
					{isPlaying ? '⏸︎' : '⏵︎'}
				</button>
				<button
					id="stop-button"
					className="control"
					onClick={() => setIsPlaying(false)}
				>
					⏹︎
				</button>
			</div>
		</div>
	)
}
