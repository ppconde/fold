import * as THREE from "three";

export class OrigamiModel {
	constructor(scene) {
		// Temporary geo and material
		this.geometry = new THREE.BoxBufferGeometry(2, 2, 2);
		this.material = new THREE.MeshStandardMaterial({ color: new THREE.Color("rgb(100,0,0)") });
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		scene.add(this.mesh);
	}

	update = () => {
		// Do something
		const scale = Math.sin(Date.now()*0.001) + 3;
		this.mesh.scale.set(scale, scale, scale);
	}
}
