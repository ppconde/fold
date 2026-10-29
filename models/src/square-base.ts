import { foldSequence } from '../sequence';
import { squareBase } from './bases';

const s = foldSequence([0, 0, 45]);
squareBase(s);

export default s.source({
  id: 'square-base',
  name: { en: 'Square base', pt: 'Base quadrada' },
  japaneseName: 'Seihō kihonkei',
  category: 'bases',
  difficulty: 'easy',
  tags: ['square', 'preliminary', 'base'],
  paperColor: '#4E6A86',
  solve: true
});
