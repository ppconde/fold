import { Line } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { type ComponentRef, type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BackSide, BufferAttribute, BufferGeometry, FrontSide, type Group } from 'three';
import { foldedPositions, landingAt, progress } from '../fold/fold';
import { arrowOpacity, ghostFaces, tuckArrow } from '../fold/reverse';
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
import { patternHooks } from './paper-material';
import { PLAIN, paperById } from './papers';
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

/**
 * `ground`: the table's shadow, lowered while a flap swings below the table so the paper never passes through it.
 * `paper`: a booklet paper id printed on the front face, or Plain (the model's own colour).
 */
export function Paper({
  model,
  step,
  t,
  paper = PLAIN,
  ground
}: {
  model: Model;
  step: number;
  t: number;
  paper?: string;
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
  // an ivory edge under the creases, so they still read on dark patterns and on the ivory back
  const bordersHalo = useRef<LineRef>(null);
  const foldedHalo = useRef<LineRef>(null);
  const pattern = paperById(paper);
  // which flap a reverse fold moves and where it tucks in, an ink stroke like the dock's chevrons
  const tuck = useMemo(() => tuckArrow(model, step), [model, step]);
  const tuckStrength = tuck ? arrowOpacity(progress(t), landingAt(model, step)) : 0;
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
    setSegments(bordersHalo.current, pattern ? groups.borders : []);
    setSegments(foldedHalo.current, pattern ? groups.folded : []);
    invalidate();
  }, [model, step, t, geometry, invalidate, ground, pattern]);

  useEffect(() => () => washi.dispose(), [washi]);

  useEffect(
    () => () => {
      geometry.dispose();
    },
    [geometry]
  );

  // setSegments swaps in geometries drei didn't make, so it won't dispose them
  useEffect(
    () => () => {
      for (const line of [borders, folded, flat, active, cut]) line.current?.geometry.dispose();
    },
    []
  );

  // Paper coordinates are x/y with valley folds toward +z; turn them so the sheet lies on the table (y up).
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <group position={[-center[0], -center[1], 0]}>
        {[
          // white under a pattern: the pattern brings its own colours and the washi map still multiplies them
          { color: pattern ? '#ffffff' : softenTowardIvory(model.paperColor), side: FrontSide, hooks: pattern },
          { color: BACK, side: BackSide, hooks: undefined }
        ].map(({ color, side, hooks }) => (
          <mesh key={side} geometry={geometry}>
            {[1, GHOST_OPACITY].map((opacity, i) => (
              <meshStandardMaterial
                // a new material per paper; ponytail: the first switch to a paper compiles its program (about a
                // frame), one shared program with a pattern-index uniform if that hitch ever shows
                key={`${opacity}:${hooks?.id ?? 'plain'}`}
                {...(hooks && patternHooks(hooks))}
                attach={`material-${i}`}
                color={color}
                roughness={0.92}
                metalness={0}
                map={washi}
                side={side}
                transparent={opacity < 1}
                opacity={opacity}
                depthWrite={opacity === 1}
                // pushes the paper back far enough that crease lines (flat-depth screen quads) don't sink into sloped faces
                polygonOffset
                polygonOffsetFactor={4}
                polygonOffsetUnits={4}
              />
            ))}
          </mesh>
        ))}
        <Line
          ref={bordersHalo}
          points={borderPoints}
          segments
          color={BACK}
          lineWidth={3.3}
          renderOrder={-1}
          visible={false}
        />
        <Line
          ref={foldedHalo}
          points={PLACEHOLDER}
          segments
          color={BACK}
          lineWidth={2.6}
          renderOrder={-1}
          visible={false}
        />
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
        {tuck &&
          tuckStrength > 0 &&
          [tuck.shaft, [tuck.head[0], tuck.shaft[tuck.shaft.length - 1], tuck.head[1]]].map((points) => (
            <Line
              key={points.length}
              points={points}
              color={INK}
              lineWidth={1.4}
              transparent
              opacity={tuckStrength}
              renderOrder={3}
              depthTest={false}
            />
          ))}
      </group>
    </group>
  );
}
