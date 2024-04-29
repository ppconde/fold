import * as THREE from 'three';
import { PlaneGeometry } from '../models/plane-geometry';
import { Outlines } from '../models/line';
import { Points } from '../models/point';

export class Face extends THREE.Group {
  public indexes: { [key: string]: number };
  public pointsNames: string[];

  constructor(
    coords: number[][],
    names: string[],
    material: THREE.MeshStandardMaterial,
    width: number,
    height: number
  ) {
    super();
    this.name = 'Face';

    const geometry = new PlaneGeometry(coords, width, height);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Mesh';

    const outline = new Outlines(coords, names, width, height);
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

  public getOutlines() {
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
}
