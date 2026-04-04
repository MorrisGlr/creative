// src/scripts/__tests__/data-validation.test.ts
// Validates the shape of data files (cv.json, social.json) using plain assertions.
// No Zod required — schemas are simple enough to check manually.
//
// Why this matters: if someone updates these JSON files and removes a required field,
// the CI run will catch it before the site deploys with a broken page.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

// ─── social.json ─────────────────────────────────────────────────────────────

describe('social.json', () => {
  const filePath = resolve(root, 'src/content/social.json');

  it('exists', () => {
    expect(existsSync(filePath)).toBe(true);
  });

  it('is valid JSON', () => {
    const raw = readFileSync(filePath, 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('has a linkedin key that is a non-empty string starting with https://', () => {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    expect(typeof data.linkedin).toBe('string');
    expect(data.linkedin.length).toBeGreaterThan(0);
    expect(data.linkedin).toMatch(/^https:\/\//);
  });

  it('has a github key that is a non-empty string starting with https://', () => {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    expect(typeof data.github).toBe('string');
    expect(data.github.length).toBeGreaterThan(0);
    expect(data.github).toMatch(/^https:\/\//);
  });

  // These fields will be added when the Contact page is implemented.
  // The tests are guarded so they only run when the fields are present,
  // then enforce their format when they exist.

  it('email (if present) is a non-empty string', () => {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    if ('email' in data) {
      expect(typeof data.email).toBe('string');
      expect(data.email.length).toBeGreaterThan(0);
    }
  });

  it('instagram (if present) is a non-empty string starting with https://', () => {
    const data = JSON.parse(readFileSync(filePath, 'utf8'));
    if ('instagram' in data) {
      expect(typeof data.instagram).toBe('string');
      expect(data.instagram.length).toBeGreaterThan(0);
      expect(data.instagram).toMatch(/^https:\/\//);
    }
  });
});

// ─── cv.json ─────────────────────────────────────────────────────────────────
// cv.json is created when the CV page is implemented.
// These tests are skipped until the file exists.

const cvPath = resolve(root, 'src/content/cv.json');
const cvExists = existsSync(cvPath);

describe.skipIf(!cvExists)('cv.json', () => {
  let data: any;

  it('is valid JSON', () => {
    const raw = readFileSync(cvPath, 'utf8');
    expect(() => { data = JSON.parse(raw); }).not.toThrow();
    data = JSON.parse(readFileSync(cvPath, 'utf8'));
  });

  it('has an education array', () => {
    const { education } = JSON.parse(readFileSync(cvPath, 'utf8'));
    expect(Array.isArray(education)).toBe(true);
  });

  it('every education entry has degree, institution, and years', () => {
    const { education } = JSON.parse(readFileSync(cvPath, 'utf8'));
    for (const entry of education) {
      expect(typeof entry.degree).toBe('string');
      expect(typeof entry.institution).toBe('string');
      expect(typeof entry.years).toBe('string');
    }
  });

  it('has an exhibitions array', () => {
    const { exhibitions } = JSON.parse(readFileSync(cvPath, 'utf8'));
    expect(Array.isArray(exhibitions)).toBe(true);
  });

  it('every exhibition entry has title, venue, and year', () => {
    const { exhibitions } = JSON.parse(readFileSync(cvPath, 'utf8'));
    for (const entry of exhibitions) {
      expect(typeof entry.title).toBe('string');
      expect(typeof entry.venue).toBe('string');
      expect(typeof entry.year).toBe('string');
    }
  });

  it('has a publications array', () => {
    const { publications } = JSON.parse(readFileSync(cvPath, 'utf8'));
    expect(Array.isArray(publications)).toBe(true);
  });

  it('every publication entry has title, venue, and year', () => {
    const { publications } = JSON.parse(readFileSync(cvPath, 'utf8'));
    for (const entry of publications) {
      expect(typeof entry.title).toBe('string');
      expect(typeof entry.venue).toBe('string');
      expect(typeof entry.year).toBe('string');
    }
  });

  it('has a forthcoming array (may be empty)', () => {
    const { forthcoming } = JSON.parse(readFileSync(cvPath, 'utf8'));
    expect(Array.isArray(forthcoming)).toBe(true);
  });

  it('has no unknown top-level keys', () => {
    const parsed = JSON.parse(readFileSync(cvPath, 'utf8'));
    const allowed = new Set(['education', 'exhibitions', 'publications', 'forthcoming']);
    const actual = Object.keys(parsed);
    for (const key of actual) {
      expect(allowed.has(key)).toBe(true);
    }
  });
});
