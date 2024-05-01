import * as THREE from 'three';
import { FoldSolver } from './fold-solver'
import { IMeshInstruction, IParseTranslation, IParseRotation, IOrigamiCoordinates, IOrigamiMesh, IFaceRotationInstruction, IParsingInstruction, IFaceGraph } from './origami-types';
import { OrigamiGenerator } from './origami-coordinates-generator'


export class OrigamiSolver {

	public static solveOrigami(foldInstructions: string[]): [IOrigamiMesh[], IMeshInstruction[]] {

		// Set parsing instructions
		const parsingInstructions = this.setParsingInstructions();

		// Parse paper dimensions
		const paperDimensionsInstruction = foldInstructions.shift() as string;
		const [xDim, yDim] = this.parsePaperDimensions(paperDimensionsInstruction, parsingInstructions);

		// Set origami coordinates
		let origamiCoordinates = OrigamiGenerator.generateOrigamiCoordinates(xDim, yDim, 0);  // 8

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

		// Unfold origami into original state
		origamiCoordinates = this.unfoldOrigami(origamiCoordinates);

		// Create face meshes and rotation instructions
		const meshes = this.createFaceMeshes(origamiCoordinates);
		const meshInstructions = this.createMeshInstructions(meshes, faceRotationInstructions);
		return [meshes, meshInstructions];
	}

	public static setParsingInstructions(): IParsingInstruction {
		const parsingInstructions = {
			paperDimensions: { regex: /paper dimensions: \[(.+?)\]/, dimensions: 1 },
			translation: { regex: /fold \[(.+?)\] to (top|bottom) of \[(.+?)\]( carry \[(.+?)\])?( pin \[(.+?)\])?/, from: 1, sense: 2, to: 3, carry: 5, pin: 7 },
			rotation: { regex: /fold \[(.+?)\] around \[(.+?)\]( (\d+))?( carry \[(.+?)\])?( pin \[(.+?)\])?/, from: 1, axis: 2, angle: 4, carry: 6, pin: 8 },
		};
		return parsingInstructions;
	}

	public static parsePaperDimensions(paperDimensionsInstruction: string, parsingInstructions: IParsingInstruction): [number, number] {

		// Parse dimensions
		const parseInstruction = parsingInstructions.paperDimensions;
		const match = FoldSolver.parseInstruction(paperDimensionsInstruction, parseInstruction.regex);
		const capturedString = match[parseInstruction.dimensions];
		const dimensions = FoldSolver.parseMandatoryNumberArray(capturedString);

		// Find dimensions ratio
		let ratio;
		if (dimensions.length === 1) {
			ratio = dimensions[0];
		}
		else if (dimensions.length === 2) {
			ratio = dimensions[0] / dimensions[1];
		} else {
			throw new Error('Paper dimensions were not specified correctly. They should be either a X/Y ratio (one value), or the X and Y dimensions (two values).')
		}

		// Make paper dimensions (1) have specified ration; (2) make specified constant area
		const paperArea = 60;
		const xDim = Math.sqrt(paperArea * ratio);
		const yDim = Math.sqrt(paperArea / ratio);

		return [xDim, yDim];
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

	public static unfoldOrigami(origamiCoordinates: IOrigamiCoordinates) {
		// Update point coordinates
		const nodes = Object.keys(origamiCoordinates.points);
		const xi = 0;
		const yi = 1;
		const zi = 2;
		for (const node of nodes) {
			origamiCoordinates.points[node][xi] = origamiCoordinates.pattern[node][xi];
			origamiCoordinates.points[node][yi] = origamiCoordinates.pattern[node][yi];
			origamiCoordinates.points[node][zi] = 0;
		}
		// Update face order
		const faces = origamiCoordinates.faces;
		for (let i = 0; i < faces.length; i++) {
			origamiCoordinates.faceOrder[i] = {};
		}
		return origamiCoordinates;
	}

	// Use faces and pattern!:
	// public static createFaceMeshes(origamiCoordinates: IOrigamiCoordinates): IOrigamiMesh[] {
	// 	return [new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xFF0000 }))];
	// }

	public static createFaceMeshes(origamiCoordinates: IOrigamiCoordinates): IOrigamiMesh[] {
		const material = new THREE.MeshStandardMaterial({ color: 0xFF0000, side: THREE.DoubleSide });
		const coords = origamiCoordinates.faces.map((face) => {
			return face.reduce((acc, key) => {
				acc.facePointsCoords.push(origamiCoordinates.points[key]);
				acc.facePatternCoords.push(origamiCoordinates.pattern[key]);
				return acc;
			}, { facePointsCoords: [] as number[][], facePatternCoords: [] as number[][] })
		});


		/**
		 * Hi guys, so I have a question. I have these points and pattern, the points are the coordinates of the face
		 * and the pattern is the coordinates of the face in the unfolded paper. I want to create a mesh from these
		 * coordinates, but I'm not sure how to do it. I tried to use ShapeGeometry, but it didn't work. I'm not sure
		 * if I'm doing something wrong or if I should use another approach. I would appreciate any help. Thanks!
		 * I think I might need to convert the points to a 2D plane and then use ShapeGeometry, but I'm not sure how to
		 */
		return coords.map((coord) => {
			const { facePointsCoords, facePatternCoords } = coord;
			/**
			* Shape geometry internally triangulates the face, you can check the second code example in this link
			* https://threejs.org/docs/#api/en/core/BufferGeometry
			* You store the vertices positions in the position array and then you have the index array
			* that tells you how to connect the vertices to form the triangulated faces
			 */
			const pointsVec3 = facePointsCoords.map(([x, y, z]) => new THREE.Vector3(x, y, z));
			const pointsVec2 = facePatternCoords.map(([x, y]) => new THREE.Vector2(x, y));

			// Create custom geometry from points
			const customGeometry = new THREE.BufferGeometry();
			customGeometry.setAttribute(
				'position',
				new THREE.BufferAttribute(new Float32Array(facePointsCoords.flat()), 3)
			);
			customGeometry.computeVertexNormals();


			const shape = new THREE.Shape(pointsVec2);

			/**
			 * @todo - geometry can't triangulate and because of that we don't see a mesh right now
			 * if we use pattern we can triangulate the face and create a mesh, but then I need to change the face
			 * position to match the points coordinates
			 */
			const geometry = new THREE.ShapeGeometry(shape);
			const newPositions = new Float32Array(face.flat());
			// newPositions.set(face.flat());
			const position = new THREE.BufferAttribute(newPositions, 3);
			// geometry.setAttribute('position', position);
			// position.needsUpdate = true;
			geometry.computeVertexNormals();
			const mesh = new THREE.Mesh(geometry, material);
			return mesh;
		});
	}

	public static createMeshInstructions(meshes: IOrigamiMesh[], rotationReports: IFaceRotationInstruction[]): IMeshInstruction[] {
		return [{ meshIds: [0], axis: ['e', 'f'], angle: 180 }];
	}
}
