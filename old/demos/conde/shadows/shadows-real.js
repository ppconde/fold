import * as THREE from 'three';
import { CustomGUI } from '../../../src/helpers/custom.gui';
const OrbitControls = require('three-orbit-controls')(THREE);

export const main = () => {

	let mesh;
	let renderer;
	let scene;
	let camera;
	let ballMesh;
	let cubeMesh;
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


		// Ball mesh
		{
			const sphereRadius = 1;
			const sphereWidthDivisions = 32;
			const sphereHeightDivisions = 16;
			const ballGeometry = new THREE.SphereGeometry(sphereRadius, sphereWidthDivisions, sphereHeightDivisions);
			const ballMaterial = new THREE.MeshStandardMaterial({
				side: THREE.DoubleSide,
				color: 0x2194ce
			});
			ballMesh = new THREE.Mesh(ballGeometry, ballMaterial);
			ballMesh.position.set(0, 0, 1);
			ballMesh.receiveShadow = true;
			ballMesh.castShadow = true;
			scene.add(ballMesh);
		}

		// Cube mesh
		{
			const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
			const cubeMat = new THREE.MeshStandardMaterial({
				side: THREE.DoubleSide,
				color: 0x2194ce
			});
			cubeMesh = new THREE.Mesh(cubeGeo, cubeMat);
			cubeMesh.position.set(7, 0, 2);
			cubeMesh.receiveShadow = true;
			cubeMesh.castShadow = true;
			scene.add(cubeMesh);
		}

		// Camera
		{
			const fov = 65; // fov = Field Of View
			const aspect = 2;
			const near = 0.1;
			const far = 50;
			camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
			camera.position.set(4, -10, 6);
			const controls = new OrbitControls(camera, canvas);
			const lookAtVec = new THREE.Vector3(4,0,0)
			controls.target = lookAtVec;
			camera.lookAt(lookAtVec);
			scene.add(camera);
		}

		// Create a directional light
		/* {
            const light = new THREE.PointLight(0xffffff,50, 10, 2);
            // move the light back and up a bit
            light.position.set(0, 3, 10);
            // remember to add the light to the scene
            scene.add(light);
        } */

		// Setup 2 lights
		//light 2
		/*         {
            const skyColor = 0xB1E1FF;  // light blue
            const groundColor = 0xB97A20;  // brownish orange
            const intensity = 2;
            const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
            scene.add(light);
        } */


        
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
			new THREE.AxesHelper( 20 );
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

	function animate() {
		const didResize = resizeRendererToDisplaySize(renderer);
		if(didResize) {
			const canvas = renderer.domElement;
			camera.aspect = canvas.clientWidth / canvas.clientHeight;
			camera.updateProjectionMatrix();
		}
		renderer.render(scene, camera);

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
