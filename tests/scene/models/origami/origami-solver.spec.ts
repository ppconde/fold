import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { OrigamiSolver } from '../../../../src/scene/models/origami/origami-solver';
import { IOrigamiCoordinates } from '../../../../src/scene/models/origami/origami-types';

describe('OrigamiSolver', () => {
  describe('.createFaceMeshes', () => {
    describe('when we have 4 rectangular faces side by side', () => {
      const origamiCoordinates: IOrigamiCoordinates = {
        points: {
          a: [0, 0, 0],
          b: [12, 0, 0],
          c: [12, 6, 0],
          d: [0, 6, 0],
          e: [6, 0, 0],
          f: [6, 6, 0],
          g: [3, 0, 0],
          h: [3, 6, 0],
          i: [9, 0, 0],
          j: [9, 6, 0]
        },
        faces: [
          ['a', 'g', 'h', 'd'],
          ['g', 'e', 'f', 'h'],
          ['e', 'i', 'j', 'f'],
          ['i', 'b', 'c', 'j']
        ],
        pattern: {
          a: [0, 0],
          b: [12, 0],
          c: [12, 6],
          d: [0, 6],
          e: [6, 0],
          f: [6, 6],
          g: [3, 0],
          h: [3, 6],
          i: [9, 0],
          j: [9, 6]
        },
        faceOrder: { 0: {}, 1: {}, 2: {}, 3: {} }
      };

      it('returns an array of meshes that represent 4 rectangles side by side', () => {
        const positions = [
          new Float32Array([0, 6, 0, 3, 6, 0, 3, 0, 0, 0, 0, 0]),
          new Float32Array([3, 6, 0, 6, 6, 0, 6, 0, 0, 3, 0, 0]),
          new Float32Array([6, 6, 0, 9, 6, 0, 9, 0, 0, 6, 0, 0]),
          new Float32Array([9, 6, 0, 12, 6, 0, 12, 0, 0, 9, 0, 0])
        ];
        const result = OrigamiSolver.createFaceMeshes(origamiCoordinates);
        result.forEach((mesh, i) => {
          expect(mesh).toBeInstanceOf(THREE.Mesh);
          expect(mesh.geometry.getAttribute('position').itemSize).toEqual(3);
          expect(mesh.geometry.getAttribute('position').array).toEqual(positions[i]);
        });
        expect(result.length).toBe(4);
      });
    });

    describe('when we have a weird shape', () => {
      const origamiCoordinates: IOrigamiCoordinates = {
        points: {
          a: [-2, 4, 0],
          b: [2, 4, 0],
          c: [4, 2, 0],
          d: [4, -2, 0],
          e: [2, -2, 0],
          f: [2, -4, 0],
          g: [-2, -4, 0],
          h: [-2, -2, 0],
          i: [-4, 0, 0]
        },
        faces: [
          ['i', 'h', 'g', 'f', 'e', 'd'],
          ['d', 'c', 'b', 'a', 'i']
        ],
        pattern: {
          a: [-2, 4],
          b: [2, 4],
          c: [4, 2],
          d: [4, -2],
          e: [2, -2],
          f: [2, -4],
          g: [-2, -4],
          h: [-2, -2],
          i: [-4, 0]
        },
        faceOrder: { 0: {}, 1: {}, 2: {}, 3: {} }
      };

      it('returns an array of meshes for that shape', () => {
        const positions = [
          new Float32Array([4, -2, 0, 2, -2, 0, 2, -4, 0, -2, -4, 0, -2, -2, 0, -4, 0, 0]),
          new Float32Array([-4, 0, 0, -2, 4, 0, 2, 4, 0, 4, 2, 0, 4, -2, 0])
        ];
        const result = OrigamiSolver.createFaceMeshes(origamiCoordinates);
        result.forEach((mesh, i) => {
          expect(mesh).toBeInstanceOf(THREE.Mesh);
          expect(mesh.geometry.getAttribute('position').itemSize).toEqual(3);
          expect(mesh.geometry.getAttribute('position').array).toEqual(positions[i]);
        });
        expect(result.length).toBe(2);
      });
    });

    describe('when we have a star shape defined in a single face', () => {
      const origamiCoordinates: IOrigamiCoordinates = {
        points: {
          a: [0, 4, 0],
          b: [1, 1, 0],
          c: [4, 0, 0],
          d: [1, -1, 0],
          e: [-1, -1, 0],
          f: [0, -4, 0],
          g: [-4, 0, 0],
          h: [-1, 1, 0]
        },
        faces: [['a', 'b', 'c', 'd', 'f', 'e', 'g', 'h']],
        pattern: {
          a: [0, 4],
          b: [1, 1],
          c: [4, 0],
          d: [1, -1],
          e: [-1, -1],
          f: [0, -4],
          g: [-4, 0],
          h: [-1, 1]
        },
        faceOrder: { 0: {}, 1: {}, 2: {}, 3: {} }
      };

      it('returns an array of a single mesh that represents that star', () => {
        const positions = [
          new Float32Array([0, 4, 0, 1, 1, 0, 4, 0, 0, 1, -1, 0, 0, -4, 0, -1, -1, 0, -4, 0, 0, -1, 1, 0])
        ];
        const result = OrigamiSolver.createFaceMeshes(origamiCoordinates);
        result.forEach((mesh, i) => {
          expect(mesh).toBeInstanceOf(THREE.Mesh);
          expect(mesh.geometry.getAttribute('position').itemSize).toEqual(3);
          expect(mesh.geometry.getAttribute('position').array).toEqual(positions[i]);
        });
        expect(result.length).toBe(1);
      });
    });

    describe('when we have a star shape defined in 5 faces', () => {
      const origamiCoordinates: IOrigamiCoordinates = {
        points: {
          a: [0, 4, 0],
          b: [1, 1, 0],
          c: [4, 0, 0],
          d: [1, -1, 0],
          e: [-1, -1, 0],
          f: [0, -4, 0],
          g: [-4, 0, 0],
          h: [-1, 1, 0]
        },
        faces: [
          ['h', 'b', 'a'],
          ['b', 'd', 'c'],
          ['e', 'f', 'd'],
          ['h', 'g', 'e'],
          ['h', 'e', 'd', 'b']
        ],
        pattern: {
          a: [0, 4],
          b: [1, 1],
          c: [4, 0],
          d: [1, -1],
          e: [-1, -1],
          f: [0, -4],
          g: [-4, 0],
          h: [-1, 1]
        },
        faceOrder: { 0: {}, 1: {}, 2: {}, 3: {} }
      };

      it('returns an array of a single mesh that represents that star', () => {
        const positions = [
          new Float32Array([0, 4, 0, 1, 1, 0, -1, 1, 0]),
          new Float32Array([4, 0, 0, 1, -1, 0, 1, 1, 0]),
          new Float32Array([1, -1, 0, 0, -4, 0, -1, -1, 0]),
          new Float32Array([-1, -1, 0, -4, 0, 0, -1, 1, 0]),
          new Float32Array([1, 1, 0, 1, -1, 0, -1, -1, 0, -1, 1, 0])
        ];
        const result = OrigamiSolver.createFaceMeshes(origamiCoordinates);
        result.forEach((mesh, i) => {
          expect(mesh).toBeInstanceOf(THREE.Mesh);
          expect(mesh.geometry.getAttribute('position').itemSize).toEqual(3);
          expect(mesh.geometry.getAttribute('position').array).toEqual(positions[i]);
        });
        expect(result.length).toBe(5);
      });
    });
  });

  describe.todo('.createMeshInstructions');
});
