// `pnpm models` runs models/run.ts through Vite, which resolves the app's extensionless TypeScript imports.
import { runnerImport } from 'vite';

const { module } = await runnerImport('./models/run.ts', { configFile: false, logLevel: 'error' });
module.main();
