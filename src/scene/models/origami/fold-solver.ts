import { MathHelpers } from './math-helpers';
import { IMeshInstruction, IParseTranslation, IParseRotation, TranslationKeys, IVertices, TranslationValues, IOrigamiCoordinates, IPlane, IOrigamiGraph, IintersectionLine, IFaceRotationInstruction, IFaceGraph, IFaceLabels, RotationKeys} from './origami-types';


export class FoldSolver {


	public static solveTranslation(origamiCoordinates: IOrigamiCoordinates, instruction: string, translation: IParseTranslation): [IOrigamiCoordinates, IFaceRotationInstruction] {

		const [startNodes, endNodes, sense] = this.getFoldInstructionValues(translation, instruction);

		const plane = this.findPlaneBetweenNodes(origamiCoordinates.points, startNodes, endNodes);

		const rotationAxisCoordinates = this.findRotationAxisCoordinates(origamiCoordinates, startNodes, endNodes, sense, plane);

		const rotationAngle = this.findRotationAngle(origamiCoordinates.points, startNodes, endNodes, rotationAxisCoordinates);

		const [rotationFaces, origamiCoordinatesWithCreases] = this.findRotationFaces(origamiCoordinates, startNodes, endNodes, rotationAxisCoordinates, plane);

		origamiCoordinates = origamiCoordinatesWithCreases;

		const rotationAxisNodes = this.findRotationAxisNodes(origamiCoordinates, rotationAxisCoordinates);

		const faceRotationInstruction = {faces: rotationFaces, axis: rotationAxisNodes, angle: rotationAngle};

		origamiCoordinates = this.rotateFaces(origamiCoordinates, faceRotationInstruction);

		return [origamiCoordinates, faceRotationInstruction];
	}

	public static solveRotation(origamiCoordinates: IOrigamiCoordinates, instruction: string, rotation: IParseRotation): [IOrigamiCoordinates, IFaceRotationInstruction] {

		const [startNodes, axisNodes, sense, rotationAngle]= this.getFoldInstructionValues(rotation, instruction);

		const plane = this.findPlaneAtAxis(origamiCoordinates.points, startNodes, axisNodes);

		const rotationAxisNodes = this.orientRotationAxis(origamiCoordinates, axisNodes, sense, plane);

		const rotationAxisCoordinates = MathHelpers.indexObject(origamiCoordinates.points, rotationAxisNodes);

		const endNodes = this.findRotationEndNode(origamiCoordinates, startNodes, rotationAxisNodes, plane);

		const [rotationFaces, origamiCoordinatesWithCreases] = this.findRotationFaces(origamiCoordinates, startNodes, endNodes, rotationAxisCoordinates, plane);

		origamiCoordinates = origamiCoordinatesWithCreases;

		const faceRotationInstruction = {faces: rotationFaces, axis: rotationAxisNodes, angle: rotationAngle};

		return [origamiCoordinates, faceRotationInstruction];

	}


	public static findPlaneAtAxis(points: IVertices, startNodes: string[], axisNodes: string[]){
		const startNode = startNodes[0];
		const startPoint = points[startNode];
		const axisSegment = [points[axisNodes[0]], points[axisNodes[1]]];
		const projectedStartPoint = MathHelpers.projectPointOntoLine(startPoint, axisSegment[0], axisSegment[1]);
		const plane_vector = MathHelpers.findVectorBetweenPoints(startPoint, projectedStartPoint);
		const plane_versor = MathHelpers.findVectorVersor(plane_vector);  // In theory, as long as plane contains axis line, it could have any orientation (I think)
		const plane_point = projectedStartPoint;
		const plane = { point: plane_point, versor: plane_versor };
		return plane;
	}

	public static orientRotationAxis(origamiCoordinates: IOrigamiCoordinates, axisNodes: string[], sense: 'M'|'V', plane: IPlane) {

		// Unpack origami coordinates
		const points = structuredClone(origamiCoordinates.points);
		const faces = origamiCoordinates.faces;
		const pattern = origamiCoordinates.pattern;

		// Find plane-origami intersection lines
		const intersectionLines = this.findIntersectionBetweenPlaneAndEdges(origamiCoordinates, plane);


		debugger;

		// Maybe find intersection lines
		// See which ones contain axis nodes
		// Pick a face containing two of the intersection Nodes
		// Orient axis according to sense of rotation of that face (careful since it depends on which side of the plane it is)


	}


	public static rotateFaces(origamiCoordinates: IOrigamiCoordinates, faceRotationInstructions: IFaceRotationInstruction) {
		const points = origamiCoordinates.points;

		// Unpack face rotation instructions
		const rotationFaces = faceRotationInstructions.faces;
		const rotationAxis = faceRotationInstructions.axis;
		const rotationAngle = faceRotationInstructions.angle;

		// Find rotation points
		const rotationNodes: string[] = [];
		const rotationPoints: number[][] = [];
		for (const rotationFace of rotationFaces) {
			for (const rotationNode of rotationFace) {
				if (!MathHelpers.checkIfArrayContainsAnyElement(rotationNodes, [rotationNode])) {
					rotationNodes.push(rotationNode);
					rotationPoints.push(points[rotationNode]);
				}
			}
		}

		// Rotate points
		const rotationLine = [points[rotationAxis[0]], points[rotationAxis[1]]];
		const rotatedPoints = this.rotatePointsAroundLine(rotationPoints, rotationLine, rotationAngle);

		// Update origami coordinates
		for (let i = 0; i < rotationNodes.length; i++) {
			origamiCoordinates.points[rotationNodes[i]] = rotatedPoints[i];
		}

		return origamiCoordinates;
	}

	// (https://www.eng.uc.edu/~beaucag/Classes/Properties/OptionalProjects/CoordinateTransformationCode/Rotate%20about%20an%20arbitrary%20axis%20(3%20dimensions).html)
	// https://github.com/ppconde/fold/commit/5ae13c8dd27d948237d44f5f40425a6a079d5aa9
	// https://stackoverflow.com/questions/6721544/circular-rotation-around-an-arbitrary-axis/6721649#6721649
	public static rotatePointsAroundLine(points: number[][], line: number[][], angle: number) {

		// Find point matrix
		let rotationPointsMatrix = [];
		for (const point of points) {
			rotationPointsMatrix.push([...point, 1]);
		}
		rotationPointsMatrix = MathHelpers.transposeMatrix(rotationPointsMatrix);

		// Find translation matrices
		const translationPoint = line[0];
		const T = this.findTranlationMatrix(MathHelpers.multiplyArray(translationPoint, -1));
		const Ti = this.findTranlationMatrix(translationPoint);

		// Find rotation matrix
		const lineVersor = MathHelpers.findVersorBetweenPoints(line[0], line[1]);
		const rotationMatrix = this.findRotationMatrix(lineVersor, angle);

		// Rotate point matrix
		let rotatedPointsMatrix = MathHelpers.multiplyMatrix(Ti, MathHelpers.multiplyMatrix(rotationMatrix, MathHelpers.multiplyMatrix(T, rotationPointsMatrix)));

		// Get rotated points
		rotatedPointsMatrix = MathHelpers.transposeMatrix(rotatedPointsMatrix);
		let rotatedPoints = [];
		for (let i = 0; i < rotatedPointsMatrix.length; i++) {
			rotatedPoints.push([rotatedPointsMatrix[i][0], rotatedPointsMatrix[i][1], rotatedPointsMatrix[i][2]]);
		}

		return rotatedPoints;
	}


	public static findTranlationMatrix(point: number[]) {
		return  [[1,0,0,point[0]],[0,1,0,point[1]],[0,0,1,point[2]],[0,0,0,1]];
	}

	public static findRotationMatrix(versor: number[], angle: number) {
		const ux = versor[0];
		const uy = versor[1];
		const uz = versor[2];
		const theta = angle / 180 * Math.PI;
		const R = [[Math.cos(theta)+(ux**2)*(1-Math.cos(theta)), ux*uy*(1-Math.cos(theta))-uz*Math.sin(theta), ux*uz*(1-Math.cos(theta))+uy*Math.sin(theta), 0],
				   [uy*ux*(1-Math.cos(theta))+uz*Math.sin(theta), Math.cos(theta)+(uy**2)*(1-Math.cos(theta)), uy*uz*(1-Math.cos(theta))-ux*Math.sin(theta), 0],
				   [uz*ux*(1-Math.cos(theta))-uy*Math.sin(theta), uz*uy*(1-Math.cos(theta))+ux*Math.sin(theta), Math.cos(theta)+(uz**2)*(1-Math.cos(theta)), 0],
				   [0, 0, 0, 1]];
		return R;
	}


	public static findRotationAxisNodes(origamiCoordinates: IOrigamiCoordinates, rotationAxisCoordinates: number[][]) {
		const rotationAxisNodes = [];
		for (let i = 0; i < rotationAxisCoordinates.length; i++) {
			for (let node of Object.keys(origamiCoordinates.points)) {
				if (MathHelpers.checkIfPointsAreEqual(rotationAxisCoordinates[i], origamiCoordinates.points[node])) {
					rotationAxisNodes.push(node);
					break;
				}
			}
		}
		if (rotationAxisNodes.length !== 2) {
			throw new Error('Could not find axis nodes from axis coordinates!');
		}
		return rotationAxisNodes;
	}

	public static findRotationFaces(origamiCoordinates: IOrigamiCoordinates, startNodes: string[], endNodes: string[], rotationAxis: number[][], plane: IPlane): [string[][], IOrigamiCoordinates] {
		// Find start and end faces
		const startFaces = this.findFacesUntilPlaneThatContainNodes(origamiCoordinates.points, origamiCoordinates.faces, startNodes, plane, -1);
		const endFaces = this.findFacesUntilPlaneThatContainNodes(origamiCoordinates.points, origamiCoordinates.faces, endNodes, plane, 1);

		let faceLabels: IFaceLabels = {rotate: MathHelpers.findLogicalPositionOfElementsInArray(origamiCoordinates.faces, startFaces), dontRotate: MathHelpers.findLogicalPositionOfElementsInArray(origamiCoordinates.faces, endFaces), divide: []};
		
		// Find overlaid rotate and don't rotate faces
		faceLabels.rotate = this.sweepNeighborAndOverlaidFacesUntilPlane(origamiCoordinates, faceLabels.rotate, plane, rotationAxis, -1, 1);
		faceLabels.dontRotate = this.sweepNeighborAndOverlaidFacesUntilPlane(origamiCoordinates, faceLabels.dontRotate, plane, rotationAxis, 1, -1);
		faceLabels.divide = MathHelpers.elementWiseAnd(faceLabels.rotate, faceLabels.dontRotate);

		// Crease simultaneous rotate and don't-rotate faces
		[origamiCoordinates, faceLabels] = this.creaseFaces(origamiCoordinates, plane, faceLabels);

		// Find rotate and don't-rotate faces beyond plane?
		faceLabels.dontRotate = this.sweepNeighborFaces(origamiCoordinates, faceLabels.dontRotate, MathHelpers.elementWiseOr(faceLabels.rotate, faceLabels.dontRotate));
		faceLabels.rotate = this.sweepNeighborFaces(origamiCoordinates, faceLabels.rotate, MathHelpers.elementWiseOr(faceLabels.rotate, faceLabels.dontRotate));
		
		// Check if all faces were labeled
		if (MathHelpers.elementWiseAnd(MathHelpers.elementWiseNot(faceLabels.rotate), MathHelpers.elementWiseNot(faceLabels.dontRotate)).some(e => e === true)) {
			throw new Error('Some faces were not labeled as neither rotate or dont-rotate!');
		}

		// Find rotation faces, axis and angle
		const rotateFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, faceLabels.rotate);
		return [rotateFaces, origamiCoordinates];
	}

	public static sweepNeighborFaces(origamiCoordinates: IOrigamiCoordinates, currentFaceLabels: boolean[], previousFaceLabels: boolean[]) {
		// Unpack origami coordinates
		const faces = origamiCoordinates.faces;
		let currentFaceIds = MathHelpers.convertLogicalPositionsToPositions(currentFaceLabels);
		while (currentFaceIds.length > 0) {
			const currentFaceId = currentFaceIds.shift() as number;
			const [_a, sideFaceIds] = this.findNeighborFaces(faces[currentFaceId], faces);
			for (const sideFaceId of sideFaceIds) {
				if (!previousFaceLabels[sideFaceId]) {
					currentFaceLabels[sideFaceId] = true;
				}
			}
		}
		return currentFaceLabels;
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

	public static findFaceAxis(points: IVertices, face: string[]) {
		const ABC = MathHelpers.pickThreeNonCollinearPoints(MathHelpers.indexObject(points, face));
		const o = ABC[0];
		const n = MathHelpers.findPlaneNormalVersor(ABC);
		const u = MathHelpers.findVersorBetweenPoints(ABC[0], ABC[1]);
		const v = MathHelpers.cross(n,u);
		const faceAxis = {o:o, n:n, u:u, v:v};
		return faceAxis;
	}


	public static creaseFaces(origamiCoordinates: IOrigamiCoordinates, plane: IPlane, faceLabels: IFaceLabels): [IOrigamiCoordinates, IFaceLabels]  {
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
		// Set division variables
		let faceToNewFaceCorrespondence: Record<number,number[]> = {};
		let newFaceCount = 0;
		const divideFaceIds = MathHelpers.convertLogicalPositionsToPositions(faceLabels.divide);
		const dontDivideFaceIds = MathHelpers.convertLogicalPositionsToPositions(faceLabels.divide.map(e => !e));
		// Divide faces into subfaces and save correspondence
		for (const f of divideFaceIds) {
			[subFaces, points, faces, newPattern] = this.divideFace(faces[f], points, faces, pattern, plane);
			faceToNewFaceCorrespondence[f] = [];
			for (let j = 0; j < subFaces.length; j++) {
				newFaces.push(subFaces[j]);
				faceToNewFaceCorrespondence[f].push(newFaceCount);
				newFaceCount++;
			}
		}
		// Add faces not meant to be divided 
		for (const f of dontDivideFaceIds) {
			newFaces.push(faces[f]);
			faceToNewFaceCorrespondence[f] = [];
			faceToNewFaceCorrespondence[f].push(newFaceCount);
			newFaceCount++;
		}
		// Update face order
		for (let i = 0; i < faces.length; i++) {
			const subfaceIds = faceToNewFaceCorrespondence[i];
			const contactFaceIds = Object.keys(faceOrder[i]).map(e => {return Number(e)});
			for (let j = 0; j < subfaceIds.length; j++) {
				const subface = newFaces[subfaceIds[j]];
				const subfaceAxis = this.findFaceAxis(points, subface);
				const subface2D = MathHelpers.convertCoplanarPointsTo2D(MathHelpers.indexObject(points, subface), subfaceAxis);
				newFaceOrder[subfaceIds[j]] = {};
				for (let k = 0; k < contactFaceIds.length; k++) {
					const contactFaceSide = faceOrder[i][contactFaceIds[k]];
					const subContactFaceIds = faceToNewFaceCorrespondence[contactFaceIds[k]];
					for (let m = 0; m < subContactFaceIds.length; m++) {
						const contactFace = newFaces[subContactFaceIds[m]];
						const contactFace2D = MathHelpers.convertCoplanarPointsTo2D(MathHelpers.indexObject(points, contactFace), subfaceAxis);
						if (MathHelpers.checkIfCoplanarFacesIntersect(subface2D, contactFace2D)) {
							newFaceOrder[subfaceIds[j]][subContactFaceIds[m]] = contactFaceSide;
						}
					}
				}
			}
		}
		// Update face labels
		const newFaceLabels: IFaceLabels = {rotate: new Array(newFaces.length).fill(false), dontRotate: new Array(newFaces.length).fill(false), divide: []};
		for (let i = 0; i < faces.length; i++) {
			if (faceToNewFaceCorrespondence[i].length > 1) {
				for (let j = 0; j < faceToNewFaceCorrespondence[i].length; j++) {
					const newFaceId = faceToNewFaceCorrespondence[i][j];
					const subFaceSideOfPlane = MathHelpers.findFaceSideOfPlane(newFaces[newFaceId], points, plane);
					if (subFaceSideOfPlane === -1) {
						newFaceLabels.rotate[newFaceId] = true;
						newFaceLabels.dontRotate[newFaceId] = false;
					} else if (subFaceSideOfPlane === 1) {
						newFaceLabels.rotate[newFaceId] = false;
						newFaceLabels.dontRotate[newFaceId] = true;
					} else {
						throw new Error('A subface did not fall into one of the two sides of the plane! It probably intersects it. Check why!');
					}
				}
			} else {
				const newFaceId = faceToNewFaceCorrespondence[i][0];
				newFaceLabels.rotate[newFaceId] = faceLabels.rotate[i];
				newFaceLabels.dontRotate[newFaceId] = faceLabels.dontRotate[i];
			}
		}

		newFaceLabels.divide = MathHelpers.elementWiseAnd(newFaceLabels.rotate, newFaceLabels.dontRotate);
		// Find intersection lines
		// const creaseLines = this.findCreaseLinesFromIntersectionNodes(points, faces, intersectionNodes);
		// Update origami coordinates (effectively crease)
		origamiCoordinates.points = points;
		origamiCoordinates.pattern = newPattern;
		origamiCoordinates.faces = newFaces;
		origamiCoordinates.faceOrder = newFaceOrder;
		return [origamiCoordinates, newFaceLabels];
	}


	public static sweepNeighborAndOverlaidFacesUntilPlane(origamiCoordinates: IOrigamiCoordinates, currentFaceLabels: boolean[], plane: IPlane, rotationAxis: number[][], planeSide: -1|1, axisSense: -1|1) {
		// Unpack origami coordinates
		const points = origamiCoordinates.points;
		const faces = origamiCoordinates.faces;
		let currentFaceIds = MathHelpers.convertLogicalPositionsToPositions(currentFaceLabels);
		while (currentFaceIds.length > 0) {
			const currentFaceId = currentFaceIds.shift() as number;
			const [_a, sideFaceIds] = this.findNeighborFacesBeforePlane(faces[currentFaceId], faces, points, plane, planeSide);
			const [_b, overlaidFaceIds] = this.findOverlaidNeighborFacesBeforePlane(currentFaceId, origamiCoordinates, plane, rotationAxis, planeSide, axisSense);
			const neighborFaceIds = sideFaceIds.concat(overlaidFaceIds);
			for (const neighborFaceId of neighborFaceIds) {
				if (!currentFaceLabels[neighborFaceId]) {
					currentFaceIds.push(neighborFaceId);
					currentFaceLabels[neighborFaceId] = true;
				}
			}
		}
		return currentFaceLabels;
	}

	public static findNeighborFacesBeforeIntersectionLine(startFace: string[], faces: string[][], points: IVertices, plane: IPlane, planeSide: -1|1): [string[][], number[]]  {
		const neighborFaces = [];
		const neighborFaceIds = [];
		for (let i = 0; i < faces.length; i++) {
			const face = faces[i];
			// If face is neighbor, save the common nodes
			const commonNodes = [];
			for (let j = 0; j < face.length; j++) {
				if (startFace.includes(face[j])) {
					commonNodes.push(face[j]);
				}
			}
			// If at least one common  node is before plane, save face
			if (commonNodes.some(e => MathHelpers.findPointSideOfPlane(points[e], plane) === planeSide)) {
				neighborFaces.push(face);
				neighborFaceIds.push(i);
			}
		}
		return [neighborFaces, neighborFaceIds];
	}

	public static findNeighborFacesBeforePlane(startFace: string[], faces: string[][], points: IVertices, plane: IPlane, planeSide: -1|1): [string[][], number[]] {
		const neighborFaces = [];
		const neighborFaceIds = [];
		for (let i = 0; i < faces.length; i++) {
			const face = faces[i];
			const facePlaneSide = MathHelpers.findFaceSideOfPlane(face, points, plane);
			if (MathHelpers.checkIfArrayContainsAnyElement(face, startFace) && !MathHelpers.checkIfArraysAreEqual(face, startFace) && (facePlaneSide === planeSide || facePlaneSide === 0)) {
				neighborFaces.push(face);
				neighborFaceIds.push(i);
			}
		}
		return [neighborFaces, neighborFaceIds];
	}

	public static findOverlaidNeighborFacesBeforePlane(faceId: number, origamiCoordinates: IOrigamiCoordinates, plane: IPlane, axis: number[][], planeSide: number, axisSense: number): [string[][], number[]] {
		// Unpack origami coordinates
		let points = structuredClone(origamiCoordinates.points);
		let faces = [...origamiCoordinates.faces];
		let faceOrder = structuredClone(origamiCoordinates.faceOrder);
		let pattern = structuredClone(origamiCoordinates.pattern);

		// Set axis direction
		if (axisSense === -1) {
			axis = [...axis].reverse();
		}

		// Select sections before plane
		let [subFaces, newPoints] = this.divideFace(faces[faceId], points, faces, pattern, plane);

		// Find faces above sections
		const newContactFaceIds = [];
		const newContactFaces = [];
		for (let i = 0; i < subFaces.length; i++) {
			if (MathHelpers.findFaceSideOfPlane(subFaces[i], newPoints, plane) === planeSide) {
				const overSide = this.findFaceOverSide(subFaces[i], newPoints, axis);

				// TODO: Turn this into one- or two-line that may output [] but not undefined:
				const bothContactFaceIds = Object.keys(faceOrder[faceId]).map(e => {return Number(e)});
				const overContactFaceIds = [];
				for (let j = 0; j < bothContactFaceIds.length; j++) {
					const contactFaceSide = faceOrder[faceId][bothContactFaceIds[j]];
					if (contactFaceSide === overSide) {
						overContactFaceIds.push(bothContactFaceIds[j]);
					}
				}
				const faceAxis = this.findFaceAxis(newPoints, subFaces[i]);
				const subface2D = MathHelpers.convertCoplanarPointsTo2D(MathHelpers.indexObject(newPoints, subFaces[i]), faceAxis);
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

	
	public static findFaceOverSide(face: string[], points: IVertices, axis: number[][]) {
		const faceCenterPoint = MathHelpers.findAveragePoint(MathHelpers.indexObject(points, face));
		const faceNonCollinearThreePoints = MathHelpers.pickThreeNonCollinearPoints(MathHelpers.indexObject(points, face));
		const faceNormalVersor = MathHelpers.findPlaneNormalVersor(faceNonCollinearThreePoints);
		const faceCenterPointProjection = MathHelpers.projectPointOntoLine(faceCenterPoint, axis[0], axis[1])
		const faceCenterToAxisVersor = MathHelpers.findVersorBetweenPoints(faceCenterPoint, faceCenterPointProjection);
		const faceAxisVersor = MathHelpers.findVectorVersor(MathHelpers.cross(faceNormalVersor, faceCenterToAxisVersor));
		const axisVersor = MathHelpers.findVersorBetweenPoints(axis[0], axis[1]);
		const dotResult = MathHelpers.dot(faceAxisVersor, axisVersor);
		const overSide = Math.sign(dotResult);  
		return overSide;  // -1 | 0 | 1
	}


	public static findFacesUntilPlaneThatContainNodes(points: IVertices, faces: string[][], nodes: string[], plane: IPlane, planeSide: -1|1) {
		const facesThatContainNodes = [];
		for (const face of faces) {
			if (MathHelpers.checkIfArrayContainsAnyElement(face, nodes)) {
				if (MathHelpers.findFaceSideOfPlane(face, points, plane) === 0 || MathHelpers.findFaceSideOfPlane(face, points, plane) === planeSide) {
					facesThatContainNodes.push(face);
				}
			}
		}
		return facesThatContainNodes;
	}


	public static findRotationAngle(points: IVertices, startNodes: string[], endNodes: string[], rotationAxis: number[][]): number {
		const tolerance = 0.0001;
		// Find start vector
		let startVector;
		for (let i = 0; i < startNodes.length; i++) {
			const startVectorCandidate = MathHelpers.multiplyArray(MathHelpers.findVectorBetweenPointAndLine(points[startNodes[i]], rotationAxis[0], rotationAxis[1]), -1);
			const startVectorNorm = MathHelpers.findVectorNorm(startVectorCandidate);
			if (startVectorNorm > tolerance) {
				startVector = startVectorCandidate;
			}
		}
		// Find end vector
		let endVector;
		for (let i = 0; i < endNodes.length; i++) {
			const endVectorrCandidate = MathHelpers.multiplyArray(MathHelpers.findVectorBetweenPointAndLine(points[endNodes[i]], rotationAxis[0], rotationAxis[1]), -1);
			const endVectorNorm = MathHelpers.findVectorNorm(endVectorrCandidate);
			if (endVectorNorm > tolerance) {
				endVector = endVectorrCandidate;
			}
		}
		if (startVector === undefined || endVector === undefined) {
			throw new Error('Could not find a non-zero start and end vectors to calculate the rotation angle with!')
		}
		// Find rotation vector
		const rotationVector = MathHelpers.findVectorBetweenPoints(rotationAxis[0], rotationAxis[1]);
		const rotationVersor = MathHelpers.findVectorVersor(rotationVector);
		// Find rotation angle
		const angle = MathHelpers.findAngleBetweenVectorsAroundAxis(startVector, endVector, rotationVersor);
		return angle;
	}


	public static findRotationAxisCoordinates(origamiCoordinates: IOrigamiCoordinates, startNodes: string[], endNodes: string[], sense: 'V'|'M', plane: IPlane) {

		// Unpack origami coordinates
		const points = structuredClone(origamiCoordinates.points);
		const faces = origamiCoordinates.faces;
		const pattern = origamiCoordinates.pattern;

		// Pick start and end nodes
		const startNode = startNodes[0];
		const endNode = endNodes[endNodes.length-1];

		// Find plane-origami intersection lines
		const intersectionLines = this.findIntersectionBetweenPlaneAndEdges(origamiCoordinates, plane);

		// Pick first intersection line as axis line (it's assumed that first intersection line is in a face with the correct orientation 'M'|'V' refers to (the last line should also be))
		const origamiGraph = this.convertOrigamiCoordinatesToGraph(origamiCoordinates);
		const shortestPath = this.findShortestPath(origamiGraph, startNode, endNode);
		const firstIntersectionLine = this.findFirstIntersectionLine(shortestPath, intersectionLines);
		const rotationAxisCoordinates = [firstIntersectionLine[0].coord, firstIntersectionLine[firstIntersectionLine.length-1].coord];

		// Orient axis line
		// Pick first intersected face
		const intersectedFaces = this.findIntersectionLineFaces(points, faces, firstIntersectionLine);
		const intersectedFacesUntilPlane = [];
		for (const intersectedFace of intersectedFaces) {
			const faceSideOfPlane = MathHelpers.findFaceSideOfPlane(intersectedFace, points, plane);
			if (faceSideOfPlane === -1 || faceSideOfPlane === 0) {
				intersectedFacesUntilPlane.push(intersectedFace);
			}
		}
		const intersectedFace = intersectedFacesUntilPlane[0];

		// Find section before plane
		let [subFaces, newPoints] = this.divideFace(intersectedFace, points, faces, pattern, plane);
		let subFaceBeforePlane;
		for (let i = 0; i < subFaces.length; i++) {
			if (MathHelpers.findFaceSideOfPlane(subFaces[i], newPoints, plane) === -1) {
				subFaceBeforePlane = subFaces[i];
			}
		}
		if (subFaceBeforePlane === undefined) {
			throw new Error('No section before plane was found in intersected face. This is necessary to orient rotation axis.');
		}

		// Find axis versor
		const faceCenterPoint = MathHelpers.findAveragePoint(MathHelpers.indexObject(newPoints, subFaceBeforePlane));
		const faceNormalVersor = MathHelpers.findPlaneNormalVersor(MathHelpers.indexObject(newPoints, subFaceBeforePlane));
		const faceCenterPointProjection = MathHelpers.projectPointOntoLine(faceCenterPoint, rotationAxisCoordinates[0], rotationAxisCoordinates[1])
		const faceCenterToAxisVersor = MathHelpers.findVersorBetweenPoints(faceCenterPoint, faceCenterPointProjection);
		let axisVersor = MathHelpers.cross(faceNormalVersor, faceCenterToAxisVersor);

		// Orient axis versor
		if (sense === 'M') {
			axisVersor = MathHelpers.multiplyArray(axisVersor, -1);
		}

		// Orient axis line
		rotationAxisCoordinates.sort(function (n1, n2) { return MathHelpers.dot(n1,axisVersor) - MathHelpers.dot(n2,axisVersor)});
		return rotationAxisCoordinates;
	}

	public static divideFace(face: string[], points: IVertices, faces: string[][], pattern: IVertices, plane: IPlane): [string[][], IVertices, string[][], IVertices] {

		points = structuredClone(points);
		pattern = structuredClone(pattern);
		face = [...face];
		faces = [...faces];

		// Add intersection points to face
		let intersectionPointIds = [];
		[face, points, pattern, intersectionPointIds] = this.addIntersectionPoints(face, points, pattern, plane);
		// Update other faces with new intersection points
		faces = this.addIntersectionPointsToAdjacentFaces(faces, face, intersectionPointIds);
		// Divide face
		const currentFaceNodeId = 0;
		const previousFaceNodeId = -1;
		let subface: string[] = [];
		let subfaces: string[][] = [];
		subfaces = this.divideFaceHelper(face, pattern, intersectionPointIds, currentFaceNodeId, previousFaceNodeId, subface, subfaces);
		// const intersectionNodes = MathHelpers.indexArray(face, intersectionPointIds);
		return [subfaces, points, faces, pattern];
	}


	public static addIntersectionPoints(face: string[], points: IVertices, pattern: IVertices, plane: IPlane): [string[], IVertices, IVertices, number[]] {
		let newFace: string[] = [];
		let intersectionPointIds: number[] = [];
		const intersectedNodes: string[] = [];
		for (let i = 0; i < face.length; i++) {
			newFace.push(face[i]);
			const edge = [face[i], face[(i + 1) % face.length]];
			const lineSegment = { startPoint: points[edge[0]], endPoint: points[edge[1]] };
			const [planeIntersectsLine, intersectionCoord, intersectedVerticeIndex] = MathHelpers.findIntersectionBetweenLineSegmentAndPlane(lineSegment, plane);
			const planeIntersectsNode = intersectedVerticeIndex === 0 || intersectedVerticeIndex === 1;
			if (planeIntersectsLine) {
				if (planeIntersectsNode) {
					const intersectedNode = edge[intersectedVerticeIndex];
					if (!intersectedNodes.includes(intersectedNode)) {
						intersectionPointIds.push((newFace.length - 1 + intersectedVerticeIndex));  // The id will be the last node (k=0) or the next (k=1)
						intersectedNodes.push(intersectedNode);
					}
				} else {
					const newNodeName = this.createNewNodeName(points);
					newFace.push(newNodeName);
					points[newNodeName] = intersectionCoord;
					const intersectionPointDistance = MathHelpers.findDistanceBetweenPoints(points[edge[0]], intersectionCoord);
					const patternEdgeVersor = MathHelpers.findVersorBetweenPoints(pattern[edge[0]], pattern[edge[1]]);
					const patternIntersectionPoint = MathHelpers.addArray(pattern[edge[0]], MathHelpers.multiplyArray(patternEdgeVersor, intersectionPointDistance));
					pattern[newNodeName] = patternIntersectionPoint;
					intersectionPointIds.push((newFace.length - 1)); // The id will be the last node
				}
			}
		}
		// This is to antecipate an error in the case in whick it's the face point last iteration and the "next node" is added. I am not 100% if it is necessary.
		for (let i = 0; i < intersectionPointIds.length; i++) {
			intersectionPointIds[i] = intersectionPointIds[i] % newFace.length;
		}
		// Preserve intersection line point order; If commented, the order will be face edge order.
		if (intersectionPointIds.length > 1) {
			const intersectionVersor = MathHelpers.findVersorBetweenPoints(points[newFace[intersectionPointIds[0]]], points[newFace[intersectionPointIds[1]]]);
			intersectionPointIds.sort(function (p1, p2) {return MathHelpers.dot(points[newFace[p1]],intersectionVersor) - MathHelpers.dot(points[newFace[p2]],intersectionVersor)});
		}
		return [newFace, points, pattern, intersectionPointIds];
	}

	public static addIntersectionPointsToAdjacentFaces(faces: string[][], divideFace: string[], intersectionPointIds: number[]) {
		for (let i = 0; i < faces.length; i++) {
			const face = faces[i];
			const newFace = [];
			for (let j = 0; j < faces[i].length; j++) {
				const edge = [faces[i][j], faces[i][(j + 1) % face.length]];
				newFace.push(edge[0]);
				for (let i = 0; i < intersectionPointIds.length; i++) {
					const divideFaceEdge = [divideFace[(intersectionPointIds[i] - 1 + divideFace.length) % divideFace.length], divideFace[(intersectionPointIds[i] + 1) % divideFace.length]];
					if (MathHelpers.checkIfEdgesAreEqual(edge, divideFaceEdge)) {
						newFace.push(divideFace[intersectionPointIds[i]]);
					}
				}
			}
			faces[i] = newFace;
		}
		return faces;
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
			const nextEdge = [face[currentId % face.length], face[(currentId + 1) % face.length]];
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
					const frontToIntersectionAngle = MathHelpers.findCounterClockwiseAngleBetweenVectors(frontVector, intersectionPointVector);
					const frontToBackAngle = MathHelpers.findCounterClockwiseAngleBetweenVectors(frontVector, backVector); 
					if (frontToIntersectionAngle > 0 + angleTolerance && frontToIntersectionAngle < frontToBackAngle - angleTolerance) {
						return adjacentIntersectionPointId;
					}
				}
			}
		}
		return -1;
	}

	public static createNewNodeName(points: IVertices) {
		const currentNodeNames = Object.keys(points).map((element, k) => element.charCodeAt(0));
		const newNodeName = String.fromCharCode(Math.max(...currentNodeNames) + 1);
		return newNodeName;
	}

	// This only finds faces intersected twice! Faces intersected at only one vertice are not counted. 
	// This is to exclude those at the extremes of the intersection line that may be folded back and hence have an unexpected normal vector.
	public static findIntersectionLineFaces(points: IVertices, faces: string[][], intersectionLine: IintersectionLine) {

		const intersectedFaceIds: number[] = [];
		for (let i = 0; i < intersectionLine.length - 1; i++) {
			const consecutiveEdgesIndexes = [i, i + 1];
			// Find consecutive intersection edges' nodes
			let edgeNodes = [];
			for (let j of consecutiveEdgesIndexes) {
				let intersectionAtNode = false;
				for (let edgeNode of intersectionLine[j].edge) {
					if (MathHelpers.checkIfPointsAreEqual(points[edgeNode], intersectionLine[j].coord)) {
						intersectionAtNode = true;
						edgeNodes.push(edgeNode);
						break;
					}
				}
				if (!intersectionAtNode) {
					for (let edgeNode of intersectionLine[j].edge) {
						edgeNodes.push(edgeNode);
					}
				}
			}
			// Find face intersected by consecutive intersection edges' nodes
			for (let j = 0; j < faces.length; j++) {
				if (MathHelpers.checkIfArrayContainsElements(faces[j], edgeNodes)) {
					if (!intersectedFaceIds.includes(j)) {
						intersectedFaceIds.push(j);
					}
				}
			}
		}
		const intersectedFaces = MathHelpers.indexArray(faces, intersectedFaceIds);
		return intersectedFaces;
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

	public static findIntersectionBetweenPlaneAndEdges(origamiCoordinates: IOrigamiCoordinates, plane: IPlane): {edge: string[]; coord: number[]}[][] {

		// Unpack origami coordinates
		const points = origamiCoordinates.points;
		const faces = origamiCoordinates.faces;

		// Find intersection between plane and the origami edges
		const edges = this.findEdgesFromFaces(faces);
		let intersectionPoints =  [];
		const intersectedVertices: string[] = [];
		for (const edge of edges) {
			const lineSegment = { startPoint: points[edge[0]], endPoint: points[edge[1]] };
			const [planeIntersectsLine, intersectionCoord, intersectedVerticeIndex] = MathHelpers.findIntersectionBetweenLineSegmentAndPlane(lineSegment, plane);
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
		let intersectionPointsFitToLine = new Array(intersectionPoints.length).fill(0);
		const firstIntersectionPoint = intersectionPoints[0];
		for (let i = 0; i < intersectionPoints.length; i++) {
			if (this.checkIfIntersectionPointsFormNewEdge(points, faces, intersectionPoints, 0, i, intersectionPointsFitToLine)) {
				const intersectionVersor = MathHelpers.findVersorBetweenPoints(firstIntersectionPoint.coord, intersectionPoints[i].coord);
				intersectionPoints.sort(function (p1, p2) { return MathHelpers.dot(p1.coord,intersectionVersor) - MathHelpers.dot(p2.coord,intersectionVersor)});
			}
		}
		
		// Find intersection lines
		const intersectionLines = [];
		while (intersectionPointsFitToLine.some(e => e === 0)) {
			// Add first point to intersection line
			let intersectionPoint;
			let intersectionPointPosition;
			const intersectionLine: IintersectionLine = [];
			for (let i = 0; i < intersectionPoints.length; i++) {
				if (this.checkIfIntersectionPointFitsToNewLine(points, faces, intersectionPoints, i, intersectionPointsFitToLine)) {
					intersectionPoint = intersectionPoints[i];
					intersectionLine.push(intersectionPoint);
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
				if (this.checkIfIntersectionPointsFormNewEdge(points, faces, intersectionPoints, intersectionPointPosition, i, intersectionPointsFitToLine)) {
					intersectionLineVersor = MathHelpers.findVersorBetweenPoints(intersectionPoint.coord, intersectionPoints[i].coord);
					intersectionLineVersor = MathHelpers.multiplyArray(intersectionLineVersor, Math.sign(i - intersectionPointPosition));
					break;
				}
			}

			// Find the rest of the intersection line, in case there is a line versor (if not, then the line is the already added single point)
			let intersectionPointsVersor;
			if (intersectionLineVersor !== undefined) {
				for (let i = 0; i < intersectionPoints.length; i++) {
					intersectionPointsVersor = MathHelpers.findVersorBetweenPoints(intersectionPoint.coord, intersectionPoints[i].coord);
					intersectionPointsVersor = MathHelpers.multiplyArray(intersectionPointsVersor, Math.sign(i - intersectionPointPosition));
					if (this.checkIfIntersectionPointsFormNewEdge(points, faces, intersectionPoints, intersectionPointPosition, i, intersectionPointsFitToLine) && MathHelpers.checkIfVersorsHaveTheSameSense(intersectionLineVersor, intersectionPointsVersor)) {
						intersectionPoint = intersectionPoints[i];
						intersectionLine.push(intersectionPoint);
						intersectionPointPosition = i;
						// intersectionPointsFitToLine[i] = 1;
					}
				}
			}

			// Mark intersection line points
			for (let i = 0; i < intersectionLine.length; i++) {
				for (let j = 0; j < intersectionPoints.length; j++) {
					if (intersectionLine[i] === intersectionPoints[j] ) {
						intersectionPointsFitToLine[j] = 1;
						break;
					}
				}
			}

			intersectionLines.push(intersectionLine);
		}
		return intersectionLines;
	}

	public static checkIfIntersectionPointsBelongToSameFace(points: IVertices, faces: string[][], intersectionPoints: {edge: string[]; coord: number[]}[]) {
		const intersectionPointsNeighbors: string[] = [];
		for (let i = 0; i < intersectionPoints.length; i++) {
			intersectionPointsNeighbors.push(...this.findIntersectionPointNeighborNodes(points, intersectionPoints[i]));
		}
		return this.checkIfNodesBelongToSameFace(faces, intersectionPointsNeighbors);
	}

	public static checkIfIntersectionPointFitsToNewLine(points: IVertices, faces: string[][], intersectionPoints: {edge: string[]; coord: number[]}[], i: number, intersectionPointsFitToLine: number[]) {
		if (this.checkIfIntersectionPointFitsToNewEdge(points, faces, intersectionPoints, i, intersectionPointsFitToLine)) return true; // Point fits to new edge
		if (intersectionPointsFitToLine[i] === 0) return true; // Point fits to single-point line
		return false;
	}

	public static checkIfIntersectionPointFitsToNewEdge(points: IVertices, faces: string[][], intersectionPoints: {edge: string[]; coord: number[]}[], i: number, intersectionPointsFitToLine: number[]) {
		for (let j = 0; j < intersectionPoints.length; j++) {
			if (this.checkIfIntersectionPointsFormNewEdge(points, faces, intersectionPoints, i, j, intersectionPointsFitToLine)) {
				return true;
			}
		}
		return false;
	}

	public static checkIfIntersectionPointsFormNewEdge(points: IVertices, faces: string[][], intersectionPoints: {edge: string[]; coord: number[]}[], i: number, j: number, intersectionPointsFitToLine: number[]) {
		if (!MathHelpers.checkIfEdgesAreEqual(intersectionPoints[i].edge, intersectionPoints[j].edge) && this.checkIfIntersectionPointsBelongToSameFace(points, faces, [intersectionPoints[i], intersectionPoints[j]]) && (intersectionPointsFitToLine[i] === 0 || intersectionPointsFitToLine[j] === 0)) {
			return true;
		}
		return false;
	}

	// this.findIntersectionPointNeighborNodes();

	// this.checkIfNodesBelongToSameFace()

	// MathHelpers.checkIfArrayContainsElements

	public static checkIfNodesBelongToSameFace(faces: string[][], nodes: string[]) {
		for (const face of faces) {
			if (MathHelpers.checkIfArrayContainsElements(face, nodes)) {
				return true;
			}
		}
		return false;
	}
	

	public static findIntersectionPointNeighborNodes(points: IVertices, intersectionPoint: {edge: string[]; coord: number[]}) {
		const neighborNodes = [];
		// If intersection point is at node, return node
		for (let i = 0; i < intersectionPoint.edge.length; i++) {
			if (MathHelpers.checkIfPointsAreEqual(points[intersectionPoint.edge[i]], intersectionPoint.coord)) {
				neighborNodes.push(intersectionPoint.edge[i]);
				return neighborNodes;
			}
		}
		for (let i = 0; i < intersectionPoint.edge.length; i++) {
			neighborNodes.push(intersectionPoint.edge[i]);
		}
		return neighborNodes;
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

	// Extract values from instruction
	public static getFoldInstructionValues(parseInstruction: IParseTranslation| IParseRotation, instruction: string) {
		const keys = Object.keys(parseInstruction);
		const match = instruction.match(parseInstruction.regex);
		const values = [];
		for (const key of keys) {
			if (key !== 'regex') {
				let found = false;
				if (key === 'from' || key === 'to' || key === 'axis'){
					const valueArray = [];
					for (const position of parseInstruction[key]) {
						if (match?.[position]) {
							valueArray.push(match[position]);
							found = true;
						}
					}
					values.push(valueArray);
				} else {
				for (const position of parseInstruction[key]) {
					if (match?.[position]) {
						values.push(match[position]);
						found = true;
						break;
					}
				}
				}
				if (found === false) {
					if (key === 'angle') {
						values.push(180);
					} else{
						throw new Error('Could not find all the necessary information in the fold instruction!')
					}
				}
			}
		}
		return values;
	}

	public static findPlaneBetweenNodes(points: IVertices, from: string[], to: string[]): IPlane {
		const [startCoord, endCoord] = this.findTranslationStartAndEndCoord(points, from, to)
		const plane_vector = MathHelpers.findVectorBetweenPoints(startCoord, endCoord);
		const plane_point = MathHelpers.addVectorToPoint(startCoord, MathHelpers.multiplyArray(plane_vector, 0.5));
		const plane_versor = MathHelpers.findVectorVersor(plane_vector);
		const plane = { point: plane_point, versor: plane_versor };
		return plane;
	}

	public static findTranslationStartAndEndCoord(points: IVertices, from:string[], to: string[]){
		let startCoord;
		let endCoord;
		if (from.length == 1 && to.length == 1) {
			startCoord = points[from[0]];
			endCoord = points[to[0]];
		} else if (from.length == 1 && to.length == 2) {
			startCoord = points[from[0]];
			const endPoints = MathHelpers.indexObject(points, to);
			const endVersor = MathHelpers.findVersorBetweenPoints(endPoints[0], endPoints[1]);
			const startNorm = MathHelpers.findDistanceBetweenPoints(startCoord, endPoints[0]);
			endCoord = MathHelpers.addVectorToPoint(endPoints[0], MathHelpers.multiplyArray(endVersor, startNorm));
		} else if (from.length == 2 && to.length == 2) {
			startCoord = points[from[0]];
			const endPoints = MathHelpers.indexObject(points, to);
			endCoord = MathHelpers.projectPointOntoLine(endPoints[0], endPoints[1], startCoord);
		} else {
			throw new Error('The instruction is not valid. Try again!')
		}
		return [startCoord, endCoord]
	}

}