import * as THREE from 'three';
import fold from '../../../crease-patterns/rectangle.fold';
import {foldToThreeConverter} from '../helper-functions/fold-to-three-converter';

export class OrigamiModel {
	constructor(scene) {
		// Temporary geo and material
		this.geometry = new THREE.BoxBufferGeometry(2, 2, 2);
		this.material = new THREE.MeshStandardMaterial({ color: new THREE.Color('rgb(100,0,0)') });
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		scene.add(this.mesh);
		this.init();

	}

	init = () => {
	    this.loadFoldObject();
	}

	/**
	 * Loads fold object and parses it into a json object
	 */
	loadFoldObject = () => {
		// console.log(fold);
		foldToThreeConverter(fold)

	}

	update = () => {
	    // Do something
	    const scale = Math.sin(Date.now()*0.001) + 3;
	    this.mesh.scale.set(scale, scale, scale);
	}
}
