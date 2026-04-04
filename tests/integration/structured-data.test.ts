// tests/integration/structured-data.test.ts
// Post-build integration tests: verifies that JSON-LD structured data blocks
// are present (or absent) in the right pages.
//
// JSON-LD is invisible to users but read by search engines and knowledge graphs.
// These tests guard against Layout.astro changes that might silently remove
// the <script type="application/ld+json"> blocks.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import * as cheerio from 'cheerio';

const dist = resolve(process.cwd(), 'dist');

function readJsonLdBlocks(relativePath: string): any[] {
  const filePath = resolve(dist, relativePath);
  if (!existsSync(filePath)) return [];
  const html = readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);
  const blocks: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      blocks.push(JSON.parse($(el).html() ?? ''));
    } catch {
      // malformed block — skip
    }
  });
  return blocks;
}

// ─── About page: must have Person schema ─────────────────────────────────────

describe('about/index.html — structured data', () => {
  it('contains a Person JSON-LD block', () => {
    const blocks = readJsonLdBlocks('about/index.html');
    const person = blocks.find((b) => b['@type'] === 'Person');
    expect(person).toBeTruthy();
  });

  it('Person block has a name', () => {
    const blocks = readJsonLdBlocks('about/index.html');
    const person = blocks.find((b) => b['@type'] === 'Person');
    expect(person?.name).toBeTruthy();
  });

  it('Person block has a url', () => {
    const blocks = readJsonLdBlocks('about/index.html');
    const person = blocks.find((b) => b['@type'] === 'Person');
    expect(person?.url).toBeTruthy();
  });
});

// ─── Published project: must have VisualArtwork schema ───────────────────────

describe('photos/Loop/index.html — structured data', () => {
  it('contains a VisualArtwork JSON-LD block', () => {
    const blocks = readJsonLdBlocks('photos/Loop/index.html');
    const artwork = blocks.find((b) => b['@type'] === 'VisualArtwork');
    expect(artwork).toBeTruthy();
  });

  it('VisualArtwork block has a name', () => {
    const blocks = readJsonLdBlocks('photos/Loop/index.html');
    const artwork = blocks.find((b) => b['@type'] === 'VisualArtwork');
    expect(artwork?.name).toBeTruthy();
  });

  it('VisualArtwork block has a creator', () => {
    const blocks = readJsonLdBlocks('photos/Loop/index.html');
    const artwork = blocks.find((b) => b['@type'] === 'VisualArtwork');
    expect(artwork?.creator?.name).toBeTruthy();
  });

  it('VisualArtwork block has an image URL', () => {
    const blocks = readJsonLdBlocks('photos/Loop/index.html');
    const artwork = blocks.find((b) => b['@type'] === 'VisualArtwork');
    expect(artwork?.image).toMatch(/^https?:\/\//);
  });
});

// ─── Placeholder project: must NOT have VisualArtwork schema ─────────────────

describe('textbooks/Depths-of-Knowledge-Vol-1-and-2/index.html — placeholder has no VisualArtwork', () => {
  it('does NOT contain a VisualArtwork JSON-LD block', () => {
    const blocks = readJsonLdBlocks('textbooks/Depths-of-Knowledge-Vol-1-and-2/index.html');
    const artwork = blocks.find((b) => b['@type'] === 'VisualArtwork');
    expect(artwork).toBeUndefined();
  });
});
