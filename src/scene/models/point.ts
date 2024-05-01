import * as THREE from 'three';
import { Font, FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export class Points extends THREE.Object3D {
  private names: string[];
  private pointRadius: number;

  constructor(coords: number[][], names: string[], pointRadius = 0.1) {
    super();
    this.name = 'Points';
    this.pointRadius = pointRadius;
    this.names = names;

    this.generatePoints(coords, names);

    const loader = new FontLoader();
    loader.load('fonts/helvetiker_bold.typeface.json', (font) => this.generateText(font));
  }

  public onBeforeRender(
    _renderer: THREE.WebGLRenderer,
    _scene: THREE.Scene,
    camera: THREE.Camera,
    _geometry: THREE.BufferGeometry,
    _material: THREE.Material
  ) {
    this.lookAt(camera.position);
  }

  /**
   * Generates the points from the geometry
   */
  private generatePoints(coords: number[][], names: string[]) {
    const geometry = new THREE.SphereGeometry(this.pointRadius);
    const material = new THREE.MeshBasicMaterial({ color: 0xc92027 });

    for (let i = 0; i < coords.length; i += 1) {
      const vec = new THREE.Vector3(coords[i][0], coords[i][1], coords[i][2]);

      const point = new THREE.Mesh(geometry, material);
      const pivot = new THREE.Group();
      pivot.add(point);

      pivot.position.copy(vec);
      pivot.name = names[i].toUpperCase();
      pivot.visible = false;

      this.add(pivot);
    }
  }

  private generateText(font: Font) {
    const material = new THREE.MeshBasicMaterial({ color: 0xc92027, depthTest: false });
    for (let i = 0; i < this.children.length; i += 1) {
      const text = new THREE.Mesh(
        new TextGeometry(this.names[i].toUpperCase(), {
          font: font,

          size: 0.5,
          depth: 0.1,
          curveSegments: 10
        }),
        material
      );
      text.onBeforeRender = this.onBeforeRender;

      this.children[i].add(text);
    }
  }

  public getPoint(name: string) {
    return this.children.find((child) => child.name === name.toUpperCase());
  }

  public disableVisibility() {
    this.children.forEach((child) => (child.visible = false));
  }

  public dispose() {
    this.children.forEach((child) => {
      child.children[0].geometry.dispose();
      child.children[1].geometry.dispose();
    });
  }
}
