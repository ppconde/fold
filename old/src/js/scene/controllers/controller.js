export class Controller {
	static STEP_TIME = 1000;
	INITIAL_STEP = 0;
	enablePlayEventDispatched = false;

	constructor() {
		this.animationControls = {
			previousTime: 0,
			isPlaying: false,
			isStopped: true,
			currentStep: this.INITIAL_STEP,
			totalSteps: 0,
			playDisabled: false,
		}

		// Adds event listeners to buttons
		document.getElementById('play-pause-button').addEventListener('click', this.togglePlayAnimation);
		document.getElementById('stop-button').addEventListener('click', this.stopAnimation);
	}

	/**
	 * Used to play animation
	 */
	playAnimation = () => {
		this.animationControls.isPlaying = true;
		this.animationControls.isStopped = false;
	}

	pauseAnimation = () => {
		this.animationControls.isPlaying = false;
		this.pauseEvent = new CustomEvent('pause', { detail: { value: this.animationControls.isPlaying }, cancelable: true })
		document.dispatchEvent(this.pauseEvent);
	}

	isPlayingAnimation = () => {
		return this.animationControls.isPlaying;
	}

	stopAnimation = () => {
		this.animationControls.isPlaying = false;
		this.animationControls.isStopped = true;
		this.animationControls.currentStep = this.INITIAL_STEP;
		this.pauseEvent = new CustomEvent('pause', { detail: { value: true }, cancelable: true, })
		document.dispatchEvent(this.pauseEvent);
		this.enablePlay();
	}

	isStopped = () => {
		return this.animationControls.isStopped;
	}

	/**
	 * Used to toggle animation on/off (play/pause)
	 */
	togglePlayAnimation = () => {
		this.animationControls.isPlaying = !this.animationControls.isPlaying;
		this.animationControls.isStopped = false;
	}

	/**
	 * Used to set animation to a specific step
	 */
	increaseStepBy = (step) => {
		this.animationControls.currentStep += step;
	}

	shouldDisablePlay = (total) => {
		return !this.enablePlayEventDispatched && this.animationControls.currentStep >= total;
	}

	enablePlay = () => {
		this.disabledEvent = new CustomEvent('enableplay', { detail: { value: true } })
		document.dispatchEvent(this.disabledEvent);
		this.enablePlayEventDispatched = false;
	}

	disablePlay = () => {
		this.disabledEvent = new CustomEvent('enableplay', { detail: { value: false } })
		document.dispatchEvent(this.disabledEvent);
		this.enablePlayEventDispatched = true;
	}

}
