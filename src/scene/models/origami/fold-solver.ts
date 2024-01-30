import { MathHelpers } from './math-helpers';
import { IMeshInstruction, IParseTranslation, IParseRotation, TranslationKeys, IVertices, TranslationValues, IOrigamiCoordinates, IPlane, IRotationReport } from './origami-types';


export class FoldSolver {

	public static solveTranslation(origamiCoordinates: IOrigamiCoordinates, instruction: string, translation: IParseTranslation, tolerance: number): [IOrigamiCoordinates, IRotationReport] {
		// Get 'from point', 'to point', and rotation sense
		const { from, to, sense } = this.getFromFoldInstruction(['from', 'to', 'sense'], translation, instruction);

		// Finds plane between from and to points
		const plane = this.findPlaneBetween(origamiCoordinates.points, from, to);

		// Intersects plane with origami, yielding intersection lines
		const intersectionLines = this.findIntersectionBetweenPlaneAndOrigami(origamiCoordinates, plane);

		// Selects intersection lines which will serve as rotation axis
		let axisLines = this.findAxisLines(from, to, origamiCoordinates, intersectionLines);

		// Adds crease points
		// [origamiCoordinates, axisLines] = this.creaseOrigami(origamiCoordinates, plane, axisLines);

		// Rotates points 
		// [origamiCoordinates, rotationReport] = this.rotateOrigami(origamiCoordinates, sense, plane, axisLines);

		// Set place-holder
		const rotationReport = { faces: [['a', 'e', 'b', 'd']], axis: ['a', 'b'], angle: 90 };

		return [origamiCoordinates, rotationReport];
	}

	public static solveRotation(origamiCoordinates: IOrigamiCoordinates, instruction: string, rotation: IParseRotation, tolerance: number): [IOrigamiCoordinates, IRotationReport] {
		// Set place-holder
		const meshInstruction = { faces: [['a', 'e', 'b', 'd']], axis: ['a', 'b'], angle: 90 };
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
			const to_points = MathHelpers.indexObject(points, to);
			const to_versor = MathHelpers.findVersorBetweenPoints(to_points[0], to_points[1]);
			const from_norm = MathHelpers.findDistanceBetweenPoints(from_point, to_points[0]);
			to_point = MathHelpers.addVectorToPoint(to_points[0], MathHelpers.multiplyArray(to_versor, from_norm));

		} else if (from.length == 2 && to.length == 2) {
			from_point = points[from[0]];
			const to_points = MathHelpers.indexObject(points, to);
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

	public static findIntersectionBetweenPlaneAndOrigami(origamiCoordinates: IOrigamiCoordinates, plane: IPlane): {edge: string[]; coord: number[]}[][] {
		// Find intersection between plane and the origami edges
		const edges = this.findEdgesFromFaces(origamiCoordinates.faces);
		let intersectionPoints =  [];
		const intersectedVertices: string[] = [];
		for (const edge of edges) {
			const lineSegment = { startPoint: origamiCoordinates.points[edge[0]], endPoint: origamiCoordinates.points[edge[1]] };
			const [planeIntersectsLine, intersectionPoint, intersectedVerticeIndex] = MathHelpers.findIntersectionBetweenLineAndPlane(lineSegment, plane);
			if (planeIntersectsLine) {
				// This garantees that if the intersection point is a vertice, it is only added once:
				if (intersectedVerticeIndex === -1) {
					intersectionPoints.push({ edge: edge, coord: intersectionPoint });
				} else if (!intersectedVertices.includes(edge[intersectedVerticeIndex])){
					intersectionPoints.push({ edge: edge, coord: intersectionPoint });
					intersectedVertices.push(edge[intersectedVerticeIndex])
				}
			}
		}

		// Pick first intersection point randomly, find direction of its intersection line, and sort all intersection points along that direction
		const firstIntersectionPoint = intersectionPoints[0];
		for (let i = 0; i < intersectionPoints.length; i++) {
			if (!MathHelpers.checkIfEdgesAreEqual(firstIntersectionPoint.edge, intersectionPoints[i].edge) && this.checkIfEdgesBelongToSameFace(origamiCoordinates.faces, [firstIntersectionPoint.edge, intersectionPoints[i].edge])) {
				const intersectionVersor = MathHelpers.findVersorBetweenPoints(firstIntersectionPoint.coord, intersectionPoints[i].coord);
				intersectionPoints.sort(function (p1, p2) { return MathHelpers.dot(p1.coord,intersectionVersor) - MathHelpers.dot(p2.coord,intersectionVersor)});
			}
		}
		
		// Find intersection lines
		const intersectionLines = [];
		let intersectionPointsFitToLine = new Array(intersectionPoints.length).fill(0);
		while (intersectionPointsFitToLine.some(e => e === 0)) {
			// Add first point to intersection line
			let intersectionPoint;
			let intersectionPointPosition;
			const intersectionLine = [];
			for (let i = 0; i < intersectionPoints.length; i++) {
				if (intersectionPointsFitToLine[i] === 0) {
					intersectionPoint = intersectionPoints[i];
					intersectionLine.push(intersectionPoint);
					intersectionPointsFitToLine[i] = 1;
					intersectionPointPosition = i;
					break;
				}
			}

			// intersectionPoint should be ALWAYS defined, but if I don't put this, 
			// ts bombards me with errors of: intersectionPoint is possibly undefined (when??).
			if (intersectionPoint === undefined || intersectionPointPosition === undefined) {
				throw new Error('The intersection point is magically undefined');
			}

			// Find intersection line versor
			let intersectionLineVersor;
			for (let i = 0; i < intersectionPoints.length; i++) {
				if (!MathHelpers.checkIfEdgesAreEqual(intersectionPoint.edge, intersectionPoints[i].edge) && this.checkIfEdgesBelongToSameFace(origamiCoordinates.faces, [intersectionPoint.edge, intersectionPoints[i].edge])) {
					intersectionLineVersor = MathHelpers.findVersorBetweenPoints(intersectionPoint.coord, intersectionPoints[i].coord);
					intersectionLineVersor = MathHelpers.multiplyArray(intersectionLineVersor, Math.sign(i - intersectionPointPosition));
					break;
				}
			}

			// Find the rest of the intersection line, in case there is a line versor (if not, then the line is the already added single point)
			const tolerance = 0.0001;
			let intersectionPointsVersor;
			if (intersectionLineVersor !== undefined) {
				for (let i = 0; i < intersectionPoints.length; i++) {
					intersectionPointsVersor = MathHelpers.findVersorBetweenPoints(intersectionPoint.coord, intersectionPoints[i].coord);
					intersectionPointsVersor = MathHelpers.multiplyArray(intersectionPointsVersor, Math.sign(i - intersectionPointPosition));
					if (this.checkIfEdgesBelongToSameFace(origamiCoordinates.faces, [intersectionPoints[i].edge, intersectionPoint.edge]) && MathHelpers.dot(intersectionLineVersor, intersectionPointsVersor) > 1 - tolerance) {
						if (i < intersectionPointPosition) {
							intersectionLine.unshift(intersectionPoints[i]);
						} else {
							intersectionLine.push(intersectionPoints[i]);
							intersectionPoint = intersectionPoints[i];
							intersectionPointPosition = i;
							intersectionPointsFitToLine[i] = 1;
						}
					}
				}
			}
			intersectionLines.push(intersectionLine);
		}
		return intersectionLines;
	}

	public static findEdgesFromFaces(faces: string[][]) {
		const edges = [];
		for (const face of faces) {
			for (let j = 0; j < face.length; j++) {
				const edge = [face[j], face[(j + 1) % face.length]];
				if (!MathHelpers.checkIfArrayContainsArray(edges, edge) && !MathHelpers.checkIfArrayContainsArray(edges, edge.reverse())) {
					edges.push(edge);
				}
			}
		}
		return edges;
	}

	public static findFacesfromEdges(faces: string[][], edges: string[][]): [string[][], number[]] {
		const foundFaces = [];
		const foundFaceIds = [];
		for (const edge of edges) {
			for (let i = 0; i < faces.length; i++) {
				const face = faces[i];
				for (let j = 0; j < face.length; j++) {
					const faceEdge = [face[j], face[(j + 1) % face.length]];
					if (MathHelpers.checkIfEdgesAreEqual(faceEdge, edge)) {
						foundFaces.push(face);
						foundFaceIds.push(i);
						break;
					}
				}
			}
		}
		return [foundFaces, foundFaceIds];
	}

	public static checkIfEdgesBelongToSameFace(faces: string[][], edges: string[][]): boolean {
		for (const face of faces) {
			if (this.checkIfFaceContainsEdges(face, edges)) {
				return true;
			}
		}
		return false;
	}

	public static checkIfFaceContainsEdges(face: string[], edges: string[][]) {
		const edgeMatches = new Array(edges.length).fill(0);
		for (let i = 0; i < edges.length; i++) {
			edgeMatches[i] = this.checkIfFaceContainsEdge(face, edges[i]);
		}
		return edgeMatches.every(e => e === true);
	}


	public static checkIfFaceContainsEdge(face: string[], edge: string[]) {
		for (let j = 0; j < face.length; j++) {
			const faceEdge = [face[j], face[(j + 1) % face.length]];
			if (MathHelpers.checkIfEdgesAreEqual(edge, faceEdge)) {
				return true;
			}
		}
		return false;
	}



	public static findAxisLines(from: string[], to: string[], origamiCoordinates: IOrigamiCoordinates, intersectionLines: {edge: string[]; coord: number[]}[][]) {

		const origamiGraph = this.convertOrigamiCoordinatesToGraph(origamiCoordinates);
		const shortestPath = this.findShortestPath(origamiGraph, from[0], to[0]);
		for (const intersectionLine of intersectionLines) {
			const intersectedEdge = this.findIntersectionBetweenPaths(shortestPath, intersectionLine);
		}

		// Find first intersected line
		shortestPath.indexOf(intersectedEdge[0]);
	}


	public static convertOrigamiCoordinatesToGraph(origamiCoordinates) {
		return origamiGraph;
	};



};