import * as THREE from 'three';

export class OrigamiPlaneGeometry extends THREE.BufferGeometry<THREE.NormalBufferAttributes> {
  constructor(points: number[][]) {
    super();

    /**
     * We'll need to triangulate the geometries in order to proper UV mapping
     * Check this link - https://www.cs.ucr.edu/~shinar/courses/cs130-winter-2019/content/texture-mapping.pdf
     * Barycentric coordinates - https://mathworld.wolfram.com/BarycentricCoordinates.html
     *
     * Alternatively we can use shaders -  I think
     */
    this.setAttribute('position', new THREE.BufferAttribute(this.generateGeometry(points), 3));
  }

  /**
   * Generates geometry from points
   * @param points
   */
  private generateGeometry(points: number[][]): Float32Array {
    const positions = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const i3 = i * 3;
      positions[i3] = points[i][0];
      positions[i3 + 1] = points[i][1];
      positions[i3 + 2] = points[i][2];
    }
    return positions;
  }
}
