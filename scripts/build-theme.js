/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

#!/usr/bin/env node
/**
 * Build Theme CSS
 *
 * Reads theme.json and generates:
 * 1. src/css/_variables.css - CSS custom properties from theme tokens
 * 2. public/styles.css - Concatenated CSS from all src/css/ files
 *
 * Usage: node scripts/build-theme.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');
const THEME_FILE = path.join(ROOT, 'theme.json');
const CSS_SRC = path.join(ROOT, 'src', 'css');
const CSS_OUT = path.join(ROOT, 'public', 'styles.css');

// Helpers
function kebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function colorToVar(key) {
  return `--color-${kebabCase(key)}`;
}

// Generate CSS variables from theme.json
function generateVariables(theme) {
  const lines = [];

  lines.push('/* ===================================================================');
  lines.push(`   ${theme.name} Theme Variables`);
  lines.push('   Auto-generated from theme.json — DO NOT EDIT DIRECTLY');
  lines.push('   =================================================================== */');
  lines.push('');

  // Google Fonts import
  if (theme.fonts?.googleFontsImport) {
    lines.push(`@import url('${theme.fonts.googleFontsImport}');`);
    lines.push('');
  }

  lines.push(':root {');

  // Colors
  if (theme.colors) {
    lines.push('  /* Colors */');
    for (const [key, value] of Object.entries(theme.colors)) {
      lines.push(`  ${colorToVar(key)}: ${value};`);
    }
    lines.push('');
  }

  // Fonts
  if (theme.fonts) {
    lines.push('  /* Fonts */');
    if (theme.fonts.sans) lines.push(`  --font-sans: ${theme.fonts.sans};`);
    if (theme.fonts.mono) lines.push(`  --font-mono: ${theme.fonts.mono};`);
    if (theme.fonts.heading) lines.push(`  --font-heading: ${theme.fonts.heading};`);
    lines.push('');
  }

  // Typography
  if (theme.typography) {
    lines.push('  /* Typography */');
    const t = theme.typography;
    if (t.baseFontSize) lines.push(`  --font-size-root: ${t.baseFontSize};`);
    if (t.baseLineHeight) lines.push(`  --line-height-base: ${t.baseLineHeight};`);
    if (t.h1Size) lines.push(`  --font-size-h1: ${t.h1Size};`);
    if (t.h2Size) lines.push(`  --font-size-h2: ${t.h2Size};`);
    if (t.h3Size) lines.push(`  --font-size-h3: ${t.h3Size};`);
    if (t.h4Size) lines.push(`  --font-size-h4: ${t.h4Size};`);
    if (t.letterSpacing) lines.push(`  --letter-spacing: ${t.letterSpacing};`);
    if (t.headingWeight) lines.push(`  --font-weight-heading: ${t.headingWeight};`);
    if (t.bodyWeight) lines.push(`  --font-weight-body: ${t.bodyWeight};`);
    // Font size scale - iterate over all fontSize* keys
    for (const [key, value] of Object.entries(t)) {
      if (key.startsWith('fontSize')) {
        const sizeName = kebabCase(key.replace('fontSize', ''));
        lines.push(`  --font-size-${sizeName}: ${value};`);
      }
    }
    lines.push('');
  }

  // Space scale (padding, margin, gap)
  if (theme.space) {
    lines.push('  /* Space Scale */');
    for (const [key, value] of Object.entries(theme.space)) {
      // Handle decimal keys like "0.5" -> "sp-0-5"
      const varName = key.replace('.', '-');
      lines.push(`  --sp-${varName}: ${value};`);
    }
    lines.push('');
  }

  // Breakpoints
  if (theme.breakpoints) {
    lines.push('  /* Breakpoints */');
    for (const [key, value] of Object.entries(theme.breakpoints)) {
      lines.push(`  --breakpoint-${key}: ${value};`);
    }
    lines.push('');
  }

  // Sizes (fixed dimensions)
  if (theme.sizes) {
    lines.push('  /* Sizes */');
    for (const [key, value] of Object.entries(theme.sizes)) {
      lines.push(`  --size-${kebabCase(key)}: ${value};`);
    }
    lines.push('');
  }

  // Borders
  if (theme.borders) {
    lines.push('  /* Borders */');
    for (const [key, value] of Object.entries(theme.borders)) {
      lines.push(`  --border-${kebabCase(key)}: ${value};`);
    }
    lines.push('');
  }

  // Border radii
  if (theme.radii) {
    lines.push('  /* Border Radii */');
    for (const [key, value] of Object.entries(theme.radii)) {
      lines.push(`  --radius-${key}: ${value};`);
    }
    lines.push('');
  }

  // Shadows
  if (theme.shadows) {
    lines.push('  /* Shadows */');
    for (const [key, value] of Object.entries(theme.shadows)) {
      lines.push(`  --shadow-${key}: ${value};`);
    }
    lines.push('');
  }

  // Transitions
  if (theme.transitions) {
    lines.push('  /* Transitions */');
    for (const [key, value] of Object.entries(theme.transitions)) {
      lines.push(`  --transition-${key}: ${value};`);
    }
    lines.push('');
  }

  // Component-specific variables
  if (theme.components) {
    lines.push('  /* Component Tokens */');

    // Buttons
    if (theme.components.buttons) {
      const btn = theme.components.buttons;
      if (btn.borderRadius && theme.radii?.[btn.borderRadius]) {
        lines.push(`  --btn-radius: var(--radius-${btn.borderRadius});`);
      }
      if (btn.textTransform) lines.push(`  --btn-text-transform: ${btn.textTransform};`);
      if (btn.fontWeight) lines.push(`  --btn-font-weight: ${btn.fontWeight};`);
      if (btn.padding) lines.push(`  --btn-padding: ${btn.padding};`);
    }

    // Cards
    if (theme.components.cards) {
      const card = theme.components.cards;
      if (card.borderRadius && theme.radii?.[card.borderRadius]) {
        lines.push(`  --card-radius: var(--radius-${card.borderRadius});`);
      }
      if (card.shadow && theme.shadows?.[card.shadow]) {
        lines.push(`  --card-shadow: var(--shadow-${card.shadow});`);
      } else if (card.shadow === 'none') {
        lines.push(`  --card-shadow: none;`);
      }
      if (card.hoverShadow && theme.shadows?.[card.hoverShadow]) {
        lines.push(`  --card-hover-shadow: var(--shadow-${card.hoverShadow});`);
      }
    }

    // Badges
    if (theme.components.badges) {
      const badge = theme.components.badges;
      if (badge.borderRadius && theme.radii?.[badge.borderRadius]) {
        lines.push(`  --badge-radius: var(--radius-${badge.borderRadius});`);
      }
      if (badge.textTransform) lines.push(`  --badge-text-transform: ${badge.textTransform};`);
      if (badge.fontSize) lines.push(`  --badge-font-size: ${badge.fontSize};`);
      if (badge.fontWeight) lines.push(`  --badge-font-weight: ${badge.fontWeight};`);
    }

    // Inputs
    if (theme.components.inputs) {
      const input = theme.components.inputs;
      if (input.borderRadius && theme.radii?.[input.borderRadius]) {
        lines.push(`  --input-radius: var(--radius-${input.borderRadius});`);
      }
      if (input.borderColor && theme.colors?.[input.borderColor]) {
        lines.push(`  --input-border-color: var(${colorToVar(input.borderColor)});`);
      }
      if (input.focusRing && theme.colors?.[input.focusRing]) {
        lines.push(`  --input-focus-color: var(${colorToVar(input.focusRing)});`);
      }
    }
    lines.push('');
  }

  // Legacy aliases for backward compatibility
  lines.push('  /* Legacy Aliases (for backward compatibility) */');
  lines.push('  --header-height: var(--size-header-height);');
  lines.push('  --content-max: var(--size-content-max);');
  lines.push('  --content-padding: var(--size-content-padding);');
  lines.push('');

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// Concatenate CSS files in order
function concatenateCSS(variablesContent) {
  const parts = [variablesContent];

  // Define file order (underscore-prefixed files are partials, included first)
  const fileOrder = [
    '_reset.css',
    '_base.css',
    '_utilities.css',
    'header.css',
    'navigation.css',
    'footer.css',
    'buttons.css',
    'forms.css',
    'cards.css',
    'badges.css',
    'product.css',
    'product-grid.css',
    'category.css',
    'cart.css',
    'checkout.css',
    'account.css',
    'search.css',
    'modals.css',
    'cms.css',
    'responsive.css',
  ];

  // Check which files exist
  const existingFiles = fs.existsSync(CSS_SRC)
    ? fs.readdirSync(CSS_SRC).filter(f => f.endsWith('.css') && f !== '_variables.css')
    : [];

  // Add files in order
  for (const file of fileOrder) {
    if (existingFiles.includes(file)) {
      const content = fs.readFileSync(path.join(CSS_SRC, file), 'utf8');
      parts.push(`\n/* ====================================================================\n   ${file.replace(/^_/, '').replace('.css', '').toUpperCase()}\n   ==================================================================== */\n`);
      parts.push(content);
      existingFiles.splice(existingFiles.indexOf(file), 1);
    }
  }

  // Add any remaining files not in the order list
  for (const file of existingFiles.sort()) {
    const content = fs.readFileSync(path.join(CSS_SRC, file), 'utf8');
    parts.push(`\n/* ====================================================================\n   ${file.replace(/^_/, '').replace('.css', '').toUpperCase()}\n   ==================================================================== */\n`);
    parts.push(content);
  }

  return parts.join('\n');
}

// Main
function main() {
  console.log('Building theme CSS...');

  // Read theme.json
  if (!fs.existsSync(THEME_FILE)) {
    console.error('Error: theme.json not found');
    process.exit(1);
  }

  const theme = JSON.parse(fs.readFileSync(THEME_FILE, 'utf8'));
  console.log(`Theme: ${theme.name}`);

  // Ensure src/css directory exists
  if (!fs.existsSync(CSS_SRC)) {
    fs.mkdirSync(CSS_SRC, { recursive: true });
  }

  // Generate variables
  const variablesContent = generateVariables(theme);
  const variablesFile = path.join(CSS_SRC, '_variables.css');
  fs.writeFileSync(variablesFile, variablesContent);
  console.log(`Generated: src/css/_variables.css`);

  // If no other CSS files exist, create placeholder
  const cssFiles = fs.readdirSync(CSS_SRC).filter(f => f.endsWith('.css') && f !== '_variables.css');
  if (cssFiles.length === 0) {
    console.log('No component CSS files found. Run with --split to split existing styles.css');
    // Just write variables to output for now
    fs.writeFileSync(CSS_OUT, variablesContent);
  } else {
    // Concatenate all CSS
    const finalCSS = concatenateCSS(variablesContent);
    fs.writeFileSync(CSS_OUT, finalCSS);
    console.log(`Generated: public/styles.css (${Math.round(finalCSS.length / 1024)}kb)`);
  }

  console.log('Done!');
}

main();