import { describe, expect, it } from 'vitest';
import { en } from '../../i18n/en';
import { pt } from '../../i18n/pt';
import { PAPERS, PLAIN, resolvePaperId } from '.';

describe('papers', () => {
  it('has unique ids and never reuses plain', () => {
    const ids = PAPERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain(PLAIN);
  });

  it('names every paper in every language', () => {
    for (const d of [en, pt]) for (const id of [PLAIN, ...PAPERS.map((p) => p.id)]) expect(d.papers[id]).toBeTruthy();
  });

  it('uses 7-character hex colours and defines paperColor', () => {
    for (const p of PAPERS) {
      expect(p.ground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.ink).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.glsl).toMatch(/vec3\s+paperColor\s*\(\s*vec2\s+uv\s*\)/);
    }
  });

  it('falls back to plain for missing or unknown ids', () => {
    expect(resolvePaperId(null)).toBe(PLAIN);
    expect(resolvePaperId('gone')).toBe(PLAIN);
    expect(resolvePaperId('ichimatsu')).toBe('ichimatsu');
    expect(resolvePaperId(PLAIN)).toBe(PLAIN);
  });
});
