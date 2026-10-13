import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { describe, expect, it } from 'vitest';
import { setSegments, writeSegments } from './segments';

const buffer = (g: LineSegmentsGeometry) =>
  g.getAttribute('instanceStart') as unknown as { data: { array: Float32Array } };

describe('writeSegments', () => {
  it('reuses the buffer while the segment count stays the same', () => {
    const g = new LineSegmentsGeometry();
    writeSegments(g, [0, 0, 0, 1, 0, 0]);
    const first = buffer(g).data;
    writeSegments(g, [0, 0, 0, 0, 2, 0]);
    expect(buffer(g).data).toBe(first);
    expect([...buffer(g).data.array]).toEqual([0, 0, 0, 0, 2, 0]);
    expect(g.boundingSphere?.radius).toBeCloseTo(1);
  });

  it('allocates a new buffer when the count changes', () => {
    const g = new LineSegmentsGeometry();
    writeSegments(g, [0, 0, 0, 1, 0, 0]);
    const first = buffer(g).data;
    writeSegments(g, [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]);
    expect(buffer(g).data).not.toBe(first);
    expect(buffer(g).data.array).toHaveLength(12);
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
