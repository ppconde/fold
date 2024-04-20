import * as THREE from 'three';

export class Point extends THREE.Object3D {
  public geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>;

  public pointRadius: number;

  constructor(geometry: THREE.BufferGeometry, pointRadius = 0.1) {
    super();
    this.geometry = geometry;
    this.pointRadius = pointRadius;

    this.generatePoints();
  }

  /**
   * Generates the points from the geometry
   */
  private generatePoints() {
    const position = this.geometry.getAttribute('position').array;
    for (let i = 0; i < position.length; i += 3) {
      const vec = new THREE.Vector3(position[i], position[i + 1], position[i + 2]);

      const point = new THREE.Mesh(
        new THREE.SphereGeometry(this.pointRadius),
        new THREE.MeshBasicMaterial({ color: 0xc92027 })
      );

      const pivot = new THREE.Group();
      pivot.add(point);

      pivot.position.copy(vec);

      this.add(pivot);
    }
  }
}
