const STOP_SELECTOR = '.project-hero, .media-block, .media-caption-block, .catalog-card-wrap';
const COOLDOWN_MS = 600;

export const initGalleryNav = () => {
  const nav = document.querySelector<HTMLElement>('[data-gallery-nav]');
  if (!nav) return;

  const stops = Array.from(document.querySelectorAll<HTMLElement>(STOP_SELECTOR));

  if (stops.length < 2) {
    nav.style.display = 'none';
    return;
  }

  // Build progress dots
  const dotsContainer = nav.querySelector<HTMLElement>('.gallery-nav__dots');
  const dots: HTMLButtonElement[] = [];

  if (dotsContainer) {
    stops.forEach((stop, i) => {
      const dot = document.createElement('button');
      dot.className = 'gallery-nav__dot';
      dot.setAttribute('role', 'listitem');
      dot.setAttribute('aria-label', `Go to item ${i + 1} of ${stops.length}`);
      dot.addEventListener('click', () => scrollToStop(i));
      dotsContainer.appendChild(dot);
      dots.push(dot);
    });
  }

  const upBtn = nav.querySelector<HTMLButtonElement>('[data-dir="up"]');
  const downBtn = nav.querySelector<HTMLButtonElement>('[data-dir="down"]');

  // ── Scroll helpers ─────────────────────────────────────────────────────────

  const getLeadIndex = (): number => {
    const viewMid = window.innerHeight / 2;
    let bestIdx = 0;
    let bestDist = Infinity;
    stops.forEach((stop, i) => {
      const rect = stop.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - viewMid);
      if (dist < bestDist) { bestDist = dist; bestIdx = i; }
    });
    return bestIdx;
  };

  const scrollToStop = (idx: number) => {
    const target = stops[Math.max(0, Math.min(stops.length - 1, idx))];
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  };

  // ── Active dot tracking ────────────────────────────────────────────────────

  let rafPending = false;
  const syncDots = () => {
    if (!dots.length) return;
    const active = getLeadIndex();
    dots.forEach((dot, i) => {
      if (i === active) dot.setAttribute('data-active', '');
      else dot.removeAttribute('data-active');
    });
  };

  const queueSync = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; syncDots(); });
  };

  window.addEventListener('scroll', queueSync, { passive: true });
  syncDots();

  // ── Keyboard navigation ────────────────────────────────────────────────────

  let lastScrollAt = 0;

  const isEditableTarget = (el: Element | null): boolean => {
    if (!el) return false;
    const tag = (el as HTMLElement).tagName?.toLowerCase();
    return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
  };

  const step = (direction: 1 | -1) => {
    const now = performance.now();
    if (now - lastScrollAt < COOLDOWN_MS) return;
    lastScrollAt = now;
    const next = getLeadIndex() + direction;
    scrollToStop(next);
  };

  window.addEventListener('keydown', (e) => {
    if (isEditableTarget(document.activeElement)) return;

    const dir: 1 | -1 | null =
      (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') ? 1 :
      (e.key === 'ArrowUp'   || e.key === 'PageUp')                    ? -1 :
      null;

    if (dir === null) return;
    if (e.key === ' ') e.preventDefault(); // prevent page-jump

    step(dir);

    const btn = dir === 1 ? downBtn : upBtn;
    btn?.setAttribute('data-pressed', '');
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') downBtn?.removeAttribute('data-pressed');
    if (e.key === 'ArrowUp'   || e.key === 'PageUp')                    upBtn?.removeAttribute('data-pressed');
  });

  // ── Arrow button click handlers ────────────────────────────────────────────

  upBtn?.addEventListener('click',   () => step(-1));
  downBtn?.addEventListener('click', () => step(1));
};

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGalleryNav, { once: true });
  } else {
    initGalleryNav();
  }
}
