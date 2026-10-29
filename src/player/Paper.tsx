import { Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { type ComponentRef, type RefObject, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BackSide, BufferAttribute, BufferGeometry, DoubleSide, FrontSide, type Group, Vector3 } from 'three';
import { foldedPositions, progress } from '../fold/fold';
import { arrowOpacity, isReverseFold, pushArrows, pushOpacity, tuckArrow } from '../fold/reverse';
import type { Model, Vec3 } from '../fold/types';
import {
  dashDot,
  depthBelowTable,
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
 * `highlight`: the step's creases in the highlight colour; false draws them in ink, as a finished model.
 */
export function Paper({
  model,
  step,
  t,
  paper = PLAIN,
  ground,
  highlight = true
}: {
  model: Model;
  step: number;
  t: number;
  paper?: string;
  ground?: RefObject<Group | null>;
  highlight?: boolean;
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
  const activeHalo = useRef<LineRef>(null);
  const cutHalo = useRef<LineRef>(null);
  const pattern = paperById(paper);
  // which flap a reverse fold moves and where it tucks in, an ink arrow with a filled head, as a diagram's
  const tuck = useMemo(() => tuckArrow(model, step), [model, step]);
  const tuckStrength = tuck ? arrowOpacity(progress(t)) : 0;
  const head = useMemo(() => {
    if (!tuck) return null;
    const g = new BufferGeometry();
    const end = tuck.shaft[tuck.shaft.length - 1];
    g.setAttribute('position', new BufferAttribute(new Float32Array([...tuck.head[0], ...end, ...tuck.head[1]]), 3));
    return g;
  }, [tuck]);
  useEffect(() => () => head?.dispose(), [head]);
  const pushes = useMemo(() => pushArrows(model, step) ?? [], [model, step]);
  const pushStrength = pushes.length ? pushOpacity(progress(t)) : 0;
  // only the push mark on the camera's side of the paper, as a diagram draws one
  const pushMarks = useRef<(Group | null)[]>([]);
  useFrame(({ camera }) => {
    pushes.forEach(({ outline, facing }, i) => {
      const mark = pushMarks.current[i];
      if (!mark) return;
      const at = mark.localToWorld(new Vector3(...outline[0]));
      const out = mark.localToWorld(new Vector3(...outline[0]).add(new Vector3(...facing))).sub(at);
      mark.visible = camera.position.clone().sub(at).dot(out) > 0;
    });
  });
  // filled with the paper's back, as a book leaves a hollow arrow white, so the lines under it don't show through
  const pushFills = useMemo(
    () =>
      pushes.map(({ outline }) => {
        const g = new BufferGeometry();
        g.setAttribute(
          'position',
          new BufferAttribute(new Float32Array([0, 1, 6, 2, 3, 4, 2, 4, 5].flatMap((k) => outline[k])), 3)
        );
        return g;
      }),
    [pushes]
  );
  useEffect(
    () => () => {
      for (const g of pushFills) g.dispose();
    },
    [pushFills]
  );
  // a reverse fold's line is a mountain fold: dash-dot, as the crease diagram draws it
  const dashUnit = useMemo(() => (isReverseFold(model, step) ? 0.0025 * paperExtent(model).size : 0), [model, step]);
  const { center } = paperExtent(model);

  useLayoutEffect(() => {
    const faces = foldedPositions(model, step, t);
    if (ground?.current) ground.current.position.y = -depthBelowTable(faces);
    const position = geometry.getAttribute('position') as BufferAttribute;
    fillTriangles(faces, position.array as Float32Array);
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    const groups = lineGroups(model, faces, step, t, highlight);
    setSegments(borders.current, groups.borders);
    setSegments(folded.current, groups.folded);
    setSegments(flat.current, groups.flat);
    const activeLines = dashUnit ? dashDot(groups.active, dashUnit) : groups.active;
    setSegments(active.current, activeLines);
    setSegments(cut.current, groups.cut);
    setSegments(bordersHalo.current, pattern ? groups.borders : []);
    setSegments(foldedHalo.current, pattern ? groups.folded : []);
    setSegments(activeHalo.current, pattern ? activeLines : []);
    setSegments(cutHalo.current, pattern ? groups.cut : []);
    invalidate();
  }, [model, step, t, geometry, invalidate, ground, pattern, highlight, dashUnit]);

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
            <meshStandardMaterial
              // a new material per paper; ponytail: the first switch to a paper compiles its program (about a
              // frame), one shared program with a pattern-index uniform if that hitch ever shows
              key={hooks?.id ?? 'plain'}
              {...(hooks && patternHooks(hooks))}
              color={color}
              roughness={0.92}
              metalness={0}
              map={washi}
              side={side}
              // pushes the paper back far enough that crease lines (flat-depth screen quads) don't sink into sloped faces
              polygonOffset
              polygonOffsetFactor={4}
              polygonOffsetUnits={4}
            />
          </mesh>
        ))}
        {/* after the paper and without depth, so the ink lines (drawn next) always sit on top of the halo */}
        <Line
          ref={bordersHalo}
          points={borderPoints}
          segments
          color={BACK}
          lineWidth={3.3}
          renderOrder={0.5}
          depthWrite={false}
          visible={false}
        />
        <Line
          ref={foldedHalo}
          points={PLACEHOLDER}
          segments
          color={BACK}
          lineWidth={2.6}
          renderOrder={0.5}
          depthWrite={false}
          visible={false}
        />
        <Line ref={borders} points={borderPoints} segments color={INK} lineWidth={1.7} renderOrder={0.6} />
        <Line
          ref={folded}
          points={PLACEHOLDER}
          segments
          color={INK}
          lineWidth={1.0}
          renderOrder={0.6}
          visible={false}
        />
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
          ref={activeHalo}
          points={PLACEHOLDER}
          segments
          color={BACK}
          lineWidth={3.4}
          renderOrder={0.9}
          depthWrite={false}
          frustumCulled={false}
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
          ref={cutHalo}
          points={PLACEHOLDER}
          segments
          color={BACK}
          lineWidth={4.2}
          renderOrder={1.9}
          depthTest={false}
          frustumCulled={false}
          visible={false}
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
          tuckStrength > 0 && [
            pattern && (
              <Line
                key="halo"
                points={tuck.shaft}
                color={BACK}
                lineWidth={3}
                transparent
                opacity={tuckStrength}
                renderOrder={2.9}
                depthTest={false}
              />
            ),
            <Line
              key="shaft"
              points={tuck.shaft}
              color={INK}
              lineWidth={1.4}
              transparent
              opacity={tuckStrength}
              renderOrder={3}
              depthTest={false}
            />,
            head && (
              <mesh key="head" geometry={head} renderOrder={3}>
                <meshBasicMaterial color={INK} side={DoubleSide} transparent opacity={tuckStrength} depthTest={false} />
              </mesh>
            )
          ]}
        {pushStrength > 0 &&
          pushes.map(({ outline }, i) => (
            <group
              key={outline.join()}
              ref={(mark) => {
                pushMarks.current[i] = mark;
              }}
            >
              <mesh geometry={pushFills[i]} renderOrder={2.95}>
                <meshBasicMaterial
                  color={BACK}
                  side={DoubleSide}
                  transparent
                  opacity={pushStrength}
                  depthTest={false}
                />
              </mesh>
              <Line
                points={outline}
                color={INK}
                lineWidth={1.4}
                transparent
                opacity={pushStrength}
                renderOrder={3}
                depthTest={false}
              />
            </group>
          ))}
      </group>
    </group>
  );
}
