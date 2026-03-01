const BASE_URL = import.meta.env.BASE_URL || '/';

function normalizedBase(): string {
  const trimmed = BASE_URL.trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

export function withBase(pathname: string): string {
  const base = normalizedBase();
  const clean = pathname.replace(/^\/+/, '');
  if (!clean) return base;
  return `${base}${clean}`;
}

export function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  const prefixed = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return prefixed.replace(/\/+$/, '') || '/';
}
