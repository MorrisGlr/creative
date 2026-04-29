// tests/integration/footer.test.ts
// Post-build integration tests: verifies that the site footer is present on
// key pages and contains the expected navigation links.
//
// The footer is the only navigation path to About, Contact, and CV pages
// (per SPEC section 8). These tests guard against a footer that stops rendering
// or loses its links after a template change.
//
// Note: base path is '/' (custom domain mementomorris.art). Tests assert
// links start with '/' not '/creative/' — update if base path changes again.

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

// Pages to check — all of these should have a footer with the About link
const pagesToCheck = [
  'index.html',
  'about/index.html',
  'photos/Loop/index.html',
  'algo/Wing-Scale/index.html',
];

for (const page of pagesToCheck) {
  describe(`footer — ${page}`, () => {
    const $ = loadPage(page);

    it('has a footer element', () => {
      expect($).not.toBeNull();
      expect($!('footer').length).toBeGreaterThan(0);
    });

    it('footer contains an About link', () => {
      expect($).not.toBeNull();
      const footerLinks = $!('footer a');
      const hrefs = footerLinks
        .toArray()
        .map((el) => $!(el).attr('href') ?? '');
      const hasAbout = hrefs.some((href) => href.includes('/about'));
      expect(hasAbout).toBe(true);
    });

    it('About link uses the /creative/ base path', () => {
      expect($).not.toBeNull();
      const footerLinks = $!('footer a');
      const hrefs = footerLinks
        .toArray()
        .map((el) => $!(el).attr('href') ?? '');
      const aboutHref = hrefs.find((href) => href.includes('/about'));
      expect(aboutHref).toMatch(/^\//);
    });
  });
}

// ─── Contact and CV links (present once those pages are built) ───────────────
// These are conditional: they only assert the link exists if the page exists.

describe('footer — Contact link (when page is built)', () => {
  const contactExists = existsSync(resolve(dist, 'contact/index.html'));

  it.skipIf(!contactExists)('footer contains a Contact link with /creative/ base', () => {
    const $ = loadPage('index.html')!;
    const hrefs = $('footer a')
      .toArray()
      .map((el) => $(el).attr('href') ?? '');
    const contactHref = hrefs.find((href) => href.includes('/contact'));
    expect(contactHref).toMatch(/^\//);
  });
});

describe('footer — CV link (when page is built)', () => {
  const cvExists = existsSync(resolve(dist, 'cv/index.html'));

  it.skipIf(!cvExists)('footer contains a CV link with /creative/ base', () => {
    const $ = loadPage('index.html')!;
    const hrefs = $('footer a')
      .toArray()
      .map((el) => $(el).attr('href') ?? '');
    const cvHref = hrefs.find((href) => href.includes('/cv'));
    expect(cvHref).toMatch(/^\//);
  });
});
