import { CameraControls, ContactShadows } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { type ComponentRef, useEffect, useMemo, useRef } from 'react';
import { Box3, Vector3 } from 'three';
import type { Model } from '../fold/types';
import { Paper } from './Paper';
import { paperExtent } from './paper-geometry';

type Props = { model: Model; step: number; t: number; resetCount: number };

export function Stage(props: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 35, near: 0.01, far: 100, position: [0, 2, 2] }}
      role="img"
      aria-label="3D view of the paper. Drag to turn it, pinch or scroll to zoom."
    >
      <Scene {...props} />
    </Canvas>
  );
}

function Scene({ model, step, t, resetCount }: Props) {
  const controls = useRef<ComponentRef<typeof CameraControls>>(null);
  const { size, width, height } = paperExtent(model);
  const box = useMemo(
    () => new Box3(new Vector3(-width / 2, 0, -height / 2), new Vector3(width / 2, size * 0.25, height / 2)),
    [width, height, size]
  );

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const animate = resetCount > 0;
    void c.setLookAt(0, size * 1.7, size * 1.3, 0, 0, 0, false);
    void c.fitToBox(box, animate, { paddingTop: 0.15, paddingBottom: 0.15, paddingLeft: 0.15, paddingRight: 0.15 });
    void c.rotateTo(0, 0.9, animate);
  }, [box, size, resetCount]);

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
