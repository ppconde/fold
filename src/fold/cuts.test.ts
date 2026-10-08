import { describe, expect, it } from 'vitest';
import { cornerKeys } from './cuts';
import { slitFixture } from './fixtures';
import { loadModel } from './load-model';

const model = () => loadModel(slitFixture());
/** The key of vertex v's corner on face f. */
const key = (keys: number[][], m: ReturnType<typeof model>, f: number, v: number) => keys[f][m.faces[f].indexOf(v)];

describe('cornerKeys', () => {
  it('keeps every copy of a vertex together before the cut', () => {
    const m = model();
    const keys = cornerKeys(m, 0);
    // vertex 5 lies on the slit, on all three faces
    expect(new Set([0, 1, 2].map((f) => key(keys, m, f, 5))).size).toBe(1);
  });

  it('lets the two sides of the slit part once it is cut, but not past its end', () => {
    const m = model();
    const keys = cornerKeys(m, 1);
    // vertex 4, where the scissors went in: the bottom half and the top-left corner part
    expect(key(keys, m, 0, 4)).not.toBe(key(keys, m, 1, 4));
    // vertex 5, on the slit: the top two faces still share the fold between them
    expect(key(keys, m, 1, 5)).toBe(key(keys, m, 2, 5));
    expect(key(keys, m, 0, 5)).not.toBe(key(keys, m, 1, 5));
    // vertex 6, the end of the slit: still joined through the flat line beyond it
    expect(key(keys, m, 0, 6)).toBe(key(keys, m, 2, 6));
  });
});
