import { IOrigamiCoordinates } from "./origami-types";


export class OrigamiGenerator {

    public static generateOrigamiCoordinates(width: number, length: number, i: number) {

        let origamiCoordinates: IOrigamiCoordinates;

        // Real example
        if (i === 0) {
            origamiCoordinates = {
                points: {'a': [0,0,0],'b':[length,0,0],'c':[length,width,0],'d':[0,width,0]},
                faces: [['a','b','c','d']],
                pattern: {'a': [0,0],'b':[length,0],'c':[length,width],'d':[0,width]},
                faceOrder: {0: {}},
            };
        // test-1.text
        } else if (i === 1) {
            origamiCoordinates = {
                points: { 'a': [0,0,0],'b':[-2,5,0],'c':[3,10,0],'d':[0,9,0],'e':[6,0,0],'f':[9,9,0],'g':[2,0,0],'h':[9,-2,0],'i':[7,-1,0],'j':[6,4,0],'k':[2,9,0],'l':[-2,10,0],'m':[-3,11,0],'n':[-1,5,0]},
                faces: [['a','g','e','f','d'],['e','b','k','c','f'],['a','h','i','g'],['h','j','i'],['k','l','m','c'],['l','n','m']],
                pattern: { 'a': [0,0],'b':[15.4,-0.8],'c':[14.4,6.2],'d':[0,9],'e':[6,0],'f':[9,9],'g':[2,0],'h':[9,-2],'i':[7,-1],'j':[6,4],'k':[14.6,4.8],'l':[18.4,3.2],'m':[19.8,4],'n':[14.6,-0.2]},  // Not accurate
                faceOrder: {0: {1: 1},  1: {0: 1, 3:-1, 5:-1}, 2:{}, 3:{1:-1}, 4:{}, 5:{1:1}},
            };
        // test-2.text
        } else if (i === 2) {
            origamiCoordinates = {
                points: {'a':[0,0,0],'b': [length,0,0],'c':[length,width,0],'d':[0,width,0],'e':[0,width*2/5,0], 'f':[length*5/10,0,0],'g':[length*5/10,width*1/5,0],'h':[length*8/10,width*1/5,0],'i':[length*8/10,width*4/5,0], 'j':[length*5/10,width*4/5,0],'k':[length*5/10,width*3/5,0],'l':[length*7/10,width*3/5,0],'m':[length*7/10,width*2/5,0]},
                faces: [['a','f','g','h','i','j','k','l','m','e'], ['f','b','c','d','e','m','l','k','j','i','h','g']],
                pattern: {'a':[0,0],'b': [length,0],'c':[length,width],'d':[0,width],'e':[0,width*2/5], 'f':[length*5/10,0],'g':[length*5/10,width*1/5],'h':[length*8/10,width*1/5],'i':[length*8/10,width*4/5], 'j':[length*5/10,width*4/5],'k':[length*5/10,width*3/5],'l':[length*7/10,width*3/5],'m':[length*7/10,width*2/5]},
                faceOrder: {0: {},  1: {}},
            };
        // test-3.text
        } else if (i === 3) {
            origamiCoordinates = {
                points: {'a':[0,0,0],'b': [length,0,0],'c':[length,width,0],'d':[0,width,0],'e':[length/2,0,0], 'f':[length/2,width,0]},
                faces: [['a','e','f','d'], ['e','b','c','f']],
                pattern: {'a':[0,0],'b': [length,0],'c':[length,width],'d':[0,width],'e':[length/2,0], 'f':[length/2,width]},
                faceOrder: {0: {},  1: {}},
            };
        // test-1.text with j not overlapping
        } else if (i === 4) {
            origamiCoordinates = {
                points: { 'a': [0,0,0],'b':[-2,5,0],'c':[3,10,0],'d':[0,9,0],'e':[6,0,0],'f':[9,9,0],'g':[2,0,0],'h':[9,-2,0],'i':[7,-1,0],'j':[9,0,0],'k':[2,9,0],'l':[-2,10,0],'m':[-3,11,0],'n':[-1,5,0]},
                faces: [['a','g','e','f','d'],['e','b','k','c','f'],['a','h','i','g'],['h','j','i'],['k','l','m','c'],['l','n','m']],
                pattern: { 'a': [0,0],'b':[15.4,-0.8],'c':[14.4,6.2],'d':[0,9],'e':[6,0],'f':[9,9],'g':[2,0],'h':[9,-2],'i':[7,-1],'j':[9,0],'k':[14.6,4.8],'l':[18.4,3.2],'m':[19.8,4],'n':[14.6,-0.2]},  // Not accurate
                faceOrder: {0: {1: 1},  1: {0: 1, 3:-1, 5:-1}, 2:{}, 3:{1:-1}, 4:{}, 5:{1:1}},
            };
        // test-4.txt / test-5.txt (to test face order)
        } else if (i === 5) {
            origamiCoordinates = {
                points: {'a': [0,0,0],'b':[4,0,0],'c':[4,2,0],'d':[0,2,0],'e':[0,0,0],'f':[0,2,0],'g':[4,2,0],'h':[4,0,0]},
                faces: [['a','b','c','d'],['b','e','f','c'],['a','d','g','h']],
                pattern: {'a':[0,0],'b':[4,0],'c':[4,2],'d':[0,2],'e':[8,0],'f':[8,2],'g':[-4,2],'h':[-4,0]},
                faceOrder: {0: {2:1, 1:-1}, 1: {0:-1}, 2: {0:1}},
            };
        // test-4.txt / test-6.txt (to test face order)
        } else if (i === 6) {
                origamiCoordinates = {
                    points: {'a':[8,0,0],'b':[10,0,0],'c':[10,3,0],'d':[8,3,0],'e':[4,0,0],'f':[4,3,0],'g':[6,0,0],'h':[6,2,0],'i':[4,2,0],'j':[5,3,0]},
                    faces: [['e','b','c','f','i'],['a','g','h'],['g','e','i','h'],['i','f','j','h'],['a','h','j','d']],
                    pattern: {'a':[0,0],'b':[10,0],'c':[10,3],'d':[0,3],'e':[4,0],'f':[4,3],'g':[2,0],'h':[2,2],'i':[4,2],'j':[3,3]},
                    faceOrder: {0: {1: 1, 2: 1, 3: 1, 4: 1}, 1: {0: 1}, 2: {0: 1}, 3: {0: 1}, 4: {0: 1}},
                };
        } else {
            throw new Error('Origami example number i was not found!');
        }
        return origamiCoordinates;
    }
}
