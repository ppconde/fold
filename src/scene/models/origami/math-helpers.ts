import {
  IVertices,
  IPlane,
  Point,
  LineSegment,
  Corner,
  Polygon,
  PolygonRecord,
  IEdge,
  ICorner,
  IIntersectionEdgePoint,
  IIntersectionCornerPoint,
  IntersectionPoint,
  Vector
} from './origami-types';
import * as THREE from 'three';

export class MathHelpers {
  // LOGIC /////////////////////////////////////////////////////////////////////////////////////////////

  public static elementWiseAnd(a: Array<any>, b: Array<any>) {
    return a.map((e, i) => e && b[i]);
  }

  public static elementWiseOr(a: Array<any>, b: Array<any>) {
    return a.map((e, i) => e || b[i]);
  }

  public static elementWiseNot(a: Array<any>) {
    return a.map((e) => !e);
  }

  // PROGRAMMING /////////////////////////////////////////////////////////////////////////////////////////////

  public static findPositionOfElementsInArray(a: Array<any>, elements: Array<any>) {
    const indices = [];
    for (let element of elements) {
      const positions = this.findPositionsOfValueInArray(a, element);
      for (let position of positions) {
        indices.push(position);
      }
    }
    return indices;
  }

  public static findIntersectionBetweenArrays<T>(a: Array<T>, b: Array<T>) {
    return Array.from(new Set(a.filter((e) => b.includes(e))));
  }

  public static convertPositionsToLogicalPositions(a: Array<any>, positions: number[]) {
    const logicalArray = new Array(a.length).fill(false);
    for (let position of positions) {
      logicalArray[position] = true;
    }
    return logicalArray;
  }

  public static convertLogicalPositionsToPositions(logicalPositions: boolean[]) {
    const indices = [];
    for (let i = 0; i < logicalPositions.length; i++) {
      if (logicalPositions[i]) {
        indices.push(i);
      }
    }
    return indices;
  }

  public static findLogicalPositionOfElementsInArray(a: Array<any>, elements: Array<any>) {
    const indices = this.findPositionOfElementsInArray(a, elements);
    return this.convertPositionsToLogicalPositions(a, indices);
  }

  public static sortCollinearPoints() {}

  public static findSortIndices(a: Array<any>) {
    let indices = [...Array(a.length).keys()];
    indices.sort(function (i, j) {
      return a[i] < a[j] ? -1 : a[i] > a[j] ? 1 : 0;
    });
    return indices;
  }

  public static sortByIndices(a: Array<any>, b: Array<any>) {
    a.sort((e, i) => e.index - b[i]); // Check
    return a;
  }

  public static findPositionOfArrayInArray(a: Array<any>, b: Array<any>) {
    for (let i = 0; i < b.length; i++) {
      if (this.checkIfArraysAreEqual(a, b[i])) {
        return i;
      }
    }
    return -1;
  }

  public static findPositionsOfValueInArray(a: Array<any>, b: any) {
    let indexes = [];
    for (let i = 0; i < a.length; i++) if (a[i] === b) indexes.push(i);
    return indexes;
  }

  public static findPositionOfElementInArray(a: Array<any>, b: any) {
    return a.indexOf(b);
  }

  public static findPositionOfMinimumValue(a: Array<any>) {
    return a.reduce((r, v, i, a) => (v >= a[r] ? r : i), -1);
  }

  public static checkIfArraysAreEqual(a: Array<unknown>, b: Array<unknown>) {
    // WARNING: arrays must not contain {objects} or behavior may be undefined; a better (more complicated) option might be presented here:
    // https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript
    return JSON.stringify(a) == JSON.stringify(b);
  }

  public static checkIfArrayContainsArray(a: Array<unknown>, b: Array<unknown>) {
    const s1 = JSON.stringify(a);
    const s2 = JSON.stringify(b);
    // const i = s2.indexOf(s1);
    const i = s1.indexOf(s2);
    return i != -1;
  }

  public static checkIfArrayContainsArrays(a: Array<unknown>, b: Array<Array<unknown>>) {
    return b.every((e) => this.checkIfArrayContainsArray(a, e));
  }

  public static checkIfArrayContainsAnyArray(a: Array<unknown>, b: Array<Array<unknown>>) {
    return b.some((e) => this.checkIfArrayContainsArray(a, e));
  }

  public static checkIfArrayContainsAnyElement(a: Array<any>, b: Array<any>) {
    return b.some((e) => a.includes(e));
  }

  public static checkIfArrayContainsElements(a: Array<unknown>, b: Array<unknown>) {
    return b.every((r) => a.includes(r));
  }

  public static checkIfArrayContainsElement<T>(a: Array<T>, b: T) {
    return a.includes(b);
  }

  public static indexArray(a: Array<unknown>, b: number[]): Array<any> {
    return b.map((element) => a[element]);
  }

  public static logicallyIndexArray(a: Array<any>, b: boolean[]) {
    const indices = b.flatMap((bool, index) => (bool ? index : []));
    return this.indexArray(a, indices);
  }

  /**
   * Returns an array of elements from a, indexed by b
   * @param a
   * @param b
   */

  public static indexObject(a: Record<string, number[]>, b: string[]): number[][] {
    return b.map((element) => a[element]);
  }

  public static checkIfArrayIsEmpty(a: Array<any>) {
    return Array.isArray(a) && a.length === 0;
  }

  public static checkIfObjectIsEmpty(obj: Object) {
    for (const prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        return false;
      }
    }
    return true;
  }

  // GRAPH THEORY  /////////////////////////////////////////////////////////////////////////////////////////////

  public static checkIfEdgesAreEqual(a: Array<any>, b: Array<any>) {
    return JSON.stringify(a) == JSON.stringify(b) || JSON.stringify(a) == JSON.stringify(this.invertEdgeSense(b));
  }

  public static invertEdgeSense(a: string[]) {
    return [...a].reverse();
  }

  public static checkIfArraysOfFacesAreEqual(a: number[][][], b: number[][][]) {
    if (a.length === b.length) {
      const numberOfFaces = a.length;
      // This considers two empty arrays to be equal
      if (numberOfFaces === 0) {
        return true;
      }
      const matchingFaces1 = new Array(numberOfFaces).fill(false);
      const matchingFaces2 = new Array(numberOfFaces).fill(false);
      for (let i = 0; i < numberOfFaces; i++) {
        for (let j = 0; j < numberOfFaces; j++) {
          if (this.checkIfFacesAreEqual(a[i], b[j])) {
            matchingFaces1[i] = true;
            matchingFaces2[j] = true;
            break;
          }
        }
      }
      if (matchingFaces1.every((e) => e === true) && matchingFaces2.every((e) => e === true)) {
        return true;
      }
    }
    return false;
  }

  public static checkIfFacesAreEqual(face1: number[][], face2: number[][]) {
    if (face1.length === face2.length) {
      const faceLength = face1.length;
      // This considers two empty faces to be equal
      if (faceLength === 0) {
        return true;
      }
      for (let i = 0; i < faceLength; i++) {
        if (this.checkIfPointsAreEqual(face1[0], face2[i])) {
          const matchingElements = new Array(faceLength).fill(false);
          const shiftedFace2: number[][] = [];
          for (let j = i; j < i + faceLength; j++) {
            shiftedFace2.push(face2[j % face2.length]);
          }
          for (let j = 0; j < faceLength; j++) {
            if (this.checkIfPointsAreEqual(face1[j], shiftedFace2[j])) {
              matchingElements[j] = true;
            }
          }
          if (matchingElements.every((e) => e === true)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  public static checkIfEdgesContainEdge(a: Array<any>, b: Array<unknown>) {
    for (const edge of a) {
      if (MathHelpers.checkIfEdgesAreEqual(edge, b)) {
        return true;
      }
    }
    return false;
  }

  public static checkIfFaceContainsEdge(face: Array<any>, edge: Array<unknown>) {
    for (let i = 0; i < face.length; i++) {
      const faceEdge = [face[i], face[(i + 1) % face.length]];
      if (this.checkIfEdgesAreEqual(faceEdge, edge)) {
        return true;
      }
    }
    return false;
  }

  public static checkIfFaceContainsDirectionalEdge(face: Array<any>, edge: Array<unknown>) {
    for (let i = 0; i < face.length; i++) {
      const faceEdge = [face[i], face[(i + 1) % face.length]];
      if (this.checkIfArraysAreEqual(faceEdge, edge)) {
        return true;
      }
    }
    return false;
  }

  public static orientFaceCounterClockwise(a: [number, number][]) {
    const tolerance = 0.0001;
    const z = [0, 0, 1];
    const n = this.findPlaneNormalVersor(a);
    if (this.dot(z, n) < -1 + tolerance) {
      a = [a[0], ...[...a.slice(1)].reverse()];
    }
    return a;
  }

  // GEOMETRY /////////////////////////////////////////////////////////////////////////////////////////////

  public static checkIfPointsAreEqual(a: Array<any>, b: Array<any>) {
    const tolerance = 0.0001;
    const d = this.findDistanceBetweenPoints(a, b);
    return d < tolerance;
  }

  public static checkIfPointsContainPoint(points: number[][], point: number[]) {
    for (let p of points) {
      if (this.checkIfPointsAreEqual(p, point)) {
        return true;
      }
    }
    return false;
  }

  // The comment below proved to be incorrect at least for one case. THREE is giving results I do not expect. Switched to general approach.
  public static findIntersectionBetweenLineSegmentAndPlaneOld(
    lineSegment: Record<string, number[]>,
    plane: IPlane
  ): [boolean, number[], number] {
    const lineTHREE = new THREE.Line3(
      new THREE.Vector3(...lineSegment.startPoint),
      new THREE.Vector3(...lineSegment.endPoint)
    ); // Line3
    const planeTHREE = new THREE.Plane();
    planeTHREE.setFromNormalAndCoplanarPoint(new THREE.Vector3(...plane.versor), new THREE.Vector3(...plane.point));
    const intersectionPointTHREE = new THREE.Vector3();
    let planeIntersectsLine = planeTHREE.intersectsLine(lineTHREE);
    planeTHREE.intersectLine(lineTHREE, intersectionPointTHREE);
    // For some reason, when plane intersects start/end point of line segment, even
    // though the intersection point is defined, "intersectsLine" returns false.
    // This is to correct this extremely deceitful behaviour. And also, since it
    // happens, to use it to identify if the intersection is at a start/end point:
    let intersectedVerticeIndex = -1;
    if (planeIntersectsLine === false) {
      if (intersectionPointTHREE.equals(new THREE.Vector3())) {
        if (planeTHREE.constant === 0) {
          planeIntersectsLine = true;
          if (lineTHREE.start.equals(intersectionPointTHREE)) {
            intersectedVerticeIndex = 0;
          } else {
            intersectedVerticeIndex = 1;
          }
        }
      } else {
        planeIntersectsLine = true;
        if (lineTHREE.start.equals(intersectionPointTHREE)) {
          intersectedVerticeIndex = 0;
        } else {
          intersectedVerticeIndex = 1;
        }
      }
    }
    return [planeIntersectsLine, intersectionPointTHREE.toArray(), intersectedVerticeIndex];
  }

  // https://stackoverflow.com/questions/5666222/3d-line-plane-intersection
  // It counts the limit points as well
  public static findIntersectionBetweenLineSegmentAndPlane(lineSegment: number[][], plane: IPlane): number[] {
    const tolerance = 0.0001;
    let intersectionPoint: number[] = [];
    const u = this.findVectorBetweenPoints(lineSegment[0], lineSegment[1]);
    const norm = this.findVectorNorm(u);
    const dot = this.dot(plane.versor, u);
    // If plane intersects line
    if (Math.abs(dot) > tolerance) {
      const w = this.findVectorBetweenPoints(plane.point, lineSegment[0]);
      const fac = -this.dot(plane.versor, w) / dot;
      // If plane intersects line segments
      if (fac * norm > 0 - tolerance && fac * norm < norm + tolerance) {
        const v = this.multiplyArray(u, fac);
        intersectionPoint = this.addArray(lineSegment[0], v);
      }
    }
    return intersectionPoint;
  }

  public static convertCollinearPointsTo1D(a: number[][], lineAxis: { o: number[]; u: number[] }) {
    const points1D = [];
    for (let p of a) {
      const v = this.findVectorBetweenPoints(lineAxis.o, p);
      points1D.push(this.dot(v, lineAxis.u));
    }
    return points1D;
  }

  // (https://www.reddit.com/r/askmath/comments/17jqn73/how_do_i_transform_3d_points_on_a_plane_to_2d/)
  public static convertCoplanarPointsTo2D(
    a: number[][],
    planeAxis: { o: number[]; n: number[]; u: number[]; v: number[] }
  ): [number, number][] {
    const basisOrigin = [planeAxis.o];
    const basisVectors = [planeAxis.u, planeAxis.v];
    const points2D = this.transposeMatrix(
      this.multiplyMatrix(
        basisVectors,
        this.addMatrix(this.transposeMatrix(a), this.multiplyMatrix(this.transposeMatrix(basisOrigin), -1))
      )
    );
    return points2D as [number, number][];
  }

  /**
   * Returns the vector between two points
   * @param a
   * @param b
   */
  public static findVectorBetweenPoints(a: number[], b: number[]): number[] {
    return b.map((element, i) => element - a[i]);
  }

  public static findVectorBetweenPointAndLine(p: number[], a: number[], b: number[]) {
    const q = MathHelpers.projectPointOntoLine(p, a, b);
    const v = MathHelpers.findVectorBetweenPoints(p, q);
    return v;
  }

  /**
   * Returns the norm of a vector
   * @param u
   */
  public static findVectorNorm(u: number[]): number {
    return Math.sqrt(u.reduce((acc, element) => acc + Math.pow(element, 2), 0));
  }

  /**
   * Returns the sum of a point and a vector
   * @param a
   * @param u
   */
  public static addVectorToPoint(a: number[], u: number[]): number[] {
    return a.map((element, i) => element + u[i]);
  }

  /**
   * Returns the versor between two points
   * @param a
   * @param b
   */
  public static findVersorBetweenPoints(a: number[], b: number[]): number[] {
    const u = this.findVectorBetweenPoints(a, b);
    const n = this.findVectorNorm(u);
    return this.multiplyArray(u, 1 / n);
  }

  /**
   * Returns the versor of a vector
   * @param u
   * @param v
   */
  public static findVectorVersor(u: number[]): number[] {
    const n = this.findVectorNorm(u);
    return this.multiplyArray(u, 1 / n);
  }

  /**
   * Returns the distance between two points
   * @param a
   * @param b
   */
  public static findDistanceBetweenPoints(a: number[], b: number[]): number {
    const u = this.findVectorBetweenPoints(a, b);
    return this.findVectorNorm(u);
  }

  /**
   * Returns the projection of a point onto a line
   * @param b
   * @param c
   */
  public static projectPointOntoLine(p: number[], a: number[], b: number[]): number[] {
    const ap = this.findVectorBetweenPoints(a, p);
    const ab = this.findVectorBetweenPoints(a, b);
    return this.addArray(a, this.projectVectorOntoVector(ap, ab));
  }

  public static projectVectorOntoVector(u: number[], v: number[]): number[] {
    return this.multiplyArray(v, this.dot(u, v) / this.dot(v, v));
  }

  public static projectVectorOntoPlane(u: number[], planeNormal: number[]): number[] {
    return this.addArray(u, this.multiplyArray(this.projectVectorOntoVector(u, planeNormal), -1));
  }

  public static findCounterClockwiseAngleBetweenVectors(u: [number, number], v: [number, number]) {
    u = this.findVectorVersor(u) as [number, number];
    v = this.findVectorVersor(v) as [number, number];
    const dot = this.dot(u, v);
    const det = u[0] * v[1] - u[1] * v[0];
    const angle = ((Math.atan2(det, dot) * 180) / Math.PI + 360) % 360; // In degrees
    return angle;
  }

  // MATH /////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Returns the product of an array and a constant
   * @param a
   * @param c
   */
  public static multiplyArray(a: number[], c: number): number[] {
    return a.map((element) => element * c);
  }

  /**
   * Returns the sum of two arrays
   * @param a
   * @param c
   */

  public static addArray(a: number[], c: number[] | number): number[] {
    if (!Array.isArray(c)) {
      c = Array(a.length).fill(c);
    }
    return a.map((element, i) => element + (c as [])[i]);
  }

  public static subtractArray(a: number[], c: number[] | number): number[] {
    if (!Array.isArray(c)) {
      c = Array(a.length).fill(c);
    }
    return a.map((element, i) => element - (c as [])[i]);
  }

  public static findArrayDimensions(a: any): Array<any> {
    return a.length ? [...[a.length], ...this.findArrayDimensions(a[0])] : [];
  }
  public static findArrayDimension(a: any): number {
    const aDims = this.findArrayDimensions(a);
    return aDims.length - aDims.filter((v) => v === 1).length;
  }

  public static addMatrix(a: number[][], b: number[][] | number[] | number) {
    const aDims = this.findArrayDimensions(a);
    const bDim = this.findArrayDimension(b);
    let c: number[][] = [];
    // If element to add is a number or a vector, transform it to matrix, to perform element-wise addition
    if (bDim === 0) {
      for (let i = 0; i < aDims[0]; i++) {
        c[i] = [];
        for (let j = 0; j < aDims[1]; j++) {
          c[i][j] = b as number;
        }
      }
    } else if (bDim === 1) {
      for (let i = 0; i < aDims[0]; i++) {
        c[i] = [];
        for (let j = 0; j < aDims[1]; j++) {
          c[i][j] = (b as number[][])[i][0];
        }
      }
    } else if (bDim === 2) {
      c = b as number[][];
    }
    return a.map((e1, i1) => e1.map((e2, i2) => e2 + c[i1][i2]));
  }

  public static multiplyMatrix(a: number[][], b: number[][] | number) {
    const [aNumRows, aNumCols] = this.findArrayDimensions(a);
    const bdims = this.findArrayDimensions(b);
    const bDim = this.findArrayDimension(b);
    let m;
    if (bDim === 0) {
      m = a.map((e1) => e1.map((e2) => e2 * (b as number)));
    } else {
      m = new Array(aNumRows);
      const bNumCols = bdims[1];
      for (let r = 0; r < aNumRows; ++r) {
        m[r] = new Array(bNumCols);
        for (let c = 0; c < bNumCols; ++c) {
          m[r][c] = 0;
          for (let i = 0; i < aNumCols; ++i) {
            m[r][c] += a[r][i] * (b as number[][])[i][c];
          }
        }
      }
    }
    return m;
  }

  public static transposeMatrix(a: number[][]) {
    return a[0].map((_, i) => a.map((row) => row[i]));
  }

  /**
   * Returns the dot product of two vectors
   * @param u
   * @param v
   */
  public static dot(u: number[], v: number[]): number {
    return u.reduce((acc, element, i) => acc + element * v[i], 0);
  }

  public static cross(u: number[], v: number[]): number[] {
    if (u.length === 2) u = [...u, 0];
    if (v.length === 2) v = [...v, 0];
    return [u[1] * v[2] - u[2] * v[1], -(u[0] * v[2] - u[2] * v[0]), u[0] * v[1] - u[1] * v[0]];
  }

  /**
   * Shifts points by given values - used to center a given shape
   * @param points
   * @param shiftX
   * @param shiftY
   */
  public static shiftPoints(points: IVertices, shiftX: number, shiftY: number): IVertices {
    return Object.keys(points).reduce((acc, key) => {
      acc[key] = [points[key][0] + shiftX, points[key][1] + shiftY, 0];
      return acc;
    }, {} as IVertices);
  }

  public static findAngleBetweenVectors(u: number[], v: number[]) {
    const uTHREE = new THREE.Vector3(...u);
    const vTHREE = new THREE.Vector3(...v);
    const angle = (uTHREE.angleTo(vTHREE) / Math.PI) * 180;
    return angle;
  }

  public static findAngleBetweenVectorsAroundAxis(u: number[], v: number[], n: number[]) {
    u = this.findVectorVersor(u);
    v = this.findVectorVersor(v);
    n = this.findVectorVersor(n);
    const dot = MathHelpers.dot(u, v);
    const det = MathHelpers.dot(n, MathHelpers.cross(u, v));
    const angle = ((Math.atan2(det, dot) * 180) / Math.PI + 360) % 360;
    return angle;
  }

  public static findPlaneNormalVersor(coplanarPoints: number[][]) {
    const [A, B, C] = this.pickThreeNonCollinearPoints(coplanarPoints);
    const AB = this.findVectorBetweenPoints(A, B);
    const AC = this.findVectorBetweenPoints(A, C);
    const u = this.cross(AB, AC);
    return this.findVectorVersor(u);
  }

  public static checkIfFacesAreCoplanar(points: IVertices, faceA: string[], faceB: string[]) {
    const versorA = this.findFaceNormalVersor(points, faceA);
    const versorB = this.findFaceNormalVersor(points, faceB);
    // Check if faces are parallel
    if (this.checkIfVersorsHaveTheSameDirection(versorA, versorB)) {
      const pointA = points[faceA[0]];
      const pointB = points[faceB[0]];
      const projectedPointA = this.projectVectorOntoVector(pointA, versorA);
      const projectedPointB = this.projectVectorOntoVector(pointB, versorA);
      // Check if faces are coincident
      if (this.checkIfPointsAreEqual(projectedPointA, projectedPointB)) {
        return true;
      }
    }
    return false;
  }

  public static findFaceNormalVersor(points: IVertices, face: string[]) {
    const ABC = MathHelpers.pickThreeNonCollinearPoints(MathHelpers.indexObject(points, face));
    return MathHelpers.findPlaneNormalVersor(ABC);
  }

  public static findVectorNormalVersor(u: [number, number]) {
    const v = [-u[1], u[0]];
    return this.findVectorVersor(v);
  }

  public static findDistanceBetweenPointAndPlane(p: number[], plane: IPlane) {
    return MathHelpers.dot(MathHelpers.addArray(p, MathHelpers.multiplyArray(plane.point, -1)), plane.versor); // Signed distance!
  }

  public static findPointSideOfPlane(p: number[], plane: IPlane) {
    const tolerance = 0.0001;
    const d = MathHelpers.findDistanceBetweenPointAndPlane(p, plane);
    return d > tolerance ? 1 : d < -tolerance ? -1 : 0;
  }

  public static findFaceSideOfPlane(face: string[], points: IVertices, plane: IPlane) {
    const nodeSides = face.map((e) => this.findPointSideOfPlane(points[e], plane));
    // const faceSide = nodeSides.every((e) => e === 1) ? 1 : nodeSides.every((e) => e === -1) ? -1 : 0;
    const faceSide = !nodeSides.some((e) => e === -1) ? 1 : !nodeSides.some((e) => e === 1) ? -1 : 0;
    return faceSide;
  }

  // POLYGON INTERSECTION CHECKER

  public static checkIfCoplanarFacesIntersect(a: [number, number][], b: [number, number][]): boolean {
    const polygon1 = this.orientFaceCounterClockwise(a);
    const polygon2 = this.orientFaceCounterClockwise(b);
    return this.checkIfPolygonsIntersect(polygon1, polygon2);
  }

  public static findAveragePoint(points: number[][]) {
    let a = Array(points[0].length).fill(0);
    for (const arg of points) {
      a = this.addArray(a, arg);
    }
    a = this.multiplyArray(a, 1 / points.length);
    return a;
  }

  public static pickThreeNonCollinearPoints(points: number[][]) {
    // Find all collinear points
    const nonCollinearPoints = [points[0]];
    for (let i = 0; i < points.length; i++) {
      if (nonCollinearPoints.length === 1) {
        if (!this.checkIfPointsContainPoint(nonCollinearPoints, points[i])) {
          nonCollinearPoints.push(points[i]);
        }
      } else {
        if (!this.checkIfPointsAreCollinear([...nonCollinearPoints, points[i]])) {
          nonCollinearPoints.push(points[i]);
        }
      }
    }
    // Return first three if found
    if (nonCollinearPoints.length < 3) {
      throw new Error('Could not find at least 3 non-collinear points.');
    } else {
      return [nonCollinearPoints[0], nonCollinearPoints[1], nonCollinearPoints[2]];
    }
  }

  public static checkIfPointsAreCollinear(points: number[][]) {
    const tolerance = 0.0001;
    let u: number[] = [];
    const nonCollinearPoints = [points[0]];
    for (let i = 1; i < points.length; i++) {
      if (!this.checkIfPointsContainPoint(nonCollinearPoints, points[i])) {
        if (this.checkIfArrayIsEmpty(u)) {
          u = this.findVersorBetweenPoints(nonCollinearPoints[0], points[i]);
        } else {
          const v = this.findVersorBetweenPoints(nonCollinearPoints[0], points[i]);
          if (Math.abs(this.dot(u, v)) < 1 - tolerance) {
            return false;
          }
        }
      }
      nonCollinearPoints.push(points[i]);
    }
    return true;
  }

  public static checkIfPolygonsEdgesIntersect(polygon1: [number, number][], polygon2: [number, number][]) {
    for (let i = 0; i < polygon1.length; i++) {
      const lineSegment1 = [polygon1[i], polygon1[(i + 1) % polygon1.length]];
      for (let j = 0; j < polygon2.length; j++) {
        const lineSegment2 = [polygon2[j], polygon2[(j + 1) % polygon2.length]];
        const lineSegmentsIntersect = this.checkIfLineSegmentsIntersect(
          lineSegment1[0],
          lineSegment1[1],
          lineSegment2[0],
          lineSegment2[1]
        );
        if (lineSegmentsIntersect) {
          return true;
        }
      }
    }
    return false;
  }

  public static checkIfLineSegmentsIntersect(
    a: [number, number],
    b: [number, number],
    c: [number, number],
    d: [number, number]
  ) {
    if (this.checkIfLinesAreParallel(a, b, c, d)) {
      if (this.checkIfLinesAreCollinear(a, b, c, d)) {
        if (this.checkIfCollinearLineSegmentInteriorsIntersect(a, b, c, d)) {
          if (this.checkIfLineSegmentsHaveTheSameSense(a, b, c, d)) {
            // If coincident segments are oriented the same
            return true;
          }
        }
      }
    } else {
      if (this.checkIfNonParallelLineSegmentInteriorsIntersect(a, b, c, d)) {
        return true;
      }
    }
    return false;
  }

  public static checkIfLinesAreParallel(
    a: [number, number],
    b: [number, number],
    c: [number, number],
    d: [number, number]
  ) {
    const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
    return det === 0;
  }

  public static checkIfLinesAreCollinear(
    a: [number, number],
    b: [number, number],
    c: [number, number],
    d: [number, number]
  ) {
    return this.checkIfPointsAreCollinear([a, b, c, d]);
  }

  public static checkIfCollinearLineSegmentInteriorsIntersect(
    a: [number, number],
    b: [number, number],
    c: [number, number],
    d: [number, number]
  ) {
    const lineAxis = { o: a, u: MathHelpers.findVersorBetweenPoints(a, b) };
    const [a1, b1, c1, d1] = MathHelpers.convertCollinearPointsTo1D([a, b, c, d], lineAxis);

    const min1 = Math.min(a1, b1);
    const max1 = Math.max(a1, b1);
    const min2 = Math.min(c1, d1);
    const max2 = Math.max(c1, d1);

    if (min1 >= min2 && min1 < max2) return true; // Left part of segment 1 intersects segment 2
    if (max1 > min2 && max1 <= max2) return true; // Right part of segment 1 intersects segment 2
    if (min1 < min2 && max1 > max2) return true; // Middle of segment 1 intersects segment 2
    return false;
  }

  public static checkIfLineSegmentsHaveTheSameSense(
    a: [number, number],
    b: [number, number],
    c: [number, number],
    d: [number, number]
  ) {
    const u = MathHelpers.findVersorBetweenPoints(a, b);
    const v = MathHelpers.findVersorBetweenPoints(c, d);
    return MathHelpers.checkIfVersorsHaveTheSameSense(u, v);
  }

  public static checkIfVersorsHaveTheSameSense(u: number[], v: number[]) {
    const tolerance = 0.0001;
    return MathHelpers.dot(u, v) > 1 - tolerance;
  }

  public static checkIfVersorsHaveTheSameDirection(u: number[], v: number[]) {
    const tolerance = 0.0001;
    return Math.abs(MathHelpers.dot(u, v)) > 1 - tolerance;
  }

  public static checkIfNonParallelLineSegmentInteriorsIntersect(
    a: [number, number],
    b: [number, number],
    c: [number, number],
    d: [number, number]
  ) {
    const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
    const lambda = ((d[1] - c[1]) * (d[0] - a[0]) + (c[0] - d[0]) * (d[1] - a[1])) / det;
    const gamma = ((a[1] - b[1]) * (d[0] - a[0]) + (b[0] - a[0]) * (d[1] - a[1])) / det;
    return 0 < lambda && lambda < 1 && 0 < gamma && gamma < 1;
  }

  // Polygons must have the same point order! (clock-wise or anti-clock-wise)
  public static checkIfPolygonsIntersect(polygon1: [number, number][], polygon2: [number, number][]) {
    if (this.checkIfPolygonEdgesIntersectAnyEdge(polygon1, polygon2)) return true;
    if (
      this.checkIfPolygonInteriorContainsAnyPoint(polygon1, polygon2) ||
      this.checkIfPolygonInteriorContainsAnyPoint(polygon2, polygon1)
    )
      return true;
    if (
      this.checkIfPolygonEdgesIntersectAnyCorner(polygon1, polygon2) ||
      this.checkIfPolygonEdgesIntersectAnyCorner(polygon2, polygon1)
    )
      return true;
    return false;
  }

  public static checkIfPolygonEdgesIntersectAnyEdge(polygon1: [number, number][], polygon2: [number, number][]) {
    for (let i = 0; i < polygon1.length; i++) {
      const lineSegment1 = [polygon1[i], polygon1[(i + 1) % polygon1.length]];
      for (let j = 0; j < polygon2.length; j++) {
        const lineSegment2 = [polygon2[j], polygon2[(j + 1) % polygon2.length]];
        if (this.checkIfEdgeIntersectsEdge(lineSegment1[0], lineSegment1[1], lineSegment2[0], lineSegment2[1])) {
          return true;
        }
      }
    }
    return false;
  }

  public static checkIfEdgeIntersectsEdge(
    a: [number, number],
    b: [number, number],
    c: [number, number],
    d: [number, number]
  ) {
    if (!this.checkIfLinesAreParallel(a, b, c, d)) {
      if (this.checkIfNonParallelLineSegmentInteriorsIntersect(a, b, c, d)) {
        return true;
      }
    }
    return false;
  }

  public static checkIfPolygonInteriorContainsAnyPoint(polygon1: [number, number][], polygon2: [number, number][]) {
    for (let polygon2Point of polygon2) {
      const polygonCointainsPoint = this.checkIfPolygonInteriorContainsPoint(polygon1, polygon2Point);
      if (polygonCointainsPoint) {
        return true;
      }
    }
    return false;
  }

  public static checkIfPolygonInteriorContainsPoint(polygon: [number, number][], point: [number, number]) {
    let numOfCrossings = 0;
    for (let i = 0; i < polygon.length; i++) {
      const lineSegment = [polygon[i], polygon[(i + 1) % polygon.length]];
      // If edge contains point, polygon interior does not contain point
      if (this.checkIfPointsAreCollinear([lineSegment[0], lineSegment[1], point])) {
        const lineAxis = { o: lineSegment[0], u: this.findVersorBetweenPoints(lineSegment[0], lineSegment[1]) };
        const [A, B, C] = this.convertCollinearPointsTo1D([lineSegment[0], lineSegment[1], point], lineAxis);
        const tolerance = 0.0001;
        if (A < C + tolerance && C - tolerance < B) {
          return false;
        }
      } else {
        if (this.checkIfHorizontalLineCrossesNonCollinearLineSegmentToTheRight(point, lineSegment)) {
          numOfCrossings++;
        }
      }
    }
    return this.checkIfNumberIsOdd(numOfCrossings);
  }

  public static checkIfHorizontalLineCrossesNonCollinearLineSegmentToTheRight(
    horizontalLinePoint: [number, number],
    lineSegment: [number, number][]
  ) {
    const tolerance = 0.0001;
    const A = lineSegment[0];
    const B = lineSegment[1];
    const C = horizontalLinePoint;
    const AyCyBy = A[1] - tolerance < C[1] && B[1] - tolerance > C[1]; // This checks if horizontal line crosses line segment (with a positive margin below and a negative margin above)
    const ByCyAy = A[1] - tolerance > C[1] && B[1] - tolerance < C[1];
    return (AyCyBy || ByCyAy) && C[0] < ((B[0] - A[0]) * (C[1] - A[1])) / (B[1] - A[1]) + A[0] - tolerance;
  }

  public static checkIfNumberIsOdd(n: number) {
    return Math.abs(n % 2) == 1;
  }

  public static checkIfPolygonEdgesIntersectAnyCorner(polygon1: [number, number][], polygon2: [number, number][]) {
    for (let i = 0; i < polygon2.length; i++) {
      const polygon2Corner = [
        polygon2[(i - 1 + polygon2.length) % polygon2.length],
        polygon2[i],
        polygon2[(i + 1) % polygon2.length]
      ];
      if (this.checkIfPolygonEdgesIntersectCorner(polygon1, polygon2Corner)) {
        return true;
      }
    }
    return false;
  }

  public static checkIfPolygonEdgesIntersectCorner(polygon: [number, number][], corner: [number, number][]) {
    const tolerance = 0.0001; // It's important that this tolerance is the same as MathHelpers.checkIfPointsAreEqual tolerance. In fact, all linear tolerances should be the same!
    for (let i = 0; i < polygon.length; i++) {
      const lineSegment = [polygon[i], polygon[(i + 1) % polygon.length]];
      if (this.checkIfPointsAreCollinear([lineSegment[0], lineSegment[1], corner[1]])) {
        const lineAxis = { o: lineSegment[0], u: this.findVersorBetweenPoints(lineSegment[0], lineSegment[1]) };
        const [A, B, C] = this.convertCollinearPointsTo1D([lineSegment[0], lineSegment[1], corner[1]], lineAxis);
        // If edge intersects point
        if (A < C + tolerance && C - tolerance < B) {
          let polygonCorner;
          // If edge start point coincides with point
          if (this.checkIfPointsAreEqual([A], [C])) {
            polygonCorner = [
              polygon[(i - 1 + polygon.length) % polygon.length],
              polygon[i],
              polygon[(i + 1) % polygon.length]
            ];
          }
          // If edge end point coincides with point
          else if (this.checkIfPointsAreEqual([B], [C])) {
            polygonCorner = [polygon[i], polygon[(i + 1) % polygon.length], polygon[(i + 2) % polygon.length]];
          }
          // If edge interior contains point
          else {
            polygonCorner = [lineSegment[0], corner[1], lineSegment[1]];
          }
          return this.checkIfCornersIntersect(polygonCorner, corner);
        }
      }
    }
    return false;
  }

  public static checkIfCornersIntersect(corner1: [number, number][], corner2: [number, number][]) {
    const corner1Vector1 = this.findVectorBetweenPoints(corner1[1], corner1[0]) as [number, number];
    const corner1Vector2 = this.findVectorBetweenPoints(corner1[1], corner1[2]) as [number, number];
    const corner1Angle = this.findCounterClockwiseAngleBetweenVectors(corner1Vector2, corner1Vector1);
    const corner1BisectorVersor = this.findBisectorVersor(corner1Vector2, corner1Vector1);

    const corner2Vector1 = this.findVectorBetweenPoints(corner2[1], corner2[0]) as [number, number];
    const corner2Vector2 = this.findVectorBetweenPoints(corner2[1], corner2[2]) as [number, number];
    const corner2Angle = this.findCounterClockwiseAngleBetweenVectors(corner2Vector2, corner2Vector1);
    const corner2BisectorVersor = this.findBisectorVersor(corner2Vector2, corner2Vector1);

    const bisectorVersorsAngle = this.findSmallestAngleBetweenVectors(corner1BisectorVersor, corner2BisectorVersor);
    const maximumAngle = corner1Angle / 2 + corner2Angle / 2;
    return bisectorVersorsAngle < maximumAngle;
  }

  public static findBisectorVersor(u: [number, number], v: [number, number]) {
    const angle = this.findCounterClockwiseAngleBetweenVectors(u, v);
    const bisectorVersor = this.rotateVectorCounterClockwise(u, angle / 2);
    return bisectorVersor;
  }

  public static findSmallestAngleBetweenVectors(u: number[], v: number[]) {
    const dot = this.dot(this.findVectorVersor(u), this.findVectorVersor(v));
    const limitedDot = this.limitNumber(dot, 0, 1); // dot( [0.8314696123025455, -0.5555702330196021] , [0.8314696123025453, -0.5555702330196022] ) was giving = 1.0000000000000002, whose acos was NaN.
    const angle = (Math.acos(limitedDot) / Math.PI) * 180;
    return angle;
  }

  public static limitNumber(a: number, min: number, max: number) {
    return Math.max(Math.min(a, max), min);
  }

  public static rotateVectorCounterClockwise(u: [number, number], a: number) {
    a = (a * Math.PI) / 180;
    const v = [u[0] * Math.cos(a) - u[1] * Math.sin(a), u[0] * Math.sin(a) + u[1] * Math.cos(a)];
    return v;
  }

  // POLYGON INTERSECTION FINDER

  public static findIntersectionBetweenPolygons(polygon1: Polygon, polygon2: Polygon) {
    let polygonIntersection;
    polygonIntersection = this.findIntersectionOfPolygonWithPolygon(polygon1, polygon2);
    if (this.checkIfArrayIsEmpty(polygonIntersection)) {
      polygonIntersection = this.findIntersectionOfPolygonWithPolygon(polygon2, polygon1);
    }
    return polygonIntersection;
  }

  public static findIntersectionOfPolygonWithPolygon(polygon1: Polygon, polygon2: Polygon) {
    // Create start parameters
    const polygons: PolygonRecord = { 0: polygon1, 1: polygon2 };
    const startEdges: IEdge[] = [{ polygonId: 0, edgeId: 0, lineSegment: this.findEdgeCoords(polygons, 0, 0) }];
    const previousEdges: IEdge[] = [];
    const previousLineSegments: LineSegment[] = [];
    const intersectionPolygons: Polygon[] = [];

    while (!this.checkIfArrayIsEmpty(startEdges)) {
      // Select current edge
      let currentEdge = startEdges.shift() as IEdge; // The typing should be unecessary since startEdgeIds cannot be empty at this point.

      let intersectionPolygon: Polygon = [];

      while (true) {
        // Find intersection between current line segment and other polygon
        const intersectionPoints = this.findIntersectionBetweenLineSegmentAndPolygonsEdgesAndCorners(
          currentEdge,
          polygons
        );

        if (!this.checkIfArrayIsEmpty(intersectionPoints)) {
          // Pick first intersection points
          const firstIntersectionPoints = this.findFirstIntersectionPoints(currentEdge, intersectionPoints);

          // Find current edge intersection point
          const currentEdgeIntersectionPoint = {
            polygonId: currentEdge.polygonId,
            edgeId: currentEdge.edgeId,
            coord: firstIntersectionPoints[0].coord
          };

          // Divide current edge at intersection
          const [firstSlice, secondSlice] = this.sliceEdgeAtIntersection(currentEdge, currentEdgeIntersectionPoint);

          // If current first line segment was already analysed, close the loop
          if (this.checkIfPolygonHasClosed(previousLineSegments, firstSlice.lineSegment)) {
            break;
          }

          // Add point to intersection polygon
          intersectionPolygon.push(currentEdgeIntersectionPoint.coord);

          // Update previous segments
          previousEdges.push(firstSlice);
          previousLineSegments.push(firstSlice.lineSegment);

          // Find next edge segment
          const nextEdge = this.findNextEdgeSegment(polygons, currentEdgeIntersectionPoint, firstIntersectionPoints);

          // If the current polygons next edge was not pursued, save it to pursue it later
          if (!this.checkIfPolygonEdgesAreEqual(secondSlice, nextEdge)) {
            startEdges.push(secondSlice);
          }

          // Update current edge
          currentEdge = nextEdge;
        } else {
          // If current edge was already analysed, close the loop
          if (this.checkIfPolygonHasClosed(previousLineSegments, currentEdge.lineSegment)) {
            break;
          }

          // Update previous segments
          previousEdges.push(currentEdge);
          previousLineSegments.push(currentEdge.lineSegment);

          // Select next point
          const currentPolygon = polygons[currentEdge.polygonId];
          const polygonNextEdge = this.findNextPolygonEdge(polygons, currentEdge);
          const currentPoint = {
            polygonId: currentEdge.polygonId,
            cornerId: polygonNextEdge.edgeId,
            coord: polygonNextEdge.lineSegment[0]
          };
          const currentCorner = {
            polygonId: currentEdge.polygonId,
            cornerId: polygonNextEdge.edgeId,
            coords: this.findCornerCoords(currentPolygon, polygonNextEdge.edgeId)
          };
          const otherPolygon = this.findOtherPolygon(polygons, currentEdge.polygonId);

          let nextEdge;

          // Find if current corner intersects other edges/corners (from the inside)
          const intersectionPoints = this.findIntersectionBetweenCornerAndPolygonsEdgesAndCorners(
            currentCorner,
            polygons
          );
          if (!this.checkIfArrayIsEmpty(intersectionPoints)) {
            intersectionPolygon.push(currentPoint.coord);
            nextEdge = this.findNextEdgeSegment(polygons, currentPoint, intersectionPoints);
            if (!this.checkIfPolygonEdgesAreEqual(polygonNextEdge, nextEdge)) {
              startEdges.push(polygonNextEdge);
            }

            // If current point lies inside other polygon
          } else if (this.checkIfPolygonInteriorContainsPoint(otherPolygon, currentPoint.coord)) {
            intersectionPolygon.push(currentPoint.coord);
            nextEdge = polygonNextEdge;

            // If current point lies outside polygon
          } else {
            nextEdge = polygonNextEdge;
          }

          // Update current edge
          currentEdge = nextEdge;
        }
      }

      // If the first and last points are equal, remove last. It would be better if it was not necessary.
      if (intersectionPolygon.length > 2) {
        if (this.checkIfPointsAreEqual(intersectionPolygon[0], intersectionPolygon[intersectionPolygon.length - 1])) {
          intersectionPolygon.pop();
        }
      }

      // If polygon has at least 3 points, add it
      if (intersectionPolygon.length > 2) {
        intersectionPolygons.push(intersectionPolygon);
      }
    }
    return intersectionPolygons;
  }

  public static checkIfPolygonEdgesAreEqual(edge1: IEdge, edge2: IEdge) {
    return edge1.polygonId === edge2.polygonId && edge1.edgeId === edge2.edgeId;
  }

  public static findNextEdgeSegment(
    polygons: PolygonRecord,
    intersectionPoint: IntersectionPoint,
    intersectionPoints: IntersectionPoint[]
  ): IEdge {
    const currentPolygon = polygons[intersectionPoint.polygonId];

    // Find previous segment
    let previousSegment;
    if (this.checkIfIntersectionPointIsAtCorner(intersectionPoint)) {
      intersectionPoint = intersectionPoint as IIntersectionCornerPoint; // This should not be necessary
      const previousEdgeId = (intersectionPoint.cornerId - 1 + currentPolygon.length) % currentPolygon.length;
      previousSegment = {
        polygonId: intersectionPoint.polygonId,
        edgeId: previousEdgeId,
        lineSegment: [currentPolygon[previousEdgeId], currentPolygon[intersectionPoint.cornerId]]
      };
    } else if (this.checkIfIntersectionPointIsAtEdge(intersectionPoint)) {
      intersectionPoint = intersectionPoint as IIntersectionEdgePoint; // This should not be necessary
      previousSegment = {
        polygonId: intersectionPoint.polygonId,
        edgeId: intersectionPoint.edgeId,
        lineSegment: [currentPolygon[intersectionPoint.edgeId], intersectionPoint.coord]
      };
    } else {
      throw new Error('Intersection points was not found to be at neither a corner nor an edge!');
    }

    // Find next possible branches
    intersectionPoints.push(intersectionPoint);
    const branchSegments = [];
    let branchSegment;
    for (let intersectionPoint of intersectionPoints) {
      if (this.checkIfIntersectionPointIsAtCorner(intersectionPoint)) {
        intersectionPoint = intersectionPoint as IIntersectionCornerPoint; // This should not be necessary
        const nextEdgeId = intersectionPoint.cornerId;
        branchSegment = {
          polygonId: intersectionPoint.polygonId,
          edgeId: nextEdgeId,
          lineSegment: this.findEdgeCoords(polygons, intersectionPoint.polygonId, nextEdgeId)
        };
      } else if (this.checkIfIntersectionPointIsAtEdge(intersectionPoint)) {
        intersectionPoint = intersectionPoint as IIntersectionEdgePoint; // This should not be necessary
        const intersectionLineSegment = this.findEdgeCoords(
          polygons,
          intersectionPoint.polygonId,
          intersectionPoint.edgeId
        );
        branchSegment = {
          polygonId: intersectionPoint.polygonId,
          edgeId: intersectionPoint.edgeId,
          lineSegment: [intersectionPoint.coord, intersectionLineSegment[1]] as LineSegment
        };
      } else {
        throw new Error('Intersection points was not found to be at neither a corner nor an edge!');
      }
      branchSegments.push(branchSegment);
    }

    // Pick branch with highest counter-clockwise angle from back vector
    const backVector = this.findVectorBetweenPoints(
      previousSegment.lineSegment[1],
      previousSegment.lineSegment[0]
    ) as Vector;
    branchSegments.sort(this.compareBranches(backVector));
    const nextEdge = branchSegments[branchSegments.length - 1];

    return nextEdge;
  }

  public static findFirstIntersectionPoints(
    currentEdge: IEdge,
    intersectionPoints: IntersectionPoint[]
  ): IntersectionPoint[] {
    intersectionPoints.sort(
      (a, b) =>
        this.findDistanceBetweenPoints(currentEdge.lineSegment[0], a.coord) -
        this.findDistanceBetweenPoints(currentEdge.lineSegment[0], b.coord)
    );
    const firstIntersectionPoint = intersectionPoints[0];
    const firstIntersectionPoints = [];
    for (const intersectionPoint of intersectionPoints) {
      if (this.checkIfPointsAreEqual(firstIntersectionPoint.coord, intersectionPoint.coord)) {
        firstIntersectionPoints.push(intersectionPoint);
      }
    }
    return firstIntersectionPoints;
  }

  public static findIntersectionBetweenLineSegmentAndPolygonsEdgesAndCorners(edge: IEdge, polygons: PolygonRecord) {
    let intersectionPoints = [];
    intersectionPoints.push(...this.findIntersectionBetweenLineSegmentAndOtherPolygonEdges(polygons, edge)); // The same polygon cannot have an edge intersected by another edge, so just check the other polygon edges
    intersectionPoints.push(...this.findIntersectionBetweenLineSegmentAndPolygonsCorners(polygons, edge));
    return intersectionPoints;
  }

  public static findIntersectionBetweenLineSegmentAndOtherPolygonEdges(
    polygons: PolygonRecord,
    edge: IEdge
  ): IIntersectionEdgePoint[] {
    const otherPolygonId = this.findOtherPolygonId(polygons, edge.polygonId);
    const otherPolygon = polygons[otherPolygonId];
    const intersectionPoints = [];
    for (let i = 0; i < otherPolygon.length; i++) {
      const otherLineSegment = [otherPolygon[i], otherPolygon[(i + 1) % otherPolygon.length]];
      const intersectionPoint = this.findIntersectionBetweenLineSegments(
        edge.lineSegment,
        otherLineSegment
      ) as number[];
      if (!this.checkIfArrayIsEmpty(intersectionPoint)) {
        intersectionPoints.push({ polygonId: otherPolygonId, edgeId: i, coord: intersectionPoint as [number, number] });
      }
    }
    return intersectionPoints;
  }

  public static findIntersectionBetweenCornerAndPolygonsEdgesAndCorners(
    corner: ICorner,
    polygons: PolygonRecord
  ): IntersectionPoint[] {
    let intersectionPoints: IntersectionPoint[] = [];
    intersectionPoints.push(...this.findIntersectionBetweenCornerAndPolygonsEdges(polygons, corner));
    intersectionPoints.push(...this.findIntersectionBetweenCornerAndPolygonsCorners(polygons, corner));
    return intersectionPoints;
  }

  public static findIntersectionBetweenCornerAndPolygonsEdges(
    polygons: PolygonRecord,
    corner: ICorner
  ): IIntersectionEdgePoint[] {
    const polygonIds = Object.keys(polygons).map(Number);
    const intersectionPoints = [];
    for (let i = 0; i < polygonIds.length; i++) {
      const polygonId = polygonIds[i];
      const polygon = polygons[polygonId];
      for (let j = 0; j < polygon.length; j++) {
        const lineSegment: LineSegment = [polygon[j], polygon[(j + 1) % polygon.length]];
        if (this.checkIfLineSegmentInteriorContainsCorner(lineSegment, corner)) {
          intersectionPoints.push({ polygonId: polygonId, edgeId: j, coord: corner.coords[1] });
        }
      }
    }
    return intersectionPoints;
  }

  public static findIntersectionBetweenCornerAndPolygonsCorners(
    polygons: PolygonRecord,
    corner: ICorner
  ): IIntersectionCornerPoint[] {
    const polygonIds = Object.keys(polygons).map(Number);
    const intersectionCorners = [];
    for (let i = 0; i < polygonIds.length; i++) {
      const polygonId = polygonIds[i];
      const polygon = polygons[polygonId];
      for (let j = 0; j < polygon.length; j++) {
        const polygonCorner = { polygonId: polygonId, cornerId: j, coords: this.findCornerCoords(polygon, j) };
        if (
          !this.checkIfCornersAreEqual(corner, polygonCorner) &&
          this.checkIfCornerInteriorsIntersect(corner, polygonCorner)
        ) {
          intersectionCorners.push({ polygonId: polygonId, cornerId: j, coord: polygonCorner.coords[1] });
        }
      }
    }
    return intersectionCorners;
  }

  public static checkIfCornerInteriorsIntersect(corner1: ICorner, corner2: ICorner) {
    if (this.checkIfCornersTouch(corner1.coords, corner2.coords)) {
      if (this.checkIfTouchingCornersInteriorsIntersect(corner1.coords, corner2.coords)) {
        return true;
      }
    }
    return false;
  }

  public static checkIfLineSegmentInteriorContainsCorner(lineSegment: LineSegment, corner: ICorner) {
    if (this.checkIfLineSegmentInteriorContainsPoint(lineSegment, corner)) {
      const polygonCorner: Corner = [lineSegment[0], corner.coords[1], lineSegment[1]];
      if (this.checkIfTouchingCornersInteriorsIntersect(polygonCorner, corner.coords)) {
        return true;
      }
    }
    return false;
  }

  public static checkIfLineSegmentInteriorContainsPoint(lineSegment: LineSegment, corner: ICorner) {
    const tolerance = 0.0001;
    if (this.checkIfPointsAreCollinear([lineSegment[0], lineSegment[1], corner.coords[1]])) {
      const lineAxis = { o: lineSegment[0], u: this.findVersorBetweenPoints(lineSegment[0], lineSegment[1]) };
      const [A, B, C] = this.convertCollinearPointsTo1D([lineSegment[0], lineSegment[1], corner.coords[1]], lineAxis);
      if (A < C - tolerance && C + tolerance < B) {
        return true;
      }
    }
    return false;
  }

  public static findIntersectionBetweenCornerAndPolygon(polygons: PolygonRecord, corner: ICorner) {
    const otherPolygonId = this.findOtherPolygonId(polygons, corner.polygonId);
    const otherPolygon = polygons[otherPolygonId];
    const cornerCoords = corner.coords;

    const tolerance = 0.0001; // It's important that this tolerance is the same as MathHelpers.checkIfPointsAreEqual tolerance. In fact, all linear tolerances should be the same!
    const intersectionPoints = [];
    for (let i = 0; i < otherPolygon.length; i++) {
      const lineSegment = [otherPolygon[i], otherPolygon[(i + 1) % otherPolygon.length]];
      if (this.checkIfPointsAreCollinear([lineSegment[0], lineSegment[1], cornerCoords[1]])) {
        const lineAxis = { o: lineSegment[0], u: this.findVersorBetweenPoints(lineSegment[0], lineSegment[1]) };
        const [A, B, C] = this.convertCollinearPointsTo1D([lineSegment[0], lineSegment[1], cornerCoords[1]], lineAxis);
        // If edge intersects point. (C + tolerance) < B excludes end point of edge of being classified into corner! This way no corners are repeated.
        if (A < C + tolerance && C + tolerance < B) {
          let polygonCorner: Corner;
          // If edge start point coincides with point
          if (this.checkIfPointsAreEqual([A], [C])) {
            polygonCorner = [
              otherPolygon[(i - 1 + otherPolygon.length) % otherPolygon.length],
              otherPolygon[i],
              otherPolygon[(i + 1) % otherPolygon.length]
            ];
          }
          // If edge end point coincides with point
          else if (this.checkIfPointsAreEqual([B], [C])) {
            throw new Error(
              'Corner was found to intersect edge without end point, but then was found to intersect end point!'
            );
          }
          // If edge interior contains point
          else {
            polygonCorner = [lineSegment[0], cornerCoords[1], lineSegment[1]];
          }

          if (this.checkIfTouchingCornersInteriorsIntersect(polygonCorner, cornerCoords)) {
            const intersectionPoint = { polygonId: otherPolygonId, edgeId: i, coord: cornerCoords[1] };
            intersectionPoints.push(intersectionPoint);
          }
        }
      }
    }
    return intersectionPoints;
  }

  public static findIntersectionBetweenLineSegmentAndPolygonsCorners(polygons: PolygonRecord, edge: IEdge) {
    const polygonIds = Object.keys(polygons).map(Number);
    const intersectionCorners = [];
    for (let i = 0; i < polygonIds.length; i++) {
      const polygonId = polygonIds[i];
      const polygon = polygons[polygonId];
      for (let j = 0; j < polygon.length; j++) {
        const polygonCorner = { polygonId: polygonId, cornerId: j, coords: this.findCornerCoords(polygon, j) };
        const intersectionPoint = this.findIntersectionBetweenLineSegmentAndPolygonCorner(
          polygons,
          edge,
          polygonCorner
        ) as number[];
        if (!this.checkIfArrayIsEmpty(intersectionPoint)) {
          intersectionCorners.push({ polygonId: polygonId, edgeId: j, coord: intersectionPoint as [number, number] });
        }
      }
    }
    return intersectionCorners;
  }

  public static checkIfPolygonHasClosed(previousLineSegments: LineSegment[], nextLineSegment: LineSegment) {
    for (let i = 0; i < previousLineSegments.length; i++) {
      if (
        this.checkIfVersorsHaveTheSameDirection(
          this.findVersorBetweenPoints(previousLineSegments[i][0], previousLineSegments[i][1]),
          this.findVersorBetweenPoints(nextLineSegment[0], nextLineSegment[1])
        )
      ) {
        if (
          this.checkIfLinesAreCollinear(
            previousLineSegments[i][0],
            previousLineSegments[i][1],
            nextLineSegment[0],
            nextLineSegment[1]
          )
        ) {
          if (
            this.checkIfCollinearLineSegmentInteriorsIntersect(
              previousLineSegments[i][0],
              previousLineSegments[i][1],
              nextLineSegment[0],
              nextLineSegment[1]
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  public static checkIfIntersectionPointIsAtCorner(intersectionPoint: IntersectionPoint) {
    return Object.keys(intersectionPoint).includes('cornerId');
  }

  public static checkIfIntersectionPointIsAtEdge(intersectionPoint: IntersectionPoint) {
    return Object.keys(intersectionPoint).includes('edgeId');
  }

  public static compareBranches(backVector: Vector) {
    return function (
      a: { polygonId: number; edgeId: number; lineSegment: [number, number][] },
      b: { polygonId: number; edgeId: number; lineSegment: [number, number][] }
    ) {
      const branchAAngleToBack = MathHelpers.findCounterClockwiseAngleBetweenVectors(
        backVector,
        MathHelpers.findVectorBetweenPoints(a.lineSegment[0], a.lineSegment[1]) as [number, number]
      );
      const branchBAngleToBack = MathHelpers.findCounterClockwiseAngleBetweenVectors(
        backVector,
        MathHelpers.findVectorBetweenPoints(b.lineSegment[0], b.lineSegment[1]) as [number, number]
      );
      return branchAAngleToBack - branchBAngleToBack;
    };
  }

  public static findNextPolygonEdge(polygons: PolygonRecord, currentEdge: IEdge) {
    const currentPolygon = polygons[currentEdge.polygonId];
    const nextEdgeId = (currentEdge.edgeId + 1) % currentPolygon.length;
    const nextLineSegment = this.findEdgeCoords(polygons, currentEdge.polygonId, nextEdgeId);
    const nextEdge = { polygonId: currentEdge.polygonId, edgeId: nextEdgeId, lineSegment: nextLineSegment };
    return nextEdge;
  }

  public static sliceEdgeAtIntersection(edge: IEdge, intersectionPoint: IntersectionPoint): [IEdge, IEdge] {
    const firstSlice = {
      polygonId: edge.polygonId,
      edgeId: edge.edgeId,
      lineSegment: [edge.lineSegment[0], intersectionPoint.coord] as LineSegment
    };
    const secondSlice = {
      polygonId: edge.polygonId,
      edgeId: edge.edgeId,
      lineSegment: [intersectionPoint.coord, edge.lineSegment[1]] as LineSegment
    };
    return [firstSlice, secondSlice];
  }

  public static findEdgeCoords(polygons: PolygonRecord, polygonId: number, edgeId: number): LineSegment {
    return [polygons[polygonId][edgeId], polygons[polygonId][(edgeId + 1) % polygons[polygonId].length]];
  }

  public static findOtherPolygon(polygons: PolygonRecord, currentPolygonIndex: number) {
    return polygons[this.findOtherPolygonId(polygons, currentPolygonIndex)];
  }

  public static findOtherPolygonId(polygons: PolygonRecord, currentPolygonIndex: number) {
    return (currentPolygonIndex + 1) % Object.keys(polygons).length;
  }

  public static checkIfCornersAreEqual(corner1: ICorner, corner2: ICorner) {
    return corner1.polygonId === corner2.polygonId && corner1.cornerId === corner2.cornerId;
  }

  public static findIntersectionBetweenLineSegmentAndPolygonCorners(polygons: PolygonRecord, edge: IEdge) {
    const otherPolygonId = this.findOtherPolygonId(polygons, edge.polygonId);
    const otherPolygon = polygons[otherPolygonId];
    const intersectionPoints = [];
    for (let i = 0; i < otherPolygon.length; i++) {
      const otherPolygonCorner = {
        polygonId: otherPolygonId,
        cornerId: i,
        coords: this.findCornerCoords(otherPolygon, i)
      };
      const intersectionPoint = this.findIntersectionBetweenLineSegmentAndPolygonCorner(
        polygons,
        edge,
        otherPolygonCorner
      ) as number[];
      if (!this.checkIfArrayIsEmpty(intersectionPoint)) {
        intersectionPoints.push({ polygonId: otherPolygonId, edgeId: i, coord: intersectionPoint as [number, number] });
      }
    }
    return intersectionPoints;
  }

  public static findCornerCoords(polygon: Polygon, cornerId: number): Corner {
    return [
      polygon[(cornerId - 1 + polygon.length) % polygon.length],
      polygon[cornerId],
      polygon[(cornerId + 1) % polygon.length]
    ];
  }

  public static findIntersectionBetweenLineSegmentAndPolygonCorner(
    _polygons: PolygonRecord,
    edge: IEdge,
    corner: ICorner
  ) {
    const tolerance = 0.0001; // It's important that this tolerance is the same as MathHelpers.checkIfPointsAreEqual tolerance. In fact, all linear tolerances should be the same!
    const lineSegment = edge.lineSegment;
    const cornerCoords = corner.coords;
    let intersectionPointCoords: Point | [] = [];
    if (this.checkIfPointsAreCollinear([lineSegment[0], lineSegment[1], cornerCoords[1]])) {
      const lineAxis = { o: lineSegment[0], u: this.findVersorBetweenPoints(lineSegment[0], lineSegment[1]) };
      const [A, B, C] = this.convertCollinearPointsTo1D([lineSegment[0], lineSegment[1], cornerCoords[1]], lineAxis);
      // If edge interior intersects corner
      if (A < C - tolerance && C + tolerance < B) {
        const polygonCornerCoords: Corner = [lineSegment[0], cornerCoords[1], lineSegment[1]];
        if (this.checkIfTouchingCornersInteriorsIntersect(polygonCornerCoords, cornerCoords)) {
          intersectionPointCoords = cornerCoords[1];
        }
      }
    }
    return intersectionPointCoords;
  }

  public static checkIfCornersTouch(corner1: Corner, corner2: Corner) {
    return this.checkIfPointsAreEqual(corner1[1], corner2[1]);
  }

  public static checkIfTouchingCornersInteriorsIntersect(corner1: Corner, corner2: Corner) {
    const corner1Vector1 = this.findVectorBetweenPoints(corner1[1], corner1[0]) as [number, number];
    const corner1Vector2 = this.findVectorBetweenPoints(corner1[1], corner1[2]) as [number, number];
    const corner1Angle = this.findCounterClockwiseAngleBetweenVectors(corner1Vector2, corner1Vector1);
    const corner1BisectorVersor = this.findBisectorVersor(corner1Vector2, corner1Vector1);

    const corner2Vector1 = this.findVectorBetweenPoints(corner2[1], corner2[0]) as [number, number];
    const corner2Vector2 = this.findVectorBetweenPoints(corner2[1], corner2[2]) as [number, number];
    const corner2Angle = this.findCounterClockwiseAngleBetweenVectors(corner2Vector2, corner2Vector1);
    const corner2BisectorVersor = this.findBisectorVersor(corner2Vector2, corner2Vector1);

    const bisectorVersorsAngle = this.findSmallestAngleBetweenVectors(corner1BisectorVersor, corner2BisectorVersor);
    const maximumAngle = corner1Angle / 2 + corner2Angle / 2;
    return bisectorVersorsAngle < maximumAngle;
  }

  // https://stackoverflow.com/questions/9043805/test-if-two-lines-intersect-javascript-function
  public static findIntersectionBetweenLineSegments(
    lineSegment1: [number, number][],
    lineSegment2: [number, number][]
  ) {
    const tolerance = 0.0001;
    const norm1 = this.findVectorNorm(this.findVectorBetweenPoints(lineSegment1[0], lineSegment1[1]));
    const norm2 = this.findVectorNorm(this.findVectorBetweenPoints(lineSegment2[0], lineSegment2[1]));
    const a = lineSegment1[0];
    const b = lineSegment1[1];
    const c = lineSegment2[0];
    const d = lineSegment2[1];
    const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
    if (det !== 0) {
      const lambda = ((d[1] - c[1]) * (d[0] - a[0]) + (c[0] - d[0]) * (d[1] - a[1])) / det;
      const gamma = ((a[1] - b[1]) * (d[0] - a[0]) + (b[0] - a[0]) * (d[1] - a[1])) / det;
      if (
        0 + tolerance < lambda * norm1 &&
        lambda * norm1 < norm1 - tolerance &&
        0 + tolerance < gamma * norm2 &&
        gamma * norm2 < norm2 - tolerance
      ) {
        const ab = this.findVectorBetweenPoints(a, b);
        return this.addArray(a, this.multiplyArray(ab, lambda));
      }
    }
    return [];
  }

  public static findEdgeIdLineSegment(polygons: PolygonRecord, edge: IEdge) {
    const polygon = polygons[edge.polygonId];
    const polygonEdgeId = edge.edgeId;
    const lineSegment = [polygon[polygonEdgeId], polygon[(polygonEdgeId + 1) % polygon[polygonEdgeId].length]];
    return lineSegment;
  }

  // POLYGON UNION

  public static findAreaOfUnionOfPolygons(polygons: Polygon[]) {
    const n = polygons.length;
    let unionArea = 0;
    for (let k = 0; k < n; k++) {
      const combinationIndexes = this.findCombinationIndexes(n, k + 1);
      for (let i = 0; i < combinationIndexes.length; i++) {
        const intersectionPolygon = this.findIntersectionBetweenMultiplePolygons(
          this.indexArray(polygons, combinationIndexes[i])
        );
        const intersectionArea = this.findPolygonArea(intersectionPolygon);
        unionArea = unionArea + (-1) ** k * intersectionArea;
      }
    }
    return unionArea;
  }

  public static findIntersectionBetweenMultiplePolygons(polygons: Polygon[]) {
    if (this.checkIfArrayIsEmpty(polygons)) {
      return [];
    }
    let intersectionPolygon = polygons[0];
    for (let i = 1; i < polygons.length; i++) {
      const intersectionPolygons = this.findIntersectionBetweenPolygons(intersectionPolygon, polygons[i]);
      intersectionPolygon = this.findIntersectionBetweenMultiplePolygons(intersectionPolygons);
    }
    return intersectionPolygon;
  }

  public static findPolygonArea(polygon: Polygon) {
    let area = 0;
    for (let i = 0; i < polygon.length; i++) {
      const edge = [polygon[i], polygon[(i + 1) % polygon.length]];
      area = area + ((edge[0][1] + edge[1][1]) * (edge[0][0] - edge[1][0])) / 2;
    }
    return area;
  }

  public static findCombinationIndexes(n: number, k: number) {
    let combinationIndexes: number[][] = [];
    let temp: number[] = [];
    [combinationIndexes, temp] = this.findCombinationIndexesHelper(n, 1, k, combinationIndexes, temp);
    return combinationIndexes;
  }

  public static findCombinationIndexesHelper(
    n: number,
    left: number,
    k: number,
    ans: number[][],
    temp: number[]
  ): [number[][], number[]] {
    // Pushing this vector to a vector of vector
    if (k == 0) {
      ans.push([...temp]);
      return [ans, temp];
    }
    // i iterates from left to n. First time left will be 1
    for (let i = left; i <= n; ++i) {
      temp.push(i - 1); // This -1 makes a combination of e.g. 3 2 by 2 be [[0,1],[1,2],[0,2]], instead of [[1,2],[2,3],[1,3]] (which is useful since these are numbers to index an array)
      [ans, temp] = this.findCombinationIndexesHelper(n, i + 1, k - 1, ans, temp);
      temp.pop();
    }
    return [ans, temp];
  }
}
