// src/scripts/color-utils.ts
import fs from 'node:fs';
import path from 'node:path';
import { Vibrant } from 'node-vibrant/node';
import sharp from 'sharp';
import type { Palette } from '@vibrant/color';

// Priority order picks visually distinct swatches: saturated first, then muted variants.
// Vibrant + Muted + DarkVibrant span brightness and saturation so all three rarely converge.
export const SWATCH_PRIORITY: (keyof Palette)[] = [
  'Vibrant',
  'Muted',
  'DarkVibrant',
  'LightVibrant',
  'LightMuted',
  'DarkMuted',
];

export function selectSwatchColors(palette: Palette): string[] {
  const colors: string[] = [];
  for (const key of SWATCH_PRIORITY) {
    if (colors.length >= 3) break;
    const swatch = palette[key];
    if (swatch) colors.push(swatch.hex);
  }
  return colors;
}

// ─── Persistent disk cache ────────────────────────────────────────────────────
// Stored at project root as .color-cache.json (gitignored).
// Keyed by assetKey (relative path from src/scripts/). Survives dev server restarts
// so only the first cold run per image pays the node-vibrant cost (~150ms each).

const CACHE_PATH = path.resolve(process.cwd(), '.color-cache.json');

// Null means "not yet loaded from disk". Lazy-init on first access.
let colorCache: Record<string, string[]> | null = null;

function loadCache(): Record<string, string[]> {
  if (colorCache !== null) return colorCache;
  try {
    if (fs.existsSync(CACHE_PATH)) {
      colorCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      return colorCache!;
    }
  } catch {
    // Corrupt or unreadable — start fresh; next write will overwrite.
  }
  colorCache = {};
  return colorCache;
}

function writeCache(cache: Record<string, string[]>): void {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch {
    // Non-fatal: write failure means next cold start re-computes this entry.
  }
}

// Exported only for test isolation — do not call in production code.
export function _resetCacheForTesting(): void {
  colorCache = null;
}

// ─── Image dimensions ─────────────────────────────────────────────────────────

export async function readImageDimensions(
  assetKey?: string,
): Promise<{ width: number; height: number } | null> {
  if (!assetKey) return null;
  try {
    const filePath = path.resolve(process.cwd(), 'src/scripts', assetKey);
    const meta = await sharp(filePath).metadata();
    if (meta.width && meta.height) return { width: meta.width, height: meta.height };
    return null;
  } catch {
    return null;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function extractDominantColors(assetKey?: string): Promise<string[]> {
  if (!assetKey) return [];

  const cache = loadCache();
  if (Object.prototype.hasOwnProperty.call(cache, assetKey)) return cache[assetKey];

  try {
    const filePath = path.resolve(process.cwd(), 'src/scripts', assetKey);
    const palette = await Vibrant.from(filePath).getPalette();
    const colors = selectSwatchColors(palette);
    cache[assetKey] = colors;
    writeCache(cache);
    return colors;
  } catch {
    return [];
  }
}
