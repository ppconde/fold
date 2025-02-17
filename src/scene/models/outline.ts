import * as THREE from 'three';

export class Outline extends THREE.Object3D {
  private lineWidth: number;
  private vertices: THREE.Vector3[] = [];

  constructor(coords: number[][], names: string[], lineWidth: number = 0.02) {
    super();
    this.name = 'Outline';
    this.lineWidth = lineWidth;

    this.calculateVertices(coords);
    this.generateLines(names);
  }

  /**
   * Generates the vertices vectors from the geometry
   */
  private calculateVertices(coords: number[][]): void {
    for (let i = 0; i < coords.length; i += 1) {
      const vec = new THREE.Vector3(coords[i][0], coords[i][1], coords[i][2]);
      this.vertices.push(vec);
    }
  }

  /**
   * Generates the lines for the outline
   */
  private generateLines(names: string[]) {
    for (let i = 0; i < this.vertices.length; i++) {
      const len = this.vertices.length;
      // Circular array access
      const vec = this.vertices[i];
      const nextVec = this.vertices[(i + 1) % len];

      const lineVector = nextVec.clone().sub(vec);

      const lineLength = lineVector.length();
      const normalizedVec = lineVector.clone().normalize();
      const halfLineLength = normalizedVec.clone().multiplyScalar(lineLength / 2.0);

      const radialSegments = 3;

      const line = new THREE.Mesh(
        new THREE.CylinderGeometry(this.lineWidth, this.lineWidth, lineLength, radialSegments),
        new THREE.MeshBasicMaterial({ color: 0x181818 })
      );
      const pivot = new THREE.Group();
      pivot.add(line);

      pivot.position.copy(vec);
      pivot.position.add(halfLineLength);
      pivot.lookAt(nextVec);
      line.rotation.x = Math.PI / 2.0;
      pivot.userData.name = [names[i], names[(i + 1) % len]].sort();
      pivot.visible = false;

      this.add(pivot);
    }
  }

  public getOutline(array: string[]) {
    if (array.length != 2) return undefined;
    array.sort();

    return this.children.find((child) => child.userData.name[0] === array[0] && child.userData.name[1] === array[1]);
  }

  public disableVisibility(): void {
    this.children.forEach((child) => (child.visible = false));
  }
}
