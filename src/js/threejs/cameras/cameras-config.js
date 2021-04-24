import { CamerasTypes } from './cameras-types';
/**
 * Cameras configuration file, insert more cameras objects in order to create more cameras for the scene
 * The props are configurable properties that are represented in each camera object
 */
export const CamerasConfig = [
	{
		key: 'Pers-1',
		type: CamerasTypes.PERSPECTIVE_CAMERA,
		props: {
			fov: 65,
			aspect: 2,
			near: 0.1,
			far: 500,
		},
	},
]