import * as THREE from 'three';
import fold from '../../../crease-patterns/rectangle.fold';
import { FoldToThreeConverter } from'../converters/fold-to-three-converter';
import img1 from '../../../../demos/guta/img/star.png';

export class Origami {
	constructor(scene) {
		// Temporary geo and material
		this.foldInfo = new FoldToThreeConverter(fold);
		this.crease = this.foldInfo.crease;
		this.trianglesIndexes = this.foldInfo.trianglesIndexes;
		// eslint-disable-next-line camelcase
		this.vertices_coords = this.foldInfo.fold.vertices_coords;

		this.geometry = this.foldInfo.geometry;
		const color = 0x8888FF;
		const loader = new THREE.TextureLoader();
		const texture = loader.load(img1);
		this.material = new THREE.MeshPhongMaterial({color, map: texture, wireframe: true });
		//this.material = new THREE.MeshStandardMaterial({ color: new THREE.Color('rgb(100,0,0)') });
		this.material.side = THREE.DoubleSide;
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		scene.add(this.mesh);
		this.init();


		// PREPARE TO ROTATE
		// Geometry's vertice's positions
		

		// Point to fold, as index in rectangle.fold (for now, we know this a priori)
		const foldPntIdx = 0;
 		let foldPnt = new THREE.Vector3(this.vertices_coords[foldPntIdx][0], this.vertices_coords[foldPntIdx][1], this.vertices_coords[foldPntIdx][2]);

		// Crease vector
		const creasePnt1 = new THREE.Vector3(this.crease[0][0], this.crease[0][1],this.crease[0][2]);
		const creasePnt2 = new THREE.Vector3(this.crease[1][0], this.crease[1][1],this.crease[1][2]);
		const creaseVec = creasePnt2.clone().sub(creasePnt1).normalize();
		
		// Vector from crease to point-to-fold
		const creaseLine = new THREE.Line3(creasePnt1,creasePnt2);
		const foldProjPnt = new THREE.Vector3();
		creaseLine.closestPointToPoint(foldPnt,false,foldProjPnt);
		const foldPntFromCrease = foldPnt.clone().sub(foldProjPnt);

		// Folding parameters
		const foldAngle = Math.PI;
		const foldDur = 4; // s


		this.foldDur = foldDur;
		this.foldAngle = foldAngle;
		this.foldPntFromCrease = foldPntFromCrease;
		this.creaseVec = creaseVec;
		this.foldProjPnt = foldProjPnt;
		this.foldPnt = foldPnt;
		// this.positions = positions;
		this.foldPntIdx = foldPntIdx;

		const x = 2;
		this.x = x;
		this.x.set
	}

	init = () => {
		this.loadFoldObject();
	}

	/**
	 * Loads fold object and parses it into a json object
	 */
	loadFoldObject = () => {
		//console.log(new FoldToThreeConverter(fold));

	}

	update = (time) => {
		const posAttribute = this.geometry.getAttribute('position');
		let positions = posAttribute.array;
		posAttribute.needsUpdate = true;
		
		//const time = Date.now()*0.001;
		time *= 0.001;
		// Rotate point till specified angle over specified time
		// console.log(time)
		
		if (time <= this.foldDur) {
			const foldPntFromCrease2 = this.foldPntFromCrease.clone().applyAxisAngle(this.creaseVec,(this.foldAngle/this.foldDur)*time);
			this.foldPnt = this.foldProjPnt.clone().add(foldPntFromCrease2);

			// Update triangle vertices
			for(let i = 0; i < this.trianglesIndexes.length; i++) {
				if (this.trianglesIndexes[i] === this.foldPntIdx) {
					positions.set([this.foldPnt.x, this.foldPnt.y, this.foldPnt.z], i*3); 
					
				}
			}
		} 







/* 		// Comentei porque descobri o .applyAxisAngle, que faz o que eu quero fazer para este caso -.-
 		
		// Cylinder Z axis (= crease vector)
		const cylZ = creasePnt2.clone().sub(creasePnt1).normalize();

		// Cylinder Y axis (pointing up)
		const cylY = new THREE.Vector3(0, 0, 1);

		// Cylinder X axis (along the sheet, perpendicular to crease)
		const cylX = cylY.clone().cross(cylZ);

		// Rotation matrix, from reference 1 (sheet-alligned) to reference 2 (cylinder-alligned)
		const R = new THREE.Matrix4();
		R.set( cylX.x, cylX.y, cylX.z, 0,
			   cylY.x, cylY.y, cylY.z, 0,
			   cylZ.x, cylZ.y, cylZ.z, 0,
				    0, 	   0, 	    0, 1 );

		// Translation matrix, from reference 1 (sheet-alligned) to reference 2 (cylinder-alligned)
		const T = new THREE.Matrix4();
		T.set( 1, 0, 0, -creasePnt1.x,
			   0, 1, 0, -creasePnt1.y,
			   0, 0, 1, -creasePnt1.z,
			   0, 0, 0,             1 );

		// Change from reference 1 to reference 2
		let foldPntRef2 = foldPnt.clone().applyMatrix4(T).applyMatrix4(R);

		// Change from cartesian to cylindrical coordinates
		const foldPntCyl = new THREE.Cylindrical();
		foldPntCyl.setFromVector3(foldPntRef2); // Cuidado, talvez ele espere que o eixo do cilindro seja o y (e não o z)

		// Fold point till other side
		if (foldPntCyl.theta < Math.PI) {
			time *= 0.001;
			foldPntCyl.theta += time;
		}

		// Change back to cartesian
		foldPntRef2.setFromCylindrical(foldPntCyl);

		// Change back to reference 1 (sheet-alligned)
		foldPnt = foldPntRef2.clone().applyMatrix4(T).applyMatrix4(R);

		// Parado aqui: descobri o .applyAxisAngle
		R.invert();
		T.invert(); */

		// Pode ser útil:
/* 		const creaseLine = new THREE.Line3(creasePnt1,creasePnt2);
		const d = creaseLine.closestPointToPoint(foldPnt,false).distanceTo; */


	}
}
