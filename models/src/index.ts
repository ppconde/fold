import type { ModelSource } from '../build';
import cicada from './cicada';
import crane from './crane';
import dogFace from './dog-face';
import tulip from './tulip';

/** Models authored as code, in library order. */
export const sources: ModelSource[] = [crane, dogFace, tulip, cicada];

/** The lesson the homepage opens. */
export const DEFAULT_MODEL = 'crane';
