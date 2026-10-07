import { mkdirSync, writeFileSync } from 'node:fs';
import { loadModel } from '../src/fold/load-model';
import { buildFold, entryOf } from './build';
import { checkModel } from './check';
import { DEFAULT_MODEL, FIXTURES, sources } from './src/index';
import { thumbnail } from './thumbnail';

const root = new URL('../', import.meta.url);
const write = (path: string, text: string) => writeFileSync(new URL(path, root), text);

/** `pnpm models`: build, check and draw every authored model. Exits non-zero if any model fails a check. */
export function main() {
  mkdirSync(new URL('models/out/', root), { recursive: true });
  let failed = 0;
  for (const src of sources) {
    const fold = buildFold(src);
    const model = loadModel(fold);
    const problems = checkModel(model);
    console.log(
      `${problems.length ? '✗' : '✓'} ${src.id}: ${model.faces.length} faces, ${model.steps.length - 1} steps`
    );
    for (const p of problems) console.log(`    ${p}`);
    if (problems.length) failed++;
    write(`public/models/${src.id}.fold`, `${JSON.stringify(fold)}\n`);
    write(`public/models/${src.id}.svg`, thumbnail(model));
    // per-step drawings for the maintainer's review; models/out is gitignored
    for (let k = 0; k < model.steps.length; k++) write(`models/out/${src.id}-${k}.svg`, thumbnail(model, k));
  }
  const index = { defaultModel: DEFAULT_MODEL, models: [...sources.map(entryOf), ...FIXTURES] };
  write('public/models/models.json', `${JSON.stringify(index, null, 2)}\n`);
  if (failed) {
    console.log(`${failed} model(s) failed. Fix them before committing.`);
    process.exitCode = 1;
  }
}
