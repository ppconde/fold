import * as THREE from 'three';
import * as earcut from 'earcut'

export class FoldToThreeConverter {
	constructor(fold) {
		this.fold = fold;
		this.dimensions = fold.vertices_coords?.[0].length;
		// Triangulated values of the fold object. It returns an array of triplets of indexes
		const trianglesIndexes = earcut(fold.vertices_coords.flat(), null, this.dimensions);
		this.numVertices = trianglesIndexes.length;
		this.geometry = this.convertPointsToPlane(trianglesIndexes);
	}

	/**
	 * Returns a THREE BufferAttribute with 
	 * @param numVertices 
	 * @param arr 
	 */
	convertPointsToPlane = (arr) => {
		const positionsAttr = new THREE.BufferAttribute(positions, this.dimensions);
		const planeGeo = new THREE.BufferGeometry();
		const positions = new Float32Array(this.numVertices * this.dimensions);
		let posNdx = 0;	// 
		// For every triplet of coordinates, it sets those vertices into the positions array
		for (const id of arr) {
			positions.set(this.fold.vertices_coords[id], posNdx);
			posNdx += this.dimensions;
		}
		
		positionsAttr.setUsage(THREE.DynamicDrawUsage);
		planeGeo.setAttribute('position', positionsAttr);
		//const uvs = this.getUvs(planeGeo);
		//planeGeo.setAttribute('uv', uvs);
		planeGeo.computeVertexNormals();
		
		return planeGeo;
	}

	getUvs = (geo) => {
		return [];
	}
}