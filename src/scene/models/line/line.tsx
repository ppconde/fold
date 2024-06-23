import { useMemo } from 'react';
import * as THREE from 'three';
import { LineProps } from './line.types';

export const Line = ({ from, to }: LineProps) => {
  const { position, rotation, height } = useMemo(() => {
    const fromVec = new THREE.Vector3(...from);
    const toVec = new THREE.Vector3(...to);

    // Calculate the midpoint
    const midpoint = new THREE.Vector3().addVectors(fromVec, toVec).multiplyScalar(0.5);

    // Calculate the height (distance between from and to)
    const height = fromVec.distanceTo(toVec);

    // Calculate the direction vector
    const direction = new THREE.Vector3().subVectors(toVec, fromVec).normalize();

    // Calculate the rotation quaternion
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    // Convert quaternion to Euler angles for rotation
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);

    return { position: midpoint, rotation, height };
  }, [from, to]);

  return (
    <mesh rotation={rotation} position={position}>
      {/* radiusTop, radiusBottom, height, radialSegments */}
      <cylinderGeometry args={[0.02, 0.02, height, 3]} />
      <meshBasicMaterial color="#36454F" />
    </mesh>
  );
};
