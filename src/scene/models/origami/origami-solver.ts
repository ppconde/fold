import * as THREE from 'three';
import { FoldSolver } from './fold-solver'
import { IMeshInstruction, IParseTranslation, IParseRotation, IVertices, IOrigamiCoordinates, IOrigamiMesh, IRotationReport} from './origami-types';


export class OrigamiSolver {

	public static solveOrigami(width: number, length: number, foldInstructions: string[]): [IOrigamiMesh[], IMeshInstruction[]] {
		// Set tolerance for math calculations
		const tolerance = width / 100;

		// Set origami coordinates
		let origamiCoordinates: IOrigamiCoordinates = {
			points: { 'a': [0, 0, 0], 'b': [1, 4, 0], 'c': [6.5, 11, 0], 'd': [0, width, 0], 'e': [6, 0, 0], 'f': [9, width, 0] },
			faces: [['a', 'e', 'f', 'd'], ['e', 'b', 'c', 'f']],
			pattern: { 'a': [0, 0], 'b': [length, 0], 'c': [length, width], 'd': [0, width], 'e': [6, 0], 'f': [9, width] },
			faceOrder: new Map()
		};
		origamiCoordinates.faces.forEach((_, i) => origamiCoordinates.faceOrder.set(i, i));  // Check if a MAP is the best type to represent the face order

		// Set parsing instructions
		const translation: IParseTranslation = { regex: /(\[(\w+),(\w+)\]) +to +(\[(\w+),(\w+)\]) +(\w+)|(\w+) +to +(\w+) +(\w+)|(\w+) +to +(\[(\w+),(\w+)\]) +(\w+)/, from: [2, 3, 8, 11], to: [5, 6, 9, 13, 14], sense: [7, 10, 15] };
		const rotation: IParseRotation = { regex: /(\[(\w+),(\w+)\]) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)|(\w+) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)/, from: [2, 3, 9], axis: [5, 6, 11, 12], sense: [7, 13], angle: [8, 14] };

		// Create mesh instructions
		let meshInstruction: IMeshInstruction;
		const mesh_instructions: IMeshInstruction[] = [];

		let rotationReport: IRotationReport;
		const rotationReports = [];

		// Read fold instructions
		for (let i = 0; i < foldInstructions.length; i++) {
			const instruction = foldInstructions[i];

			// Execute translation
			if (this.isInstruction(instruction, translation)) {
				[origamiCoordinates, rotationReport] = FoldSolver.solveTranslation(origamiCoordinates, instruction, translation, tolerance)

				// Execute rotation
			} else if (this.isInstruction(instruction, rotation)) {
				[origamiCoordinates, rotationReport] = FoldSolver.solveRotation(origamiCoordinates, instruction, rotation, tolerance);

				// In the case it's neither, thow an error
			} else {
				console.log(1);
				throw new Error('The instruction is neither a translation nor a rotation!');
			}

			// Add mesh instruction
			rotationReports.push(rotationReport);
		}
		// Create face meshes
		const meshes = this.createFaceMeshes(origamiCoordinates);
		const meshInstructions = this.createMeshInstructions(meshes, rotationReports);
		return [meshes, meshInstructions];
	}

	public static isInstruction(instruction: string, type: IParseTranslation | IParseRotation) {
		return instruction.match(type.regex) !== null;
	}

	// Use faces and pattern!:
	public static createFaceMeshes(origamiCoordinates: IOrigamiCoordinates): IOrigamiMesh[] {
		return [new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xFF0000 }))];
	}

}
