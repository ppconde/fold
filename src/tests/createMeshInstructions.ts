import { OrigamiSolver } from '../scene/models/origami/origami-solver';
import { OrigamiGenerator } from '../scene/models/origami/origami-coordinates-generator'

export class meshInstructionCreator {

    public static test() {

        let origamiCoordinates;
        let faceRotationInstructions;

        const i: number = 1;
        if (i === 0) {
            origamiCoordinates = {
                points: {'a':[0,0,0],'b':[12,0,0],'c':[12,6,0],'d':[0,6,0],'e':[6,0,0],'f':[6,6,0],'g':[3,0,0],'h':[3,6,0],'i':[9,0,0],'j':[9,6,0]}, 
                faces: [['a','g','h','d'],['g','e','f','h'],['e','i','j','f'],['i','b','c','j']],
                pattern: {'a':[0,0],'b':[12,0],'c':[12,6],'d':[0,6],'e':[6,0],'f':[6,6],'g':[3,0],'h':[3,6],'i':[9,0],'j':[9,6]},
                faceOrder: {0: {},  1: {}, 2: {}, 3: {}}
            };
    
            faceRotationInstructions = [
                {faces: [['a', 'e', 'f', 'd']], axis: ['e', 'f'], angle: 180},
                {faces: [['e','f','h','g'], ['i','j','f','e']], axis: ['i','j'], angle: 180}
            ];
        }
        else if (i === 1) {
            const xDim = 6;
            const yDim = 6;
            origamiCoordinates = OrigamiGenerator.generateOrigamiCoordinates(xDim, yDim, 10);
            faceRotationInstructions = [
                {faces: [['aa', 'be', 'bj', 'af']], axis: ['be', 'bj'], angle: 180},
            ];

        } else {
            throw new Error('Invalid test number.');
        }

        const meshInstructions = OrigamiSolver.createMeshInstructions(origamiCoordinates, faceRotationInstructions);  // Ideally meshes should be input instead of origamiCoordinates, since they should already contain points
        debugger;
    }
}