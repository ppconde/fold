import * as THREE from 'three';
import * as earcut from 'earcut'

export class FoldToThreeConverter {
	constructor(fold) {
		this.fold = fold;
		this.dimensions = fold.vertices_coords?.[0].length;
		this.uvDimensions = 2;
		// Triangulated values of the fold object. It returns an array of triplets of indexes
		this.trianglesIndexes = this.triangulateFold();
		this.numVertices = this.trianglesIndexes.length;
		this.geometry = this.convertPointsToPlane(this.trianglesIndexes);
		// Two triplets that define the (for now, first) crease: [[x1,y1,z1],[x2,y2,z2]]
		this.crease = [fold.vertices_coords[fold.edges_vertices[0][0]],fold.vertices_coords[fold.edges_vertices[0][1]]];
	}

	/**
	 * Triangulates a fold object and returns an array of indexes of the triangulated object
	 */
	triangulateFold = () => {
		if (this.fold?.faces_vertices) {
			return this.fold.faces_vertices.reduce((acc, face) => {
				const vertices = face.map((val) => this.fold.vertices_coords[val - 1]);
				const earcutIndexes = earcut(vertices.flat(), null, this.dimensions);
				const faceIndexes = earcutIndexes.reduce((acc, li) => {
					acc.push(face[li] - 1);
					return acc;
				}, []);
				acc.push(...faceIndexes);
				return acc;
			}, []);
		}

		// add triangulation for edges vertices later
		
	}
	
	/**
	* Returns a THREE BufferAttribute with 
	* @param numVertices 
	* @param trianglesIndexes 
	*/
	convertPointsToPlane = (trianglesIndexes) => {
		const planeGeo = new THREE.BufferGeometry();
		const positions = this.getPositionsArray(trianglesIndexes);
		const verticesPositions = this.getVerticesPositions(trianglesIndexes);
		const uvs = this.getUvs(verticesPositions);
		const positionsAttr = new THREE.BufferAttribute(positions, this.dimensions);
		const uvsAttr = new THREE.BufferAttribute(uvs, this.uvDimensions);
		
		positionsAttr.setUsage(THREE.DynamicDrawUsage);
		planeGeo.setAttribute('position', positionsAttr);
		planeGeo.setAttribute('uv', uvsAttr);
		planeGeo.computeVertexNormals();
		
		return planeGeo;
	}
	
	/**
	 * Transforms an array of triangle indexes and returns an array of positions for those indexes
	 * @param trianglesIndexes 
	 */
	getPositionsArray = (trianglesIndexes) => {
		const positions = new Float32Array(this.numVertices * this.dimensions);
		let posNdx = 0;
		// For every triplet of coordinates, it sets those vertices into the positions array
		for (const id of trianglesIndexes) {
			positions.set(this.fold.vertices_coords[id], posNdx);
			posNdx += this.dimensions;
		}
		
		return positions;
	}
	
	/**
	 * Returns an object that contains an array of x/y/z coordinates from triangulated indexes
	 * @param trianglesIndexes 
	 */
	getVerticesPositions = (trianglesIndexes) => {
		// Get x/y/z positions
		const xpos = new Float32Array(this.numVertices);
		const ypos = new Float32Array(this.numVertices);
		const zpos = new Float32Array(this.numVertices);
		
		trianglesIndexes.forEach((triangleIndex, i) => {
			xpos[i] = this.fold.vertices_coords[triangleIndex][0];
			ypos[i] = this.fold.vertices_coords[triangleIndex][1];
			if (this.is3D()) {
				zpos[i] = this.fold.vertices_coords[triangleIndex][2];
			}
		})
		
		return { xpos, ypos, zpos: this.is3D() ? zpos : null };
	}
	
	/**
	 * Returns an array of UV vectors
	 * @param verticesPositions 
	 */
	getUvs = (verticesPositions) => {
		const uvs = new Float32Array(this.numVertices * this.dimensions);
		let uvNdx = 0;
		// Put normalized x/y positions into single Float32Array
		const normArr = this.normalizePositions(verticesPositions);
		verticesPositions.xpos.forEach((_, i) => {
			const normVec = this.is3D() ? [normArr.x[i], normArr.y[i], normArr.z[i]] : [normArr.x[i], normArr.y[i]];
			uvs.set(normVec, uvNdx);
			uvNdx += this.uvDimensions;
		});
		
		return uvs;
	}
	
	/**
	 * Normalizes an array of positions and returns an array of normalized coordinates
	 * @param arrPos 
	 */
	normalizePositions = (arrPos) => {	
		const {xpos, ypos, zpos } = arrPos;
		const max = {
			x: this.getMaxValFromArray(xpos),
			y: this.getMaxValFromArray(ypos),
			z: this.is3D ? this.getMaxValFromArray(zpos) : null,
		};
		// Normalize x/y/z positions (by x/y/z max)
		return {
			x: this.normalize(xpos, max.x),
			y: this.normalize(ypos, max.y),
			z: this.is3D() ? this.normalize(zpos, max.z) : null,
		}
	}
	
	/**
	* Returns max value from an array
	* @param arr 
	*/
	getMaxValFromArray = (arr) => {
		return arr.reduce((a,b) => Math.max(a,b));
	}
	
	/**
	* Normalizes an array of values
	* @param arr 
	* @param max 
	*/
	normalize = (arr, max) => {
		return arr.map((val) => !max ? 0 : val/max);
	}
	
	/**
	* Returns true when dimenions of fold object is 3
	*/
	is3D = () => {
		return this.dimensions === 3;
	}
	
}