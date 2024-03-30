import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { OrigamiSolver } from '../../../../src/scene/models/origami/origami-solver';
import { IOrigamiCoordinates } from '../../../../src/scene/models/origami/origami-types';
import { PlaneGeometry } from '../../../../src/scene/models/plane-geometry';

describe('OrigamiSolver', () => {

    describe('.createFaceMeshes', () => {
        const origamiCoordinates: IOrigamiCoordinates = {
            points: {
                'a': [0, 0, 0],
                'b': [12, 0, 0],
                'c': [12, 6, 0],
                'd': [0, 6, 0],
                'e': [6, 0, 0],
                'f': [6, 6, 0],
                'g': [3, 0, 0],
                'h': [3, 6, 0],
                'i': [9, 0, 0],
                'j': [9, 6, 0]
            },
            faces: [
                ['a', 'g', 'h', 'd'],
                ['g', 'e', 'f', 'h'],
                ['e', 'i', 'j', 'f'],
                ['i', 'b', 'c', 'j']
            ],
            pattern: {
                'a': [0, 0],
                'b': [12, 0],
                'c': [12, 6],
                'd': [0, 6],
                'e': [6, 0],
                'f': [6, 6],
                'g': [3, 0],
                'h': [3, 6],
                'i': [9, 0],
                'j': [9, 6]
            },
            faceOrder: { 0: {}, 1: {}, 2: {}, 3: {} }
        };

        it('returns an array of meshes', () => {
            const material = new THREE.MeshStandardMaterial({ color: 0xFF0000, side: THREE.DoubleSide });

            expect(OrigamiSolver.createFaceMeshes(origamiCoordinates)).toMatchObject([
                new PlaneGeometry([[0, 0, 0], [3, 0, 0], [3, 6, 0], [0, 6, 0]], 3, 6),
                new PlaneGeometry([[3, 0, 0], [6, 0, 0], [6, 6, 0], [3, 6, 0]], 3, 6),
                new PlaneGeometry([[6, 0, 0], [9, 0, 0], [9, 6, 0], [6, 6, 0]], 3, 6),
                new PlaneGeometry([[9, 0, 0], [12, 0, 0], [12, 6, 0], [9, 6, 0]], 3, 6)
            ].map((geometry) => new THREE.Mesh(geometry, material)));
        });
    });

    describe.todo('.createMeshInstructions')

    describe('.calculateFaceDimensions', () => {
        describe('when the face is a square', () => {
            it('returns the width and height of the square', () => {
                expect(OrigamiSolver['calculateFaceDimensions']([
                    [0, 0, 0],
                    [3, 0, 0],
                    [3, 6, 0],
                    [0, 6, 0]
                ])).toMatchObject({ width: 3, height: 6, depth: 0 });
            });
        });

        describe('when the face is a star', () => {
            it('returns the width and height of the star', () => {
                expect(OrigamiSolver['calculateFaceDimensions']([
                    [0, 4, 0],
                    [1, 1, 0],
                    [4, 0, 0],
                    [1, -1, 0],
                    [0, -4, 0],
                    [-1, -1, 0],
                    [0, -4, 0],
                    [-4, 0, 0],
                    [-1, 1, 0],
                ])).toMatchObject({ width: 8, height: 8, depth: 0 });
            });
        });
    });
});