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

	static makePlane(from, to, points) {
		console.log(points);
		const from_point = points[from[from.length - 1]];
		const from_norm = Math.sqrt(from_point.reduce((acc, element, k) => acc + Math.pow(element - points[from[0]][k], 2), 0));

		const to_norm = Math.sqrt(points[to[to.length - 1]].reduce((acc, element, k) => acc + Math.pow(element - points[to[0]][k], 2), 0));
		const to_versor = points[to[to.length - 1]].map((element, i) => (element - points[to[0]][i]) / to_norm);
		const to_point = points[to[0]].map((element, i) => element + from_norm * to_versor[i]);

		const plane_vector = to_point.map((element, i) => element - from_point[i]);
		const plane_point = from_point.map((element, i) => element + plane_vector.map((element, j) => element / 2)[i]);
		const plane_norm = Math.sqrt(plane_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const plane_versor = plane_vector.map((element, i) => element / plane_norm);

		return { plane_point, plane_versor };
	}

	static makePlane2(points_to_rotate, axis, points) {

		const axis_values = axis.map((element) => this.points[element]);
		const point = points[points_to_rotate[0]]
		const axis_line = new THREE.Line3(new THREE.Vector3(...axis_values[0]), new THREE.Vector3(...axis_values[1]));
		const plane_point = axis_line.closestPointToPoint(new THREE.Vector3(...point), false)  // should be equal to ...(new Vector3(...from_point))
		const plane_vector = point.map((element, i) => element - plane_point[i]);
		const plane_norm = Math.sqrt(plane_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
		const plane_versor = plane_vector.map((element, i) => element / plane_norm);

		return { plane_point, plane_versor };
	}

	static intersectPlaneWithOrigami2(plane, points, faces, pattern, tolerance) {
		const { plane_point, plane_versor } = plane;
		let axis = [];
		let new_faces = [];

		for (let i = 0; i < faces.length; i++) {
			const face = faces[i];
			let new_face_points = [];
			let all_face_points = [...face];
			let shift = 0;
			// let new_face_points_pos = []

			for (let j = 0; j < face.length; j++) {

				// Define edge
				const edge = [face[j], face[(j + 1) % face.length]];
				const edge_vector = points[edge[1]].map((element, k) => element - points[edge[0]][k]);
				const edge_norm = Math.sqrt(edge_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
				const edge_versor = edge_vector.map((element, k) => element / edge_norm);

				// Define edge in 2D (for pattern)
				const edge_vector_2D = pattern[edge[1]].map((element, k) => element - pattern[edge[0]][k]);
				const edge_norm_2D = Math.sqrt(edge_vector_2D.reduce((acc, element) => acc + Math.pow(element, 2), 0));
				const edge_versor_2D = edge_vector_2D.map((element, k) => element / edge_norm_2D);

				// Intersect plane and line (https://en.wikipedia.org/wiki/Line%E2%80%93plane_intersection)
				const num = plane_point.reduce((acc, element, k) => acc + (element - points[edge[0]][k]) * plane_versor[k], 0);
				const denom = edge_versor.reduce((acc, element, k) => acc + element * plane_versor[k], 0);

				if (Math.abs(denom) < tolerance) { // Plane and line are parallel
					if (Math.abs(num) < tolerance) { // Plane contains line
						// Add edge points to axis if not already there
						for (let m = 0; m < edge.length; m++) {
							let in_axis = false;
							for (let n = 0; n < axis.length; n++) {
								if (Math.sqrt(points[edge[m]].reduce((acc, element, k) => acc + Math.pow(element - axis[n][k], 2), 0)) < tolerance) {
									in_axis = true;
									break;
								}
							}
							if (!in_axis) {
								axis.push(points[edge[m]]);
							}
						}
					} else { } // Plane and line do not intersect
				} else { // Plane and line intersect once
					const d = num / denom;
					if ((d > 0 - tolerance) && (d < edge_norm + tolerance)) { // Plane and edge (line segment) intersect once
						// Create new point
						const inters_point = points[edge[0]].map((element, k) => element + edge_versor[k] * d);

						// Add new point to axis if not already there
						let in_axis = false;
						for (let n = 0; n < axis.length; n++) {
							if (Math.sqrt(inters_point.reduce((acc, element, k) => acc + Math.pow(element - axis[n][k], 2), 0)) < tolerance) {
								in_axis = true;
								break;
							}
						}
						if (!in_axis) {
							axis.push(inters_point);
						}

						const point_codes = Object.keys(points).map((element, k) => element.charCodeAt());
						const new_point = String.fromCharCode(Math.max(...point_codes) + 1);

						// Add new point to points if not already there
						let is_new = true;
						let already_there_point = '';
						for (let n = 0; n < edge.length; n++) {
							if (Math.sqrt(inters_point.reduce((acc, element, k) => acc + Math.pow(element - points[edge[n]][k], 2), 0)) < tolerance) {
								is_new = false;
								already_there_point = edge[n];
								break;
							}
						}
						if (is_new) {
							// Add to points
							points[new_point] = inters_point;

							// Add to pattern
							const inters_point_2D = pattern[edge[0]].map((element, k) => element + edge_versor_2D[k] * d);
							pattern[new_point] = inters_point_2D;

							// Add to axis
							// axis.push(inters_point)

							// Add to face
							//face.splice(j+1, 0, new_point)  // Não sei se atualizar face num loop pela face cria conflito: CRIA!

							// Save to add to face
							new_face_points.push(new_point);
							all_face_points.splice(j + shift + 1, 0, new_point);
							shift += 1;
						} else { // If already in points, just add to new_face_points (it's gonna be used to divide a face)
							let is_new_in_new = true;
							for (let n = 0; n < new_face_points.length; n++) {
								if (new_face_points[n] === already_there_point) {
									is_new_in_new = false;
									break;
								}
							}
							if (is_new_in_new) {
								new_face_points.push(already_there_point);
							}

						}
					}
				}
			}
			// Divide face
			if (new_face_points.length < 2) {
				new_faces.push(all_face_points);
			}
			else if (new_face_points.length === 2) {
				let id1 = all_face_points.indexOf(new_face_points[0]);
				let id2 = all_face_points.indexOf(new_face_points[1]);
				let new_face1 = [];
				let new_face2 = [];

				for (let j = id1; j <= id2; j++) {
					new_face2.push(all_face_points[j]);
				}

				for (let j = id2; j <= all_face_points.length + id1; j++) {
					new_face1.push(all_face_points[j % all_face_points.length]);
				}

				new_faces.push(new_face1);
				new_faces.push(new_face2);
			}

			// update faces (slice in two) (ou talvez depois do ciclo)
		}
		// Update faces
		faces = new_faces;
		return { axis, points, faces, pattern };
	}


	static intersectPlaneWithOrigami(plane, points, faces, pattern, tolerance) {
		const { plane_point, plane_versor } = plane;
		let axis = [];
		let new_faces = [];

		for (let i = 0; i < faces.length; i++) {
			const face = faces[i];
			let new_face_points = [];
			let all_face_points = [...face];
			let shift = 0;
			// let new_face_points_pos = []

			for (let j = 0; j < face.length; j++) {

				// Define edge
				const edge = [face[j], face[(j + 1) % face.length]];
				const edge_vector = points[edge[1]].map((element, k) => element - points[edge[0]][k]);
				const edge_norm = Math.sqrt(edge_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
				const edge_versor = edge_vector.map((element, k) => element / edge_norm);

				// Define edge in 2D (for pattern)
				const edge_vector_2D = pattern[edge[1]].map((element, k) => element - pattern[edge[0]][k]);
				const edge_norm_2D = Math.sqrt(edge_vector_2D.reduce((acc, element) => acc + Math.pow(element, 2), 0));
				const edge_versor_2D = edge_vector_2D.map((element, k) => element / edge_norm_2D);

				// Intersect plane and line (https://en.wikipedia.org/wiki/Line%E2%80%93plane_intersection)
				const num = plane_point.reduce((acc, element, k) => acc + (element - points[edge[0]][k]) * plane_versor[k], 0);
				const denom = edge_versor.reduce((acc, element, k) => acc + element * plane_versor[k], 0);

				if (Math.abs(denom) < tolerance) { // Plane and line are parallel
					if (Math.abs(num) < tolerance) { // Plane contains line
						// Add edge points to axis if not already there
						for (let m = 0; m < edge.length; m++) {
							let in_axis = false;
							for (let n = 0; n < axis.length; n++) {
								if (Math.sqrt(points[edge[m]].reduce((acc, element, k) => acc + Math.pow(element - axis[n][k], 2), 0)) < tolerance) {
									in_axis = true;
									break;
								}
							}
							if (!in_axis) {
								axis.push(points[edge[m]]);
							}
						}
					} else { } // Plane and line do not intersect
				} else { // Plane and line intersect once
					const d = num / denom;
					if ((d > 0 - tolerance) && (d < edge_norm + tolerance)) { // Plane and edge (line segment) intersect once
						// Create new point
						const inters_point = points[edge[0]].map((element, k) => element + edge_versor[k] * d);

						// Add new point to axis if not already there
						let in_axis = false;
						for (let n = 0; n < axis.length; n++) {
							if (Math.sqrt(inters_point.reduce((acc, element, k) => acc + Math.pow(element - axis[n][k], 2), 0)) < tolerance) {
								in_axis = true;
								break;
							}
						}
						if (!in_axis) {
							axis.push(inters_point);
						}

						const point_codes = Object.keys(points).map((element, k) => element.charCodeAt());
						const new_point = String.fromCharCode(Math.max(...point_codes) + 1);

						// Add new point to points if not alredy there
						let is_new = true;
						let already_there_point = '';
						for (let n = 0; n < edge.length; n++) {
							if (Math.sqrt(inters_point.reduce((acc, element, k) => acc + Math.pow(element - points[edge[n]][k], 2), 0)) < tolerance) {
								is_new = false;
								already_there_point = edge[n];
								break;
							}
						}
						if (is_new) {
							// Add to points
							points[new_point] = inters_point;

							// Add to pattern
							const inters_point_2D = pattern[edge[0]].map((element, k) => element + edge_versor_2D[k] * d);
							pattern[new_point] = inters_point_2D;

							// Add to axis
							// axis.push(inters_point)

							// Add to face
							//face.splice(j+1, 0, new_point)  // Não sei se atualizar face num loop pela face cria conflito: CRIA!

							// Save to add to face
							new_face_points.push(new_point);
							all_face_points.splice(j + shift + 1, 0, new_point);
							shift += 1;
						} else { // If already in points, just add to new_face_points (it's gonna be used to divide a face)
							let is_new_in_new = true;
							for (let n = 0; n < new_face_points.length; n++) {
								if (new_face_points[n] === already_there_point) {
									is_new_in_new = false;
									break;
								}
							}
							if (is_new_in_new) {
								new_face_points.push(already_there_point);
							}

						}
					}
				}
			}
			// Divide face
			if (new_face_points.length < 2) {
				new_faces.push(all_face_points);
			}
			else if (new_face_points.length === 2) {
				let id1 = all_face_points.indexOf(new_face_points[0]);
				let id2 = all_face_points.indexOf(new_face_points[1]);
				let new_face1 = [];
				let new_face2 = [];

				for (let j = id1; j <= id2; j++) {
					new_face2.push(all_face_points[j]);
				}

				for (let j = id2; j <= all_face_points.length + id1; j++) {
					new_face1.push(all_face_points[j % all_face_points.length]);
				}

				new_faces.push(new_face1);
				new_faces.push(new_face2);
			}

			// update faces (slice in two) (ou talvez depois do ciclo)
		}
		// Update faces
		faces = new_faces;
		return { axis, points, faces, pattern };
	}

	static selectPointsToRotate(plane, points, tolerance) {
		const { plane_point, plane_versor } = plane;
		// Find points to rotate (https://dawnarc.com/2019/09/mathcheck-which-side-of-a-plane-points-are-on/)
		let points_to_rotate = [];
		for (let key of Object.keys(points)) {
			const plane_point_vector = points[key].map((element, k) => element - plane_point[k]);
			if (plane_versor.reduce((acc, element, k) => acc + element * plane_point_vector[k], 0) < 0 - tolerance) {
				points_to_rotate.push(key);
			}
		}
		return points_to_rotate;
	}

	static calculateRotationAngle(points, from, to, axis) {
		const from_point = points[from[from.length - 1]];
		const from_norm = Math.sqrt(from_point.reduce((acc, element, k) => acc + Math.pow(element - points[from[0]][k], 2), 0));
		const to_norm = Math.sqrt(points[to[to.length - 1]].reduce((acc, element, k) => acc + Math.pow(element - points[to[0]][k], 2), 0));
		const to_versor = points[to[to.length - 1]].map((element, i) => (element - points[to[0]][i]) / to_norm);
		const to_point = points[to[0]].map((element, i) => element + from_norm * to_versor[i]);
		// Calculate rotation angle
		const axis_line = new THREE.Line3(new THREE.Vector3(...axis[0]), new THREE.Vector3(...axis[1]));
		const from_to_mid = axis_line.closestPointToPoint(new THREE.Vector3(...to_point), false)  // should be equal to ...(new Vector3(...from_point))
		const angle = (new THREE.Vector3(...to_point)).sub(from_to_mid).angleTo((new THREE.Vector3(...from_point)).sub(from_to_mid));
		return angle;
	}

	// TODO: ELIMINATE THIS
	static rotate(points, points_to_rotate, axis, angle) {
		// Input matrix
		let matrix_in = []
		for (let key of points_to_rotate) {
			matrix_in.push([...points[key], 1])
		}
		matrix_in = matrix_in[0].map((_, colIndex) => matrix_in.map(row => row[colIndex]));


		// USE JS.THREE TO GET TRANSFORMATION MATRICES
		// Translation matrix
		const translation_vec = axis[0].map((element, k) => -element)
		let T = new THREE.Matrix4();
		T.makeTranslation(...translation_vec)  // 


		// Rotation matrix
		const translated_axis = new THREE.Vector3(...axis[1]).applyMatrix4(T).normalize()
		let R = new THREE.Matrix4();
		R.makeRotationAxis(translated_axis, angle).transpose()

		// Alternatively, use Rodriguez formula to create rotation matrix (https://stackoverflow.com/questions/6721544/circular-rotation-around-an-arbitrary-axis/6721649#6721649)

		// Convert to matrix arrays
		const Ti = T.clone().invert();
		T.transpose()
		Ti.transpose()
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
		let matrix_out = this.matrixMultiply(matrix_ti, this.matrixMultiply(matrix_r, this.matrixMultiply(matrix_t, matrix_in)))
		// let matrix_out = MatrixProd(matrix_ti,MatrixProd(matrix_r,MatrixProd(matrix_t,matrix_in)))

		// Update points
		matrix_out = matrix_out[0].map((_, colIndex) => matrix_out.map(row => row[colIndex]));
		for (let i = 0; i < matrix_out.length; i++) {
			points[points_to_rotate[i]] = matrix_out[i].slice(0, -1)
		}
		return points
	}
}