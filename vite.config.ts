import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import plainText from 'vite-plugin-plain-text';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      // A minimatch pattern, or array of patterns, which specifies the files in the build the plugin should include.
      include: '**/*.svg?react'
    }),
    plainText(['**/*.text'], { namedExport: false, distAutoClean: true })
  ],
  // assetsInclude: ['**/*.fold', '**/*.txt', '**/*.text'],
  server: {
    // This is not working when set to true because of problems exposing the server to the local networkS
    host: false, // Open to local network and display URL
    port: 5173
  },
  build: {
    outDir: './dist', // Output in the dist/ folder
    emptyOutDir: true, // Empty the folder first
    sourcemap: true // Add sourcemap
  }
});
