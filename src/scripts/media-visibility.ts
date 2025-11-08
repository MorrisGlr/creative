const DATA_ATTR = 'data-visible';

const setVisible = (block: HTMLElement, visible: boolean) => {
  block.setAttribute(DATA_ATTR, visible ? '1' : '0');
};

const initMediaVisibility = () => {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('.media-block'));
  if (!blocks.length) return;

  const showAll = () => blocks.forEach((block) => setVisible(block, true));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced || !('IntersectionObserver' in window)) {
    showAll();
    return;
  }

  blocks.forEach((block) => {
    if (!block.hasAttribute(DATA_ATTR)) {
      setVisible(block, false);
    }
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        setVisible(entry.target as HTMLElement, entry.isIntersecting);
      });
    },
    { rootMargin: '0px 0px -20% 0px', threshold: 0.3 }
  );

  blocks.forEach((block) => io.observe(block));
};

if (typeof window !== 'undefined') {
  if ((window as any).__mediaVisibilityInitialized) {
    initMediaVisibility();
  } else {
    (window as any).__mediaVisibilityInitialized = true;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initMediaVisibility, { once: true });
    } else {
      initMediaVisibility();
    }
  }
}
