export class BaseModel {

	static STEP_TIME = 1000;

	constructor() {
		this.previousTime = 0;
		this.animationControls = {
			paused: true,
			currentFrame: 0,
			totalFrames: 0,
		}
		this.mesh_instructions = [];
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
	 * Used to stop animation and reset to frame 0
	 */
	stopAnimation = () => {
		this.animationControls.paused = true;
		this.animationControls.currentFrame = 0;
	}

	/**
	 * Used to set animation to a specific frame
	 */
	setFrame = (frame) => {
		this.animationControls.currentFrame = frame;
	}

	setPreviousFrame = () => {
		this.animationControls.currentFrame -= 1;
	}

	setNextFrame = () => {
		this.animationControls.currentFrame += 1;
	}

	/**
	 * Used to determine if animation should pause
	 * We need to check if the animation is paused and if the current frame is 0
	 * because we need to render the mesh the first time when the origami is first loaded
	 * and only then we can pause it
	 */
	shouldPause = () => {
		const { paused, currentFrame } = this.animationControls;
		return paused && currentFrame > 0;
	}

	/**
	 * Used to determine if animation should play
	 */
	shouldPlayAnimation = (time, currentFrame) => {
		return true;
		// const delta_time = time - this.previousTime;
		// return delta_time >= BaseModel.STEP_TIME && currentFrame <= this.mesh_instructions.length
	}

}