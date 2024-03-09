import * as THREE from 'three';

export class PlaneGeometry extends THREE.BufferGeometry<THREE.NormalBufferAttributes>{

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
        const positions = new Float32Array(points.length * 3);
        for (let i = 0; i < points.length; i++) {
            const i3 = i * 3;
            positions[i3] = points[i][0];
            positions[i3 + 1] = points[i][1];
            positions[i3 + 2] = points[i][2];
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

}