// tests/integration/seo.test.ts
// Post-build integration tests: verifies that SEO meta tags are present in
// key built HTML pages. Run AFTER `npm run build` via `npm run test:integration`.
//
// Teaching note: we read files from `dist/` using Node's fs module, then
// load them into cheerio (a jQuery-like HTML parser) to query the DOM.
// This catches silent regressions — e.g. Layout.astro changes that accidentally
// remove the og:image tag won't be caught by unit tests, but will fail here.

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

function assertSeoByCherio(label: string, $: ReturnType<typeof cheerio.load> | null) {
  if (!$) {
    return; // page doesn't exist yet (e.g. contact, cv) — skip silently
  }

  describe(label, () => {
    it('has a non-empty <title>', () => {
      expect($('title').text().trim()).toBeTruthy();
    });

    it('has a non-empty <meta name="description">', () => {
      expect($('meta[name="description"]').attr('content')?.trim()).toBeTruthy();
    });

    it('has <meta property="og:title">', () => {
      expect($('meta[property="og:title"]').attr('content')?.trim()).toBeTruthy();
    });

    it('has <meta property="og:description">', () => {
      expect($('meta[property="og:description"]').attr('content')?.trim()).toBeTruthy();
    });

    it('has <meta property="og:image"> with a URL', () => {
      const ogImage = $('meta[property="og:image"]').attr('content');
      expect(ogImage).toBeTruthy();
      expect(ogImage).toMatch(/^https?:\/\//);
    });

    it('has <meta property="og:type">', () => {
      expect($('meta[property="og:type"]').attr('content')?.trim()).toBeTruthy();
    });

    it('has <meta name="twitter:card">', () => {
      expect($('meta[name="twitter:card"]').attr('content')?.trim()).toBeTruthy();
    });

    it('has <link rel="canonical"> with an absolute URL', () => {
      const canonical = $('link[rel="canonical"]').attr('href');
      expect(canonical).toBeTruthy();
      expect(canonical).toMatch(/^https:\/\//);
    });
  });
}

// Inline assertions for pages that must exist (the build would have failed otherwise)
describe('SEO meta tags — required pages', () => {
  it('dist/ exists (build completed)', () => {
    expect(existsSync(dist)).toBe(true);
    expect(existsSync(resolve(dist, 'index.html'))).toBe(true);
  });
});

// ─── Index page ──────────────────────────────────────────────────────────────

const $index = loadPage('index.html');
assertSeoByCherio('index.html — SEO tags', $index);

// ─── About page ──────────────────────────────────────────────────────────────

const $about = loadPage('about/index.html');
assertSeoByCherio('about/index.html — SEO tags', $about);

// ─── Contact page (skipped until implemented) ────────────────────────────────

const $contact = loadPage('contact/index.html');
assertSeoByCherio('contact/index.html — SEO tags', $contact);

// ─── CV page (skipped until implemented) ─────────────────────────────────────

const $cv = loadPage('cv/index.html');
assertSeoByCherio('cv/index.html — SEO tags', $cv);

// ─── Published project page ───────────────────────────────────────────────────

const $project = loadPage('photos/Loop/index.html');
assertSeoByCherio('photos/Loop/index.html — SEO tags', $project);
