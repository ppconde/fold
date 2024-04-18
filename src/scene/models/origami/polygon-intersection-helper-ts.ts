import { IPolygon, IPolygonLabel, IPolygonPoint } from './origami-types';

export class PolygonIntersectionHelper {

  public static intersect(fig1: IPolygon, fig2: IPolygon) {
    for (let i = 0; i < fig1.length; i++) {
      fig1[i].x = +((fig1[i].x).toFixed(9));
      fig1[i].y = +((fig1[i].y).toFixed(9));
    }
    for (let i = 0; i < fig2.length; i++) {
      fig2[i].x = +((fig2[i].x).toFixed(9));
      fig2[i].y = +((fig2[i].y).toFixed(9));
    }
    const fig2a = this.alignPolygon(fig2, fig1);
    if (!this.checkPolygons(fig1, fig2a)) {
      return false;
    }
    const edges = this.edgify(fig1, fig2a);
    const polygons = this.polygonate(edges);
    const filteredPolygons = this.filterPolygons(polygons, fig1, fig2a, 'intersect');
    return filteredPolygons;
  }

  public static alignPolygon(polygon: IPolygon, points: IPolygon) {
    for (let i = 0; i < polygon.length; i++) {
      for (let j = 0; j < points.length; j++) {
        if (this.distance(polygon[i], points[j]) < 0.00000001)
          polygon[i] = points[j];
      }
    }
    return polygon;
  }

  public static distance(p1: IPolygonPoint, p2: IPolygonPoint) {
    const dx = Math.abs(p1.x - p2.x);
    const dy = Math.abs(p1.y - p2.y);
    return Math.sqrt(dx * dx + dy * dy);
  }

  //check polygons for correctness
  public static checkPolygons(fig1: IPolygon, fig2: IPolygon) {
    const figs = [fig1, fig2];
    for (let i = 0; i < figs.length; i++) {
      if (figs[i].length < 3) {
        console.error('Polygon ' + (i + 1) + ' is invalid!');
        return false;
      }
    }
    return true;
  }

  //create array of edges of all polygons
  public static edgify(fig1: IPolygon, fig2: IPolygon) {
    //create primary array from all edges
    const primEdges = this.getEdges(fig1).concat(this.getEdges(fig2));
    const secEdges = [];
    //check every edge
    for (let i = 0; i < primEdges.length; i++) {
      let points: IPolygonPoint[] = [];
      //for intersection with every edge except itself
      for (let j = 0; j < primEdges.length; j++) {
        if (i != j) {
          const interPoints = this.findEdgeIntersection(primEdges[i], primEdges[j]);
          points = this.addNewPoints(interPoints, points);
        }
      }
      //add start and end points to intersection points
      const startPoint = primEdges[i][0];
      startPoint.t = 0;
      const endPoint = primEdges[i][1];
      endPoint.t = 1;
      this.addNewPoints([startPoint, endPoint], points);
      //sort all points by position on edge
      points = this.sortPoints(points);
      //break edge to parts
      for (let k = 0; k < points.length - 1; k++) {
        const edge = [
          { x: points[k].x, y: points[k].y },
          { x: points[k + 1].x, y: points[k + 1].y }
        ];
        // check for existanse in sec.array
        if (!this.edgeExists(edge, secEdges)) {
          //push if not exists
          secEdges.push(edge);
        }
      }
    }
    return secEdges;
  }

  public static addNewPoints(newPoints: IPolygonPoint[], points: IPolygonPoint[]) {
    if (newPoints.length > 0) {
      //check for uniqueness
      for (let k = 0; k < newPoints.length; k++) {
        if (!this.pointExists(newPoints[k], points)) {
          points.push(newPoints[k]);
        }
      }
    }
    return points
  }

  public static sortPoints(points: IPolygonPoint[]) {
    const p = points as { x: number, y: number, t: number }[];
    p.sort((a, b) => {
      if (a.t > b.t) return 1;
      if (a.t < b.t) return -1;
    });
    return p;
  }

  public static getEdges(fig: IPolygonPoint[]): IPolygonPoint[][] {
    const edges: IPolygonPoint[][] = [];
    const len = fig.length;
    for (let i = 0; i < len; i++) {
      edges.push([
        { x: fig[(i % len)].x, y: fig[(i % len)].y },
        { x: fig[((i + 1) % len)].x, y: fig[((i + 1) % len)].y }
      ]);
    }
    return edges;
  }

  public static findEdgeIntersection(edge1: IPolygonPoint[], edge2: IPolygonPoint[]) {
    const x1 = edge1[0].x;
    const x2 = edge1[1].x;
    const x3 = edge2[0].x;
    const x4 = edge2[1].x;
    const y1 = edge1[0].y;
    const y2 = edge1[1].y;
    const y3 = edge2[0].y;
    const y4 = edge2[1].y;
    const nom1 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
    const nom2 = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    const t1 = nom1 / denom;
    const t2 = nom2 / denom;
    const interPoints: IPolygonPoint[] = [];
    //1. lines are parallel or edges don't intersect 
    if (((denom === 0) && (nom1 !== 0)) || (t1 <= 0) || (t1 >= 1) || (t2 < 0) || (t2 > 1)) {
      return interPoints;
    }
    //2. lines are collinear 
    else if ((nom1 === 0) && (denom === 0)) {
      //check if endpoints of edge2 lies on edge1
      for (let i = 0; i < 2; i++) {
        let classify = this.classifyPoint(edge2[i], edge1);
        //find position of this endpoints relatively to edge1
        if (classify.loc == 'ORIGIN' || classify.loc == 'DESTINATION') {
          classify = classify as { loc: string, t: number };
          interPoints.push({ x: edge2[i].x, y: edge2[i].y, t: classify.t });
        }
        else if (classify.loc == 'BETWEEN') {
          classify = classify as { loc: string, t: number };
          const x = +((x1 + classify.t * (x2 - x1)).toFixed(9));
          const y = +((y1 + classify.t * (y2 - y1)).toFixed(9));
          interPoints.push({ x: x, y: y, t: classify.t });
        }
      }
      return interPoints;
    }
    //3. edges intersect
    else {
      for (let i = 0; i < 2; i++) {
        const classify = this.classifyPoint(edge2[i], edge1);
        if (classify.loc == 'ORIGIN' || classify.loc == 'DESTINATION') {
          interPoints.push({ x: edge2[i].x, y: edge2[i].y, t: classify.t });
        }
      }
      if (interPoints.length > 0) {
        return interPoints;
      }
      const x = +((x1 + t1 * (x2 - x1)).toFixed(9));
      const y = +((y1 + t1 * (y2 - y1)).toFixed(9));
      interPoints.push({ x: x, y: y, t: t1 });
      return interPoints;
    }
  }

  public static classifyPoint(p: IPolygonPoint, edge: IPolygonPoint[]): IPolygonLabel {
    const ax = edge[1].x - edge[0].x;
    const ay = edge[1].y - edge[0].y;
    const bx = p.x - edge[0].x;
    const by = p.y - edge[0].y;
    const sa = ax * by - bx * ay;
    if ((p.x === edge[0].x) && (p.y === edge[0].y)) {
      return { loc: 'ORIGIN', t: 0 };
    }
    if ((p.x === edge[1].x) && (p.y === edge[1].y)) {
      return { loc: 'DESTINATION', t: 1 };
    }
    let theta = (this.polarAngle([edge[1], edge[0]]) - this.polarAngle([{ x: edge[1].x, y: edge[1].y }, { x: p.x, y: p.y }])) % 360;
    if (theta < 0) {
      theta = theta + 360;
    }
    if (sa < -0.000000001) {
      return { loc: 'LEFT', theta: theta };
    }
    if (sa > 0.000000001) {
      return { loc: 'RIGHT', theta: theta };
    }
    if (((ax * bx) < 0) || ((ay * by) < 0)) {
      return { loc: 'BEHIND', theta: theta };
    }
    if ((Math.sqrt(ax * ax + ay * ay)) < (Math.sqrt(bx * bx + by * by))) {
      return { loc: 'BEYOND', theta: theta };
    }
    let t;
    if (ax !== 0) {
      t = bx / ax;
    } else {
      t = by / ay;
    }
    return { loc: 'BETWEEN', t: t };
  }

  public static polarAngle(edge: IPolygonPoint[]): number {
    const dx = edge[1].x - edge[0].x;
    const dy = edge[1].y - edge[0].y;
    if ((dx === 0) && (dy === 0)) {
      //console.error("Edge has zero length.");
      // return false;
      throw new Error('Edge has zero length.');
    }
    if (dx === 0) {
      return ((dy > 0) ? 90 : 270);
    }
    if (dy === 0) {
      return ((dx > 0) ? 0 : 180);
    }
    const theta = Math.atan(dy / dx) * 360 / (2 * Math.PI);
    if (dx > 0) {
      return ((dy >= 0) ? theta : theta + 360);
    } else {
      return (theta + 180);
    }
  }

  public static pointExists(p: IPolygonPoint, points: IPolygonPoint[]) {
    if (points.length === 0) {
      return false;
    }
    for (let i = 0; i < points.length; i++) {
      if ((p.x === points[i].x) && (p.y === points[i].y)) {
        return true;
      }
    }
    return false;
  }

  public static edgeExists(e: IPolygonPoint[], edges: IPolygonPoint[][]) {
    if (edges.length === 0) {
      return false;
    }
    for (let i = 0; i < edges.length; i++) {
      if (this.equalEdges(e, edges[i]))
        return true;
    }
    return false;
  }

  public static equalEdges(edge1: IPolygonPoint[], edge2: IPolygonPoint[]) {
    if (((edge1[0].x === edge2[0].x) &&
      (edge1[0].y === edge2[0].y) &&
      (edge1[1].x === edge2[1].x) &&
      (edge1[1].y === edge2[1].y)) || (
        (edge1[0].x === edge2[1].x) &&
        (edge1[0].y === edge2[1].y) &&
        (edge1[1].x === edge2[0].x) &&
        (edge1[1].y === edge2[0].y))) {
      return true;
    } else {
      return false;
    }
  }

  public static polygonate(edges: IPolygonPoint[][]) {
    const polygons = [];
    let polygon: IPolygonPoint[] = [];
    const len = edges.length;
    const midpoints = this.getMidpoints(edges);
    let correctPolygon: boolean = true; // Gustavo addition
    //start from every edge and create non-selfintersecting polygons
    for (let i = 0; i < len - 2; i++) {
      const org = { x: edges[i][0].x, y: edges[i][0].y };
      const dest = { x: edges[i][1].x, y: edges[i][1].y };
      let currentEdge = i;
      let point;
      let p;
      let direction;
      let stop;
      //while we havn't come to the starting edge again
      for (direction = 0; direction < 2; direction++) {
        polygon = [];
        stop = false;
        while ((polygon.length === 0) || (!stop)) {
          //add point to polygon
          polygon.push({ x: org.x, y: org.y });
          point = undefined;
          //look for edge connected with end of current edge
          for (let j = 0; j < len; j++) {
            p = undefined;
            //except itself
            if (!this.equalEdges(edges[j], edges[currentEdge])) {
              //if some edge is connected to current edge in one endpoint
              if ((edges[j][0].x === dest.x) && (edges[j][0].y === dest.y)) {
                p = edges[j][1];
              }
              if ((edges[j][1].x === dest.x) && (edges[j][1].y === dest.y)) {
                p = edges[j][0];
              }
              //compare it with last found connected edge for minimum angle between itself and current edge 
              if (p) {
                const classify = this.classifyPoint(p, [org, dest]) as { loc: string, theta: number };
                //if this edge has smaller theta then last found edge update data of next edge of polygon
                if (!point ||
                  ((classify.theta < point.theta) && (direction === 0)) ||
                  ((classify.theta > point.theta) && (direction === 1))) {
                  point = { x: p.x, y: p.y, theta: classify.theta, edge: j };
                }
              }
            }
          }

          if ((typeof point === 'undefined')) {
            throw new Error('Point is undefined!');
          }
          //change current edge to next edge
          org.x = dest.x;
          org.y = dest.y;
          dest.x = point.x;
          dest.y = point.y;
          currentEdge = point.edge;
          //if we reach start edge
          if (this.equalEdges([org, dest], edges[i])) {
            stop = true;
            //check polygon for correctness
            /*for (let k = 0; k < allPoints.length; k++) {
              //if some point is inside polygon it is incorrect
              if ((!pointExists(allPoints[k], polygon)) && (findPointInsidePolygon(allPoints[k], polygon))) {
                polygon = false;
              }
            }*/
            for (let k = 0; k < midpoints.length; k++) {
              //if some midpoint is inside polygon (edge inside polygon) it is incorrect
              if (this.findPointInsidePolygon(midpoints[k], polygon)) {
                correctPolygon = false;
              }
            }
          }
        }
        //add created polygon if it is correct and was not found before
        if (correctPolygon && !this.polygonExists(polygon, polygons)) {
          polygons.push(polygon);
        }
      }
    }
    //console.log("polygonate: " + JSON.stringify(polygons));
    return polygons;
  }

  public static polygonExists(polygon: IPolygonPoint[], polygons: IPolygonPoint[][]) {
    //if array is empty element doesn't exist in it
    if (polygons.length === 0) return false;
    //check every polygon in array
    for (let i = 0; i < polygons.length; i++) {
      //if lengths are not same go to next element
      if (polygon.length !== polygons[i].length) continue;
      //if length are same need to check
      else {
        //if all the points are same
        for (let j = 0; j < polygon.length; j++) {
          //if point is not found break forloop and go to next element
          if (!this.pointExists(polygon[j], polygons[i])) break;
          //if point found
          else {
            //and it is last point in polygon we found polygon in array!
            if (j === polygon.length - 1) return true;
          }
        }
      }
    }
    return false;
  }

  public static filterPolygons(polygons: IPolygonPoint[][], fig1: IPolygon, fig2: IPolygon, mode: string) {
    const filtered = [];
    let c1, c2;
    let point;
    const bigPolygons = this.removeSmallPolygons(polygons, 0.0001);
    for (let i = 0; i < bigPolygons.length; i++) {
      point = this.getPointInsidePolygon(bigPolygons[i]);
      c1 = this.findPointInsidePolygon(point, fig1);
      c2 = this.findPointInsidePolygon(point, fig2);
      if (
        ((mode === 'intersect') && c1 && c2) || //intersection
        ((mode === 'cut1') && c1 && !c2) ||     //fig1 - fig2
        ((mode === 'cut2') && !c1 && c2) ||     //fig2 - fig1
        ((mode === 'sum') && (c1 || c2))) {     //fig1 + fig2      
        filtered.push(bigPolygons[i]);
      }
    }
    //console.log("filtered: " + JSON.stringify(filtered));
    return filtered;
  }

  public static removeSmallPolygons(polygons: IPolygonPoint[][], minSize: number) {
    const big = [];
    for (let i = 0; i < polygons.length; i++) {
      if (this.polygonArea(polygons[i]) >= minSize) {
        big.push(polygons[i]);
      }
    }
    return big;
  }

  public static polygonArea(p) {
    const len = p.length;
    let s = 0;
    for (let i = 0; i < len; i++) {
      s += (p[i % len].x * p[(i + 1) % len].y) - (p[i % len].y *
        p[(i + 1) % len].x);
    }
    return Math.abs(s / 2);
  }

  public static getPointInsidePolygon(polygon: IPolygonPoint[]): IPolygonPoint {
    let point;
    const size = this.getSize(polygon);
    const edges = this.getEdges(polygon);
    let y = size.y.min + (size.y.max - size.y.min) / Math.PI;
    const dy = (size.y.max - size.y.min) / 13;
    let line: IPolygonPoint[] = [];
    let points;
    let interPoints: IPolygonPoint[] = [];
    let pointsOK = false;
    while (!pointsOK) {
      line = [{ x: (size.x.min - 1), y: y }, { x: (size.x.max + 1), y: y }];
      //find intersections with all polygon edges
      for (let i = 0; i < edges.length; i++) {
        points = this.findEdgeIntersection(line, edges[i]);
        //if edge doesn't lie inside line
        if (points && (points.length === 1)) {
          interPoints.push(points[0]);
        }
      }
      interPoints = this.sortPoints(interPoints);
      //find two correct interpoints
      for (let i = 0; i < interPoints.length - 1; i++) {
        if (interPoints[i].t !== interPoints[i + 1].t) {
          //enable exit from loop and calculate point coordinates
          pointsOK = true;
          point = { x: ((interPoints[i].x + interPoints[i + 1].x) / 2), y: y };
        }
      }
      //all points are incorrect, need to change line parameters
      y = y + dy;
      if (((y > size.y.max) || (y < size.y.min)) && (pointsOK === false)) {
        pointsOK = true;
        // oint = undefined;
        point = { x: undefined, y: undefined };
      }
    }
    return point;
  }

  public static getSize(polygon: IPolygonPoint[]) {
    const size = {
      x: {
        min: polygon[0].x,
        max: polygon[0].x
      },
      y: {
        min: polygon[0].y,
        max: polygon[0].y
      }
    };
    for (let i = 1; i < polygon.length; i++) {
      if (polygon[i].x < size.x.min) size.x.min = polygon[i].x;
      if (polygon[i].x > size.x.max) size.x.max = polygon[i].x;
      if (polygon[i].y < size.y.min) size.y.min = polygon[i].y;
      if (polygon[i].y > size.y.max) size.y.max = polygon[i].y;
    }
    return size;
  }

  public static findPointInsidePolygon(point: IPolygonPoint, polygon: IPolygonPoint[]) {
    let cross = 0;
    const edges = this.getEdges(polygon);
    let classify;
    let org, dest;
    for (let i = 0; i < edges.length; i++) {
      [org, dest] = edges[i];
      classify = this.classifyPoint(point, [org, dest]);
      if ((
        (classify.loc === 'RIGHT') &&
        (org.y < point.y) &&
        (dest.y >= point.y)
      ) ||
        (
          (classify.loc === 'LEFT') &&
          (org.y >= point.y) &&
          (dest.y < point.y)
        )
      ) {
        cross++;
      }
      if (classify.loc === 'BETWEEN') return false;
    }
    if (cross % 2) {
      return true;
    } else {
      return false;
    }
  }

  public static getMidpoints(edges: IPolygonPoint[][]) {
    const midpoints = [];
    let x, y;
    for (let i = 0; i < edges.length; i++) {
      x = (edges[i][0].x + edges[i][1].x) / 2;
      y = (edges[i][0].y + edges[i][1].y) / 2;
      const classify = this.classifyPoint({ x: x, y: y }, edges[i]);
      if (classify.loc != 'BETWEEN') {
        console.error('Midpoint calculation error');
      }
      midpoints.push({ x: x, y: y });
    }
    return midpoints;
  }

  public static log(obj: Array<any>) {
    console.log(JSON.stringify(obj));
  }

}


// fig1 = [
//   { x:  5.35328472172063, y:  3.3464605876540254 },
//   { x: 31.10025450900146, y:  3.3464605876540254 },
//   { x: 31.10025450900146, y: 38.65353941234598   },
//   { x:  5.35328472172063, y: 38.65353941234598   }
// ];
// fig2 = [
//   { x: 31.10025450900146, y: 6.964961212615723  },
//   { x:  5.35328472172063, y: 3.3464605876540254 },
//   { x: 26.64671527827937, y: 38.65353941234598  }
// ];

// default test
// fig1 = [
//   { x: 100, y: 200  },
//   { x: 300, y: 150  },
//   { x: 300, y: 250  }
// ];

// fig2 = [
//   { x: 200, y: 100  },
//   { x: 200, y: 300  },
//   { x: 350, y: 300  },
//   { x: 350, y: 100  }
// ];

// console.log("DEBUG STARTED");
// let result = intersect(fig1, fig2);
// log(result);
// console.log("DEBUG STOPPED");