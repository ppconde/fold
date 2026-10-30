import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { LAYER_GAP } from '../fold/fold';
import { visibleParts } from './visible-lines';

// face 0: the unit square on the table; face 1: a strip over its middle third of x, three layers up
const z = 3 * LAYER_GAP;
const square = (x0: number, x1: number, h: number) => [
  [x0, 0, h, x1, 0, h, x1, 1, h],
  [x0, 0, h, x1, 1, h, x0, 1, h]
];
const tris = [...square(0, 1, 0), ...square(1 / 3, 2 / 3, z)].flat();
const faceOf = [0, 0, 1, 1];
// a crease across face 0
const line = [0, 0.5, 0, 1, 0.5, 0];
const xs = (flat: number[]) => flat.filter((_, i) => i % 3 === 0);

describe('visibleParts', () => {
  it('cuts a line where paper above it hides it', () => {
    const seen = visibleParts(line, [0], [[0]], tris, faceOf, new Vector3(0.5, 0.5, 5));
    expect(seen).toHaveLength(12);
    const [a, b, c, d] = xs(seen);
    expect(a).toBe(0);
    expect(b).toBeCloseTo(1 / 3, 2);
    expect(c).toBeCloseTo(2 / 3, 2);
    expect(d).toBe(1);
  });

  it('keeps the whole line from the side the paper is on', () => {
    expect(visibleParts(line, [0], [[0]], tris, faceOf, new Vector3(0.5, 0.5, -5))).toEqual(line);
  });

  it('draws only the copy of a crease most in sight, the nearer if both are', () => {
    // one crease, folded: a copy on face 0 and one on face 1, three layers up
    const bottom = [1 / 3, 0.5, 0, 2 / 3, 0.5, 0];
    const top = [1 / 3, 0.5, z, 2 / 3, 0.5, z];
    const both = (eye: Vector3) => visibleParts([...bottom, ...top], [0, 0], [[0, 1]], tris, faceOf, eye, true);
    expect(both(new Vector3(0.5, 0.5, 5))).toEqual(top);
    expect(both(new Vector3(0.5, 0.5, -5))).toEqual(bottom);
    // every copy, when they are not one crease
    expect(visibleParts([...bottom, ...top], [0, 0], [[0, 1]], tris, faceOf, new Vector3(0.5, 0.5, 5))).toHaveLength(
      12
    );
  });

  it('never lets the line’s own faces hide it', () => {
    expect(visibleParts(line, [0], [[0, 1]], tris, faceOf, new Vector3(0.5, 0.5, 5))).toEqual(line);
  });
});
