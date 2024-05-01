import * as THREE from 'three';
import { FoldSolver } from './fold-solver';
import {
  IMeshInstruction,
  IParseTranslation,
  IParseRotation,
  IOrigamiCoordinates,
  IOrigamiMesh,
  IFaceRotationInstruction,
  IParsingInstruction
} from './origami-types';
import { OrigamiGenerator } from './origami-coordinates-generator';
import { MathHelpers } from './math-helpers';

export class OrigamiSolver {
  public static solveOrigami(
    foldInstructions: string[]
  ): [IOrigamiMesh[], IMeshInstruction[], string[][][], string[][], IOrigamiCoordinates[]] {
    // Set parsing instructions
    const parsingInstructions = this.setParsingInstructions();

    // Parse paper dimensions
    const paperDimensionsInstruction = foldInstructions.shift() as string;
    const [xDim, yDim] = this.parsePaperDimensions(paperDimensionsInstruction, parsingInstructions);

    // Set origami coordinates
    let origamiCoordinates = OrigamiGenerator.generateOrigamiCoordinates(xDim, yDim, 0); // 8

    // Set rotation reports
    let faceRotationInstruction: IFaceRotationInstruction;
    let faceRotationInstructions = [];

    const origamiCoordinatesSave: IOrigamiCoordinates[] = [];
    const pointInstructions = [this.getOrigamiCoordinatesNodes(origamiCoordinates)];

    // Execute fold instructions
    for (const instruction of foldInstructions) {
      console.log(instruction);

      // Execute fold instruction
      [origamiCoordinates, faceRotationInstruction] = this.solveInstruction(
        origamiCoordinates,
        parsingInstructions,
        instruction
      );

      // Save instruction used to rotate points
      faceRotationInstructions.push(faceRotationInstruction);

      // Save origami coordinates until we don't have a way to save points with meshes
      origamiCoordinatesSave.push(structuredClone(origamiCoordinates));

      // Save current points (these may be displayed in the animation step by step)
      pointInstructions.push(this.getOrigamiCoordinatesNodes(origamiCoordinates));
    }

    // Update faces meant to rotate with faces that were created inside them meanwhile
    faceRotationInstructions = this.updateFaceRotationInstructionFaces(origamiCoordinates, faceRotationInstructions);

    // Unfold origami into original state
    origamiCoordinates = this.unfoldOrigami(origamiCoordinates);

    // Create face meshes and rotation instructions
    const meshes = this.createFaceMeshes(origamiCoordinates);
    const meshInstructions = this.createMeshInstructions(origamiCoordinates, faceRotationInstructions);
    const lineInstructions = this.createLineInstructions(origamiCoordinates, faceRotationInstructions);

    return [meshes, meshInstructions, lineInstructions, pointInstructions, origamiCoordinatesSave];
  }

  public static getOrigamiCoordinatesNodes(origamiCoordinates: IOrigamiCoordinates) {
    return Object.keys(origamiCoordinates.points);
  }

  public static createLineInstructions(
    origamiCoordinates: IOrigamiCoordinates,
    faceRotationInstructions: IFaceRotationInstruction[]
  ) {
    const faces = origamiCoordinates.faces;
    const paperLimitEdges = this.findPaperLimitEdges(faces);
    const lineInstructions = [paperLimitEdges];
    for (let i = 0; i < faceRotationInstructions.length; i++) {
      const lastLineInstruction = lineInstructions[lineInstructions.length - 1];
      const currentLineInstruction = [...lastLineInstruction];
      const faceRotationInstruction = faceRotationInstructions[i];
      const facesToRotate = faceRotationInstruction.faces;
      for (const faceToRotate of facesToRotate) {
        for (let j = 0; j < faceToRotate.length; j++) {
          const edge = [faceToRotate[j], faceToRotate[(j + 1) % faceToRotate.length]];
          const invertedEdge = MathHelpers.invertEdgeSense(edge);
          for (const face of faces) {
            if (
              !MathHelpers.checkIfArrayContainsArray(facesToRotate, face) &&
              MathHelpers.checkIfFaceContainsDirectionalEdge(face, invertedEdge) &&
              !MathHelpers.checkIfArrayContainsArray(currentLineInstruction, edge)
            ) {
              currentLineInstruction.push(edge);
            }
          }
        }
      }
      lineInstructions.push(currentLineInstruction);
    }
    return lineInstructions;
  }

  public static findPaperLimitEdges(faces: string[][]) {
    const paperLimitEdges = [];
    const edges = FoldSolver.findEdgesFromFaces(faces);
    for (const edge of edges) {
      const edgeFaces = FoldSolver.findFacesFromEdge(faces, edge);
      if (edgeFaces.length === 1) {
        paperLimitEdges.push(edge);
      }
    }
    return paperLimitEdges;
  }

  public static updateFaceRotationInstructionFaces(
    origamiCoordinates: IOrigamiCoordinates,
    faceRotationInstructions: IFaceRotationInstruction[]
  ) {
    for (let i = 0; i < faceRotationInstructions.length; i++) {
      const faces = [];
      for (const outlineFace of faceRotationInstructions[i].faces) {
        const [innerFaces, _] = this.findFacesInsideOutline(origamiCoordinates, outlineFace);
        faces.push(...innerFaces);
      }
      faceRotationInstructions[i].faces = faces;
    }
    return faceRotationInstructions;
  }

  public static findFacesInsideOutline(origamiCoordinates: IOrigamiCoordinates, outline: string[]) {
    const faces = origamiCoordinates.faces;
    const outlineEdges = this.findOutlineEdges(origamiCoordinates, outline);
    const outlineFaces = this.findOutlineFaces(faces, outlineEdges);
    const outlineFaceIds = this.convertFacesToFaceIds(faces, outlineFaces);
    const previousFaceIds = [...outlineFaceIds];
    const currentFaceIds = [...outlineFaceIds];
    while (currentFaceIds.length > 0) {
      const currentFaceId = currentFaceIds.shift() as number;
      const [_, neighborFaceIds] = this.findSideNeighborFaces(faces[currentFaceId], faces);
      for (const neighborFaceId of neighborFaceIds) {
        if (
          !FoldSolver.checkIfFaceContainsAnyEdge(faces[neighborFaceId], outlineEdges) &&
          !MathHelpers.checkIfArrayContainsElement(previousFaceIds, neighborFaceId)
        ) {
          previousFaceIds.push(neighborFaceId);
          currentFaceIds.push(neighborFaceId);
        }
      }
    }
    return [MathHelpers.indexArray(faces, previousFaceIds), previousFaceIds];
  }

  public static createMeshInstructions(
    origamiCoordinates: IOrigamiCoordinates,
    faceRotationInstructions: IFaceRotationInstruction[]
  ): IMeshInstruction[] {
    const faces = origamiCoordinates.faces;
    const meshInstructions = [];
    for (const faceRotationInstruction of faceRotationInstructions) {
      const rotationFaces = faceRotationInstruction.faces;
      const axis = faceRotationInstruction.axis;
      const angle = THREE.MathUtils.degToRad(faceRotationInstruction.angle);
      const meshIds = [];
      for (const rotationFace of rotationFaces) {
        for (let i = 0; i < faces.length; i++) {
          if (MathHelpers.checkIfArraysAreEqual(rotationFace, faces[i])) {
            meshIds.push(i);
          }
        }
      }
      meshInstructions.push({ meshIds: meshIds, axis: axis, angle: angle });
    }
    return meshInstructions;
  }

  public static createMeshInstructionsOld(
    origamiCoordinates: IOrigamiCoordinates,
    faceRotationInstructions: IFaceRotationInstruction[]
  ): IMeshInstruction[] {
    const meshInstructions = [];
    for (const faceRotationInstruction of faceRotationInstructions) {
      const axis = faceRotationInstruction.axis;
      const angle = THREE.MathUtils.degToRad(faceRotationInstruction.angle);
      const meshIds = [];
      for (const outlineFace of faceRotationInstruction.faces) {
        const [_, facesInsideOutlineIds] = this.findFacesInsideOutline(origamiCoordinates, outlineFace);
        meshIds.push(...facesInsideOutlineIds);
      }
      meshInstructions.push({ meshIds: meshIds, axis: axis, angle: angle });
    }
    return meshInstructions;
  }

  public static setParsingInstructions(): IParsingInstruction {
    const parsingInstructions = {
      paperDimensions: { regex: /paper dimensions: \[(.+?)\]/, dimensions: 1 },
      translation: {
        regex: /fold \[(.+?)\] to (top|bottom) of \[(.+?)\]( carry \[(.+?)\])?( pin \[(.+?)\])?/,
        from: 1,
        sense: 2,
        to: 3,
        carry: 5,
        pin: 7
      },
      rotation: {
        regex: /fold \[(.+?)\] around \[(.+?)\]( (\d+))?( carry \[(.+?)\])?( pin \[(.+?)\])?/,
        from: 1,
        axis: 2,
        angle: 4,
        carry: 6,
        pin: 8
      }
    };
    return parsingInstructions;
  }

  public static parsePaperDimensions(
    paperDimensionsInstruction: string,
    parsingInstructions: IParsingInstruction
  ): [number, number] {
    // Parse dimensions
    const parseInstruction = parsingInstructions.paperDimensions;
    const match = FoldSolver.parseInstruction(paperDimensionsInstruction, parseInstruction.regex);
    const capturedString = match[parseInstruction.dimensions];
    const dimensions = FoldSolver.parseMandatoryNumberArray(capturedString);

    // Find dimensions ratio
    let ratio;
    if (dimensions.length === 1) {
      ratio = dimensions[0];
    } else if (dimensions.length === 2) {
      ratio = dimensions[0] / dimensions[1];
    } else {
      throw new Error(
        'Paper dimensions were not specified correctly. They should be either a X/Y ratio (one value), or the X and Y dimensions (two values).'
      );
    }

    // Make paper dimensions (1) have specified ration; (2) make specified constant area
    const paperArea = 60;
    const xDim = Math.sqrt(paperArea * ratio);
    const yDim = Math.sqrt(paperArea / ratio);

    return [xDim, yDim];
  }

  public static solveInstruction(
    origamiCoordinates: IOrigamiCoordinates,
    parsingInstructions: IParsingInstruction,
    instruction: string
  ): [IOrigamiCoordinates, IFaceRotationInstruction] {
    // Set rotation report
    let faceRotationInstruction: IFaceRotationInstruction;

    // Unpack parsing instructions
    const translation = parsingInstructions.translation;
    const rotation = parsingInstructions.rotation;

    // Execute translation
    if (this.checkIfInstructionIs(instruction, translation)) {
      [origamiCoordinates, faceRotationInstruction] = FoldSolver.solveTranslation(
        origamiCoordinates,
        instruction,
        translation
      );

      // Execute rotation
    } else if (this.checkIfInstructionIs(instruction, rotation)) {
      [origamiCoordinates, faceRotationInstruction] = FoldSolver.solveRotation(
        origamiCoordinates,
        instruction,
        rotation
      );

      // In the case it's neither, throw an error
    } else {
      throw new Error('The instruction is neither a translation nor a rotation!');
    }
    return [origamiCoordinates, faceRotationInstruction];
  }

  public static checkIfInstructionIs(instruction: string, type: IParseTranslation | IParseRotation) {
    return instruction.match(type.regex) !== null;
  }

  public static unfoldOrigami(origamiCoordinates: IOrigamiCoordinates) {
    // Update point coordinates
    const nodes = Object.keys(origamiCoordinates.points);
    const xi = 0;
    const yi = 1;
    const zi = 2;
    for (const node of nodes) {
      origamiCoordinates.points[node][xi] = origamiCoordinates.pattern[node][xi];
      origamiCoordinates.points[node][yi] = origamiCoordinates.pattern[node][yi];
      origamiCoordinates.points[node][zi] = 0;
    }
    // Update face order
    const faces = origamiCoordinates.faces;
    for (let i = 0; i < faces.length; i++) {
      origamiCoordinates.faceOrder[i] = {};
    }
    return origamiCoordinates;
  }

  // Use faces and pattern!:
  // public static createFaceMeshes(origamiCoordinates: IOrigamiCoordinates): IOrigamiMesh[] {
  // 	return [new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xFF0000 }))];
  // }

  public static createFaceMeshes(origamiCoordinates: IOrigamiCoordinates): IOrigamiMesh[] {
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide, wireframe: true });
    const facePoints = origamiCoordinates.faces.map((face) => face.map((point) => origamiCoordinates.pattern[point]));

    return facePoints.map((face) => {
      /**
       * Shape geometry internally triangulates the face, you can check the second code example in this link
       * https://threejs.org/docs/#api/en/core/BufferGeometry
       * You store the vertices positions in the position array and then you have the index array
       * that tells you how to connect the vertices to form the triangulated faces
       */
      const shape = new THREE.Shape(face.map(([x, y]) => new THREE.Vector2(x, y)));
      const geometry = new THREE.ShapeGeometry(shape);
      geometry.computeVertexNormals();

      return new THREE.Mesh(geometry, material);
    });
  }

  public static findSideNeighborFaces(startFace: string[], faces: string[][]): [string[][], number[]] {
    const neighborFaces = [];
    const neighborFaceIds = [];
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      if (!MathHelpers.checkIfArraysAreEqual(face, startFace)) {
        const edges = FoldSolver.findEdgesFromFaces([face]);
        for (const edge of edges) {
          if (MathHelpers.checkIfFaceContainsEdge(startFace, edge)) {
            neighborFaces.push(face);
            neighborFaceIds.push(i);
            break;
          }
        }
      }
    }
    return [neighborFaces, neighborFaceIds];
  }

  public static findNeighborFaces(startFace: string[], faces: string[][]): [string[][], number[]] {
    const neighborFaces = [];
    const neighborFaceIds = [];
    for (let i = 0; i < faces.length; i++) {
      const face = faces[i];
      if (
        MathHelpers.checkIfArrayContainsAnyElement(face, startFace) &&
        !MathHelpers.checkIfArraysAreEqual(face, startFace)
      ) {
        neighborFaces.push(face);
        neighborFaceIds.push(i);
      }
    }
    return [neighborFaces, neighborFaceIds];
  }

  public static findOutlineEdges(origamiCoordinates: IOrigamiCoordinates, outline: string[]) {
    const origamiGraph = FoldSolver.convertOrigamiCoordinatesToGraph(origamiCoordinates);
    const outlineEdges = [];
    for (let i = 0; i < outline.length; i++) {
      const outlineSide = [outline[i], outline[(i + 1) % outline.length]];
      const shortestPath = FoldSolver.findShortestPath(origamiGraph, outlineSide[0], outlineSide[1]);
      for (let j = 0; j < shortestPath.length - 1; j++) {
        const outlineEdge = [shortestPath[j], shortestPath[j + 1]];
        outlineEdges.push(outlineEdge);
      }
    }
    return outlineEdges;
  }

  public static findOutlineFaces(faces: string[][], outlineEdges: string[][]) {
    const outlineFaces = [];
    for (const face of faces) {
      for (const edge of outlineEdges) {
        // Since a directioly edge belongs to one face only, it should not be necessary to loop through those that were already added (maybe this function performance could be optimized by removing those when added)
        if (MathHelpers.checkIfFaceContainsDirectionalEdge(face, edge)) {
          outlineFaces.push(face);
          break;
        }
      }
    }
    return outlineFaces;
  }

  public static convertFacesToFaceIds(origamiFaces: string[][], faces: string[][]) {
    const faceIds = [];
    for (const face of faces) {
      faceIds.push(MathHelpers.findPositionOfArrayInArray(face, origamiFaces));
    }
    return faceIds;
  }
}
