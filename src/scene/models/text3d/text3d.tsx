import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import { Vector3 } from 'three';
import { Text3DProps } from './text3d.types';

export const Text3D = ({ name, position, visible = true }: Text3DProps) => {
  const { camera } = useThree();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef(null) as any;

  // Calculate the shifted position using useMemo
  const shiftedPosition = useMemo(() => {
    return new Vector3(position[0] - 0.2, position[1] - 0.2, position[2]);
  }, [position]);

  useFrame(() => {
    if (ref.current) {
      ref.current.lookAt(camera.position);
    }
  });

  return (
    <Text ref={ref} name={name} scale={0.5} position={shiftedPosition} visible={visible}>
      {name}
      <meshBasicMaterial color="#36454F" depthTest={false} />
    </Text>
  );
};
