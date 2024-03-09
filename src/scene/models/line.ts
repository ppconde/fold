import * as THREE from 'three';

export class Outline extends THREE.Object3D {

    public geometry: THREE.BufferGeometry<THREE.NormalBufferAttributes>;

    public lineWidth: number;

    public vertices: THREE.Vector3[] = [];

    constructor(geometry: THREE.BufferGeometry, lineWidth = 0.02) {
        super();
        this.geometry = geometry;
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
            const vec = this.vertices[(i % len + len) % len];
            const nextVec = this.vertices[((i + 1) % len + len) % len];

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

            this.add(pivot);
        }
    }

}