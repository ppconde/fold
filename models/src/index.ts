import type { ModelSource } from '../build';
import cicada from './cicada';
import crane from './crane';
import dogFace from './dog-face';
import snail from './snail';
import tulip from './tulip';

/** Models authored as code, in library order. */
export const sources: ModelSource[] = [crane, dogFace, snail, tulip, cicada];

/** The lesson the homepage opens. */
export const DEFAULT_MODEL = 'crane';
