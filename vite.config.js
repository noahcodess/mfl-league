import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "preview" mode bundles everything into one HTML file for sharing a preview link.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'preview' ? [react(), viteSingleFile()] : [react()],
  build: {
    outDir: mode === 'preview' ? 'dist-preview' : 'dist',
    assetsInlineLimit: mode === 'preview' ? 100_000_000 : 4096,
  },
}));
