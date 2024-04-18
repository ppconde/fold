import * as THREE from 'three';
import { FoldSolver } from './fold-solver'
import { IMeshInstruction, IParseTranslation, IParseRotation, IOrigamiCoordinates, IOrigamiMesh, IFaceRotationInstruction, IParsingInstruction } from './origami-types';
import { OrigamiGenerator } from './origami-coordinates-generator'


export class OrigamiSolver {

	public static solveOrigami(width: number, length: number, foldInstructions: string[]): [IOrigamiMesh[], IMeshInstruction[]] {
		// Set tolerance for math calculations
		const tolerance = width / 100;

		// Set origami coordinates
		let origamiCoordinates = OrigamiGenerator.generateOrigamiCoordinates(width, length, 8);

		// Set parsing instructions
		const parsingInstructions = this.setParsingInstructions();

		// Set rotation reports
		let faceRotationInstruction: IFaceRotationInstruction;
		const faceRotationInstructions = [];

		// Execute fold instructions
		for (const instruction of foldInstructions) {
			// Execute fold instruction
			[origamiCoordinates, faceRotationInstruction] = this.solveInstruction(origamiCoordinates, parsingInstructions, instruction);

			// Save instruction used to rotate points
			faceRotationInstructions.push(faceRotationInstruction);
		}
		// Create face meshes and rotation instructions
		const meshes = this.createFaceMeshes(origamiCoordinates);
		const meshInstructions = this.createMeshInstructions(meshes, faceRotationInstructions);
		return [meshes, meshInstructions];
	}

	public static setParsingInstructions(): IParsingInstruction {
		const parsingInstructions = {
			translation: { regex: /(\[(\w+),(\w+)\]) +to +(\[(\w+),(\w+)\]) +(\w+)|(\w+) +to +(\w+) +(\w+)|(\w+) +to +(\[(\w+),(\w+)\]) +(\w+)/, from: [2, 3, 8, 11], to: [5, 6, 9, 13, 14], sense: [7, 10, 15] },
			rotation: { regex: /(\[(\w+),(\w+)\]) +around +(\[(\w+),(\w+)\]) +(\w+) +(\d*)( +pin +(\w+))*|(\w+) +around +(\[(\w+),(\w+)\]) +(\w+) +(\d*)( +pin +(\w+))*/, from: [2, 3, 11], axis: [5, 6, 13, 14], sense: [7, 15], angle: [8, 16], pin: [10, 18] }
		};
		return parsingInstructions;
	}

	public static solveInstruction(origamiCoordinates: IOrigamiCoordinates, parsingInstructions: IParsingInstruction, instruction: string): [IOrigamiCoordinates, IFaceRotationInstruction] {
		// Set rotation report
		let faceRotationInstruction: IFaceRotationInstruction;

		// Unpack parsing instructions
		const translation = parsingInstructions.translation;
		const rotation = parsingInstructions.rotation;

		// Execute translation
		if (this.checkIfInstructionIs(instruction, translation)) {
			[origamiCoordinates, faceRotationInstruction] = FoldSolver.solveTranslation(origamiCoordinates, instruction, translation);

			// Execute rotation
		} else if (this.checkIfInstructionIs(instruction, rotation)) {
			[origamiCoordinates, faceRotationInstruction] = FoldSolver.solveRotation(origamiCoordinates, instruction, rotation);

			// In the case it's neither, throw an error
		} else {
			throw new Error('The instruction is neither a translation nor a rotation!');
		}
		return [origamiCoordinates, faceRotationInstruction];
	}

	public static checkIfInstructionIs(instruction: string, type: IParseTranslation | IParseRotation) {
		return instruction.match(type.regex) !== null;
	}

	// Use faces and pattern!:
	// public static createFaceMeshes(origamiCoordinates: IOrigamiCoordinates): IOrigamiMesh[] {
	// 	return [new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xFF0000 }))];
	// }

	public static createMeshInstructions(meshes: IOrigamiMesh[], rotationReports: IFaceRotationInstruction[]): IMeshInstruction[] {
		return [{ meshIds: [0], axis: ['e', 'f'], angle: 180 }];
	}

	public static createFaceMeshes(origamiCoordinates: IOrigamiCoordinates): IOrigamiMesh[] {
		const material = new THREE.MeshStandardMaterial({ color: 0xFF0000, side: THREE.DoubleSide });
		const facePoints = origamiCoordinates.faces.map(face => face.map(point => origamiCoordinates.pattern[point]));

		return facePoints.map(face => {
			/**
			* Shape geometry internally triangulates the face, you can check the second code example in this link
			* https://threejs.org/docs/#api/en/core/BufferGeometry
			* You store the vertices positions in the position array and then you have the index array
			* that tells you how to connect the vertices to form the triangulated faces
			 */
			const geometry = new THREE.ShapeGeometry(new THREE.Shape(face.map(([x, y]) => new THREE.Vector2(x, y))));
			geometry.computeVertexNormals();

			return new THREE.Mesh(geometry, material);
		});
	}
}
