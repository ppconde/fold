import * as THREE from 'three';

export class MathHelpers {
	static matrixMultiply = (A, B) => {
		return A.map((row, i) =>
			B[0].map((_, j) =>
				row.reduce((acc, _, n) => acc + A[i][n] * B[n][j], 0)
			));
	}

	static debugPlot(faces, points, scene) {
		let loader = new THREE.FontLoader();
		const dbug_material = new THREE.LineBasicMaterial({ color: 0x0000ff });
		const dbug_points = [];
		for (let face of faces) {
			for (let letter of face) {
				const coord = points[letter];
				dbug_points.push(new THREE.Vector3(...coord));

				loader.load('https://unpkg.com/three@0.77.0/examples/fonts/helvetiker_regular.typeface.json', function (font) {
					const dbug_text_geometry = new THREE.TextGeometry(letter, { font: font, size: 0.5, height: 0 });
					const dbug_text_mesh = new THREE.Mesh(dbug_text_geometry, dbug_material);
					dbug_text_mesh.position.set(...coord);
					scene.add(dbug_text_mesh);
				});
			}
			dbug_points.push(new THREE.Vector3(...points[face[0]]));

			const dbug_geometry = new THREE.BufferGeometry().setFromPoints(dbug_points);
			const dbug_line = new THREE.Line(dbug_geometry, dbug_material);
			scene.add(dbug_line);
			// renderer.render(scene, camera);
		}
	}

	static makePlaneBetween(from, to, points) {
		const from_point = points[from[from.length-1]];
		const from_norm = Math.sqrt(from_point.reduce((acc,element,k) => acc + Math.pow(element - points[from[0]][k],2), 0));

		const to_norm = Math.sqrt(points[to[to.length - 1]].reduce((acc, element, k) => acc + Math.pow(element - points[to[0]][k], 2), 0));
		const to_versor = points[to[to.length - 1]].map((element, i) => (element - points[to[0]][i]) / to_norm);
		const to_point = points[to[0]].map((element, i) => element + from_norm * to_versor[i]);

		const plane_vector = to_point.map((element, i) => element - from_point[i]);
		const plane_point = from_point.map((element, i) => element + plane_vector.map((element, j) => element / 2)[i]);
		const plane_norm = Math.sqrt(plane_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const plane_versor = plane_vector.map((element, i) => element / plane_norm);

		return { plane_point, plane_versor };
	}

	static makePlaneOnAxis(points_to_rotate, axis, points) {
		const axis_values = axis.map((element) => this.points[element]);
		const point = points[points_to_rotate[0]]
		const axis_line = new THREE.Line3( new THREE.Vector3(...axis_values[0]), new THREE.Vector3(...axis_values[1]));

		const plane_point = axis_line.closestPointToPoint(new THREE.Vector3(...point), false)  // should be equal to ...(new Vector3(...from_point))
		const plane_vector = point.map((element, i) => plane_point[i] - element);
		const plane_norm = Math.sqrt(plane_vector.reduce((acc,element) => acc + Math.pow(element,2), 0));
		const plane_versor = plane_vector.map((element, i) => element / plane_norm);

		return { plane_point, plane_versor };
	}

	static findFacesContainingPoints(from, faces) {
		let faceIds = []
		for (let i = 0; i < from.length; i++){
			for (let j = 0; j < faces.length; j++){
				if (faces[j].includes(from[i])){
					faceIds = MathHelpers.pushIfNotThere(faceIds, j)
					// faceLabels.to_pass[j] = 1;
				}
			}
		}
		return faceIds;
	}

	static selectFacesUntilPlane(faceIds, faces, points, plane, tolerance, face_selected, face_side, face_points_side) {
		for (let i = 0; i < faceIds.length; i++){
			
			if (!face_selected[faceIds[i]]){
				face_selected[faceIds[i]] = 1;
				[face_side[faceIds[i]], face_points_side[faceIds[i]]] = MathHelpers.inWhichSideOfPlane(faces[faceIds[i]], points, plane, tolerance);  // Make this

				if ((face_side[faceIds[i]] === -1) || (face_side[faceIds[i]] === 0))  {
					const neighbourFaceIds = MathHelpers.findFacesContainingPoints(faces[faceIds[i]], faces);
					[face_selected, face_side] = MathHelpers.selectFacesUntilPlane(neighbourFaceIds, faces, points, plane, tolerance, face_selected, face_side, face_points_side)
				}
			}
		}
		return [face_selected, face_side, face_points_side]
	}

	static inWhichSideOfPlane(face, points, plane, tolerance) {

		const point_sides = new Array(face.length);
		const edge_sides = new Array(face.length);

		for (let i = 0; i < face.length; i++) {
			point_sides[i] = MathHelpers.checkPlaneSide(plane, points[face[i]], tolerance);
		}

		let face_side;
		if (MathHelpers.allEqual(point_sides,1)){
			face_side = 1;
		} else if (MathHelpers.allEqual(point_sides,-1)){
			face_side = -1;
		} else {
			face_side = 0;
		}
		return [face_side, point_sides];
	}

	
	static allEqual(arr, val) {
		return arr.every(el => el === val);
	}

	static checkPlaneSide(plane, point, tolerance) {
		const {plane_point, plane_versor} = plane;
		const plane_point_vector = point.map((element, k) => element - plane_point[k]);
		const pos = plane_versor.reduce((acc,element,k) => acc + element * plane_point_vector[k], 0);

		let point_side;
		if (pos < 0 - tolerance) {
			point_side = -1;
		} else if (pos > 0 + tolerance) {
			point_side = +1;
		} else {
			point_side = -1;
		}
		return point_side
	}

	static getAllIndexes(arr, val) {
		var indexes = [], i;
		for(i = 0; i < arr.length; i++)
			if (arr[i] === val)
				indexes.push(i);
		return indexes;
	}

	static divideFacesIntersectingPlane(points, faces, face_side, plane, tolerance){

		// Usar faces com face_side = 0 para gerar edges dessas faces; depois, iterar nessas faces, e gerar ponto de interseção, adicionar a points (se ele ainda nao estiver marcado nos edges gerados!), e adicionar a new_faces; depois, substituir oldas faces de faces por new_faces 

		let new_faces = [];
		
		for (let i = 0; i < face_side.length; i++){

			const face = faces[i];
			
			// Face intersects plane
			if (face_side[i] === 0) {  

				[subfaces, points] = MathHelpers.divideFaceByPlane(face, plane, points, tolerance);

				for (let j = 0; j < subfaces.length; j++){
					new_faces.push(subfaces[j]);
				}
			}
			else {
				new_faces.push(face);
			}
		}
	}

	static divideFaceByPlane(face, plane, points, tolerance) {

		let inters_points = [];

		let new_face_letters = [];
		let is_intersection_point = [];
		let face_points = [];


		for (let j = 0; j < face.length; j++) {

			const edge = [points[face[j]], points[face[(j + 1) % face.length]]];
			const intersection = MathHelpers.intersectSegmentPlane(edge, plane, tolerance);

			if (intersection.exists){

				if (intersection.point == edge[0]){  // todo: check this with tolerance
					new_face_letters.push(face[j]);
					is_intersection_point.push(true);
				} else if  (intersection.point == edge[1]){ // todo: check this with tolerance
					// do nothing; this edge point will be labeled as intersection point in the next edge
				}
				else {
					new_face_letters.push(face[j]);
					is_intersection_point.push(false);
					// const new_letter = ...;  // generate new letter!

					const old_letters = Object.keys(points).map((element, k) => element.charCodeAt());
					const new_letter = String.fromCharCode(Math.max(...old_letters) + 1);

					new_face_letters.push(new_letter);  // add new letter!
					is_intersection_point.push(true);
					points[new_letter] = intersection.point;
				}

			// If intersection does not exist	
			} else {
				new_face_letters.push(face[j]);
				is_intersection_point.push(false);
			}
		}

		A.filter((x, i) => B[i])
		// intersection_points = ...;

		// Untested:
		const distances_to_first_point = intersection_points.map((point) => point.reduce((acc, coord, k) => acc + Math.sqrt(Math.pow(coord-intersection_points[0][k])),0));
		
		// Sort inters_points by distances_to_first_point. Then one for-loop to add points if necessary. Then one for-loop to add edges if necessary. Then, if there is 1 new edge (>1 should be impossible), make new_faces. Then replace.

		return [subfaces, points];
	
	}

	static intersectSegmentPlane(segment, plane, tolerance) {
		return 0  // todo
	}


	static intersectSegmentPlane(segment, plane, tolerance) {

		const segment_vector = segment[1].map((element, k) => element - segment[0][k]);
		const segment_norm = Math.sqrt(segment_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const segment_versor = segment_vector.map((element, k) => element / segment_norm);

		// Intersect plane and line (https://en.wikipedia.org/wiki/Line%E2%80%93plane_intersection)
		const num = plane.plane_point.reduce((acc, element, k) => acc + (element - segment[0][k]) * plane.plane_versor[k], 0);
		const denom = segment_versor.reduce((acc, element, k) => acc + element * plane.plane_versor[k], 0);

		const intersection = {exists: false, point: undefined};
		// Plane and line intersect once
		if (Math.abs(denom) > tolerance) { 
			const d = num / denom;
			if ((d > 0 - tolerance) && (d < segment_norm + tolerance)) { // Plane and edge (line segment) intersect once
				intersection.exists = true;
				intersection.point = segment[0].map((element, k) => element + segment_versor[k] * d);
			}
		}
		// Plane and line intersect infinitely: 
		else if ((Math.abs(denom) < tolerance) && (Math.abs(num) < tolerance)) {
			intersection.exists = true;
			intersection.point = segment[0];  // In this case, the intersection point is considered to be the first point of the segment
		}
		return intersection
	}

	static rotateFaces(from, plane, points, faces, pattern, tolerance) {
		return 0
	}

	static intersectPlaneWithOrigami4(from, plane, points, faces, pattern, tolerance) {
		debugger;
		// Fazer: função recursiva mas com faces, que guarda pontos de interseção para depois dividir faces:
		// FAZER: O algoritmo está no caderno! Implementar.
		let face_ids = MathHelpers.fromPointsFindFaces(from, faces) 

		debugger;

		let last_faces_ids = [];
		let last_faces_sides = [];
		last_faces_ids, last_faces_sides = MathHelpers.selectFacesUntilPlane(face_ids, faces, points, plane, tolerance, last_faces_ids, last_faces_sides);

		debugger;

		return from;
	}

	static selectFacesUntilPlane_old(faces_ids, faces, points, plane, tolerance, last_faces_ids, last_faces_sides) {
		for (let faces_id of faces_ids){
			const face = faces[faces_id];
			for (let letter of face){
				for (let i = 0; i < faces.length; i++) {
					if (!faces_ids.includes(i)){
						const j = faces[i].findIndex((element) => element === letter);
						if (j > -1){  // Found neighbour!
							faces_ids.push(i);
							const nface = faces[i];
							let sides = [];
							for (let nface_letter of nface) {
								sides.push(MathHelpers.checkPlaneSide(plane, points[nface_letter], tolerance));
							}
							if (sides.some(element => element === false)){  // Divide face
								last_faces_ids.push(i);
								last_faces_sides.push(sides);
							}
						}
					}
				}
			}
		}
	}

	static fromPointsFindFaces(points, faces) {
		let face_ids = [];
		for (let point of points){
			for (let i = 0; i < faces.length; i++) {
				const j = faces[i].findIndex((element) => element === point);
				if (j > -1){
					face_ids = MathHelpers.pushIfNotThere(face_ids, i);
				}

			}
		}
		return face_ids;
	}

	static findNeighbouringFaces(face_ids, faces) {

        let neighbour_face_ids = [];
		for (let face_id of face_ids){
			const points = faces[face_id];
			for (let point of points){
				for (let i = 0; i < faces.length; i++) {
					const j = faces[i].findIndex((element) => element === point);
					if (j > -1){
						
					}
				}
			}
		}
	}

	static addPoints(points_to_rotate, plane, faces, points, pattern) {

		for (let pl of points_to_rotate) {
			const npls = MathHelpers.findNeighbours(pl, faces);
			for (let npl of npls){
				if (!points_to_rotate.includes(npl)){

					const edge = [points[pl], points[npl]];
					const pi = MathHelpers.intersectLinePlane(edge, plane);
					const new_letter = MathHelpers.addPointsgenerateNewLetter(points);

					// Add to points
					points[new_point] = inters_point;

					// Add to faces
					// TODO. Cuidado para não destruir ordem da mão direita


				}
			}
		}
	}

	static generateNewLetter(points) {
		const point_codes = Object.keys(points).map((element,k) => element.charCodeAt());
		const new_letter = String.fromCharCode(Math.max(...point_codes)+1);
		return new_letter
	}

	static intersectLinePlane(edge, plane) {

		// Define edge versor
		const edge_vector = edge[1].map((element, k) => element - edge[0][k]);
		const edge_norm =  Math.sqrt(edge_vector.reduce((acc,element) => acc + Math.pow(element,2), 0));
		const edge_versor = edge_vector.map((element, k) => element / edge_norm);

		// Intersect plane and line (https://en.wikipedia.org/wiki/Line%E2%80%93plane_intersection)
		const num =  plane_point.reduce((acc,element,k) => acc +(element - edge[0][k]) * plane_versor[k], 0);
		const denom =  edge_versor.reduce((acc,element,k) => acc + element * plane_versor[k], 0);

		// Distance from first edge point to plane
		const d = num / denom;

		// Find intersection point
		const pi = edge[0].map((element, k) => element + edge_versor[k] * d);

		return pi
	}


	static selectPointsToRotate(from, plane, points, faces, tolerance, points_to_rotate) {
		debugger;
		for (let pl of from){
			if (!points_to_rotate.includes(pl)){
				if (MathHelpers.checkPlaneSide(plane, points[pl], tolerance)){
					points_to_rotate.push(pl);
					const npls = MathHelpers.findNeighbours(pl, faces);
					points_to_rotate = MathHelpers.selectPointsToRotate(npls, plane, points, faces, tolerance, points_to_rotate);
				}
			}
		}
		debugger;
		return points_to_rotate
	}



	static findNeighbours(point, faces) {
		let neighbours = [];
		for (let face of faces){
			const id = face.findIndex((element) => element === point);
			if (id > -1){
				const neighbour1 = face[(id - 1 + face.length) % face.length];
				const neighbour2 = face[(id + 1 + face.length) % face.length];
				neighbours = MathHelpers.pushIfNotThere(neighbours, neighbour1);
				neighbours = MathHelpers.pushIfNotThere(neighbours, neighbour2);
				debugger;
			}
		}
		return neighbours
	}

	static pushIfNotThere(arr, el){
		if (!arr.includes(el)){
			arr.push(el);
		}
		return arr;
	}


}