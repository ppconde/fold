import * as THREE from 'three';
import { LightsManager } from './lights/lights';
import { Origami } from './models/origami/origami';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OrigamiTexture } from './models/origami/origami-texture';
import { SceneObjects } from './scene-types';
import { debug } from '../helpers/debug';

/**
 * Create scene, renderer, camera
 * Initialize all the sceneSubjects
 * Update everything at every frame
 */
export class SceneManager {
  public sceneObjects: Map<string, SceneObjects> = new Map();

  public scene = new THREE.Scene();

  public renderer!: THREE.WebGLRenderer;

  public camera!: THREE.PerspectiveCamera;

  public canvas: HTMLCanvasElement;

  public screenDimensions: { width: number; height: number };

  private controls!: OrbitControls;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.screenDimensions = {
      width: this.canvas.width,
      height: this.canvas.height,
    };
    this.init();
  }

  /**
   * Initializes every scene element
   */
  private init(): void {
    this.setRenderer();
    this.setSceneObjects();
    this.setCamera();
    if (debug.active) {
      this.addDebugCube();
      this.setAxisHelper();
      this.setCameraHelper();
    }
  }

  /**
   * Sets the WebGL renderer
   */
  private setRenderer(): void {
    const { width, height } = this.screenDimensions;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      alpha: true,
    });
    this.renderer.shadowMap.enabled = true;
    const DPR = window.devicePixelRatio ? window.devicePixelRatio : 1;
    this.renderer.setPixelRatio(DPR);
    this.renderer.setSize(width, height);
  }

  /**
   * Sets a new perspective camera
   */
  private setCamera(): void {
    const { width, height } = this.screenDimensions;
    const ratio = width / height;
    this.camera = new THREE.PerspectiveCamera(65, 2, 0.1, 500);
    this.camera.aspect = ratio;
    this.camera.position.set(0, 0, 20);

    // Creates orbit controls object with same view direction vector as the camera
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    /**
     * @todo - find a way to set the target to the origami object
     */
    const lookAtVec = new THREE.Vector3(0, 0, 0);

    this.controls.target = lookAtVec;
    this.camera.lookAt(lookAtVec);
  }

  /**
   * Adds a debug interface for the camera
   */
  private setCameraHelper(): void {
    const cameraFolder = debug.ui!.addFolder('Camera');
    cameraFolder.add(this.camera.position, 'x', -50, 50, 1);
    cameraFolder.add(this.camera.position, 'y', -50, 50, 1);
    cameraFolder.add(this.camera.position, 'z', -50, 50, 1);
  }

  /**
   * Sets each scene object in the scene
   */
  private setSceneObjects(): void {
    this.sceneObjects.set('LightsManager', new LightsManager(this.scene));
    this.sceneObjects.set('Origami', new Origami(this.scene, 9, 12.5));
  }

  /**
   * Adds a debug cube to the scene
   * @todo - remove when not needed
   */
  private addDebugCube(): void {
    const debugCube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        ...OrigamiTexture.loadTexture(),
      })
    );
    debugCube.visible = false;
    this.scene.add(debugCube);
    const cubeFolder = debug.ui!.addFolder('Cube');
    cubeFolder.add(debugCube, 'visible');
  }

  /**
   * Sets a new axis helper
   */
  private setAxisHelper(): void {
    const axesHelper = new THREE.AxesHelper(5);
    axesHelper.visible = false;
    this.scene.add(axesHelper);
    const axesFolder = debug.ui!.addFolder('Axes');
    axesFolder.add(axesHelper, 'visible');
  }

  /**
   * Calls update for each existing scene in a sceneManager
   */
  public update(): void {
    this.sceneObjects.forEach((sceneObject) => sceneObject.update());
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  }

  /**
   * Resizes canvas and updates camera aspect ratio
   */
  public onWindowResize(): void {
    const { width, height } = this.canvas;
    this.screenDimensions.width = width;
    this.screenDimensions.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
