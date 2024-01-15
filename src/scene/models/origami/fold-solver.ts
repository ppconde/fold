import { join } from 'path/posix';
import { MathHelpers } from './math-helpers';
import { IMeshInstruction, IParseTranslation, IParseRotation, TranslationKeys, IVertices, TranslationValues, IOrigamiCoordinates, IPlane } from './origami-types';


export class FoldSolver {

	public static solveTranslation(origamiCoordinates: IOrigamiCoordinates, instruction: string, translation: IParseTranslation, tolerance: number): [IOrigamiCoordinates, IMeshInstruction] {
		// Get 'from point', 'to point', and rotation sense
		const { from, to, sense } = this.getFromFoldInstruction(['from', 'to', 'sense'], translation, instruction);

		// Finds plane between from and to points
		const plane = this.findPlaneBetween(origamiCoordinates.points, from, to);

		// Intersects plane with origami, yielding intersection lines
		let intersection_lines = this.findIntersectionBetweenPlaneAndOrigami(origamiCoordinates, plane);

		// Set place-holder
		const meshInstruction = { meshIds: [0], axis: ['a', 'b'], angle: 90 };

		return [origamiCoordinates, meshInstruction];
	}

	public static solveRotation(origamiCoordinates: IOrigamiCoordinates, instruction: string, rotation: IParseRotation, tolerance: number): [IOrigamiCoordinates, IMeshInstruction] {
		// Set place-holder
		const meshInstruction = { meshIds: [0], axis: ['a', 'b'], angle: 90 };
		return [origamiCoordinates, meshInstruction];
	}

	// Extract values from instruction
	public static getFromFoldInstruction(
		array: TranslationKeys[],
		translation: IParseTranslation,
		instruction: string
	): TranslationValues {
		const match = instruction.match(translation.regex);

		return array.reduce((obj, transition) => {
			const valueForArray = translation[transition].reduce((acc, quantity) => {
				if (match?.[quantity]) {
					acc.push(match[quantity]);
				}
				return acc;
			}, [] as string[]);
			return { ...obj, [transition]: valueForArray };
		}, {} as TranslationValues);
	}


	public static findPlaneBetween(points: IVertices, from: string[], to: string[]): IPlane {
		let from_point;
		let to_point;

		/**
		 * @todo - not sure if typing is correct because of the following
		 * Type 'number[]' cannot be used as an index type.ts(2538)
		 */
		if (from.length == 1 && to.length == 1) {
			from_point = points[from[0]];
			to_point = points[to[0]];

		} else if (from.length == 1 && to.length == 2) {
			from_point = points[from[0]];
			const to_points = MathHelpers.indexArray(points, to);
			const to_versor = MathHelpers.findVersorBetweenPoints(to_points[0], to_points[1]);
			const from_norm = MathHelpers.findDistanceBetweenPoints(from_point, to_points[0]);
			to_point = MathHelpers.addVectorToPoint(to_points[0], MathHelpers.multiplyArray(to_versor, from_norm));

		} else if (from.length == 2 && to.length == 2) {
			from_point = points[from[0]];
			const to_points = MathHelpers.indexArray(points, to);
			to_point = MathHelpers.projectPointOntoLine(to_points[0], to_points[1], from_point);

		} else {
			throw new Error('The instruction is not valid. Try again!')
		}
		const plane_vector = MathHelpers.findVectorBetweenPoints(from_point, to_point);
		const plane_point = MathHelpers.addVectorToPoint(from_point, MathHelpers.multiplyArray(plane_vector, 0.5));
		const plane_versor = MathHelpers.findVectorVersor(plane_vector);
		const plane = { point: plane_point, versor: plane_versor };
		return plane;
	}

	public static findIntersectionBetweenPlaneAndOrigami(origamiCoordinates: IOrigamiCoordinates, plane: IPlane) {

		// Find intersection points
		let intersectionPoints = [];
		for (let i = 0; i < origamiCoordinates.faces.length; i++){
			const face = origamiCoordinates.faces[i];
			for (let j = 0; j < face.length; j++) {
				const edge = [face[j], face[(j + 1) % face.length]];
				const lineSegment = {startPoint: origamiCoordinates.points[edge[0]], endPoint: origamiCoordinates.points[edge[1]]};
				const [planeIntersectsLine, intersectionPoint] = MathHelpers.findIntersectionBetweenLineAndPlane(lineSegment, plane);
				if (planeIntersectsLine){
					intersectionPoints.push({face_id: i, edge: edge, coord: intersectionPoint});
				}
			}
		}

		// Find intersection lines
		





	}
};