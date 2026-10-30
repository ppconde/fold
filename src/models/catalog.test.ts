import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FoldError } from '../fold/load-model';
import { fetchIndex, fetchModel } from './catalog';

const file = (name: string) => readFileSync(new URL(`../../public/models/${name}`, import.meta.url), 'utf8');

function serve(routes: Record<string, { status?: number; body: string }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const hit = routes[url];
      // Cloudflare's SPA fallback answers unknown paths with index.html and 200
      const { status = 200, body } = hit ?? { body: '<!doctype html><title>Fold</title>' };
      return new Response(body, { status });
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchIndex', () => {
  it('returns the entries in models.json', async () => {
    serve({ '/models/models.json': { body: file('models.json') } });
    const index = await fetchIndex();
    expect(index.models.map((e) => e.id)).toEqual([
      'crane',
      'dog-face',
      'tulip',
      'cicada',
      'dove',
      'square-base',
      'kite-base',
      'kannon-base',
      'blintz-base',
      'basic-shape-1',
      'basic-shape-2'
    ]);
    expect(index.defaultModel).toBe('crane');
  });

  it('throws a FoldError when the index has no models array', async () => {
    serve({ '/models/models.json': { body: '[]' } });
    await expect(fetchIndex()).rejects.toThrow(FoldError);
  });

  it('throws a FoldError when the index is not JSON', async () => {
    serve({});
    await expect(fetchIndex()).rejects.toThrow(FoldError);
  });
});

describe('fetchModel', () => {
  it('loads a listed model', async () => {
    serve({
      '/models/models.json': { body: file('models.json') },
      '/models/tulip.fold': { body: file('tulip.fold') }
    });
    const result = await fetchModel('tulip');
    expect(result?.entry.name.en).toBe('Tulip');
    expect(result?.model.steps).toHaveLength(5);
  });

  it('returns null for an id that is not in the index, even if the SPA fallback answers 200', async () => {
    serve({ '/models/models.json': { body: file('models.json') } });
    expect(await fetchModel('kabuto')).toBeNull();
  });

  it('throws a readable FoldError when a listed file is missing', async () => {
    serve({
      '/models/models.json': { body: file('models.json') },
      '/models/tulip.fold': { status: 404, body: 'Not found' }
    });
    await expect(fetchModel('tulip')).rejects.toThrow(/could not be downloaded \(404\)/);
  });

  it('throws a readable FoldError when a listed file is the SPA fallback page', async () => {
    serve({ '/models/models.json': { body: file('models.json') } });
    // the crane is listed but not served, so the fallback HTML comes back with 200
    await expect(fetchModel('crane')).rejects.toThrow(/not a FOLD file/);
  });

  it('passes loadModel errors through', async () => {
    serve({
      '/models/models.json': { body: file('models.json') },
      '/models/tulip.fold': { body: '{"vertices_coords": []}' }
    });
    await expect(fetchModel('tulip')).rejects.toThrow(FoldError);
  });
});
