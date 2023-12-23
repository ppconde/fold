import * as THREE from 'three';

export class MathHelpers {


	static indexArray(a,b){
		return b.map((element) => a[element]);
	}

	static multiplyArray(a,c){
		return a.map((element) => element * c);
	}

	static addArray(a,c){
		if (!Array.isArray(c)){
			c = Array(a.length).fill(c);
		}
		return a.map((element,i) => element + c[i]);
	}

	static findVectorBetweenPoints(a,b){
		return b.map((element, i) => element - a[i]);
	}

	static findVectorNorm(u){
		return Math.sqrt(u.reduce((acc, element) => acc + Math.pow(element, 2), 0));
	}

	static addVectorToPoint(a, u){
		return a.map((element, i) => element + u[i]);
	}

	static dot(u,v){
		return u.reduce((acc, element, i) => acc + (element * v[i]), 0);
	}

	static findVersorBetweenPoints(a, b){
		const u =  this.findVectorBetweenPoints(a, b);
		const n = this.findVectorNorm(u);
		return  this.multiplyArray(u, 1/n);
	}

	static findVectorVersor(u){
		const n = this.findVectorNorm(u);
		return this.multiplyArray(u, 1/n);
	}

	static findDistanceBetweenPoints(a,b){
		const u = this.findVectorBetweenPoints(a,b);
		return this.findVectorNorm(u);
	}

	static projectPointOntoLine(a,b,c){
		const ab = this.findVectorBetweenPoints(a,b);
		const ac = this.findVectorBetweenPoints(a,c);
		return this.addArray(a,this.multiplyArray(ab,this.dot(ac,ab) / this.dot(ab,ab)));
	}
}
