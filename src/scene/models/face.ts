import * as THREE from 'three';
import { Outline } from './outline';
import { Point } from '../models/point';
import { IOrigamiCoordinates } from './origami/origami-types';

export class Face extends THREE.Group {
  public pointsNames: string[];

  constructor(
    origamiCoordinates: IOrigamiCoordinates,
    face: number[][],
    faceNames: string[],
    material: THREE.MeshStandardMaterial
  ) {
    super();
    this.name = 'Face';
    const vertices: number[] = [];
    const indices: number[] = [];
    faceNames.forEach((point, idx) => {
      const vertex = origamiCoordinates.points[point];
      vertices.push(vertex[0], vertex[1], vertex[2]);
      if (idx > 1) {
        indices.push(0, idx - 1, idx);
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Mesh';

    const outline = new Outline(face, faceNames);
    const point = new Point(face, faceNames);

    this.add(mesh);
    this.add(outline);
    this.add(point);
    // if you change the order of the adds, also change the indexes bellow

    this.pointsNames = this.getPoints()
      .children.map((mesh) => mesh.name)
      .sort();
  }

  public getOutlines(): Outline {
    return this.getObjectByName('Outline') as Outline;
  }

  public getPoints(): Point {
    return this.getObjectByName('Point') as Point;
  }

  public getOutline(o: string[]) {
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
