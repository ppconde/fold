import { uint } from 'three/examples/jsm/nodes/Nodes.js';
import { TypeGuards } from '../../../guards/type-guards';
import { IVertices, IPlane } from './origami-types';
import * as THREE from 'three';
import { PolygonHelper } from './polygon-helper.js'


export class MathHelpers {

  public static elementWiseAnd(a: Array<any>, b: Array<any>) {
    return a.map((e, i) => e && b[i]);
  }

  public static elementWiseOr(a: Array<any>, b: Array<any>) {
    return a.map((e, i) => e || b[i]);
  }

  public static elementWiseNot(a: Array<any>) {
    return a.map(e => !e);
  }

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
      if (logicalPositions[i]){
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
    indices.sort(function (i, j) { return a[i] < a[j] ? -1 : a[i] > a[j] ? 1 : 0; });
    return indices;
  }

  public static sortByIndices(a: Array<any>, b: Array<any>) {
    a.sort((e, i) => e.index - b[i]);  // Check
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
    for(let i = 0; i < a.length; i++)
        if (a[i] === b)
            indexes.push(i);
    return indexes;
  }

  public static findPositionOfMinimumValue(a: Array<any>) {
    return a.reduce((r, v, i, a) => v >= a[r] ? r : i, -1);
  }

  public static checkIfArraysAreEqual(a: Array<unknown>, b: Array<unknown>) {
    // WARNING: arrays must not contain {objects} or behavior may be undefined; a better (more complicated) option might be presented here:
    // https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript
    return JSON.stringify(a) == JSON.stringify(b);
  }

  public static checkIfEdgesAreEqual(a: Array<unknown>, b: Array<unknown>) {
    return (JSON.stringify(a) == JSON.stringify(b) || JSON.stringify(a) == JSON.stringify(b.reverse()));
  }

  public static checkIfPointsAreEqual(a: Array<any>, b: Array<any>) {
    const tolerance = 0.0001;
    const d = this.findDistanceBetweenPoints(a, b);
    return d < tolerance;
  }

  public static checkIfArrayContainsArray(a: Array<unknown>, b: Array<unknown>) {
    const s1 = JSON.stringify(a);
    const s2 = JSON.stringify(b);
    const i = s2.indexOf(s1);
    return i != -1;
  }

  public static checkIfPointsContainPoint(points: number[][], point: number[]) {
    for (let p of points) {
      if (this.checkIfPointsAreEqual(p, point)) {
        return true;
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


  public static checkIfArrayContainsAnyElement(a: Array<any>, b: Array<any>) {
    return b.some(e => a.includes(e));
  }


  public static checkIfArrayContainsElements(a: Array<unknown>, b: Array<unknown>) {
    return b.every(r => a.includes(r));
  }

  public static indexArray(a: Array<unknown>, b: number[]): Array<any> {
    return b.map((element) => a[element]);
  }

  public static logicallyIndexArray(a: Array<any>, b: boolean[]) {
    const indices = b.flatMap((bool, index) => bool ? index : [])
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
    return (Array.isArray(a) && a.length === 0);
  }

  public static checkIfObjectIsEmpty(obj: Object) {
    for (const prop in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, prop)) {
        return false;
      }
    }
    return true;
  }

  public static findIntersectionBetweenLineSegmentAndPlane(lineSegment: Record<string, number[]>, plane: IPlane): [boolean, number[], number] {
    const lineTHREE = new THREE.Line3(new THREE.Vector3(...lineSegment.startPoint), new THREE.Vector3(...lineSegment.endPoint));  // Line3
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

  public static findArrayDimensions(a: any): Array<any> {
    return a.length ? [...[a.length], ...this.findArrayDimensions(a[0])] : [];
  }
  public static findArrayDimension(a: any): number {
    const aDims = this.findArrayDimensions(a);
    return aDims.length - aDims.filter((v) => (v === 1)).length;
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
      m = a.map((e1, i1) => e1.map((e2, i2) => e2 * (b as number)));
    } else {
      m = new Array(aNumRows);
      const bNumCols = bdims[1];
      for (var r = 0; r < aNumRows; ++r) {
        m[r] = new Array(bNumCols);
        for (var c = 0; c < bNumCols; ++c) {
          m[r][c] = 0;
          for (var i = 0; i < aNumCols; ++i) {
            m[r][c] += a[r][i] * (b as number[][])[i][c];
          }
        }
      }
    }
    return m;
  }

  public static transposeMatrix(a: number[][]) {
    return a[0].map((_, i) => a.map(row => row[i]));
  }

  public static convertCollinearPointsTo1D(a: number[][], lineAxis: { o: number[], u: number[] }) {
    const points1D = [];
    for (let p of a) {
      const v = this.findVectorBetweenPoints(lineAxis.o, p);
      points1D.push(this.dot(v, lineAxis.u));
    }
    return points1D;
  }

  // (https://www.reddit.com/r/askmath/comments/17jqn73/how_do_i_transform_3d_points_on_a_plane_to_2d/)
  public static convertCoplanarPointsTo2D(a: number[][], planeAxis: { o: number[], n: number[], u: number[], v: number[] }) {
    const basisOrigin = [planeAxis.o];
    const basisVectors = [planeAxis.u, planeAxis.v];
    const points2D = this.transposeMatrix(this.multiplyMatrix(basisVectors, this.addMatrix(this.transposeMatrix(a), this.multiplyMatrix(this.transposeMatrix(basisOrigin), -1))));
    return points2D;
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
    const angle = (Math.atan2(det, dot) * 180 / Math.PI + 360) % 360;  // In degrees
    return angle;
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
    const angle = uTHREE.angleTo(vTHREE) / Math.PI * 180;
    return angle;
  }

  public static findAngleBetweenVectorsAroundAxis(u: number[], v: number[], n: number[]) {
    u = this.findVectorVersor(u);
    v = this.findVectorVersor(v);
    n = this.findVectorVersor(n);
		const dot = MathHelpers.dot(u, v);
		const det = MathHelpers.dot(n, MathHelpers.cross(u, v));
		const angle = (Math.atan2(det, dot) * 180 / Math.PI + 360) % 360;
    return angle;
  }

  public static findPlaneNormalVersor(coplanarPoints: number[][]) {
    const [A, B, C] = this.pickThreeNonCollinearPoints(coplanarPoints);
    const AB = this.findVectorBetweenPoints(A, B);
    const AC = this.findVectorBetweenPoints(A, C);
    const u = this.cross(AB, AC);
    return this.findVectorVersor(u);
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

  public static checkIfCoplanarFacesIntersect(a: number[][], b: number[][]): boolean {
    const polygon1 = this.orientFaceClockwise(a) as [number, number][];
    const polygon2 = this.orientFaceClockwise(b) as [number, number][];
    return this.checkIfPolygonsIntersect(polygon1, polygon2);
  }

  public static orientFaceClockwise(a: number[][]) {
    const tolerance = 0.0001;
    const z = [0, 0, 1];
    const n = this.findPlaneNormalVersor(a);
    if (this.dot(z, n) < (-1 + tolerance)) {
      a = [a[0], ...[...a.slice(1)].reverse()];
    }
    return a;
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
      return [nonCollinearPoints[0], nonCollinearPoints[1], nonCollinearPoints[2]]
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
        const lineSegmentsIntersect = this.checkIfLineSegmentsIntersect(lineSegment1[0], lineSegment1[1], lineSegment2[0], lineSegment2[1]);
        if (lineSegmentsIntersect) {
          return true;
        }
      }
    }
    return false;
  }

  public static checkIfLineSegmentsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    if (this.checkIfLinesAreParallel(a, b, c, d)) {
      if (this.checkIfLinesAreCollinear(a, b, c, d)) {
        if (this.checkIfCollinearLineSegmentInteriorsIntersect(a, b, c, d)) {
          if (this.checkIfLineSegmentsHaveTheSameSense(a, b, c, d)) {  // If coincident segments are oriented the same
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


  public static checkIfLinesAreParallel(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
    return det === 0;
  }


  public static checkIfLinesAreCollinear(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    return this.checkIfPointsAreCollinear([a, b, c, d]);
  }


  public static checkIfCollinearLineSegmentInteriorsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {

    const lineAxis = { o: a, u: MathHelpers.findVersorBetweenPoints(a, b) }; const [a1, b1, c1, d1] = MathHelpers.convertCollinearPointsTo1D([a, b, c, d], lineAxis);

    const min1 = Math.min(a1, b1);
    const max1 = Math.max(a1, b1);
    const min2 = Math.min(c1, d1);
    const max2 = Math.max(c1, d1);

    if (min1 >= min2 && min1 < max2) return true;  // Left part of segment 1 intersects segment 2
    if (max1 > min2 && max1 <= max2) return true;  // Right part of segment 1 intersects segment 2
    if (min1 < min2 && max1 > max2) return true;  // Middle of segment 1 intersects segment 2
    return false;
  }

  public static checkIfLineSegmentsHaveTheSameSense(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    const u = MathHelpers.findVersorBetweenPoints(a, b);
    const v = MathHelpers.findVersorBetweenPoints(c, d);
    return MathHelpers.checkIfVersorsHaveTheSameSense(u, v);
  }

  public static checkIfVersorsHaveTheSameSense(u: number[], v: number[]) {
    const tolerance = 0.0001;
    return MathHelpers.dot(u, v) > (1 - tolerance);
  }

  public static checkIfNonParallelLineSegmentInteriorsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
    const lambda = ((d[1] - c[1]) * (d[0] - a[0]) + (c[0] - d[0]) * (d[1] - a[1])) / det;
    const gamma = ((a[1] - b[1]) * (d[0] - a[0]) + (b[0] - a[0]) * (d[1] - a[1])) / det;
    return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
  }


  // Polygons must have the same point order! (clock-wise or anti-clock-wise)
  public static checkIfPolygonsIntersect(polygon1: [number, number][], polygon2: [number, number][]) {
    if (this.checkIfPolygonEdgesIntersectAnyEdge(polygon1, polygon2)) return true;
    if (this.checkIfPolygonInteriorContainsAnyPoint(polygon1, polygon2) || this.checkIfPolygonInteriorContainsAnyPoint(polygon2, polygon1)) return true;
    if (this.checkIfPolygonEdgesIntersectAnyCorner(polygon1, polygon2) || this.checkIfPolygonEdgesIntersectAnyCorner(polygon2, polygon1)) return true;
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

  public static checkIfEdgeIntersectsEdge(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
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
        if (A < (C + tolerance) && (C - tolerance) < B) {
          return false;
        }
      }
      else {
        if (this.checkIfHorizontalLineCrossesNonCollinearLineSegmentToTheRight(point, lineSegment)) {
          numOfCrossings++;
        }
      }
    }
    return this.checkIfNumberIsOdd(numOfCrossings);
  }

  public static checkIfHorizontalLineCrossesNonCollinearLineSegmentToTheRight(horizontalLinePoint: [number, number], lineSegment: [number, number][]) {
    const tolerance = 0.0001;
    const A = lineSegment[0];
    const B = lineSegment[1];
    const C = horizontalLinePoint;
    const AyCyBy = (((A[1] - tolerance) < C[1]) && ((B[1] - tolerance) > C[1])); // This checks if horizontal line crosses line segment (with a positive margin below and a negative margin above)
    const ByCyAy = (((A[1] - tolerance) > C[1]) && (B[1] - tolerance < C[1]));
    return (AyCyBy || ByCyAy) && (C[0] < ((B[0] - A[0]) * (C[1] - A[1]) / (B[1] - A[1]) + A[0] - tolerance));
  }

  public static checkIfNumberIsOdd(n: number) {
    return Math.abs(n % 2) == 1;
  }

  public static checkIfPolygonEdgesIntersectAnyCorner(polygon1: [number, number][], polygon2: [number, number][]) {
    for (let i = 0; i < polygon2.length; i++) {
      const polygon2Corner = [polygon2[(i - 1 + polygon2.length) % polygon2.length], polygon2[i], polygon2[(i + 1) % polygon2.length]];
      if (this.checkIfPolygonEdgesIntersectCorner(polygon1, polygon2Corner)) {
        return true;
      }
    }
    return false;
  }

  public static checkIfPolygonEdgesIntersectCorner(polygon: [number, number][], corner: [number, number][]) {
    const tolerance = 0.0001;  // It's important that this tolerance is the same as MathHelpers.checkIfPointsAreEqual tolerance. In fact, all linear tolerances should be the same!
    for (let i = 0; i < polygon.length; i++) {
      const lineSegment = [polygon[i], polygon[(i + 1) % polygon.length]];
      if (this.checkIfPointsAreCollinear([lineSegment[0], lineSegment[1], corner[1]])) {
        const lineAxis = { o: lineSegment[0], u: this.findVersorBetweenPoints(lineSegment[0], lineSegment[1]) };
        const [A, B, C] = this.convertCollinearPointsTo1D([lineSegment[0], lineSegment[1], corner[1]], lineAxis);
        // If edge intersects point
        if (A < (C + tolerance) && (C - tolerance) < B) {
          let polygonCorner;
          // If edge start point coincides with point
          if (this.checkIfPointsAreEqual([A], [C])) {
            polygonCorner = [polygon[(i - 1 + polygon.length) % polygon.length], polygon[i], polygon[(i + 1) % polygon.length]];
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
    const angle = Math.acos(this.dot(this.findVectorVersor(u), this.findVectorVersor(v))) / Math.PI * 180;
    return angle;
  }

  public static rotateVectorCounterClockwise(u: [number, number], a: number) {
    a = a * Math.PI / 180;
    const v = [u[0] * Math.cos(a) - u[1] * Math.sin(a), u[0] * Math.sin(a) + u[1] * Math.cos(a)];
    return v;
  }

}

