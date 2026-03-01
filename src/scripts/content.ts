// src/scripts/content.ts
// Purpose: Load page.json for each album and map media filenames -> built asset URLs.
// Why: Astro/Vite can "glob import" JSON and assets at build time for static sites like GitHub Pages.

import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import exifr from 'exifr';
import {
  placeholderProjects,
  type PlaceholderDesign,
  type PlaceholderProject,
} from '../content/placeholders';

export type Section = 'photos' | 'textbooks' | 'algo' | 'paper';

export interface PhotoMetadata {
  cameraMake?: string;
  cameraModel?: string;
  cameraType?: string;
  lensMake?: string;
  lensModel?: string;
  megapixels?: string;
  focalLength?: string;
  aperture?: string;
  exposureTime?: string;
  iso?: string;
}

type VideoSource = { src: string; type?: string };
type ImageItem = {
  type: 'image';
  src: string;
  alt?: string;
  caption?: string;
  attribution?: string;
  meta?: PhotoMetadata;
};
type VideoItem = {
  type: 'video';
  sources?: VideoSource[];
  src?: string;
  poster?: string;
  caption?: string;
  alt?: string;
  attribution?: string;
};
type ModelItem = {
  type: 'model';
  src: string;   // glb
  usdz?: string; // ios
  caption?: string;
  alt?: string;
  attribution?: string;
};
export type MediaItem = ImageItem | VideoItem | ModelItem;

export interface AlbumPlaceholder {
  enabled: true;
  year: string;
  medium: string;
  dimensions: string;
  sortDate: string;
  gitignorePath: string;
  design: PlaceholderDesign;
}

export interface Album {
  title: string;
  slug: string;
  displayDate?: string;
  dateCreated?: string;
  date?: string;
  description?: string;
  cover?: string;
  tags?: string[];
  media: MediaItem[];
  related?: string[];
  options?: { parallax?: boolean; bgFromDominantColor?: boolean };
  placeholder?: AlbumPlaceholder;
}

// 1) Load all page.json files per section (must be static strings for Vite)
const jsonGlobs = {
  photos: import.meta.glob('../content/photos/*/page.json', { eager: true }),
  textbooks: import.meta.glob('../content/textbooks/*/page.json', { eager: true }),
  algo: import.meta.glob('../content/algo/*/page.json', { eager: true }),
  paper: import.meta.glob('../content/paper/*/page.json', { eager: true }),
} as const;

// 2) Load ALL media for each section; we’ll filter by slug later.
//    `import: "default"` returns the emitted URL string for assets.
const mediaGlobs = {
  photos: import.meta.glob('../content/photos/*/media/*', { eager: true, query: '?url', import: 'default' }),
  textbooks: import.meta.glob('../content/textbooks/*/media/*', { eager: true, query: '?url', import: 'default' }),
  algo: import.meta.glob('../content/algo/*/media/*', { eager: true, query: '?url', import: 'default' }),
  paper: import.meta.glob('../content/paper/*/media/*', { eager: true, query: '?url', import: 'default' }),
} as const;

function slugFromPath(path: string) {
  // e.g. ../content/photos/sf-street/page.json -> "sf-street"
  const parts = path.split('/');
  const idx = parts.indexOf('content');
  return parts[idx + 2]; // section / <slug> / ...
}

function filenameFromPath(path: string) {
  return path.split('/').pop()!;
}

const PLACEHOLDER_DEBUG = import.meta.env.DEV;
let hasLoggedPlaceholderCoverage = false;

function normalizeComparablePath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
}

function collectGitignoreContentPaths(): string[] {
  try {
    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    const raw = fsSync.readFileSync(gitignorePath, 'utf8');
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('src/content/'));
  } catch {
    return [];
  }
}

const gitignoreContentPaths = PLACEHOLDER_DEBUG ? collectGitignoreContentPaths() : [];
const gitignoreContentPathSet = new Set(gitignoreContentPaths.map(normalizeComparablePath));
const placeholderPathSet = new Set(
  placeholderProjects.map((entry) => normalizeComparablePath(entry.gitignorePath))
);
const missingPlaceholderManifestPaths = gitignoreContentPaths.filter(
  (line) => !placeholderPathSet.has(normalizeComparablePath(line))
);
const extraPlaceholderManifestPaths = placeholderProjects
  .map((entry) => entry.gitignorePath)
  .filter((line) => !gitignoreContentPathSet.has(normalizeComparablePath(line)));

function logPlaceholderCoverage() {
  if (!PLACEHOLDER_DEBUG || hasLoggedPlaceholderCoverage) return;
  const bySection = placeholderProjects.reduce<Record<string, string[]>>((acc, entry) => {
    if (!acc[entry.section]) acc[entry.section] = [];
    acc[entry.section].push(entry.slug);
    return acc;
  }, {});
  console.info('[placeholder-coverage]', {
    manifestCount: placeholderProjects.length,
    sections: bySection,
    gitignoreContentPathCount: gitignoreContentPaths.length,
    missingManifestEntries: missingPlaceholderManifestPaths,
    extraManifestEntries: extraPlaceholderManifestPaths,
  });
  hasLoggedPlaceholderCoverage = true;
}

function seededRandom(seed: number, index: number): number {
  const raw = Math.sin(seed * 97.13 + index * 31.7) * 10000;
  return raw - Math.floor(raw);
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildPlaceholderPattern(design: PlaceholderDesign): string {
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

function placeholderDescription(section: Section): string {
  if (section === 'photos') return 'Catalog placeholder for an unreleased photo series.';
  if (section === 'textbooks') return 'Catalog placeholder for an unreleased textbook sculpture volume.';
  if (section === 'paper') return 'Catalog placeholder for an unreleased paper work.';
  return 'Catalog placeholder for an unreleased project.';
}

function buildPlaceholderAlbum(entry: PlaceholderProject): Album & { _section: Section } {
  return {
    title: entry.title,
    slug: entry.slug,
    displayDate: entry.year,
    dateCreated: entry.sortDate,
    date: entry.sortDate,
    description: placeholderDescription(entry.section),
    cover: buildPlaceholderPattern(entry.design),
    tags: ['catalog-placeholder'],
    media: [],
    related: [],
    options: { parallax: false, bgFromDominantColor: false },
    placeholder: {
      enabled: true,
      year: entry.year,
      medium: entry.medium,
      dimensions: entry.dimensions,
      sortDate: entry.sortDate,
      gitignorePath: entry.gitignorePath,
      design: entry.design,
    },
    _section: entry.section,
  };
}

const photoMetaCache = new Map<string, PhotoMetadata>();
const PHOTO_META_DEBUG = (() => {
  const raw = process.env.PHOTO_META_DEBUG?.trim();
  if (!raw) return false;
  return raw !== '0' && raw.toLowerCase() !== 'false';
})();

function debugPhotoMeta(label: string, payload: Record<string, unknown>) {
  if (!PHOTO_META_DEBUG) return;
  console.info(`[photo-meta] ${label}`, payload);
}

function rationalToNumber(value: any): number | undefined {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const { numerator, denominator } = value as { numerator?: number; denominator?: number };
    if (typeof numerator === 'number' && typeof denominator === 'number' && denominator !== 0) {
      return numerator / denominator;
    }
  }
  return undefined;
}

function formatDecimal(value: number): string {
  return Number(value.toFixed(1)).toString().replace(/\.0$/, '');
}

function cleanExifString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed === '----') return undefined;
  if (/^-+$/.test(trimmed)) return undefined;
  return trimmed;
}

function stripLeadingToken(value: string, token: string): string {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}\\s+`, 'i');
  return value.replace(pattern, '').trim();
}

function splitMakeAndModel(value: string): { make?: string; model?: string } {
  const trimmed = value.trim();
  if (!trimmed) return {};
  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) return { model: trimmed };
  const [first, ...rest] = tokens;
  if (!/^[A-Za-z]/.test(first)) return { model: trimmed };
  return { make: first, model: rest.join(' ') };
}

function pickCameraFromText(description?: unknown, keywords?: unknown): { make?: string; model?: string } {
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

function approximateIphoneFocal(cameraType?: string, physical?: number): number | undefined {
  if (!cameraType) return physical ? physical * 7 : undefined;
  const type = cameraType.toLowerCase();
  if (type.includes('tele')) return 52;
  if (type.includes('ultra')) return 13;
  if (type.includes('front')) return 32;
  if (type.includes('back') || type.includes('rear')) return 28;
  return physical ? physical * 7 : undefined;
}

function resolutionUnitToMM(unit?: number): number | undefined {
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

async function readPhotoMetadata(assetKey?: string): Promise<PhotoMetadata | undefined> {
  if (!assetKey) return undefined;
  if (photoMetaCache.has(assetKey)) {
    return photoMetaCache.get(assetKey);
  }
  try {
    const filePath = path.resolve(process.cwd(), 'src/scripts', assetKey);
    const buffer = await fs.readFile(filePath);
    const exif = await exifr.parse(buffer, {
      pick: [
        'Model',
        'LensModel',
        'LensMake',
        'Make',
        'FocalLength',
        'FocalLengthIn35mmFilm',
        'FocalLengthIn35mmFormat',
        'ExposureTime',
        'ISO',
        'ImageWidth',
        'ImageHeight',
        'ExifImageWidth',
        'ExifImageHeight',
        'PixelXDimension',
        'PixelYDimension',
        'ImageDescription',
        'XPKeywords',
        'FNumber',
        'ApertureValue',
        'FocalPlaneXResolution',
        'FocalPlaneYResolution',
        'FocalPlaneResolutionUnit',
      ],
    });
    if (!exif) {
      photoMetaCache.set(assetKey, {});
      return {};
    }
    const rawCameraMake = cleanExifString((exif as any).Make);
    const rawCameraModel = cleanExifString((exif as any).Model);
    const rawLensMake = cleanExifString((exif as any).LensMake);
    const rawLensModel = cleanExifString((exif as any).LensModel);
    const rawDescription = cleanExifString((exif as any).ImageDescription);
    const rawKeywords = (exif as any).XPKeywords as unknown;

    let cameraMake = rawCameraMake;
    let cameraModel = rawCameraModel;
    let lensMake = rawLensMake;
    let lensModel = rawLensModel;
    const isIphone =
      cameraModel?.toLowerCase().includes('iphone') ||
      cameraMake?.toLowerCase().includes('apple');
    let cameraType: string | undefined;
    if (isIphone && lensModel) {
      const lower = lensModel.toLowerCase();
      if (lower.includes('tele')) cameraType = 'Telephoto Camera';
      else if (lower.includes('ultra')) cameraType = 'Ultra Wide Camera';
      else if (lower.includes('front')) cameraType = 'Front Camera';
      else if (lower.includes('rear')) cameraType = 'Rear Camera';
      else cameraType = 'Back Camera';
    }

    if (!isIphone && cameraMake && cameraModel) {
      cameraModel = stripLeadingToken(cameraModel, cameraMake);
    }

    if (!isIphone && lensMake && lensModel) {
      lensModel = stripLeadingToken(lensModel, lensMake);
    }

    let lensMakeDerived = false;
    if (!isIphone && lensModel && !lensMake) {
      const split = splitMakeAndModel(lensModel);
      if (split.make) {
        lensMake = split.make;
        lensModel = split.model ?? lensModel;
        lensMakeDerived = true;
      }
    }

    if (!isIphone && (!cameraMake || !cameraModel)) {
      const fromText = pickCameraFromText(rawDescription, rawKeywords);
      const appliedFromText =
        (!cameraMake && Boolean(fromText.make)) || (!cameraModel && Boolean(fromText.model));
      if (!cameraMake && fromText.make) cameraMake = fromText.make;
      if (!cameraModel && fromText.model) cameraModel = fromText.model;
      if (appliedFromText) {
        debugPhotoMeta('camera-from-text', {
          assetKey,
          description: rawDescription,
          keywords: rawKeywords,
          cameraMake,
          cameraModel,
        });
      }
    }

    if (!isIphone && cameraMake && cameraModel) {
      cameraModel = stripLeadingToken(cameraModel, cameraMake);
    }

    if (isIphone) {
      cameraMake = undefined;
      lensMake = undefined;
      lensModel = undefined;
      debugPhotoMeta('iphone-suppress', {
        assetKey,
        rawCameraMake,
        rawCameraModel,
        rawLensMake,
        rawLensModel,
        cameraModel,
        cameraType,
      });
    } else if (cameraMake || cameraModel || lensMake || lensModel) {
      debugPhotoMeta('extracted', {
        assetKey,
        cameraMake,
        cameraModel,
        lensMake,
        lensModel,
        lensMakeDerived,
      });
    }

    const width =
      rationalToNumber(exif.ImageWidth) ??
      rationalToNumber((exif as any).ExifImageWidth) ??
      rationalToNumber((exif as any).PixelXDimension);
    const height =
      rationalToNumber(exif.ImageHeight) ??
      rationalToNumber((exif as any).ExifImageHeight) ??
      rationalToNumber((exif as any).PixelYDimension);
    const megapixels = width && height ? `${Math.round((width * height) / 1_000_000)} MP` : undefined;
    const focalLengthPhysicalRaw = rationalToNumber(exif.FocalLength);
    const focalLengthPhysical =
      typeof focalLengthPhysicalRaw === 'number' && focalLengthPhysicalRaw > 0
        ? focalLengthPhysicalRaw
        : undefined;
    const focalLength35Raw =
      rationalToNumber((exif as any).FocalLengthIn35mmFilm) ??
      rationalToNumber((exif as any).FocalLengthIn35mmFormat);
    const focalLength35 =
      typeof focalLength35Raw === 'number' && focalLength35Raw > 0 ? focalLength35Raw : undefined;
    const focalPlaneXRes = rationalToNumber((exif as any).FocalPlaneXResolution);
    const resolutionUnit = rationalToNumber((exif as any).FocalPlaneResolutionUnit);
    let equivalentFocal = focalLength35;
    if (!equivalentFocal && focalLengthPhysical && width && focalPlaneXRes) {
      const unitMM = resolutionUnitToMM(resolutionUnit);
      if (unitMM) {
        const sensorWidthMm = width * (unitMM / focalPlaneXRes);
        if (sensorWidthMm > 0) {
          equivalentFocal = focalLengthPhysical * (36 / sensorWidthMm);
        }
      }
    }
    const focalLengthNumber =
      equivalentFocal ??
      (isIphone ? approximateIphoneFocal(cameraType, focalLengthPhysical) : undefined) ??
      focalLengthPhysical;
    const focalLength = focalLengthNumber ? `${formatDecimal(focalLengthNumber)} MM` : undefined;
    const fNumber =
      rationalToNumber((exif as any).FNumber) ?? rationalToNumber((exif as any).ApertureValue);
    const aperture = fNumber ? formatDecimal(fNumber) : undefined;
    let exposureTime: string | undefined;
    const exposureRaw = rationalToNumber(exif.ExposureTime);
    if (exposureRaw && exposureRaw > 0) {
      exposureTime =
        exposureRaw >= 1
          ? `${exposureRaw.toFixed(1)}S`.replace(/\.0S$/, 'S')
          : `1/${Math.round(1 / exposureRaw)}S`;
    }
    const iso = typeof exif.ISO === 'number' ? `${exif.ISO}` : undefined;

    const meta: PhotoMetadata = {
      cameraMake,
      cameraModel,
      cameraType,
      lensMake,
      lensModel,
      megapixels,
      focalLength,
      aperture,
      exposureTime,
      iso,
    };
    photoMetaCache.set(assetKey, meta);
    return meta;
  } catch (err) {
    console.warn('Failed to read photo metadata for', assetKey, err);
    photoMetaCache.set(assetKey, {});
    return undefined;
  }
}

export function getAlbums(section: Section): (Album & { _section: Section })[] {
  logPlaceholderCoverage();
  const entries = jsonGlobs[section];
  const albumsBySlug = new Map<string, Album & { _section: Section }>();

  for (const [path, mod] of Object.entries(entries)) {
    // @ts-ignore - JSON default export
    const data: Album = (mod as any).default || (mod as any);
    const slug = data.slug || slugFromPath(path);
    albumsBySlug.set(slug, { ...data, slug, _section: section });
  }

  for (const entry of placeholderProjects) {
    if (entry.section !== section) continue;
    // Placeholder takes precedence over local files for the same slug.
    albumsBySlug.set(entry.slug, buildPlaceholderAlbum(entry));
  }

  const albums = Array.from(albumsBySlug.values());
  const sortKey = (album: Album) =>
    album.placeholder?.sortDate ||
    album.date ||
    album.dateCreated ||
    album.displayDate ||
    '';

  albums.sort((a, b) => {
    const aPlaceholder = a.placeholder?.enabled ? 1 : 0;
    const bPlaceholder = b.placeholder?.enabled ? 1 : 0;
    if (aPlaceholder !== bPlaceholder) return aPlaceholder - bPlaceholder;

    const byDate = sortKey(b).localeCompare(sortKey(a));
    if (byDate !== 0) return byDate;
    return a.title.localeCompare(b.title);
  });

  return albums;
}

export function getAlbum(section: Section, slug: string): (Album & { _section: Section }) | undefined {
  return getAlbums(section).find((a) => a.slug === slug);
}

export async function resolveAlbumMediaUrls(section: Section, slug: string, album: Album): Promise<Album> {
  const allAssets = mediaGlobs[section]; // e.g. keys like '../content/photos/sf-street/media/01.jpg'
  // Build a small map: filename -> emitted URL + source path for THIS slug only
  const assetInfo = new Map<string, { url: string; sourcePath: string }>();
  for (const [path, url] of Object.entries(allAssets)) {
    if (path.includes(`/${slug}/media/`)) {
      const normalized = typeof url === 'string' ? url : String(url);
      assetInfo.set(filenameFromPath(path), { url: normalized, sourcePath: path });
    }
  }

  const getAssetInfo = (name?: string) => {
    if (!name) return undefined;
    return assetInfo.get(filenameFromPath(name));
  };
  const mapUrl = (name?: string) => {
    if (!name) return name;
    return getAssetInfo(name)?.url ?? name;
  };

  const media = await Promise.all(album.media.map(async (item) => {
    if (item.type === 'image') {
      const info = getAssetInfo(item.src);
      const meta = section === 'photos' ? await readPhotoMetadata(info?.sourcePath) : undefined;
      return { ...item, src: info?.url ?? item.src, meta };
    }
    if (item.type === 'video') {
      const explicitSources = Array.isArray((item as any).sources)
        ? (item as any).sources
        : undefined;
      const fallbackSrc = (item as any).src;

      const sources = (explicitSources && explicitSources.length > 0)
        ? explicitSources.map((s: VideoSource) => ({ ...s, src: mapUrl(s.src)! }))
        : fallbackSrc
          ? [{ src: mapUrl(fallbackSrc)! }]
          : [];

      const mappedSrc = fallbackSrc ? mapUrl(fallbackSrc)! : undefined;

      return {
        ...item,
        poster: mapUrl((item as any).poster),
        sources,
        ...(mappedSrc ? { src: mappedSrc } : {}),
      };
    }
    if (item.type === 'model') {
      return { ...item, src: mapUrl(item.src)!, usdz: mapUrl(item.usdz) };
    }
    return item;
  }));

  return {
    ...album,
    cover: mapUrl(album.cover),
    media,
  };
}
