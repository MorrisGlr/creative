// src/scripts/social.ts
// Normalizes src/content/social.json into an ordered list of social links.
// Footer, Contact, and the About page's Person JSON-LD all read through here
// so the networks, their order, and empty-value handling stay in sync.

export type SocialKey = 'bluesky' | 'linkedin' | 'github';

export interface SocialLink {
  key: SocialKey;
  label: string;
  url: string;
  /** Display handle without a leading "@" (Bluesky only). */
  handle?: string;
}

// Display order: Bluesky first — it is the art-facing channel.
const NETWORKS: ReadonlyArray<{ key: SocialKey; label: string; handleKey?: string }> = [
  { key: 'bluesky',  label: 'Bluesky', handleKey: 'blueskyHandle' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'github',   label: 'GitHub' },
];

function cleanString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getSocialLinks(data: Record<string, unknown>): SocialLink[] {
  const links: SocialLink[] = [];
  for (const { key, label, handleKey } of NETWORKS) {
    const url = cleanString(data[key]);
    if (!url) continue;
    const handle = handleKey ? cleanString(data[handleKey])?.replace(/^@/, '') : undefined;
    links.push(handle ? { key, label, url, handle } : { key, label, url });
  }
  return links;
}

export function getSameAsUrls(data: Record<string, unknown>): string[] {
  return getSocialLinks(data).map(({ url }) => url);
}
