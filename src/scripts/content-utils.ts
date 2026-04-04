// src/scripts/content-utils.ts
// Pure helper functions extracted from content.ts.
// No dependency on import.meta.glob, Vite, or the filesystem — directly testable.

import type { PlaceholderDesign } from '../content/placeholders';

export type Section = 'photos' | 'textbooks' | 'algo' | 'paper';

export function slugFromPath(path: string): string {
  // e.g. ../content/photos/sf-street/page.json -> "sf-street"
  const parts = path.split('/');
  const idx = parts.indexOf('content');
  return parts[idx + 2]; // section / <slug> / ...
}

export function filenameFromPath(path: string): string {
  return path.split('/').pop()!;
}

export function normalizeSlugKey(value?: string): string {
  return value?.trim().toLowerCase() ?? '';
}

export function normalizeComparablePath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
}

export function seededRandom(seed: number, index: number): number {
  const raw = Math.sin(seed * 97.13 + index * 31.7) * 10000;
  return raw - Math.floor(raw);
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function buildPlaceholderPattern(design: PlaceholderDesign): string {
  const width = 960;
  const height = 640;
  const rects: string[] = [];
  const colors = [design.palette.accent, design.palette.ink, design.palette.shadow];

  for (let i = 0; i < 11; i += 1) {
    const x = Math.round(seededRandom(design.seed, i + 1) * 730) + 40;
    const y = Math.round(seededRandom(design.seed, i + 16) * 470) + 35;
    const w = Math.round(seededRandom(design.seed, i + 31) * 190) + 80;
    const h = Math.round(seededRandom(design.seed, i + 46) * 130) + 55;
    const opacity = (0.22 + seededRandom(design.seed, i + 61) * 0.58).toFixed(2);
    const radius = Math.round(seededRandom(design.seed, i + 76) * 10) + 4;
    const color = colors[i % colors.length];
    rects.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${color}" opacity="${opacity}" />`
    );
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="card-bg-${design.seed}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${design.palette.paper}" />
      <stop offset="100%" stop-color="${design.palette.shadow}" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#card-bg-${design.seed})" />
  ${rects.join('\n  ')}
</svg>`;

  return svgDataUrl(svg);
}

export function placeholderDescription(section: Section): string {
  if (section === 'photos') return 'Catalog placeholder for an unreleased photo series.';
  if (section === 'textbooks') return 'Catalog placeholder for an unreleased textbook sculpture volume.';
  if (section === 'paper') return 'Catalog placeholder for an unreleased paper work.';
  return 'Catalog placeholder for an unreleased project.';
}

export function rationalToNumber(value: any): number | undefined {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const { numerator, denominator } = value as { numerator?: number; denominator?: number };
    if (typeof numerator === 'number' && typeof denominator === 'number' && denominator !== 0) {
      return numerator / denominator;
    }
  }
  return undefined;
}

export function formatDecimal(value: number): string {
  return Number(value.toFixed(1)).toString().replace(/\.0$/, '');
}

export function cleanExifString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed === '----') return undefined;
  if (/^-+$/.test(trimmed)) return undefined;
  return trimmed;
}

export function stripLeadingToken(value: string, token: string): string {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}\\s+`, 'i');
  return value.replace(pattern, '').trim();
}

export function splitMakeAndModel(value: string): { make?: string; model?: string } {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) return { model: trimmed };
  const [first, ...rest] = tokens;
  if (!/^[A-Za-z]/.test(first)) return { model: trimmed };
  return { make: first, model: rest.join(' ') };
}

export function pickCameraFromText(description?: unknown, keywords?: unknown): { make?: string; model?: string } {
  const desc = cleanExifString(description);
  if (desc) {
    const firstClause = desc.split(',')[0]?.trim();
    if (firstClause) return splitMakeAndModel(firstClause);
  }

  const keywordText =
    typeof keywords === 'string'
      ? keywords
      : Array.isArray(keywords)
        ? keywords.filter((k) => typeof k === 'string').join(';')
        : undefined;
  const kw = cleanExifString(keywordText);
  if (kw) {
    const parts = kw.split(';').map((p) => p.trim()).filter(Boolean);
    const scan = [...parts].reverse();
    const candidate =
      scan.find((p) => /^[A-Za-z]/.test(p) && /\d/.test(p)) ?? scan.find((p) => /^[A-Za-z]/.test(p));
    if (candidate) return splitMakeAndModel(candidate);
  }

  return {};
}

export function approximateIphoneFocal(cameraType?: string, physical?: number): number | undefined {
  if (!cameraType) return physical ? physical * 7 : undefined;
  const type = cameraType.toLowerCase();
  if (type.includes('tele')) return 52;
  if (type.includes('ultra')) return 13;
  if (type.includes('front')) return 32;
  if (type.includes('back') || type.includes('rear')) return 28;
  return physical ? physical * 7 : undefined;
}

export function resolutionUnitToMM(unit?: number): number | undefined {
  if (!unit) return undefined;
  switch (unit) {
    case 2: // inches
      return 25.4;
    case 3: // centimeters
      return 10;
    case 4: // millimeters
      return 1;
    default:
      return undefined;
  }
}
