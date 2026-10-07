import { ContactShadows, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { type Group, MathUtils, Mesh, MeshStandardMaterial } from 'three';
import { createWashiTexture } from '../player/washi';

type Props = { pointer: { x: number; y: number }; entering: boolean; still: boolean; label: string };

const URL = '/models/crane/scene.gltf';

export function CraneScene(props: Props) {
  return (
    <Canvas
      frameloop={props.still ? 'demand' : 'always'}
      dpr={[1, 2]}
      gl={{ alpha: true }}
      camera={{ fov: 30, position: [0, 0.6, 4.2] }}
      role="img"
      aria-label={props.label}
    >
      <hemisphereLight args={['#fffaf0', '#e6dccb', 1.1]} />
      <directionalLight position={[-2, 4, 3]} intensity={1.6} color="#fff4e6" />
      <directionalLight position={[3, 2, -2]} intensity={0.45} />
      <Crane {...props} />
      <ContactShadows position={[0, -0.7, 0]} scale={4} blur={3.2} opacity={0.22} far={2} color="#5b4a3a" />
    </Canvas>
  );
}

function Crane({ pointer, entering, still }: Props) {
  const { scene } = useGLTF(URL);
  const group = useRef<Group>(null);
  const washi = useMemo(createWashiTexture, []);
  const crane = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const name = Array.isArray(o.material) ? o.material[0]?.name : o.material?.name;
      if (name === 'Sombra')
        o.visible = false; // the asset's baked shadow plane; ContactShadows replaces it
      else o.material = new MeshStandardMaterial({ color: '#efe7da', roughness: 0.92, metalness: 0, map: washi });
    });
    return copy;
  }, [scene, washi]);
  useEffect(() => () => washi.dispose(), [washi]);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (still) invalidate();
  }, [still, invalidate]);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g || still) return;
    const t = clock.elapsedTime;
    const targetYaw = Math.sin((t / 7) * Math.PI * 2) * MathUtils.degToRad(6) + pointer.x * MathUtils.degToRad(10);
    const targetPitch = pointer.y * MathUtils.degToRad(6);
    g.rotation.y = MathUtils.damp(g.rotation.y, targetYaw, 2.5, delta);
    g.rotation.x = MathUtils.damp(g.rotation.x, targetPitch, 2.5, delta);
    g.position.y = Math.sin((t / 7) * Math.PI * 2) * 0.04;
    g.position.z = MathUtils.damp(g.position.z, entering ? 1.4 : 0, 3, delta);
  });

  return (
    <group ref={group} dispose={null}>
      <group scale={0.62} position={[-0.1, -0.1, 0]} rotation={[0, -0.75, 0]}>
        <primitive object={crane} />
      </group>
    </group>
  );
}

useGLTF.preload(URL);
