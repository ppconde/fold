import type { ModelEntry } from '../../src/models/catalog';
import type { ModelSource } from '../build';
import crane from './crane';
import dogFace from './dog-face';
import tulip from './tulip';

/** Models authored as code, in library order. */
export const sources: ModelSource[] = [crane, dogFace, tulip];

/** The lesson the homepage opens. */
export const DEFAULT_MODEL = 'crane';

/** Hand-written practice files in public/models, listed after the authored models. */
export const FIXTURES: ModelEntry[] = [
  {
    id: 'fold-in-half',
    name: { en: 'Fold in half', pt: 'Dobrar ao meio' },
    japaneseName: 'Futatsu-ori',
    category: 'geometric',
    difficulty: 'easy',
    tags: ['basic', 'practice']
  },
  {
    id: 'fold-in-quarters',
    name: { en: 'Fold in quarters', pt: 'Dobrar em quatro' },
    japaneseName: 'Yotsu-ori',
    category: 'geometric',
    difficulty: 'easy',
    tags: ['basic', 'practice']
  }
];
