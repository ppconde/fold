import { IOrigamiCoordinates } from './origami-types';


export class OrigamiGenerator {

    public static generateOrigamiCoordinates(xDim: number, yDim: number, i: number) {

        let origamiCoordinates: IOrigamiCoordinates;

        // Real example
        if (i === 0) {
            origamiCoordinates = {
                points: { 'a': [0, 0, 0], 'b': [yDim, 0, 0], 'c': [yDim, xDim, 0], 'd': [0, xDim, 0] },
                faces: [['a', 'b', 'c', 'd']],
                pattern: { 'a': [0, 0], 'b': [yDim, 0], 'c': [yDim, xDim], 'd': [0, xDim] },
                faceOrder: { 0: {} },
            };
            // test-1.text
        } else if (i === 1) {
            origamiCoordinates = {
                points: { 'a': [0, 0, 0], 'b': [-2, 5, 0], 'c': [3, 10, 0], 'd': [0, 9, 0], 'e': [6, 0, 0], 'f': [9, 9, 0], 'g': [2, 0, 0], 'h': [9, -2, 0], 'i': [7, -1, 0], 'j': [6, 4, 0], 'k': [2, 9, 0], 'l': [-2, 10, 0], 'm': [-3, 11, 0], 'n': [-1, 5, 0] },
                faces: [['a', 'g', 'e', 'f', 'd'], ['e', 'b', 'k', 'c', 'f'], ['a', 'h', 'i', 'g'], ['h', 'j', 'i'], ['k', 'l', 'm', 'c'], ['l', 'n', 'm']],
                pattern: { 'a': [0, 0], 'b': [15.4, -0.8], 'c': [14.4, 6.2], 'd': [0, 9], 'e': [6, 0], 'f': [9, 9], 'g': [2, 0], 'h': [9, -2], 'i': [7, -1], 'j': [6, 4], 'k': [14.6, 4.8], 'l': [18.4, 3.2], 'm': [19.8, 4], 'n': [14.6, -0.2] },  // Not accurate
                faceOrder: { 0: { 1: 1 }, 1: { 0: 1, 3: -1, 5: -1 }, 2: {}, 3: { 1: -1 }, 4: {}, 5: { 1: 1 } },
            };
            // test-2.text
        } else if (i === 2) {
            origamiCoordinates = {
                points: { 'a': [0, 0, 0], 'b': [yDim, 0, 0], 'c': [yDim, xDim, 0], 'd': [0, xDim, 0], 'e': [0, xDim * 2 / 5, 0], 'f': [yDim * 5 / 10, 0, 0], 'g': [yDim * 5 / 10, xDim * 1 / 5, 0], 'h': [yDim * 8 / 10, xDim * 1 / 5, 0], 'i': [yDim * 8 / 10, xDim * 4 / 5, 0], 'j': [yDim * 5 / 10, xDim * 4 / 5, 0], 'k': [yDim * 5 / 10, xDim * 3 / 5, 0], 'l': [yDim * 7 / 10, xDim * 3 / 5, 0], 'm': [yDim * 7 / 10, xDim * 2 / 5, 0] },
                faces: [['a', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'e'], ['f', 'b', 'c', 'd', 'e', 'm', 'l', 'k', 'j', 'i', 'h', 'g']],
                pattern: { 'a': [0, 0], 'b': [yDim, 0], 'c': [yDim, xDim], 'd': [0, xDim], 'e': [0, xDim * 2 / 5], 'f': [yDim * 5 / 10, 0], 'g': [yDim * 5 / 10, xDim * 1 / 5], 'h': [yDim * 8 / 10, xDim * 1 / 5], 'i': [yDim * 8 / 10, xDim * 4 / 5], 'j': [yDim * 5 / 10, xDim * 4 / 5], 'k': [yDim * 5 / 10, xDim * 3 / 5], 'l': [yDim * 7 / 10, xDim * 3 / 5], 'm': [yDim * 7 / 10, xDim * 2 / 5] },
                faceOrder: { 0: {}, 1: {} },
            };
            // test-3.text
        } else if (i === 3) {
            origamiCoordinates = {
                points: { 'a': [0, 0, 0], 'b': [yDim, 0, 0], 'c': [yDim, xDim, 0], 'd': [0, xDim, 0], 'e': [yDim / 2, 0, 0], 'f': [yDim / 2, xDim, 0] },
                faces: [['a', 'e', 'f', 'd'], ['e', 'b', 'c', 'f']],
                pattern: { 'a': [0, 0], 'b': [yDim, 0], 'c': [yDim, xDim], 'd': [0, xDim], 'e': [yDim / 2, 0], 'f': [yDim / 2, xDim] },
                faceOrder: { 0: {}, 1: {} },
            };
            // test-1.text with j not overlapping
        } else if (i === 4) {
            origamiCoordinates = {
                points: { 'a': [0, 0, 0], 'b': [-2, 5, 0], 'c': [3, 10, 0], 'd': [0, 9, 0], 'e': [6, 0, 0], 'f': [9, 9, 0], 'g': [2, 0, 0], 'h': [9, -2, 0], 'i': [7, -1, 0], 'j': [9, 0, 0], 'k': [2, 9, 0], 'l': [-2, 10, 0], 'm': [-3, 11, 0], 'n': [-1, 5, 0] },
                faces: [['a', 'g', 'e', 'f', 'd'], ['e', 'b', 'k', 'c', 'f'], ['a', 'h', 'i', 'g'], ['h', 'j', 'i'], ['k', 'l', 'm', 'c'], ['l', 'n', 'm']],
                pattern: { 'a': [0, 0], 'b': [15.4, -0.8], 'c': [14.4, 6.2], 'd': [0, 9], 'e': [6, 0], 'f': [9, 9], 'g': [2, 0], 'h': [9, -2], 'i': [7, -1], 'j': [9, 0], 'k': [14.6, 4.8], 'l': [18.4, 3.2], 'm': [19.8, 4], 'n': [14.6, -0.2] },  // Not accurate
                faceOrder: { 0: { 1: 1 }, 1: { 0: 1, 3: -1, 5: -1 }, 2: {}, 3: { 1: -1 }, 4: {}, 5: { 1: 1 } },
            };
            // test-4.txt / test-5.txt (to test face order)
        } else if (i === 5) {
            origamiCoordinates = {
                points: { 'a': [0, 0, 0], 'b': [4, 0, 0], 'c': [4, 2, 0], 'd': [0, 2, 0], 'e': [0, 0, 0], 'f': [0, 2, 0], 'g': [4, 2, 0], 'h': [4, 0, 0] },
                faces: [['a', 'b', 'c', 'd'], ['b', 'e', 'f', 'c'], ['a', 'd', 'g', 'h']],
                pattern: { 'a': [0, 0], 'b': [4, 0], 'c': [4, 2], 'd': [0, 2], 'e': [8, 0], 'f': [8, 2], 'g': [-4, 2], 'h': [-4, 0] },
                faceOrder: { 0: { 2: 1, 1: -1 }, 1: { 0: -1 }, 2: { 0: 1 } },
            };
            // test-4.txt / test-6.txt (to test face order)
        } else if (i === 6) {
            origamiCoordinates = {
                points: { 'a': [8, 0, 0], 'b': [10, 0, 0], 'c': [10, 3, 0], 'd': [8, 3, 0], 'e': [4, 0, 0], 'f': [4, 3, 0], 'g': [6, 0, 0], 'h': [6, 2, 0], 'i': [4, 2, 0], 'j': [5, 3, 0] },
                faces: [['e', 'b', 'c', 'f', 'i'], ['a', 'g', 'h'], ['g', 'e', 'i', 'h'], ['i', 'f', 'j', 'h'], ['a', 'h', 'j', 'd']],
                pattern: { 'a': [0, 0], 'b': [10, 0], 'c': [10, 3], 'd': [0, 3], 'e': [4, 0], 'f': [4, 3], 'g': [2, 0], 'h': [2, 2], 'i': [4, 2], 'j': [3, 3] },
                faceOrder: { 0: { 1: 1, 2: 1, 3: 1, 4: 1 }, 1: { 0: 1 }, 2: { 0: 1 }, 3: { 0: 1 }, 4: { 0: 1 } },
            };
            // same of test-1.text I think
        } else if (i === 7) {
            origamiCoordinates = {
                points: { 'a': [0, 0, 0], 'b': [-2, 5, 0], 'c': [3, 10, 0], 'd': [0, 9, 0], 'e': [6, 0, 0], 'f': [9, 9, 0], 'g': [2, 0, 0], 'h': [9, -2, 0], 'i': [7, -1, 0], 'j': [6, 4, 0], 'k': [2, 9, 0], 'l': [-2, 10, 0], 'm': [-3, 11, 0], 'n': [-1, 5, 0] },
                faces: [['a', 'g', 'e', 'f', 'd'], ['e', 'b', 'k', 'c', 'f'], ['a', 'h', 'i', 'g'], ['h', 'j', 'i'], ['k', 'l', 'm', 'c'], ['l', 'n', 'm']],
                pattern: { 'a': [0, 0], 'b': [15.4, -0.8], 'c': [14.4, 6.2], 'd': [0, 9], 'e': [6, 0], 'f': [9, 9], 'g': [2, 0], 'h': [9, -2], 'i': [7, -1], 'j': [6, 4], 'k': [14.6, 4.8], 'l': [18.4, 3.2], 'm': [19.8, 4], 'n': [14.6, -0.2] },  // Not accurate
                faceOrder: { 0: { 1: 1 }, 1: { 0: 1, 3: -1, 5: -1 }, 2: {}, 3: { 1: -1 }, 4: {}, 5: { 1: 1 } },
            };
            // start state of createFaceMeshes github issue example (to be used with test-7.text)
        } else if (i === 8) {
            origamiCoordinates = {
                points: { 'a': [0, 0, 0], 'b': [12, 0, 0], 'c': [12, 6, 0], 'd': [0, 6, 0] },
                faces: [['a', 'b', 'c', 'd']],
                pattern: { 'a': [0, 0], 'b': [12, 0], 'c': [12, 6], 'd': [0, 6] },
                faceOrder: { 0: {}, 1: {}, 2: {}, 3: {} }
            };
            // end state of createFaceMeshes github issue example
        } else if (i === 9) {
            origamiCoordinates = {
                points: { 'a': [0, 0, 0], 'b': [12, 0, 0], 'c': [12, 6, 0], 'd': [0, 6, 0], 'e': [6, 0, 0], 'f': [6, 6, 0], 'g': [3, 0, 0], 'h': [3, 6, 0], 'i': [9, 0, 0], 'j': [9, 6, 0] },
                faces: [['a', 'g', 'h', 'd'], ['g', 'e', 'f', 'h'], ['e', 'i', 'j', 'f'], ['i', 'b', 'c', 'j']],
                pattern: { 'a': [0, 0], 'b': [12, 0], 'c': [12, 6], 'd': [0, 6], 'e': [6, 0], 'f': [6, 6], 'g': [3, 0], 'h': [3, 6], 'i': [9, 0], 'j': [9, 6] },
                faceOrder: { 0: {}, 1: {}, 2: {}, 3: {} }
            };
        } else {
            throw new Error('Origami example number i was not found!');
        }
        return origamiCoordinates;
    }
}
