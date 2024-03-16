import { MathHelpers } from '../scene/models/origami/math-helpers';
import { PolygonHelper } from './polygon-helper'


export class PolygonIntersectionHelper{

    public static test() {
        // const polygon1: [number, number][] = [[0,0],[1,0],[1,1],[0,1]];
        // const polygon2: [number, number][] = [[0,-1],[2,0.5],[0,2]];
        // const polygon1: [number, number][] = [[0,0],[1,0],[1,1],[0,1]];
        // const polygon2: [number, number][] = [[0.5,-1],[2,0.5],[0.5,2]];
        // const polygon1: [number, number][] = [[0,0],[1,0],[1,1],[0,1]];
        // const polygon2: [number, number][] = [[1,-1],[2,0.5],[1,2]];
        // const polygon1: [number, number][] = [[0,0],[3,0],[3,3],[0,3]];
        // const polygon1: [number, number][] = [[0,0],[3,0],[3,3],[0,3]];
        // const polygon1: [number, number][] = [[0,0],[3,0],[3,3],[0,3]];
        // // const polygon2: [number, number][] = [[0,0],[2,0],[1,1]];
        // const polygon1: [number, number][] = [[0,0],[3,0],[3,3],[0,3]];
        // const polygon2: [number, number][] = [[0,0],[1,-1],[2,0]];
        // const res = this.checkIfPolygonsIntersect(polygon1, polygon2);
        // console.log(res);
    }

    // public static checkIfLinesAreParallel(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    //     const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
    //     return det === 0;
    // }

    // public static checkIfNonParallelLineSegmentInteriorsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    //     const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
    //     const lambda = ((d[1] - c[1]) * (d[0] - a[0]) + (c[0] - d[0]) * (d[1] - a[1])) / det;
    //     const gamma = ((a[1] - b[1]) * (d[0] - a[0]) + (b[0] - a[0]) * (d[1] - a[1])) / det;
    //     return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    // }

    // public static checkIfLinesAreCollinear(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    //     return MathHelpers.checkIfPointsAreCollinear([a,b,c,d]);
    // }

    // public static checkIfLineSegmentsHaveTheSameSense(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    //     const tolerance = 0.0001;
    //     return MathHelpers.dot(MathHelpers.findVersorBetweenPoints(a,b), MathHelpers.findVersorBetweenPoints(c,d)) > (1-tolerance);
    // }

    // public static checkIfCollinearLineSegmentInteriorsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {

    //     const lineAxis = {o: a, u: MathHelpers.findVersorBetweenPoints(a, b)};
    //     const [a1, b1, c1, d1] = MathHelpers.convertCollinearPointsTo1D([a,b,c,d], lineAxis);

    //     const min1 = Math.min(a1, b1);
    //     const max1 = Math.max(a1, b1);
    //     const min2 = Math.min(c1, d1);
    //     const max2 = Math.max(c1, d1);

    //     if (min1 >= min2 && min1 < max2) return true;  // Left part of segment 1 intersects segment 2
    //     if (max1 > min2 && max1 <= max2) return true;  // Right part of segment 1 intersects segment 2
    //     if (min1 < min2 && max1 > max2) return true;  // Middle of segment 1 intersects segment 2
    //     return false;
    // }


    // public static checkIfLineSegmentsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    //     if (this.checkIfLinesAreParallel(a,b,c,d)) {
    //         if (this.checkIfLinesAreCollinear(a,b,c,d)) {
    //             if (this.checkIfCollinearLineSegmentInteriorsIntersect(a,b,c,d)) {
    //                     if (this.checkIfLineSegmentsHaveTheSameSense(a,b,c,d)) {  // If coincident segments are oriented the same
    //                         return true;  // LINE INTERIORS COINCIDE DIRECTIONALLY
    //                     } 
    //             }
    //         }
    //     } else {
    //         if (this.checkIfNonParallelLineSegmentInteriorsIntersect(a,b,c,d)) {
    //             return true;  // LINE INTERIORS CROSS
    //         }
    //     }
    //     return false;
    // }


    // public static checkIfPolygonsEdgesIntersect(polygon1: [number, number][], polygon2:  [number, number][]) {
    //     for (let i = 0; i < polygon1.length; i++) {
    //         const lineSegment1 = [polygon1[i], polygon1[(i + 1) % polygon1.length]];
    //         for (let j = 0; j < polygon2.length; j++) {
    //             const lineSegment2 = [polygon2[j], polygon2[(j + 1) % polygon2.length]];
    //             const lineSegmentsIntersect = this.checkIfLineSegmentsIntersect(lineSegment1[0], lineSegment1[1], lineSegment2[0], lineSegment2[1]);
    //             if (lineSegmentsIntersect) {
    //                 return true;
    //             }
    //         }        
    //     }
    //     return false;
    // }

    // public static checkIfPolygonContainsPoint(polygon: [number, number][], point: [number, number]) {
    //     return PolygonHelper.robustPointInPolygon(polygon, point);
    // }

    // public static checkIfPointIsInsidePolygon(point: [number, number], polygon: [number, number][]){
    //         //A point is in a polygon if a line from the point to infinity crosses the polygon an odd number of times
    //         let odd = false;
    //         //For each edge (In this case for each point of the polygon and the previous one)
    //         for (let i = 0, j = polygon.length - 1; i < polygon.length; i++) {
    //             //If a line from the point into infinity crosses this edge
    //             if (((polygon[i][1] > point[1]) !== (polygon[j][1] > point[1])) // One point needs to be above, one below our y coordinate
    //                 // ...and the edge doesn't cross our Y corrdinate before our x coordinate (but between our x coordinate and infinity)
    //                 && (point[0] < ((polygon[j][0] - polygon[i][0]) * (point[1] - polygon[i][1]) / (polygon[j][1] - polygon[i][1]) + polygon[i][0]))) {
    //                 // Invert odd
    //                 odd = !odd;
    //             }
    //             j = i;
    //         }
    //         //If the number of crossings was odd, the point is in the polygon
    //         return odd;
    // }

    // // public static checkIfPolygonContainsPolygon() {

    // //     // If one point is inside polygon
    // //     for () {
    // //         this.checkIfPolygonContainsPoint();
    // //         if () {
    // //             true;
    // //         }
    // //     }

    // //     // If all corners are in border
    // //     this.checkIfPolygonBorderContainsCorner()




    // // }
    

    // // Polygons must have the same point order! (clock-wise or anti-clock-wise)
    // public static checkIfPolygonsIntersect(polygon1: [number, number][], polygon2: [number, number][]) {
    //     if (this.checkIfPolygonsEdgesIntersect(polygon1, polygon2)) return true;
    //     if (this.checkIfPolygonContainsPolygon(polygon1, polygon2) || this.checkIfPolygonContainsPolygon(polygon2, polygon1)) return true;
    //     // if (this.checkIfPolygonContainsPoint(polygon2, polygon1[0]) === -1 || this.checkIfPolygonContainsPoint(polygon1, polygon2[0]) === -1) return true;
    //     return false;
    // }

    // public static checkIfLinesAreCollinear(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    //     return MathHelpers.checkIfPointsAreCollinear([a,b,c,d]);
    // }

    // public static checkIfLineSegmentsHaveTheSameSense(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
    //     const tolerance = 0.0001;
    //     return MathHelpers.dot(MathHelpers.findVersorBetweenPoints(a,b), MathHelpers.findVersorBetweenPoints(c,d)) > (1-tolerance);
    // }

    // public static checkIfCollinearLineSegmentInteriorsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {

    //     const lineAxis = {o: a, u: MathHelpers.findVersorBetweenPoints(a, b)};
    //     const [a1, b1, c1, d1] = MathHelpers.convertCollinearPointsTo1D([a,b,c,d], lineAxis);

    //     const min1 = Math.min(a1, b1);
    //     const max1 = Math.max(a1, b1);
    //     const min2 = Math.min(c1, d1);
    //     const max2 = Math.max(c1, d1);

    //     if (min1 >= min2 && min1 < max2) return true;  // Left part of segment 1 intersects segment 2
    //     if (max1 > min2 && max1 <= max2) return true;  // Right part of segment 1 intersects segment 2
    //     if (min1 < min2 && max1 > max2) return true;  // Middle of segment 1 intersects segment 2
    //     return false;
    // }

    public static checkIfHorizontalLineCrossesLineSegmentToTheRight(horizontalLinePoint: [number, number], lineSegment: [number, number][]) {
        const tolerance = 0.0001;
        const A = lineSegment[0];
        const B = lineSegment[1];
        const C = horizontalLinePoint;
        const AyCyBy = (((A[1] - tolerance) < C[1]) && ((B[1] - tolerance) > C[1])); // These are probable unecessary since I garantee before vectors are not collinear. Maybe delete and rename to: checkIfHorizontalLineCrossesNonCollinearLineSegmentToTheRight
        const ByCyAy = (((A[1] - tolerance) > C[1]) && (B[1] - tolerance < C[1]));
        return ( AyCyBy || ByCyAy ) && (C[0] < ((B[0] - A[0]) * (C[1] - A[1]) / (A[1] - B[1]) + B[0]) - tolerance);
    }

    
}

