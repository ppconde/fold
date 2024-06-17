import { Face } from './face';
import { MathHelpers } from './math-helpers';
import { OrigamiSolver } from './origami-solver';

interface OrigamiProps {
  instructions: string;
}

export const Origami = (props: OrigamiProps) => {
  const { instructions } = props;
  const foldInstructions = instructions.split('\n');
  const instructionMaxId = 6;
  const foldInstructionsSelection = MathHelpers.indexArray(foldInstructions, [...Array(instructionMaxId + 1).keys()]);
  const [origamiCoordinates, faceInstructions, lineInstructions] =
    OrigamiSolver.solveOrigami(foldInstructionsSelection);

  const points = origamiCoordinates.faces.map((face) => face.map((point) => origamiCoordinates.pattern[point]));
  const faceNames = origamiCoordinates.faces.map((face) => face.map((point) => point));

  // return points.map((face, index) => <Face key={index} name={faceNames[index]} points={face} />);

  return (
    <group name="Origami">
      {origamiCoordinates.faces.map((face, i) => {
        const points = face.map((point) => origamiCoordinates.pattern[point]);
        return (
          <Face
            key={faceNames[i].join()}
            names={faceNames[i]}
            points={points}
            origamiCoordinates={origamiCoordinates}
          />
        );
      })}
    </group>
  );
};
