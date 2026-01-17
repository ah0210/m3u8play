import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: '../dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        storage: resolve(__dirname, 'src/js/storage.js'),
        i18n: resolve(__dirname, 'src/js/i18n.js')
      },
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name].[hash].${ext}`;
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(assetInfo.name)) {
            return `icons/[name].[hash].${ext}`;
          }
          return `assets/[name].[hash].${ext}`;
        },
        chunkFileNames: 'js/[name].[hash].js',
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'storage' || chunkInfo.name === 'i18n') {
            return 'js/[name].[hash].js';
          }
          return 'js/[name].[hash].js';
        }
      }
    },
    copyPublicDir: true
  }
});