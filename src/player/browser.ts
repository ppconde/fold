import { resolvePaperId } from './papers';

const PANEL_KEY = 'fold:panelOpen';
const LAST_KEY = 'fold:lastModel';
const PAPER_KEY = 'fold:paper';

export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** localStorage that tolerates blocked storage (private mode): reads fall back, writes apply for this visit only. */
export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage blocked: the choice still applies for this visit
  }
}

export const readPanelOpen = () => readStored(PANEL_KEY) !== 'false';
export const writePanelOpen = (open: boolean) => writeStored(PANEL_KEY, String(open));

/** The lesson opened last: the homepage shows it. */
export const readLastModel = () => readStored(LAST_KEY);
export const writeLastModel = (id: string) => writeStored(LAST_KEY, id);

/** The step each lesson was left at: opening it again without a ?step picks up there. */
export const readStep = (id: string) => Number(readStored(`fold:step:${id}`)) || 0;
export const writeStep = (id: string, step: number) => writeStored(`fold:step:${id}`, String(step));

/** The paper picked last, on every model. */
export const readPaper = () => resolvePaperId(readStored(PAPER_KEY));
export const writePaper = (id: string) => writeStored(PAPER_KEY, id);
