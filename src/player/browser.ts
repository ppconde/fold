const PANEL_KEY = 'fold:panelOpen';

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

export function readPanelOpen(): boolean {
  try {
    return localStorage.getItem(PANEL_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function writePanelOpen(open: boolean): void {
  try {
    localStorage.setItem(PANEL_KEY, String(open));
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
}
