import * as THREE from 'three';
import { Outline } from './outline';
import { Point } from '../models/point';
import { IOrigamiCoordinates } from './_origami/origami.types';

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

    this.createFace(origamiCoordinates, face, faceNames, material);

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

  private createFace(
    origamiCoordinates: IOrigamiCoordinates,
    face: number[][],
    faceNames: string[],
    material: THREE.MeshStandardMaterial
  ): void {
    const mesh = new THREE.Mesh(this.createGeometry(faceNames, origamiCoordinates), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'Mesh';

    const outline = new Outline(face, faceNames);
    const point = new Point(face, faceNames);

    this.add(mesh);
    this.add(outline);
    this.add(point);
  }

  /**
   * Creates the geometry for the face
   * @param faceNames
   * @param origamiCoordinates
   */
  private createGeometry(faceNames: string[], origamiCoordinates: IOrigamiCoordinates): THREE.BufferGeometry {
    const { vertices, indices } = faceNames.reduce(
      (acc, point, i) => {
        acc.vertices.push(...origamiCoordinates.points[point]);
        if (i > 1) {
          acc.indices.push(0, i - 1, i);
        }
        return acc;
      },
      { vertices: [] as number[], indices: [] as number[] }
    );

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }
}
