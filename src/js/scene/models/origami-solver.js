import { MathHelpers } from '../helpers/math-helpers'

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
				[points, faces, pattern, planes, mesh_instruction] = this.solveTranslation(points, faces, pattern, planes, instruction, translation, tolerance)

				// Execute rotation
			} else if (this.isInstruction(instruction, rotation)) {
				[points, faces, pattern, planes, mesh_instruction] = this.solveRotation(points, faces, pattern, planes, instruction, rotation, tolerance);
			}
			// Add mesh instruction
			mesh_instructions.push(mesh_instruction);
		}
		// Create face meshes
		const meshes = this.createFaceMeshes(faces, pattern);
		return [meshes, mesh_instructions];
	}


	static isInstruction(instruction, type) {
		return instruction.match(type.regex) !== null;
	}


	static solveTranslation(points, faces, pattern, planes, instruction, translation, tolerance) {
		// Get 'from point', 'to point', and rotation sense
		let { from, to, sense } = MathHelpers.getFromFoldInstruction(['from', 'to', 'sense'], translation, instruction);

		// TODO: Continue to code

		// Finds plane between from and to points
		// const plane = MathHelpers.findPlaneBetween(points, from, to);

		// Intersects plane with origami, yielding intersection lines
		// let intersection_lines = MathHelpers.findIntersectionBetweenPlaneAndOrigami(points, faces, plane);

	}


	static solveRotation(points, faces, pattern, planes, instruction, rotation, tolerance) {

	}


	static createFaceMeshes(faces, pattern) {

	}

}
