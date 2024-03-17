import { join } from 'path';
import { MathHelpers } from './math-helpers';
import { IMeshInstruction, IParseTranslation, IParseRotation, TranslationKeys, IVertices, TranslationValues, IOrigamiCoordinates, IPlane, IOrigamiGraph, IintersectionLine, IFaceRotationInstruction, IFaceGraph, IFaceLabels} from './origami-types';

export class FoldSolver {

	public static solveTranslation(origamiCoordinates: IOrigamiCoordinates, instruction: string, translation: IParseTranslation, tolerance: number): [IOrigamiCoordinates, IFaceRotationInstruction] {
		// Get instruction values
		const { startNodes, endNodes, sense } = this.getFoldInstructionValues(['from', 'to', 'sense'], translation, instruction);

		// Find plane between start and end points
		const plane = this.findPlaneBetweenNodes(origamiCoordinates.points, startNodes, endNodes);

		// Find rotation faces, axis and angle
		const faceRotationInstruction = this.createFaceRotationInstructions(origamiCoordinates, startNodes, endNodes, sense, plane);

		// Rotate points
		origamiCoordinates = this.rotateFaces(origamiCoordinates, faceRotationInstruction);

		return [origamiCoordinates, faceRotationInstruction];
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

	// Extract values from instruction
	public static getFoldInstructionValues(array: TranslationKeys[],translation: IParseTranslation,instruction: string): TranslationValues {
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
			const to_points = MathHelpers.indexObject(points, to);
			const to_versor = MathHelpers.findVersorBetweenPoints(to_points[0], to_points[1]);
			const from_norm = MathHelpers.findDistanceBetweenPoints(startCoord, to_points[0]);
			endCoord = MathHelpers.addVectorToPoint(to_points[0], MathHelpers.multiplyArray(to_versor, from_norm));
		} else if (from.length == 2 && to.length == 2) {
			startCoord = points[from[0]];
			const to_points = MathHelpers.indexObject(points, to);
			endCoord = MathHelpers.projectPointOntoLine(to_points[0], to_points[1], startCoord);
		} else {
			throw new Error('The instruction is not valid. Try again!')
		}
		return [startCoord, endCoord]
	}

	public static createFaceRotationInstructions(origamiCoordinates: IOrigamiCoordinates, startNodes: string[], endNodes: string[], sense: 'V'|'M', plane: IPlane) {

		// Find start and end faces
		const startFaces = this.findFacesUntilPlaneThatContainNodes(origamiCoordinates.points, origamiCoordinates.faces, startNodes, plane, -1);
		const endFaces = this.findFacesUntilPlaneThatContainNodes(origamiCoordinates.points, origamiCoordinates.faces, endNodes, plane, 1);

		// Find rotate and don't-rotate faces
		let faceLabels: IFaceLabels = {rotate: MathHelpers.findLogicalPositionOfElementsInArray(origamiCoordinates.faces, startFaces), dontRotate: MathHelpers.findLogicalPositionOfElementsInArray(origamiCoordinates.faces, endFaces), divide: []};
		faceLabels.rotate = this.sweepNeighborFacesUntilPlane(origamiCoordinates, faceLabels.rotate, plane, -1);  // EXCLUDING IT: Neighbor faces must be totally before plane
		faceLabels.dontRotate = this.sweepNeighborFacesUntilPlane(origamiCoordinates, faceLabels.dontRotate, plane, 1);
		faceLabels.divide = MathHelpers.elementWiseAnd(faceLabels.rotate, faceLabels.dontRotate);
		
		// Crease simultaneous rotate and don't-rotate faces
		[origamiCoordinates, faceLabels] = this.creaseFaces(origamiCoordinates, plane, faceLabels);

		// Find overlaid rotate and don't rotate faces
		const rotationAxis = this.findRotationAxisFromFaceLabels(origamiCoordinates.points, origamiCoordinates.faces, sense, faceLabels);
		faceLabels.rotate = this.sweepNeighborAndOverlaidFacesUntilPlane(origamiCoordinates, faceLabels.rotate, plane, rotationAxis, -1, 1);
		faceLabels.dontRotate = this.sweepNeighborAndOverlaidFacesUntilPlane(origamiCoordinates, faceLabels.dontRotate, plane, rotationAxis, 1, -1);
		faceLabels.divide = MathHelpers.elementWiseAnd(faceLabels.rotate, faceLabels.dontRotate);

		// Crease simultaneous rotate and don't-rotate faces
		[origamiCoordinates, faceLabels] = this.creaseFaces(origamiCoordinates, plane, faceLabels);

		// Find rotate and don't-rotate faces beyond plane?
		faceLabels.rotate = this.sweepNeighborFaces(origamiCoordinates, faceLabels.rotate, MathHelpers.elementWiseOr(faceLabels.rotate, faceLabels.dontRotate));
		faceLabels.dontRotate = this.sweepNeighborFaces(origamiCoordinates, faceLabels.dontRotate, MathHelpers.elementWiseOr(faceLabels.rotate, faceLabels.dontRotate));
		
		// Check if all faces were labeled
		if (MathHelpers.elementWiseAnd(MathHelpers.elementWiseNot(faceLabels.rotate), MathHelpers.elementWiseNot(faceLabels.dontRotate)).some(e => e === true)) {
			throw new Error('Some faces were not labeled as neither rotate or dont-rotate!');
		}
	
		// Find rotation faces, axis and angle
		const rotationAngle = this.findRotationAngle(origamiCoordinates.points, startNodes, endNodes, rotationAxis);
		const rotateFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, faceLabels.rotate);
		const faceRotationInstructions = { faces: rotateFaces, axis: rotationAxis, angle: rotationAngle };
		return faceRotationInstructions;
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

	public static sweepNeighborAndOverlaidFacesUntilPlane(origamiCoordinates: IOrigamiCoordinates, currentFaceLabels: boolean[], plane: IPlane, rotationAxis: string[], planeSide: -1|1, axisSense: -1|1) {
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

	public static sweepNeighborFacesUntilPlane(origamiCoordinates: IOrigamiCoordinates, faceLabels: boolean[], plane: IPlane, planeSide: -1|1) {
		// Unpack origami coordinates
		const points = origamiCoordinates.points;
		const faces = origamiCoordinates.faces;
		let faceIds = MathHelpers.convertLogicalPositionsToPositions(faceLabels);
		while (faceIds.length > 0) {
			const faceId = faceIds.shift() as number;
			faceLabels[faceId] = true;
			const [_, neighborFaceIds] = this.findNeighborFaces(faces[faceId], faces);
			for (const neighborFaceId of neighborFaceIds) {
				// If neighbor has not been selected and it is not beyond plane
				if (faceLabels[neighborFaceId] === false && (MathHelpers.findFaceSideOfPlane(faces[neighborFaceId], points, plane) === planeSide)) {
					faceIds.push(neighborFaceId);
				}
			}
		}
		return faceLabels;
	}


	public static findRotationAngle(points: IVertices, startNodes: string[], endNodes: string[], rotationAxis: string[]): number {
		const tolerance = 0.0001;
		// Find start vector
		let startVector;
		for (let i = 0; i < startNodes.length; i++) {
			const startVectorCandidate = MathHelpers.multiplyArray(MathHelpers.findVectorBetweenPointAndLine(points[startNodes[i]], points[rotationAxis[0]], points[rotationAxis[1]]), -1);
			const startVectorNorm = MathHelpers.findVectorNorm(startVectorCandidate);
			if (startVectorNorm > tolerance) {
				startVector = startVectorCandidate;
			}
		}
		// Find end vector
		let endVector;
		for (let i = 0; i < endNodes.length; i++) {
			const endVectorrCandidate = MathHelpers.multiplyArray(MathHelpers.findVectorBetweenPointAndLine(points[endNodes[i]], points[rotationAxis[0]], points[rotationAxis[1]]), -1);
			const endVectorNorm = MathHelpers.findVectorNorm(endVectorrCandidate);
			if (endVectorNorm > tolerance) {
				endVector = endVectorrCandidate;
			}
		}
		if (startVector === undefined || endVector === undefined) {
			throw new Error('Could not find a non-zero start and end vectors to calculate the rotation angle with!')
		}
		// Find rotation vector
		const rotationVector = MathHelpers.findVectorBetweenPoints(points[rotationAxis[0]], points[rotationAxis[1]]);
		const rotationVersor = MathHelpers.findVectorVersor(rotationVector);
		// Find rotation angle
		const angle = MathHelpers.findAngleBetweenVectorsAroundAxis(startVector, endVector, rotationVersor);
		return angle;
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


	public static findOverlaidFacesBeforePlane(directRotationFaces: string[][], origamiCoordinates: IOrigamiCoordinates, plane: IPlane, intersectionLines: IintersectionLine[], rotationAxis: string[], planeSide: number, axisSense: number) {
		// Unpack origami coordinates
		const faces = origamiCoordinates.faces;
		const faceOrder = origamiCoordinates.faceOrder;
		// Set array to store sweeping information
		const sweptFaceLabels = new Array(faces.length).fill(false);
		// Convert start faces to ids to improve performance
		let startFaceIds: number[] = [];
		let overlaidFaceIds: number[] = [];
		directRotationFaces.forEach((e) => startFaceIds.push(MathHelpers.findPositionOfArrayInArray(e, faces)));
		while (startFaceIds.length > 0) {
			const startFaceId = startFaceIds.shift() as number;
			sweptFaceLabels[startFaceId] = true;
			const [_, contactFaceIds] = this.findOverlaidNeighborFacesBeforePlane(startFaceId, origamiCoordinates, plane, rotationAxis, planeSide, axisSense)
			for (let i = 0; i < contactFaceIds.length; i++) {
				if (!overlaidFaceIds.includes(contactFaceIds[i])) {
					overlaidFaceIds.push(contactFaceIds[i])
				}
				if (sweptFaceLabels[contactFaceIds[i]] === false) {
					startFaceIds.push(contactFaceIds[i]);
				}
			}
		}
		// return MathHelpers.logicallyIndexArray(faces, sweptFaceLabels);
		return MathHelpers.indexArray(faces, overlaidFaceIds);  // This is to output strictly the faces that are overlaid! (not the start no-overlaid ones as well)

	}


	public static findOverlaidNeighborFacesBeforePlane(faceId: number, origamiCoordinates: IOrigamiCoordinates, plane: IPlane, axis: string[], planeSide: number, axisSense: number): [string[][], number[]] {
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


	public static findRotationAxisFromFaceLabels(points: IVertices, faces: string[][], sense: 'V'|'M', faceLabels: IFaceLabels) {

		// Find rotation axis edge
		const faceRotateIds = MathHelpers.convertLogicalPositionsToPositions(faceLabels.rotate);
		const faceDontRotateIds = MathHelpers.convertLogicalPositionsToPositions(faceLabels.dontRotate);
		let rotationAxisFace;
		let rotationAxisEdge;
		for (let i = 0; i < faceRotateIds.length; i++) {
			for (let j = 0; j < faces[i].length; j++) {
				const edge = [faces[i][j], faces[i][(j + 1) % faces[i].length]];
				for (let k = 0; k < faceDontRotateIds.length; k++) {
					if (MathHelpers.checkIfFaceContainsEdge(faces[k], edge)) {
						rotationAxisFace = faces[k];
						rotationAxisEdge = edge;
						break;
					}	
				}
			}
		}
		if (rotationAxisEdge === undefined || rotationAxisFace === undefined) {
			throw new Error('Could not find edge at the rotation axis!')
		}

		// Find axis versor
		const faceCenterPoint = MathHelpers.findAveragePoint(MathHelpers.indexObject(points, rotationAxisFace));
		const faceNormalVersor = MathHelpers.findPlaneNormalVersor(MathHelpers.indexObject(points, rotationAxisFace));
		const faceCenterPointProjection = MathHelpers.projectPointOntoLine(faceCenterPoint, points[rotationAxisEdge[0]], points[rotationAxisEdge[1]])
		const faceCenterToAxisVersor = MathHelpers.findVersorBetweenPoints(faceCenterPoint, faceCenterPointProjection);
		let axisVersor = MathHelpers.cross(faceNormalVersor, faceCenterToAxisVersor);

		// Orient axis versor
		if (sense === 'M') {
			axisVersor = MathHelpers.multiplyArray(axisVersor, -1);
		}

		// Sort edge nodes along axis versor
		rotationAxisEdge.sort(function (n1, n2) { return MathHelpers.dot(points[n1],axisVersor) - MathHelpers.dot(points[n2],axisVersor)});
		
		// Pick edge nodes as axis nodes
		const axis = rotationAxisEdge;
		return axis;
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



	// let divideFaceIds = MathHelpers.convertLogicalPositionsToPositions(faceLabels.divide);
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

		// for (let i = 0; i < faces.length; i++) {
		// 	if (faceToNewFaceCorrespondence[i].length > 1) {
		// 		for (let j = 0; j < faceToNewFaceCorrespondence[i].length; j++) {
		// 			const subFaceSideOfPlane = MathHelpers.findFaceSideOfPlane(newFaces[faceToNewFaceCorrespondence[i][j]], points, plane);
		// 			if (subFaceSideOfPlane === -1) {
		// 				newFaceLabels.rotate.push(true);
		// 				newFaceLabels.dontRotate.push(false);
		// 			} else if (subFaceSideOfPlane === 1) {
		// 				newFaceLabels.rotate.push(false);
		// 				newFaceLabels.dontRotate.push(true);
		// 			} else {
		// 				throw new Error('A subface did not fall into one of the two sides of the plane! It probably intersects it. Check why!');
		// 			}
		// 		}
		// 	} else {
		// 		newFaceLabels.rotate.push(faceLabels.rotate[faceToNewFaceCorrespondence[i][0]]);
		// 		newFaceLabels.dontRotate.push(faceLabels.dontRotate[faceToNewFaceCorrespondence[i][0]]);
		// 	}
		// }
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

	// public static findCreaseLinesFromIntersectionNodes(points, faces, intersectionNodes) {}

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


	// public static sweepFacesUntilPlane(startFaces: string[][], origamiCoordinates: IOrigamiCoordinates, plane: IPlane, planeSide: -1|1): boolean[] {
	// 	// Unpack origami coordinates
	// 	const points = origamiCoordinates.points;
	// 	const faces = origamiCoordinates.faces;
	// 	// Set array to store sweeping information
	// 	const sweptFaceLabels = new Array(faces.length).fill(false);
	// 	// Convert start faces to ids to improve performance
	// 	let startFaceIds = [];
	// 	for (const startFace of startFaces){
	// 		startFaceIds.push(MathHelpers.findPositionOfArrayInArray(startFace, faces));
	// 	}
	// 	while (startFaceIds.length > 0) {
	// 		const startFaceId = startFaceIds.shift() as number;
	// 		sweptFaceLabels[startFaceId] = true;
	// 		const [_, neighborFaceIds] = this.findNeighborFaces(faces[startFaceId], faces);
	// 		for (const neighborFaceId of neighborFaceIds) {
	// 			// If neighbor has not been selected and it is not beyond plane
	// 			if (sweptFaceLabels[neighborFaceId] === false && MathHelpers.findFaceSideOfPlane(faces[neighborFaceId], points, plane) === planeSide) {
	// 				startFaceIds.push(neighborFaceId);
	// 			}
	// 		}
	// 	}
	// 	return sweptFaceLabels;
	// }


	// public static createFaceRotationInstructionsOld(fromNodes: string[], toNodes: string[], sense: 'V'|'M', origamiCoordinates: IOrigamiCoordinates, plane: IPlane, intersectionLines: IintersectionLine[]){
	// 	// Unpack start and end nodes
	// 	const fromNode = fromNodes[0];
	// 	const toNode = toNodes[toNodes.length-1];

	// 	// Find the first intersection line and crease origami
	// 	const origamiGraph = this.convertOrigamiCoordinatesToGraph(origamiCoordinates);
	// 	const shortestPath = this.findShortestPath(origamiGraph, fromNode, toNode);
	// 	const firstIntersectionLine = this.findFirstIntersectionLine(shortestPath, intersectionLines);
	// 	origamiCoordinates = this.creaseOrigami(origamiCoordinates, firstIntersectionLine);

	// 	// Find faces that will directly rotate or not rotate (by being connected to a start or end node, respectively)
	// 	const startFaces = this.findFacesThatContainNodes(origamiCoordinates.faces, [fromNode])
	// 	const endFaces = this.findFacesThatContainNodes(origamiCoordinates.faces, [toNode])
	// 	let faceLabels: {rotate: boolean[], dontRotate: boolean[], divide: boolean[]} = {rotate:[], dontRotate:[], divide:[]};
	// 	faceLabels.rotate = this.sweepFacesUntilPlane(startFaces, origamiCoordinates, plane, -1);  // The plane side = 1 could probably be infered if we started sweeping from node instead of face
	// 	faceLabels.dontRotate = this.sweepFacesUntilPlane(endFaces, origamiCoordinates, plane, 1);
	// 	faceLabels.divide  = MathHelpers.elementWiseAnd(faceLabels.rotate, faceLabels.dontRotate);
	// 	let directRotationFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, faceLabels.rotate);
	// 	let directNoRotationFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, faceLabels.dontRotate);
	// 	const intersectionNodes = this.findIntersectionLineNodes(origamiCoordinates, firstIntersectionLine);
	// 	const rotationAxis = this.findRotationAxis(origamiCoordinates, sense, intersectionNodes, faceLabels);

	// 	// Find faces that will indirectly rotate or not rotate (by being overlaid on a start or end node, respectively)
	// 	let startOverlaidFaces = this.findOverlaidFacesBeforePlane(directRotationFaces, origamiCoordinates, plane, intersectionLines, rotationAxis, -1, 1);
	// 	let endOverlaidFaces = this.findOverlaidFacesBeforePlane(directNoRotationFaces, origamiCoordinates, plane, intersectionLines, rotationAxis, 1, -1);
	// 	let overlaidFaceLabels: {rotate: boolean[], dontRotate: boolean[], divide: boolean[]} = {rotate:[], dontRotate:[], divide:[]};
	// 	overlaidFaceLabels.rotate = this.sweepFacesUntilPlane(startOverlaidFaces, origamiCoordinates, plane, -1);  // The plane side = 1 could probably be infered if we started sweeping from node instead of face
	// 	overlaidFaceLabels.dontRotate = this.sweepFacesUntilPlane(endOverlaidFaces, origamiCoordinates, plane, 1);
	// 	overlaidFaceLabels.divide  = MathHelpers.elementWiseAnd(overlaidFaceLabels.rotate, overlaidFaceLabels.dontRotate);

	// 	// todo: fix infinite loop inside crease origami (I thinkk it's polygon function)
	// 	// todo: decide if unite labels. divide. label the rest of the faces.
	// 	// Maybe the crease should be applied to a face individually...
	// 	const coincidentLines = this.selectCoincidentLines(intersectionLines, firstIntersectionLine);
	// 	const divideFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, overlaidFaceLabels.divide);
	// 	for (const intersectionLine of intersectionLines) {
	// 		for (const divideFace of divideFaces) {
	// 			const faceIntersectionLine = this.findIntersectionLineFromFace(divideFace, coincidentLines);
	// 			if (this.checkIfIntersectionLinesAreEqual(intersectionLine, faceIntersectionLine)) {
	// 				origamiCoordinates = this.creaseOrigami(origamiCoordinates, intersectionLine);
	// 				break;
	// 			}
	// 		}
	// 	}

	// 	// Try to avoid repeating:
	// 	faceLabels = {rotate:[], dontRotate:[], divide:[]};
	// 	faceLabels.rotate = this.sweepFacesUntilPlane(startFaces, origamiCoordinates, plane, -1);  // The plane side = 1 could probably be infered if we started sweeping from node instead of face
	// 	faceLabels.dontRotate = this.sweepFacesUntilPlane(endFaces, origamiCoordinates, plane, 1);
	// 	faceLabels.divide  = MathHelpers.elementWiseAnd(faceLabels.rotate, faceLabels.dontRotate);
	// 	directRotationFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, faceLabels.rotate);
	// 	directNoRotationFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, faceLabels.dontRotate);
	// 	startOverlaidFaces = this.findOverlaidFacesBeforePlane(directRotationFaces, origamiCoordinates, plane, intersectionLines, rotationAxis, -1, 1);
	// 	endOverlaidFaces = this.findOverlaidFacesBeforePlane(directNoRotationFaces, origamiCoordinates, plane, intersectionLines, rotationAxis, 1, -1);
	// 	overlaidFaceLabels = {rotate:[], dontRotate:[], divide:[]};
	// 	overlaidFaceLabels.rotate = this.sweepFacesUntilPlane(startOverlaidFaces, origamiCoordinates, plane, -1);  // The plane side = 1 could probably be infered if we started sweeping from node instead of face
	// 	overlaidFaceLabels.dontRotate = this.sweepFacesUntilPlane(endOverlaidFaces, origamiCoordinates, plane, 1);
	// 	overlaidFaceLabels.divide  = MathHelpers.elementWiseAnd(overlaidFaceLabels.rotate, overlaidFaceLabels.dontRotate);

	// 	let directAndOverlaidFaceLabels: {rotate: boolean[], dontRotate: boolean[], divide: boolean[]} = {rotate:[], dontRotate:[], divide:[]};
	// 	directAndOverlaidFaceLabels.rotate = MathHelpers.elementWiseAnd(faceLabels.rotate, overlaidFaceLabels.rotate);
	// 	directAndOverlaidFaceLabels.dontRotate = MathHelpers.elementWiseAnd(faceLabels.dontRotate, overlaidFaceLabels.dontRotate);
	// 	directAndOverlaidFaceLabels.divide = MathHelpers.elementWiseAnd(faceLabels.divide, overlaidFaceLabels.divide);
	// 	let rotationFaces = MathHelpers.logicallyIndexArray(origamiCoordinates.faces, directAndOverlaidFaceLabels.rotate);

		
	// 	debugger;
	// 	//

	// 	const faceRotationInstructions = {faces: [['a','b','c','d']], axis: ['e','f'], angle: 180};
	// 	return faceRotationInstructions;
	// }







	
	// public static creaseOrigamiOld(origamiCoordinates: IOrigamiCoordinates, intersectionLine: IintersectionLine)  {
	// 	// Unpack origami coordinates
	// 	let points = origamiCoordinates.points;
	// 	let pattern = origamiCoordinates.pattern;
	// 	let faces = origamiCoordinates.faces;
	// 	let faceOrder = origamiCoordinates.faceOrder;
	// 	// Set new origami coordinates
	// 	let newFaces = [];
	// 	let newPattern = {};
	// 	let newFaceOrder: IFaceGraph = {};
	// 	let subFaces;
	// 	// Divide each face
	// 	let faceToNewFaceCorrespondence: Record<number,number[]> = {};
	// 	let subFaceCount = 0;
	// 	for (let i = 0; i < faces.length; i++) {
	// 		[subFaces, points, newPattern] = this.divideFace(faces[i], points, pattern, intersectionLine);
	// 		faceToNewFaceCorrespondence[i] = [];
	// 		for (let j = 0; j < subFaces.length; j++) {
	// 			newFaces.push(subFaces[j]);
	// 			faceToNewFaceCorrespondence[i].push(subFaceCount);
	// 			subFaceCount++;
	// 		}
	// 	}
	// 	// Update face order
	// 	for (let i = 0; i < faces.length; i++) {
	// 		const subfaceIds = faceToNewFaceCorrespondence[i];
	// 		const contactFaceIds = Object.keys(faceOrder[i]).map(e => {return Number(e)});
	// 		for (let j = 0; j < subfaceIds.length; j++) {
	// 			const subface = newFaces[subfaceIds[j]];
	// 			const subfaceAxis = this.findFaceAxis(points, subface);
	// 			const subface2D = MathHelpers.convertCoplanarPointsTo2D(MathHelpers.indexObject(points, subface), subfaceAxis);
	// 			newFaceOrder[subfaceIds[j]] = {};
	// 			for (let k = 0; k < contactFaceIds.length; k++) {
	// 				const contactFaceSide = faceOrder[i][contactFaceIds[k]];
	// 				const subContactFaceIds = faceToNewFaceCorrespondence[contactFaceIds[k]];
	// 				for (let m = 0; m < subContactFaceIds.length; m++) {
	// 					const contactFace = newFaces[subContactFaceIds[m]];
	// 					const contactFace2D = MathHelpers.convertCoplanarPointsTo2D(MathHelpers.indexObject(points, contactFace), subfaceAxis);
	// 					if (MathHelpers.checkIfCoplanarFacesIntersect(subface2D, contactFace2D)) {
	// 						newFaceOrder[subfaceIds[j]][subContactFaceIds[m]] = contactFaceSide;
	// 					}
	// 				}
	// 			}
	// 		}
	// 	}
	// 	// Update origami coordinates
	// 	origamiCoordinates.points = points;
	// 	origamiCoordinates.pattern = newPattern;
	// 	origamiCoordinates.faces = newFaces;
	// 	origamiCoordinates.faceOrder = newFaceOrder;
	// 	return origamiCoordinates;
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





	//




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




	// 		const faceId = MathHelpers.findPositionOfArrayInArray(startFaces[0], origamiCoordinates.faces);
	//      


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
		const faceNonCollinearThreePoints = MathHelpers.pickThreeNonCollinearPoints(MathHelpers.indexObject(points, face));
		const faceNormalVersor = MathHelpers.findPlaneNormalVersor(faceNonCollinearThreePoints);
		const faceCenterPointProjection = MathHelpers.projectPointOntoLine(faceCenterPoint, points[axis[0]], points[axis[1]])
		const faceCenterToAxisVersor = MathHelpers.findVersorBetweenPoints(faceCenterPoint, faceCenterPointProjection);
		const faceAxisVersor = MathHelpers.findVectorVersor(MathHelpers.cross(faceNormalVersor, faceCenterToAxisVersor));
		const axisVersor = MathHelpers.findVersorBetweenPoints(points[axis[0]], points[axis[1]]);
		const dotResult = MathHelpers.dot(faceAxisVersor, axisVersor);
		const overSide = Math.sign(dotResult);  
		return overSide;  // -1 | 0 | 1
	}




	//







	public static findIntersectionBetweenPlaneAndEdges(origamiCoordinates: IOrigamiCoordinates, plane: IPlane): {edge: string[]; coord: number[]}[][] {
		// Find intersection between plane and the origami edges
		const edges = this.findEdgesFromFaces(origamiCoordinates.faces);
		let intersectionPoints =  [];
		const intersectedVertices: string[] = [];
		for (const edge of edges) {
			const lineSegment = { startPoint: origamiCoordinates.points[edge[0]], endPoint: origamiCoordinates.points[edge[1]] };
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
			if (MathHelpers.checkIfPointsAreCollinear(points)){
				coincidentLines.push(intersectionLine);
			}
		}
		return coincidentLines;
	}

	// public static checkIfPointsAreCollinear(points: number[][]): boolean {
	// 	const tolerance = 0.00001;
	// 	const nonCoincidentPoints = [];
	// 	for (let i = 1; i < points.length; i++) {
	// 		const distance = MathHelpers.findDistanceBetweenPoints(points[0], points[i]);
	// 		if (distance > tolerance) {
	// 			nonCoincidentPoints.push(points[0]);
	// 			nonCoincidentPoints.push(points[i]);
	// 			break;
	// 		}
	// 	}
	// 	if (nonCoincidentPoints.length > 0) {
	// 		const lineVersor = MathHelpers.findVersorBetweenPoints(nonCoincidentPoints[0], nonCoincidentPoints[1]);
	// 		points.sort(function (p1, p2) { return MathHelpers.dot(p1,lineVersor) - MathHelpers.dot(p2,lineVersor)});
	// 		for (let i = 0; i < points.length - 1; i++) {
	// 			const pointVersor = MathHelpers.findVersorBetweenPoints(points[i], points[i+1]);
	// 			// If points are not coincident and are not collinear to line versor, the complete set of points is not collinear
	// 			if (MathHelpers.findDistanceBetweenPoints(points[i], points[i+1]) >  tolerance && MathHelpers.dot(lineVersor, pointVersor) < 1 - tolerance) {
	// 				return false;
	// 			}
	// 		}
	// 	}
	// 	return true;
	// }

	// public static sortIntersectionLines(origamiCoordinates: IOrigamiCoordinates, sense: 'M'|'V', plane: IPlane, coincidentLines: IintersectionLine[], firstIntersectionLine: IintersectionLine) {

	// 	// const rotationForwardVersor = ;
	// 	// const rotationUpVersor = ;  // Projeção da normal da face de cá da primeira linha de interseção, com o plane. (utilizar o mathhelpers.projectVectorOntoPlane()). Talvez utilizar o rotation forward versor para escolher a face que tenha a primeira interseção e que tenha pelo menos uma letra para cá (sentido contrario ao planeforwardversor) do plano)
	// 	const sortedLinesIndexes = [];
	// 	for (let i = 0; i < coincidentLines.length; i++) {

	// 	}
	// }





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
		let overlaidFaceIds: number[] = [];
		directRotationFaces.forEach((e) => startFaceIds.push(MathHelpers.findPositionOfArrayInArray(e, faces)))
		while (startFaceIds.length > 0) {
			const startFaceId = startFaceIds.shift() as number;
			sweptFaceLabels[startFaceId] = true;
			const [_, contactFaceIds] = this.findOverlaidNeighborFacesBeforePlane(startFaceId, origamiCoordinates, plane, rotationAxis, planeSide, axisSense)
			for (let i = 0; i < contactFaceIds.length; i++) {
				if (sweptFaceLabels[contactFaceIds[i]] === false) {
					startFaceIds.push(contactFaceIds[i]);
					overlaidFaceIds.push(contactFaceIds[i])
				}
			}
		}
		// return MathHelpers.logicallyIndexArray(faces, sweptFaceLabels);
		return MathHelpers.indexArray(faces, overlaidFaceIds);  // This is to output strictly the faces that are overlaid! (not the start no-overlaid ones as well)

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

	public static findFaceAxis(points: IVertices, face: string[]) {
		const ABC = MathHelpers.pickThreeNonCollinearPoints(MathHelpers.indexObject(points, face));
		const o = ABC[0];
		const n = MathHelpers.findPlaneNormalVersor(ABC);
		const u = MathHelpers.findVersorBetweenPoints(ABC[0], ABC[1]);
		const v = MathHelpers.cross(n,u);
		const faceAxis = {o:o, n:n, u:u, v:v};
		return faceAxis;
	}

	public static updateFaceOrder() {


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


	public static solveRotation(origamiCoordinates: IOrigamiCoordinates, instruction: string, rotation: IParseRotation, tolerance: number): [IOrigamiCoordinates, IFaceRotationInstruction] {
		// Set place-holder
		const meshInstruction = { faces: [['a', 'e', 'b', 'd']], axis: ['a', 'b'], angle: 90 };
		return [origamiCoordinates, meshInstruction];
	}


};