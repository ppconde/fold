import * as THREE from 'three';
import fold from '../../../crease-patterns/rectangle.fold';
import { FoldToThreeConverter } from '../converters/fold-to-three-converter';
import img1 from '../../../../demos/guta/img/star.png';
import txt from '../../../instructions/test-2.txt';
// import txt from '../../../instructions/paper-plane.txt';
import {MathHelpers} from '../helpers/math-helpers'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';


export class Origami {
	constructor(scene) {

		this.scene = scene;
		this.dbug_material = new THREE.LineBasicMaterial({ color: 0x0000ff });
		this.c = 0;
		this.last_time = 0;

 		// const width = 5;
		// const length = 10;

		// this.points = {'a': [0,0,0], 'b': [length,0,0], 'c':[length,width,0], 'd':[0,width,0]};
		// this.faces = [['a','b','c','d']];
		// this.pattern = Object.fromEntries(Object.keys(this.points).map((key) => [key,this.points[key].slice(0,2)]));

		// this.points = {'a':[0,0,0],'b': [length,0,0],'c':[length,width,0],'d':[0,width,0],'e':[0,width*2/5,0], 'f':[length*5/10,0,0],'g':[length*5/10,width*1/5,0],'h':[length*8/10,width*1/5,0],'i':[length*8/10,width*4/5,0], 'j':[length*5/10,width*4/5,0],'k':[length*5/10,width*3/5,0],'l':[length*7/10,width*3/5,0],'m':[length*7/10,width*2/5,0]}
		// this.faces = [['a','f','g','h','i','j','k','l','m','e'], ['f','b','c','d','e','m','l','k','j','i','h','g']];
		// this.pattern = Object.fromEntries(Object.keys(this.points).map((key) => [key,this.points[key].slice(0,2)]));
		// this.planes = [{'faces':[0,1,2],'face_order':[0,0,0]}];  // TODO: Update this in (the end of?) MathHelpers.divideFacesIntersectingPlane!

		const width = 9;
		const length = 12.5;

		this.points = {'a':[0,0,0],'b': [1,4,0],'c':[6.5,11,0],'d':[0,width,0],'e':[6,0,0], 'f':[9,width,0]}
		this.faces = [['a','e','f','d'], ['e','b','c','f']];
		this.pattern = Object.fromEntries(Object.keys(this.points).map((key) => [key,this.points[key].slice(0,2)]));
		this.planes = [{'faces':[0,1],'face_order':[0,1]}];  // TODO: Update this in (the end of?) MathHelpers.divideFacesIntersectingPlane!


		// this.planes = [[[1,2,3]]];
		// this.planes = [[[4],[1,2,3],[5]],[[6]]];  // Plane, layers, faces
		// this.planes = [{'faces': [[4],[1,2,3],[5]], 'dir': []}];
		// this.planes = [[1],[2,3],[4]]

		// TODO:
		

		// Nas translações/rotações,
		const translation = {'regex': /(\[(\w+),(\w+)\]) +to +(\[(\w+),(\w+)\]) +(\w+)|(\w+) +to +(\w+) +(\w+)/, 'from': [2,3,8], 'to': [5,6,9], 'sense':[7,10]};
		const rotation = {'regex': /(\[(\w+),(\w+)\]) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)|(\w+) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)/,'from': [2,3,9], 'axis':[5,6,11,12], 'sense': [7,13], 'angle':[8,14]};

		let steps = txt.split('\n');
		const tolerance = width / 100;

		this.mesh_history = [{lines: this.createLineMesh(), texts: this.createTextMesh()}];  // text: [group(mesh_a, mesh_b), group_] // lines: mesh_abcdefg // lines: [mesh_abcd, mesh_defg]

		for (let i = 0; i < steps.length; i++){ 
			const step = steps[i];
			let rotation_info;  // Rotation object that will be used later, to rotate meshes

			if (step.match(translation.regex) !== null){

				// Get rotation start and end vertices
				let {from, to, sense} = this.getFromStep(['from','to', 'sense'], translation, step);
				sense = sense[0];

				// Make plane containing rotation axis
				const plane = MathHelpers.makePlaneBetween(this.points, from, to);

				// Label faces relative to rotation axis: before, intersecting and after
				let labels = MathHelpers.labelFaces(this.points, this.faces, from, plane, tolerance);

				// Divide faces intersecting rotation axis
				([this.points, this.faces, this.pattern, labels] = MathHelpers.divideFacesIntersectingPlane(this.points, this.faces, this.pattern, plane, tolerance, labels, from));

				// Rotate faces before axis
				([this.points, rotation_info] = MathHelpers.rotateFaces(this.points, this.faces, labels, from, to, plane, sense));
				
				// O objeto rotação será algo deste género:
				// rotation = {outline: ['a','i','j','d'], axis: ['i','j'], angle: 30}
				// Depois, será só necessário fazer os face meshes a partir do pattern e faces, e para cada rotação, fazer um grupo de meshes contido no outline, e rodar segundo o axis

				const lala = 0;


			}  else if (step.match(rotation.regex) !== null){
				let {from, axis, sense, angle} = this.getFromStep(['from','axis','sense','angle'], rotation, step);

				sense = sense[0];
				angle = angle[0];

				if (angle === ""){
					angle = 180;
				}

				const from_point = this.points[from[from.length-1]];

				const closest_point_in_axis = MathHelpers.findClosestPointinLine(this.points[axis[0]],this.points[axis[1]],from_point);
				const plane_vector = closest_point_in_axis.map((element, k) => element - from_point[k]);
				const plane_vector_norm = Math.sqrt(plane_vector.reduce((acc, element) => acc + Math.pow(element, 2), 0));
				const plane_versor = plane_vector.map((element, k) => element / plane_vector_norm);

				const plane = {plane_point: this.points[axis[0]], plane_versor: plane_versor};

				// Label faces relative to rotation axis: before, intersecting and after
				let labels = MathHelpers.labelFaces(this.points, this.faces, from, plane, tolerance);

				// Find points to rotate
				const points_to_rotate = MathHelpers.findPointsToRotate(this.faces, labels);

				// Rotate
				this.points = MathHelpers.rotatePoints(this.points, points_to_rotate, axis, angle);

				// Find outline of points to rotate. RIGHT NOW IT'S GIVING FACES TO ROTATE. MAYBE FIX:
				const outline = MathHelpers.findOutlineOfFaces(this.faces, labels);

				// Pack rotation instruction for when meshes are built (in THREE.js)
				rotation_info = {outline: outline, axis: axis, angle: angle};

			}
			this.mesh_history.push({lines:this.createLineMesh(), texts:this.createTextMesh()});
		}
	}

	createLineMesh = () => {

		const dbug_lines = [];

		for (let face of this.faces) {
			const dbug_points = [];
			for (let letter of face) {
				const coord = this.points[letter];
				dbug_points.push(new THREE.Vector3(...coord));
			}
			dbug_points.push(new THREE.Vector3(...this.points[face[0]]));
			const dbug_geometry = new THREE.BufferGeometry().setFromPoints(dbug_points);
			dbug_lines.push(new THREE.Line(dbug_geometry, this.dbug_material));
		}
		return dbug_lines;
	}



	createTextMesh = () => {
		const dbug_texts = [];
		let loader = new FontLoader();
		for (let face of this.faces) {
			const letter_group = new THREE.Group();
			for (let letter of face) {
				const coord = this.points[letter];
				loader.load('https://unpkg.com/three@0.77.0/examples/fonts/helvetiker_regular.typeface.json', (font) => {
					const dbug_material = new THREE.LineBasicMaterial({ color: 0x0000ff });  // Istp podia estar fora mas não parece dar!
					const dbug_text_geometry = new TextGeometry(letter, { font: font, size: 0.5, height: 0 });
					const letter_mesh = new THREE.Mesh(dbug_text_geometry, dbug_material);
					letter_mesh.position.set(...coord);
					letter_group.add(letter_mesh);
				});
			}
			dbug_texts.push(letter_group);
		}
		return dbug_texts;
	}

	setFaces = (faces) => {
		this.faces = faces;
	}

	setPattern = (pattern) => {
		this.pattern = pattern;
	}

	setPoints = (points) => {
		this.points = points;
	}

	setToAndFromPoints = (translation, step) => {
		const from = [];
		const to = [];
		const match = step.match(translation.regex);
		translation.from.forEach((element) => match[element] !== undefined ? from.push(match[element]) : null)
		translation.to.forEach((element) => match[element] !== undefined ? to.push(match[element]) : null)
		return {from, to}
	}

	// getFromStep = (regex, indexes, step) => {
	// 	const array = [];
	// 	const match = step.match(regex);
	// 	indexes.forEach((element) => match[element] !== undefined ? array.push(match[element]) : null)
	// 	return array
	// }

	getFromStep = (array, translation, step) => {
        const match = step.match(translation.regex);
        return array.reduce((obj, val) => {
            const valueForArray = translation[val].reduce((acc, element) => {
                if (match[element] !== undefined) {
                    acc.push(match[element]);
                }

                return acc;
            }, []);
            return { ...obj, [val]: valueForArray };
        }, {});
    }
	// console.log(this.setToAndFromPoints(['from', 'to'], translation, step));

	// static make_plane(from, to, points) {
	// 	console.log(points)
	// 	const from_point = points[from[from.length-1]]
	// 	const from_norm = Math.sqrt(from_point.reduce((acc,element,k) => acc + Math.pow(element - points[from[0]][k],2), 0));

	// 	const to_norm = Math.sqrt(points[to[to.length-1]].reduce((acc,element,k) => acc + Math.pow(element - points[to[0]][k],2), 0));
	// 	const to_versor = points[to[to.length-1]].map((element, i) => (element - points[to[0]][i])/to_norm);
	// 	const to_point = points[to[0]].map((element,i) => element + from_norm*to_versor[i]); 

	// 	const plane_vector = to_point.map((element, i) => element - from_point[i]);
	// 	const plane_point = from_point.map((element, i) => element + plane_vector.map((element, j) => element/2)[i]);
	// 	const plane_norm = Math.sqrt(plane_vector.reduce((acc,element) => acc + Math.pow(element,2), 0));
	// 	const plane_versor = plane_vector.map((element, i) => element / plane_norm);

	// 	return [plane_point, plane_versor]
	// }



	// const points_to_rotate = this.getFromStep(rotation.regex, rotation.from, step);
	// const axis = this.getFromStep(rotation.regex, rotation.around, step);



	init = () => {
		this.loadFoldObject();
	}

	/**
	 * Loads the origami mesh with it's material and geometry
	 */
	addOrigamiMesh = (scene) => {
		this.geometry = this.foldInfo.geometry;
		// Paper material
		this.material = new THREE.MeshBasicMaterial({
			color: COLORS.PAPER,
			transparent: false,
			side: THREE.DoubleSide,
		});

		// Material for the paper borders (wireframe)
		const wireframeMaterial = new THREE.MeshBasicMaterial({
			color: COLORS.WIREFRAME,
			wireframe: true,
			wireframeLinewidth: 10,
		});
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		scene.add(this.mesh);
		scene.add(new THREE.Mesh(this.geometry, wireframeMaterial));
	}

	/**
	 * Loads fold object and parses it into a json object
	 */
	loadFoldObject = () => {
		//console.log(new FoldToThreeConverter(fold));

	}

	extractFound = (found, ids) => {
		let vec = [];
		for (let val of found[ids]){
			if (val !== undefined) {
				vec.push(val);
			}
		}
		return vec;
	}

	update = (time) => {

		const delta_time = time - this.last_time;

		if (delta_time >= 2000 && this.c < this.mesh_history.length){
			this.scene.clear();
			this.mesh_history[this.c].lines.forEach((line,k) => {
				this.scene.add(line);
				this.scene.add(this.mesh_history[this.c].texts[k])
			})
			this.last_time = time;
			this.c++;
		}



		// this.mesh_history

		// console.log(this.scene);


		// const posAttribute = this.geometry.getAttribute('position');
		// let positions = posAttribute.array;
		// posAttribute.needsUpdate = true;

		// //const time = Date.now()*0.001;
		// time *= 0.001;
		// // Rotate point till specified angle over specified time
		// // console.log(time)

		// if (time <= this.foldDur) {
		// 	const foldPntFromCrease2 = this.foldPntFromCrease.clone().applyAxisAngle(this.creaseVec, (this.foldAngle / this.foldDur) * time);
		// 	this.foldPnt = this.foldProjPnt.clone().add(foldPntFromCrease2);

		// 	// Update triangle vertices
		// 	for (let i = 0; i < this.trianglesIndexes.length; i++) {
		// 		if (this.trianglesIndexes[i] === this.foldPntIdx) {
		// 			positions.set([this.foldPnt.x, this.foldPnt.y, this.foldPnt.z], i * 3);

		// 		}
		// 	}
		// }


	}
}

