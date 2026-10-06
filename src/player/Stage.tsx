import { CameraControls, ContactShadows } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import type { Model } from '../fold/types';
import { useT } from '../i18n/LanguageProvider';
import { prefersReducedMotion } from './browser';
import { Paper } from './Paper';
import { endCentre, paperExtent } from './paper-geometry';

/** Camera distance in paper sizes, and its angle from straight down, in radians. */
const FRAME = 1.8;
const POLAR = 0.9;

type Props = { model: Model; step: number; t: number; resetCount: number; frameStep: number };

export function Stage(props: Props) {
  const t = useT();
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 35, near: 0.01, far: 100, position: [0, 2, 2] }}
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetCount is a trigger, not a value
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const animate = !firstFrame.current && !prefersReducedMotion();
    firstFrame.current = false;
    // pull back on narrow screens so the paper fits the width, not just the height
    const d = (size * FRAME) / Math.min(1, aspect / 1.1);
    void c.setLookAt(cx, d * Math.cos(POLAR), cz + d * Math.sin(POLAR), cx, 0, cz, animate);
  }, [cx, cz, size, aspect, resetCount]);

  return (
    <>
      <hemisphereLight args={['#fffaf0', '#e9e1d1', 0.9]} />
      <directionalLight position={[-2, 4, 3]} intensity={2.2} />
      <directionalLight position={[3, 2, -2]} intensity={0.6} />
      <Paper model={model} step={step} t={t} />
      <ContactShadows position={[0, -0.002, 0]} scale={size * 3} blur={2.5} opacity={0.35} far={size} />
      <CameraControls ref={controls} makeDefault minDistance={size * 0.4} maxDistance={size * 6} />
    </>
  );
}
