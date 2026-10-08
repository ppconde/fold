import { ContactShadows } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Group, MathUtils } from 'three';
import { foldedPositions } from '../fold/fold';
import type { Model, Vec3 } from '../fold/types';
import { Paper } from '../player/Paper';
import { frameReach, STAGE_FOV, STAGE_POLAR, stageDistance } from '../player/paper-geometry';

/** Pitch toward the viewer and yaw of the model at rest, in radians. */
const REST = [0.3, 0.1];
/** How far the model at rest sits above the middle: seen from above, a centred model looks low. */
const RAISE = 0.02;
/** How much larger the model at rest is drawn than its framing. */
const GROW = 0.15;
/** The camera, looking at the middle. */
const CAMERA: Vec3 = [0, 0.6, 3.3];
/** Pitch of the unfolded sheet that, seen from the camera, matches the lesson stage's view from above. */
const END_PITCH = Math.PI / 2 - STAGE_POLAR - Math.atan2(CAMERA[1], CAMERA[2]);

type Props = {
  /** A model of one step (see unfoldAll). */
  model: Model;
  /** How far folded: 1 the finished model, 0 the flat sheet. */
  at: number;
  /** 0 at rest, 1 once unfolded: the drift settles and the sheet turns to face the camera as the lesson's stage does. */
  settle: number;
  pointer: { x: number; y: number };
  still: boolean;
  label: string;
};

export function HomeScene(props: Props) {
  return (
    <Canvas
      frameloop={props.still ? 'demand' : 'always'}
      dpr={[1, 2]}
      gl={{ alpha: true }}
      camera={{ fov: STAGE_FOV, position: CAMERA }}
      role="img"
      aria-label={props.label}
    >
      <hemisphereLight args={['#fffaf0', '#e6dccb', 1.1]} />
      <directionalLight position={[1, 4, 4]} intensity={1.6} color="#fff4e6" />
      <directionalLight position={[3, 2, -2]} intensity={0.45} />
      <Folded {...props} />
      <ContactShadows position={[0, -0.7, 0]} scale={4} blur={3.2} opacity={0.22} far={2} color="#5b4a3a" />
    </Canvas>
  );
}

/** The paper's world centre and furthest reach from it at `t`, so it stays framed as it opens out. */
function framing(model: Model, t: number): { centre: number[]; reach: number } {
  const [cx, cy] = model.center;
  // Paper turns paper (x, y, z) into world (x − cx, z, −(y − cy))
  const points = foldedPositions(model, 1, t)
    .flat()
    .map(([x, y, z]) => [x - cx, z, cy - y]);
  const centre = [0, 1, 2].map((i) => {
    const vs = points.map((p) => p[i]);
    return (Math.min(...vs) + Math.max(...vs)) / 2;
  });
  const reach = Math.max(...points.map((p) => Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2])));
  return { centre, reach };
}

function Folded({ model, at, settle, pointer, still }: Props) {
  const group = useRef<Group>(null);
  const fit = useRef<Group>(null);
  const shift = useRef<Group>(null);
  const target = useMemo(() => framing(model, at), [model, at]);
  // the flat sheet ends where the lesson's stage first shows it: as far off as the stage would set it in this
  // view, or as the stage last did if that's further (its view may be narrower); the hand-off scales by the two
  const aspect = useThree((s) => s.size.width / s.size.height);
  const far = useMemo(() => {
    const stage = Number(getComputedStyle(document.documentElement).getPropertyValue('--paper-to')) || 0;
    return Math.max(stageDistance(aspect), stage);
  }, [aspect]);
  useEffect(() => document.documentElement.style.setProperty('--paper-from', String(far)), [far]);
  const flat = useMemo(() => Math.hypot(...CAMERA) / (far * frameReach(model, 0)), [far, model]);

  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (still) invalidate();
  }, [still, invalidate]);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    const f = fit.current;
    const p = shift.current;
    if (!g || !f || !p) return;
    // the framing follows the paper's size and centre gently, so the opening shape doesn't pump the zoom
    const scale = MathUtils.lerp((0.82 * (1 + GROW)) / target.reach, flat, settle);
    const [x, y, z] = target.centre.map((c) => -c);
    // eased, but exact once settled
    const ease = (from: number, to: number) =>
      still || !f.userData.framed ? to : MathUtils.lerp(MathUtils.damp(from, to, 5, delta), to, settle);
    f.scale.setScalar(ease(f.scale.x, scale));
    p.position.set(ease(p.position.x, x), ease(p.position.y, y), ease(p.position.z, z));
    f.userData.framed = true;
    if (still) return;
    const time = clock.elapsedTime;
    const drift = 1 - settle;
    const targetYaw =
      drift * (Math.sin((time / 7) * Math.PI * 2) * MathUtils.degToRad(6) + pointer.x * MathUtils.degToRad(10));
    const targetPitch = drift * pointer.y * MathUtils.degToRad(6);
    g.rotation.y = MathUtils.lerp(MathUtils.damp(g.rotation.y, targetYaw, 2.5, delta), 0, settle);
    g.rotation.x = MathUtils.lerp(MathUtils.damp(g.rotation.x, targetPitch, 2.5, delta), 0, settle);
    g.position.y = drift * Math.sin((time / 7) * Math.PI * 2) * 0.04;
  });

  return (
    <group ref={group}>
      {/* turned a little toward the viewer, so a model that lies flat still shows its face; once unfolded,
          seen as the lesson's stage sees it */}
      <group
        ref={fit}
        position={[0, RAISE * (1 - settle), 0]}
        rotation={[MathUtils.lerp(REST[0], END_PITCH, settle), MathUtils.lerp(REST[1], 0, settle), 0]}
      >
        <group ref={shift}>
          {/* once flat, the lesson's first step: no creases drawn yet */}
          <Paper model={model} step={at > 0 ? 1 : 0} t={at} />
        </group>
      </group>
    </group>
  );
}
