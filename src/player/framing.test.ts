import { describe, expect, it } from 'vitest';
import { fixture } from '../fold/fixtures';
import { loadModel } from '../fold/load-model';
import { endCentre, frameReach } from './framing';

const half = () => loadModel(fixture('fold-in-half'));

describe('endCentre', () => {
  it('centres the flat sheet on the origin', () => {
    const [x, z] = endCentre(half(), 0);
    expect(x).toBeCloseTo(0, 9);
    expect(z).toBeCloseTo(0, 9);
  });

  it('follows the paper onto the right half once folded', () => {
    const [x, z] = endCentre(half(), 1);
    expect(x).toBeCloseTo(0.25, 6);
    expect(z).toBeCloseTo(0, 6);
  });
});

describe('frameReach', () => {
  it('holds the sheet as its half turns about the centre line', () => {
    expect(frameReach(half(), 0, 1)).toBeCloseTo(Math.SQRT1_2, 2);
  });

  // the camera stays on the folded half while the step plays back, so the flat sheet has to fit around it
  it('reaches the far corner of the flat sheet from the folded half while the step plays', () => {
    expect(frameReach(half(), 1, 1)).toBeCloseTo(Math.hypot(0.75, 0.5), 2);
  });

  it('holds only the folded half at rest', () => {
    expect(frameReach(half(), 1)).toBeCloseTo(Math.hypot(0.25, 0.5), 2);
  });
});
