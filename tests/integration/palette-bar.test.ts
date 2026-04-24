// tests/integration/palette-bar.test.ts
// Post-build integration tests: verifies the horizontal color palette bar
// renders correctly inside .media-image-group on photo, textbook, and paper
// project pages. Run AFTER `npm run build` via `npm run test:integration`.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import * as cheerio from 'cheerio';

const dist = resolve(process.cwd(), 'dist');

function loadPage(relativePath: string): ReturnType<typeof cheerio.load> | null {
  const filePath = resolve(dist, relativePath);
  if (!existsSync(filePath)) return null;
  const html = readFileSync(filePath, 'utf8');
  return cheerio.load(html);
}

// ─── Shared assertions ────────────────────────────────────────────────────────

function assertPaletteBarStructure(
  label: string,
  pagePath: string,
) {
  describe(label, () => {
    const $ = loadPage(pagePath);

    it('page built successfully', () => {
      expect($).not.toBeNull();
    });

    it('has at least one .media-image-group', () => {
      expect($).not.toBeNull();
      expect($!('.media-image-group').length).toBeGreaterThan(0);
    });

    it('has at least one .media-image-group with data-has-dims="1"', () => {
      expect($).not.toBeNull();
      expect($!('.media-image-group[data-has-dims="1"]').length).toBeGreaterThan(0);
    });

    it('group with data-has-dims="1" has --img-w and --img-h in inline style', () => {
      expect($).not.toBeNull();
      const group = $!('.media-image-group[data-has-dims="1"]').first();
      const style = group.attr('style') ?? '';
      expect(style).toContain('--img-w');
      expect(style).toContain('--img-h');
    });

    it('.color-palette-bar is a descendant of .media-image-group', () => {
      expect($).not.toBeNull();
      expect($!('.media-image-group .color-palette-bar').length).toBeGreaterThan(0);
    });

    it('.media-info-strip is absent (regression guard for old DOM structure)', () => {
      expect($).not.toBeNull();
      expect($!('.media-info-strip').length).toBe(0);
    });
  });
}

// ─── Published project pages (palette bar expected) ───────────────────────────

assertPaletteBarStructure(
  'palette bar — photos/Loop',
  'photos/Loop/index.html',
);

assertPaletteBarStructure(
  'palette bar — textbooks/Depths-of-Knowledge-Vol-5',
  'textbooks/Depths-of-Knowledge-Vol-5/index.html',
);

assertPaletteBarStructure(
  'palette bar — paper/Walton-Manor',
  'paper/Walton-Manor/index.html',
);

// ─── Placeholder page (no palette bar expected) ───────────────────────────────

describe('palette bar — photos/Face-Masks (placeholder, no bar expected)', () => {
  const $ = loadPage('photos/Face-Masks/index.html');

  it('page built successfully', () => {
    expect($).not.toBeNull();
  });

  it('has no .color-palette-bar (placeholder renders CatalogPlaceholderCard)', () => {
    expect($).not.toBeNull();
    expect($!('.color-palette-bar').length).toBe(0);
  });

  it('has no .media-image-group (placeholder has no media stream)', () => {
    expect($).not.toBeNull();
    expect($!('.media-image-group').length).toBe(0);
  });
});
