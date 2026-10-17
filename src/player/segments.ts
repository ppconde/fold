import type { InterleavedBufferAttribute } from 'three';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

/**
 * Write segment end points (x, y, z per point, two points per segment) into a fat line's geometry.
 * While the segment count stays the same (every frame of one step) the existing buffer is reused;
 * setPositions would allocate a new one each frame.
 * When the count changes the line gets a new geometry: three caches a geometry's instance count the
 * first time it draws it, so a grown buffer on the old one would only ever draw its first segments.
 */
export function writeSegments(line: { geometry: LineSegmentsGeometry }, points: number[]) {
  const geometry = line.geometry;
  const start = geometry.getAttribute('instanceStart') as InterleavedBufferAttribute | undefined;
  if (start?.data.array.length !== points.length) {
    line.geometry = new LineSegmentsGeometry().setPositions(points);
    geometry.dispose();
    return;
  }
  (start.data.array as Float32Array).set(points);
  start.data.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

/** Show a fat line with these segments, or hide it when there are none. */
export function setSegments(
  line: { visible: boolean; material: { visible: boolean }; geometry: LineSegmentsGeometry } | null,
  points: number[]
) {
  if (!line) return;
  // drei hands `visible={false}` to the material as well, and three skips a hidden material, so switch both
  line.visible = line.material.visible = points.length > 0;
  if (points.length) writeSegments(line, points);
}
