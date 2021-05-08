import * as THREE from 'three';
import * as earcut from 'earcut'

export class FoldToThreeConverter {
	constructor(fold) {
		this.fold = fold;
		this.dimensions = fold.vertices_coords?.[0].length;
		// Triangulated values of the fold object. It returns an array of triplets of indexes
		this.trianglesIndexes = earcut(fold.vertices_coords.flat(), null, this.dimensions);
		this.numVertices = this.trianglesIndexes.length;
		this.geometry = this.convertPointsToPlane(this.trianglesIndexes);
		console.log(this.trianglesIndexes)
		// Two triplets that define the (for now, first) crease: [[x1,y1,z1],[x2,y2,z2]]
		this.crease = [fold.vertices_coords[fold.edges_vertices[0][0]],fold.vertices_coords[fold.edges_vertices[0][1]]]; 

/* 		console.log(fold.edges_vertices)
		console.log(fold.vertices_coords)
		console.log(this.crease) */
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