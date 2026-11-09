// tests/integration/contact.test.ts
// Post-build integration tests: verifies the Contact page's "Elsewhere" list
// renders social links from social.json in display order, with the Bluesky
// domain handle visible (the handle itself is the identity signal).

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import * as cheerio from 'cheerio';

const filePath = resolve(process.cwd(), 'dist', 'contact/index.html');

describe('contact/index.html — social links', () => {
  const $ = existsSync(filePath) ? cheerio.load(readFileSync(filePath, 'utf8')) : null;

  it('exists', () => {
    expect($).not.toBeNull();
  });

  it('lists Bluesky, LinkedIn, GitHub in that order', () => {
    const keys = $!('.contact__social-link')
      .toArray()
      .map((el) => $!(el).attr('data-social'));
    expect(keys).toEqual(['bluesky', 'linkedin', 'github']);
  });

  it('Bluesky link shows the @mementomorris.art handle and links to the profile', () => {
    const bsky = $!('.contact__social-link[data-social="bluesky"]');
    expect(bsky.text()).toContain('@mementomorris.art');
    expect(bsky.attr('href')).toBe('https://bsky.app/profile/mementomorris.art');
  });

  it('LinkedIn and GitHub keep plain labels', () => {
    expect($!('.contact__social-link[data-social="linkedin"]').text().trim()).toBe('LinkedIn');
    expect($!('.contact__social-link[data-social="github"]').text().trim()).toBe('GitHub');
  });
});
