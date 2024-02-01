import { MathHelpers } from './math-helpers';
import { IMeshInstruction, IParseTranslation, IParseRotation, TranslationKeys, IVertices, TranslationValues, IOrigamiCoordinates, IPlane, IRotationReport, IOrigamiGraph, IintersectionLine} from './origami-types';


export class FoldSolver {

	public static solveTranslation(origamiCoordinates: IOrigamiCoordinates, instruction: string, translation: IParseTranslation, tolerance: number): [IOrigamiCoordinates, IRotationReport] {
		// Get 'from point', 'to point', and rotation sense
		const { from, to, sense } = this.getFromFoldInstruction(['from', 'to', 'sense'], translation, instruction);

		// Finds plane between from and to points
		const plane = this.findPlaneBetween(origamiCoordinates.points, from, to);

		// Intersects plane with origami, yielding intersection lines
		const intersectionLines = this.findIntersectionBetweenPlaneAndOrigami(origamiCoordinates, plane);

		// Selects intersection lines which will serve as rotation axis
		let axisLines = this.findAxisLines(from, to, sense, origamiCoordinates, intersectionLines);

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
			const [planeIntersectsLine, intersectionCoord, intersectedVerticeIndex] = MathHelpers.findIntersectionBetweenLineAndPlane(lineSegment, plane);
			if (planeIntersectsLine) {
				// This garantees that if the intersection point is a vertice, it is only added once:
				if (intersectedVerticeIndex === -1) {
					intersectionPoints.push({ edge: edge, coord: intersectionCoord });
				} else if (!intersectedVertices.includes(edge[intersectedVerticeIndex])){
					intersectionPoints.push({ edge: edge, coord: intersectionCoord });
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
			const intersectionLine: IintersectionLine = [];
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

	public static findAxisLines(from: string[], to: string[], sense: 'V'|'M', origamiCoordinates: IOrigamiCoordinates, intersectionLines: IintersectionLine[]) {
		const origamiGraph = this.convertOrigamiCoordinatesToGraph(origamiCoordinates);
		const shortestPath = this.findShortestPath(origamiGraph, from[0], to[0]);
		const firstIntersectedLine = this.findFirstIntersectionLine(shortestPath, intersectionLines)
		const coincidentLines = this.selectCoincidentLines(intersectionLines, firstIntersectedLine);
		// const sortedLines = this.sortIntersectionLines(origamiCoordinates, coincidentLines, sense);  // This is to find the lowest one and select that and the above. This makes rotating faces below the from point possible, but it might be undesirable in some cases. Introduce pin concept to solve them?
		// const axisLines = this.selectAxisLines();  
		// return axisLines;
		return 0;
	}

	public static findFirstIntersectionLine(shortestPath: string[], intersectionLines: IintersectionLine[]) {
		for (let i = 0; i < shortestPath.length; i++) {
			const shortestPathEdge = [shortestPath[i], shortestPath[(i + 1) % shortestPath.length]];
			for (const intersectionLine of intersectionLines) {
				for (const intersectionPoint of intersectionLine) {
					if (MathHelpers.checkIfArrayContainsElements(shortestPathEdge, intersectionPoint.edge)){
						return intersectionLine;
					}
				}
			}
		}
		throw new Error('Could not find first intersected line! Check why');
	}

	public static convertOrigamiCoordinatesToGraph(origamiCoordinates: IOrigamiCoordinates): IOrigamiGraph {
		const points = origamiCoordinates.points;
		const faces = origamiCoordinates.faces;
		let origamiGraph: IOrigamiGraph = {};
		for (let i = 0; i < faces.length; i++) {
			const face = faces[i];
			for (let j = 0; j < face.length; j++) {
				const letter = face[j];
				if (!origamiGraph.hasOwnProperty(letter)){
					origamiGraph[letter] = {};
				}
				const faceNeighborSteps = [+1, +face.length - 1];
				for (const faceNeighborStep of faceNeighborSteps){
					const faceNeighborLetter = face[(j + faceNeighborStep) % face.length];
					if (!origamiGraph[letter].hasOwnProperty(faceNeighborLetter)) {
						origamiGraph[letter][faceNeighborLetter] = MathHelpers.findDistanceBetweenPoints(points[letter], points[faceNeighborLetter]);
					}
				}
			}
		}
		return origamiGraph;  // let origamiGraph = {'a': {'e': 6, 'd': 9}, 'b': {'e': 7,'c': 9}};
	};

	// Find shortest path between nodes in graph using the dijkstra algorithm
	public static findShortestPath(graph: IOrigamiGraph, startNode: string, endNode: string): string[] {
		// Track distances from the start node using a hash object
		let distances: Record<string, number> = {};
		distances[endNode] = Infinity;
		distances = Object.assign(distances, graph[startNode]);
	   	// Track paths using a hash object
		let parents: Record<string, string|null> = { endNode: null };
		for (let child in graph[startNode]) {
			parents[child] = startNode;
		}
		// Collect visited nodes
		let visited: string[] = [];
	    // Find the nearest node
		let node = this.findNearestNode(distances, visited);
		// For that node:
		while (node) {
			// Find its distance from the start node & its child nodes
			let distance = distances[node];
			let children = graph[node]; 
			// For each of those child nodes:
			for (let child in children) {
		 		// Make sure each child node is not the start node
				if (String(child) === String(startNode)) {
					continue;
			  	} else {
					// Save the distance from the start node to the child node
					let newdistance = distance + children[child];
	   				// Ff there's no recorded distance from the start node to the child node in the distances object
	   				// or if the recorded distance is shorter than the previously stored distance from the start node to the child node
					if (!distances[child] || distances[child] > newdistance) {
	   					// save the distance to the object
						distances[child] = newdistance;
	   					// record the path
						parents[child] = node;
		   			} 
				}
			}  
			// Move the current node to the visited set
			visited.push(node);
	   		// Move to the nearest neighbor node
			node = this.findNearestNode(distances, visited);
		   }
		// Using the stored paths from start node to end node record the shortest path
		let shortestPath = [endNode];
		let parent = parents[endNode];
		while (parent) {
			shortestPath.push(parent);
			parent = parents[parent];
		}
		shortestPath.reverse();
		// let results = {distance: distances[endNode], path: shortestPath};
		return shortestPath;
	};

	public static findNearestNode(distances: Record<string, number>, visited: string[]) {
	// Create a default value for shortest
		let shortest = null;
		// For each node in the distances object
		for (let node in distances) {
			// If no node has been assigned to shortest yet or if the current node's distance is smaller than the current shortest
			let currentIsShortest = shortest === null || distances[node] < distances[shortest];
			// And if the current node is in the unvisited set
			if (currentIsShortest && !visited.includes(node)) {
				// Update shortest to be the current node
				shortest = node;
			}
		}
		return shortest;
	};

	public static selectCoincidentLines(intersectionLines: IintersectionLine[], firstIntersectedLine: IintersectionLine) {
		let coincidentLines = [];
		for (const intersectionLine of intersectionLines) {
			// Select points from first intersection line and current intersection line
			let points = [];
			for (const intersectionPoint of firstIntersectedLine) {
				points.push(intersectionPoint.coord);
			}
			for (const intersectionPoint of intersectionLine) {
				points.push(intersectionPoint.coord);
			}
			if (this.checkIfPointsAreCollinear(points)){
				coincidentLines.push(intersectionLine);
			}
		}
		return coincidentLines;
	}

	public static checkIfPointsAreCollinear(points: number[][]): boolean {
		const tolerance = 0.00001;
		const nonCoincidentPoints = [];
		for (let i = 1; i < points.length; i++) {
			const distance = MathHelpers.findDistanceBetweenPoints(points[0], points[i]);
			if (distance > tolerance) {
				nonCoincidentPoints.push(points[0]);
				nonCoincidentPoints.push(points[i]);
				break;
			}
		}
		if (nonCoincidentPoints.length > 0) {
			const lineVersor = MathHelpers.findVersorBetweenPoints(nonCoincidentPoints[0], nonCoincidentPoints[1]);
			points.sort(function (p1, p2) { return MathHelpers.dot(p1,lineVersor) - MathHelpers.dot(p2,lineVersor)});
			for (let i = 0; i < points.length - 1; i++) {
				const pointVersor = MathHelpers.findVersorBetweenPoints(points[i], points[i+1]);
				// If points are not coincident and are not collinear to line versor, the complete set of points is not collinear
				if (MathHelpers.findDistanceBetweenPoints(points[i], points[i+1]) >  tolerance && MathHelpers.dot(lineVersor, pointVersor) < 1 - tolerance) {
					return false;
				}
			}
		}
		return true;
	}

};