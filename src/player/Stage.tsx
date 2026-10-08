import { CameraControls, ContactShadows } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import type { Model } from '../fold/types';
import { useT } from '../i18n/LanguageProvider';
import { prefersReducedMotion } from './browser';
import { Paper } from './Paper';
import { endCentre, frameReach, paperExtent, STAGE_FOV, STAGE_POLAR, stageDistance } from './paper-geometry';

type Props = { model: Model; step: number; t: number; playing: boolean; resetCount: number; frameStep: number };

export function Stage(props: Props) {
  const t = useT();
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: STAGE_FOV, near: 0.01, far: 100, position: [0, 2, 2] }}
      gl={{ alpha: true }}
      role="img"
      aria-label={t.player.stageLabel}
    >
      <Scene {...props} />
    </Canvas>
  );
}

function Scene({ model, step, t, playing, resetCount, frameStep }: Props) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null);
  const firstFrame = useRef(true);
  const aspect = useThree((s) => s.size.width / s.size.height);
  const { size } = paperExtent(model);
  // frameStep is the last settled step, so the camera never moves while a step plays
  const [cx, cz] = useMemo(() => endCentre(model, frameStep), [model, frameStep]);
  // close in on the settled model; ease out to hold the whole step while it plays or is scrubbed
  const moving = playing || (step > 0 && t < 1);
  const reach = useMemo(
    () => frameReach(model, frameStep, moving ? step : undefined),
    [model, frameStep, moving, step]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: resetCount is a trigger, not a value
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const animate = !firstFrame.current && !prefersReducedMotion();
    firstFrame.current = false;
    // the homepage's sheet is handed over to this view (global.css, ::view-transition-old(paper))
    document.documentElement.style.setProperty('--paper-to', String(stageDistance(aspect)));
    const d = reach * stageDistance(aspect);
    void c.setLookAt(cx, d * Math.cos(STAGE_POLAR), cz + d * Math.sin(STAGE_POLAR), cx, 0, cz, animate);
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
