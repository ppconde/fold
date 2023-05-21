import * as THREE from 'three';
import { GeneralLights } from'./lights/general-lights';
import { Origami } from './models/origami';
import { CamerasConfig } from'./cameras/cameras-config';
import { GeneralHelpers } from './helpers/general-helpers';
import { GeneralGUI } from './gui/general-gui';
//import { GUI } from 'dat.gui';
const OrbitControls = require('three-orbit-controls')(THREE);

/**
 * Create scene, rendererer, camera
 * Initialize all the sceneSubjects
 * Update everything at every frame
 */
export class SceneManager {
	sceneObjects = [];
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
		this.setSceneHelpers();
		// this.setGUI();
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
	    this.camera.position.set(0, 5, 5);

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
		this.sceneObjects = new Map();
		this.sceneObjects.set('GeneralLights', new GeneralLights(this.scene) );
		this.sceneObjects.set('Origami', new Origami(this.scene) );
	}

	setSceneHelpers = () => {
		this.sceneObjects.set('GeneralHelpers',new GeneralHelpers(this.scene, this.sceneObjects));
	}

	setGUI = () => {
		new GeneralGUI(this.scene, this.sceneObjects);
	}

	/**
	 * Calls update for each existing scene in a sceneManager
	 */
	update = (time) => {
	    this.sceneObjects.forEach((sceneObject) => sceneObject.update(time));
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

	/**
   * Updates all objects passed as argument. Camera, lights and helpers
   * @param {*} helpers 
   * @param {*} obj 
   */
	 onChange (helpers, obj) {
		helpers?.forEach((helper) => helper.update());
		obj.target?.updateMatrixWorld && obj.target.updateMatrixWorld();
		obj.updateProjectionMatrix && obj.updateProjectionMatrix();
	}
}
