import { GUI } from 'lil-gui';
import Stats from 'stats.js';

export class Debug {
  public active: boolean;

  public ui?: GUI;

  public stats?: Stats;

  constructor() {
    // You can write /#debug in the url to activate the debug mode
    this.active = window.location.href.includes('debug') || !import.meta.env.PROD;

    if (this.active) {
      this.ui = new GUI({
        title: 'Debug',
        closeFolders: true
      });

      this.stats = new Stats();
      this.stats.showPanel(0);
      document.body.appendChild(this.stats.dom);
    }
  }
}
