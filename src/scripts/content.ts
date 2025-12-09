// src/scripts/content.ts
// Purpose: Load page.json for each album and map media filenames -> built asset URLs.
// Why: Astro/Vite can "glob import" JSON and assets at build time for static sites like GitHub Pages.

import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import exifr from 'exifr';

export type Section = 'photos' | 'textbooks' | 'algo' | 'paper';

export interface PhotoMetadata {
  cameraModel?: string;
  cameraType?: string;
  megapixels?: string;
  focalLength?: string;
  aperture?: string;
  exposureTime?: string;
  iso?: string;
}

type VideoSource = { src: string; type?: string };
type ImageItem = { type: 'image'; src: string; alt?: string; caption?: string; meta?: PhotoMetadata };
type VideoItem = {
  type: 'video';
  sources?: VideoSource[];
  src?: string;
  poster?: string;
  caption?: string;
  alt?: string;
};
type ModelItem = {
  type: 'model';
  src: string;   // glb
  usdz?: string; // ios
  caption?: string;
  alt?: string;
};
type MediaItem = ImageItem | VideoItem | ModelItem;

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

const photoMetaCache = new Map<string, PhotoMetadata>();

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
    const fileUrl = new URL(assetKey, import.meta.url);
    const filePath = fileURLToPath(fileUrl);
    const buffer = await fs.readFile(filePath);
    const exif = await exifr.parse(buffer, {
      pick: [
        'Model',
        'LensModel',
        'Make',
        'FocalLength',
        'FocalLengthIn35mmFilm',
        'ExposureTime',
        'ISO',
        'ImageWidth',
        'ImageHeight',
        'ExifImageWidth',
        'ExifImageHeight',
        'PixelXDimension',
        'PixelYDimension',
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
    const cameraModel = typeof exif.Model === 'string' ? exif.Model.trim() : undefined;
    const lensModel = typeof (exif as any).LensModel === 'string' ? (exif as any).LensModel.trim() : undefined;
    const isIphone =
      cameraModel?.toLowerCase().includes('iphone') ||
      (typeof exif.Make === 'string' && exif.Make.toLowerCase().includes('apple'));
    let cameraType: string | undefined;
    if (isIphone && lensModel) {
      const lower = lensModel.toLowerCase();
      if (lower.includes('tele')) cameraType = 'Telephoto Camera';
      else if (lower.includes('ultra')) cameraType = 'Ultra Wide Camera';
      else if (lower.includes('front')) cameraType = 'Front Camera';
      else if (lower.includes('rear')) cameraType = 'Rear Camera';
      else cameraType = 'Back Camera';
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
    const focalLengthPhysical = rationalToNumber(exif.FocalLength);
    const focalLength35 = rationalToNumber((exif as any).FocalLengthIn35mmFilm);
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
      cameraModel,
      cameraType,
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
  const entries = jsonGlobs[section];
  const albums: (Album & { _section: Section })[] = [];

  for (const [path, mod] of Object.entries(entries)) {
    // @ts-ignore - JSON default export
    const data: Album = (mod as any).default || (mod as any);
    const slug = data.slug || slugFromPath(path);
    albums.push({ ...data, slug, _section: section });
  }
  // Optional: sort by date desc or title
  albums.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
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
