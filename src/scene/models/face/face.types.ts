import { IOrigamiCoordinates } from '../_origami/origami.types';

export interface Point {
  name: string;
  position: number[];
}

export interface FaceProps {
  points: Point[];
  origamiCoordinates: IOrigamiCoordinates;
}
