/* eslint-disable camelcase */
import * as THREE from 'three';
import img1 from './img/star.png';

const OrbitControls = require('three-orbit-controls')(THREE);

export const main = () => {

	let renderer;
	let camera;
	let scene;
	let light_ambi;
	let axes_help;
	let canvas;

	const positionNumComponents = 3;
	const uvNumComponents = 2;
	const numVertices = 12;
	const positions = new Float32Array(numVertices * positionNumComponents);
	const uvs = new Float32Array(numVertices * uvNumComponents);

	console.log(positions)

	let pos_attrib;

	let paper_geo;
	let paper;


	function init() {

		{// Renderer
			canvas = document.querySelector('.main-canvas');
			renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
			renderer.shadowMap.enabled = true;
		}

		{// Light
			light_ambi = new THREE.AmbientLight(0xffffff,0.6);
		}

		{// Camera
			const fov = 65;
			const aspect = canvas.clientWidth / canvas.clientHeight;
			const near = 0.1;
			const far = 100;
			camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
			camera.position.set(0.5, 1, 2);
			const lookAt_vec = new THREE.Vector3(0.5,1,0);
			const controls = new OrbitControls(camera, canvas);
			camera.lookAt(lookAt_vec);
			controls.target = lookAt_vec;
		}

		{// Helpers
			axes_help = new THREE.AxesHelper( 20 )
		}

		{// Paper
			// Set vertices
			const vertices = [
				{pos: [0,0,0], uv: [0,0],}, {pos: [1,0,0], uv: [1,0],}, {pos: [0,1,0], uv: [0,1],},
				{pos: [1,1,0], uv: [1,1],}, {pos: [0,1,0], uv: [0,1],}, {pos: [1,0,0], uv: [1,0],},
				{pos: [1,1,0], uv: [1,0],}, {pos: [0,2,0], uv: [0,1],}, {pos: [0,1,0], uv: [0,0],},
				{pos: [1,1,0], uv: [1,0],}, {pos: [1,2,0], uv: [1,1],}, {pos: [0,2,0], uv: [0,1],},
			]

			// Add vertices to typed array
			let posNdx = 0;
			let uvNdx = 0;
			for (const vertex of vertices) {
				positions.set(vertex.pos, posNdx);
				uvs.set(vertex.uv, uvNdx);
				posNdx += positionNumComponents;
				uvNdx += uvNumComponents;
			}

			// Geometry
			paper_geo = new THREE.BufferGeometry();
			pos_attrib = new THREE.BufferAttribute(positions, positionNumComponents);

			

			const uv_attrib = new THREE.BufferAttribute(uvs, uvNumComponents);
			pos_attrib.setUsage(THREE.DynamicDrawUsage);
			paper_geo.setAttribute('position', pos_attrib);
			paper_geo.setAttribute('uv',  uv_attrib);
			paper_geo.computeVertexNormals();

			// Material
			const loader = new THREE.TextureLoader();
			const texture = loader.load(img1);
			const color = 0x8888FF;
			const material = new THREE.MeshPhongMaterial({color, map: texture});
			material.side = THREE.DoubleSide

			// Mesh
			paper = new THREE.Mesh(paper_geo, material);

			{// Scene
				scene = new THREE.Scene();
				scene.add(light_ambi, camera, axes_help, paper);
			}
		}
		animate();
	}

	function animate(time){

		// Update display size
		if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientWidth) {
			renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
			renderer.setPixelRatio(window.devicePixelRatio);
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
		}

		// Rotate three vertices
		time *= 0.001;
		positions[positionNumComponents*(8-1)+1] = 1 + Math.cos(time);
		positions[positionNumComponents*(8-1)+2] = Math.abs(Math.sin(time));
		positions[positionNumComponents*(12-1)+1] = 1 + Math.cos(time);
		positions[positionNumComponents*(12-1)+2] = Math.abs(Math.sin(time));
		positions[positionNumComponents*(11-1)+1] = 1 + Math.cos(time);
		positions[positionNumComponents*(11-1)+2] = Math.abs(Math.sin(time));
		pos_attrib.needsUpdate = true;

		// Render
		renderer.render(scene, camera);
		requestAnimationFrame(animate);
	}

	init();
}