export class BaseModel {

	static STEP_TIME = 1000;

	constructor() {
		this.previousTime = 0;
		this.animationControls = {
			paused: true,
			currentStep: -1,
			totalSteps: 0,
		}
	}

	/**
	 * Used to play animation
	 */
	playAnimation = () => {
		this.animationControls.paused = false;
	}

	/**
	 * Used to pause animation
	 */
	pauseAnimation = () => {
		this.animationControls.paused = true;
	}

	/**
	 * Used to toggle animation on/off (play/pause)
	 */
	toggleAnimation = () => {
		this.animationControls.paused = !this.animationControls.paused;
	}

	/**
	 * Used to stop animation and reset to step 0
	 */
	stopAnimation = () => {
		this.animationControls.paused = true;
		this.animationControls.currentStep = 0;
	}

	/**
	 * Used to set animation to a specific step
	 */
	setCurrentStep = (step) => {
		this.animationControls.currentStep = step;
	}

	setPreviousFrame = () => {
		this.animationControls.currentStep -= 1;
	}

	setNextFrame = () => {
		this.animationControls.currentStep += 1;
	}

	/**
	 * Used to determine if animation should pause
	 * We need to check if the animation is paused and if the current step is 0
	 * because we need to render the mesh the first time when the origami is first loaded
	 * and only then we can pause it
	 */
	shouldPause = () => {
		const { paused, currentStep } = this.animationControls;
		return paused && currentStep > 0;
	}

	/**
	 * Used to determine if the model should render
	 */
	shouldRender = (time, currentStep, total) => {
		// const delta_time = time - this.previousTime;
		// return delta_time >= BaseModel.STEP_TIME && currentStep <= total
		return this.animationControls.currentStep === -1;
	}

	/**
	 * Used to determine if animation should play
	 */
	shouldPlayAnimation = () => {
		return this.animationControls.currentStep >= 0 && !this.animationControls.paused;
	}

}