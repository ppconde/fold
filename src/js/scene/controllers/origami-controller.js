export class OrigamiController {
	constructor(origami) {
		this.origami = origami;
		// Adds event listeners to buttons
		document.getElementById('play-pause-button').addEventListener('click', this.toggleAnimation);
		document.getElementById('stop-button').addEventListener('click', this.stop);
	}

	/**
	 * Used to play animation
	 */
	play = () => {
		this.origami.playAnimation();
	}

	/**
	 * Used to pause animation
	 */
	pause = () => {
		this.origami.pauseAnimation();
	}

	/**
	 * Used to toggle animation on/off (play/pause)
	 */
	toggleAnimation = () => {
		this.origami.toggleAnimation();
	}

	/**
	 * Used to stop animation and reset to frame 0
	 */
	stop = () => {
		this.origami.stopAnimation();
	}

	/**
	 * Used to set animation to a specific frame
	 */
	setFrame = (frame) => {
		this.origami.setFrame(frame);
	}

	setPreviousFrame = () => {
		this.origami.setPreviousFrame();
	}

	setNextFrame = () => {
		this.origami.setNextFrame();
	}
}
