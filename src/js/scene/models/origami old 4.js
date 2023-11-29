import * as THREE from 'three';
import txt from '../../../instructions/test-2.txt';
import {OrigamiSolver} from './origami-solver'

THREE.Object3D.prototype.rotateAroundWorldAxis = function() {

    // rotate object around axis in world space (the axis passes through point)
    // axis is assumed to be normalized
    // assumes object does not have a rotated parent

    var q = new THREE.Quaternion();

    return function rotateAroundWorldAxis( point, axis, angle ) {

        q.setFromAxisAngle( axis, angle );

        this.applyQuaternion( q );

        this.position.sub( point );
        this.position.applyQuaternion( q );
        this.position.add( point );

        return this;

    }

}();

export class Origami {
	constructor(scene) {

		// Set the scene to fold paper sheet in.
		this.scene = scene;

		this.c = 0;
		this.last_time = 0;

		// Set initial paper sheet. This example simulates a paper sheet that has already been folded a couple of times (to test if the algorithm works in a more complicated sheet)
		const width = 9;
		const length = 12.5;
		let points = {'a':[0,0,0], 'b': [1,4,0], 'c':[6.5,11,0], 'd':[0,width,0], 'e':[6,0,0], 'f':[9,width,0]};
		let pattern = {'a':[0,0], 'b': [length,0], 'c':[length,width], 'd':[0,width], 'e':[6,0], 'f':[9,width]};
		let faces = [['a','e','f','d'], ['e','b','c','f']];
		let face_order = new Map();  // This is a graph connecting the faces that overlap
		faces.forEach((_, i) => face_order.set(i));

		// Set parsing instructions
		const translation = {'regex': /(\[(\w+),(\w+)\]) +to +(\[(\w+),(\w+)\]) +(\w+)|(\w+) +to +(\w+) +(\w+)/, 'from': [2,3,8], 'to': [5,6,9], 'sense':[7,10]};
		const rotation = {'regex': /(\[(\w+),(\w+)\]) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)|(\w+) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)/,'from': [2,3,9], 'axis':[5,6,11,12], 'sense': [7,13], 'angle':[8,14]};

		// Get fold instructions
		const fold_instructions = txt.split('\n');

		// Convert paper coordinates and fold instructions to paper meshes and mesh instructions
		// [this.meshes, this.mesh_instructions] = OrigamiSolver.solveOrigami(points, faces, pattern, face_order, fold_instructions, translation, rotation);


		const generateGeometry = (pts) => {
			const arr = new Float32Array(pts.length * 3);
			for (let i = 0; i < pts.length; i++) {
				const i3 = i * 3;
				arr[i3] = pts[i][0];
				arr[i3 + 1] = pts[i][1];
				arr[i3 + 2] = pts[i][2];
			}

			console.log(arr);
			return arr;
		}

		const geometry1 = new THREE.BufferGeometry();
		const geometry2 = new THREE.BufferGeometry();
		const geometry3 = new THREE.BufferGeometry();

		this.pts = {
			a: [0, 0, 0],
			b: [0, width, 0],
			c: [length / 2, width / 2, 0],
			d: [length, width, 0],
			e: [length, 0, 0]
		};

		geometry1.setAttribute(
			'position',
			new THREE.BufferAttribute(
				generateGeometry([this.pts.a, this.pts.b, this.pts.c]),
				3,
			),
		);

		geometry2.setAttribute(
			'position',
			new THREE.BufferAttribute(
				generateGeometry([this.pts.c, this.pts.d, this.pts.b]),
				3,
			),
		);

		geometry3.setAttribute(
			'position',
			new THREE.BufferAttribute(
				generateGeometry([this.pts.a, this.pts.e, this.pts.d]),
				3,
			),
		);

		const material1 = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
		const material2 = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
		const material3 = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide });

		const mesh1 = new THREE.Mesh(geometry1, material1);
		const mesh2 = new THREE.Mesh(geometry2, material2);
		const mesh3 = new THREE.Mesh(geometry3, material3);
		this.meshes = [mesh1, mesh2, mesh3];
		this.scene.add(...this.meshes);

		this.mesh_instructions = [
			{ meshIds: [0, 1], axis: ['a', 'd'], angle: 180 },
		];
	}

	renderOrigami = (time, currentFrame) => {
		// this.scene.clear();

		if (currentFrame > 0) {
			const group = new THREE.Group();
			// const instruction = this.mesh_instructions[currentFrame - 1];
			const instruction = this.mesh_instructions[0];
			const meshes = instruction.meshIds.map((i) => this.meshes[i])

			group.add(...meshes)
			this.scene.add(group);

			// const vecA = this.pts[instruction.axis[0]];
			// const vecB = this.pts[instruction.axis[1]];
			const vecA = this.pts['a'];
			const vecB = this.pts['d'];
			const vec = new THREE.Vector3();

			vec.copy(vecA).sub(vecB).normalize();
			group.rotateAroundWorldAxis(vec, 45 / 180 * Math.PI);
		}

		this.previousTime = time;
		this.setFrame(currentFrame + 1);
	}


	rotateAroundAxis = () => {

		if ( !mesh ) return
	  
	  const vecA = points[0];
	  const vecB = points[1];
	  const vec = new THREE.Vector3();
	
	  vec.copy( vecA ).sub( vecB ).normalize();
	  
	  this.group.rotateAroundWorldAxis( vecA, vec, 45 / 180 * Math.PI);

	  
	
	}

	static rotate(instruction, type){


		return instruction.match(type.regex) !== null;
	}

	update = (time) => {

		const mesh_instruction = this.mesh_instructions[0];

		const delta_time = time - this.last_time;

        if (delta_time >= 2000 && this.c < this.mesh_instructions.length){
            this.scene.clear();

			this.group = new THREE.Group();

			for (let i = 0; i < mesh_instruction.meshIds.length; i++){ 
				this.group.add(this.meshes[mesh_instruction.meshIds[i]]);
			}

			rotateAroundAxis();



			group.rotateAroundAxis(vec, 45 / 180 * Math.PI);
			this.scene.add(group);



            this.last_time = time;
            this.c++;
        }

	}
}
