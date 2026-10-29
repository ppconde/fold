import { basicShape1 } from './bases';

const s = basicShape1();

export default s.source({
  id: 'basic-shape-1',
  name: { en: 'Basic shape 1', pt: 'Forma básica 1' },
  category: 'bases',
  buildsOn: 'square-base',
  difficulty: 'medium',
  tags: ['squashed square base', 'base'],
  paperColor: '#A8577A',
  solve: true
});
