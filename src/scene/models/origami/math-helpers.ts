import { IVertices, IPlane } from './origami-types';
import * as THREE from 'three';

export class MathHelpers {


  public static checkIfArraysAreEqual(a:Array<any>, b:Array<any>){
      // WARNING: arrays must not contain {objects} or behavior may be undefined; a better (more complicated) option might be presented here:
      // https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript
      return JSON.stringify(a)==JSON.stringify(b);
  }


  public static checkIfArrayContainsArray(a:Array<any>, b:Array<any>){
    const s1 = JSON.stringify(a);
    const s2 = JSON.stringify(b);
    const i = s1.indexOf(s2);
    return i != -1;
  }

  /**
   * Returns an array of elements from a, indexed by b
   * @param a
   * @param b 
   */

  public static indexArray(a: Record<string, number[]>, b: string[]): number[][] {
    return b.map((element) => a[element]);
  }

  public static checkIfArrayIsEmpty(a: Array<any>) {
    return (Array.isArray(a) && a.length);
  }

  public static findIntersectionBetweenLineAndPlane(lineSegment: Record<string, number[]>, plane: IPlane): [boolean, number[]] {
    const lineTHREE = new THREE.Line3(new THREE.Vector3(...lineSegment.startPoint), new THREE.Vector3(...lineSegment.endPoint));  // Line3
    const planeTHREE = new THREE.Plane();
    planeTHREE.setFromNormalAndCoplanarPoint(new THREE.Vector3(...plane.versor), new THREE.Vector3(...plane.point));
    const intersectionPointTHREE = new THREE.Vector3();
    const planeIntersectsLine = planeTHREE.intersectsLine(lineTHREE);
    planeTHREE.intersectLine(lineTHREE, intersectionPointTHREE);
    return [planeIntersectsLine, intersectionPointTHREE.toArray()];
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
  public static addArray(a: number[], c: number[]): number[] {
    if (!Array.isArray(c)) {
      c = Array(a.length).fill(c);
    }
    return a.map((element, i) => element + c[i]);
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
   * @param a
   * @param b
   * @param c
   */
  public static projectPointOntoLine(a: number[], b: number[], c: number[]): number[] {
    const ab = this.findVectorBetweenPoints(a, b);
    const ac = this.findVectorBetweenPoints(a, c);
    return this.addArray(
      a,
      this.multiplyArray(ab, this.dot(ac, ab) / this.dot(ab, ab))
    );
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
}
