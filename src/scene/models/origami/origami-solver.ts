import * as THREE from 'three';
import { FoldSolver } from './fold-solver'
import { IMeshInstruction, IParseTranslation, IParseRotation, IVertices, IOrigamiCoordinates, IOrigamiMesh} from './origami-types';


export class OrigamiSolver {

	public static solveOrigami(width: number, length: number, foldInstructions: string[]): [IOrigamiMesh[], IMeshInstruction[]] {
		// Set tolerance for math calculations
		const tolerance = width / 100;

		// Set origami coordinates
		let origamiCoordinates: IOrigamiCoordinates = {
			points: { 'a': [0, 0, 0], 'b': [length, 0, 0], 'c': [length, width, 0], 'd': [0, width, 0] },
			faces: [['a', 'b', 'c', 'd']],
			pattern: { 'a': [0, 0], 'b': [length, 0], 'c': [length, width], 'd': [0, width] },
			faceOrder: new Map()
		};
		origamiCoordinates.faces.forEach((_, i) => origamiCoordinates.faceOrder.set(i, i));  // Check if a MAP is the best type to represent the face order

		// Set parsing instructions
		const translation: IParseTranslation = { regex: /(\[(\w+),(\w+)\]) +to +(\[(\w+),(\w+)\]) +(\w+)|(\w+) +to +(\w+) +(\w+)|(\w+) +to +(\[(\w+),(\w+)\]) +(\w+)/, from: [2, 3, 8, 11], to: [5, 6, 9, 13, 14], sense: [7, 10, 15] };
		const rotation: IParseRotation = { regex: /(\[(\w+),(\w+)\]) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)|(\w+) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)/, from: [2, 3, 9], axis: [5, 6, 11, 12], sense: [7, 13], angle: [8, 14] };

		// Create mesh instructions
		let meshInstruction: IMeshInstruction;
		const mesh_instructions: IMeshInstruction[] = [];

		// Read fold instructions
		for (let i = 0; i < foldInstructions.length; i++) {
			const instruction = foldInstructions[i];

			// Execute translation
			if (this.isInstruction(instruction, translation)) {
				[origamiCoordinates, meshInstruction] = FoldSolver.solveTranslation(origamiCoordinates, instruction, translation, tolerance)

				// Execute rotation
			} else if (this.isInstruction(instruction, rotation)) {
				[origamiCoordinates, meshInstruction] = FoldSolver.solveRotation(origamiCoordinates, instruction, rotation, tolerance);

				// In the case it's neither, thow an error
			} else {
				throw new Error('The instruction is neither a translation nor a rotation!');
			}

			// Add mesh instruction
			mesh_instructions.push(meshInstruction);
		}
		// Create face meshes
		const meshes = this.createFaceMeshes(origamiCoordinates.faces, origamiCoordinates.pattern);
		return [meshes, mesh_instructions];
	}

	public static isInstruction(instruction: string, type: IParseTranslation | IParseRotation) {
		return instruction.match(type.regex) !== null;
	}

	public static createFaceMeshes(faces: string[][], pattern: IVertices): IOrigamiMesh[] {
		return [new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xFF0000 }))];
	}

}
