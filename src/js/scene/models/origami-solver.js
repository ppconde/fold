import { FoldSolver } from './fold-solver'

export class OrigamiSolver {

	static solveOrigami(points, faces, pattern, planes, fold_instructions, translation, rotation) {
		// Set tolerance for math calculations
		const width = pattern['b'][1];
		const tolerance = width / 100;

		// Create mesh instructions
		let mesh_instruction;
		let mesh_instructions = [];

		// Read fold instructions
		for (let i = 0; i < fold_instructions.length; i++) {
			const instruction = fold_instructions[i];

			// Execute translation
			if (this.isInstruction(instruction, translation)) {
				[points, faces, pattern, planes, mesh_instruction] = FoldSolver.solveTranslation(points, faces, pattern, planes, instruction, translation, tolerance)

			// Execute rotation
			} else if (this.isInstruction(instruction, rotation)) {
				[points, faces, pattern, planes, mesh_instruction] = FoldSolver.solveRotation(points, faces, pattern, planes, instruction, rotation, tolerance);
			}

			// Add mesh instruction
			mesh_instructions.push(mesh_instruction);
		}
		// Create face meshes
		const meshes = this.createFaceMeshes(faces, pattern);
		return [0, 0];
	}


    static isInstruction(instruction, type) {
		return instruction.match(type.regex) !== null;
	}


	static createFaceMeshes(faces, pattern) {
		return [0];
	}

}
