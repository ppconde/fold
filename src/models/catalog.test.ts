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
    expect(index.map((e) => e.id)).toEqual(['fold-in-half', 'fold-in-quarters']);
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
      '/models/fold-in-half.fold': { body: file('fold-in-half.fold') }
    });
    const result = await fetchModel('fold-in-half');
    expect(result?.entry.name).toBe('Fold in half');
    expect(result?.model.steps).toHaveLength(2);
  });

  it('returns null for an id that is not in the index, even if the SPA fallback answers 200', async () => {
    serve({ '/models/models.json': { body: file('models.json') } });
    expect(await fetchModel('crane')).toBeNull();
  });

  it('throws a readable FoldError when a listed file is missing', async () => {
    serve({
      '/models/models.json': { body: file('models.json') },
      '/models/fold-in-half.fold': { status: 404, body: 'Not found' }
    });
    await expect(fetchModel('fold-in-half')).rejects.toThrow(/could not be downloaded \(404\)/);
  });

  it('throws a readable FoldError when a listed file is the SPA fallback page', async () => {
    serve({ '/models/models.json': { body: file('models.json') } });
    // fold-in-quarters is listed but not served, so the fallback HTML comes back with 200
    await expect(fetchModel('fold-in-quarters')).rejects.toThrow(/not a FOLD file/);
  });

  it('passes loadModel errors through', async () => {
    serve({
      '/models/models.json': { body: file('models.json') },
      '/models/fold-in-half.fold': { body: '{"vertices_coords": []}' }
    });
    await expect(fetchModel('fold-in-half')).rejects.toThrow(FoldError);
  });
});
