import type { ModelSource } from '../build';
import basicShape1 from './basic-shape-1';
import basicShape2 from './basic-shape-2';
import blintzBase from './blintz-base';
import cicada from './cicada';
import crane from './crane';
import dogFace from './dog-face';
import dove from './dove';
import kannonBase from './kannon-base';
import kiteBase from './kite-base';
import paperPlane from './paper-plane';
import squareBase from './square-base';
import tulip from './tulip';
import whale from './whale';

/** Models authored as code, in library order. */
export const sources: ModelSource[] = [
  crane,
  dogFace,
  tulip,
  cicada,
  dove,
  whale,
  paperPlane,
  squareBase,
  kiteBase,
  kannonBase,
  blintzBase,
  basicShape1,
  basicShape2
];

/** The lesson the homepage opens. */
export const DEFAULT_MODEL = 'crane';
