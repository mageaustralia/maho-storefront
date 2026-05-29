import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    {
      // src/index.tsx imports public/*.css and public/*.txt as wrangler "Text"
      // modules. Vitest has no such loader, so stub them as empty-string default
      // exports — their contents are irrelevant to route/behaviour tests, and
      // this lets the Worker app be imported and exercised via app.request().
      name: 'stub-worker-text-assets',
      enforce: 'pre',
      load(id: string) {
        if (/\/public\/.*\.(css|txt)$/.test(id)) {
          // Non-empty so routes that guard on truthy content (e.g. the
          // /plugins/:name serve route) behave as they do with real assets.
          return 'export default "/* stubbed asset */";';
        }
        return null;
      },
    },
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
