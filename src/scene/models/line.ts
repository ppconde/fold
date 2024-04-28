import * as THREE from 'three';

export class Outline extends THREE.Object3D {
  public geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>;
  private width: number;
  private height: number;

  public lineWidth: number;

  public vertices: THREE.Vector3[] = [];

  constructor(geometry: THREE.BufferGeometry, width: number, height: number, lineWidth: number = 0.02) {
    super();
    this.geometry = geometry;
    this.width = width;
    this.height = height;
    this.lineWidth = lineWidth;

    this.calculateVertices();
    this.generateLines();
  }

  /**
   * Generates the vertices vectors from the geometry
   */
  private calculateVertices(): void {
    const position = this.geometry.getAttribute('position').array;
    for (let i = 0; i < position.length; i += 3) {
      const vec = new THREE.Vector3(position[i], position[i + 1], position[i + 2]);
      this.vertices.push(vec);
    }
  }

  /**
   * Generates the lines for the outline
   */
  private generateLines() {
    for (let i = 0; i < this.vertices.length; i++) {
      const len = this.vertices.length;
      // Circular array access
      const vec = this.vertices[((i % len) + len) % len];
      const nextVec = this.vertices[(((i + 1) % len) + len) % len];

      const lineVector = nextVec.clone().sub(vec);
      const border =
        lineVector.x != 0 && lineVector.x != this.width
          ? lineVector.y != 0 && lineVector.y != this.height
            ? false
            : true
          : true;

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

      pivot.visible = border;
      this.add(pivot);
    }
  }

  public changeVisibility(visible: boolean, index: number = -1) {
    // if no index if define, change the visilibity to all lines
    if (index == -1) {
      for (let index = 0; index < this.children.length; index++) {
        this.children[index].visible = visible;
      }
    } else if (index >= 0 && index <= 2) {
      this.children[index].visible = visible;
    }
  }
}
