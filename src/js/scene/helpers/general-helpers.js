import * as THREE from 'three';
import { HelpersConfig } from './helpers-config';
import { HelpersTypes } from './helpers-types';

export class GeneralHelpers {
	constructor(scene, sceneObjects) {
		this.scene = scene;
		this.sceneObjects = sceneObjects;
		this.setHelpers();
	}

	/**
	 * Creates light objects and adds it to lightsMap, according to the lights configuration file
	 */
	setHelpers = () => {
		this.helpersMap = new Map();
		HelpersConfig.forEach((helper) => {
			// console.log(helper)
			if (helper.enabled) {
				switch (helper.type) {
				case HelpersTypes.DIRECTIONAL_LIGHT:
					if (typeof this.helpersMap.get(helper.key) == 'undefined') { this.helpersMap.set(helper.key, []) }
					// this.helpersMap.get(helper.key).push(new THREE.DirectionalLightHelper(this.sceneObjects[0].lightsMap.get(helper.key),1));
					this.helpersMap.get(helper.key).push(new THREE.DirectionalLightHelper(this.sceneObjects.get('GeneralLights').lightsMap.get(helper.key), 1));
					return this.helpersMap.set(helper.key, this.helpersMap.get(helper.key));
				case HelpersTypes.SHADOW_CAMERA:
					if (typeof this.helpersMap.get(helper.key) == 'undefined') { this.helpersMap.set(helper.key, []) }
					// this.helpersMap.get(helper.key).push(new THREE.CameraHelper(this.sceneObjects[0].lightsMap.get(helper.key).shadow.camera));
					this.helpersMap.get(helper.key).push(new THREE.CameraHelper(this.sceneObjects.get('GeneralLights').lightsMap.get(helper.key).shadow.camera));
					return this.helpersMap.set(helper.key, this.helpersMap.get(helper.key));

				case HelpersTypes.AXES:
					return this.helpersMap.set(helper.key, [new THREE.AxesHelper(2)]);
				// this.scene.add(new THREE.AxesHelper( 2 ));
				}
			}
		})
		this.addHelpersToScene();
	}

	addHelpersToScene = () => {
		this.helpersMap.forEach((helperVec) => { helperVec.forEach((helperObj) => this.scene.add(helperObj)); })
	}

	update = () => {
		// Do something
	}

}