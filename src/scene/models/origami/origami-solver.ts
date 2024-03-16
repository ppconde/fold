import * as THREE from 'three';
import { FoldSolver } from './fold-solver'
import { IMeshInstruction, IParseTranslation, IParseRotation, IVertices, IOrigamiCoordinates, IOrigamiMesh, IFaceRotationInstruction, IParsingInstruction} from './origami-types';


export class OrigamiSolver {

	public static solveOrigami(width: number, length: number, foldInstructions: string[]): [IOrigamiMesh[], IMeshInstruction[]] {
		// Set tolerance for math calculations
		const tolerance = width / 100;

		// Set origami coordinates
		let origamiCoordinates = this.generateOrigamiCoordinates(width, length);

		// Set parsing instructions
		const parsingInstructions = this.setParsingInstructions();

		// Set rotation reports
		let faceRotationInstruction: IFaceRotationInstruction;
		const faceRotationInstructions = [];

		// Execute fold instructions
		for (const instruction of foldInstructions) {
			// Execute fold instruction
			[origamiCoordinates, faceRotationInstruction] = this.solveInstruction(origamiCoordinates, parsingInstructions, instruction, tolerance);

			// Save instruction used to rotate points
			faceRotationInstructions.push(faceRotationInstruction);
		}
		// Create face meshes and rotation instructions
		const meshes = this.createFaceMeshes(origamiCoordinates);
		const meshInstructions = this.createMeshInstructions(meshes, faceRotationInstructions);
		return [meshes, meshInstructions];
	}

	// test-1.text
	// public static generateOrigamiCoordinates(width: number, length: number): IOrigamiCoordinates{
	// 	let origamiCoordinates: IOrigamiCoordinates = {
	// 		points: { 'a': [0, 0, 0], 'b': [1, 4, 0], 'c': [6.5, 11, 0], 'd': [0, width, 0], 'e': [6, 0, 0], 'f': [9, width, 0] },
	// 		faces: [['a', 'e', 'f', 'd'], ['e', 'b', 'c', 'f']],
	// 		pattern: { 'a': [0, 0], 'b': [length, 0], 'c': [length, width], 'd': [0, width], 'e': [6, 0], 'f': [9, width] },
	// 		faceOrder: {0: {1: 1},  1: {0: 1}},
	// 	};
	// 	return origamiCoordinates;
	// }

	// // test-2.text
	// public static generateOrigamiCoordinates(width: number, length: number): IOrigamiCoordinates{
	// 	let origamiCoordinates: IOrigamiCoordinates = {
	// 		points: {'a':[0,0,0],'b': [length,0,0],'c':[length,width,0],'d':[0,width,0],'e':[0,width*2/5,0], 'f':[length*5/10,0,0],'g':[length*5/10,width*1/5,0],'h':[length*8/10,width*1/5,0],'i':[length*8/10,width*4/5,0], 'j':[length*5/10,width*4/5,0],'k':[length*5/10,width*3/5,0],'l':[length*7/10,width*3/5,0],'m':[length*7/10,width*2/5,0]},
	// 		faces: [['a','f','g','h','i','j','k','l','m','e'], ['f','b','c','d','e','m','l','k','j','i','h','g']],
	// 		pattern: {'a':[0,0],'b': [length,0],'c':[length,width],'d':[0,width],'e':[0,width*2/5], 'f':[length*5/10,0],'g':[length*5/10,width*1/5],'h':[length*8/10,width*1/5],'i':[length*8/10,width*4/5], 'j':[length*5/10,width*4/5],'k':[length*5/10,width*3/5],'l':[length*7/10,width*3/5],'m':[length*7/10,width*2/5]},
	// 		faceOrder: {0: {},  1: {}},
	// 	};
	// 	return origamiCoordinates;
	// }

	// test-3.text
	// public static generateOrigamiCoordinates(width: number, length: number): IOrigamiCoordinates{
	// 	let origamiCoordinates: IOrigamiCoordinates = {
	// 		points: {'a':[0,0,0],'b': [length,0,0],'c':[length,width,0],'d':[0,width,0],'e':[length/2,0,0], 'f':[length/2,width,0]},
	// 		faces: [['a','e','f','d'], ['e','b','c','f']],
	// 		pattern: {'a':[0,0],'b': [length,0],'c':[length,width],'d':[0,width],'e':[length/2,0], 'f':[length/2,width]},
	// 		faceOrder: {0: {},  1: {}},
	// 	};
	// 	return origamiCoordinates;
	// }

	// test-1.text
	// public static generateOrigamiCoordinates(width: number, length: number): IOrigamiCoordinates{
	// 	let origamiCoordinates: IOrigamiCoordinates = {
	// 		points: { 'a': [0,0,0],'b':[-2,5,0],'c':[3,10,0],'d':[0,9,0],'e':[6,0,0],'f':[9,9,0],'g':[2,0,0],'h':[9,-2,0],'i':[7,-1,0],'j':[6,4,0],'k':[2,9,0],'l':[-2,10,0],'m':[-3,11,0],'n':[-1,5,0]},
	// 		faces: [['a','g','e','f','d'],['e','b','k','c','f'],['a','h','i','g'],['h','j','i'],['k','l','m','c'],['l','n','m']],
	// 		pattern: { 'a': [0,0],'b':[15.4,-0.8],'c':[14.4,6.2],'d':[0,9],'e':[6,0],'f':[9,9],'g':[2,0],'h':[9,-2],'i':[7,-1],'j':[6,4],'k':[14.6,4.8],'l':[18.4,3.2],'m':[19.8,4],'n':[14.6,-0.2]},  // Not accurate
	// 		faceOrder: {0: {1: 1},  1: {0: 1, 3:-1, 5:-1}, 2:{}, 3:{1:-1}, 4:{}, 5:{1:1}},
	// 	};
	// 	return origamiCoordinates;
	// }

	public static generateOrigamiCoordinates(width: number, length: number): IOrigamiCoordinates{
		let origamiCoordinates: IOrigamiCoordinates = {
			points: { 'a': [0,0,0],'b':[-2,5,0],'c':[3,10,0],'d':[0,9,0],'e':[6,0,0],'f':[9,9,0],'g':[2,0,0],'h':[9,-2,0],'i':[7,-1,0],'j':[9,0,0],'k':[2,9,0],'l':[-2,10,0],'m':[-3,11,0],'n':[-1,5,0]},
			faces: [['a','g','e','f','d'],['e','b','k','c','f'],['a','h','i','g'],['h','j','i'],['k','l','m','c'],['l','n','m']],
			pattern: { 'a': [0,0],'b':[15.4,-0.8],'c':[14.4,6.2],'d':[0,9],'e':[6,0],'f':[9,9],'g':[2,0],'h':[9,-2],'i':[7,-1],'j':[9,0],'k':[14.6,4.8],'l':[18.4,3.2],'m':[19.8,4],'n':[14.6,-0.2]},  // Not accurate
			faceOrder: {0: {1: 1},  1: {0: 1, 3:-1, 5:-1}, 2:{}, 3:{1:-1}, 4:{}, 5:{1:1}},
		};
		return origamiCoordinates;
	}

	public static setParsingInstructions(): IParsingInstruction{
		const parsingInstructions = {
			translation: { regex: /(\[(\w+),(\w+)\]) +to +(\[(\w+),(\w+)\]) +(\w+)|(\w+) +to +(\w+) +(\w+)|(\w+) +to +(\[(\w+),(\w+)\]) +(\w+)/, from: [2, 3, 8, 11], to: [5, 6, 9, 13, 14], sense: [7, 10, 15] },
			rotation: { regex: /(\[(\w+),(\w+)\]) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)|(\w+) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)/, from: [2, 3, 9], axis: [5, 6, 11, 12], sense: [7, 13], angle: [8, 14] }
		};
		return parsingInstructions;
	}

	public static solveInstruction(origamiCoordinates: IOrigamiCoordinates, parsingInstructions: IParsingInstruction, instruction: string, tolerance: number): [IOrigamiCoordinates, IFaceRotationInstruction]{
		// Set rotation report
		let rotationReport: IFaceRotationInstruction;

		// Unpack parsing instructions
		const translation = parsingInstructions.translation;
		const rotation = parsingInstructions.rotation;

		// Execute translation
		if (this.isInstruction(instruction, translation)) {
			[origamiCoordinates, rotationReport] = FoldSolver.solveTranslation(origamiCoordinates, instruction, translation, tolerance)

		// Execute rotation
		} else if (this.isInstruction(instruction, rotation)) {
			[origamiCoordinates, rotationReport] = FoldSolver.solveRotation(origamiCoordinates, instruction, rotation, tolerance);

		// In the case it's neither, thow an error
		} else {
			throw new Error('The instruction is neither a translation nor a rotation!');
		}
		return [origamiCoordinates, rotationReport];
	}

	public static isInstruction(instruction: string, type: IParseTranslation | IParseRotation) {
		return instruction.match(type.regex) !== null;
	}

	// Use faces and pattern!:
	public static createFaceMeshes(origamiCoordinates: IOrigamiCoordinates): IOrigamiMesh[] {
		return [new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xFF0000 }))];
	}

	public static createMeshInstructions(meshes: IOrigamiMesh[], rotationReports: IFaceRotationInstruction[]): IMeshInstruction[]{
		return [{meshIds: [0], axis: ['e', 'f'], angle: 180}];
	}

}
