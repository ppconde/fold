import { Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BackSide, BufferAttribute, BufferGeometry, DataTexture, FrontSide, NearestFilter, RedFormat } from 'three';
import { foldedPositions } from '../fold/fold';
import type { Model, Vec3 } from '../fold/types';
import { readTextScale } from '../shell/text-scale';
import { fillTriangles, lineGroups, paperExtent, triangleCount } from './paper-geometry';

type LineRef = ComponentRef<typeof Line>;

const INK = '#2B2A28';
const BACK = '#FBF9F4';
const PLACEHOLDER: Vec3[] = [
  [0, 0, 0],
  [0, 0, 0]
];

/** Three flat tones for cel shading. */
function toonGradient(): DataTexture {
  const texture = new DataTexture(new Uint8Array([110, 185, 255]), 3, 1, RedFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function setSegments(line: LineRef | null, points: number[]) {
  if (!line) return;
  line.visible = points.length > 0;
  if (points.length) line.geometry.setPositions(points);
}

const toPoints = (flat: number[]): Vec3[] =>
  flat.length
    ? Array.from({ length: flat.length / 3 }, (_, i) => [flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]])
    : PLACEHOLDER;

export function Paper({ model, step, t }: { model: Model; step: number; t: number }) {
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(triangleCount(model) * 9), 3));
    return g;
  }, [model]);
  const gradient = useMemo(toonGradient, []);
  const initial = useMemo(() => lineGroups(model, foldedPositions(model, 0, 0), 0, 0), [model]);
  const borderPoints = useMemo(() => toPoints(initial.borders), [initial]);
  const borders = useRef<LineRef>(null);
  const folded = useRef<LineRef>(null);
  const flat = useRef<LineRef>(null);
  const scale = readTextScale();
  const { center } = paperExtent(model);

  useLayoutEffect(() => {
    const faces = foldedPositions(model, step, t);
    const position = geometry.getAttribute('position') as BufferAttribute;
    fillTriangles(faces, position.array as Float32Array);
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const groups = lineGroups(model, faces, step, t);
    setSegments(borders.current, groups.borders);
    setSegments(folded.current, groups.folded);
    setSegments(flat.current, groups.flat);
    invalidate();
  }, [model, step, t, geometry, invalidate]);

  useEffect(() => () => gradient.dispose(), [gradient]);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry]
  );

  // Paper coordinates are x/y with valley folds toward +z; turn them so the sheet lies on the table (y up).
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <group position={[-center[0], -center[1], 0]}>
        <mesh geometry={geometry}>
          <meshToonMaterial
            color={model.paperColor}
            gradientMap={gradient}
            side={FrontSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
        <mesh geometry={geometry}>
          <meshToonMaterial
            color={BACK}
            gradientMap={gradient}
            side={BackSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
        <Line ref={borders} points={borderPoints} segments color={INK} lineWidth={2.5 * scale} />
        <Line ref={folded} points={PLACEHOLDER} segments color={INK} lineWidth={1.5 * scale} visible={false} />
        <Line
          ref={flat}
          points={PLACEHOLDER}
          segments
          color={INK}
          lineWidth={1 * scale}
          transparent
          opacity={0.35}
          visible={false}
        />
      </group>
    </group>
  );
}
