import { describe, expect, it } from 'vitest';
import { fixture } from '../src/fold/fixtures';
import { loadModel } from '../src/fold/load-model';
import { thumbnail } from './thumbnail';

describe('thumbnail', () => {
  it('draws one polygon per face, coloured front up on the flat sheet', () => {
    const model = loadModel(fixture('fold-in-quarters'));
    const svg = thumbnail(model, 0);
    expect(svg.match(/<polygon /g)).toHaveLength(model.faces.length);
    expect(svg).toContain(`fill="${model.paperColor}"`);
    expect(svg).not.toContain('fill="#F3EDE2"');
  });

  it('shows the white back of a flap folded over', () => {
    expect(thumbnail(loadModel(fixture('fold-in-half')))).toContain('fill="#F3EDE2"');
  });
});
