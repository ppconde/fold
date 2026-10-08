import { describe, expect, it } from 'vitest';
import { fixture } from '../src/fold/fixtures';
import { loadModel } from '../src/fold/load-model';
import { buildFold } from './build';
import crane from './src/crane';
import { flatStep, thumbnail } from './thumbnail';

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

  // Safari draws an SVG image that uses a filter at 1×, so it blurs on Retina screens
  it('uses no SVG filter, so Safari draws it sharp', () => {
    expect(thumbnail(loadModel(fixture('fold-in-half')))).not.toContain('filter');
  });

  it('draws a model that ends standing up at its last flat step', () => {
    const model = loadModel(buildFold(crane));
    expect(flatStep(model)).toBe(model.steps.length - 3); // before standing up and spreading the wings
    expect(flatStep(loadModel(fixture('fold-in-half')))).toBe(1);
  });
});
