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

}