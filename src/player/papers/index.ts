import { asanoha } from './asanoha';
import { ichimatsu } from './ichimatsu';
import { mameShibori } from './mame-shibori';
import { sameKomon } from './same-komon';
import { shippo } from './shippo';
import { stripes } from './stripes';

/**
 * A booklet paper drawn by a shader. `ground`/`ink` are sRGB hex. `glsl` defines `vec3 paperColor(vec2 uv)` in sheet
 * space (0..1) and may use the uniforms `uGround`/`uInk` and `aastep(edge, x)`, which the material declares.
 */
export type PaperPattern = { id: string; ground: string; ink: string; glsl: string };

/** The model's own colour, as before papers existed. */
export const PLAIN = 'plain';

/** Picker order; Plain comes first, ahead of these. */
export const PAPERS: PaperPattern[] = [ichimatsu, shippo, asanoha, stripes, mameShibori, sameKomon];

export const paperById = (id: string) => PAPERS.find((p) => p.id === id);

/** A stored choice that is missing or no longer exists falls back to Plain. */
export const resolvePaperId = (stored: string | null) => (stored && paperById(stored) ? stored : PLAIN);
