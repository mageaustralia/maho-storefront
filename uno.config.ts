/**
 * Maho Storefront
 * Copyright (c) 2026 Mage Australia Pty Ltd
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * UnoCSS Configuration — DaisyUI + Multi-Theme
 *
 * Maps theme*.json design tokens to:
 * 1. DaisyUI themes (via CSS custom properties — DaisyUI v5 is CSS-only)
 * 2. UnoCSS theme (utility classes — based on default theme)
 * 3. CSS custom properties (default in :root, others scoped to [data-theme])
 *
 * Preflights: DaisyUI CSS + all theme variables + base reset
 * Legacy CSS: included as preflights during transition
 */

import { defineConfig, presetUno } from 'unocss';
import { presetTypography } from '@unocss/preset-typography';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import storesConfig from './stores.json';
import paletteThemes from './palette-themes.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default theme config — used for UnoCSS utility class generation
const themeConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'themes', storesConfig.defaultTheme, 'theme.json'), 'utf8'));

// ---------------------------------------------------------------------------
// Load all theme files dynamically
// ---------------------------------------------------------------------------

interface ThemeFile {
  name: string;       // e.g. "maho", "tech", "brew-beyond"
  config: typeof themeConfig;
}

function loadAllThemes(): ThemeFile[] {
  const themes: ThemeFile[] = [];
  // Build a set of theme names from stores.json
  const themeNames = new Set<string>();
  themeNames.add(storesConfig.defaultTheme);
  for (const store of Object.values(storesConfig.stores) as Array<{ theme: string }>) {
    themeNames.add(store.theme);
  }

  // Pre-baked palette theme names (CSS-only, no theme.json needed)
  const paletteNames = new Set(paletteThemes.themes.map((t: { name: string }) => t.name));

  for (const name of themeNames) {
    if (paletteNames.has(name)) continue; // Handled by generatePaletteThemes()
    const filePath = path.join(__dirname, 'themes', name, 'theme.json');
    if (fs.existsSync(filePath)) {
      themes.push({ name, config: JSON.parse(fs.readFileSync(filePath, 'utf8')) });
    } else {
      console.warn(`Theme not found: themes/${name}/theme.json (referenced in stores.json)`);
    }
  }
  return themes;
}

const allThemes = loadAllThemes();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

// ---------------------------------------------------------------------------
// DaisyUI CSS (loaded from node_modules)
// ---------------------------------------------------------------------------

function loadDaisyUI(): string {
  // DaisyUI v5 CSS uses @layer and CSS nesting natively.
  // Modern browsers support both. We load it as-is.
  // UnoCSS utility classes (not in any layer) automatically override
  // DaisyUI's layered styles due to cascade layer priority.
  const daisyPath = path.join(__dirname, 'node_modules', 'daisyui', 'daisyui.css');
  const themesPath = path.join(__dirname, 'node_modules', 'daisyui', 'themes.css');
  if (!fs.existsSync(daisyPath)) {
    console.warn('DaisyUI CSS not found at', daisyPath, '— run npm install');
    return '';
  }
  let css = fs.readFileSync(daisyPath, 'utf8');

  // Load only the DaisyUI built-in themes referenced in stores.json
  // (preflights aren't tree-shaken, so we extract just what we need)
  if (fs.existsSync(themesPath)) {
    const allStoreThemes = new Set<string>();
    for (const store of Object.values(storesConfig.stores) as Array<{ theme: string }>) {
      allStoreThemes.add(store.theme);
    }
    allStoreThemes.add(storesConfig.defaultTheme);

    // Known palette themes (from palette-themes.json) — skip these, they're generated separately
    const paletteNames = new Set(paletteThemes.themes.map((t: { name: string }) => t.name));

    // DaisyUI built-in themes needed = store themes that aren't palette themes or json-based themes
    const themeFileNames = new Set(allThemes.map(t => t.name));
    const builtinNeeded = [...allStoreThemes].filter(t => !paletteNames.has(t) && !themeFileNames.has(t) && t !== 'light' && t !== 'dark');

    if (builtinNeeded.length > 0) {
      const themesCSS = fs.readFileSync(themesPath, 'utf8');
      for (const name of builtinNeeded) {
        // Extract the [data-theme=name]{...} block
        const regex = new RegExp(`\\[data-theme=${name}\\]\\{[^}]+\\}`, 'g');
        const match = themesCSS.match(regex);
        if (match) {
          css += '\n' + match.join('\n');
        } else {
          // Try the :root:has(input.theme-controller[value=name]:checked) pattern
          const altRegex = new RegExp(`:root:has\\(input\\.theme-controller\\[value=${name}\\]:checked\\),\\[data-theme=${name}\\]\\{[^}]+\\}`, 'g');
          const altMatch = themesCSS.match(altRegex);
          if (altMatch) {
            css += '\n' + altMatch.join('\n');
          } else {
            console.warn(`DaisyUI theme "${name}" not found in themes.css`);
          }
        }
      }
    }
  }

  return css;
}

// ---------------------------------------------------------------------------
// DaisyUI Theme (CSS custom properties for the "maho" theme)
// Maps theme.json colors to DaisyUI's oklch-based color system.
// DaisyUI v5 uses oklch colors, but hex fallbacks work too.
// ---------------------------------------------------------------------------

function generateDaisyThemeForOne(themeName: string, tc: typeof themeConfig): string {
  return `
[data-theme="${themeName}"] {
  --color-primary: ${tc.colors.accent};
  --color-primary-content: #ffffff;
  --color-secondary: ${tc.colors.primary};
  --color-secondary-content: #ffffff;
  --color-accent: ${tc.colors.accentLight};
  --color-accent-content: ${tc.colors.accent};
  --color-neutral: ${tc.colors.text};
  --color-neutral-content: #ffffff;
  --color-base-100: ${tc.colors.bg};
  --color-base-200: ${tc.colors.bgSubtle};
  --color-base-300: ${tc.colors.bgMuted};
  --color-base-content: ${tc.colors.text};
  --color-info: #3b82f6;
  --color-info-content: #ffffff;
  --color-success: ${tc.colors.success};
  --color-success-content: #ffffff;
  --color-warning: #f59e0b;
  --color-warning-content: #ffffff;
  --color-error: ${tc.colors.error};
  --color-error-content: #ffffff;
  --radius-selector: ${tc.radii.sm};
  --radius-field: ${tc.radii[tc.components.inputs.borderRadius as keyof typeof tc.radii]};
  --radius-box: ${tc.radii.sm};
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 1px;
  --depth: 1;
  --noise: 0;
}`;
}

function generateAllDaisyThemes(): string {
  return allThemes.map(t => generateDaisyThemeForOne(t.name, t.config)).join('\n').trim();
}

// ---------------------------------------------------------------------------
// Pre-baked Color Themes (palette-themes.json → DaisyUI themes)
// ---------------------------------------------------------------------------

function generatePaletteThemes(): string {
  return paletteThemes.themes.map(t => `
[data-theme="${t.name}"] {
  --color-primary: ${t.primary};
  --color-primary-content: ${luminanceOf(t.primary) < 0.55 ? '#ffffff' : '#1f2937'};
  --color-secondary: ${t.secondary};
  --color-secondary-content: ${luminanceOf(t.secondary) < 0.55 ? '#ffffff' : '#1f2937'};
  --color-accent: ${t.accent};
  --color-accent-content: ${luminanceOf(t.accent) < 0.55 ? '#ffffff' : '#1f2937'};
  --color-neutral: ${t.neutral};
  --color-neutral-content: #ffffff;
  --color-base-100: ${t['base-100']};
  --color-base-200: ${t['base-200']};
  --color-base-300: ${t['base-300']};
  --color-base-content: ${t['base-content']};
  --color-info: #3b82f6;
  --color-info-content: #ffffff;
  --color-success: #10b981;
  --color-success-content: #ffffff;
  --color-warning: #f59e0b;
  --color-warning-content: #ffffff;
  --color-error: #ef4444;
  --color-error-content: #ffffff;
  --radius-selector: 8px;
  --radius-field: 8px;
  --radius-box: 8px;
  --size-selector: 0.25rem;
  --size-field: 0.25rem;
  --border: 1px;
  --depth: 1;
  --noise: 0;
}`).join('\n').trim();
}

function luminanceOf(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// ---------------------------------------------------------------------------
// CSS Custom Properties (replaces build-theme.js _variables.css generation)
// ---------------------------------------------------------------------------

function generateCSSVarsForTheme(tc: typeof themeConfig): string[] {
  const lines: string[] = [];

  // Colors — skip keys that clash with DaisyUI's semantic system
  const daisyColorKeys = new Set(['primary', 'primaryLight', 'success', 'error', 'accent', 'accentHover', 'accentLight']);
  lines.push('  /* Colors */');
  for (const [key, value] of Object.entries(tc.colors)) {
    if (daisyColorKeys.has(key)) continue;
    lines.push(`  --color-${kebabCase(key)}: ${value};`);
  }
  // Accent aliases — reference DaisyUI primary so they adapt to any theme
  lines.push('  --color-accent: var(--color-primary);');
  lines.push('  --color-accent-hover: var(--color-primary);');
  lines.push('  --color-accent-light: color-mix(in srgb, var(--color-primary) 10%, transparent);');

  // Fonts
  lines.push('  /* Fonts */');
  lines.push(`  --font-sans: ${tc.fonts.sans};`);
  lines.push(`  --font-mono: ${tc.fonts.mono};`);
  lines.push(`  --font-heading: ${tc.fonts.heading};`);

  // Typography
  lines.push('  /* Typography */');
  const t = tc.typography;
  lines.push(`  --font-size-root: ${t.baseFontSize};`);
  lines.push(`  --line-height-base: ${t.baseLineHeight};`);
  lines.push(`  --font-size-h1: ${t.h1Size};`);
  lines.push(`  --font-size-h2: ${t.h2Size};`);
  lines.push(`  --font-size-h3: ${t.h3Size};`);
  lines.push(`  --font-size-h4: ${t.h4Size};`);
  lines.push(`  --letter-spacing: ${t.letterSpacing};`);
  lines.push(`  --font-weight-heading: ${t.headingWeight};`);
  lines.push(`  --font-weight-body: ${t.bodyWeight};`);
  for (const [key, value] of Object.entries(t)) {
    if (key.startsWith('fontSize')) {
      lines.push(`  --font-size-${kebabCase(key.replace('fontSize', ''))}: ${value};`);
    }
  }

  // Space scale
  lines.push('  /* Space Scale */');
  for (const [key, value] of Object.entries(tc.space)) {
    lines.push(`  --sp-${key.replace('.', '-')}: ${value};`);
  }

  // Breakpoints
  lines.push('  /* Breakpoints */');
  for (const [key, value] of Object.entries(tc.breakpoints)) {
    lines.push(`  --breakpoint-${key}: ${value};`);
  }

  // Sizes
  lines.push('  /* Sizes */');
  for (const [key, value] of Object.entries(tc.sizes)) {
    lines.push(`  --size-${kebabCase(key)}: ${value};`);
  }

  // Borders
  lines.push('  /* Borders */');
  for (const [key, value] of Object.entries(tc.borders)) {
    lines.push(`  --border-${kebabCase(key)}: ${value};`);
  }

  // Radii
  lines.push('  /* Border Radii */');
  for (const [key, value] of Object.entries(tc.radii)) {
    lines.push(`  --radius-${key}: ${value};`);
  }

  // Shadows
  lines.push('  /* Shadows */');
  for (const [key, value] of Object.entries(tc.shadows)) {
    lines.push(`  --shadow-${key}: ${value};`);
  }

  // Transitions
  lines.push('  /* Transitions */');
  for (const [key, value] of Object.entries(tc.transitions)) {
    lines.push(`  --transition-${key}: ${value};`);
  }

  // Component tokens
  lines.push('  /* Component Tokens */');
  const btn = tc.components.buttons;
  const radiiKey = btn.borderRadius as keyof typeof tc.radii;
  lines.push(`  --btn-radius: ${tc.radii[radiiKey] || btn.borderRadius};`);
  lines.push(`  --btn-text-transform: ${btn.textTransform};`);
  lines.push(`  --btn-font-weight: ${btn.fontWeight};`);
  lines.push(`  --btn-padding: ${btn.padding};`);

  const card = tc.components.cards;
  const cardRadii = card.borderRadius as keyof typeof tc.radii;
  lines.push(`  --card-radius: ${tc.radii[cardRadii] || card.borderRadius};`);
  lines.push(`  --card-shadow: ${card.shadow === 'none' ? 'none' : tc.shadows[card.shadow as keyof typeof tc.shadows] || 'none'};`);
  const hoverKey = card.hoverShadow as keyof typeof tc.shadows;
  lines.push(`  --card-hover-shadow: ${tc.shadows[hoverKey] || 'none'};`);

  const badge = tc.components.badges;
  const badgeRadii = badge.borderRadius as keyof typeof tc.radii;
  lines.push(`  --badge-radius: ${tc.radii[badgeRadii] || badge.borderRadius};`);
  lines.push(`  --badge-text-transform: ${badge.textTransform};`);
  lines.push(`  --badge-font-size: ${badge.fontSize};`);
  lines.push(`  --badge-font-weight: ${badge.fontWeight};`);

  const input = tc.components.inputs;
  const inputRadii = input.borderRadius as keyof typeof tc.radii;
  lines.push(`  --input-radius: ${tc.radii[inputRadii] || input.borderRadius};`);

  return lines;
}

function generateAllCSSVariables(): string {
  const sections: string[] = [];

  for (const theme of allThemes) {
    const vars = generateCSSVarsForTheme(theme.config);
    if (theme.name === storesConfig.defaultTheme) {
      // Default theme goes in :root
      sections.push(`:root {\n${vars.join('\n')}\n  /* Legacy Aliases */\n  --header-height: var(--size-header-height);\n  --content-max: var(--size-content-max);\n  --content-padding: var(--size-content-padding);\n}`);
    } else {
      // Other themes scoped to data-theme attribute
      sections.push(`[data-theme="${theme.name}"] {\n${vars.join('\n')}\n  /* Legacy Aliases */\n  --header-height: var(--size-header-height);\n  --content-max: var(--size-content-max);\n  --content-padding: var(--size-content-padding);\n}`);
    }
  }

  return sections.join('\n\n');
}

// ---------------------------------------------------------------------------
// Base Reset
// ---------------------------------------------------------------------------

function generateBaseReset(): string {
  return `
*, *::before, *::after { box-sizing: border-box; }
body, h1, h2, h3, h4, h5, h6, p, ul, ol, figure, blockquote, fieldset, legend { margin: 0; padding: 0; }
html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; scroll-behavior: smooth; scroll-padding-top: calc(var(--header-actual-height, var(--header-height)) + 1rem); }
body {
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}
img { max-width: 100%; height: auto; display: block; }
a { text-decoration: none; transition: color var(--transition-fast); }
button:not(.btn):not(.tab):not(.badge):not([class*="join-item"]):not(.swatch-btn):not(.qty-btn):not(.gallery-arrow):not(.fullscreen-arrow):not(.gallery-zoom-btn) { font-family: inherit; font-size: inherit; cursor: pointer; border: none; background: none; }
button.btn, button.tab, button[class*="join-item"] { font-family: inherit; font-size: inherit; cursor: pointer; }
input, select { font-family: inherit; font-size: inherit; }
input[type="range"] { border: none; background: transparent; box-shadow: none; padding: 0; min-height: 0; }
.input, .select, textarea.textarea { background-color: color-mix(in srgb, var(--color-base-content) 10%, var(--color-base-100)) !important; border-color: color-mix(in srgb, var(--color-base-content) 25%, transparent) !important; }
[data-controller="cart-drawer"].open,
[data-controller="mobile-menu"].open,
[data-category-filter-target="filterDrawer"].open { display: flex !important; }
.account-tab.active { color: var(--color-primary); }
h1, h2, h3, h4, h5, h6 { line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; }
ul:not(.prose ul):not(.prose ol) { list-style: none; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
.main-content { min-height: calc(100vh - var(--header-height) - 200px); max-width: var(--content-max); margin: 0 auto; padding: 0 var(--content-padding); }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
.turbo-progress-bar { height: 2px; background: var(--color-accent); }
/* CMS block: category tiles */
.catblocks { display: flex; gap: 1rem; list-style: none; padding: 0; margin: 1.5rem 0 0; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.catblocks::-webkit-scrollbar { display: none; }
.catblocks li { flex: 0 0 calc(25% - 0.75rem); min-width: 0; scroll-snap-align: start; }
.catblocks li a { display: flex; flex-direction: column; border: 1px solid var(--color-border); border-radius: var(--radius-sm); overflow: hidden; transition: box-shadow 0.2s; text-decoration: none; color: inherit; }
.catblocks li a:hover { box-shadow: var(--shadow-md); }
.catblocks li img { width: 100%; aspect-ratio: 4/3; object-fit: cover; }
.catblocks li span { padding: 0.75rem; text-align: center; font-size: 0.875rem; font-weight: 500; }
@media (max-width: 768px) { .catblocks li { flex: 0 0 calc(50% - 0.5rem); } }
.search-overlay { position: fixed; inset: 0; z-index: 1100; background: rgba(15,23,42,0.5); backdrop-filter: blur(4px); opacity: 0; visibility: hidden; transition: opacity 0.2s, visibility 0.2s; display: flex; flex-direction: column; align-items: stretch; }
.search-overlay.open { opacity: 1; visibility: visible; }

/* Filter details (category sidebar + drawer) — plain <details> instead of DaisyUI collapse */
.filter-details { border: none; }
.filter-details > .filter-summary {
  display: flex; align-items: center; justify-content: space-between;
  font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.875rem;
  padding: 0.5rem 0; cursor: pointer; list-style: none; user-select: none;
}
.filter-details > .filter-summary::-webkit-details-marker { display: none; }
.filter-details > .filter-summary::after {
  content: ''; display: block; width: 0.5rem; height: 0.5rem;
  border-right: 2px solid currentColor; border-bottom: 2px solid currentColor;
  transform: rotate(45deg); transition: transform 0.2s ease;
  flex-shrink: 0; margin-left: 0.5rem;
}
.filter-details[open] > .filter-summary::after { transform: rotate(-135deg); }
.filter-details-content { padding: 0.25rem 0 0.5rem; }

/* Price range dual-slider (category filter) */
.price-range-slider { position: relative; height: 2.5rem; display: flex; align-items: center; }
.price-range-slider input[type="range"] { position: absolute; width: 100%; height: 2.5rem; appearance: none; background: transparent; pointer-events: none; outline: none; z-index: 2; margin: 0; padding: 0; }
.price-range-slider input.range-max { z-index: 1; }
.price-range-slider input.range-min { z-index: 3; }
.price-range-slider input[type="range"]::-webkit-slider-runnable-track { height: 4px; background: oklch(0.869 0.022 252.89); border-radius: 2px; }
.price-range-slider input.range-min::-webkit-slider-runnable-track { background: transparent; }
.price-range-slider input[type="range"]::-webkit-slider-thumb { appearance: none; width: 1.25rem; height: 1.25rem; border-radius: 50%; background: var(--color-primary, oklch(0.623 0.214 259.53)); border: 2px solid oklch(1 0 0); box-shadow: 0 1px 4px rgba(0,0,0,0.2); cursor: pointer; pointer-events: auto; margin-top: -8px; position: relative; z-index: 3; transition: transform 0.15s ease; }
.price-range-slider input[type="range"]::-webkit-slider-thumb:hover { transform: scale(1.15); }
.price-range-slider input[type="range"]::-moz-range-track { height: 4px; background: oklch(0.869 0.022 252.89); border-radius: 2px; border: none; }
.price-range-slider input.range-min::-moz-range-track { background: transparent; }
.price-range-slider input[type="range"]::-moz-range-thumb { width: 1.25rem; height: 1.25rem; border-radius: 50%; background: var(--color-primary, oklch(0.623 0.214 259.53)); border: 2px solid oklch(1 0 0); box-shadow: 0 1px 4px rgba(0,0,0,0.2); cursor: pointer; pointer-events: auto; }

/* Shared pricing classes */
.price-current { font-size: var(--font-size-md); font-weight: 700; color: var(--color-primary); }
.price-was { font-size: var(--font-size-base); color: var(--color-text-muted); text-decoration: line-through; }
.price-now { font-size: var(--font-size-md); font-weight: 700; color: var(--color-sale); }

/* Star ratings */
.stars { --percent: calc(var(--rating, 0) / 5 * 100%); display: inline-block; font-size: var(--font-size-base); letter-spacing: 1px; background: linear-gradient(90deg, #f59e0b var(--percent), var(--color-border) var(--percent)); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; }
.review-count { font-size: var(--font-size-sm); color: var(--color-text-muted); }


/* Scrollbar hide utility */
.scrollbar-none { scrollbar-width: none; -ms-overflow-style: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
`.trim();
}

// ---------------------------------------------------------------------------
// Product Page CSS (extracted from legacy product.css + responsive.css)
// These are complex component styles that can't reasonably be utility classes.
// Phase 4 component variants will replace these with scoped component CSS.
// ---------------------------------------------------------------------------

function generateProductPageCSS(): string {
  const cssDir = path.join(__dirname, 'src', 'css');
  const parts: string[] = [];
  // Load all CSS files from src/css/ (skip _ prefixed partials)
  const files = fs.readdirSync(cssDir)
    .filter(f => f.endsWith('.css') && !f.startsWith('_'))
    .sort();
  for (const file of files) {
    parts.push(fs.readFileSync(path.join(cssDir, file), 'utf8'));
  }
  return parts.join('\n');
}

// ---------------------------------------------------------------------------
// UnoCSS Theme (maps theme.json to utility classes)
// ---------------------------------------------------------------------------

const colors: Record<string, string> = {};
for (const [key, value] of Object.entries(themeConfig.colors)) {
  colors[kebabCase(key)] = value as string;
}

// DaisyUI semantic colors — use CSS variables so multi-theme [data-theme] works.
// UnoCSS needs actual color values for opacity modifiers (bg-primary/10 etc.),
// so we provide default theme values here. The custom rules below override
// the non-opacity variants (bg-primary, text-primary etc.) with CSS vars,
// ensuring [data-theme] switching works correctly.
colors['primary'] = { DEFAULT: themeConfig.colors.accent, content: '#ffffff' } as any;
colors['secondary'] = { DEFAULT: themeConfig.colors.primary, content: '#ffffff' } as any;
colors['neutral'] = { DEFAULT: themeConfig.colors.text, content: '#ffffff' } as any;
colors['base'] = {
  100: themeConfig.colors.bg,
  200: themeConfig.colors.bgSubtle,
  300: themeConfig.colors.bgMuted,
  content: themeConfig.colors.text,
} as any;
colors['info'] = { DEFAULT: '#3b82f6', content: '#ffffff' } as any;
colors['warning'] = { DEFAULT: '#f59e0b', content: '#ffffff' } as any;
colors['success'] = { DEFAULT: themeConfig.colors.success, content: '#ffffff' } as any;
colors['error'] = { DEFAULT: themeConfig.colors.error, content: '#ffffff' } as any;

// ---------------------------------------------------------------------------
// DaisyUI semantic color overrides — CSS variable-based preflight
// UnoCSS generates static hex values for bg-primary, text-primary etc.
// This preflight adds higher-specificity CSS var overrides so [data-theme]
// switching works. Opacity variants (bg-primary/10) keep static values.
// ---------------------------------------------------------------------------

function generateSemanticColorOverrides(): string {
  const semanticColors = ['primary', 'secondary', 'accent', 'neutral', 'info', 'success', 'warning', 'error'];
  const baseColors = ['base-100', 'base-200', 'base-300'];
  const lines: string[] = ['/* Semantic color overrides — CSS vars for multi-theme support */'];

  // Solid color overrides
  for (const c of semanticColors) {
    lines.push(`.bg-${c} { background-color: var(--color-${c}) !important; }`);
    lines.push(`.text-${c} { color: var(--color-${c}) !important; }`);
    lines.push(`.text-${c}-content { color: var(--color-${c}-content) !important; }`);
    lines.push(`.border-${c} { border-color: var(--color-${c}) !important; }`);
  }
  for (const c of baseColors) {
    lines.push(`.bg-${c} { background-color: var(--color-${c}) !important; }`);
    lines.push(`.border-${c} { border-color: var(--color-${c}) !important; }`);
  }
  lines.push(`.text-base-content { color: var(--color-base-content) !important; }`);
  lines.push(`.border-base-content { border-color: var(--color-base-content) !important; }`);

  // Opacity variant overrides using color-mix() — covers all bg-{color}/{opacity}
  // and text-{color}/{opacity} patterns used in the codebase.
  // color-mix(in srgb, var(--color-X) N%, transparent) achieves the same as hex/N%.
  const allColors = [...semanticColors, ...baseColors, 'base-content'];
  const opacities = [5, 8, 10, 30, 40, 50, 60, 70, 80, 90, 95];
  for (const c of allColors) {
    for (const op of opacities) {
      const varName = `var(--color-${c})`;
      // bg-{color}/{opacity} — UnoCSS uses \/ for the slash
      lines.push(`.bg-${c}\\/${op} { background-color: color-mix(in srgb, ${varName} ${op}%, transparent) !important; }`);
    }
  }
  // Text opacity variants (less common but used: text-base-content/70 etc.)
  for (const c of allColors) {
    for (const op of opacities) {
      const varName = `var(--color-${c})`;
      lines.push(`.text-${c}\\/${op} { color: color-mix(in srgb, ${varName} ${op}%, transparent) !important; }`);
    }
  }
  // Border opacity variants
  for (const c of allColors) {
    for (const op of opacities) {
      const varName = `var(--color-${c})`;
      lines.push(`.border-${c}\\/${op} { border-color: color-mix(in srgb, ${varName} ${op}%, transparent) !important; }`);
    }
  }
  // hover: variants for the commonly used patterns
  for (const c of allColors) {
    for (const op of opacities) {
      const varName = `var(--color-${c})`;
      lines.push(`.hover\\:bg-${c}\\/${op}:hover { background-color: color-mix(in srgb, ${varName} ${op}%, transparent) !important; }`);
    }
  }
  // has-[:checked] variant for payment block
  lines.push(`.has-\\[\\:checked\\]\\:bg-primary\\/5:has(:checked) { background-color: color-mix(in srgb, var(--color-primary) 5%, transparent) !important; }`);

  return lines.join('\n');
}

const spacing: Record<string, string> = {};
for (const [key, value] of Object.entries(themeConfig.space)) {
  spacing[key.replace('.', '-')] = value;
}

// ---------------------------------------------------------------------------
// Export Config
// ---------------------------------------------------------------------------

export default defineConfig({
  presets: [
    presetUno(),
    presetTypography({
      cssExtend: {
        'h1,h2,h3,h4,h5,h6': {
          'font-family': 'var(--font-heading)',
        },
        'code': {
          'background-color': 'var(--color-base-200, oklch(0.967 0.003 264.54))',
          'padding': '0.125rem 0.375rem',
          'border-radius': '0.25rem',
          'font-size': '0.875em',
        },
        'pre code': {
          'background-color': 'transparent',
          'padding': '0',
          'color': 'inherit',
        },
        'pre': {
          'background-color': 'var(--color-base-200, oklch(0.967 0.003 264.54))',
          'color': 'var(--color-base-content, oklch(0.278 0.033 256.85))',
          'border-radius': '0.5rem',
          'padding': '1rem',
          'overflow-x': 'auto',
        },
        'table': {
          'width': '100%',
        },
        'th,td': {
          'padding': '0.5rem 0.75rem',
          'border-bottom': '1px solid var(--color-border, oklch(0.869 0.022 252.89))',
        },
        'th': {
          'font-weight': '600',
          'text-align': 'left',
        },
      },
    }),
  ],

  preflights: [
    { getCSS: () => loadDaisyUI() },
    { getCSS: () => generateAllDaisyThemes() },
    { getCSS: () => generatePaletteThemes() },
    { getCSS: () => generateAllCSSVariables() },
    { getCSS: () => generateBaseReset() },
    { getCSS: () => generateProductPageCSS() },
    { getCSS: () => generateSemanticColorOverrides() },
  ],

  theme: {
    colors,
    spacing,
    fontFamily: {
      sans: themeConfig.fonts.sans,
      mono: themeConfig.fonts.mono,
      heading: themeConfig.fonts.heading,
    },
    breakpoints: { ...themeConfig.breakpoints },
    borderRadius: { ...themeConfig.radii },
    boxShadow: { ...themeConfig.shadows },
    maxWidth: {
      content: themeConfig.sizes.contentMax,
      form: themeConfig.sizes.formMaxWidth,
      'form-lg': themeConfig.sizes.formMaxWidthLg,
    },
    height: {
      header: themeConfig.sizes.headerHeight,
      'header-mobile': themeConfig.sizes.headerHeightMobile,
      input: themeConfig.sizes.inputHeight,
      'input-sm': themeConfig.sizes.inputHeightSm,
      btn: themeConfig.sizes.buttonHeight,
      'btn-sm': themeConfig.sizes.buttonHeightSm,
    },
    width: {
      drawer: themeConfig.sizes.drawerWidth,
      'drawer-mobile': themeConfig.sizes.drawerWidthMobile,
      sidebar: themeConfig.sizes.sidebarWidth,
    },
  },

  shortcuts: {
    'content-container': 'max-w-content mx-auto px-5',
  },

  // Safelist: utility classes used in dynamic CMS/widget content (not in scanned source files)
  // These come from PHP templates rendered server-side (e.g., Custom_Carousel widget.phtml)
  safelist: [
    // DaisyUI carousel component classes
    'carousel', 'carousel-item', 'carousel-center', 'rounded-box',
    // Layout & positioning (carousel overlays)
    'relative', 'absolute', 'w-full', 'inset-0',
    'flex', 'flex-col', 'flex-wrap', 'gap-2', 'gap-3',
    'justify-start', 'justify-center', 'justify-end',
    'items-start', 'items-center', 'items-end',
    'text-left', 'text-center', 'text-right',
    // Typography (slide text overlays)
    'text-white', 'text-black', 'text-primary', 'text-secondary', 'text-accent', 'text-neutral', 'text-base-content',
    'text-3xl', 'text-lg', 'font-bold', 'mb-2', 'mb-4',
    // Buttons (slide CTAs + nav arrows)
    'btn', 'btn-circle', 'btn-primary', 'btn-secondary', 'btn-accent', 'btn-outline', 'btn-ghost', 'btn-neutral',
    'btn-xs', 'btn-sm', 'btn-md',
    // Arrow positioning (inside each slide)
    'left-3', 'right-3', 'top-1/2', '-translate-y-1/2', 'transform', 'justify-between',
    'z-10', 'pointer-events-none', 'pointer-events-auto',
    // Responsive arrow sizes
    'md:btn-md',
    // Images & containers
    'object-cover', 'overflow-hidden',
    'py-4',
    // Colors with ! prefix and hover variants
    'bg-black', '!bg-white', '!text-black', 'hover:!bg-white/80',
    // CMS content — common utility classes
    'text-white', 'text-black', 'bg-black',
  ],

  content: {
    filesystem: [
      'src/**/*.tsx',
      'src/**/*.ts',
      'src/**/*.js',
    ],
  },
});