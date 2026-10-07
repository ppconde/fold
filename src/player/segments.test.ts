import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { describe, expect, it } from 'vitest';
import { writeSegments } from './segments';

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
