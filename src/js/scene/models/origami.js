import * as THREE from 'three';
import fold from '../../../crease-patterns/rectangle.fold';
import { FoldToThreeConverter } from '../converters/fold-to-three-converter';
import txt from '../../../instructions/test-1.txt';
import { Controller } from './../controllers/controller';

export class Origami extends Controller {

	mesh_instructions = [];
	currentAngle = 0;
	previousTime = 0;

	constructor(scene) {
		super();
		// Temporary geo and material
		this.foldInfo = new FoldToThreeConverter(fold);
		this.crease = this.foldInfo.crease;
		this.trianglesIndexes = this.foldInfo.trianglesIndexes;
		// eslint-disable-next-line camelcase
		this.vertices_coords = this.foldInfo.fold.vertices_coords;

		// Set the scene to fold paper sheet in.
		this.scene = scene;

		// Set initial paper sheet. This example simulates a paper sheet that has already been folded a couple of times (to test if the algorithm works in a more complicated sheet)
		const width = 9;
		const length = 12.5;
		let points = { 'a': [0, 0, 0], 'b': [1, 4, 0], 'c': [6.5, 11, 0], 'd': [0, width, 0], 'e': [6, 0, 0], 'f': [9, width, 0] };
		let pattern = { 'a': [0, 0], 'b': [length, 0], 'c': [length, width], 'd': [0, width], 'e': [6, 0], 'f': [9, width] };
		let faces = [['a', 'e', 'f', 'd'], ['e', 'b', 'c', 'f']];
		let face_order = new Map();  // This is a graph connecting the faces that overlap
		faces.forEach((_, i) => face_order.set(i));

		// Set parsing instructions
		const translation = { 'regex': /(\[(\w+),(\w+)\]) +to +(\[(\w+),(\w+)\]) +(\w+)|(\w+) +to +(\w+) +(\w+)/, 'from': [2, 3, 8], 'to': [5, 6, 9], 'sense': [7, 10] };
		const rotation = { 'regex': /(\[(\w+),(\w+)\]) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)|(\w+) +around +(\[(\w+),(\w+)\]) +(\w+) *(\d*)/, 'from': [2, 3, 9], 'axis': [5, 6, 11, 12], 'sense': [7, 13], 'angle': [8, 14] };

		// Get fold instructions
		const fold_instructions = txt.split('\n');

		// Convert paper coordinates and fold instructions to paper meshes and mesh instructions
		// [this.meshes, this.mesh_instructions] = OrigamiSolver.solveOrigami(points, faces, pattern, face_order, fold_instructions, translation, rotation);

		const generateGeometry = (pts) => {
			const arr = new Float32Array(pts.length * 3);
			for (let i = 0; i < pts.length; i++) {
				const i3 = i * 3;
				arr[i3] = pts[i][0];
				arr[i3 + 1] = pts[i][1];
				arr[i3 + 2] = pts[i][2];
			}
			return arr;
		}

		const geometry1 = new THREE.BufferGeometry();
		const geometry2 = new THREE.BufferGeometry();
		const geometry3 = new THREE.BufferGeometry();

		this.pts = {
			a: [0, 0, 0],
			b: [0, width, 0],
			c: [length / 2, width / 2, 0],
			d: [length, width, 0],
			e: [length, 0, 0]
		};

		geometry1.setAttribute(
			'position',
			new THREE.BufferAttribute(
				generateGeometry([this.pts.a, this.pts.b, this.pts.c]),
				3,
			),
		);

		geometry2.setAttribute(
			'position',
			new THREE.BufferAttribute(
				generateGeometry([this.pts.c, this.pts.d, this.pts.b]),
				3,
			),
		);

		geometry3.setAttribute(
			'position',
			new THREE.BufferAttribute(
				generateGeometry([this.pts.a, this.pts.e, this.pts.d]),
				3,
			),
		);

		const material1 = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
		const material2 = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
		const material3 = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide });

		const mesh1 = new THREE.Mesh(geometry1, material1);
		const mesh2 = new THREE.Mesh(geometry2, material2);
		const mesh3 = new THREE.Mesh(geometry3, material3);
		this.meshes = [mesh1, mesh2, mesh3];
		this.meshesRotation = this.meshes.map((mesh) => mesh.position);

		this.mesh_instructions = [
			{ meshIds: [0, 1], axis: ['a', 'd'], angle: THREE.MathUtils.degToRad(90) },
			{ meshIds: [2], axis: ['d', 'a'], angle: THREE.MathUtils.degToRad(90) },
		];

		this.w = Math.PI / 2;  // Angular velocity
		this.angleRotated = 0;

		this.scene.add(...this.meshes);
	}

	rotate = (angle) => {
		const { currentStep } = this.animationControls;
		const instruction = this.mesh_instructions[currentStep];
		const vecA = new THREE.Vector3(...this.pts[instruction.axis[0]]);
		const vecB = new THREE.Vector3(...this.pts[instruction.axis[1]]);
		const vec = new THREE.Vector3();
		vec.copy(vecB).sub(vecA).normalize();
		for (let i of instruction.meshIds) {
			this.meshes[i].position.sub(vecA);
			this.meshes[i].rotateOnWorldAxis(vec, angle);
			this.meshes[i].position.add(vecA);
		}
	}

	playAnimation = (deltaTime) => {
		const { currentStep } = this.animationControls;
		const instruction = this.mesh_instructions[currentStep];
		let angle_to_rotate = this.w * deltaTime * 0.001;

		if (this.angleRotated + angle_to_rotate < instruction.angle) {
			this.rotate(angle_to_rotate);
			this.angleRotated += angle_to_rotate;

		} else {
			angle_to_rotate = instruction.angle - this.angleRotated;
			this.rotate(angle_to_rotate);
			this.increaseStepBy(1)
			this.pauseAnimation();
			this.angleRotated = 0;
		}
	}

	setInitialMeshesRotation = () => {
		this.meshesRotation.forEach((rotation, i) => this.meshes[i].rotation.set(...rotation));
		this.angleRotated = 0;
	}

	update = (time) => {
		const deltaTime = time - this.previousTime;
		this.previousTime = time;

		if (this.shouldDisablePlay(this.mesh_instructions.length)) {
			this.disablePlay();
		} else if (this.isStopped()) {
			this.setInitialMeshesRotation()
		} else if (!this.isPlayingAnimation()) return;
		else this.playAnimation(deltaTime)
	}
}
