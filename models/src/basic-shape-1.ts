import { basicShape1 } from './bases';

const s = basicShape1();

export default s.source({
  id: 'basic-shape-1',
  name: { en: 'Basic shape 1', pt: 'Forma básica 1' },
  japaneseName: 'Kihonkei 1',
  category: 'bases',
  difficulty: 'medium',
  tags: ['squashed square base', 'base'],
  paperColor: '#C8763A',
  solve: true
});
