import { useMemo } from 'react';
import { BufferAttribute, DoubleSide, Float32BufferAttribute } from 'three';
import { Text3D } from '../text3d/text3d';
import { Line } from '../line/line';
import { CircularArray } from '../../../core/circular-array';
import { FaceProps } from './face.types';

/**
 * Represents a face in an origami model.
 *
 * @param points - The points that make up the face.
 * @param origamiCoordinates - The origami coordinates for the face.
 * @returns The rendered face component.
 */
export const Face = ({ points, origamiCoordinates }: FaceProps) => {
  /**
   * Memoized calculation of vertices and indices for the face geometry.
   */
  const { position, indicesAttr, circularArrPoints } = useMemo(() => {
    const names = points.flatMap((point) => point.name);
    const { vertices, indices } = names.reduce(
      (acc, point, i) => {
        acc.vertices.push(...origamiCoordinates.points[point]);
        if (i > 1) acc.indices.push(0, i - 1, i);
        return acc;
      },
      { vertices: [] as number[], indices: [] as number[] }
    );

    return {
      position: new Float32BufferAttribute(vertices, 3),
      indicesAttr: new BufferAttribute(new Uint16Array(indices), 1),
      circularArrPoints: new CircularArray(...points)
    };
  }, [points, origamiCoordinates]);

  return (
    <group name="Face">
      {points.map((point) => (
        <Text3D key={point.name} name={point.name} position={point.position} />
      ))}
      {circularArrPoints.map((point, nextPoint) => (
        <Line key={`${point.name}`} from={point.position} to={nextPoint.position} />
      ))}
      <mesh name="Plane">
        <bufferGeometry attributes-position={position} index={indicesAttr} />
        <meshStandardMaterial color={0xff0000} side={DoubleSide} />
      </mesh>
    </group>
  );
};
