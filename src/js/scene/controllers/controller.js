export class Controller {
	static STEP_TIME = 1000;
	INITIAL_STEP = 0;
	constructor() {
		this.animationControls = {
			previousTime: 0,
			isPlaying: false,
			currentStep: this.INITIAL_STEP,
			totalSteps: 0,
			// isAnimating: false,
			// isFirstRenderDone: false,
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
	}

	pauseAnimation = () => {
		this.animationControls.isPlaying = false;
		this.pauseEvent = new CustomEvent('pause', { target: { value: !this.animationControls.paused } })
		document.dispatchEvent(this.pauseEvent);
	}

	isPlayingAnimation = () => {
		return this.animationControls.isPlaying;
	}

	stopAnimation = () => {
		this.animationControls.isPlaying = false;
		this.animationControls.currentStep = this.INITIAL_STEP;
		this.pauseEvent = new CustomEvent('pause', { target: { value: true } })
		document.dispatchEvent(this.pauseEvent);
	}

	// toggleIsAnimating = () => {
	// 	this.animationControls.isAnimating = !this.animationControls.isAnimating;
	// }

	/**
	 * Used to pause animation
	 */
	// pauseAnimation = () => {
	// 	this.animationControls.paused = true;
	// 	this.stopEvent = new CustomEvent('pause', { target: { value: !this.animationControls.paused } })
	// 	document.dispatchEvent(this.stopEvent);
	// }

	/**
	 * Used to toggle animation on/off (play/pause)
	 */
	togglePlayAnimation = () => {
		console.log('deu toggle: ', this.animationControls.isPlaying);
		this.animationControls.isPlaying = !this.animationControls.isPlaying;
	}

	/**
	 * Used to stop animation and reset to step 0
	 */
	// stopAnimation = () => {
	// 	this.animationControls.paused = true;
	// 	this.animationControls.currentStep = this.INITIAL_STEP;
	// 	this.animationControls.isAnimating = false;
	// 	this.animationControls.isFirstRenderDone = false;
	// 	this.stopEvent = new CustomEvent('pause', { target: { value: true } })
	// 	document.dispatchEvent(this.stopEvent);
	// }

	/**
	 * Used to set animation to a specific step
	 */
	increaseStepBy = (step) => {
		this.animationControls.currentStep += step;
	}

	// setIsFirstRenderDone = () => {
	// 	this.animationControls.isFirstRenderDone = true;
	// }

	// shouldRenderFirstStep = () => {
	// 	const { currentStep, isFirstRenderDone } = this.animationControls;
	// 	console.log('shouldRender: ', isFirstRenderDone, currentStep === this.INITIAL_STEP);
	// 	return !isFirstRenderDone && currentStep === this.INITIAL_STEP;
	// }

	// /**
	//  * Used to determine if animation should pause
	//  * We need to check if the animation is paused and if the current step is 0
	//  * because we need to render the mesh the first time when the origami is first loaded
	//  * and only then we can pause it
	//  */
	// shouldPause = () => {
	// 	const { paused, currentStep } = this.animationControls;
	// 	return paused && (currentStep > this.INITIAL_STEP);
	// }

	// /**
	//  * Used to determine if the model should render
	//  */
	// shouldPrepareNextStep = () => {
	// 	// const delta_time = time - this.previousTime;
	// 	// return delta_time >= BaseModel.STEP_TIME && currentStep <= total
	// 	const { currentStep, isAnimating } = this.animationControls;
	// 	return /* currentStep === this.INITIAL_STEP ||  */!isAnimating;
	// }

	// /**
	//  * Used to determine if animation should play
	//  */
	// shouldPlayAnimation = (totalSteps) => {
	// 	const { currentStep, isAnimating, paused } = this.animationControls;
	// 	console.log(
	// 		'currentStep: ', currentStep,
	// 		' totalSteps: ', totalSteps,
	// 		' isAnimating: ', isAnimating,
	// 		' paused: ', paused,
	// 	)
	// 	return ((currentStep >= 0) && (currentStep < totalSteps) || isAnimating) && !paused;
	// }

}


// I want togglePlayAnimation to notify the animation to pause but also when the animation pauses by itself to notify the component