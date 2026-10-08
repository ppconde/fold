const PANEL_KEY = 'fold:panelOpen';
const HINT_KEY = 'fold:dockHint';
const LAST_KEY = 'fold:lastModel';

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

export const shouldShowHint = () => readStored(HINT_KEY) !== 'seen';
export const markHintSeen = () => writeStored(HINT_KEY, 'seen');

/** The lesson opened last: the homepage shows it. */
export const readLastModel = () => readStored(LAST_KEY);
export const writeLastModel = (id: string) => writeStored(LAST_KEY, id);
