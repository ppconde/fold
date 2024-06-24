import { Face } from '../face/face';
import { MathHelpers } from '../_origami/math-helpers';
import { OrigamiSolver } from '../_origami/origami-solver';
import { OrigamiProps } from './origami.types';

export const Origami = (props: OrigamiProps) => {
  const { instructions } = props;
  const foldInstructions = instructions.split('\n');
  const instructionMaxId = 6;
  const foldInstructionsSelection = MathHelpers.indexArray(foldInstructions, [...Array(instructionMaxId + 1).keys()]);
  const [origamiCoordinates, faceInstructions, lineInstructions] =
    OrigamiSolver.solveOrigami(foldInstructionsSelection);

  // return points.map((face, index) => <Face key={index} name={pointNames[index]} points={face} />);

  return (
    <group name="Origami">
      {origamiCoordinates.faces.map((face) => {
        const points = face.map((point) => ({ name: point, position: origamiCoordinates.points[point] }));

        return (
          <Face
            key={points.flatMap((point) => point.name).join()}
            points={points}
            origamiCoordinates={origamiCoordinates}
          />
        );
      })}
    </group>
  );
};
