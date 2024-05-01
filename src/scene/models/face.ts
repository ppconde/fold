import * as THREE from 'three';
import { Outlines } from '../models/line';
import { Points } from '../models/point';

export class Face extends THREE.Group {
  public indexes: { [key: string]: number };
  public pointsNames: string[];

  constructor(coords: number[][], names: string[], material: THREE.MeshStandardMaterial) {
    super();
    this.name = 'Face';

    /**
     * Shape geometry internally triangulates the face, you can check the second code example in this link
     * https://threejs.org/docs/#api/en/core/BufferGeometry
     * You store the vertices positions in the position array and then you have the index array
     * that tells you how to connect the vertices to form the triangulated faces
     */
    const shape = new THREE.Shape(coords.map(([x, y]) => new THREE.Vector2(x, y)));
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Mesh';

    const outline = new Outlines(coords, names);
    const point = new Points(coords, names);

    {
      this.add(mesh);
      this.add(outline);
      this.add(point);
      // if you change the order of the adds, also change the indexes bellow
      this.indexes = {
        MESH: 0,
        OUTLINES: 1,
        POINTS: 2
      };
    }

    this.pointsNames = this.getPoints()
      .children.map((x) => x.name)
      .sort();
  }

  public getOutlines(): Outlines {
    return this.children[this.indexes.OUTLINES];
  }

  public getPoints() {
    return this.children[this.indexes.POINTS];
  }

  public getOutline(o: string) {
    return this.getOutlines().getOutline(o);
  }

  public getPoint(p: string) {
    return this.getPoints().getPoint(p);
  }

  public disableVisibility() {
    this.getOutlines().disableVisibility();
    this.getPoints().disableVisibility();
  }

  public dispose() {
    this.children.forEach((child) => {
      child.dispose();
    });
  }
}
