import { MathHelpers } from './math-helpers';
import { IMeshInstruction, IParseTranslation, IParseRotation, TranslationKeys, IVertices, TranslationValues, IOrigamiCoordinates, IPlane, IOrigamiGraph, IintersectionLine, IFaceRotationInstruction, I2DVector} from './origami-types';


export class FoldSolver {

	public static solveTranslation(origamiCoordinates: IOrigamiCoordinates, instruction: string, translation: IParseTranslation, tolerance: number): [IOrigamiCoordinates, IFaceRotationInstruction] {
		// Get instruction values
		const { startNodes, endNodes, sense } = this.getFromFoldInstruction(['from', 'to', 'sense'], translation, instruction);

		// Finds plane between from and to points
		const plane = this.findPlaneBetween(origamiCoordinates.points, startNodes, endNodes);

		// Intersects plane with origami, yielding intersection lines
		const intersectionLines = this.findIntersectionBetweenPlaneAndEdges(origamiCoordinates, plane);

		// Selects intersection lines which will serve as rotation axis
		const faceRotationInstructions = this.createFaceRotationInstructions(startNodes, endNodes, sense, origamiCoordinates, plane, intersectionLines);

		origamiCoordinates  = this.rotateFaces(origamiCoordinates, faceRotationInstructions);

		// Adds crease points
		// [origamiCoordinates, axisLines] = this.creaseOrigami(origamiCoordinates, plane, axisLines);

		// Rotates points 
		// [origamiCoordinates, rotationReport] = this.rotateOrigami(origamiCoordinates, sense, plane, axisLines);

		// Set place-holder
		// const faceRotationInstructions = { faces: [['a', 'e', 'b', 'd']], axis: ['a', 'b'], angle: 90 };

		return [origamiCoordinates, faceRotationInstructions];
	}

	public static solveRotation(origamiCoordinates: IOrigamiCoordinates, instruction: string, rotation: IParseRotation, tolerance: number): [IOrigamiCoordinates, IFaceRotationInstruction] {
		// Set place-holder
		const meshInstruction = { faces: [['a', 'e', 'b', 'd']], axis: ['a', 'b'], angle: 90 };
		return [origamiCoordinates, meshInstruction];
	}
	
	// Extract values from instruction
	public static getFromFoldInstruction(array: TranslationKeys[],translation: IParseTranslation,instruction: string): TranslationValues {
		const match = instruction.match(translation.regex);
		const translationValues: any = array.reduce((obj, transition) => {
			const valueForArray = translation[transition].reduce((acc, quantity) => {
				if (match?.[quantity]) {
					acc.push(match[quantity]);
				}
				return acc;
			}, [] as string[]);
			return { ...obj, [transition]: valueForArray };
		}, {});

		if (MathHelpers.checkIfObjectIsEmpty(translationValues))  {
			throw new Error('Failed to extract values from instruction!')
		}
		return {startNodes: translationValues.from, endNodes: translationValues.to, sense: translationValues.sense};  // This is stupid. Make getFromTranslationInstruction and getFromRotationnInstruction instead
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

	public static findIntersectionBetweenPlaneAndEdges(origamiCoordinates: IOrigamiCoordinates, plane: IPlane): {edge: string[]; coord: number[]}[][] {
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

	// public static findAxisLines(from: string[], to: string[], sense: 'V'|'M', origamiCoordinates: IOrigamiCoordinates, plane: IPlane, intersectionLines: IintersectionLine[]) {
	// 	const origamiGraph = this.convertOrigamiCoordinatesToGraph(origamiCoordinates);
	// 	const shortestPath = this.findShortestPath(origamiGraph, from[0], to[0]);
	// 	const firstIntersectionLine = this.findFirstIntersectionLine(shortestPath, intersectionLines)
	// 	const coincidentLines = this.selectCoincidentLines(intersectionLines, firstIntersectionLine);
	// 	const sortedLines = this.sortIntersectionLines(origamiCoordinates, sense, plane, coincidentLines, firstIntersectionLine); 
	// 	// const axisLines = this.selectAxisLines();  
	// 	// return axisLines;
	// 	return 0;
	// }

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

	public static selectCoincidentLines(intersectionLines: IintersectionLine[], firstIntersectionLine: IintersectionLine) {
		let coincidentLines = [];
		for (const intersectionLine of intersectionLines) {
			// Select points from first intersection line and current intersection line
			let points = [];
			for (const intersectionPoint of firstIntersectionLine) {
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

	// public static sortIntersectionLines(origamiCoordinates: IOrigamiCoordinates, sense: 'M'|'V', plane: IPlane, coincidentLines: IintersectionLine[], firstIntersectionLine: IintersectionLine) {

	// 	// const rotationForwardVersor = ;
	// 	// const rotationUpVersor = ;  // Projeção da normal da face de cá da primeira linha de interseção, com o plane. (utilizar o mathhelpers.projectVectorOntoPlane()). Talvez utilizar o rotation forward versor para escolher a face que tenha a primeira interseção e que tenha pelo menos uma letra para cá (sentido contrario ao planeforwardversor) do plano)
	// 	const sortedLinesIndexes = [];
	// 	for (let i = 0; i < coincidentLines.length; i++) {

	// 	}
	// }


	public static createFaceRotationInstructions(fromNodes: string[], toNodes: string[], sense: 'V'|'M', origamiCoordinates: IOrigamiCoordinates, plane: IPlane, intersectionLines: IintersectionLine[]){
		const origamiGraph = this.convertOrigamiCoordinatesToGraph(origamiCoordinates);
		const fromNode = fromNodes[0];
		const toNode = toNodes[toNodes.length-1];
		const shortestPath = this.findShortestPath(origamiGraph, fromNode, toNode);
		const firstIntersectionLine = this.findFirstIntersectionLine(shortestPath, intersectionLines);
		const coincidentLines = this.selectCoincidentLines(intersectionLines, firstIntersectionLine);

		// Find faces that will directly rotate or not rotate (by being connected to a start or end node, respectively)
		const startFaces = this.findFacesThatContainNodes(origamiCoordinates.faces, [fromNode])
		const endFaces = this.findFacesThatContainNodes(origamiCoordinates.faces, [toNode])
		const intersectedEdges = this.getIntersectionLinesEdges(coincidentLines);

		let faceLabels: {rotate: boolean[], dontRotate: boolean[], divide: boolean[]} = {rotate:[], dontRotate:[], divide:[]};
		faceLabels.rotate = this.sweepFacesUntilPlane(startFaces, origamiCoordinates, plane);
		faceLabels.dontRotate = this.sweepFacesUntilPlane(endFaces, origamiCoordinates, plane);
		faceLabels.divide  = MathHelpers.elementWiseAnd(faceLabels.rotate, faceLabels.dontRotate);

		// Crease
		const divideFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, faceLabels.divide);
		const intersectionLine = this.findIntersectionLineFromFace(divideFaces[0], coincidentLines);
		origamiCoordinates = this.creaseOrigami(origamiCoordinates, intersectionLine);

		// Update Labels somehow. Is it necessary? Maybe do sweeping again after.

		// Find faces that will indirectly rotate or not rotate (by being on top of a start or end node, respectively)
		let overlaidFaces = this.findOverlaidFaces(origamiCoordinates, facesToRotate);

		// let creaseNodes;
		// [origamiCoordinates, creaseNodes] = this.creaseOrigami(origamiCoordinates, firstIntersectionLine);
		// let facesToRotate = this.findFacesToRotate(origamiCoordinates, fromNode, firstIntersectionLine);
		// const rotationAxis = this.findRotationAxis(creaseNodes);
		// const angle = this.findRotationAngle(fromNode, toNode, rotationAxis);
		// let overlaidFaces = this.findOverlaidFaces(origamiCoordinates, facesToRotate);
		// let overlaidNodes = this.findOverlaidNodes(origamiCoordinates, overlaidFaces, plane);
		// while (overlaidNodes.length > 0) {
		// 	const shortestPath = this.findShortestPath(origamiGraph, fromNode, toNode);
		// 	const firstIntersectionLine = this.findFirstIntersectionLine(shortestPath, intersectionLines);
		// }
		// const faceRotationInstructions = {faces: facesToRotate, axis: , angle:};

		const faceRotationInstructions = {faces: [['a','b','c','d']], axis: ['e','f'], angle: 180};
		return faceRotationInstructions;
	}


	public static creaseOrigami(origamiCoordinates: IOrigamiCoordinates, intersectionLine: IintersectionLine)  {
		// Unpack origami coordinates
		let points = origamiCoordinates.points;
		let pattern = origamiCoordinates.pattern;
		let faces = origamiCoordinates.faces;
		let newFaces = [];
		let subFaces;
		// Divide each face
		for (const face of faces) {
			[subFaces, points, pattern] = this.divideFace(face, points, pattern, intersectionLine);
			newFaces.push(...subFaces);
		}
		// Update origami coordinates
		origamiCoordinates.points = points;
		origamiCoordinates.pattern = pattern;
		origamiCoordinates.faces = newFaces;
		return origamiCoordinates;
	}


	public static divideFace(face: string[], points: IVertices, pattern: IVertices, intersectionLine: IintersectionLine): [string[][], IVertices, IVertices] {
		// Add intersection points to face
		let intersectionPointIds = [];
		[face, points, pattern, intersectionPointIds] = this.addIntersectionPoints(face, points, pattern, intersectionLine);
		// Divide face
		const currentFaceNodeId = 0;
		const previousFaceNodeId = -1;
		let subface: string[] = [];
		let subfaces: string[][] = [];
		subfaces = this.divideFaceHelper(face, pattern, intersectionPointIds, currentFaceNodeId, previousFaceNodeId, subface, subfaces)
		return [subfaces, points, pattern];
	}


	public static divideFaceHelper(face: string[], pattern: IVertices, intersectionPointIds: number[], currentId: number, previousId: number, subface: string[], subfaces:string[][]) {
		// Get current node
		const currentNode = face[currentId % face.length];
		// If current node is at the start of subface (subface has been completed), return subfaces
		if (subface.includes(currentNode)) {
			subfaces.push(subface);
			return subfaces;
		}
		// If not, add current node
		subface.push(currentNode);
		
		// If possible, follow crease
		const nextCreaseNodeId = this.findNextCreaseNodeId(face, pattern, intersectionPointIds, currentId, previousId);
		if (nextCreaseNodeId !== -1) {
			previousId = currentId;
			subfaces = this.divideFaceHelper(face, pattern, intersectionPointIds, nextCreaseNodeId, previousId, subface, subfaces);
			// Stop making next subface if first edge matches (directionally) the edge of a previously made subface
			const nextEdge = [face[currentId % face.length], face[currentId + 1 % face.length]];
			if (subfaces.some((e) => MathHelpers.checkIfFaceContainsDirectionalEdge(e, nextEdge))) {
				return subfaces;
			}
			// Add current node
			subface = [face[currentId % face.length]];

		}
		// Continue to add points
		previousId = currentId;
		currentId = currentId + 1;
		subfaces = this.divideFaceHelper(face, pattern, intersectionPointIds, currentId, previousId, subface, subfaces);
		return subfaces;
	}



	public static findNextCreaseNodeId(face: string[], pattern: IVertices, intersectionPointIds: number[], currentId: number, previousId: number): number {
		const angleTolerance = 0.5;
		const currentNode = face[currentId];
		const currentIntersectionPointPosition = intersectionPointIds.indexOf(currentId);
		if (currentIntersectionPointPosition !== -1) {
			const adjacentIntersectionPointSteps = [-1, +1];
			for (const step of adjacentIntersectionPointSteps) {
				if (currentIntersectionPointPosition + step >= 0 && currentIntersectionPointPosition + step < intersectionPointIds.length) {
					const adjacentIntersectionPointId = intersectionPointIds[currentIntersectionPointPosition + step];
					const adjacentIntersectionNode = face[adjacentIntersectionPointId];
					const previousNode = face[(previousId + face.length) % face.length];
					const nextNode = face[(currentId + 1) % face.length];
					const backVector = MathHelpers.findVectorBetweenPoints(pattern[currentNode], pattern[previousNode]) as [number, number];
					const frontVector = MathHelpers.findVectorBetweenPoints(pattern[currentNode], pattern[nextNode]) as [number, number];
					const intersectionPointVector = MathHelpers.findVectorBetweenPoints(pattern[currentNode], pattern[adjacentIntersectionNode]) as [number, number];
					const frontToIntersectionAngle = MathHelpers.findClockwiseAngleBetweenVectors(frontVector, intersectionPointVector);
					const frontToBackAngle = MathHelpers.findClockwiseAngleBetweenVectors(frontVector, backVector); 
					if (frontToIntersectionAngle > 0 + angleTolerance && frontToIntersectionAngle < frontToBackAngle - angleTolerance) {
						return adjacentIntersectionPointId;
					}
				}
			}
		}
		return -1;
	}
	
	public static findNextCreaseNodeIdOld(face: string[], pattern: IVertices, intersectionPointIds: number[], currentId: number): number {
		const tolerance = 0.001;
		// Current point must be crease point, and there must be an eligible crease point to connect with (the closest crease point connected by paper)
		if (intersectionPointIds.includes(currentId)) {
			const nextNonCreasedEdge = [face[currentId], face[currentId + 1 % face.length]];
			const nextNonCreasedVector = MathHelpers.findVectorBetweenPoints(pattern[nextNonCreasedEdge[0]], pattern[nextNonCreasedEdge[1]]) as [number, number];
			const nextNonCreasedNormalVersor = MathHelpers.findVectorNormalVersor(nextNonCreasedVector);
			const currentIntersectionPoint = face[currentId];
			const creaseDistances = [];
			const elegibleIntersectionPointIds = [];
			for (const id of intersectionPointIds) {
				const creaseVector = MathHelpers.findVectorBetweenPoints(pattern[currentIntersectionPoint], pattern[face[id]]);
				const distanceAlongNonCreasedNormalVersor = MathHelpers.dot(nextNonCreasedNormalVersor, creaseVector);
				// If crease point is not coincident (current point), colinear (next face point after edge), nor behind
				if (distanceAlongNonCreasedNormalVersor > tolerance) {
					creaseDistances.push(distanceAlongNonCreasedNormalVersor);
					elegibleIntersectionPointIds.push(id);
				}
			}
			// Find next crease point
			if (!MathHelpers.checkIfArrayIsEmpty(creaseDistances)){
				const creasePointIndex = MathHelpers.findPositionOfMinimumValue(creaseDistances);
				return elegibleIntersectionPointIds[creasePointIndex];
			}
		}
		return -1;
	}

	public static addIntersectionPoints(face: string[], points: IVertices, pattern: IVertices, intersectionLine: IintersectionLine): [string[], IVertices, IVertices, number[]] {
		let newFace = [];
		let intersectionPointIds = [];
		let intersectionPointIdsOrder = [];
		for (let i = 0; i < face.length; i++) {
			newFace.push(face[i]);
			const edge = [face[i], face[(i + 1) % face.length]];
			for (let j = 0; j < intersectionLine.length; j++) {
				const intersectionPoint = intersectionLine[j];
				if (MathHelpers.checkIfEdgesAreEqual(edge, intersectionPoint.edge)) {
					let intersectionAtNode = false;
					for (let k = 0; k < edge.length; k++) {
						if (MathHelpers.checkIfPointsAreEqual(points[edge[k]], intersectionPoint.coord)) {
							intersectionPointIds.push((newFace.length - 1 + k));  // The id will be the last node (k=0) or the next (k=1)
							intersectionPointIdsOrder.push(j);
							intersectionAtNode = true;
							break;
						}
					}
					if (!intersectionAtNode) {
						const newNodeName = this.createNewNodeName(points);
						newFace.push(newNodeName);
						points[newNodeName] = intersectionPoint.coord;
						const intersectionPointDistance = MathHelpers.findDistanceBetweenPoints(points[edge[0]], intersectionPoint.coord);
						const patternEdgeVersor = MathHelpers.findVersorBetweenPoints(pattern[edge[0]], pattern[edge[1]]);
						const patternIntersectionPoint = MathHelpers.addArray(pattern[edge[0]], MathHelpers.multiplyArray(patternEdgeVersor, intersectionPointDistance));
						pattern[newNodeName] = patternIntersectionPoint;
						intersectionPointIds.push((newFace.length - 1)); // The id will be the last node
						intersectionPointIdsOrder.push(j);
					}
				}
			}
		}

		// This is to antecipate an error in the case in whick it's the face point last iteration and the "next node" is added. I am not 100% if it is necessary.
		for (let i = 0; i < intersectionPointIds.length; i++) {
			intersectionPointIds[i] = intersectionPointIds[i] % newFace.length;
		}
		// Preserve intersection line point order; If commented, the order will be face edge order.
		const sortIndices = MathHelpers.findSortIndices(intersectionPointIdsOrder);
		intersectionPointIds = MathHelpers.indexArray(intersectionPointIds, sortIndices);
		return [newFace, points, pattern, intersectionPointIds];
	}

	public static createNewNodeName(points: IVertices) {
		const currentNodeNames = Object.keys(points).map((element, k) => element.charCodeAt(0));
		const newNodeName = String.fromCharCode(Math.max(...currentNodeNames) + 1);
		return newNodeName;
	}

	public static findIntersectionLineFromFace(face: string[], intersectionLines: IintersectionLine[]) {
		for (const intersectionLine of intersectionLines) {
			let numberOfMatchingEdges = 0;
			for (const intersectionPoint of intersectionLine) {
				if (MathHelpers.checkIfFaceContainsEdge(face, intersectionPoint.edge)) {
					numberOfMatchingEdges++;
				}
				if (numberOfMatchingEdges === 2) {
					return intersectionLine;
				}
			}
		}
		throw new Error('Could not find intersection line that intersected this face to divide! Check why.');
	}

	public static sweepFacesUntilPlane(startFaces: string[][], origamiCoordinates: IOrigamiCoordinates, plane: IPlane): boolean[] {
		// Unpack origami coordinates
		const points = origamiCoordinates.points;
		const faces = origamiCoordinates.faces;
		// Set array to store sweeping information
		const sweptFaceLabels = new Array(faces.length).fill(false);
		// Convert start faces to ids to improve performance
		let startFaceIds = [];
		for (const startFace of startFaces){
			startFaceIds.push(MathHelpers.findPositionOfArrayInArray(startFace, faces));
		}
		while (startFaceIds.length > 0) {
			const startFaceId = startFaceIds.shift() as number;
			sweptFaceLabels[startFaceId] = true;
			const [_, neighborFaceIds] = this.findNeighborFaces(faces[startFaceId], faces);
			for (const neighborFaceId of neighborFaceIds) {
				// If neighbor has not been selected and it is not beyond plane
				if (sweptFaceLabels[neighborFaceId] === false && MathHelpers.findFaceSideOfPlane(faces[neighborFaceId], points, plane) !== +1) {
					startFaceIds.push(neighborFaceId);
				}
			}
		}
		return sweptFaceLabels;
	}


	public static sweepFacesUntilEdges(startFaces: string[][], faces: string[][], endEdges: string[][]): boolean[] {
		// Set array to store sweeping information
		const sweptFaceLabels = new Array(faces.length).fill(false);
		// Convert start faces to ids to improve performance
		let startFaceIds = [];
		for (const startFace of startFaces){
			for (let i = 0; i < faces.length; i++){
				if (MathHelpers.checkIfArraysAreEqual(startFace, faces[i])){
					startFaceIds.push(i);
					break;
				}
			}
		}
		// Sweep faces
		while (startFaceIds.length > 0) {
			const startFaceId = startFaceIds.shift() as number;
			if (sweptFaceLabels[startFaceId] === false) {
				sweptFaceLabels[startFaceId] = true;
				if (!endEdges.some(e =>  MathHelpers.checkIfFaceContainsEdge(faces[startFaceId], e))){
					const [_, neighborFaceIds] = this.findNeighborFaces(faces[startFaceId], faces);
					startFaceIds.push(...neighborFaceIds);
				}
			}
		}
		return sweptFaceLabels;
	}


			// let sweptFaces = [];
		// for (let i = 0; i < faces.length; i++) {
		// 	sweptFaces.push({faceId: i, hasBeenSwept: false});
		// }


	// public static sweepFacesUntilEdgesHelper(startFaceIds: number[], faces: string[][], endEdges: string[][], sweptFaces: {faceId: number, hasBeenSwept: boolean}[]) {

	// 	while (startFaceIds.length > 0) {
	// 		const startFaceId = startFaceIds.shift() as number;
	// 		if (!sweptFaces.some(e => e.faceId === startFaceId)) {
	// 			sweptFaces.push({faceId: startFaceId, hasBeenSwept: true});
	// 			if (!endEdges.some(e =>  MathHelpers.checkIfFaceContainsEdge(faces[startFaceId], e))){
	// 				const [_, neighborFaceIds] = this.findNeighborFaces(faces[startFaceId], faces);
	// 				startFaceIds.push(...neighborFaceIds);
	// 			}
	// 		}
	// 	}


	// }


	// public static sweepFacesUntilEdgesHelper2(startFaceIds: number[], faces: string[][], endEdges: string[][], sweptFaces: {faceId: number, hasBeenSwept: boolean}[]) {

	// 	for (const startFace of startFaces) {

	// 		if (sweptFaces.some(el => MathHelpers.checkIfArraysAreEqual(el.faceId, ))) {


	// 		}



	// 	}

	// }


	public static findNeighborFaces(startFace: string[], faces: string[][]): [string[][], number[]] {
		const neighborFaces = [];
		const neighborFaceIds = [];
		for (let i = 0; i < faces.length; i++) {
			const face = faces[i];
			if (MathHelpers.checkIfArrayContainsAnyElement(face, startFace) && !MathHelpers.checkIfArraysAreEqual(face, startFace)) {
				neighborFaces.push(face);
				neighborFaceIds.push(i);
			}
		}
		return [neighborFaces, neighborFaceIds];
	}

	public static findFacesThatContainNodes(faces: string[][], nodes: string[]) {
		const facesThatContainNodes = [];
		for (const face of faces) {
			if (MathHelpers.checkIfArrayContainsAnyElement(face, nodes)){
				facesThatContainNodes.push(face);
			}
		}
		return facesThatContainNodes;
	}



	public static getIntersectionLinesEdges(intersectionLines: IintersectionLine[]) {
		const intersectedEdges = [];
		for (const intersectionLine of intersectionLines) {
			for (const intersectionPoint of intersectionLine) {
				if (!MathHelpers.checkIfEdgesContainEdge(intersectedEdges, intersectionPoint.edge)) {
					intersectedEdges.push(intersectionPoint.edge);
				}
			}
		}
		return intersectedEdges;
	}


	public static findRotationAxis(firstIntersectionLine: string[]): string[] {
		return [firstIntersectionLine[0], firstIntersectionLine[firstIntersectionLine.length-1]];
	}


	public static findRotationAngle(fromNode: string, toNode: string, rotationAxis: string[]): number {
		return 180;  // placeholder
	}

	public static rotateFaces(origamiCoordinates: IOrigamiCoordinates, faceRotationInstruction: IFaceRotationInstruction): IOrigamiCoordinates {

		return origamiCoordinates;
	}



};