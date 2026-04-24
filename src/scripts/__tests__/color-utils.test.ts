// src/scripts/__tests__/color-utils.test.ts
// Unit tests for color-utils.ts.
// node-vibrant/node and node:fs are both mocked; selectSwatchColors is tested as a pure function.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Palette } from '@vibrant/color';

// vi.mock is hoisted above imports; use vi.hoisted so factory variables are
// initialized before the module under test is imported.
const { mockGetPalette, mockFrom } = vi.hoisted(() => {
  const mockGetPalette = vi.fn();
  const mockFrom = vi.fn(() => ({ getPalette: mockGetPalette }));
  return { mockGetPalette, mockFrom };
});

const { mockExistsSync, mockReadFileSync, mockWriteFileSync } = vi.hoisted(() => {
  const mockExistsSync = vi.fn(() => false);   // default: no cache file on disk
  const mockReadFileSync = vi.fn(() => '{}');
  const mockWriteFileSync = vi.fn();
  return { mockExistsSync, mockReadFileSync, mockWriteFileSync };
});

vi.mock('node-vibrant/node', () => ({
  Vibrant: { from: mockFrom },
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  },
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

import {
  SWATCH_PRIORITY,
  selectSwatchColors,
  extractDominantColors,
  _resetCacheForTesting,
} from '../color-utils';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeSwatch(hex: string) {
  return { hex } as any;
}

function fullPalette(): Palette {
  return {
    Vibrant:      makeSwatch('#FF0000'),
    Muted:        makeSwatch('#AA5500'),
    DarkVibrant:  makeSwatch('#006600'),
    LightVibrant: makeSwatch('#88BBFF'),
    LightMuted:   makeSwatch('#CCDDEE'),
    DarkMuted:    makeSwatch('#223344'),
  };
}

// ─── SWATCH_PRIORITY ─────────────────────────────────────────────────────────

describe('SWATCH_PRIORITY', () => {
  it('contains exactly 6 entries', () => {
    expect(SWATCH_PRIORITY).toHaveLength(6);
  });

  it('begins with Vibrant', () => {
    expect(SWATCH_PRIORITY[0]).toBe('Vibrant');
  });

  it('contains all six standard palette keys', () => {
    const expected = ['Vibrant', 'Muted', 'DarkVibrant', 'LightVibrant', 'LightMuted', 'DarkMuted'];
    expect(SWATCH_PRIORITY).toEqual(expect.arrayContaining(expected));
  });

  it('has no duplicate keys', () => {
    expect(new Set(SWATCH_PRIORITY).size).toBe(SWATCH_PRIORITY.length);
  });
});

// ─── selectSwatchColors ───────────────────────────────────────────────────────

describe('selectSwatchColors', () => {
  it('returns three hex strings when all swatches are present', () => {
    const result = selectSwatchColors(fullPalette());
    expect(result).toHaveLength(3);
  });

  it('returns swatches in priority order (Vibrant, Muted, DarkVibrant first)', () => {
    const result = selectSwatchColors(fullPalette());
    expect(result[0]).toBe('#FF0000'); // Vibrant
    expect(result[1]).toBe('#AA5500'); // Muted
    expect(result[2]).toBe('#006600'); // DarkVibrant
  });

  it('skips null swatches and fills from the next in priority', () => {
    const palette = fullPalette();
    palette.Vibrant = null;
    palette.Muted = null;
    const result = selectSwatchColors(palette);
    expect(result[0]).toBe('#006600'); // DarkVibrant (first non-null)
    expect(result[1]).toBe('#88BBFF'); // LightVibrant
    expect(result[2]).toBe('#CCDDEE'); // LightMuted
  });

  it('returns fewer than three when fewer than three swatches are non-null', () => {
    const result = selectSwatchColors({
      Vibrant:      makeSwatch('#111111'),
      Muted:        null,
      DarkVibrant:  null,
      LightVibrant: null,
      LightMuted:   null,
      DarkMuted:    null,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('#111111');
  });

  it('returns an empty array when all swatches are null', () => {
    const result = selectSwatchColors({
      Vibrant: null, Muted: null, DarkVibrant: null,
      LightVibrant: null, LightMuted: null, DarkMuted: null,
    });
    expect(result).toEqual([]);
  });

  it('returns exactly 3 even when all 6 swatches are non-null', () => {
    const result = selectSwatchColors(fullPalette());
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.length).toBe(3);
  });

  it('returns strings that match hex format (#RRGGBB)', () => {
    const result = selectSwatchColors(fullPalette());
    for (const hex of result) {
      expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('handles a palette with only two non-null entries', () => {
    const result = selectSwatchColors({
      Vibrant:      makeSwatch('#AABBCC'),
      Muted:        makeSwatch('#112233'),
      DarkVibrant:  null,
      LightVibrant: null,
      LightMuted:   null,
      DarkMuted:    null,
    });
    expect(result).toHaveLength(2);
  });
});

// ─── extractDominantColors ────────────────────────────────────────────────────

describe('extractDominantColors', () => {
  beforeEach(() => {
    mockFrom.mockClear();
    mockGetPalette.mockClear();
    mockExistsSync.mockReturnValue(false); // no cache file by default
    mockWriteFileSync.mockClear();
    _resetCacheForTesting();               // clear in-memory cache between tests
  });

  it('returns an empty array when assetKey is undefined', async () => {
    const result = await extractDominantColors(undefined);
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('calls Vibrant.from with the resolved file path', async () => {
    mockGetPalette.mockResolvedValueOnce(fullPalette());
    await extractDominantColors('../content/photos/Night-Trees/media/IMG_0671.jpeg');
    expect(mockFrom).toHaveBeenCalledOnce();
    const calledPath: string = mockFrom.mock.calls[0][0];
    expect(calledPath).toContain('IMG_0671.jpeg');
    expect(calledPath).toContain('Night-Trees');
  });

  it('returns three hex codes derived from the palette', async () => {
    mockGetPalette.mockResolvedValueOnce(fullPalette());
    const result = await extractDominantColors('../content/photos/Loop/media/DSC03191.jpg');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('#FF0000');
    expect(result[1]).toBe('#AA5500');
    expect(result[2]).toBe('#006600');
  });

  it('returns an empty array when Vibrant.from throws synchronously', async () => {
    mockFrom.mockImplementationOnce(() => { throw new Error('bad image'); });
    const result = await extractDominantColors('../content/photos/Loop/media/DSC03191.jpg');
    expect(result).toEqual([]);
  });

  it('returns an empty array when getPalette rejects', async () => {
    mockGetPalette.mockRejectedValueOnce(new Error('decode error'));
    const result = await extractDominantColors('../content/photos/Loop/media/DSC03191.jpg');
    expect(result).toEqual([]);
  });

  it('returns an empty array when the palette has all null swatches', async () => {
    mockGetPalette.mockResolvedValueOnce({
      Vibrant: null, Muted: null, DarkVibrant: null,
      LightVibrant: null, LightMuted: null, DarkMuted: null,
    });
    const result = await extractDominantColors('../content/photos/Loop/media/DSC03191.jpg');
    expect(result).toEqual([]);
  });

  it('resolved path is absolute', async () => {
    mockGetPalette.mockResolvedValueOnce(fullPalette());
    await extractDominantColors('../content/photos/Night-Trees/media/IMG_0671.jpeg');
    const calledPath: string = mockFrom.mock.calls[0][0];
    expect(calledPath.startsWith('/')).toBe(true);
  });
});

// ─── disk cache ───────────────────────────────────────────────────────────────

describe('disk cache', () => {
  const KEY = '../content/photos/Loop/media/DSC03191.jpg';
  const CACHED = ['#AABBCC', '#112233', '#445566'];

  beforeEach(() => {
    mockFrom.mockClear();
    mockGetPalette.mockClear();
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue('{}');
    mockWriteFileSync.mockClear();
    _resetCacheForTesting();
  });

  it('returns cached value from disk without calling Vibrant', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ [KEY]: CACHED }));

    const result = await extractDominantColors(KEY);
    expect(result).toEqual(CACHED);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('calls Vibrant and writes to disk on a cache miss', async () => {
    mockGetPalette.mockResolvedValueOnce(fullPalette());

    const result = await extractDominantColors(KEY);
    expect(mockFrom).toHaveBeenCalledOnce();
    expect(mockWriteFileSync).toHaveBeenCalledOnce();
    expect(result).toHaveLength(3);
  });

  it('writes the extracted colors to disk under the correct assetKey', async () => {
    mockGetPalette.mockResolvedValueOnce(fullPalette());
    await extractDominantColors(KEY);

    const [, writtenJson] = mockWriteFileSync.mock.calls[0];
    const written = JSON.parse(writtenJson as string);
    expect(written[KEY]).toEqual(['#FF0000', '#AA5500', '#006600']);
  });

  it('does not call Vibrant on the second call for the same key (in-memory hit)', async () => {
    mockGetPalette.mockResolvedValueOnce(fullPalette());
    await extractDominantColors(KEY); // populates in-memory cache
    mockFrom.mockClear();

    await extractDominantColors(KEY); // should hit in-memory cache
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('does not write to disk on the second call for the same key', async () => {
    mockGetPalette.mockResolvedValueOnce(fullPalette());
    await extractDominantColors(KEY);
    mockWriteFileSync.mockClear();

    await extractDominantColors(KEY);
    expect(mockWriteFileSync).not.toHaveBeenCalled();
  });

  it('falls back to empty cache and processes normally when disk file is corrupt JSON', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue('{ invalid json }');
    mockGetPalette.mockResolvedValueOnce(fullPalette());

    const result = await extractDominantColors(KEY);
    expect(result).toHaveLength(3);
    expect(mockFrom).toHaveBeenCalledOnce();
  });

  it('falls back gracefully when readFileSync throws', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockImplementationOnce(() => { throw new Error('permission denied'); });
    mockGetPalette.mockResolvedValueOnce(fullPalette());

    const result = await extractDominantColors(KEY);
    expect(result).toHaveLength(3);
  });

  it('does not throw when writeFileSync fails', async () => {
    mockWriteFileSync.mockImplementationOnce(() => { throw new Error('disk full'); });
    mockGetPalette.mockResolvedValueOnce(fullPalette());

    await expect(extractDominantColors(KEY)).resolves.toHaveLength(3);
  });

  it('_resetCacheForTesting causes next call to re-read from disk', async () => {
    // First call: no disk cache, processes with Vibrant
    mockGetPalette.mockResolvedValueOnce(fullPalette());
    await extractDominantColors(KEY);
    mockFrom.mockClear();

    // Reset in-memory cache; now disk has different pre-computed values
    _resetCacheForTesting();
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ [KEY]: CACHED }));

    // Second call: reads from disk, skips Vibrant, returns disk value
    const result = await extractDominantColors(KEY);
    expect(result).toEqual(CACHED);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
