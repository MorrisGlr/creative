// src/scripts/content.ts
// Purpose: Load page.json for each album and map media filenames -> built asset URLs.
// Why: Astro/Vite can "glob import" JSON and assets at build time for static sites like GitHub Pages.

export type Section = 'photos' | 'textbooks' | 'algo' | 'paper';

type VideoSource = { src: string; type?: string };
type MediaItem =
  | { type: 'image'; src: string; alt?: string; caption?: string }
  | {
      type: 'video';
      sources: VideoSource[];
      poster?: string;
      caption?: string;
    }
  | {
      type: 'model';
      src: string;   // glb
      usdz?: string; // ios
      caption?: string;
      alt?: string;
    };

export interface Album {
  title: string;
  slug: string;
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
  photos: import.meta.glob('../content/photos/*/media/*', { eager: true, import: 'default' }),
  textbooks: import.meta.glob('../content/textbooks/*/media/*', { eager: true, import: 'default' }),
  algo: import.meta.glob('../content/algo/*/media/*', { eager: true, import: 'default' }),
  paper: import.meta.glob('../content/paper/*/media/*', { eager: true, import: 'default' }),
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

export function resolveAlbumMediaUrls(section: Section, slug: string, album: Album): Album {
  const allAssets = mediaGlobs[section]; // e.g. keys like '../content/photos/sf-street/media/01.jpg'
  // Build a small map: filename -> emitted URL for THIS slug only
  const urlByName = new Map<string, string>();

  for (const [path, url] of Object.entries(allAssets)) {
    if (path.includes(`/${slug}/media/`)) {
      urlByName.set(filenameFromPath(path), String(url));
    }
  }

  const mapName = (name?: string) => (name ? urlByName.get(filenameFromPath(name)) ?? name : name);

  const media = album.media.map((item) => {
    if (item.type === 'image') {
      return { ...item, src: mapName(item.src)! };
    }
    if (item.type === 'video') {
      return {
        ...item,
        poster: mapName(item.poster),
        sources: item.sources.map((s) => ({ ...s, src: mapName(s.src)! })),
      };
    }
    if (item.type === 'model') {
      return { ...item, src: mapName(item.src)!, usdz: mapName(item.usdz) };
    }
    return item;
  });

  return {
    ...album,
    cover: mapName(album.cover),
    media,
  };
}