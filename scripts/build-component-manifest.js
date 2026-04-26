#!/usr/bin/env node
// Aggregates all _manifest.json files into a single component-manifest.json
// Run: node scripts/build-component-manifest.js
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const componentsDir = join(root, 'src/templates/components');

async function findManifests(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findManifests(full));
    } else if (entry.name === '_manifest.json') {
      results.push(full);
    }
  }
  return results;
}

const manifests = await findManifests(componentsDir);
const slots = {};

for (const path of manifests) {
  const content = JSON.parse(await readFile(path, 'utf8'));
  const rel = relative(componentsDir, dirname(path));
  const slotKey = rel.replace(/\//g, '.');
  slots[slotKey] = content;
}

const output = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  description: 'Component slot → variant manifest for Maho Storefront page.json',
  slots,
};

await writeFile(join(root, 'component-manifest.json'), JSON.stringify(output, null, 2) + '\n');
console.log(`Built component-manifest.json with ${Object.keys(slots).length} slots`);
