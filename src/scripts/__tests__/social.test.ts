// src/scripts/__tests__/social.test.ts
// Tests for getSocialLinks() and getSameAsUrls() in social.ts.

import { describe, it, expect } from 'vitest';
import { getSocialLinks, getSameAsUrls } from '../social';

const full = {
  bluesky: 'https://bsky.app/profile/example.art',
  blueskyHandle: 'example.art',
  linkedin: 'https://www.linkedin.com/in/example/',
  github: 'https://github.com/example',
};

describe('getSocialLinks', () => {
  it('returns links in display order: Bluesky, LinkedIn, GitHub', () => {
    expect(getSocialLinks(full).map((l) => l.key)).toEqual(['bluesky', 'linkedin', 'github']);
  });

  it('ignores key order in the source data', () => {
    const reordered = { github: full.github, linkedin: full.linkedin, bluesky: full.bluesky };
    expect(getSocialLinks(reordered).map((l) => l.key)).toEqual(['bluesky', 'linkedin', 'github']);
  });

  it('attaches the handle to Bluesky only', () => {
    const links = getSocialLinks(full);
    expect(links[0]).toEqual({ key: 'bluesky', label: 'Bluesky', url: full.bluesky, handle: 'example.art' });
    expect(links[1].handle).toBeUndefined();
    expect(links[2].handle).toBeUndefined();
  });

  it('strips a leading "@" from the handle', () => {
    const [bsky] = getSocialLinks({ ...full, blueskyHandle: '@example.art' });
    expect(bsky.handle).toBe('example.art');
  });

  it('omits the handle when blueskyHandle is missing or blank', () => {
    expect(getSocialLinks({ bluesky: full.bluesky })[0]).not.toHaveProperty('handle');
    expect(getSocialLinks({ bluesky: full.bluesky, blueskyHandle: '  ' })[0]).not.toHaveProperty('handle');
  });

  it('skips networks whose URL is missing, blank, or not a string', () => {
    const links = getSocialLinks({ bluesky: '', linkedin: '   ', github: 42 });
    expect(links).toEqual([]);
  });

  it('trims surrounding whitespace from URLs', () => {
    const [gh] = getSocialLinks({ github: '  https://github.com/example  ' });
    expect(gh.url).toBe('https://github.com/example');
  });

  it('ignores unknown keys', () => {
    expect(getSocialLinks({ myspace: 'https://myspace.com/x' })).toEqual([]);
  });
});

describe('getSameAsUrls', () => {
  it('returns the URLs in display order', () => {
    expect(getSameAsUrls(full)).toEqual([full.bluesky, full.linkedin, full.github]);
  });

  it('returns an empty array when nothing is configured', () => {
    expect(getSameAsUrls({})).toEqual([]);
  });
});
