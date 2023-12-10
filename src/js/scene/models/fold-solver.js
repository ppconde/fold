import { MathHelpers } from '../helpers/math-helpers'

export class FoldSolver {

	static solveTranslation(points, faces, pattern, planes, instruction, translation, tolerance) {
		// Get 'from point', 'to point', and rotation sense
		let { from, to, sense } = this.getFromFoldInstruction(['from', 'to', 'sense'], translation, instruction);

		// Finds plane between from and to points
		const plane = this.findPlaneBetween(points, from, to);

		// Intersects plane with origami, yielding intersection lines
		// let intersection_lines = MathHelpers.findIntersectionBetweenPlaneAndOrigami(points, faces, plane);

		return [0, 0, 0, 0, 0];
	}

	static solveRotation(points, faces, pattern, planes, instruction, rotation, tolerance) {
		return [0, 0, 0, 0, 0];
	}

    // Extract values from instruction
	static getFromFoldInstruction(array, translation, step) {
		const match = step.match(translation.regex);
		return array.reduce((obj, val) => {
			const valueForArray = translation[val].reduce((acc, element) => {
				if (match[element] !== undefined) {
					acc.push(match[element]);
				}
				return acc;
			}, []);
			return { ...obj, [val]: valueForArray };
		}, {});
	}

    static findPlaneBetween(points, from, to){
		let from_point;
		let to_point;

		if (from.length == 1 && to.length == 1){
			from_point = points[from];
			to_point = points[to];

		}else if(from.length == 1 && to.length == 2){
			from_point = points[from];
			const to_points = MathHelpers.indexArray(points, to);
			const to_versor = MathHelpers.findVersorBetweenPoints(to_points[0], to_points[1]);
			const from_norm = MathHelpers.findDistanceBetweenPoints(from_point,to_points[0]);
			to_point = MathHelpers.addVectorToPoint(to_points[0], MathHelpers.multiplyArray(to_versor,from_norm));

		}else if(from.length == 2 && to.length == 2){
			from_point = points[from[0]];
			const to_points = MathHelpers.indexArray(points, to);
			to_point = MathHelpers.projectPointOntoLine(to_points[0],to_points[1],from_point);

		}else{
			throw new Error('The instruction is not valid. Try again!')
		}

		const plane_vector = MathHelpers.findVectorBetweenPoints(from_point, to_point);
		const plane_point = MathHelpers.addVectorToPoint(from_point, MathHelpers.multiplyArray(plane_vector, 0.5));
		const plane_versor = MathHelpers.findVectorVersor(plane_vector);
		const plane = {plane_point, plane_versor};
		return plane;
	}
};