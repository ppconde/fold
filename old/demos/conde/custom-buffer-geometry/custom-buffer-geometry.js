import * as THREE from 'three';
import { CustomGUI } from '../../../src/helpers/custom.gui';
const OrbitControls = require('three-orbit-controls')(THREE);

export const main = () => {

	let mesh;
	let renderer;
	let scene;
	let camera;
	let geo;
	let vertices = [
		{ pos: [0, 0, 0], uv: [0, 0] }, // 0
		{ pos: [1.5, 1.5, 0], uv: [0.25, 0.5] }, // 1
		{ pos: [3, 0, 0], uv: [0.5, 0] }, // 2
		{ pos: [0, 3, 0], uv: [0, 1] }, // 3
		{ pos: [3, 3, 0], uv: [0.5, 1] }, // 4
		{ pos: [4.5, 1.5, 0], uv: [0.75, 0.5] }, // 5
		{ pos: [6, 0, 0], uv: [1, 0] }, // 6
		{ pos: [6, 3, 0], uv: [1, 1] }, // 7
	];
	let positionsAttr;
	const canvas = document.querySelector('.main-canvas');

	function init() {
		// Scene and plane mesh
		{
			scene = new THREE.Scene();
			const planeSize = 40;
			const planeGeo = new THREE.PlaneGeometry(planeSize,planeSize)
			const planeMat = new THREE.MeshStandardMaterial({
				color: 0xFFA500,
				side: THREE.DoubleSide,
			});
    
			mesh = new THREE.Mesh(planeGeo, planeMat);
			mesh.receiveShadow = true;
			scene.add(mesh);
		}

		// Plane mesh
		{
			const numVertices = vertices.length;
			const positionNumComponents = 3;
			const uvNumComponents = 2;
			const positions = new Float32Array(numVertices * positionNumComponents);
			const uvs = new Float32Array(numVertices * uvNumComponents);
			// Custom plane geometry
			let posNdx = 0;
			let uvNdx = 0;
			for (const vertex of vertices){
				positions.set(vertex.pos, posNdx);
				uvs.set(vertex.uv, uvNdx);
				posNdx += positionNumComponents;
				uvNdx += uvNumComponents;
			}
			geo = new THREE.BufferGeometry();
			positionsAttr = new THREE.BufferAttribute(positions, positionNumComponents);
			positionsAttr.setUsage(THREE.DynamicDrawUsage);
			geo.setAttribute(
				'position',
				positionsAttr,
				'uv',
				new THREE.BufferAttribute(uvs, uvNumComponents),
			);

			geo.setIndex([
				//First square
				0, 1, 2, 
				0, 1, 3,
				1, 2, 4,
				1, 3, 4,
				//Second square
				2, 5, 6,
				2, 4, 5,
				4, 5, 7,
				5, 6, 7,
			]);
            
			const cubeMat = new THREE.MeshStandardMaterial({
				side: THREE.DoubleSide,
				color: 0xeeeeee,
			});
			geo.computeVertexNormals();
			mesh = new THREE.Mesh(geo, cubeMat);
			mesh.position.set(7, 0, 2);
			mesh.receiveShadow = true;
			mesh.castShadow = true;
			scene.add(mesh);
		}

		// Camera
		{
			const fov = 65; // fov = Field Of View
			const aspect = 2;
			const near = 0.1;
			const far = 50;
			camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
			camera.position.set(7, -8, 6);
			const controls = new OrbitControls(camera, canvas);
			const lookAtVec = new THREE.Vector3(7,2,0)
			controls.target = lookAtVec;
			camera.lookAt(lookAtVec);
			scene.add(camera);
		}
      
		{
			const color = 0xFFFFFF;
			const intensity = 5;
			const light = new THREE.DirectionalLight(color, intensity);
            
			light.position.set(0, 10, 5);
			light.target.position.set(0, 0, 0);
			light.castShadow = true;
			light.shadow.bias = -0.001;
			light.target.position.set(10,10,0);
			light.target.updateMatrixWorld();
            
			// Helpers
			const lightHelper = new THREE.DirectionalLightHelper(light);
			const camhelper = new THREE.CameraHelper(light.shadow.camera);
			scene.add(light);
			scene.add(lightHelper, camhelper);

			const gui = new CustomGUI();
			gui.add(light, 'intensity', 0, 2, 0.01);
			gui.make('color',  light, [lightHelper]);
			gui.make('position',  light, [lightHelper, camhelper]);
			gui.make('target',  light, [lightHelper, camhelper]);
		}

		renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
		renderer.shadowMap.enabled = true;
		renderer.physicallyCorrectLights = true;

		requestAnimationFrame(animate);
	}

	// eslint-disable-next-line no-unused-vars
	function animate(_timestamp) {
		const didResize = resizeRendererToDisplaySize(renderer);
		if(didResize) {
			const canvas = renderer.domElement;
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
		}
		renderer.render(scene, camera);
		// You can do this, without positionsAttr.needsUpdate
		//mesh.position.x = Math.random() * 10;
		//console.log(mesh.geometry);
		//console.log(positionsAttr.array);
		//positionsAttr.needsUpdate = true;
		requestAnimationFrame(animate);
	}

	function resizeRendererToDisplaySize(renderer) {
		const canvas = renderer.domElement;
		const width = canvas.clientWidth;
		const height = canvas.clientHeight;
		const needResize = canvas.width !== width || canvas.height !== height;

		if (needResize) {
			renderer.setSize(width, height, false);
		}
		return needResize;
	}

	init();
};
