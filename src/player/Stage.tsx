import { CameraControls, ContactShadows } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import type { Model } from '../fold/types';
import { useT } from '../i18n/LanguageProvider';
import { prefersReducedMotion } from './browser';
import { Paper } from './Paper';
import { endCentre, frameReach, paperExtent } from './paper-geometry';

/** Vertical field of view in degrees, and the camera's angle from straight down, in radians. */
const FOV = 35;
const POLAR = 0.9;
/** Room left around the paper's furthest reach. */
const MARGIN = 1.08;

type Props = { model: Model; step: number; t: number; resetCount: number; frameStep: number };

export function Stage(props: Props) {
  const t = useT();
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.01, far: 100, position: [0, 2, 2] }}
      gl={{ alpha: true }}
      role="img"
      aria-label={t.player.stageLabel}
    >
      <Scene {...props} />
    </Canvas>
  );
}

function Scene({ model, step, t, resetCount, frameStep }: Props) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null);
  const firstFrame = useRef(true);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const { size } = paperExtent(model);
  // frameStep is the last settled step, so the camera never moves while a step plays
  const [cx, cz] = useMemo(() => endCentre(model, frameStep), [model, frameStep]);
  const reach = useMemo(() => frameReach(model, frameStep), [model, frameStep]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetCount is a trigger, not a value
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const animate = !firstFrame.current && !prefersReducedMotion();
    firstFrame.current = false;
    // far enough that a ball holding the paper through this step and the next fits the narrower side
    const half = (FOV / 2) * (Math.PI / 180);
    const d = (reach * MARGIN) / Math.sin(Math.min(half, Math.atan(Math.tan(half) * aspect)));
    void c.setLookAt(cx, d * Math.cos(POLAR), cz + d * Math.sin(POLAR), cx, 0, cz, animate);
  }, [cx, cz, reach, aspect, resetCount]);

  return (
    <>
      <hemisphereLight args={['#fffaf0', '#e6dccb', 1.1]} />
      <directionalLight position={[-2, 4, 3]} intensity={1.6} color="#fff4e6" />
      <directionalLight position={[3, 2, -2]} intensity={0.45} />
      <Paper model={model} step={step} t={t} />
      <ContactShadows position={[0, -0.002, 0]} scale={size * 3} blur={3.2} opacity={0.25} color="#5b4a3a" far={size} />
      <CameraControls ref={controls} makeDefault minDistance={size * 0.4} maxDistance={size * 6} />
    </>
  );
}
