import type { InterleavedBufferAttribute } from 'three';
import type { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';

/**
 * Write segment end points (x, y, z per point, two points per segment) into a fat-line geometry.
 * While the segment count stays the same (every frame of one step) the existing buffer is reused;
 * setPositions would allocate a new one each frame.
 */
export function writeSegments(geometry: LineSegmentsGeometry, points: number[]) {
  const start = geometry.getAttribute('instanceStart') as InterleavedBufferAttribute | undefined;
  if (start?.data.array.length !== points.length) {
    geometry.setPositions(points);
    return;
  }
  (start.data.array as Float32Array).set(points);
  start.data.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}
