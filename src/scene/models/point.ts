import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

export class Point extends THREE.Object3D {
  public coords: number[][];
  public names: string[];
  public pointRadius: number;

  constructor(coords: number[][], names: string[], pointRadius = 0.1) {
    super();
    this.name = 'Points';
    this.pointRadius = pointRadius;
    this.coords = coords;
    this.names = names;

    const loader = new FontLoader();
    loader.load(
      'fonts/helvetiker_bold.typeface.json',
      function (font) {
        this.generatePoints(this.coords, this.names, font);
      }.bind(this)
    );
  }

  /**
   * Generates the points from the geometry
   */
  private generatePoints(coords, names, font) {
    for (let i = 0; i < coords.length; i += 1) {
      const vec = new THREE.Vector3(coords[i][0], coords[i][1], coords[i][2]);

      const point = new THREE.Mesh(
        new THREE.SphereGeometry(this.pointRadius),
        new THREE.MeshBasicMaterial({ color: 0xc92027 })
      );
      const text = new THREE.Mesh(
        new TextGeometry(names[i].toUpperCase(), {
          font: font,

          size: 0.5,
          depth: 0.1,
          curveSegments: 10
        }),

        new THREE.MeshBasicMaterial({ color: 0xc92027 })
      );

      const pivot = new THREE.Group();
      pivot.add(point);
      pivot.add(text);

      pivot.position.copy(vec);
      pivot.name = names[i].toUpperCase();

      this.add(pivot);
    }
  }
}
