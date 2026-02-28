/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

#!/usr/bin/env node
/**
 * Split CSS into Component Files
 *
 * One-time script to split monolithic styles.css into component files.
 * Run once, then use build-theme.js for future builds.
 *
 * Usage: node scripts/split-css.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const CSS_IN = path.join(ROOT, 'public', 'styles.css');
const CSS_OUT = path.join(ROOT, 'src', 'css');

// Section mappings: CSS section name -> output file
const sectionMap = {
  // Base styles (extracted from top of file)
  'ACCESSIBILITY': '_reset.css',
  'RESET & BASE': '_reset.css',

  // Layout
  'HEADER': 'header.css',
  'MAIN CONTENT': '_base.css',
  'FOOTER': 'footer.css',
  'MOBILE MENU': 'navigation.css',

  // Home
  'HERO': 'home.css',
  'FEATURED CATEGORIES': 'home.css',
  'HOMEPAGE CMS CONTENT': 'home.css',

  // Products
  'PRODUCT GRID': 'product-grid.css',
  'PRICING': 'product-grid.css',
  'STAR RATINGS': 'product-grid.css',
  'BREADCRUMBS': 'navigation.css',

  // Category
  'CATEGORY PAGE': 'category.css',
  'PAGINATION': 'category.css',
  'CATEGORY BANNER IMAGE': 'category.css',
  'CATEGORY TITLE': 'category.css',
  'CATEGORY CMS BLOCK CONTENT': 'category.css',

  // Product page
  'PRODUCT PAGE': 'product.css',
  'FULLSCREEN GALLERY': 'product.css',
  'STICKY ADD-TO-CART': 'product.css',
  'PRODUCT OPTIONS': 'product.css',
  'ADD TO CART': 'product.css',
  'CONFIGURABLE SWATCHES': 'product.css',
  'GROUPED PRODUCTS': 'product.css',
  'BUNDLE OPTIONS': 'product.css',
  'DOWNLOADABLE LINKS': 'product.css',
  'CUSTOM OPTIONS': 'product.css',
  'GALLERY THUMBNAILS': 'product.css',
  'PRODUCT DESCRIPTION': 'product.css',
  'RELATED / CROSS-SELL PRODUCTS': 'product.css',
  'PRODUCT REVIEWS': 'product.css',

  // Cart
  'CART PAGE': 'cart.css',
  'CART DRAWER': 'cart.css',
  'CART PAGE — QTY STEPPER': 'cart.css',
  'OUT-OF-STOCK CART ITEMS': 'cart.css',

  // Checkout
  'CHECKOUT': 'checkout.css',

  // Account
  'AUTH PAGES': 'account.css',
  'ACCOUNT DASHBOARD': 'account.css',
  'WISHLIST': 'account.css',
  'ACCOUNT — MY REVIEWS': 'account.css',
  'HEADER ACCOUNT WIDGET': 'account.css',

  // Search
  'SEARCH OVERLAY': 'search.css',

  // CMS
  'BLOG': 'cms.css',
  'CMS PAGE': 'cms.css',
  'NOT FOUND': 'cms.css',

  // Utilities
  'LOADING & ANIMATION': 'utilities.css',
  'TURBO PROGRESS BAR': 'utilities.css',

  // Responsive
  'RESPONSIVE': 'responsive.css',
};

// Parse CSS into sections
function parseCSS(content) {
  const lines = content.split('\n');
  const sections = [];
  let currentSection = { name: 'TOP', lines: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for section header
    if (line.startsWith('/* ====') && lines[i + 1]) {
      // Save current section
      if (currentSection.lines.length > 0) {
        sections.push(currentSection);
      }

      // Extract section name from next line
      const nextLine = lines[i + 1].trim();
      const sectionName = nextLine.replace(/^\*?\s*/, '').replace(/\s*\*?$/, '').trim();

      currentSection = {
        name: sectionName,
        lines: [line],
      };
    } else {
      currentSection.lines.push(line);
    }
  }

  // Don't forget last section
  if (currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  return sections;
}

// Find output file for a section
function getOutputFile(sectionName) {
  // Direct match
  if (sectionMap[sectionName]) {
    return sectionMap[sectionName];
  }

  // Partial match
  for (const [key, file] of Object.entries(sectionMap)) {
    if (sectionName.startsWith(key) || sectionName.includes(key)) {
      return file;
    }
  }

  // Default based on content
  const lower = sectionName.toLowerCase();
  if (lower.includes('responsive') || lower.includes('tablet') || lower.includes('phone')) {
    return 'responsive.css';
  }
  if (lower.includes('product')) {
    return 'product.css';
  }
  if (lower.includes('cart')) {
    return 'cart.css';
  }
  if (lower.includes('checkout')) {
    return 'checkout.css';
  }
  if (lower.includes('account') || lower.includes('auth')) {
    return 'account.css';
  }

  return '_base.css';
}

// Main
function main() {
  console.log('Splitting CSS into component files...');

  if (!fs.existsSync(CSS_IN)) {
    console.error('Error: public/styles.css not found');
    process.exit(1);
  }

  // Ensure output directory
  if (!fs.existsSync(CSS_OUT)) {
    fs.mkdirSync(CSS_OUT, { recursive: true });
  }

  // Read and parse
  const content = fs.readFileSync(CSS_IN, 'utf8');
  const sections = parseCSS(content);

  console.log(`Found ${sections.length} sections`);

  // Group sections by output file
  const files = {};

  // Handle TOP section specially - extract variables, reset, base
  const topSection = sections.find(s => s.name === 'TOP');
  if (topSection) {
    const topContent = topSection.lines.join('\n');

    // Extract parts from TOP section
    const variablesEnd = topContent.indexOf('/* --- Accessibility ---');
    const resetStart = topContent.indexOf('/* --- Reset & Base ---');

    if (variablesEnd > 0) {
      // Variables will be regenerated by build-theme.js, skip them
      console.log('Skipping variables section (will be generated from theme.json)');
    }

    // Everything after @import and :root {} until first section header goes to _reset.css
    const resetContent = topContent.substring(topContent.indexOf('.sr-only'));
    if (resetContent) {
      files['_reset.css'] = resetContent;
    }

    // Remove TOP from sections
    sections.splice(sections.indexOf(topSection), 1);
  }

  // Process remaining sections
  for (const section of sections) {
    // Skip the first "Maho Storefront" header line
    if (section.name.includes('Maho Storefront') || section.name.includes('Fashion Demo')) {
      continue;
    }

    const outFile = getOutputFile(section.name);
    const sectionContent = section.lines.join('\n');

    if (!files[outFile]) {
      files[outFile] = '';
    }
    files[outFile] += sectionContent + '\n\n';
  }

  // Write files
  for (const [filename, content] of Object.entries(files)) {
    const outPath = path.join(CSS_OUT, filename);
    fs.writeFileSync(outPath, content.trim() + '\n');
    console.log(`Created: src/css/${filename} (${Math.round(content.length / 1024)}kb)`);
  }

  console.log('\nDone! Now run: npm run build:css');
}

main();