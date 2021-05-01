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
		const planeGeo = new THREE.BufferGeometry();
		const positions = new Float32Array(this.numVertices * this.dimensions);
		const uvs = new Float32Array(this.numVertices * 2);

		let posNdx = 0;	// 
		let uvNdx = 0;
		// For every triplet of coordinates, it sets those vertices into the positions array
		for (const id of arr) {
			positions.set(this.fold.vertices_coords[id], posNdx);
			posNdx += this.dimensions;
			//uvs.set(this.fold.vertices_coords[id].slice(0,2), uvNdx);
			//uvNdx += 2;
		}

		// Get x/y positions
		const xpos = new Float32Array(this.numVertices);
		const ypos = new Float32Array(this.numVertices);
		let cc = 0;
		for (const id of arr) {
			xpos[cc] = this.fold.vertices_coords[id][0];
			ypos[cc] = this.fold.vertices_coords[id][1];
			cc++;
		}
		// Normalize x/y positions (by x/y max)
		const xmax = Math.max.apply(null, xpos);
		const ymax = Math.max.apply(null, ypos);
		cc = 0;
		for (const pos of xpos) {
			xpos[cc] = xpos[cc]/xmax;
			ypos[cc] = ypos[cc]/ymax;
			cc++;
		}
		// Put normalized x/y positions into single Float32Array
		cc = 0;
		uvNdx = 0;
		for (const pos of xpos){
			console.log(pos)
			uvs.set([xpos[cc], ypos[cc]], uvNdx);
			cc++;
			uvNdx += 2;
		}

		const positionsAttr = new THREE.BufferAttribute(positions, this.dimensions);
		const uvsAttr = new THREE.BufferAttribute(uvs, 2);

		positionsAttr.setUsage(THREE.DynamicDrawUsage);
		planeGeo.setAttribute('position', positionsAttr);
		planeGeo.setAttribute('uv', uvsAttr);
		//const uvs = this.getUvs(planeGeo);
		
		planeGeo.computeVertexNormals();
		
		return planeGeo;
	}

	getUvs = (geo) => {
		return [];
	}
}