import * as THREE from "three";
import { LightsConfig } from './lights-config';
import { LightsTypes } from './lights-types';

export class GeneralLights {
	constructor(scene) {
		this.scene = scene;
		this.setLights();
		this.setLightsProperties();
	}

	/**
	 * Creates light objects and adds it to lightsMap, according to the lights configuration file
	 */
	setLights = () => {
		this.lightsMap = new Map();
		LightsConfig.forEach((light) => {
			if(light.enabled) {
				switch(light.type) {
					case LightsTypes.DIRECTIONAL_LIGHT:
						return this.lightsMap.set(light.key, new THREE.DirectionalLight(light.props));
					case LightsTypes.AMBIENT_LIGHT:
						return this.lightsMap.set(light.key, new THREE.AmbientLight(light.props));
					// Insert other light types if needed
				}
			}
		})
		this.addLightsToScene();
	}

	setLightsProperties = () => {
		const dirLight1 = this.lightsMap.get('Dir-1');
		dirLight1.position.set(10, 10, 10);
		//dirLight1.target.position.set(0, 0, 0);
		dirLight1.target.updateMatrixWorld();
		const ambLight1 = this.lightsMap.get('Amb-1');
	}

	addLightsToScene = () => {
		this.scene.add(this.lightsMap.get('Dir-1'));
		this.scene.add(this.lightsMap.get('Amb-1'));
	}

	update = () => {
		// Do something
	}
}
