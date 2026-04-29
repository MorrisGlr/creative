// tests/integration/perf.test.ts
// Post-build integration tests: verifies that Core Web Vital optimizations
// are present in the built HTML. Run AFTER `npm run build` via `npm run test:integration`.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import * as cheerio from 'cheerio';

const dist = resolve(process.cwd(), 'dist');

function loadPage(relativePath: string) {
  const filePath = resolve(dist, relativePath);
  if (!existsSync(filePath)) return null;
  const html = readFileSync(filePath, 'utf8');
  return cheerio.load(html);
}

const catalogPages = [
  { label: 'photos index', path: 'photos/index.html' },
  { label: 'textbooks index', path: 'textbooks/index.html' },
  { label: 'paper index', path: 'paper/index.html' },
];

describe('LCP: catalog index pages', () => {
  for (const { label, path } of catalogPages) {
    const $ = loadPage(path);
    if (!$) continue;

    describe(label, () => {
      it('has <link rel="preload" as="image"> in <head> for the first cover image', () => {
        const preloads = $('head link[rel="preload"][as="image"]');
        expect(preloads.length).toBeGreaterThanOrEqual(1);
        const href = preloads.first().attr('href');
        expect(href).toBeTruthy();
        expect(href).toMatch(/\/_astro\//);
      });

      it('preload link points to a WebP asset', () => {
        const preload = $('head link[rel="preload"][as="image"]').first();
        expect(preload.attr('href')).toMatch(/\.webp$/);
        expect(preload.attr('type')).toBe('image/webp');
      });

      it('has exactly one eager-loaded cover image (the LCP candidate)', () => {
        const eagerImgs = $('img[loading="eager"]');
        expect(eagerImgs.length).toBe(1);
      });

      it('eager image has fetchpriority="high"', () => {
        const eagerImg = $('img[loading="eager"]');
        expect(eagerImg.attr('fetchpriority')).toBe('high');
      });

      it('eager image has decoding="sync"', () => {
        const eagerImg = $('img[loading="eager"]');
        expect(eagerImg.attr('decoding')).toBe('sync');
      });

      it('all other cover images remain lazy', () => {
        const lazyImgs = $('img[loading="lazy"]');
        expect(lazyImgs.length).toBeGreaterThan(0);
      });

      it('real cover images are wrapped in <picture> with a WebP <source>', () => {
        const webpSources = $('picture source[type="image/webp"]');
        expect(webpSources.length).toBeGreaterThan(0);
      });

      it('eager image is inside a <picture> element', () => {
        const eagerImg = $('img[loading="eager"]');
        const parent = eagerImg.parent();
        expect(parent.is('picture')).toBe(true);
      });
    });
  }
});

describe('CLS: home page', () => {
  const $ = loadPage('index.html');

  it('home page exists', () => {
    expect($).not.toBeNull();
  });

  if ($) {
    it('does not use JS to set minHeight on .home-stack (CLS fix)', () => {
      const scripts = $('script').map((_, el) => $(el).html() ?? '').get();
      const hasJsMinHeight = scripts.some(s => s.includes('minHeight') && s.includes('home-stack'));
      expect(hasJsMinHeight).toBe(false);
    });

    it('has CSS min-height on .home-stack via inline style block', () => {
      const styles = $('style').map((_, el) => $(el).html() ?? '').get();
      const hasCssMinHeight = styles.some(s => s.includes('home-stack') && s.includes('min-height'));
      expect(hasCssMinHeight).toBe(true);
    });
  }
});

describe('INP: media-visibility — no non-passive wheel handlers', () => {
  it('initStepSnapScroll is removed from source', () => {
    const srcPath = resolve(process.cwd(), 'src/scripts/media-visibility.ts');
    if (!existsSync(srcPath)) return;
    const src = readFileSync(srcPath, 'utf8');
    expect(src).not.toContain('initStepSnapScroll');
  });

  it('initScrollBrake is removed from source', () => {
    const srcPath = resolve(process.cwd(), 'src/scripts/media-visibility.ts');
    if (!existsSync(srcPath)) return;
    const src = readFileSync(srcPath, 'utf8');
    expect(src).not.toContain('initScrollBrake');
  });

  it('no passive:false wheel listeners remain in source', () => {
    const srcPath = resolve(process.cwd(), 'src/scripts/media-visibility.ts');
    if (!existsSync(srcPath)) return;
    const src = readFileSync(srcPath, 'utf8');
    const nonPassiveWheel = /addEventListener\(['"]wheel['"],\s*\w+,\s*\{\s*passive:\s*false/.test(src);
    expect(nonPassiveWheel).toBe(false);
  });
});
