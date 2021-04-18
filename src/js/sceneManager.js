import * as THREE from "three";
import { GeneralLights } from'./lights/generalLights';
import { OrigamiModel } from './origami-model/origamiModel';
import { CamerasConfig } from'./cameras/cameras-config';
const OrbitControls = require('three-orbit-controls')(THREE);

/**
 * Create scene, rendererer, camera
 * Initialize all the sceneSubjects
 * Update everything at every frame
 */
export class SceneManager {
	sceneSubjects = [];
	scene;
	renderer;
	camera;

	constructor(canvas) {
		this.canvas = canvas;
		this.screenDimensions = {
			width: this.canvas.width,
			height: this.canvas.height
		}
		this.init();
	}

	/**
	 * Initializes every scene element
	 */
	init = () => {
		this.setScene();
		this.setRenderer();
		this.setCamera();
		this.setSceneObjects();
	}

	/**
	 * Sets a new scene to the current scene
	 */
	setScene = () => {
		this.scene = new THREE.Scene();
	}

	/**
	 * Sets a new WebGL renderer
	 */
	setRenderer = () => {
		const { width, height } = this.screenDimensions;
		this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this.canvas, alpha: true });
        this.renderer.shadowMap.enabled = true;
        this.renderer.physicallyCorrectLights = true;
		const DPR = (window.devicePixelRatio) ? window.devicePixelRatio : 1;
        this.renderer.setPixelRatio(DPR);
        this.renderer.setSize(width, height);
        this.renderer.gammaInput = true;
        this.renderer.gammaOutput = true; 
	}

	/**
	 * Sets a new perspective camera
	 */
	setCamera = () => {
		const { width, height } = this.screenDimensions;
		const config = CamerasConfig.find((camera) => camera.key === 'Pers-1');
		const ratio = width / height;
		const { fov, aspect, near, far } = config.props;
		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this.camera.aspect = ratio;
		this.camera.position.set(0, 10, 10);

		// Creates orbit controls object with same view direction vector as the camera
		const controls = new OrbitControls(this.camera, this.canvas);
		const lookAtVec = new THREE.Vector3(0, 0, 0)
		controls.target = lookAtVec;
		this.camera.lookAt(lookAtVec);
	}


	/**
	 * Sets each scene object in the scene
	 */
	setSceneObjects = () => {
		const sceneSubjects = [ 
			new GeneralLights(this.scene),
			new OrigamiModel(this.scene)
		];

		sceneSubjects.forEach((sceneSubject) => this.sceneSubjects.push(sceneSubject));
	}

	/**
	 * Calls update for each existing scene in a sceneManager
	 */
	update = () => {
		this.sceneSubjects.forEach((sceneSubject) => sceneSubject.update());
		this.renderer.render(this.scene, this.camera);
	};


	/**
	 * Resizes canvas and updates camera aspect ratio
	 */
	onWindowResize  = () => {
		const { width, height } = this.canvas;
		this.screenDimensions.width = width;
		this.screenDimensions.height = height;
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(width, height);
	};
}
