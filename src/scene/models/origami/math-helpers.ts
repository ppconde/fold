import { uint } from 'three/examples/jsm/nodes/Nodes.js';
import { TypeGuards } from '../../../guards/type-guards';
import { IVertices, IPlane, I2DVector } from './origami-types';
import * as THREE from 'three';

export class MathHelpers {

  public static elementWiseAnd(a: Array<any>, b: Array<any>) {
    return a.map((e, i) => e && b[i]);
  }

  public static findSortIndices(a: Array<any>){
    let indices = [...Array(a.length).keys()];
    indices.sort(function (i, j) { return a[i] < a[j] ? -1 : a[i] > a[j] ? 1 : 0; });
    return indices;
  }

  // public static sortByIndices(a: Array<any>, b: Array<any>){
  //   a.sort((e,i) => e.index - b.index);
  //   return a;

  // }

  public static findPositionOfArrayInArray(a: Array<any>, b: Array<any>) {
    for (let i = 0; i < b.length; i++) {
      if (this.checkIfArraysAreEqual(a, b[i])) {
          return i;
      }
    }  
    return -1;
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


  public static checkIfArrayContainsAnyElement(a: Array<any>, b: Array<unknown>) {
    return b.some(e=> a.includes(e));
  }


  public static checkIfArrayContainsElements(a: Array<unknown>, b: Array<unknown>){
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

  public static checkIfArrayIsEmpty(a: Array<unknown>) {
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

  public static findIntersectionBetweenLineAndPlane(lineSegment: Record<string, number[]>, plane: IPlane): [boolean, number[], number] {
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
          if (lineTHREE.start.equals(intersectionPointTHREE)){
            intersectedVerticeIndex = 0;
          } else {
            intersectedVerticeIndex = 1;
          }
        }
      } else {
        planeIntersectsLine = true;
        if (lineTHREE.start.equals(intersectionPointTHREE)){
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

  /**
   * Returns the vector between two points
   * @param a
   * @param b
   */
  public static findVectorBetweenPoints(a: number[], b: number[]): number[] {
    return b.map((element, i) => element - a[i]);
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
    return [u[1]*v[2] - u[2]*v[1], -(u[0]*v[2] - u[2]*v[0]), u[0]*v[1] - u[1]*v[0]];
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

  public static findClockwiseAngleBetweenVectors(u: [number, number], v: [number, number]) {
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

  public static findPlaneNormalVersor(coplanarPoints: number[][]) {
    const AB = this.findVectorBetweenPoints(coplanarPoints[0], coplanarPoints[1]);
    const AC = this.findVectorBetweenPoints(coplanarPoints[0], coplanarPoints[2]);
    const u = this.cross(AB,AC);
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
    const faceSide = nodeSides.every((e) => e === 1) ? 1 : nodeSides.every((e) => e === -1) ? -1 : 0;
    return faceSide;
  }

}
