/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

#!/usr/bin/env node
/**
 * Refactor CSS to use theme variables
 *
 * Replaces hardcoded values with CSS custom properties
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CSS_DIR = path.join(__dirname, '..', 'src', 'css');

// Space mappings (px -> variable)
const spaceMap = {
  '0': 'var(--sp-0)',
  '1px': 'var(--sp-px)',
  '2px': 'var(--sp-0-5)',
  '4px': 'var(--sp-1)',
  '6px': 'var(--sp-1-5)',
  '8px': 'var(--sp-2)',
  '10px': 'var(--sp-2-5)',
  '12px': 'var(--sp-3)',
  '14px': 'var(--sp-3-5)',
  '16px': 'var(--sp-4)',
  '20px': 'var(--sp-5)',
  '24px': 'var(--sp-6)',
  '28px': 'var(--sp-7)',
  '32px': 'var(--sp-8)',
  '36px': 'var(--sp-9)',
  '40px': 'var(--sp-10)',
  '44px': 'var(--sp-11)',
  '48px': 'var(--sp-12)',
  '56px': 'var(--sp-14)',
  '64px': 'var(--sp-16)',
  '80px': 'var(--sp-20)',
  '96px': 'var(--sp-24)',
};

// Font size mappings
const fontSizeMap = {
  '11px': 'var(--font-size-xs)',
  '12px': 'var(--font-size-xxs)',
  '13px': 'var(--font-size-sm)',
  '14px': 'var(--font-size-base)',
  '15px': 'var(--font-size-md)',
  '16px': 'var(--font-size-md)',
  '18px': 'var(--font-size-lg)',
  '20px': 'var(--font-size-xl)',
  '22px': 'var(--font-size-xxl)',
  '24px': 'var(--font-size-2xl)',
  '26px': 'var(--font-size-2xl-plus)',
  '28px': 'var(--font-size-3xl)',
  '32px': 'var(--font-size-4xl)',
  '36px': 'var(--font-size-5xl)',
};

// Color mappings
const colorMap = {
  '#fff': 'var(--color-white)',
  '#ffffff': 'var(--color-white)',
  '#FFF': 'var(--color-white)',
  '#FFFFFF': 'var(--color-white)',
  '#000': 'var(--color-black)',
  '#000000': 'var(--color-black)',
  'rgba(15, 23, 42, 0.4)': 'var(--color-overlay)',
  'rgba(0, 0, 0, 0.5)': 'var(--color-overlay-light)',
};

// Size mappings for specific dimensions
const sizeMap = {
  '60px': 'var(--size-header-height)',
  '56px': 'var(--size-header-height-mobile)',
  '1320px': 'var(--size-content-max)',
  '240px': 'var(--size-sidebar-width)',
  '380px': 'var(--size-drawer-width)',
  '320px': 'var(--size-drawer-width-mobile)',
  '480px': 'var(--size-modal-width)',
  '640px': 'var(--size-modal-width-lg)',
  '52px': 'var(--size-avatar-lg)',
  '72px': 'var(--size-thumbnail-lg)',
  '100px': 'var(--size-thumbnail-xxl)',
  '180px': 'var(--size-button-min-width)',
  '200px': 'var(--size-card-min-width)',
  '440px': 'var(--size-form-max-width)',
  '560px': 'var(--size-form-max-width-lg)',
  '300px': 'var(--size-card-max-width)',
};

// Border radius mappings
const radiusMap = {
  '4px': 'var(--radius-xs)',
  '6px': 'var(--radius-sm)',
  '8px': 'var(--radius-sm)',
  '10px': 'var(--radius-md)',
  '12px': 'var(--radius-md)',
  '16px': 'var(--radius-lg)',
  '20px': 'var(--radius-xl)',
  '24px': 'var(--radius-xl)',
  '50px': 'var(--radius-full)',
  '100px': 'var(--radius-full)',
  '9999px': 'var(--radius-full)',
};

// Properties that should use space variables
const spaceProperties = [
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'gap', 'row-gap', 'column-gap', 'grid-gap',
  'top', 'right', 'bottom', 'left',
  'inset',
];

// Properties that should use font-size variables
const fontSizeProperties = ['font-size'];

// Properties that should NOT be converted (keep original values)
const skipProperties = [
  'box-shadow',    // Uses --shadow-* variables
  'transition',    // Uses --transition-* variables
  'animation',
  'transform',
  'filter',
  'backdrop-filter',
  'z-index',
  'opacity',
  'flex',
  'flex-grow',
  'flex-shrink',
  'order',
  'line-height',
  'font-weight',
  'letter-spacing',
];

// Properties that use radius variables
const radiusProperties = ['border-radius'];

// Track statistics
let stats = {
  filesProcessed: 0,
  replacements: 0,
  byType: {},
};

function refactorCSS(content, filename) {
  let result = content;
  let fileReplacements = 0;

  // Skip _variables.css
  if (filename === '_variables.css') return content;

  // Process line by line to be more precise
  const lines = result.split('\n');
  const processedLines = lines.map((line, lineNum) => {
    // Skip comments
    if (line.trim().startsWith('/*') || line.trim().startsWith('*') || line.trim().startsWith('//')) {
      return line;
    }

    // Skip @media queries and @keyframes definitions
    if (line.trim().startsWith('@')) {
      return line;
    }

    // Parse property: value pairs
    const match = line.match(/^(\s*)([a-z-]+):\s*(.+?)(;?)(\s*)$/i);
    if (!match) return line;

    const [, indent, property, value, semicolon, trailing] = match;
    const propLower = property.toLowerCase();

    // Skip certain properties
    if (skipProperties.includes(propLower)) {
      return line;
    }

    let newValue = value;

    // Handle colors first (exact matches)
    for (const [color, variable] of Object.entries(colorMap)) {
      if (newValue.includes(color)) {
        newValue = newValue.replace(new RegExp(color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), variable);
        fileReplacements++;
        stats.byType['color'] = (stats.byType['color'] || 0) + 1;
      }
    }

    // Handle font-size specifically (including inside clamp())
    if (fontSizeProperties.includes(propLower)) {
      for (const [px, variable] of Object.entries(fontSizeMap)) {
        const regex = new RegExp(`\\b${px.replace('px', '')}px\\b`, 'g');
        const matches = newValue.match(regex);
        if (matches) {
          newValue = newValue.replace(regex, variable);
          fileReplacements += matches.length;
          stats.byType['font-size'] = (stats.byType['font-size'] || 0) + matches.length;
        }
      }
    }

    // Handle spacing properties (including inside calc/clamp)
    if (spaceProperties.includes(propLower)) {
      // Replace px values with space variables - handles calc(), clamp(), and compound values
      for (const [px, variable] of Object.entries(spaceMap)) {
        if (px === '0') continue; // Skip 0 replacement
        const pxNum = px.replace('px', '');
        // Handle negative values: -10px -> calc(-1 * var(--sp-2-5))
        const negRegex = new RegExp(`-${pxNum}px\\b`, 'g');
        const negMatches = newValue.match(negRegex);
        if (negMatches) {
          newValue = newValue.replace(negRegex, `calc(-1 * ${variable})`);
          fileReplacements += negMatches.length;
          stats.byType['space'] = (stats.byType['space'] || 0) + negMatches.length;
        }
        // Handle positive values
        const regex = new RegExp(`\\b${pxNum}px\\b`, 'g');
        const matches = newValue.match(regex);
        if (matches) {
          newValue = newValue.replace(regex, variable);
          fileReplacements += matches.length;
          stats.byType['space'] = (stats.byType['space'] || 0) + matches.length;
        }
      }
    }

    // Handle width/height with specific sizes
    if (['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height'].includes(propLower)) {
      // Check size map first for specific dimensions
      if (sizeMap[newValue]) {
        newValue = sizeMap[newValue];
        fileReplacements++;
        stats.byType['size'] = (stats.byType['size'] || 0) + 1;
      } else if (spaceMap[newValue]) {
        // Otherwise try space map for common values
        newValue = spaceMap[newValue];
        fileReplacements++;
        stats.byType['space'] = (stats.byType['space'] || 0) + 1;
      }
    }

    // Handle border-width specifically
    if (propLower === 'border-width' || propLower.match(/^border-(top|right|bottom|left)-width$/)) {
      if (newValue === '1px') {
        newValue = 'var(--border-width)';
        fileReplacements++;
        stats.byType['border'] = (stats.byType['border'] || 0) + 1;
      } else if (newValue === '2px') {
        newValue = 'var(--border-width-md)';
        fileReplacements++;
        stats.byType['border'] = (stats.byType['border'] || 0) + 1;
      }
    }

    // Handle shorthand border
    if (propLower === 'border' || propLower.match(/^border-(top|right|bottom|left)$/)) {
      newValue = newValue.replace(/\b1px\b/, 'var(--border-width)');
      if (newValue !== value) {
        fileReplacements++;
        stats.byType['border'] = (stats.byType['border'] || 0) + 1;
      }
    }

    // Handle border-radius
    if (radiusProperties.includes(propLower)) {
      // Handle compound values like "12px 16px" or single values
      const parts = newValue.split(/\s+/);
      const newParts = parts.map(part => {
        if (radiusMap[part]) {
          fileReplacements++;
          stats.byType['radius'] = (stats.byType['radius'] || 0) + 1;
          return radiusMap[part];
        }
        return part;
      });
      newValue = newParts.join(' ');
    }

    if (newValue !== value) {
      return `${indent}${property}: ${newValue}${semicolon}${trailing}`;
    }

    return line;
  });

  stats.replacements += fileReplacements;
  if (fileReplacements > 0) {
    console.log(`  ${filename}: ${fileReplacements} replacements`);
  }

  return processedLines.join('\n');
}

function main() {
  console.log('Refactoring CSS to use theme variables...\n');

  const files = fs.readdirSync(CSS_DIR).filter(f => f.endsWith('.css'));

  for (const file of files) {
    const filepath = path.join(CSS_DIR, file);
    const content = fs.readFileSync(filepath, 'utf8');
    const refactored = refactorCSS(content, file);

    if (refactored !== content) {
      fs.writeFileSync(filepath, refactored);
      stats.filesProcessed++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Files modified: ${stats.filesProcessed}`);
  console.log(`Total replacements: ${stats.replacements}`);
  console.log('\nBy type:');
  for (const [type, count] of Object.entries(stats.byType).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }
}

main();