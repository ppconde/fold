import { MathHelpers } from './math-helpers';
import { IMeshInstruction, IParseTranslation, IParseRotation, TranslationKeys, IVertices, TranslationValues, IOrigamiCoordinates, IPlane, IOrigamiGraph, IintersectionLine, IFaceRotationInstruction, IFaceGraph} from './origami-types';


export class FoldSolver {

	public static solveTranslation(origamiCoordinates: IOrigamiCoordinates, instruction: string, translation: IParseTranslation, tolerance: number): [IOrigamiCoordinates, IFaceRotationInstruction] {
		// Get instruction values
		const { startNodes, endNodes, sense } = this.getFromFoldInstruction(['from', 'to', 'sense'], translation, instruction);

		// Finds plane between from and to points
		const plane = this.findPlaneBetween(origamiCoordinates.points, startNodes, endNodes);

		// Intersects plane with origami, yielding intersection lines
		const intersectionLines = this.findIntersectionBetweenPlaneAndEdges(origamiCoordinates, plane);

		// Find rotation faces, axis and angle
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
		// Unpack start and end nodes
		const fromNode = fromNodes[0];
		const toNode = toNodes[toNodes.length-1];

		// Find the first intersection line and crease origami
		const origamiGraph = this.convertOrigamiCoordinatesToGraph(origamiCoordinates);
		const shortestPath = this.findShortestPath(origamiGraph, fromNode, toNode);
		const firstIntersectionLine = this.findFirstIntersectionLine(shortestPath, intersectionLines);
		origamiCoordinates = this.creaseOrigami(origamiCoordinates, firstIntersectionLine);

		// Find faces that will directly rotate or not rotate (by being connected to a start or end node, respectively)
		const startFaces = this.findFacesThatContainNodes(origamiCoordinates.faces, [fromNode])
		const endFaces = this.findFacesThatContainNodes(origamiCoordinates.faces, [toNode])
		let faceLabels: {rotate: boolean[], dontRotate: boolean[], divide: boolean[]} = {rotate:[], dontRotate:[], divide:[]};
		faceLabels.rotate = this.sweepFacesUntilPlane(startFaces, origamiCoordinates, plane, -1);  // The plane side = 1 could probably be infered if we started sweeping from node instead of face
		faceLabels.dontRotate = this.sweepFacesUntilPlane(endFaces, origamiCoordinates, plane, 1);
		faceLabels.divide  = MathHelpers.elementWiseAnd(faceLabels.rotate, faceLabels.dontRotate);
		const divideFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, faceLabels.divide);

		// Find faces that will indirectly rotate or not rotate (by being overlaid on a start or end node, respectively)
		const directRotationFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, faceLabels.rotate);
		const directNoRotationFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, faceLabels.dontRotate);
		const intersectionNodes = this.findIntersectionLineNodes(origamiCoordinates, firstIntersectionLine);
		const rotationAxis = this.findRotationAxis(origamiCoordinates, sense, intersectionNodes, faceLabels);


		const startOverlaidFaces = this.sweepOverlaidFacesBeforePlane(directRotationFaces, origamiCoordinates, plane, intersectionLines, rotationAxis, -1, 1);
		const endOverlaidFaces = this.sweepOverlaidFacesBeforePlane(directNoRotationFaces, origamiCoordinates, plane, intersectionLines, rotationAxis, 1, 1);
		let overlaidFaceLabels: {rotate: boolean[], dontRotate: boolean[], divide: boolean[]} = {rotate:[], dontRotate:[], divide:[]};
		overlaidFaceLabels.rotate = this.sweepFacesUntilPlane(startOverlaidFaces, origamiCoordinates, plane, -1);  // The plane side = 1 could probably be infered if we started sweeping from node instead of face
		overlaidFaceLabels.dontRotate = this.sweepFacesUntilPlane(endOverlaidFaces, origamiCoordinates, plane, 1);
		overlaidFaceLabels.divide  = MathHelpers.elementWiseAnd(overlaidFaceLabels.rotate, overlaidFaceLabels.dontRotate);


		// TODO: test with weirder sheet! decide if unite labels. label the rest of the faces.


		// // todo: findOverLaidFaces está a encontrar faces "above" até do outro lado do plano (portanto below!). Decidir se limito só às deste lado do plano.
		// // Ou se procuro só a de imediatamente acima, depois faço crease, assim sucessivamente
		// const startOverlaidFaces = this.findOverlaidFaces(directRotationFaces, origamiCoordinates, rotationAxis);  // Adicionar plane e só encontrar aquelas do lado de cá
		// const endOverlaidFaces = this.findOverlaidFaces(directNoRotationFaces, origamiCoordinates, rotationAxis);
		// let overlaidFaceLabels: {rotate: boolean[], dontRotate: boolean[], divide: boolean[]} = {rotate:[], dontRotate:[], divide:[]};
		// overlaidFaceLabels.rotate = this.sweepFacesUntilPlane(startOverlaidFaces, origamiCoordinates, plane, 1);  // The plane side = 1 could probably be infered if we started sweeping from node instead of face
		// overlaidFaceLabels.dontRotate = this.sweepFacesUntilPlane(endOverlaidFaces, origamiCoordinates, plane, -1);


		// // Maybe join faceLabels and overlaidFaceLabels, to then find which faces are to divide.



		debugger;
		//

		const faceRotationInstructions = {faces: [['a','b','c','d']], axis: ['e','f'], angle: 180};
		return faceRotationInstructions;
	}

	public static sweepFacesUntilPlane(startFaces: string[][], origamiCoordinates: IOrigamiCoordinates, plane: IPlane, planeSide: -1|1): boolean[] {
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
				if (sweptFaceLabels[neighborFaceId] === false && MathHelpers.findFaceSideOfPlane(faces[neighborFaceId], points, plane) === planeSide) {
					startFaceIds.push(neighborFaceId);
				}
			}
		}
		return sweptFaceLabels;
	}

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


	// 		const faceId = MathHelpers.findPositionOfArrayInArray(startFaces[0], origamiCoordinates.faces);
	//      

	public static sweepOverlaidFacesBeforePlane(directRotationFaces: string[][], origamiCoordinates: IOrigamiCoordinates, plane: IPlane, intersectionLines: IintersectionLine[], rotationAxis: string[], planeSide: number, axisSense: number) {
		// Unpack origami coordinates
		const faces = origamiCoordinates.faces;
		const faceOrder = origamiCoordinates.faceOrder;
		// Set array to store sweeping information
		const sweptFaceLabels = new Array(faces.length).fill(false);
		// Convert start faces to ids to improve performance
		let startFaceIds: number[] = [];
		directRotationFaces.forEach((e) => startFaceIds.push(MathHelpers.findPositionOfArrayInArray(e, faces)))
		while (startFaceIds.length > 0) {
			const startFaceId = startFaceIds.shift() as number;
			sweptFaceLabels[startFaceId] = true;
			const [_, contactFaceIds] = this.findOverlaidNeighborFacesBeforePlane(startFaceId, origamiCoordinates, plane, intersectionLines, rotationAxis, -1, 1)
			for (let i = 0; i < contactFaceIds.length; i++) {
				if (sweptFaceLabels[contactFaceIds[i]] === false) {
					startFaceIds.push(contactFaceIds[i]);
				}
			}
		}
		return MathHelpers.logicallyIndexArray(faces, sweptFaceLabels);

	}

	public static findOverlaidNeighborFacesBeforePlane(faceId: number, origamiCoordinates: IOrigamiCoordinates, plane: IPlane, intersectionLines: IintersectionLine[], axis: string[], planeSide: number, axisSense: number): [string[][], number[]] {
		// Unpack origami coordinates
		let points = origamiCoordinates.points;
		let faces = origamiCoordinates.faces;
		let faceOrder = origamiCoordinates.faceOrder;

		// Set axis direction
		let newAxis;
		if (axisSense === -1) {
			newAxis = [...axis];
			newAxis.reverse();
		}

		// Select sections before plane
		const intersectionLine = this.findIntersectionLineFromFace(faces[faceId], intersectionLines);
		let [subFaces, newPoints, _] = this.divideFace(faces[faceId], origamiCoordinates.points, origamiCoordinates.pattern, intersectionLine);

		// Find faces above sections
		const newContactFaceIds = [];
		const newContactFaces = [];
		for (let i = 0; i < subFaces.length; i++) {
			if (MathHelpers.findFaceSideOfPlane(subFaces[i], newPoints, plane) === planeSide) {
				const overSide = this.findFaceOverSide(subFaces[i], points, axis);

				// TODO: Turn this into one- or two-line that may output [] but not undefined:
				const bothContactFaceIds = Object.keys(faceOrder[faceId]).map(e => {return Number(e)});
				const overContactFaceIds = [];
				for (let j = 0; j < bothContactFaceIds.length; j++) {
					const contactFaceSide = faceOrder[i][bothContactFaceIds[j]];
					if (contactFaceSide === overSide) {
						overContactFaceIds.push(bothContactFaceIds[j]);
					}
				}
				const faceAxis = this.findFaceAxis(points, subFaces[i]);
				const subface2D = MathHelpers.convertCoplanarPointsTo2D(MathHelpers.indexObject(points, subFaces[i]), faceAxis);
				for (let k = 0; k < overContactFaceIds.length; k++) {
					const contactFace2D = MathHelpers.convertCoplanarPointsTo2D(MathHelpers.indexObject(points, faces[overContactFaceIds[k]]), faceAxis);
					if (MathHelpers.checkIfCoplanarFacesIntersect(subface2D, contactFace2D)) {
						newContactFaceIds.push(overContactFaceIds[k]);
						newContactFaces.push(faces[overContactFaceIds[k]]);
					}
				}
			}
		}
		return [newContactFaces, newContactFaceIds];
	}

	


	public static findOverlaidFaces(directRotationFaces: string[][], origamiCoordinates: IOrigamiCoordinates, rotationAxis: string[]){
		// Unpack origami coordinates
		const faces = origamiCoordinates.faces;
		const faceOrder = origamiCoordinates.faceOrder;
		// Set array to store sweeping information
		const sweptFaceLabels = new Array(faces.length).fill(false);
		// Convert start faces to ids to improve performance
		let startFaceIds: number[] = [];
		directRotationFaces.forEach((e) => startFaceIds.push(MathHelpers.findPositionOfArrayInArray(e, faces)))
		while (startFaceIds.length > 0) {
			const startFaceId = startFaceIds.shift() as number;
			sweptFaceLabels[startFaceId] = true;
			const overSide = this.findFaceOverSide(faces[startFaceId], origamiCoordinates.points, rotationAxis);
			const contactFaces = faceOrder[startFaceId];
			const contactFaceIds = Object.keys(contactFaces).map(e => {return Number(e)});
			for (let i = 0; i < contactFaceIds.length; i++) {
				if (sweptFaceLabels[contactFaceIds[i]] === false && contactFaces[contactFaceIds[i]] === overSide) {
					startFaceIds.push(contactFaceIds[i]);
				}
			}
		}
		return MathHelpers.logicallyIndexArray(faces, sweptFaceLabels);
	}

	public static findFaceOverSide(face: string[], points: IVertices, axis: string[]) {
		const faceCenterPoint = MathHelpers.findAveragePoint(MathHelpers.indexObject(points, face));
		const faceNormalVersor = MathHelpers.findPlaneNormalVersor(MathHelpers.indexObject(points, face));
		const faceCenterPointProjection = MathHelpers.projectPointOntoLine(faceCenterPoint, points[axis[0]], points[axis[1]])
		const faceCenterToAxisVersor = MathHelpers.findVersorBetweenPoints(faceCenterPoint, faceCenterPointProjection);
		const faceAxisVersor = MathHelpers.findVectorVersor(MathHelpers.cross(faceNormalVersor, faceCenterToAxisVersor));
		const axisVersor = MathHelpers.findVersorBetweenPoints(points[axis[0]], points[axis[1]]);
		const dotResult = MathHelpers.dot(faceAxisVersor, axisVersor);
		const overSide = Math.sign(dotResult);  
		return overSide;  // -1 | 0 | 1
	}



			// // Unpack origami coordinates
			// const points = origamiCoordinates.points;
			// const faces = origamiCoordinates.faces;
			// // Set array to store sweeping information
			// const sweptFaceLabels = new Array(faces.length).fill(false);
			// // Convert start faces to ids to improve performance
			// let startFaceIds = [];
			// for (const startFace of startFaces){
			// 	startFaceIds.push(MathHelpers.findPositionOfArrayInArray(startFace, faces));
			// }
			// while (startFaceIds.length > 0) {
			// 	const startFaceId = startFaceIds.shift() as number;
			// 	sweptFaceLabels[startFaceId] = true;
			// 	const [_, neighborFaceIds] = this.findNeighborFaces(faces[startFaceId], faces);
			// 	for (const neighborFaceId of neighborFaceIds) {
			// 		// If neighbor has not been selected and it is not beyond plane
			// 		if (sweptFaceLabels[neighborFaceId] === false && MathHelpers.findFaceSideOfPlane(faces[neighborFaceId], points, plane) === -planeSide) {
			// 			startFaceIds.push(neighborFaceId);
			// 		}
			// 	}
			// }
			// return sweptFaceLabels;





	public static findRotationAxis(origamiCoordinates: IOrigamiCoordinates, sense: 'M'|'V', intersectionNodes: string[], faceLabels: {rotate: boolean[], dontRotate: boolean[], divide: boolean[]}) {
		// Find face at intersection and meant to rotate
		let faceAtIntersectionToRotate;
		for (let i = 0; i < faceLabels.rotate.length; i++) {
			if (faceLabels.rotate[i] === true && MathHelpers.checkIfArrayContainsAnyElement(origamiCoordinates.faces[i], intersectionNodes)) {
				faceAtIntersectionToRotate = origamiCoordinates.faces[i];
				break;
			}
		}
		if (faceAtIntersectionToRotate === undefined) {
			throw new Error('Could not find face that was both at the intersection and meant to rotate.')
		}

		// Find axis versor
		const faceCenterPoint = MathHelpers.findAveragePoint(MathHelpers.indexObject(origamiCoordinates.points, faceAtIntersectionToRotate));
		const faceNormalVersor = MathHelpers.findPlaneNormalVersor(MathHelpers.indexObject(origamiCoordinates.points, faceAtIntersectionToRotate));
		const faceCenterPointProjection = MathHelpers.projectPointOntoLine(faceCenterPoint, origamiCoordinates.points[intersectionNodes[0]], origamiCoordinates.points[intersectionNodes[1]])
		const faceCenterToAxisVersor = MathHelpers.findVersorBetweenPoints(faceCenterPoint, faceCenterPointProjection);
		const axisVersor = MathHelpers.cross(faceNormalVersor, faceCenterToAxisVersor);

		// Sort intersection nodes along axis versor
		intersectionNodes.sort(function (n1, n2) { return MathHelpers.dot(origamiCoordinates.points[n1],axisVersor) - MathHelpers.dot(origamiCoordinates.points[n2],axisVersor)});
		
		// Pick first and last node as axis nodes
		const axis = [intersectionNodes[0], intersectionNodes[intersectionNodes.length-1]];
		return axis;
	}


	public static findIntersectionLineNodes(origamiCoordinates: IOrigamiCoordinates, intersectionLine: IintersectionLine) {
		const intersectionNodes = [];
		for (const intersectionPoint of intersectionLine) {
			const nodes = Object.keys(origamiCoordinates.points);
			for (const node of nodes) {
				if (MathHelpers.checkIfPointsAreEqual(intersectionPoint.coord, origamiCoordinates.points[node])) {
					intersectionNodes.push(node);
					break;
				}
			}
		}
		return intersectionNodes;
	}

	public static checkIfIntersectionLinesAreEqual(line1: IintersectionLine, line2: IintersectionLine) {
		if (line1.length === line2.length) {
			return (line1.every((e, i) => MathHelpers.checkIfArraysAreEqual(e.edge, line2[i].edge)));
		}
		return false;
	}

	public static creaseOrigami(origamiCoordinates: IOrigamiCoordinates, intersectionLine: IintersectionLine)  {
		// Unpack origami coordinates
		let points = origamiCoordinates.points;
		let pattern = origamiCoordinates.pattern;
		let faces = origamiCoordinates.faces;
		let faceOrder = origamiCoordinates.faceOrder;
		// Set new origami coordinates
		let newFaces = [];
		let newPattern = {};
		let newFaceOrder: IFaceGraph = {};
		let subFaces;
		// Divide each face
		let faceToNewFaceCorrespondence: Record<number,number[]> = {};
		let subFaceCount = 0;
		for (let i = 0; i < faces.length; i++) {
			[subFaces, points, newPattern] = this.divideFace(faces[i], points, pattern, intersectionLine);
			faceToNewFaceCorrespondence[i] = [];
			for (let j = 0; j < subFaces.length; j++) {
				newFaces.push(subFaces[j]);
				faceToNewFaceCorrespondence[i].push(subFaceCount);
				subFaceCount++;
			}
		}
		// Update face order
		for (let i = 0; i < faces.length; i++) {
			const subfaceIds = faceToNewFaceCorrespondence[i];
			const contactFaceIds = Object.keys(faceOrder[i]).map(e => {return Number(e)});
			for (let j = 0; j < subfaceIds.length; j++) {
				const subface = newFaces[subfaceIds[j]];
				const o = points[subface[0]];
				const n = MathHelpers.findPlaneNormalVersor(MathHelpers.indexObject(points, subface));
				const u = MathHelpers.findVersorBetweenPoints(points[subface[0]], points[subface[1]]);
				const v = MathHelpers.cross(n,u);
				const planeAxis = {o:o, n:n, u:u, v:v};
				const subface2D = MathHelpers.convertCoplanarPointsTo2D(MathHelpers.indexObject(points, subface), planeAxis);
				newFaceOrder[subfaceIds[j]] = {};
				for (let k = 0; k < contactFaceIds.length; k++) {
					const contactFaceSide = faceOrder[i][contactFaceIds[k]];
					const subContactFaceIds = faceToNewFaceCorrespondence[contactFaceIds[k]];
					for (let m = 0; m < subContactFaceIds.length; m++) {
						const contactFace2D = MathHelpers.convertCoplanarPointsTo2D(MathHelpers.indexObject(points, newFaces[subContactFaceIds[m]]), planeAxis);
						if (MathHelpers.checkIfCoplanarFacesIntersect(subface2D, contactFace2D)) {
							newFaceOrder[subfaceIds[j]][subContactFaceIds[m]] = contactFaceSide;
						}
					}
				}
			}
		}
		// Update origami coordinates
		origamiCoordinates.points = points;
		origamiCoordinates.pattern = newPattern;
		origamiCoordinates.faces = newFaces;
		origamiCoordinates.faceOrder = newFaceOrder;
		return origamiCoordinates;
	}

	public static findFaceAxis(points: IVertices, face: string[]) {
		const o = points[face[0]];
		const n = MathHelpers.findPlaneNormalVersor(MathHelpers.indexObject(points, face));
		const u = MathHelpers.findVersorBetweenPoints(points[face[0]], points[face[1]]);
		const v = MathHelpers.cross(n,u);
		const faceAxis = {o:o, n:n, u:u, v:v};
		return faceAxis;
	}

	public static updateFaceOrder() {


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
		return [];
		// throw new Error('Could not find intersection line that intersected this face to divide! Check why.');
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


	// public static findRotationAxis(firstIntersectionLine: string[]): string[] {
	// 	return [firstIntersectionLine[0], firstIntersectionLine[firstIntersectionLine.length-1]];
	// }


	public static findRotationAngle(fromNode: string, toNode: string, rotationAxis: string[]): number {
		return 180;  // placeholder
	}

	public static rotateFaces(origamiCoordinates: IOrigamiCoordinates, faceRotationInstruction: IFaceRotationInstruction): IOrigamiCoordinates {

		return origamiCoordinates;
	}



};