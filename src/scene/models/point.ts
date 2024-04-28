import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
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
    loader.load(
      'fonts/helvetiker_bold.typeface.json',
      function (font) {
        this.generateText(font);
      }.bind(this)
    );
  }

  private onBeforeRender(_renderer, _scene, camera, _geometry, _material) {
    this.lookAt(camera.position);
  }

  /**
   * Generates the points from the geometry
   */
  private generatePoints(coords, names) {
    for (let i = 0; i < coords.length; i += 1) {
      const vec = new THREE.Vector3(coords[i][0], coords[i][1], coords[i][2]);

      const point = new THREE.Mesh(
        new THREE.SphereGeometry(this.pointRadius),
        new THREE.MeshBasicMaterial({ color: 0xc92027 })
      );
      const pivot = new THREE.Group();
      pivot.add(point);

      pivot.position.copy(vec);
      pivot.name = names[i].toUpperCase();

      this.add(pivot);
    }
  }

  private generateText(font) {
    for (let i = 0; i < this.children.length; i += 1) {
      const text = new THREE.Mesh(
        new TextGeometry(this.names[i].toUpperCase(), {
          font: font,

          size: 0.5,
          depth: 0.1,
          curveSegments: 10
        }),

        new THREE.MeshBasicMaterial({ color: 0xc92027, depthTest: false })
      );
      text.onBeforeRender = this.onBeforeRender;

      this.children[i].add(text);
    }
  }

  public getPoint(name) {
    for (let index = 0; index < this.children.length; index++) {
      if (this.children[index].name === name.toUpperCase()) {
        return this.children[index];
      }
    }

    return undefined;
  }
}
