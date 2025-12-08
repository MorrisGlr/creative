const DATA_ATTR = 'data-visible';
const DATA_META = 'data-meta';
const DATA_CAPTION = 'data-caption';

const metaShownAt = new WeakMap<HTMLElement, number>();
const blockSeenAt = new WeakMap<HTMLElement, number>();

const isElementInViewport = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const viewHeight = window.innerHeight || 1;
  return rect.bottom > 0 && rect.top < viewHeight;
};

const setVisible = (block: HTMLElement, visible: boolean) => {
  block.setAttribute(DATA_ATTR, visible ? '1' : '0');
};

const setMetaVisible = (block: HTMLElement, visible: boolean) => {
  block.setAttribute(DATA_META, visible ? '1' : '0');
  if (visible) {
    metaShownAt.set(block, performance.now());
  } else {
    metaShownAt.delete(block);
  }
};

const splitText = (target: HTMLElement) => {
  if (!target || target.dataset.split === '1') return;
  const text = target.textContent || '';
  const frag = document.createDocumentFragment();
  const letters = Array.from(text).filter((ch) => ch !== ' ' && ch !== '\n');
  const totalSpans = Math.max(1, letters.length);
  let charIndex = 0;
  const tokens = text.split(/(\s+)/);
  tokens.forEach((token) => {
    if (/^\s+$/.test(token)) {
      frag.appendChild(document.createTextNode(token));
      return;
    }
    if (token.length === 0) return;
    const word = document.createElement('span');
    word.className = 'split-word';
    Array.from(token).forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.className = 'split-char';
      span.style.setProperty('--char-index', `${charIndex}`);
      const frac = totalSpans > 1 ? charIndex / (totalSpans - 1) : 0;
      span.style.setProperty('--char-frac', `${frac}`);
      word.appendChild(span);
      charIndex += 1;
    });
    frag.appendChild(word);
  });
  target.textContent = '';
  target.appendChild(frag);
  target.style.setProperty('--char-count', `${totalSpans}`);
  target.dataset.split = '1';
};

const setCaptionVisible = (block: HTMLElement, visible: boolean) => {
  const captionBlock = document.querySelector<HTMLElement>(`[data-caption-for="${block.dataset.index}"]`);
  const caption = captionBlock?.querySelector<HTMLElement>('.media-caption');
  if (!caption) return;
  const splitTarget = caption.querySelector<HTMLElement>('[data-split-caption]') ?? caption;
  if (visible) {
    block.setAttribute(DATA_CAPTION, '1');
    splitText(splitTarget);
    requestAnimationFrame(() => caption.classList.add('is-revealed'));
    return;
  }

  if (captionBlock && isElementInViewport(captionBlock)) {
    block.setAttribute(DATA_CAPTION, '1');
    return;
  }

  block.setAttribute(DATA_CAPTION, '0');
  caption.classList.remove('is-revealed');
};

const getLeadBlock = (blocks: HTMLElement[]) => {
  const viewHeight = window.innerHeight || 1;
  let best: HTMLElement | null = null;
  let bestDistance = Infinity;

  blocks.forEach((block) => {
    const rect = block.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= viewHeight) {
      blockSeenAt.delete(block);
      return;
    }
    if (!blockSeenAt.has(block)) {
      blockSeenAt.set(block, performance.now());
    }
    const center = rect.top + rect.height / 2;
    const distance = Math.abs(center - viewHeight / 2);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = block;
    }
  });

  return best;
};

const initStepSnapScroll = () => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;
  if ((window as any).__stepSnapActive) return;

  const stops = Array.from(
    document.querySelectorAll<HTMLElement>('.project-hero, .media-block, .media-caption-block')
  ).filter(Boolean);

  if (stops.length < 2) return;
  (window as any).__stepSnapActive = true;

  const viewHeight = () => window.innerHeight || 1;
  const nearestStop = () => {
    let best: HTMLElement | null = null;
    let bestDistance = Infinity;
    const centerY = viewHeight() / 2;
    stops.forEach((stop) => {
      const rect = stop.getBoundingClientRect();
      const stopCenter = rect.top + rect.height / 2;
      const distance = Math.abs(stopCenter - centerY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = stop;
      }
    });
    return best;
  };

  const scrollToIndex = (idx: number) => {
    const target = stops[Math.max(0, Math.min(stops.length - 1, idx))];
    if (!target) return;
    const behavior = prefersReduced ? 'auto' : 'smooth';
    target.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });
  };

  let locked = false;
  let unlockTimer: number | undefined;
  let lastWheelAt = 0;
  const QUIET_MS = 25; // require this quiet time before another step

  const scheduleUnlock = () => {
    if (unlockTimer) clearTimeout(unlockTimer);
    unlockTimer = window.setTimeout(() => { locked = false; }, QUIET_MS);
  };

  const onWheel = (event: WheelEvent) => {
    const dy = event.deltaY;
    if (Math.abs(dy) < 2) return;
    event.preventDefault();
    lastWheelAt = performance.now();
    if (locked) {
      scheduleUnlock();
      return;
    }
    locked = true;
    const current = nearestStop();
    const currentIdx = current ? stops.indexOf(current) : 0;
    const nextIdx = dy > 0 ? currentIdx + 1 : currentIdx - 1;
    scrollToIndex(nextIdx);
    scheduleUnlock();
  };

  window.addEventListener('wheel', onWheel, { passive: false });
};

const initScrollBrake = () => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasPhotoMeta = document.querySelector('.photo-meta-panel') !== null;
  if (prefersReduced || !hasPhotoMeta) return;
  if ((window as any).__stepSnapActive) return;
  if ((window as any).__scrollBrakeActive) return;

  const MAX_STEP = 140; // px per frame for very fast flicks
  const MIN_STEP = 6;   // absorb micro steps that cause snap jitter
  let pendingY = 0;
  let raf = 0;
  let lastTouchY: number | null = null;

  const flush = () => {
    if (pendingY !== 0) {
      window.scrollBy({ top: pendingY, behavior: 'auto' });
      pendingY = 0;
    }
    raf = 0;
  };

  const enqueue = (deltaY: number) => {
    const limited = Math.sign(deltaY) * Math.min(Math.abs(deltaY), MAX_STEP);
    pendingY += limited;
    if (!raf) {
      raf = requestAnimationFrame(flush);
    }
  };

  const onWheel = (event: WheelEvent) => {
    const dy = event.deltaY;
    const mag = Math.abs(dy);
    if (mag <= MAX_STEP && mag >= MIN_STEP) return;
    event.preventDefault();
    enqueue(dy);
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      lastTouchY = null;
      return;
    }
    lastTouchY = event.touches[0].clientY;
  };

  const onTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 1 || lastTouchY === null) {
      lastTouchY = null;
      return;
    }
    const currentY = event.touches[0].clientY;
    const dy = lastTouchY - currentY;
    lastTouchY = currentY;
    const mag = Math.abs(dy);
    if (mag <= MAX_STEP && mag >= MIN_STEP) return;
    event.preventDefault();
    enqueue(dy);
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });

  (window as any).__scrollBrakeActive = true;
};

const tryRevealCaption = (blocks: HTMLElement[]) => {
  const lead = getLeadBlock(blocks);
  if (!lead) return;
  const caption = document.querySelector<HTMLElement>(
    `[data-caption-for="${lead.dataset.index}"] .media-caption`
  );
  if (!caption) return;
  if (lead.getAttribute(DATA_CAPTION) === '1') return;
  const hasMetaPanel = !!lead.querySelector('.photo-meta-panel');
  if (hasMetaPanel && lead.getAttribute(DATA_META) !== '1') return;
  const seenAt = blockSeenAt.get(lead);
  if (!seenAt || performance.now() - seenAt < 240) return;
  const shownAt = metaShownAt.get(lead) ?? 0;
  if (performance.now() - shownAt < 260) return;
  setCaptionVisible(lead, true);
  setMetaVisible(lead, false);
};

const initMediaVisibility = () => {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('.media-block'));
  if (!blocks.length) return;

  const showAll = () => blocks.forEach((block) => {
    setVisible(block, true);
    setMetaVisible(block, true);
    setCaptionVisible(block, false);
  });
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsIO = 'IntersectionObserver' in window;

  if (!supportsIO) {
    showAll();
  } else {
    blocks.forEach((block) => {
      if (!block.hasAttribute(DATA_ATTR)) {
        setVisible(block, prefersReduced ? true : false);
        setMetaVisible(block, false);
        setCaptionVisible(block, false);
      }
    });

    const prefetchNextMedia = (block: HTMLElement) => {
      const idx = blocks.indexOf(block);
      if (idx === -1) return;
      const next = blocks[idx + 1];
      if (!next || next.dataset.prefetched === '1') return;

      const img = next.querySelector<HTMLImageElement>('img');
      if (img?.src) {
        const preload = new Image();
        preload.src = img.src;
        next.dataset.prefetched = '1';
        return;
      }
      const source = next.querySelector<HTMLSourceElement>('video source');
      if (source?.src) {
        fetch(source.src).catch(() => {});
        next.dataset.prefetched = '1';
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const block = entry.target as HTMLElement;
          setVisible(block, prefersReduced ? true : entry.isIntersecting);

          const captionActive = block.getAttribute(DATA_CAPTION) === '1';
          const shouldMeta = entry.isIntersecting && !captionActive;
          setMetaVisible(block, shouldMeta);

          if (!entry.isIntersecting) {
            setCaptionVisible(block, false);
          }
          if (entry.isIntersecting) prefetchNextMedia(block);
        });
      },
      { rootMargin: '0px 0px -5% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );

    blocks.forEach((block) => io.observe(block));
  }

  const parallaxTargets = blocks
    .map((block) => {
      const panel = block.querySelector<HTMLElement>('.photo-meta-panel');
      return panel ? { block, panel } : null;
    })
    .filter((entry): entry is { block: HTMLElement; panel: HTMLElement } => Boolean(entry));

  if (!prefersReduced && parallaxTargets.length) {
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

    let parallaxScheduled = false;
    const queueParallax = () => {
      if (parallaxScheduled) return;
      parallaxScheduled = true;
      requestAnimationFrame(() => {
        parallaxScheduled = false;
        updateParallax();
      });
    };

    updateParallax();
    window.addEventListener('scroll', queueParallax, { passive: true });
    window.addEventListener('resize', queueParallax);
  }

  const SCROLL_DELTA = 14;
  let lastScrollY = window.scrollY;
  const onScroll = () => {
    const delta = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;
    if (delta < SCROLL_DELTA) return;
    tryRevealCaption(blocks);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', () => tryRevealCaption(blocks), { passive: true });
  window.addEventListener('touchend', () => tryRevealCaption(blocks), { passive: true });

  document.querySelectorAll<HTMLElement>('[data-split-title]').forEach((title) => {
    splitText(title);
    requestAnimationFrame(() => title.classList.add('is-revealed'));
  });

  initStepSnapScroll();
  initScrollBrake();
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
