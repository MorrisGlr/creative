// src/scripts/__tests__/placeholders.test.ts
// Data integrity tests for placeholderProjects.
// Guards against missing required fields, duplicate slugs/seeds, and invalid enum values.

import { describe, it, expect } from 'vitest';
import { placeholderProjects } from '../../content/placeholders';
import type { PlaceholderProject } from '../../content/placeholders';

const VALID_SECTIONS = new Set(['photos', 'textbooks', 'paper']);
const VALID_POSTER_VARIANTS = new Set(['stack', 'split', 'ledger']);
const PALETTE_KEYS = ['paper', 'ink', 'accent', 'shadow'] as const;

describe('placeholderProjects', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(placeholderProjects)).toBe(true);
    expect(placeholderProjects.length).toBeGreaterThan(0);
  });

  it('every entry has required string fields', () => {
    for (const p of placeholderProjects) {
      const fields: (keyof PlaceholderProject)[] = ['slug', 'title', 'year', 'medium', 'dimensions', 'sortDate', 'gitignorePath'];
      for (const field of fields) {
        expect(typeof p[field], `${p.slug}.${field}`).toBe('string');
        expect((p[field] as string).length, `${p.slug}.${field} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('every entry has a valid section', () => {
    for (const p of placeholderProjects) {
      expect(VALID_SECTIONS.has(p.section), `${p.slug} has invalid section "${p.section}"`).toBe(true);
    }
  });

  it('every design has a numeric seed', () => {
    for (const p of placeholderProjects) {
      expect(typeof p.design.seed, `${p.slug}.design.seed`).toBe('number');
    }
  });

  it('every design has a valid posterVariant', () => {
    for (const p of placeholderProjects) {
      expect(
        VALID_POSTER_VARIANTS.has(p.design.posterVariant),
        `${p.slug} has invalid posterVariant "${p.design.posterVariant}"`
      ).toBe(true);
    }
  });

  it('every design palette has all four color keys as non-empty strings', () => {
    for (const p of placeholderProjects) {
      for (const key of PALETTE_KEYS) {
        expect(typeof p.design.palette[key], `${p.slug}.palette.${key}`).toBe('string');
        expect(p.design.palette[key].length, `${p.slug}.palette.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('all slugs are unique', () => {
    const slugs = placeholderProjects.map((p) => p.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it('all seeds are unique', () => {
    const seeds = placeholderProjects.map((p) => p.design.seed);
    const unique = new Set(seeds);
    expect(unique.size).toBe(seeds.length);
  });

  it('all three poster variants are represented', () => {
    const variants = new Set(placeholderProjects.map((p) => p.design.posterVariant));
    expect(variants.has('stack')).toBe(true);
    expect(variants.has('split')).toBe(true);
    expect(variants.has('ledger')).toBe(true);
  });
});
