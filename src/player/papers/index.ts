import { ajiro } from './ajiro';
import { asanoha } from './asanoha';
import { cho } from './cho';
import { hanabishi } from './hanabishi';
import { ichimatsu } from './ichimatsu';
import { ine } from './ine';
import { kusari } from './kusari';
import { mameShibori } from './mame-shibori';
import { ryusui } from './ryusui';
import { sakuraKomon } from './sakura-komon';
import { sameKomon } from './same-komon';
import { sayagata } from './sayagata';
import { seigaiha } from './seigaiha';
import { shippo } from './shippo';
import { shippoHanabishi } from './shippo-hanabishi';
import { stripes } from './stripes';
import { tatewakuKumo } from './tatewaku-kumo';
import { ume } from './ume';
import { wavyCords } from './wavy-cords';

/**
 * A booklet paper drawn by a shader. `ground`/`ink` are sRGB hex. `glsl` defines `vec3 paperColor(vec2 uv)` in sheet
 * space (0..1) and may use the uniforms `uGround`/`uInk` and `aastep(edge, x)`, which the material declares.
 */
export type PaperPattern = { id: string; ground: string; ink: string; glsl: string };

/** The model's own colour, as before papers existed. */
export const PLAIN = 'plain';

/** Picker order; Plain comes first, ahead of these. */
export const PAPERS: PaperPattern[] = [
  ichimatsu,
  shippo,
  asanoha,
  stripes,
  mameShibori,
  sameKomon,
  shippoHanabishi,
  hanabishi,
  ajiro,
  wavyCords,
  kusari,
  sakuraKomon,
  ume,
  cho,
  ine,
  tatewakuKumo,
  ryusui,
  seigaiha,
  sayagata
];

export const paperById = (id: string) => PAPERS.find((p) => p.id === id);

/** A stored choice that is missing or no longer exists falls back to Plain. */
export const resolvePaperId = (stored: string | null) => (stored && paperById(stored) ? stored : PLAIN);
