import { Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BackSide, BufferAttribute, BufferGeometry, FrontSide } from 'three';
import { foldedPositions } from '../fold/fold';
import type { Model, Vec3 } from '../fold/types';
import { fillTriangles, fillUVs, lineGroups, paperExtent, triangleCount } from './paper-geometry';
import { writeSegments } from './segments';
import { createWashiTexture, softenTowardIvory } from './washi';

type LineRef = ComponentRef<typeof Line>;

const INK = '#33302C';
const HIGHLIGHT = '#A5633F';
const BACK = '#F3EDE2';
const PLACEHOLDER: Vec3[] = [
  [0, 0, 0],
  [0, 0, 0]
];

function setSegments(line: LineRef | null, points: number[]) {
  if (!line) return;
  line.visible = points.length > 0;
  if (points.length) writeSegments(line.geometry, points);
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
    const uv = new Float32Array(triangleCount(model) * 6);
    fillUVs(model, uv);
    g.setAttribute('uv', new BufferAttribute(uv, 2));
    return g;
  }, [model]);
  const washi = useMemo(createWashiTexture, []);
  const initial = useMemo(() => lineGroups(model, foldedPositions(model, 0, 0), 0, 0), [model]);
  const borderPoints = useMemo(() => toPoints(initial.borders), [initial]);
  const borders = useRef<LineRef>(null);
  const folded = useRef<LineRef>(null);
  const flat = useRef<LineRef>(null);
  const active = useRef<LineRef>(null);
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
    setSegments(active.current, groups.active);
    invalidate();
  }, [model, step, t, geometry, invalidate]);

  useEffect(() => () => washi.dispose(), [washi]);

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
          <meshStandardMaterial
            color={softenTowardIvory(model.paperColor)}
            roughness={0.92}
            metalness={0}
            map={washi}
            side={FrontSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={BACK}
            roughness={0.92}
            metalness={0}
            map={washi}
            side={BackSide}
            polygonOffset
            polygonOffsetFactor={1}
            polygonOffsetUnits={1}
          />
        </mesh>
        <Line ref={borders} points={borderPoints} segments color={INK} lineWidth={1.7} />
        <Line ref={folded} points={PLACEHOLDER} segments color={INK} lineWidth={1.0} visible={false} />
        <Line
          ref={flat}
          points={PLACEHOLDER}
          segments
          color={INK}
          lineWidth={0.7}
          transparent
          opacity={0.35}
          visible={false}
        />
        <Line
          ref={active}
          points={PLACEHOLDER}
          segments
          color={HIGHLIGHT}
          renderOrder={1}
          lineWidth={1.8}
          frustumCulled={false}
        />
      </group>
    </group>
  );
}
