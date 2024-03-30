import * as THREE from 'three';
import { Earcut } from 'three/src/extras/Earcut.js';

export class PlaneGeometry extends THREE.BufferGeometry<THREE.NormalBufferAttributes> {
    public width: number;

    public height: number;

    constructor(points: number[][], width: number, height: number) {
        super();

        this.width = width;

        this.height = height;

        this.setAttribute('position', new THREE.BufferAttribute(this.generateGeometry(points), 3));

        /**
         * UVs are used to map textures to the geometry
         */
        this.setAttribute('uv', new THREE.BufferAttribute(this.generateUVs(points), 2));

        /**
         * Computes vertex normals for correct lighting
         */
        this.computeVertexNormals();
    }

    /**
     * Generates geometry from points
     * @param points
     */
    private generateGeometry(points: number[][]): Float32Array {
        const triangulatedPoints = this.triangulate(points);
        const positions = new Float32Array(triangulatedPoints.length * 3);

        for (let i = 0; i < triangulatedPoints.length; i++) {
            const i3 = i * 3;
            positions[i3] = triangulatedPoints[i][0];
            positions[i3 + 1] = triangulatedPoints[i][1];
            positions[i3 + 2] = triangulatedPoints[i][2];
        }

        return positions;
    }

    /**
     * Generates UVs from points
     */
    private generateUVs(points: number[][]): Float32Array {
        const uvs = new Float32Array(points.length * 2);
        for (let i = 0; i < points.length; i++) {
            const i2 = i * 2;
            uvs[i2] = points[i][0] / this.width;
            uvs[i2 + 1] = points[i][1] / this.height;
        }
        return uvs;
    }

    /**
     * Triangulates points - converts points to triangles
     * @param points
     */
    private triangulate(points: number[][]): number[][] {
        const verticesIndexes = Earcut.triangulate(points.flat(), [], 3);
        return verticesIndexes.map((index) => points[index]);
    }

}