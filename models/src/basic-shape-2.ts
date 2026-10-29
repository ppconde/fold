import { basicShape2 } from './bases';

const s = basicShape2();

export default s.source({
  id: 'basic-shape-2',
  name: { en: 'Basic shape 2', pt: 'Forma básica 2' },
  japaneseName: 'Tsuru no kihonkei',
  category: 'bases',
  buildsOn: 'square-base',
  difficulty: 'medium',
  tags: ['bird base', 'base'],
  paperColor: '#9A4F6B',
  solve: true
});
