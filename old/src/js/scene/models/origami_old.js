import * as THREE from 'three';
import fold from '../../../crease-patterns/rectangle.fold';
// import txt from '../../../instructions/dog.txt'; 
import { FoldToThreeConverter } from '../converters/fold-to-three-converter';
import img1 from '../../../../demos/guta/img/star.png';
// import txt from '../../../instructions/paper-plane.txt';
import txt from '../../../instructions/test-1.txt';
import {MathHelpers} from '../helpers/math-helpers'

export class Origami {
	constructor(scene) {

		const width = 5;
		const length = 10;

		// this.points = {'a': [0,0,0], 'b': [length,0,0], 'c':[length,width,0], 'd': [0,width,0]};
		// this.faces = [['a','b','c','d']]
		// this.pattern = {'a': [0,0], 'b': [length,0], 'c':[length,width], 'd': [0,width]};

		// Debugging:
		this.points = {'a': [0,0,0], 'b': [length,0,0], 'c':[length,width,0], 'd': [0,width,0], 'e':[length/4,0,0], 'f': [length/8,width/2,0], 'g': [length/4,width,0]};
		this.faces = [['a','e','f','d'], ['e','b','c','f'],['c','g','f'],['g','d','f']]
		this.pattern = {'a': [0,0], 'b': [length,0], 'c':[length,width], 'd': [0,width], 'e':[length/4,0], 'f': [length/8,width/2], 'g': [length/4,width]};

		const translation = {'regex': /(\[(\w+),(\w+)\]) +to +(\[(\w+),(\w+)\])|(\w+) +to +(\w+)/, 'from': [2,3,7], 'to': [5,6,8]};
		const rotation = {'regex': /(\[(\w+),(\w+)\]) +around +(\[(\w+),(\w+)\])|(\w+) +around +(\[(\w+),(\w+)\])/,'points_to_rotate': [2,3,7], 'axis':[5,6,9,10]};

		// const regex_rotation = /(\[(\w+),(\w+)\]) +(around) +(\[(\w+),(\w+)\])(\s+(\d*))?|(\w+) +(around) +(\[(\w+),(\w+)\])(\s+(\d*))?/
		// const regex_crease = /(crease)( making(.+))?/

		let steps = txt.split('\n');
		const tolerance = width / 100;

		// DEBUGGING:
		// MathHelpers.debugPlot(this.faces, this.points, scene);

		// var loader = new THREE.FontLoader();
		// loader.load('https://unpkg.com/three@0.77.0/examples/fonts/helvetiker_regular.typeface.json', function(font) {
		//   var geometry = new THREE.TextGeometry('Hello World', {
		// 	font: font,
		// 	size: 0.5,
		// 	height: 0
		//   });
		//   // geometry.center();
		//   var material = new THREE.MeshNormalMaterial();
		//   var mesh = new THREE.Mesh(geometry, material);
		//   mesh.position.set(0, 5, 0);
		//   scene.add(mesh);
		// });

		// const dbug_points = axis.map((element) => new THREE.Vector3(...this.points[element]));

		const nSteps = steps.length;
		for (let i = 0; i < nSteps; i++){ // (let step of steps)
			const step = steps[i];

			if (step.match(translation.regex) !== null){

				const {from, to} = this.getFromStep(['from','to'], translation, step);

				

				// debugger;
				// const plane = MathHelpers.makePlaneBetween(from, to, this.points);
				// debugger;
				// const points_to_rotate = MathHelpers.intersectPlaneWithOrigami4(from, plane, this.points, this.faces, this.pattern, tolerance)
				// debugger;

				// let to_pass = new Array(this.faces.length).fill(0); 
				// let passed = new Array(this.faces.length).fill(0); 
				// let intersects = new Array(this.faces.length).fill(0);

				// let to_pass = []; 
				// let passed = []; 
				// let intersects = [];
				// let faceIds = {to_pass, passed, intersects};

				
				
				const plane = MathHelpers.makePlaneBetween(from, to, this.points);

				let face_selected = new Array(this.faces.length).fill(0);
				let face_side = new Array(this.faces.length).fill(null);
				let face_points_side = Array.from(Array(this.faces.length), () => []);

				let faceIds = MathHelpers.findFacesContainingPoints(from, this.faces);
				[, face_side, face_points_side] = MathHelpers.selectFacesUntilPlane(faceIds, this.faces, this.points, plane, tolerance, face_selected, face_side, face_points_side);
				faceIds = MathHelpers.divideFacesIntersectingPlane(this.points, this.faces, face_side, plane, tolerance, face_points_side);
				const points_to_rotate = MathHelpers.rotateFaces(from, plane, this.points, this.faces, this.pattern, tolerance);

				// const {axis, points, faces, pattern} = MathHelpers.intersectPlaneWithOrigami(plane, this.points, this.faces, this.pattern, tolerance);
				// const points_to_rotate = MathHelpers.selectPointsToRotate(plane, points, tolerance);

				// const angle = MathHelpers.calculateRotationAngle(points, from, to, axis);
				// const rotated_points = MathHelpers.rotate(points, points_to_rotate, axis, angle);

				// this.setPoints(rotated_points);
				// this.setPattern(pattern);
				// this.setFaces(faces);
				// debugger;

			}  else if (step.match(rotation.regex) !== null){
				const {points_to_rotate, axis} = this.getFromStep(['points_to_rotate','axis'], rotation, step);

				
				const plane = MathHelpers.makePlaneOnAxis(points_to_rotate, axis, this.points);
				// TODO:
				// const {axis, points, faces, pattern} = MathHelpers.intersectPlaneWithOrigami2(plane, this.points, this.faces, this.pattern, tolerance);


				// const axis_values = axis.map((element) => this.points[element]);
				// const angle = Math.PI;
				// const rotated_points = MathHelpers.rotate(this.points, points_to_rotate, axis_values, angle);
				// this.setPoints(rotated_points);
			}
		}
		MathHelpers.debugPlot(this.faces, this.points, scene);
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
