import { kannonFold } from './bases';

const s = kannonFold();

export default s.source({
  id: 'kannon-fold',
  name: { en: 'Kannon fold', pt: 'Dobra Kannon' },
  japaneseName: 'Kannon-ori',
  category: 'bases',
  difficulty: 'easy',
  tags: ['kannon', 'cupboard', 'base'],
  paperColor: '#7A5C8A'
});
