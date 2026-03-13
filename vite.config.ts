import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'Open3D',
      fileName: (format) => `open3d.${format}.js`,
      formats: ['es', 'umd']
    },
    outDir: 'dist'
  },
  server: {
    port: 8080
  }
});