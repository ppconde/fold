import { GUI } from 'lil-gui';

class Debug {

    public active: boolean;

    public ui?: GUI;

    constructor() {
        // You can write /#debug in the url to activate the debug mode
        this.active = window.location.href.includes('debug') || !import.meta.env.PROD;

        if (this.active) {
            this.ui = new GUI({
                title: 'Debug',
                closeFolders: true,
            });
        }
    }
}

export const debug = new Debug();
