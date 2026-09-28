// tests/integration/sitemap.test.ts
// Post-build integration tests: verifies that @astrojs/sitemap output and
// public/robots.txt are present and point at the production origin.
// Run AFTER `npm run build` via `npm run test:integration`.
//
// The sitemap is generated from `site` in astro.config.mjs — if that value
// drifts from the real domain, every <loc> will be wrong and search engines
// will be told to crawl a dead host. These tests catch that.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const dist = resolve(process.cwd(), 'dist');

// Production origin — must match `site` in astro.config.mjs.
const PROD_ORIGIN = 'https://mementomorris.art/';
const SITEMAP_INDEX_URL = `${PROD_ORIGIN}sitemap-index.xml`;

function readDist(relativePath: string): string {
  return readFileSync(resolve(dist, relativePath), 'utf8');
}

function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

describe('sitemap-index.xml', () => {
  it('exists in dist/', () => {
    expect(existsSync(resolve(dist, 'sitemap-index.xml'))).toBe(true);
  });

  it('lists at least one child sitemap, all on the production origin', () => {
    const locs = extractLocs(readDist('sitemap-index.xml'));
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) {
      expect(loc.startsWith(PROD_ORIGIN)).toBe(true);
    }
  });
});

describe('sitemap page entries', () => {
  // Collect <loc> entries from every child sitemap referenced by the index.
  const childFiles = existsSync(resolve(dist, 'sitemap-index.xml'))
    ? extractLocs(readDist('sitemap-index.xml')).map((loc) => loc.slice(PROD_ORIGIN.length))
    : [];
  const pageLocs = childFiles
    .filter((file) => existsSync(resolve(dist, file)))
    .flatMap((file) => extractLocs(readDist(file)));

  it('contains page entries', () => {
    expect(pageLocs.length).toBeGreaterThan(0);
  });

  it('every <loc> is on the production origin', () => {
    const offOrigin = pageLocs.filter((loc) => !loc.startsWith(PROD_ORIGIN));
    expect(offOrigin).toEqual([]);
  });

  it('includes the home page, about page, and a published project', () => {
    expect(pageLocs).toContain(PROD_ORIGIN);
    expect(pageLocs).toContain(`${PROD_ORIGIN}about/`);
    expect(pageLocs).toContain(`${PROD_ORIGIN}photos/Loop/`);
  });
});

describe('robots.txt', () => {
  it('exists in dist/', () => {
    expect(existsSync(resolve(dist, 'robots.txt'))).toBe(true);
  });

  it('references the production sitemap index', () => {
    expect(readDist('robots.txt')).toContain(`Sitemap: ${SITEMAP_INDEX_URL}`);
  });
});
