import { Debug } from '../src/helpers/debug';

declare global {
  interface Window {
    debug: Debug;
  }
}

window.debug = window.debug || {};
