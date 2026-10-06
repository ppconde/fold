const KEY = 'fold:dockHint';

export function shouldShowHint(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'seen';
  } catch {
    return true;
  }
}

export function markHintSeen(): void {
  try {
    localStorage.setItem(KEY, 'seen');
  } catch {
    // Storage blocked: the hint simply shows again next visit.
  }
}
