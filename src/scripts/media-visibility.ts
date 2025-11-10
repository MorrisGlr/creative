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

  const parallaxTargets = blocks
    .map((block) => {
      const panel = block.querySelector<HTMLElement>('.photo-meta-panel');
      return panel ? { block, panel } : null;
    })
    .filter((entry): entry is { block: HTMLElement; panel: HTMLElement } => Boolean(entry));

  if (parallaxTargets.length) {
    const updateParallax = () => {
      const viewHeight = window.innerHeight || 1;
      parallaxTargets.forEach(({ block, panel }) => {
        const rect = block.getBoundingClientRect();
        const blockHeight = rect.height || 1;
        const center = rect.top + blockHeight / 2;
        const distanceFromCenter = Math.abs(center - viewHeight / 2);
        const progress = 1 - Math.min(distanceFromCenter / (viewHeight / 2), 1);
        const eased = Math.max(0, Math.min(1, progress));
        panel.style.setProperty('--meta-progress', eased.toFixed(3));
        const offset = (1 - eased) * 32; // px parallax shift
        panel.style.setProperty('--meta-offset', `${offset}px`);
      });
    };

    const startLoop = () => {
      updateParallax();
      (window as any).__mediaParallaxRaf = requestAnimationFrame(startLoop);
    };

    if (!(window as any).__mediaParallaxActive) {
      (window as any).__mediaParallaxActive = true;
      startLoop();
      window.addEventListener('resize', updateParallax);
    } else {
      updateParallax();
    }
  }
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
