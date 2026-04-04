// src/scripts/__tests__/content-utils.test.ts
// Unit tests for all pure helper functions in content-utils.ts.
// These functions have no Vite/build-time dependencies — just pure logic.

import { describe, it, expect } from 'vitest';
import {
  slugFromPath,
  filenameFromPath,
  normalizeSlugKey,
  normalizeComparablePath,
  seededRandom,
  svgDataUrl,
  buildPlaceholderPattern,
  placeholderDescription,
  rationalToNumber,
  formatDecimal,
  cleanExifString,
  stripLeadingToken,
  splitMakeAndModel,
  pickCameraFromText,
  approximateIphoneFocal,
  resolutionUnitToMM,
} from '../content-utils';
import type { PlaceholderDesign } from '../../content/placeholders';

// ─── Path helpers ─────────────────────────────────────────────────────────────

describe('slugFromPath', () => {
  it('extracts slug from a photos path', () => {
    expect(slugFromPath('../content/photos/sf-street/page.json')).toBe('sf-street');
  });

  it('extracts slug from a textbooks path', () => {
    expect(slugFromPath('../content/textbooks/vol-1/page.json')).toBe('vol-1');
  });

  it('extracts slug from an algo path', () => {
    expect(slugFromPath('../content/algo/wing-scale/page.json')).toBe('wing-scale');
  });
});

describe('filenameFromPath', () => {
  it('extracts filename from a media path', () => {
    expect(filenameFromPath('../content/photos/sf-street/media/01.jpg')).toBe('01.jpg');
  });

  it('extracts filename with no subdirectory', () => {
    expect(filenameFromPath('page.json')).toBe('page.json');
  });
});

describe('normalizeSlugKey', () => {
  it('lowercases the value', () => {
    expect(normalizeSlugKey('SF-Street')).toBe('sf-street');
  });

  it('trims whitespace', () => {
    expect(normalizeSlugKey('  sf-street  ')).toBe('sf-street');
  });

  it('returns empty string for undefined', () => {
    expect(normalizeSlugKey(undefined)).toBe('');
  });
});

describe('normalizeComparablePath', () => {
  it('lowercases and trims', () => {
    expect(normalizeComparablePath('  Src/Content/Photos/  ')).toBe('src/content/photos/');
  });

  it('strips leading ./', () => {
    expect(normalizeComparablePath('./src/content/photos')).toBe('src/content/photos');
  });

  it('converts backslashes to forward slashes', () => {
    expect(normalizeComparablePath('src\\content\\photos')).toBe('src/content/photos');
  });
});

// ─── Math / randomness ───────────────────────────────────────────────────────

describe('seededRandom', () => {
  it('is deterministic — same seed + index always returns the same value', () => {
    expect(seededRandom(42, 0)).toBe(seededRandom(42, 0));
    expect(seededRandom(7, 3)).toBe(seededRandom(7, 3));
  });

  it('returns a value in [0, 1)', () => {
    const val = seededRandom(42, 5);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });

  it('different seeds produce different values', () => {
    expect(seededRandom(1, 0)).not.toBe(seededRandom(2, 0));
  });

  it('different indices produce different values', () => {
    expect(seededRandom(42, 0)).not.toBe(seededRandom(42, 1));
  });
});

// ─── SVG helpers ─────────────────────────────────────────────────────────────

describe('svgDataUrl', () => {
  it('produces a data URI', () => {
    const result = svgDataUrl('<svg></svg>');
    expect(result).toMatch(/^data:image\/svg\+xml,/);
  });

  it('URL-encodes the SVG content', () => {
    const result = svgDataUrl('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});

describe('buildPlaceholderPattern', () => {
  const design: PlaceholderDesign = {
    seed: 42,
    posterVariant: 'stack',
    palette: {
      paper: '#f5f0e8',
      ink: '#1a1a2e',
      accent: '#e63946',
      shadow: '#0d0d1a',
    },
  };

  it('returns a data URI string', () => {
    const result = buildPlaceholderPattern(design);
    expect(result).toMatch(/^data:image\/svg\+xml,/);
  });

  it('is deterministic — same design produces same output', () => {
    expect(buildPlaceholderPattern(design)).toBe(buildPlaceholderPattern(design));
  });

  it('different seeds produce different outputs', () => {
    const design2 = { ...design, seed: 99 };
    expect(buildPlaceholderPattern(design)).not.toBe(buildPlaceholderPattern(design2));
  });
});

// ─── Placeholder descriptions ─────────────────────────────────────────────────

describe('placeholderDescription', () => {
  it('mentions photo for photos section', () => {
    expect(placeholderDescription('photos')).toContain('photo');
  });

  it('mentions textbook for textbooks section', () => {
    expect(placeholderDescription('textbooks')).toContain('textbook');
  });

  it('mentions paper for paper section', () => {
    expect(placeholderDescription('paper')).toContain('paper');
  });

  it('returns a generic description for algo section', () => {
    const result = placeholderDescription('algo');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});

// ─── EXIF / number helpers ────────────────────────────────────────────────────

describe('rationalToNumber', () => {
  it('returns a plain number as-is', () => {
    expect(rationalToNumber(2.5)).toBe(2.5);
  });

  it('converts numerator/denominator object', () => {
    expect(rationalToNumber({ numerator: 1, denominator: 4 })).toBe(0.25);
  });

  it('returns undefined for a zero denominator', () => {
    expect(rationalToNumber({ numerator: 1, denominator: 0 })).toBeUndefined();
  });

  it('returns undefined for null', () => {
    expect(rationalToNumber(null)).toBeUndefined();
  });

  it('returns undefined for an incomplete object', () => {
    expect(rationalToNumber({ numerator: 1 })).toBeUndefined();
  });
});

describe('formatDecimal', () => {
  it('drops .0 suffix', () => {
    expect(formatDecimal(1.0)).toBe('1');
  });

  it('keeps meaningful decimal', () => {
    expect(formatDecimal(2.5)).toBe('2.5');
  });

  it('rounds to 1 decimal place', () => {
    expect(formatDecimal(2.56)).toBe('2.6');
  });
});

describe('cleanExifString', () => {
  it('trims whitespace', () => {
    expect(cleanExifString('  hello  ')).toBe('hello');
  });

  it('returns undefined for "----"', () => {
    expect(cleanExifString('----')).toBeUndefined();
  });

  it('returns undefined for any all-dash string', () => {
    expect(cleanExifString('---')).toBeUndefined();
    expect(cleanExifString('----------')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(cleanExifString('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(cleanExifString('   ')).toBeUndefined();
  });

  it('returns undefined for non-string values', () => {
    expect(cleanExifString(42)).toBeUndefined();
    expect(cleanExifString(null)).toBeUndefined();
    expect(cleanExifString(undefined)).toBeUndefined();
  });

  it('returns the value for a valid string', () => {
    expect(cleanExifString('Canon EOS R5')).toBe('Canon EOS R5');
  });
});

// ─── Camera metadata parsers ──────────────────────────────────────────────────

describe('stripLeadingToken', () => {
  it('removes make prefix from model string', () => {
    expect(stripLeadingToken('Canon EOS R5', 'Canon')).toBe('EOS R5');
  });

  it('is case-insensitive', () => {
    expect(stripLeadingToken('CANON EOS R5', 'canon')).toBe('EOS R5');
  });

  it('does nothing if token is not at the start', () => {
    expect(stripLeadingToken('EOS R5 Canon', 'Canon')).toBe('EOS R5 Canon');
  });

  it('handles special regex characters in token', () => {
    expect(stripLeadingToken('Sony A7 IV', 'Sony')).toBe('A7 IV');
  });
});

describe('splitMakeAndModel', () => {
  it('splits a two-word string into make + model', () => {
    expect(splitMakeAndModel('Canon EOS')).toEqual({ make: 'Canon', model: 'EOS' });
  });

  it('splits a multi-word model correctly', () => {
    expect(splitMakeAndModel('Canon EOS R5')).toEqual({ make: 'Canon', model: 'EOS R5' });
  });

  it('returns just model for a single word', () => {
    expect(splitMakeAndModel('EOS')).toEqual({ model: 'EOS' });
  });

  it('returns empty object for empty string', () => {
    expect(splitMakeAndModel('')).toEqual({});
  });
});

describe('pickCameraFromText', () => {
  it('extracts camera from description first clause', () => {
    const result = pickCameraFromText('Canon EOS R5, f/2.8, 50mm', undefined);
    expect(result.make).toBe('Canon');
    expect(result.model).toBe('EOS R5');
  });

  it('extracts camera from keywords when description is absent', () => {
    const result = pickCameraFromText(undefined, 'street;Canon EOS R5');
    expect(result.make).toBe('Canon');
  });

  it('returns empty object when both description and keywords are absent', () => {
    expect(pickCameraFromText(undefined, undefined)).toEqual({});
  });

  it('handles array keywords', () => {
    const result = pickCameraFromText(undefined, ['street', 'Canon EOS R5']);
    expect(result.make).toBe('Canon');
  });
});

// ─── iPhone focal length estimation ──────────────────────────────────────────

describe('approximateIphoneFocal', () => {
  it('returns 52 for telephoto', () => {
    expect(approximateIphoneFocal('Telephoto Camera')).toBe(52);
  });

  it('returns 13 for ultra wide', () => {
    expect(approximateIphoneFocal('Ultra Wide Camera')).toBe(13);
  });

  it('returns 32 for front camera', () => {
    expect(approximateIphoneFocal('Front Camera')).toBe(32);
  });

  it('returns 28 for back camera', () => {
    expect(approximateIphoneFocal('Back Camera')).toBe(28);
  });

  it('returns 28 for rear camera', () => {
    expect(approximateIphoneFocal('Rear Camera')).toBe(28);
  });

  it('estimates from physical focal length when type is unknown', () => {
    expect(approximateIphoneFocal('Unknown Camera', 4)).toBe(28);
  });

  it('returns undefined when no type and no physical', () => {
    expect(approximateIphoneFocal(undefined, undefined)).toBeUndefined();
  });
});

// ─── Resolution unit conversion ───────────────────────────────────────────────

describe('resolutionUnitToMM', () => {
  it('returns 25.4 for inches (unit 2)', () => {
    expect(resolutionUnitToMM(2)).toBe(25.4);
  });

  it('returns 10 for centimeters (unit 3)', () => {
    expect(resolutionUnitToMM(3)).toBe(10);
  });

  it('returns 1 for millimeters (unit 4)', () => {
    expect(resolutionUnitToMM(4)).toBe(1);
  });

  it('returns undefined for unknown unit', () => {
    expect(resolutionUnitToMM(99)).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(resolutionUnitToMM(undefined)).toBeUndefined();
  });

  it('returns undefined for 0', () => {
    expect(resolutionUnitToMM(0)).toBeUndefined();
  });
});
