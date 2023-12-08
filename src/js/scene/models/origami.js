import * as THREE from 'three';
import fold from '../../../crease-patterns/rectangle.fold';
import { FoldToThreeConverter } from '../converters/fold-to-three-converter';
import txt from '../../../instructions/test-1.txt';
import { OrigamiSolver } from './origami-solver'
import { OrigamiExamples } from './origami-examples'
import { BaseModel } from './base-model';
import { OrigamiController } from '../controllers/origami-controller';

export class Origami extends BaseModel {

	constructor(scene) {
		super();
		// Sets Origami Controller
		this.controller = new OrigamiController(this);
		// Temporary geo and material
		this.foldInfo = new FoldToThreeConverter(fold);
		this.crease = this.foldInfo.crease;
		this.trianglesIndexes = this.foldInfo.trianglesIndexes;
		// eslint-disable-next-line camelcase
		this.vertices_coords = this.foldInfo.fold.vertices_coords;

		// Set the scene to fold paper sheet in.
		this.scene = scene;

		// Set initial paper sheet. This example simulates a paper sheet that has already been folded a couple of times (to test if the algorithm works in a more complicated sheet)
		const width = 9;
		const length = 12.5;
		let points = { 'a': [0, 0, 0], 'b': [1, 4, 0], 'c': [6.5, 11, 0], 'd': [0, width, 0], 'e': [6, 0, 0], 'f': [9, width, 0] };
		let pattern = { 'a': [0, 0], 'b': [length, 0], 'c': [length, width], 'd': [0, width], 'e': [6, 0], 'f': [9, width] };
		let faces = [['a', 'e', 'f', 'd'], ['e', 'b', 'c', 'f']];
		let face_order = new Map();  // This is a graph connecting the faces that overlap
		faces.forEach((_, i) => face_order.set(i));

		// Set parsing instructions
		const translation = { 'regex': /(\[(\w+),(\w+)\]) +to +(\[(\w+),(\w+)\]) +(\w+)|(\w+) +to +(\w+) +(\w+)/, 'from': [2, 3, 8], 'to': [5, 6, 9], 'sense': [7, 10] };
		const rotation = { 'regex': /(\[(\w+),(\w+)\]) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)|(\w+) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)/, 'from': [2, 3, 9], 'axis': [5, 6, 11, 12], 'sense': [7, 13], 'angle': [8, 14] };

		// Get fold instructions
		const fold_instructions = txt.split('\n');

		// Convert paper coordinates and fold instructions to paper meshes and mesh instructions
		[this.meshes, this.mesh_instructions] = OrigamiSolver.solveOrigami(points, faces, pattern, face_order, fold_instructions, translation, rotation);
		[this.points, this.meshes, this.mesh_instructions] = OrigamiExamples.example1();

		// Set animation parameters
		this.w = Math.PI/2;  // Angular velocity
		this.then = 0;
		this.angle_rotated = 0;
		this.instruction_id = 0;
		this.scene.add(...this.meshes);
	}

	update = (time) => {
		if (time && (this.instruction_id < this.mesh_instructions.length)){
 			const now = time * 0.001;
			const time_passed = now - this.then;
			let angle_to_rotate = this.w * time_passed;
			
			if (this.angle_rotated + angle_to_rotate < this.mesh_instructions[this.instruction_id].angle){
				this.rotate(angle_to_rotate);
				this.angle_rotated = this.angle_rotated + angle_to_rotate;

			}else{
				angle_to_rotate = this.mesh_instructions[this.instruction_id].angle - this.angle_rotated;
				this.rotate(angle_to_rotate);
				this.instruction_id += 1;
				this.angle_rotated = 0;
			}
			this.then = now;
		}
	}

	rotate = (angle) => {
		const vecA = new THREE.Vector3(...this.points[this.mesh_instructions[this.instruction_id].axis[0]]);
		const vecB = new THREE.Vector3(...this.points[this.mesh_instructions[this.instruction_id].axis[1]]);
		const vec = new THREE.Vector3();
		vec.copy(vecA).sub(vecB).normalize();
		for (let i of this.mesh_instructions[this.instruction_id].meshIds){
			this.meshes[i].position.sub(vecA);
			this.meshes[i].rotateOnWorldAxis(vec, angle);
			this.meshes[i].position.add(vecA);
		}
	}
}
