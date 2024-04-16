import { basename } from "path/win32";

export class PolygonIntersectionHelper {


    public static test() {

        let polygon1: [number, number][];
        let polygon2: [number, number][];

        for (let i = 0; i < 1; i++) {

            if (i === 0) {
                polygon1 = [[0, 0], [1, 0], [1, 1], [0, 1]];
                polygon2 = [[0, -1], [2, 0.5], [0, 2]];  // true
            }
            else {
                return 0;
            }
            console.log(this.findIntersectionBetweenPolygons(polygon1, polygon2));
        }

    }

    public static findIntersectionBetweenPolygons(polygon1: [number, number][], polygon2: [number, number][]) {

        let polygonIntersection;
        polygonIntersection = this.findIntersectionOfPolygonWithPolygon(polygon1, polygon2) ? [] : this.findIntersectionOfPolygonWithPolygon(polygon2, polygon1);
        return polygonIntersection;

    }

    public static findIntersectionOfPolygonWithPolygon(polygon1: [number, number][], polygon2: [number, number][]) {

        const polygons: Record<number, [number, number][]> = {0: polygon1, 1: polygon2};

        const startEdges: {polygonId: number, edgeId: number, lineSegment: [number, number][]}[] = [{polygonId: 0, edgeId: 0, lineSegment: this.findEdgeCoords(polygons, 0, 0)}];
        const previousEdges: {polygonId: number, edgeId: number, lineSegment: [number, number][]}[] = [];

        const intersectionPolygons = [];

        while (!this.checkIfArrayIsEmpty(startEdges)) {

            // Select current edge
            let currentEdge = startEdges.shift() as  {polygonId: number, edgeId: number, lineSegment: [number, number][]};  // This should be unecessary since startEdgeIds cannot be empty at this point.
            
            const intersectionPolygon = [];

            // Maybe do in one line:
            const previousLineSegments: [number, number][][] = [];
            previousEdges.forEach((e) => previousLineSegments.push(e.lineSegment));

            while (!this.checkIfAnyLineSegmentIsCollinearAndIntersectsLineSegmentInterior(previousLineSegments, currentEdge.lineSegment)) {

                // Find intersection between current line segment and other polygon
                const intersectionPoints = this.findIntersectionBetweenLineSegmentAndPolygonEdgesAndCorners(currentEdge, polygons);

                if (!this.checkIfArrayIsEmpty(intersectionPoints)) {

                    // Pick first intersection point
                    intersectionPoints.sort((a,b) => this.findDistanceBetweenPoints(currentEdge.lineSegment[0], a.coord) - this.findDistanceBetweenPoints(currentEdge.lineSegment[0], b.coord));
                    const intersectionPoint = intersectionPoints[0];

                    // Add point to intersection polygon
                    intersectionPolygon.push(intersectionPoint);

                    // Update previous segments
                    const [firstSlice, secondSlice] = this.sliceEdgeAtIntersection(currentEdge, intersectionPoint);
                    previousEdges.push(firstSlice);

                    // Find next edge segment
                    const nextEdge = this.findNextEdgeSegment(polygons, currentEdge, intersectionPoint);

                    // If starting polygon is exited, update start segments (so that after this polygon is concluded, the algoritm restarts at this branch that was not pursued)
                    if (currentEdge.polygonId === 0 && nextEdge.polygonId === 1) {
                        startEdges.push(secondSlice);
                    }

                    // Update current edge
                    currentEdge = nextEdge;

                } else {

                    // Select current point
                    const currentPoint = {polygonId: currentEdge.polygonId, edgeId: currentEdge.edgeId, coord: currentEdge.lineSegment[1]};

                    // If current point lies inside other polygon, add it to intersection polygon
                    const otherPolygon = this.findOtherPolygon(polygons, currentEdge.polygonId);
                    if (this.checkIfPolygonInteriorContainsPoint(otherPolygon, currentPoint.coord)) {
                        intersectionPolygon.push(currentPoint);
                    }

                    // Find next edge segment
                    const nextEdge = this.findNextPolygonEdge(polygons, currentEdge);

                    // Update current edge
                    currentEdge = nextEdge;
                }
            }

            // Add intersection polygon
            if (!this.checkIfArrayIsEmpty(intersectionPolygon)) {
                intersectionPolygons.push(intersectionPolygon); 
            }
        }
        return intersectionPolygons;
    }

    public static findNextPolygonEdge(polygons: Record<number, [number, number][]>, currentEdge: {polygonId: number, edgeId: number, lineSegment: [number, number][]}) {
        const currentPolygon = polygons[currentEdge.polygonId];
        const nextEdgeId = (currentEdge.edgeId + 1) % currentPolygon.length;
        const nextLineSegment = this.findEdgeCoords(polygons, currentEdge.polygonId, nextEdgeId);
        const nextEdge = {polygonId: currentEdge.polygonId, edgeId: nextEdgeId, lineSegment: nextLineSegment};
        return nextEdge;
    }

    public static sliceEdgeAtIntersection(edge: {polygonId: number, edgeId: number, lineSegment: [number, number][]}, intersectionPoint: {polygonId: number, edgeId: number, coord: [number, number]}){
        const firstSlice = edge;
        const secondSlice = edge;
        firstSlice.lineSegment[1] = intersectionPoint.coord;
        secondSlice.lineSegment[0] = intersectionPoint.coord;
        return [firstSlice, secondSlice];
    }

    public static findEdgeCoords(polygons: Record<number, [number, number][]>, polygonId: number, edgeId: number) {
        return [polygons[polygonId][edgeId], polygons[polygonId][(edgeId + 1) % Object.keys(polygons).length]];
    }

    public static findNextEdgeSegment(polygons: Record<number, [number, number][]>, currentEdge: {polygonId: number, edgeId: number, lineSegment: [number, number][]}, intersectionPoint: {polygonId: number, edgeId: number, coord: [number, number]}) {
        // Find current and other line segment
        const currentLineSegment = this.findEdgeCoords(polygons, currentEdge.polygonId, currentEdge.edgeId);
        const otherLineSegment = this.findEdgeCoords(polygons, intersectionPoint.polygonId, intersectionPoint.edgeId);

        // Find both possible next edge sections angles
        const backVector = this.findVectorBetweenPoints(intersectionPoint.coord, currentEdge.lineSegment[0]) as [number, number];
        const frontVectorCurrent = this.findVectorBetweenPoints(intersectionPoint.coord, currentEdge.lineSegment[1]) as [number, number];
        const frontVectorOther = this.findVectorBetweenPoints(intersectionPoint.coord, otherLineSegment[1]) as [number, number];
        const backToCurrentFrontAngle = this.findCounterClockwiseAngleBetweenVectors(backVector, frontVectorCurrent);
        const backToOtherFrontAngle = this.findCounterClockwiseAngleBetweenVectors(backVector, frontVectorOther);

        // Pick edge "more to the inside"
        if (backToOtherFrontAngle < backToCurrentFrontAngle) {
            currentEdge.polygonId = intersectionPoint.polygonId;
            currentEdge.edgeId = intersectionPoint.edgeId;
            currentEdge.lineSegment = [intersectionPoint.coord, otherLineSegment[1]];
        } else {
            currentEdge.lineSegment = [intersectionPoint.coord, currentLineSegment[1]]
        }
        return currentEdge;
    }

    public static findOtherPolygon(polygons: Record<number, [number, number][]>, currentPolygonIndex: number) {
        return polygons[this.findOtherPolygonId(polygons, currentPolygonIndex)];
    }

    public static findOtherPolygonId(polygons: Record<number, [number, number][]>, currentPolygonIndex: number) {
        return (currentPolygonIndex + 1) % Object.keys(polygons).length;
    }

    public static findIntersectionBetweenLineSegmentAndPolygonEdgesAndCorners(edge: {polygonId: number, edgeId: number, lineSegment: [number, number][]}, polygons: Record<number, [number, number][]>) {
        let intersectionPoints = [];
        intersectionPoints.push(...this.findIntersectionBetweenLineSegmentAndPolygonEdges(polygons, edge));
        intersectionPoints.push(...this.findIntersectionBetweenLineSegmentAndPolygonCorners(polygons, edge));
        return intersectionPoints;
    }

    public static findIntersectionBetweenLineSegmentAndPolygonEdges(polygons: Record<number, [number, number][]>, edge: {polygonId: number, edgeId: number, lineSegment: [number, number][]}): {polygonId: number, edgeId: number, coord: [number, number]}[] {
        const otherPolygonId = this.findOtherPolygonId(polygons, edge.polygonId);
        const otherPolygon = polygons[otherPolygonId];
        const intersectionPoints = [];
        for (let i = 0; i < otherPolygon.length; i++) {
            const otherLineSegment = [otherPolygon[i], otherPolygon[(i + 1) % otherPolygon.length]];
            const intersectionPoint = this.findIntersectionBetweenLineSegments(edge.lineSegment, otherLineSegment) as number[];
            if (!this.checkIfArrayIsEmpty(intersectionPoint)) {
                intersectionPoints.push({polygonId: otherPolygonId, edgeId: i, coord: intersectionPoint as [number, number]})
            }
        }
        return intersectionPoints;
    }

    public static findIntersectionBetweenLineSegmentAndPolygonCorners(polygons: Record<number, [number, number][]>, edge: {polygonId: number, edgeId: number, lineSegment: [number, number][]}) {
        const otherPolygonId = this.findOtherPolygonId(polygons, edge.polygonId);
        const otherPolygon = polygons[otherPolygonId];
        const intersectionPoints = [];
        for (let i = 0; i < otherPolygon.length; i++) {
            const otherPolygonCorner = {polygonId: otherPolygonId, cornerId: i, coords: this.findCornerCoords(polygons, otherPolygonId, i)};
            const intersectionPoint = this.findIntersectionBetweenLineSegmentAndPolygonCorner(polygons, edge, otherPolygonCorner) as number[];
            if (!this.checkIfArrayIsEmpty(intersectionPoint)) {
                intersectionPoints.push({polygonId: otherPolygonId, edgeId: i, coord: intersectionPoint as [number, number]});
            }
        }
        return intersectionPoints;
    }



    public static findCornerCoords(polygons: Record<number, [number, number][]>, polygonId: number, cornerId: number) {
        const otherPolygon = this.findOtherPolygon(polygons, polygonId);
        return [otherPolygon[(cornerId - 1 + otherPolygon.length) % otherPolygon.length], otherPolygon[cornerId], otherPolygon[(cornerId + 1) % otherPolygon.length]];
    }

    public static findIntersectionBetweenLineSegmentAndPolygonCorner(polygons: Record<number, [number, number][]>, edge: {polygonId: number, edgeId: number, lineSegment: [number, number][]}, corner: {polygonId: number, cornerId: number, coords: [number, number][]}) {
        const tolerance = 0.0001;  // It's important that this tolerance is the same as MathHelpers.checkIfPointsAreEqual tolerance. In fact, all linear tolerances should be the same!
        const lineSegment = edge.lineSegment;
        const currentPolygon = polygons[edge.polygonId];
        const i = edge.edgeId;
        const cornerCoords = corner.coords;
        let intersectionPoint: [number, number] | [] = [];
        if (this.checkIfPointsAreCollinear([lineSegment[0],lineSegment[1],cornerCoords[1]])) {
            const lineAxis = {o: lineSegment[0], u: this.findVersorBetweenPoints(lineSegment[0], lineSegment[1])};
            const [A, B, C] = this.convertCollinearPointsTo1D([lineSegment[0],lineSegment[1],cornerCoords[1]], lineAxis);
            // If edge intersects point
            if (A < (C + tolerance) && (C - tolerance) < B) {
                let polygonCornerCoords;
                // If edge start point coincides with point
                if (this.checkIfPointsAreEqual([A], [C])) {
                    polygonCornerCoords = [currentPolygon[(i - 1 + currentPolygon.length) % currentPolygon.length], currentPolygon[i], currentPolygon[(i + 1) % currentPolygon.length]];
                }
                // If edge end point coincides with point
                else if (this.checkIfPointsAreEqual([B], [C])) {
                    polygonCornerCoords = [currentPolygon[i], currentPolygon[(i + 1) % currentPolygon.length], currentPolygon[(i + 2) % currentPolygon.length]];
                }
                // If edge interior contains point
                else {
                    polygonCornerCoords = [lineSegment[0], cornerCoords[1], lineSegment[1]];
                }
                if (this.checkIfCornersIntersect(polygonCornerCoords, cornerCoords)) {
                    intersectionPoint = cornerCoords[1];
                }
            }
        }
        return intersectionPoint;
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
        const angle = this.findCounterClockwiseAngleBetweenVectors(u,v);
        const bisectorVersor = this.rotateVectorCounterClockwise(u, angle/2);
        return bisectorVersor;
    }

    public static findSmallestAngleBetweenVectors(u: number[], v: number[]) {
        const angle = Math.acos(this.dot(this.findVectorVersor(u), this.findVectorVersor(v)))  / Math.PI * 180;
        return angle;
    }

    public static rotateVectorCounterClockwise(u: [number, number], a: number){
        a = a * Math.PI / 180;
        const v = [u[0] * Math.cos(a) - u[1] * Math.sin(a), u[0] * Math.sin(a) + u[1] * Math.cos(a)];
        return v;
    }




    public static findIntersectionBetweenLineSegments(lineSegment1: [number, number][], lineSegment2: [number, number][]) {
        const a = lineSegment1[0];
        const b = lineSegment1[1];
        const c = lineSegment2[0];
        const d = lineSegment2[1];
        const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
        if (det === 0) {
            const lambda = ((d[1] - c[1]) * (d[0] - a[0]) + (c[0] - d[0]) * (d[1] - a[1])) / det;
            const gamma = ((a[1] - b[1]) * (d[0] - a[0]) + (b[0] - a[0]) * (d[1] - a[1])) / det;
            if ((0 < lambda && lambda < 1) && (0 < gamma && gamma < 1)) {
                const ab = this.findVectorBetweenPoints(a, b)
                return this.addArray(a, this.multiplyArray(ab, lambda));
            }
        }
        return [];
    }


    public static addArray(a: number[], c: number[] | number): number[] {
        if (!Array.isArray(c)) {
          c = Array(a.length).fill(c);
        }
        return a.map((element, i) => element + (c as [])[i]);
      }


    public static findEdgeIdLineSegment(polygons: Record<number, [number, number][]>, edgeId: {polygonId: number, polygonEdgeId: number}) {
        const polygon = polygons[edgeId.polygonId];
        const polygonEdgeId = edgeId.polygonEdgeId;
        const lineSegment = [polygon[polygonEdgeId], polygon[(polygonEdgeId + 1) % polygon[polygonEdgeId].length]];
        return lineSegment;
    }

    public static checkIfAnyLineSegmentIsCollinearAndIntersectsLineSegmentInterior(lineSegments: [number, number][][], lineSegment: [number, number][]) {
        for (let i = 0; i < lineSegments.length; i++) {
            if (this.checkIfLinesAreCollinear(lineSegments[i][0], lineSegments[i][1], lineSegment[0], lineSegment[1])) {
                if (this.checkIfCollinearLineSegmentInteriorsIntersect(lineSegments[i][0], lineSegments[i][1], lineSegment[0], lineSegment[1])) {
                    return true;
                }
            }
        }
        return false;
    }






    public static findIntersectionOfPolygonWithPolygonOld(polygon1: [number, number][], polygon2: [number, number][]) {

        const polygons: Record<number, [number, number][]> = {0: polygon1, 1: polygon2};
        let currentEdgeId: Record<string, number> = { polygonId: 0, polygonEdgeId: 0 };

        let currentPolygon = polygons[currentEdgeId.polygonId];
        let currentLineSegment = [currentPolygon[currentEdgeId.polygonEdgeId], currentPolygon[(currentEdgeId.polygonEdgeId + 1) % currentPolygon.length]];

        let intersectionPolygon = [];

        let intersectionStartEdgeId = undefined;
        let intersectionStartEdgeCoords = undefined;



        while (intersectionStartEdgeCoords === undefined || !(this.checkIfLinesAreCollinear(currentLineSegment[0], currentLineSegment[1], intersectionStartEdgeCoords[0], intersectionStartEdgeCoords[1]) && this.checkIfCollinearLineSegmentInteriorsIntersect(currentLineSegment[0], currentLineSegment[1], intersectionStartEdgeCoords[0], intersectionStartEdgeCoords[1]))) {



            const currentPolygonId = currentEdgeId.polygonId;
            const currentPolygonEdgeId = currentEdgeId.polygonEdgeId;
            currentPolygon = polygons[currentEdgeId.polygonId];
            // currentLineSegment = [currentPolygon[currentEdgeId.polygonEdgeId], currentPolygon[(currentEdgeId.polygonEdgeId + 1) % currentPolygon.length]];

            const otherPolygonId = (currentPolygonId + 1) % Object.keys(polygons).length;
            const otherPolygon = polygons[otherPolygonId];

            
            let currentPoint = currentLineSegment[0];


            // Check if current point is inside other polygon
            if (this.checkIfPolygonInteriorContainsPoint(otherPolygon, currentPoint)) {
                intersectionPolygon.push(currentPoint);

                

                // Check if current edge intersects an "other polygon"'s edge
                const intersectionPoints: [number, number][] = [];
                const intersectionOtherPolygonEdgeIds: number[] = [];
                for (let i = 0; i < otherPolygon.length; i++) {
                    const otherLineSegment = [otherPolygon[i], otherPolygon[(i + 1) % otherPolygon.length]];
                    if (this.checkIfEdgeIntersectsEdge(currentLineSegment[0], currentLineSegment[1], otherLineSegment[0], otherLineSegment[1])) {
                        intersectionPoints.push(this.findIntersectionBetweenLineSegments());
                        intersectionOtherPolygonEdgeIds.push(i);
                    }
                }

                if (!this.checkIfArrayIsEmpty(intersectionPoints)) {

                    intersectionOtherPolygonEdgeIds.sort((a, b) =>  this.findDistanceBetweenPoints(intersectionPoints[intersectionOtherPolygonEdgeIds.indexOf(a)], intersectionPoints[intersectionOtherPolygonEdgeIds.indexOf(b)]));
                    intersectionPoints.sort(e => this.findDistanceBetweenPoints(currentPoint, e));
                    const intersectionPoint = intersectionPoints[0];
                    const intersectionOtherPolygonEdgeId = intersectionOtherPolygonEdgeIds[0]
                    intersectionPolygon.push(intersectionPoint);

                    const otherPolygonLineSegment = [otherPolygon[intersectionOtherPolygonEdgeId], otherPolygon[(intersectionOtherPolygonEdgeId + 1) % otherPolygon.length]]
                    const currentToOtherCorner = [currentPoint, intersectionPoint,  otherPolygonLineSegment[1]];

                    const cornerVector1 = this.findVectorBetweenPoints(currentToOtherCorner[1], currentToOtherCorner[0]) as [number, number];
                    const cornerVector2 = this.findVectorBetweenPoints(currentToOtherCorner[1], currentToOtherCorner[2]) as [number, number];

                    const currentLineSegmentAngle = 180;
                    const currentToOtherCornerAngle = this.findCounterClockwiseAngleBetweenVectors(cornerVector2, cornerVector1);

                    if (currentToOtherCornerAngle < currentLineSegmentAngle) {
                        nextEdgeId =  { polygonId: otherPolygonId, polygonEdgeId: intersectionOtherPolygonEdgeId };
                        nextLineSegment = [intersectionPoint, otherPolygon[(intersectionOtherPolygonEdgeId + 1) % otherPolygon.length]];

                    } else {

                        nextEdgeId = currentEdgeId;
                        nextLineSegment = [intersectionPoint, currentPolygon[(currentPolygonEdgeId + 1) % currentPolygon.length]];
                    }

    
                } 
                else {

                    nextEdgeId = currentEdgeId;
                    nextPolygon = polygons[nextEdgeId.polygonId];
                    nextEdgeId.polygonEdgeId = (nextEdgeId.polygonEdgeId + 1) % nextPolygon.length;
                    nextLineSegment = [nextPolygon[nextEdgeId.polygonEdgeId], nextPolygon[(nextEdgeId.polygonEdgeId + 1) % nextPolygon.length]];


                }

                // Repeat: I think it's only necessary to update current values.
            } else {





            }





        }




        return [];
    }

    public static findCounterClockwiseAngleBetweenVectors(u: [number, number], v: [number, number]) {
        u = this.findVectorVersor(u) as [number, number];
        v = this.findVectorVersor(v) as [number, number];
        const dot = this.dot(u, v);
        const det = u[0] * v[1] - u[1] * v[0]; 
        const angle = (Math.atan2(det, dot) * 180 / Math.PI + 360) % 360;  // In degrees
        return angle;
    }

    public static findVectorVersor(u: number[]): number[] {
        const n = this.findVectorNorm(u);
        return this.multiplyArray(u, 1 / n);
    }

    public static checkIfEdgeIntersectsEdge(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
        if (!this.checkIfLinesAreParallel(a,b,c,d)) {
            if (this.checkIfNonParallelLineSegmentInteriorsIntersect(a,b,c,d)) {
                return true;
            }
        }
        return false;
    }

    public static checkIfLinesAreParallel(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
        const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
        return det === 0;
    }

    public static checkIfNonParallelLineSegmentInteriorsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
        const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
        const lambda = ((d[1] - c[1]) * (d[0] - a[0]) + (c[0] - d[0]) * (d[1] - a[1])) / det;
        const gamma = ((a[1] - b[1]) * (d[0] - a[0]) + (b[0] - a[0]) * (d[1] - a[1])) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }


    public static checkIfNonParallelLineSegmentInteriorsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
        const det = (b[0] - a[0]) * (d[1] - c[1]) - (d[0] - c[0]) * (b[1] - a[1]);
        const lambda = ((d[1] - c[1]) * (d[0] - a[0]) + (c[0] - d[0]) * (d[1] - a[1])) / det;
        const gamma = ((a[1] - b[1]) * (d[0] - a[0]) + (b[0] - a[0]) * (d[1] - a[1])) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }



    public static checkIfArrayIsEmpty(a: Array<any>) {
        return (Array.isArray(a) && a.length === 0);
    }



    public static checkIfCollinearLineSegmentInteriorsIntersect(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {

        const lineAxis = { o: a, u: this.findVersorBetweenPoints(a, b) }; const [a1, b1, c1, d1] = this.convertCollinearPointsTo1D([a, b, c, d], lineAxis);

        const min1 = Math.min(a1, b1);
        const max1 = Math.max(a1, b1);
        const min2 = Math.min(c1, d1);
        const max2 = Math.max(c1, d1);

        if (min1 >= min2 && min1 < max2) return true;  // Left part of segment 1 intersects segment 2
        if (max1 > min2 && max1 <= max2) return true;  // Right part of segment 1 intersects segment 2
        if (min1 < min2 && max1 > max2) return true;  // Middle of segment 1 intersects segment 2
        return false;
    }


    public static findVersorBetweenPoints(a: number[], b: number[]): number[] {
        const u = this.findVectorBetweenPoints(a, b);
        const n = this.findVectorNorm(u);
        return this.multiplyArray(u, 1 / n);
    }

    public static findVectorBetweenPoints(a: number[], b: number[]): number[] {
        return b.map((element, i) => element - a[i]);
    }

    public static findVectorNorm(u: number[]): number {
        return Math.sqrt(u.reduce((acc, element) => acc + Math.pow(element, 2), 0));
    }


    public static multiplyArray(a: number[], c: number): number[] {
        return a.map((element) => element * c);
    }


    public static convertCollinearPointsTo1D(a: number[][], lineAxis: { o: number[], u: number[] }) {
        const points1D = [];
        for (let p of a) {
            const v = this.findVectorBetweenPoints(lineAxis.o, p);
            points1D.push(this.dot(v, lineAxis.u));
        }
        return points1D;
    }

    public static dot(u: number[], v: number[]): number {
        return u.reduce((acc, element, i) => acc + element * v[i], 0);
    }


    public static checkIfLinesAreCollinear(a: [number, number], b: [number, number], c: [number, number], d: [number, number]) {
        return this.checkIfPointsAreCollinear([a, b, c, d]);
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

    public static checkIfPointsContainPoint(points: number[][], point: number[]) {
        for (let p of points) {
            if (this.checkIfPointsAreEqual(p, point)) {
                return true;
            }
        }
        return false;
    }

    public static checkIfPointsAreEqual(a: Array<any>, b: Array<any>) {
        const tolerance = 0.0001;
        const d = this.findDistanceBetweenPoints(a, b);
        return d < tolerance;
    }


    public static findDistanceBetweenPoints(a: number[], b: number[]): number {
        const u = this.findVectorBetweenPoints(a, b);
        return this.findVectorNorm(u);
    }

    public static checkIfPolygonInteriorContainsPoint(polygon: [number, number][], point: [number, number]) {
        let numOfCrossings = 0;
        for (let i = 0; i < polygon.length; i++) {
            const lineSegment = [polygon[i], polygon[(i + 1) % polygon.length]];
            // If edge contains point, polygon interior does not contain point
            if (this.checkIfPointsAreCollinear([lineSegment[0],lineSegment[1],point])) {
                const lineAxis = {o: lineSegment[0], u: this.findVersorBetweenPoints(lineSegment[0], lineSegment[1])};
                const [A, B, C] = this.convertCollinearPointsTo1D([lineSegment[0],lineSegment[1],point], lineAxis);
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
        return (AyCyBy || ByCyAy) && (C[0] < ((B[0] - A[0]) * (C[1] - A[1]) / (B[1] - A[1]) + A[0] - tolerance));  // If line crosses line segment to the right
    }

    public static checkIfNumberIsOdd(n: number) {
        return Math.abs(n % 2) == 1;
     }


}