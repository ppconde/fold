import { CameraControls, CameraControlsImpl, ContactShadows } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import type { Model } from '../fold/types';
import { useT } from '../i18n/LanguageProvider';
import { prefersReducedMotion } from './browser';
import { Paper } from './Paper';
import { endCentre, frameReach, paperExtent, STAGE_FOV, STAGE_POLAR, stageDistance } from './paper-geometry';

/** Zoom per wheel notch or pinch, against camera-controls' default of 1. */
const ZOOM_SPEED = 2;

/**
 * The canvas renders on demand, so the first frame after a pause reports the whole pause as its delta, and
 * the camera would cover most of a reframe in that one frame. Capped, it eases from where it was.
 */
class SteadyControls extends CameraControlsImpl {
  override update(delta: number) {
    return super.update(Math.min(delta, 1 / 30));
  }
}

type Props = { model: Model; step: number; t: number; playing: boolean; resetCount: number; frameStep: number };

export function Stage(props: Props) {
  const t = useT();
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      // a tight near/far keeps stacked layers (LAYER_GAP apart) from z-fighting into stripes on phones'
      // coarser depth buffers, where the narrow view also sits the camera twice as far back
      camera={{ fov: STAGE_FOV, near: 0.1, far: 20, position: [0, 2, 2] }}
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
  const ground = useRef<Group>(null);
  const firstFrame = useRef(true);
  /** The step and recentre count last framed, and whether the reader has moved the camera since. */
  const framed = useRef({ frameStep, resetCount, moved: false });
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
    // replaying a step (or playing it back) leaves a camera the reader has moved where they put it
    const last = framed.current;
    if (last.moved && last.frameStep === frameStep && last.resetCount === resetCount && step === frameStep) return;
    framed.current = { frameStep, resetCount, moved: false };
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
      <Paper model={model} step={step} t={t} ground={ground} />
      <group ref={ground}>
        <ContactShadows
          position={[0, -0.002, 0]}
          scale={size * 3}
          blur={3.2}
          opacity={0.25}
          color="#5b4a3a"
          far={size}
        />
      </group>
      <CameraControls
        ref={controls}
        impl={SteadyControls}
        makeDefault
        minDistance={size * 0.4}
        maxDistance={size * 6}
        dollySpeed={ZOOM_SPEED}
        // `control`, not `controlstart`: the wheel only sends the former
        onControl={() => {
          framed.current.moved = true;
        }}
      />
    </>
  );
}
