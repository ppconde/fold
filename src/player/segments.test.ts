import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { describe, expect, it } from 'vitest';
import { setSegments, writeSegments } from './segments';

const buffer = (g: LineSegmentsGeometry) =>
  g.getAttribute('instanceStart') as unknown as { data: { array: Float32Array } };

describe('writeSegments', () => {
  it('reuses the buffer while the segment count stays the same', () => {
    const line = { geometry: new LineSegmentsGeometry() };
    writeSegments(line, [0, 0, 0, 1, 0, 0]);
    const first = line.geometry;
    writeSegments(line, [0, 0, 0, 0, 2, 0]);
    expect(line.geometry).toBe(first);
    expect([...buffer(line.geometry).data.array]).toEqual([0, 0, 0, 0, 2, 0]);
    expect(line.geometry.boundingSphere?.radius).toBeCloseTo(1);
  });

  it('swaps in a new geometry when the count changes, since three caches the instance count', () => {
    const line = { geometry: new LineSegmentsGeometry() };
    writeSegments(line, [0, 0, 0, 1, 0, 0]);
    const first = line.geometry;
    let disposed = false;
    first.addEventListener('dispose', () => {
      disposed = true;
    });
    writeSegments(line, [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]);
    expect(line.geometry).not.toBe(first);
    expect(disposed).toBe(true);
    expect(buffer(line.geometry).data.array).toHaveLength(12);
  });
});

describe('setSegments', () => {
  it('switches the material too, which drei hides along with the line for `visible={false}`', () => {
    const line = new LineSegments2();
    line.visible = line.material.visible = false;
    setSegments(line, [0, 0, 0, 1, 0, 0]);
    expect([line.visible, line.material.visible]).toEqual([true, true]);
    setSegments(line, []);
    expect([line.visible, line.material.visible]).toEqual([false, false]);
  });
});
