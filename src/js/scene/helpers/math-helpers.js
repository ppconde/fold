import * as THREE from 'three';

export class MathHelpers {


	static makePlaneBetween(points, from, to) {
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


	static labelFaces(points, faces, from, plane, tolerance) {

		let from_not_intersecting_plane = [];

		for (let i = 0; i < from.length; i++){
			const plane_side = MathHelpers.checkPlaneSide(plane, points[from[i]], tolerance);
			if (plane_side !== 0){
				from_not_intersecting_plane.push(from[i]);
			}
		}

		const start_faces = MathHelpers.findFacesContainingPoints(from_not_intersecting_plane, faces);
		let labels = [];
		for (let i = 0; i < faces.length; i++){
			labels.push({'face': null, 'face_points': new Array(faces[i].length).fill(null), 'selected': 0});
		}

		labels = MathHelpers.selectFacesUntilPlane(points, faces, tolerance, plane, start_faces, labels);  // Maybe do not consider plane in faces away from "from" (so, not in the way to "to"). This is to not create other unwanted axis, in case where the origami is very folded in 3D. Maybe just in case there is another plane intersection!

		return labels;
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

	static pushIfNotThere(arr, el){
		if (!arr.includes(el)){
			arr.push(el);
		}
		return arr;
	}


	static selectFacesUntilPlane(points, faces, tolerance, plane, start_faces, labels) {
		for (let i = 0; i < start_faces.length; i++){
			
			const id = start_faces[i];

			if (!labels[id].selected){
				labels[id].selected = 1;
				[labels[id].face, labels[id].face_points] = MathHelpers.inWhichSideOfPlane(points, tolerance, plane, faces[id]); 

				if ((labels[id].face === -1) || (labels[id].face  === 0))  {
					// Find points in current face to use in the search for neighbouring faces. By excluding points w/ label 0 (intersection points), in the "around instructions", the search will not pass to the "to" face, which would be accepted since it's also on the "from" side of the plane 
					let points_to_find_neighbour_faces = [];
					for (let j = 0; j < faces[id]; j++){
						if (labels[id].face_points[j] === -1){
							points_to_find_neighbour_faces.push(faces[id][j]);
						}
					}
					// const neighbourFaceIds = MathHelpers.findFacesContainingPoints(faces[id], faces);
					const neighbourFaceIds = MathHelpers.findFacesContainingPoints(points_to_find_neighbour_faces, faces);
					labels = MathHelpers.selectFacesUntilPlane(points, faces, tolerance, plane, neighbourFaceIds, labels)
				}
			}
		}
		return labels
	}


	static inWhichSideOfPlane(points, tolerance, plane, face) {

		const point_sides = new Array(face.length);

		for (let i = 0; i < face.length; i++) {
			point_sides[i] = MathHelpers.checkPlaneSide(plane, points[face[i]], tolerance);
		}

		let face_side;
/* 		if (MathHelpers.allEqual(point_sides,1)){
			face_side = 1;
		} else if (MathHelpers.allEqual(point_sides,-1)){
			face_side = -1;
		} else {
			face_side = 0;
		} */
		if (!point_sides.includes(-1)){
			face_side = 1;
		} else if (!point_sides.includes(1)){
			face_side = -1;
		} else {
			face_side = 0;
		}
		return [face_side, point_sides];
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
			point_side = 0;
		}
		return point_side
	}

	static allEqual(arr, val) {
		return arr.every(el => el === val);
	}

	static divideFacesIntersectingPlane(points, faces, pattern, plane, tolerance, labels, from){

		([points, faces, pattern, labels] = MathHelpers.addIntersectionPoints(points, faces, pattern, plane, tolerance, labels));

		faces = MathHelpers.divideFaces(faces, pattern, labels);  // Since faces are plain, instead of doing calculations (e.g. angles) in 3D using "points", I do them in 2D using "pattern" (since I have it!)

		labels = MathHelpers.labelFaces(points, faces, from, plane, tolerance);  // Update labels according to new faces!

		return [points, faces, pattern, labels];
	}

	static divideFaces(faces, pattern, labels) {

		let new_faces = [];

		for (let i = 0; i < faces.length; i++) {
			const face = faces[i];
			const label = labels[i];

			if (labels[i].face == 0){
				let start_point = face[0]; 
				let current_point = face[0];
				let sub_faces = [];  // Current face will be subdivided into sub_faces
				let sub_face = [];
				[sub_faces, sub_face] = MathHelpers.divideFace(face, pattern, label, start_point, current_point, sub_faces, sub_face);

				for (let j = 0; j < sub_faces.length; j++){
					new_faces.push(sub_faces[j])
				}
			} else {
				new_faces.push(face)
			}
		}
		return new_faces;  // Falta atualizar as labels! Talvez depois?
	}


	static divideFace(face, pattern, label, start_point, current_point, sub_faces, sub_face) {

		// Set previous and next point
		let previous_point = face[(face.indexOf(current_point) - 1 + face.length) % face.length];
		const next_point =  face[(face.indexOf(current_point) + 1) % face.length];

		// If there is stored points in sub_face, the previous point is the last (correctly sets the previous point at a branch point!)
		if (sub_face.length > 0){
			previous_point = sub_face[sub_face.length-1];
		}
		
		// Find branch point
		const branch_point = MathHelpers.findBranch(face, pattern, label, previous_point, current_point, next_point);  // If there is not, it is null

		if (branch_point !== null){
			sub_face.push(current_point);

			// This repeated code prevents the algorithm from further continuing when it closes a face! Otherwise, it will keep going to faces already closed. (this feels like a hotfix, maybe it should be reviwed)
			if (branch_point === start_point){
				sub_faces.push(sub_face);
				return [sub_faces, sub_face];
			}

			[sub_faces, sub_face] = MathHelpers.divideFace(face, pattern, label, start_point, branch_point, sub_faces, sub_face);
			start_point = current_point;
			sub_face = [];
		}

		sub_face.push(current_point)

		current_point = face[(face.indexOf(current_point) + 1) % face.length];

		if (current_point === start_point){
			sub_faces.push(sub_face);
			return [sub_faces, sub_face];
		}

		[sub_faces, sub_face] = MathHelpers.divideFace(face, pattern, label, start_point, current_point, sub_faces, sub_face);

		return [sub_faces, sub_face];
	}

	static findBranch(face, pattern, label, previous_point, current_point, next_point) {
		
		let branch_point = null;

		if ((label.face_points[face.indexOf(current_point)] == 0)){  // If current point is at intersection, but the next is not (if there is there is no branch!)

			const a = pattern[previous_point];
			const b = pattern[current_point];
			const c = pattern[next_point];
			const next_to_previous_angle = MathHelpers.findAngleOfCorner(a, b, c);
			const tolerance = 0.1;  // degrees
			let distance = Infinity;

			for (let i = 0; i < face.length; i++){

				if ((label.face_points[i] === 0) && (face[i] !== current_point)){  // Consider every OTHER intersection point

					const br = pattern[face[i]];
					const next_to_branch_angle = MathHelpers.findAngleOfCorner(br, b, c);

					if ((next_to_branch_angle > (0+tolerance)) && (next_to_branch_angle < (next_to_previous_angle-tolerance))){  // If possible branch point is in the correct direction (from the edge, to the interior of the face)

						const branch_vector = br.map((element, k) => element - b[k]);
						const branch_vector_norm = Math.sqrt(branch_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));

						if (branch_vector_norm < distance){  // The possible branch point is the closest of possible branch points!
							branch_point = face[i];
							distance  = branch_vector_norm;
						}
					}
				}
			}
			
		}
		return branch_point;
	}

	static findAngleOfCorner(a, b, c){
		const vector_1 = c.map((element, k) => element - b[k]);  // Current to next
		const vector_2 = a.map((element, k) => element - b[k]);  // Current to previous

		const vector_1_norm = Math.sqrt(vector_1.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const vector_2_norm = Math.sqrt(vector_2.reduce((acc, element) => acc + Math.pow(element, 2), 0));

		const versor_1 = vector_1.map((element, k) => element / vector_1_norm);
		const versor_2 = vector_2.map((element, k) => element / vector_2_norm);

		const dot = versor_1[0]*versor_2[0] + versor_1[1]*versor_2[1];
		const det = versor_1[0]*versor_2[1] - versor_1[1]*versor_2[0];
		const angle = (Math.atan2(det, dot) * 180 / Math.PI + 360) % 360;  // In degrees

		return angle
	}

	static addIntersectionPoints(points, faces, pattern, plane, tolerance, labels) {

		let new_faces = [];
		let new_labels = [];
		let altered_edges = [];
		for (let i = 0; i < faces.length; i++) {

			let new_face = faces[i];
			let new_label = labels[i];

			if (labels[i].face == 0){

				new_face = [];  // If face intersects plane (label=0), reset new_face (=[]) and make it iteratively (to add intersection points)
				new_label = {face: labels[i].face, face_points: [], selected: labels[i].selected};

				for (let j = 0; j < faces[i].length; j++){  // For every edge

					const edge = [faces[i][j], faces[i][(j + 1) % faces[i].length]];
					let edge_already_altered = false;
					new_face.push(edge[0]);
					new_label.face_points.push(labels[i].face_points[j]);

					// If current edge was already inoculated with a new point (in a previous face):
					for (let k = 0; k < altered_edges.length; k++){
						if ((altered_edges[k]['edge'][0] === edge[1]) && (altered_edges[k]['edge'][1] === edge[0])) {  // If current edge [a b] was previously inoculated, when it was, it had to be defined as [b a] (since every face is passed clock-wise, and one edge can be shared at most by two faces)
							edge_already_altered = true;
							new_face.push(altered_edges[k]['new_letter']);
							new_label.face_points.push(0);
							break
						}
					}

					if (!edge_already_altered){  // If the edge was not previously altered
						if (((labels[i].face_points[j] === -1) && (labels[i].face_points[(j + 1) % faces[i].length] === 1)) || ((labels[i].face_points[j] === 1) && (labels[i].face_points[(j + 1) % faces[i].length] === -1))){  // If the edge trespasses the plane
							const segment = [points[edge[0]], points[edge[1]]];
							const intersection_point = MathHelpers.intersectSegmentWithPlane(segment, plane, tolerance);
							const old_letters = Object.keys(points).map((element, k) => element.charCodeAt());
							const new_letter = String.fromCharCode(Math.max(...old_letters) + 1);
							// Update points
							points[new_letter] = intersection_point;
							// Update pattern
							const intersection_vector = intersection_point.map((element, k) => element - segment[0][k]);
							const intersection_distance = Math.sqrt(intersection_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
							const pattern_segment = [pattern[edge[0]], pattern[edge[1]]];
							const pattern_vector = pattern_segment[1].map((element, k) => element - pattern_segment[0][k]);
							const pattern_norm = Math.sqrt(pattern_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
							const pattern_versor = pattern_vector.map((element, k) => element / pattern_norm);
							pattern[new_letter] = pattern_segment[0].map((element, k) => element + intersection_distance*pattern_versor[k]);
							// Update faces and labels
							new_face.push(new_letter);
							new_label.face_points.push(0);
							altered_edges.push({'edge':edge,'new_letter':new_letter})
						}
					}
				}

				// new_label.face_points = face_points;  // This will also update the input labels, because copying objects it's too much for JS, but since labels won't be re-read, I think that's ok

				// Não fazer o abaixo já; primeiro, adicionar só os pontos de interseção. depois, noutra funcção, ligá-los, subdividindo cada face.


				// Get intersection points
				// let intersection_points = [];
				// for (let j = 0; j < new_face.length; j++){
				// 	if (new_face_points[j] == 0){
				// 		intersection_points.push(new_face[j]);
				// 	}
				// }

				// debugger
				// Sort intersection points by distance to the first intersection point
				// const distances_to_first_point = intersection_points.map((point) => point.reduce((acc, coord, k) => acc + Math.sqrt(Math.pow(coord-intersection_points[0][k])),0));
				// intersection_points.sort((a, b) => distances_to_first_point[intersection_points.indexOf(a)] - distances_to_first_point[intersection_points.indexOf(b)]);
				// [faces_to_add, labels_to_add] = MathHelpers.divideFace(points, new_face, intersection_points);  // Do This! Algorithm scheme is in notebook!
				
			}
			new_faces.push(new_face);
			new_labels.push(new_label);
		}
		return [points, new_faces, pattern, new_labels];

	}

	static rotateFaces(points, faces, labels, from, to, plane, sense) {

		// Find points to rotate
		const points_to_rotate = MathHelpers.findPointsToRotate(faces, labels);

		// Find axis
		const axis = MathHelpers.findRotationAxis(points, faces, labels, plane, sense);

		// Find angle
		const angle = MathHelpers.findRotationAngle(points, from, to, axis);

		// Rotate
		points = MathHelpers.rotatePoints(points, points_to_rotate, axis, angle);

		// Find outline of points to rotate. RIGHT NOW IT'S GIVING FACES TO ROTATE. MAYBE FIX:
		const outline = MathHelpers.findOutlineOfFaces(faces, labels);

		// Pack rotation instruction for when meshes are built (in THREE.js)
		const rotation = {outline: outline, axis: axis, angle: angle};

		return [points, rotation]

	}

	static findPointsToRotate(faces, labels){
		let points_to_rotate = [];
		for (let i = 0; i < labels.length; i++){
			if (labels[i].face === -1){
				for (let j = 0; j < faces[i].length; j++){
					points_to_rotate = MathHelpers.pushIfNotThere(points_to_rotate, faces[i][j]);
				}
			}
		}
		// See if I convert letters to points now. Maybe just letters (easier to debug)
		return points_to_rotate;
	}


	static pushIfNotThere(arr, el){
		if (!arr.includes(el)){
			arr.push(el);
		}
		return arr;
	}

	static findRotationAxis(points, faces, labels, plane, sense){

		const face_next_to_axis = MathHelpers.findFaceNextToAxis(faces, labels);
		const face_versor = MathHelpers.findFaceNormal(points, face_next_to_axis);  // Verificar se a normal muda consoante a ordem das letras da face! (como é suposto)

		// Cross between face_versor and <division plane> normal. If sense is mountain, *(-1)
		let axis_vector = MathHelpers.crossProduct(face_versor, plane.plane_versor);
		if (sense === 'M'){
			axis_vector = axis_vector.map((element) => -element);
		}
		const axis_norm = Math.sqrt(axis_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const axis_versor = axis_vector.map((element) => element / axis_norm);

		// Sort axis points according to that direction!:
		let axis_points = [];
		for (let i = 0; i < labels.length; i++){
			for (let j = 0; j < labels[i].face_points.length; j++){
				if (labels[i].face_points[j] === 0){
					// axis_points.push(faces[i][j]);
					axis_points = MathHelpers.pushIfNotThere(axis_points, faces[i][j]);
				}
			}
		}

		let sorting_metric = [];
		for (let i = 0; i < axis_points.length; i++){
			sorting_metric.push(MathHelpers.dotProduct(points[axis_points[i]], axis_versor));
		}

		const sorting_indices = MathHelpers.findSortIndices(sorting_metric);
		axis_points = sorting_indices.map(i => axis_points[i]);

		// Then, return first and last sorted point 
		const axis = [axis_points[0], axis_points[axis_points.length-1]];
		return axis;
	}

	static findFaceNormal(points, face){
		// Get face's first three points (enough to define a place)
		let plane_points = [];
		for (let i = 0; i < face.length; i++){
			plane_points.push(points[face[i]]);
			if (i === 2){
				break;
			}
		}

		// Find plane versor
		const vector_1 = plane_points[1].map((element, k) => element - plane_points[0][k]);
		const vector_2 = plane_points[2].map((element, k) => element - plane_points[0][k]);
		const vector = MathHelpers.crossProduct(vector_1,vector_2);
		const norm = Math.sqrt(vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const versor = vector.map((element, k) => element / norm);
		return versor;
	}

	static crossProduct(U,V){
			return [U[1] * V[2] - U[2] * V[1], 
					U[2] * V[0] - U[0] * V[2],  
					U[0] * V[1] - U[1] * V[0]];
	}

	static dotProduct(U,V){
		return U.reduce((acc, n, i) => acc + (n * V[i]), 0);
	}


	static findFaceNextToAxis(faces, labels){

		for (let i = 0; i < labels.length; i++){
			for (let j = 0; j < labels[i].face_points.length; j++){
				if (labels[i].face_points[j] === 0){
					return faces[i];
				}
			}
		}
		return [];
	}


	static findSortIndices(A){
		const indices = Array.from(A.keys())
		indices.sort( (a,b) => A[a] - A[b]);
		return indices;
		// To sort an array B according to indices:
		// const sortedB = indices.map(i => B[i]);
	}

	static findRotationAngle(points, from, to, axis){

		// let from_point;
		// let to_point;

		// if (from[0] === to[0]){
		// 	from_point = points[from[from.length-1]];
		// 	const from_vector = from_point.map((element, k) => element - points[from[0]][k]);
		// 	const from_norm = Math.sqrt(from_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		// 	const to_vector = points[to[to.length-1]].map((element, k) => element - points[to[0]][k]);
		// 	const to_norm = Math.sqrt(to_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		// 	const to_versor = to_vector.map((element, k) => element / to_norm);
		// 	to_point = points[to[0]].map((element, k) => element + to_versor[k] * from_norm);
			

		// } else{
		// 	from_point = points[from[0]]; 
		// 	to_point = points[to[0]];
		// }

		const from_point = points[from[from.length-1]];
		const from_vector = from_point.map((element, k) => element - points[from[0]][k]);
		const from_norm =  Math.sqrt(from_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));

		const to_vector = points[to[to.length-1]].map((element, k) => element - points[to[0]][k]);
		const to_norm =  Math.sqrt(to_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const to_versor = to_vector.map((element, k) => element / to_norm);
		const to_point = points[to[0]].map((element, k) => element + from_norm * to_versor[k]);





		const axis_points = [points[axis[0]], points[axis[1]]];

		const closest_point_in_axis_1 = MathHelpers.findClosestPointinLine(axis_points[0],axis_points[1],from_point);
		const closest_point_in_axis_2 = MathHelpers.findClosestPointinLine(axis_points[0],axis_points[1],to_point);

		const vector_1 = from_point.map((element, k) => element - closest_point_in_axis_1[k]);
		const vector_2 = to_point.map((element, k) => element - closest_point_in_axis_2[k]);
		const axis_vector = points[axis[1]].map((element, k) => element - points[axis[0]][k]);

		const vector_1_norm = Math.sqrt(vector_1.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const vector_2_norm = Math.sqrt(vector_2.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const axis_norm = Math.sqrt(axis_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));

		const versor_1 = vector_1.map((element, k) => element / vector_1_norm);
		const versor_2 = vector_2.map((element, k) => element / vector_2_norm);
		const axis_versor = axis_vector.map((element, k) => element / axis_norm);

		const dot = MathHelpers.dotProduct(versor_1, versor_2);
		const det = MathHelpers.dotProduct(axis_versor, MathHelpers.crossProduct(versor_1, versor_2));
		const angle = (Math.atan2(det, dot) * 180 / Math.PI + 360) % 360;

		return angle;

	}

	static findClosestPointinLine(A,B,P){

		A = new THREE.Vector3(...A);
		B = new THREE.Vector3(...B);
		P = new THREE.Vector3(...P);

		const D = B.clone().sub( A ).normalize();
		const d = P.clone().sub( A ).dot( D );
		const X = A.clone().add( D.clone().multiplyScalar( d ) ); 
		return X.toArray();

	}

	static rotatePoints(points, points_to_rotate, axis, angle){

		const axis_points = [points[axis[0]], points[axis[1]]];


		// Input matrix
		let matrix_in= [];
		for (let key of points_to_rotate){
			matrix_in.push([...points[key], 1]);
		}
		matrix_in = matrix_in[0].map((_, colIndex) => matrix_in.map(row => row[colIndex]));


		// USE JS.THREE TO GET TRANSFORMATION MATRICES
		// Translation matrix
		const translation_vec = axis_points[0].map((element, k) => -element);
		let T = new THREE.Matrix4();
		T.makeTranslation(...translation_vec);  // 
		

		// Rotation matrix
		const translated_axis = new THREE.Vector3(...axis_points[1]).applyMatrix4(T).normalize();
		let R = new THREE.Matrix4();
		R.makeRotationAxis(translated_axis, angle * Math.PI / 180).transpose();  // Angle in radians

		// Alternatively, use Rodriguez formula to create rotation matrix (https://stackoverflow.com/questions/6721544/circular-rotation-around-an-arbitrary-axis/6721649#6721649)

		// Convert to matrix arrays
		const Ti = T.clone().invert();
		T.transpose();
		Ti.transpose();
		const w = 4;
		const matrix_t = [];
		const matrix_r = [];
		const matrix_ti = [];
		while (T.elements.length) {
			matrix_t.push(T.elements.splice(0, w));
			matrix_r.push(R.elements.splice(0, w));
			matrix_ti.push(Ti.elements.splice(0, w));
		}

		// Transform
		let matrix_out = this.matrixMultiply(matrix_ti,MathHelpers.matrixMultiply(matrix_r,MathHelpers.matrixMultiply(matrix_t,matrix_in)));
		// let matrix_out = MatrixProd(matrix_ti,MatrixProd(matrix_r,MatrixProd(matrix_t,matrix_in)))

		// Update points
		matrix_out = matrix_out[0].map((_, colIndex) => matrix_out.map(row => row[colIndex]));
		for (let i = 0; i < matrix_out.length; i++){
			points[points_to_rotate[i]] = matrix_out[i].slice(0,-1);
		}	
		return points;

	}

	static matrixMultiply = (A, B) => {
		return A.map((row, i) =>
			B[0].map((_, j) =>
				row.reduce((acc, _, n) => acc + A[i][n] * B[n][j], 0)
			));
	}

	// FIX:
	static findOutlineOfFaces(faces, labels){
		let faces_to_rotate = [];
		for (let i = 0; i < labels.length; i++){
			if (labels[i].face === -1){
				faces_to_rotate.push(faces[i]);
			}
		}
		return faces_to_rotate;
	}







/* 	static divideFacesIntersectingPlane_old(points, faces, plane, tolerance, labels){
		
		let new_faces = [];
		let new_edges = [];
		let new_labels = [];
		for (let i = 0; i < faces.length; i++) {

			let faces_to_add = [faces[i]];
			let labels_to_add = [labels[i]];

			if (labels[i].face == 0){

				let new_face = [];
				let new_face_points = [];

				for (let j = 0; j < faces[i].length; j++){

					new_face.push(faces[i][j]);
					new_face_points.push(labels[i].face_points[j]);

					if (Math.abs(labels[i].face_points[j]) + Math.abs(labels[i].face_points[(j + 1) % faces[i].length]) == 2){  // If the segment trespasses the plane

						const edge = [faces[i][j], faces[i][(j + 1) % faces[i].length]];
						let new_letter;
						let already_added = false;
						for (let k = 0; k < new_edges.length; k++){
							if (MathHelpers.arraysEqual(edge, new_edges[k].old)){
								already_added = true;
								new_letter = new_edges[k].new[1];  // Letter already added is in the middle of new_edges[k].new
								break;
							}
						}

						if (~already_added){
							const segment = [points[edge[0]], points[edge[1]]];
							const intersection_point = MathHelpers.intersectSegmentWithPlane(segment, plane, tolerance);
							const old_letters = Object.keys(points).map((element, k) => element.charCodeAt());
							new_letter = String.fromCharCode(Math.max(...old_letters) + 1);
							points[new_letter] = intersection_point;
							new_edges.push({'old':[edge[0],edge[1]],'new':[edge[0],new_letter,edge[1]]})
						}
						new_face.push(new_letter);
						new_face_points.push(0);
					}
					
				}

				// Get intersection points
				let intersection_points = [];
				for (let j = 0; j < new_face.length; j++){
					if (new_face_points[j] == 0){
						intersection_points.push(new_face[j]);
					}
				}

				// Sort intersection points by distance to the first intersection point
				const distances_to_first_point = intersection_points.map((point) => point.reduce((acc, coord, k) => acc + Math.sqrt(Math.pow(coord-intersection_points[0][k])),0));
				intersection_points.sort((a, b) => distances_to_first_point[intersection_points.indexOf(a)] - distances_to_first_point[intersection_points.indexOf(b)]);
				[faces_to_add, labels_to_add] = MathHelpers.divideFace(points, new_face, intersection_points);  // Do This! Algorithm scheme is in notebook!
				
			}
			new_faces.push(...faces_to_add);
			new_labels.push(...labels_to_add); 
		}
		return [new_faces, new_labels];
	} */


	static intersectSegmentWithPlane(segment, plane, tolerance){

		const segment_vector = segment[1].map((element, k) => element - segment[0][k]);
		const segment_norm = Math.sqrt(segment_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const segment_versor = segment_vector.map((element, k) => element / segment_norm);

		// Intersect plane and line (https://en.wikipedia.org/wiki/Line%E2%80%93plane_intersection)
		const num = plane.plane_point.reduce((acc, element, k) => acc + (element - segment[0][k]) * plane.plane_versor[k], 0);
		const denom = segment_versor.reduce((acc, element, k) => acc + element * plane.plane_versor[k], 0);

		let point;
		// Plane and line intersect once
		if (Math.abs(denom) > tolerance) { 
			const d = num / denom;
			if ((d > 0 - tolerance) && (d < segment_norm + tolerance)) { // Plane and edge (line segment) intersect once
				point = segment[0].map((element, k) => element + segment_versor[k] * d);
			}
		}
		else {
			console.log('ERROR at intersectSegmentWithPlane: Expected an intersection point but it was not found!')
		}
		return point
	}

	static arraysEqual(a, b) {
		if (a === b) return true;
		if (a == null || b == null) return false;
		if (a.length !== b.length) return false;
		for (var i = 0; i < a.length; ++i) {
			if (a[i] !== b[i]) return false;
		}
		return true;
	}

}