import type { ModelSource } from '../build';
import cicada from './cicada';
import crane from './crane';
import dogFace from './dog-face';
import kiteBase from './kite-base';
import squareBase from './square-base';
import tulip from './tulip';

/** Models authored as code, in library order. */
export const sources: ModelSource[] = [crane, dogFace, tulip, cicada, squareBase, kiteBase];

/** The lesson the homepage opens. */
export const DEFAULT_MODEL = 'crane';
