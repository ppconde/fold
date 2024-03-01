import { uint } from 'three/examples/jsm/nodes/Nodes.js';
import { TypeGuards } from '../../../guards/type-guards';
import { IVertices, IPlane } from './origami-types';
import * as THREE from 'three';
import { PolygonIntersectionHelper } from './polygon-intersection-helper.js'


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

  public static findArrayDimensions(a: any): Array<any> {
    return a.length ? [...[a.length], ...this.findArrayDimensions(a[0])] : [];
  }
  public static findArrayDimension(a: any): number {
    const aDims = this.findArrayDimensions(a);
    return aDims.length - aDims.filter((v) => (v === 1)).length;
  }


  public static addMatrix(a: number[][], b: number[][]|number[]|number) {
    const aDims = this.findArrayDimensions(a);
    const bDim = this.findArrayDimension(b);
    let c: number[][] = [];
    // If element to add is a number or a vector, transform it to matrix, to perform element-wise addition
    if (bDim===0) {
      for (let i = 0; i < aDims[0]; i++) {
        c[i] = [];
        for (let j = 0; j < aDims[1]; j++) {
          c[i][j] = b as number;
        }
      }
    } else if (bDim===1) {
      for (let i = 0; i < aDims[0]; i++) {
        c[i] = [];
        for (let j = 0; j < aDims[1]; j++) {
          c[i][j] = (b as number[][])[i][0];
        }
      }
    } else if (bDim===2) {
      c = b as number[][];
    }
    return a.map((e1, i1) => e1.map((e2,i2) => e2 + c[i1][i2]));
  }

  
  public static multiplyMatrix(a: number[][], b: number[][]|number) {
    const [aNumRows, aNumCols] = this.findArrayDimensions(a);
    const bdims = this.findArrayDimensions(b);
    const bDim = this.findArrayDimension(b);
    let m;
    if (bDim===0) {
      m = a.map((e1, i1) => e1.map((e2,i2) => e2 * (b as number))); 
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

  // (https://www.reddit.com/r/askmath/comments/17jqn73/how_do_i_transform_3d_points_on_a_plane_to_2d/)
  public static convertCoplanarPointsTo2D(a: number[][], planeAxis: {o:number[], n:number[], u:number[], v:number[]}) {

    const basisOrigin = [planeAxis.o];
    const basisVectors = [planeAxis.u, planeAxis.v];
    const points2D = this.transposeMatrix(this.multiplyMatrix(basisVectors, this.addMatrix(this.transposeMatrix(a), this.multiplyMatrix(this.transposeMatrix(basisOrigin),-1))));

    // Idk what I did wrong but this doesn't work:
    // (https://stackoverflow.com/questions/49769459/convert-points-on-a-3d-plane-to-2d-coordinates)
    // const o = planeAxis.o;
    // const n = planeAxis.n;
    // const u = planeAxis.u;
    // const v = planeAxis.v;

    // const S = new THREE.Matrix4(); 
    // S.set(  o[0], u[0], v[0], n[0], 
    //         o[1], u[1], v[1], n[1],
    //         o[2], u[2], v[2], n[2], 
    //         1, 1, 1, 1 );
    
    // const D = new THREE.Matrix4(); 
    // D.set(  0, 1, 0, 0, 
    //         0, 0, 1, 0,
    //         0, 0, 0, 1,
    //         1, 1, 1, 1 );

    // S.invert();

    // const M = D.multiply(S);

    // const b = [];
    // for (let i = 0; i < a.length; i++) {
    //   const p = new THREE.Vector3( ...a[i] );
    //   p.applyMatrix4(M);
    //   b.push([p.getComponent(0), p.getComponent(1)]);
    // }
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
    // const faceSide = nodeSides.every((e) => e === 1) ? 1 : nodeSides.every((e) => e === -1) ? -1 : 0;
    const faceSide = !nodeSides.some((e) => e === -1) ? 1 : !nodeSides.some((e) => e === 1) ? -1 : 0;
    return faceSide;
  }

  public static checkIfLineSegmentsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    const tolerance = 0.0001;
    const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
    if (det === 0) {
      return false;
    } else {
      const lambda = ((d[1] - c[1]) * (d[0] - a[0]) + (c[0] - d[0]) * (d[1] - a[1])) / det;
      const gamma = ((a[1] - b[1]) * (d[0] - a[0]) + (b[0] - a[0]) * (d[1] - a[1])) / det;
      return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1)
    }
  }

  // Some input polygons have actually collinear points. I think in some cases these badly defined polygons can get PolygonIntersectionHelper stuck in an infinite loop.
  // Considering eliminating collinear points (the array should be read by a moving windows of 3 elements and if the elements were deemed collinear, the middle should be dropped)
  public static checkIfCoplanarFacesIntersect(a: number[][], b: number[][]): boolean{
    let polygon1: {x:number, y:number}[] = [];
    let polygon2: {x:number, y:number}[] = [];
    a.forEach((e) => polygon1.push({x: e[0], y: e[1]}));
    b.forEach((e) => polygon2.push({x: e[0], y: e[1]}));
    let c = PolygonIntersectionHelper.intersect(polygon1, polygon2) as any[];  // Could c = false?
    return !this.checkIfArrayIsEmpty(c);
  }


  // // (https://stackoverflow.com/questions/49769459/convert-points-on-a-3d-plane-to-2d-coordinates)
  // public static convertCoplanarPointsTo2D(a: number[][], planeAxis: {o:number[], n:number[], u:number[], v:number[]}) {

  //   const o = planeAxis.o;
  //   const n = planeAxis.n;
  //   const u = planeAxis.u;
  //   const v = planeAxis.v;

  //   const S = new THREE.Matrix4(); 
  //   S.set(  o[0], u[0], v[0], n[0], 
  //           o[1], u[1], v[1], n[1],
  //           o[2], u[2], v[2], n[2], 
  //           1, 1, 1, 1 );
    
  //   const D = new THREE.Matrix4(); 
  //   D.set(  0, 1, 0, 0, 
  //           0, 0, 1, 0,
  //           0, 0, 0, 1,
  //           1, 1, 1, 1 );

  //   S.invert();

  //   const M = D.multiply(S);

  //   const b = [];
  //   for (let i = 0; i < a.length; i++) {
  //     const p = new THREE.Vector3( ...a[i] );
  //     p.applyMatrix4(M);
  //     b.push([p.getComponent(0), p.getComponent(1)]);
  //   }
  //   return b;
  // }




  // public static checkIfPointsAreCollinear(a: number[][]) {
  //   const u = MathHelpers.findVersorBetweenPoints(a[0], a[1]);
  //   for (let i = 2; i < a.length; i++) {
  //     const v = MathHelpers.findVersorBetweenPoints(a[0], a[i]);

  //     if (this.dot(u,v) < )


  //     if (!this.checkIfPointsAreEqual(u,v)){
  //       return false; 
  //     }
  //   }
  //   return true;
  // }

  public static findAveragePoint(points: number[][]) {
    let a = Array(points[0].length).fill(0);
    for (const arg of points) {
      a = this.addArray(a,arg);
    }
    a = this.multiplyArray(a,1/points.length);
    return a;
  }


  // public static pickThreeNonCollinearPoints(points: number[][]) {
  //   // Find non-coincident points
	// 	const nonCoincidentPoints = [];
	// 	for (let i = 0; i < points.length; i++) {
  //     if (!this.checkIfPointsContainPoint(nonCoincidentPoints, points[i])) {
  //       nonCoincidentPoints.push(points[i]);
  //     }
  //   }
  //   if (nonCoincidentPoints.length < 3) {
  //     throw new Error('There were not at least 3 non-coincident points.');
  //   }

  //   // Find non-collinear points
  //   const nonCollinearPoints = [nonCoincidentPoints[0], nonCoincidentPoints[1]];
  //   for (let j = 2; j < nonCoincidentPoints.length; j++) {
  //     if (!this.checkIfPointsAreCollinear([...nonCollinearPoints, nonCollinearPoints[j]])) {
  //       nonCollinearPoints.push();
  //     }
  //   }

  //   if (nonCollinearPoints.length < 3) {
  //     throw new Error('There were not at least 3 non-collinear points.');
  //   }

  //   return [nonCollinearPoints[0], nonCollinearPoints[1], nonCollinearPoints[2]];
  // }


  public static pickThreeNonCollinearPoints(points: number[][]) {
    // Find all collinear points
    const nonCollinearPoints = [points[0]];
    for (let i = 0; i < points.length; i++) {
      if (nonCollinearPoints.length === 1) {
        if (!this.checkIfPointsContainPoint(nonCollinearPoints, points[i])) {
          nonCollinearPoints.push(points[i]);
        }
      } else {
        if (!this.checkIfPointsAreCollinear([...nonCollinearPoints, points[i]])){
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
          if (Math.abs(this.dot(u,v)) < 1 - tolerance) {
            return false;
          }
        }
      }
      nonCollinearPoints.push(points[i]);
    }
    return true;
  }
}

