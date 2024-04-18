import * as THREE from 'three';

export class OrigamiPlaneGeometry extends THREE.BufferGeometry<THREE.NormalBufferAttributes> {

    constructor(points: number[][]) {
        super();

        this.setAttribute(
            'position',
            new THREE.BufferAttribute(this.generateGeometry(points), 3)
        );
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