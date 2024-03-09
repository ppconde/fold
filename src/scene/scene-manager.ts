import * as THREE from 'three';
import { Origami } from './models/origami/origami';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneObjects } from './scene-types';
import { debug } from '../helpers/debug';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LightsManager } from './lights/lights';
import { OBJECT_NAMES } from './constants/object-names.constants';

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

  private debugObject = {
    paperCrane: {
      visible: false,
    }
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.screenDimensions = {
      width: this.canvas.width,
      height: this.canvas.height
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
      this.addDebugObject();
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
      alpha: true
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
    this.sceneObjects.set(OBJECT_NAMES.LIGHTS_MANAGER, new LightsManager(this.scene));
    this.sceneObjects.set(OBJECT_NAMES.ORIGAMI, new Origami(this.scene, 12.5, 9));
  }

  /**
   * Adds a debug object to the scene
   * @todo - remove when not needed
   */
  private addDebugObject(): void {
    const gltfLoader = new GLTFLoader();
    gltfLoader.load('/models/3d_origami_crane/scene.gltf', (gltf) => {
      const paperCrane = gltf.scene.children[0].children[0].children[1] as THREE.Mesh;
      paperCrane.name = OBJECT_NAMES.PAPER_CRANE;
      const boundingBox = new THREE.Box3().setFromObject(paperCrane);
      const boundingBoxSize = boundingBox.getSize(new THREE.Vector3());
      paperCrane.geometry.scale(boundingBoxSize.x * 2, boundingBoxSize.y * 2, boundingBoxSize.z * 2);
      paperCrane.geometry.rotateY(Math.PI * 2);
      paperCrane.geometry.rotateX(-Math.PI * 0.5);
      paperCrane.geometry.translate(0, 6, 0);
      paperCrane.visible = this.debugObject.paperCrane.visible;
      this.scene.add(paperCrane);

      const wireframeGeometry = new THREE.WireframeGeometry(paperCrane.geometry);
      const line = new THREE.LineSegments(wireframeGeometry);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (line.material as any).color = 0x181818;
      line.visible = this.debugObject.paperCrane.visible;
      this.scene.add(line);

      paperCrane.material = new THREE.MeshStandardMaterial({
        metalness: 0.1,
        roughness: 0.95,
        color: 0xfbf6ef,
      });

      this.updateAllMaterials();

      const paperCraneFolder = debug.ui!.addFolder('PaperCrane');
      paperCraneFolder.add(paperCrane, 'visible').onChange((value: boolean) => {
        line.visible = value;
      });
      paperCraneFolder.add(paperCrane.position, 'x').min(-50).max(50).step(1).onChange(() => {
        line.position.x = paperCrane.position.x;
      });
      paperCraneFolder.add(paperCrane.position, 'y').min(-50).max(50).step(1).onChange(() => {
        line.position.y = paperCrane.position.y;
      });
      paperCraneFolder.add(paperCrane.position, 'z').min(-50).max(50).step(1).onChange(() => {
        line.position.z = paperCrane.position.z;
      });
      paperCraneFolder.add(paperCrane.material, 'roughness').min(0).max(1).step(0.001);
      paperCraneFolder.add(paperCrane.material, 'metalness').min(0).max(1).step(0.001);
    });
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

  /**
   * Disposes of all scene elements
   */
  public dispose(): void {
    this.renderer.dispose();
    this.controls.dispose();
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
    /**
     * @todo - Dispose helpers / lights / sceneObjects / etc
     */
  }

  /**
   * Updates all materials in the scene
   */
  private updateAllMaterials(): void {
    this.scene.traverse((child) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((child as any).isMesh && (child as any).material.isMeshStandardMaterial) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (child as any).material.needsUpdate = true;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }
}
