import * as THREE from 'three';

export class MathHelpers {

	// Extract values from instruction
	static getFromFoldInstruction(array, translation, step) {
		const match = step.match(translation.regex);
		return array.reduce((obj, val) => {
			const valueForArray = translation[val].reduce((acc, element) => {
				if (match[element] !== undefined) {
					acc.push(match[element]);
				}
				return acc;
			}, []);
			return { ...obj, [val]: valueForArray };
		}, {});
	}

	static findPlaneBetween(points, from, to){

		if (from.length == 1 && to.length == 1){

		}else if(from.length == 1 && to.length == 2){

		}else if(from.length == 2 && to.length == 2){

		}else{
			throw new Error('The instruction is not valid. Try again!')
		}
	}
}
