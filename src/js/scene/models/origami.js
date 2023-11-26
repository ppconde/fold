import * as THREE from 'three';
import txt from '../../../instructions/test-2.txt';
import {OrigamiSolver} from './origami-solver'

export class Origami {
	constructor(scene) {

		// Set the scene to fold paper sheet in.
		this.scene = scene;

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
		[this.meshes, this.mesh_instructions] = OrigamiSolver.solveOrigami(points, faces, pattern, face_order, fold_instructions, translation, rotation);

		


	}


	update = (time) => {
		// Rotate meshes according to mesh instructions
	}
}
