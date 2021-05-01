import * as THREE from 'three';
import fold from '../../../crease-patterns/rectangle.fold';
import { FoldToThreeConverter } from'../converters/fold-to-three-converter';
import img1 from '../../../../demos/guta/img/star.png';

export class Origami {
	constructor(scene) {
		// Temporary geo and material
		this.geometry = new FoldToThreeConverter(fold).geometry;
		// this.material = new THREE.MeshStandardMaterial({ color: new THREE.Color('rgb(100,0,0)') });
		const color = 0x8888FF;
		const loader = new THREE.TextureLoader();
		const texture = loader.load(img1);
		this.material = new THREE.MeshPhongMaterial({color, map: texture});
		//this.material = new THREE.MeshStandardMaterial({ color: new THREE.Color('rgb(100,0,0)') });
		this.material.side = THREE.DoubleSide;
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
		//console.log(new FoldToThreeConverter(fold));

	}

	update = () => {
		// Do something
		const scale = Math.sin(Date.now()*0.001) + 3;
		this.mesh.scale.set(scale, scale, scale);
	}
}
