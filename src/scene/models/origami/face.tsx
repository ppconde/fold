import { BufferAttribute, DoubleSide, Float32BufferAttribute } from 'three';
import { IOrigamiCoordinates } from './origami-types';

interface FaceProps {
  points: number[][];
  names: string[];
  origamiCoordinates: IOrigamiCoordinates;
}

export const Face = ({ points, names, origamiCoordinates }: FaceProps) => {
  const { vertices, indices } = names.reduce(
    (acc, point, i) => {
      acc.vertices.push(...origamiCoordinates.points[point]);
      if (i > 1) {
        acc.indices.push(0, i - 1, i);
      }
      return acc;
    },
    { vertices: [] as number[], indices: [] as number[] }
  );

  return (
    <mesh name="Face">
      <bufferGeometry
        attributes-position={new Float32BufferAttribute(vertices, 3)}
        index={new BufferAttribute(new Uint16Array(indices), 1)}
      />
      <meshStandardMaterial color={0xff0000} side={DoubleSide} wireframe />
    </mesh>
  );
};
