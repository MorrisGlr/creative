// src/scripts/__tests__/paths.test.ts
// Tests for withBase() and normalizePathname() in paths.ts.
//
// Teaching note: paths.ts reads import.meta.env.BASE_URL at module load time
// (it's a top-level const). To test with different base values, we call
// vi.stubEnv() BEFORE importing the module, then vi.resetModules() to force
// a fresh import in each describe group.

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// ─── withBase — no BASE_URL set (tests the || '/' fallback) ──────────────────

describe('withBase with no BASE_URL set', () => {
  let withBase: (p: string) => string;

  beforeAll(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    const mod = await import('../paths');
    withBase = mod.withBase;
  });

  afterAll(() => {
    vi.resetModules();
  });

  it('defaults to "/" when BASE_URL is not set and still prepends correctly', () => {
    expect(withBase('about')).toBe('/about');
  });
});

// ─── normalizePathname ───────────────────────────────────────────────────────
// normalizePathname is a pure string function with no env dependency,
// so we can test it once without any env setup.

describe('normalizePathname', () => {
  let normalizePathname: (p: string) => string;

  beforeAll(async () => {
    vi.resetModules();
    const mod = await import('../paths');
    normalizePathname = mod.normalizePathname;
  });

  afterAll(() => {
    vi.resetModules();
  });

  it('adds a leading slash when missing', () => {
    expect(normalizePathname('about')).toBe('/about');
  });

  it('keeps an existing leading slash', () => {
    expect(normalizePathname('/about')).toBe('/about');
  });

  it('strips a trailing slash', () => {
    expect(normalizePathname('/about/')).toBe('/about');
  });

  it('strips multiple trailing slashes', () => {
    expect(normalizePathname('/about///')).toBe('/about');
  });

  it('returns "/" for an empty string', () => {
    expect(normalizePathname('')).toBe('/');
  });

  it('returns "/" for a bare slash', () => {
    expect(normalizePathname('/')).toBe('/');
  });
});

// ─── withBase — base "/" (root deployment) ───────────────────────────────────

describe('withBase with base "/"', () => {
  let withBase: (p: string) => string;

  beforeAll(async () => {
    vi.stubEnv('BASE_URL', '/');
    vi.resetModules();
    const mod = await import('../paths');
    withBase = mod.withBase;
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('prepends / to a path', () => {
    expect(withBase('about')).toBe('/about');
  });

  it('handles a path with leading slash', () => {
    expect(withBase('/about')).toBe('/about');
  });

  it('returns "/" for empty string', () => {
    expect(withBase('')).toBe('/');
  });
});

// ─── withBase — base "/creative" (no trailing slash) ─────────────────────────

describe('withBase with base "/creative" (no trailing slash)', () => {
  let withBase: (p: string) => string;

  beforeAll(async () => {
    vi.stubEnv('BASE_URL', '/creative');
    vi.resetModules();
    const mod = await import('../paths');
    withBase = mod.withBase;
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('prepends /creative/ to a path', () => {
    expect(withBase('about')).toBe('/creative/about');
  });

  it('handles a path with leading slash', () => {
    expect(withBase('/about')).toBe('/creative/about');
  });

  it('returns base root for empty string', () => {
    expect(withBase('')).toBe('/creative/');
  });
});

// ─── withBase — base "/creative/" (with trailing slash) ──────────────────────

describe('withBase with base "/creative/" (trailing slash)', () => {
  let withBase: (p: string) => string;

  beforeAll(async () => {
    vi.stubEnv('BASE_URL', '/creative/');
    vi.resetModules();
    const mod = await import('../paths');
    withBase = mod.withBase;
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('prepends /creative/ to a path', () => {
    expect(withBase('about')).toBe('/creative/about');
  });

  it('handles a path with leading slash', () => {
    expect(withBase('/photos')).toBe('/creative/photos');
  });

  it('does not double-slash', () => {
    expect(withBase('about')).not.toContain('//');
  });
});
