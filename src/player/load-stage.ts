export const loadStage = () => import('./Stage').then((m) => ({ default: m.Stage }));
