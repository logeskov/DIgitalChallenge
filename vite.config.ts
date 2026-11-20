import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative stier, så det byggede spil kan åbnes fra en hvilken som helst mappe eller GitHub Pages.
  base: './',
  test: { environment: 'jsdom' },
});
