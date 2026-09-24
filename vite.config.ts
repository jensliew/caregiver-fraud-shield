/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// When building for GitHub Pages the app is served from
// https://<user>.github.io/<repo>/, so assets must resolve under that subpath.
// Local dev and other hosts keep the root base. Read via globalThis so this
// config type-checks without @types/node.
const isGitHubPages =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isGitHubPages ? '/caregiver-fraud-shield/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
