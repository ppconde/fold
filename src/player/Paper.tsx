import { Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { type ComponentRef, type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BackSide, BufferAttribute, BufferGeometry, FrontSide, type Group } from 'three';
import { foldedPositions } from '../fold/fold';
import { ghostFaces } from '../fold/reverse';
import type { Model, Vec3 } from '../fold/types';
import {
  depthBelowTable,
  faceGroups,
  fillTriangles,
  fillUVs,
  lineGroups,
  paperExtent,
  triangleCount
} from './paper-geometry';
import { setSegments } from './segments';
import { createWashiTexture, softenTowardIvory } from './washi';

type LineRef = ComponentRef<typeof Line>;

const INK = '#33302C';
const HIGHLIGHT = '#A5633F';
const BACK = '#F3EDE2';
/** A reverse fold's flap, while it takes its shortcut through the body. */
const GHOST_OPACITY = 0.3;
const PLACEHOLDER: Vec3[] = [
  [0, 0, 0],
  [0, 0, 0]
];

const toPoints = (flat: number[]): Vec3[] =>
  flat.length
    ? Array.from({ length: flat.length / 3 }, (_, i) => [flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]])
    : PLACEHOLDER;

/** `ground`: the table's shadow, lowered while a flap swings below the table so the paper never passes through it. */
export function Paper({
  model,
  step,
  t,
  ground
}: {
  model: Model;
  step: number;
  t: number;
  ground?: RefObject<Group | null>;
}) {
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
  const cut = useRef<LineRef>(null);
  const { center } = paperExtent(model);

  useLayoutEffect(() => {
    const faces = foldedPositions(model, step, t);
    if (ground?.current) ground.current.position.y = -depthBelowTable(faces);
    const position = geometry.getAttribute('position') as BufferAttribute;
    fillTriangles(faces, position.array as Float32Array);
    position.needsUpdate = true;
    geometry.clearGroups();
    for (const g of faceGroups(model, ghostFaces(model, step, t))) geometry.addGroup(g.start, g.count, g.materialIndex);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const groups = lineGroups(model, faces, step, t);
    setSegments(borders.current, groups.borders);
    setSegments(folded.current, groups.folded);
    setSegments(flat.current, groups.flat);
    setSegments(active.current, groups.active);
    setSegments(cut.current, groups.cut);
    invalidate();
  }, [model, step, t, geometry, invalidate, ground]);

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
        {[
          { color: softenTowardIvory(model.paperColor), side: FrontSide },
          { color: BACK, side: BackSide }
        ].map(({ color, side }) => (
          <mesh key={side} geometry={geometry}>
            {[1, GHOST_OPACITY].map((opacity, i) => (
              <meshStandardMaterial
                key={opacity}
                attach={`material-${i}`}
                color={color}
                roughness={0.92}
                metalness={0}
                map={washi}
                side={side}
                transparent={opacity < 1}
                opacity={opacity}
                depthWrite={opacity === 1}
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
              />
            ))}
          </mesh>
        ))}
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
        <Line
          ref={cut}
          points={PLACEHOLDER}
          segments
          color={INK}
          lineWidth={2.6}
          renderOrder={2}
          depthTest={false}
          frustumCulled={false}
          visible={false}
        />
      </group>
    </group>
  );
}
