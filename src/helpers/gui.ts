import GUI from 'lil-gui';

// Remove existing GUI if it exists - only happens in dev mode because of hot module reload
const guis = document.querySelectorAll('.lil-gui');

for (const gui of guis) {
  gui.remove();
}

export const gui = new GUI({
  title: 'Debug',
  closeFolders: false,
});