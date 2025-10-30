// src/scripts/prefetch.ts
// Prefetch internal page links when users hover/focus OR when tiles enter the viewport.
// Keeps mobile data use in check and avoids duplicate prefetches.

const supportsPrefetch = (() => {
  try { return (document.createElement('link') as any).relList.supports('prefetch'); }
  catch { return false; }
})();

const saveData = (navigator as any).connection?.saveData === true;
const effectiveType = (navigator as any).connection?.effectiveType || '4g';
const tooSlow = /2g/.test(effectiveType);

if (!saveData && !tooSlow) {
  const prefetched = new Set<string>();

  function internal(url: string) {
    try {
      const u = new URL(url, location.href);
      return u.origin === location.origin;
    } catch { return false; }
  }

  function doPrefetch(href: string) {
    if (prefetched.has(href) || !internal(href)) return;
    prefetched.add(href);

    const link = document.createElement('link');
    link.rel = supportsPrefetch ? 'prefetch' : 'prerender';
    link.href = href;
    link.as = 'document';
    document.head.appendChild(link);
  }

  // 1) Hover/focus prefetch
  addEventListener('mouseover', (e) => {
    const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
    if (a && a.href !== location.href) doPrefetch(a.href);
  }, { capture: true, passive: true });

  addEventListener('focusin', (e) => {
    const a = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
    if (a && a.href !== location.href) doPrefetch(a.href);
  });

  // 2) In-view prefetch (e.g., section tiles)
  const io = new IntersectionObserver((entries) => {
    for (const ent of entries) {
      if (ent.isIntersecting) {
        const a = ent.target as HTMLAnchorElement;
        io.unobserve(a);
        doPrefetch(a.href);
      }
    }
  }, { rootMargin: '300px' });

  function observeAnchors(root: ParentNode = document) {
    root.querySelectorAll('a[href]').forEach(a => io.observe(a));
  }

  observeAnchors();
  // If your pages hydrate in islands and inject links later, you can expose observeAnchors for reuse:
  (window as any).__observeAnchorsForPrefetch = observeAnchors;
}