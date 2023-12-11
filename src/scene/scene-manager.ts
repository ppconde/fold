import * as THREE from "three";
import { GeneralLights } from "./lights/general-lights";
import { Origami } from "./models/origami";
import { CamerasConfig } from "./cameras/cameras-config";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/**
 * Create scene, renderer, camera
 * Initialize all the sceneSubjects
 * Update everything at every frame
 */
export class SceneManager {
  public sceneObjects: Map<string, Origami | GeneralLights> = new Map();

  public scene!: THREE.Scene;

  public renderer!: THREE.WebGLRenderer;

  public camera!: THREE.PerspectiveCamera;

  public canvas: HTMLCanvasElement;

  public screenDimensions: { width: number; height: number };

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
    this.setScene();
    this.setRenderer();
    this.setCamera();
    this.setSceneObjects();
  }

  /**
   * Sets a new scene to the current scene
   */
  private setScene(): void {
    this.scene = new THREE.Scene();
  }

  /**
   * Sets a new WebGL renderer
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
    const config = CamerasConfig.find((camera) => camera.key === "Pers-1");
    if (config) {
      const ratio = width / height;
      const { fov, aspect, near, far } = config.props;
      this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
      this.camera.aspect = ratio;
      this.camera.position.set(6.25, 0, 20);

      // Creates orbit controls object with same view direction vector as the camera
      const controls = new OrbitControls(this.camera, this.canvas);
      const lookAtVec = new THREE.Vector3(6.25, 0, 0);
      controls.target = lookAtVec;
      this.camera.lookAt(lookAtVec);
    } else {
      console.error("Camera not found");
    }
  }

  /**
   * Sets each scene object in the scene
   */
  private setSceneObjects(): void {
    this.sceneObjects.set("GeneralLights", new GeneralLights(this.scene));
    this.sceneObjects.set("Origami", new Origami(this.scene));
  }

  /**
   * Calls update for each existing scene in a sceneManager
   */
  public update(): void {
    this.sceneObjects.forEach((sceneObject) => sceneObject.update());
    this.renderer.render(this.scene, this.camera);
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
