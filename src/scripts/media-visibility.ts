const DATA_ATTR = 'data-visible';
const DATA_META = 'data-meta';
const DATA_CAPTION = 'data-caption';

const metaShownAt = new WeakMap<HTMLElement, number>();
const blockSeenAt = new WeakMap<HTMLElement, number>();

const makeScrollDebugger = () => {
  if (typeof window === 'undefined') return () => {};
  const flag = (window as any).__SCROLL_DEBUG;
  const envDefault = Boolean((import.meta as any)?.env?.DEV);
  const isDebug = typeof flag === 'boolean' ? flag : envDefault;
  return (label: string, payload?: Record<string, unknown>) => {
    if (!isDebug) return;
    const timestamp = performance.now().toFixed(1);
    console.info(`[scroll-debug] ${label}`, { t: timestamp, ...(payload ?? {}) });
  };
};
const debugScroll = makeScrollDebugger();

type MediaSize = { width: number; height: number };

const getMediaSize = (el: Element): MediaSize | null => {
  if (el instanceof HTMLImageElement && el.naturalWidth > 0 && el.naturalHeight > 0) {
    return { width: el.naturalWidth, height: el.naturalHeight };
  }
  if (el instanceof HTMLVideoElement && el.videoWidth > 0 && el.videoHeight > 0) {
    return { width: el.videoWidth, height: el.videoHeight };
  }
  const anyEl = el as any;
  if (typeof anyEl.videoWidth === 'number' && typeof anyEl.videoHeight === 'number') {
    const { videoWidth, videoHeight } = anyEl as { videoWidth: number; videoHeight: number };
    if (videoWidth > 0 && videoHeight > 0) return { width: videoWidth, height: videoHeight };
  }
  return null;
};

const describeOrientation = (size: MediaSize | null): 'landscape' | 'portrait' | 'square' | 'unknown' => {
  if (!size) return 'unknown';
  if (size.width === size.height) return 'square';
  return size.width > size.height ? 'landscape' : 'portrait';
};

let loggedMediaSamples = false;
const logMediaSamples = (blocks: HTMLElement[]) => {
  if (loggedMediaSamples) return;
  loggedMediaSamples = true;
  requestAnimationFrame(() => {
    blocks.slice(0, 5).forEach((block) => {
      const media = block.querySelector<HTMLElement>('img, video, model-viewer');
      if (!media) return;
      const rect = media.getBoundingClientRect();
      const intrinsic = getMediaSize(media) ?? (rect.width && rect.height ? { width: rect.width, height: rect.height } : null);
      const orientation = describeOrientation(intrinsic);
      const wrapper = media.closest<HTMLElement>('.media-visual__media') ?? media.parentElement ?? media;
      const mediaStyle = getComputedStyle(media);
      const wrapperStyle = getComputedStyle(wrapper);
      debugScroll('media-shape', {
        index: block.dataset.index,
        tag: media.tagName.toLowerCase(),
        orientation,
        size: intrinsic,
        radius: mediaStyle.borderRadius || wrapperStyle.borderRadius,
        wrapperRadius: wrapperStyle.borderRadius,
        boxShadow: wrapperStyle.boxShadow || mediaStyle.boxShadow,
      });
    });
  });
};

const isElementInViewport = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const viewHeight = window.innerHeight || 1;
  return rect.bottom > 0 && rect.top < viewHeight;
};

const setVisible = (block: HTMLElement, visible: boolean) => {
  block.setAttribute(DATA_ATTR, visible ? '1' : '0');
};

const setMetaVisible = (block: HTMLElement, visible: boolean) => {
  const prev = block.getAttribute(DATA_META) === '1';
  if (prev === visible) return;
  block.setAttribute(DATA_META, visible ? '1' : '0');
  if (visible) {
    metaShownAt.set(block, performance.now());
  } else {
    metaShownAt.delete(block);
  }
  debugScroll('meta', { index: block.dataset.index, visible });
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
  if (!visible && captionBlock && isElementInViewport(captionBlock)) {
    visible = true;
  }

  const prev = block.getAttribute(DATA_CAPTION) === '1';
  block.setAttribute(DATA_CAPTION, visible ? '1' : '0');
  if (visible) {
    splitText(splitTarget);
    requestAnimationFrame(() => caption.classList.add('is-revealed'));
  } else {
    caption.classList.remove('is-revealed');
  }
  if (prev !== visible) {
    debugScroll('caption', { index: block.dataset.index, visible });
  }
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

  const scrollToIndex = (idx: number, direction: number) => {
    const clamped = Math.max(0, Math.min(stops.length - 1, idx));
    const target = stops[clamped];
    if (!target) return null;
    const behavior = prefersReduced ? 'auto' : 'smooth';
    debugScroll('snap', {
      direction: direction > 0 ? 'next' : 'prev',
      from: idx - direction,
      to: clamped,
      behavior,
      target: target.className,
    });
    target.scrollIntoView({ behavior, block: 'center', inline: 'nearest' });
    return target;
  };

  let snapping = false;
  let lastSnapAt = 0;
  let lastSnapDirection: number | null = null;
  let releaseTimer: number | undefined;
  const QUIET_RELEASE_MS = 80; // wait this long after last wheel/scroll before another snap
  const MIN_GAP_BETWEEN_SNAPS_MS = 420; // hard minimum gap for same-direction snaps (prevents double-step on long flicks)
  const MIN_LOCK_MS = 280; // minimum time we stay locked after a snap starts
  const MAX_LOCK_MS = 700; // hard ceiling before we allow another snap
  const ALIGN_THRESHOLD = 12; // px from viewport center to consider settled
  const RESCAN_MS = 32;
  let activeTarget: HTMLElement | null = null;
  let lastWheelAt = 0;

  const canRelease = () => {
    const now = performance.now();
    const quiet = now - lastWheelAt;
    const elapsed = now - lastSnapAt;
    if (quiet < QUIET_RELEASE_MS) return false;
    if (elapsed < MIN_LOCK_MS) return false;
    if (!activeTarget) return true;
    const centerY = viewHeight() / 2;
    const rect = activeTarget.getBoundingClientRect();
    const dist = Math.abs(rect.top + rect.height / 2 - centerY);
    if (dist <= ALIGN_THRESHOLD) return true;
    if (elapsed >= MAX_LOCK_MS) return true;
    return false;
  };

  const scheduleRelease = (reason: string) => {
    if (!snapping) return;
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => {
      if (canRelease()) {
        snapping = false;
        releaseTimer = undefined;
        debugScroll('unlock', { reason });
      } else {
        scheduleRelease(`${reason}-retry`);
      }
    }, RESCAN_MS);
    debugScroll('schedule-unlock', { reason, target: activeTarget?.className });
  };

  const onScroll = () => {
    if (!snapping) return;
    scheduleRelease('scroll-quiet');
  };

  const onWheel = (event: WheelEvent) => {
    const dy = event.deltaY;
    if (Math.abs(dy) < 1) return;
    const now = performance.now();
    lastWheelAt = now;
    const direction = dy > 0 ? 1 : -1;

    // If the previous snap was very recent in the same direction, treat this as residual inertia.
    if (!snapping && lastSnapDirection !== null && direction === lastSnapDirection) {
      const since = now - lastSnapAt;
      if (since < MIN_GAP_BETWEEN_SNAPS_MS) {
        event.preventDefault();
        debugScroll('snap-gap-block', { since: since.toFixed(1), direction });
        return;
      }
    }

    if (snapping) {
      event.preventDefault();
      debugScroll('wheel-blocked', { dy, snapping: true });
      scheduleRelease('wheel-quiet');
      return;
    }

    event.preventDefault();
    const current = nearestStop();
    const currentIdx = current ? stops.indexOf(current) : 0;
    const nextIdx = currentIdx + direction;
    snapping = true;
    const target = scrollToIndex(nextIdx, direction);
    activeTarget = target;
    lastSnapAt = now;
    lastSnapDirection = direction;
    scheduleRelease('after-snap');
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('scroll', onScroll, { passive: true });
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
};

let lastAttributionLeadIndex: string | null = null;
const logLeadAttributionVisibility = (blocks: HTMLElement[]) => {
  const lead = getLeadBlock(blocks);
  if (!lead) return;
  const leadIndex = lead.dataset.index ?? null;
  if (leadIndex && lastAttributionLeadIndex === leadIndex) return;
  lastAttributionLeadIndex = leadIndex;

  const attribution = lead.querySelector<HTMLElement>('.media-attribution');
  const viewHeight = window.innerHeight || 1;
  if (!attribution) {
    debugScroll('attribution', { index: leadIndex, present: false });
    return;
  }
  const rect = attribution.getBoundingClientRect();
  const visible = rect.bottom > 0 && rect.top < viewHeight;
  debugScroll('attribution', {
    index: leadIndex,
    present: true,
    visible,
    rect: {
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      height: Math.round(rect.height),
    },
    text: attribution.textContent?.trim().slice(0, 100),
  });
};

const initMediaVisibility = () => {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>('.media-block'));
  if (!blocks.length) return;

  logMediaSamples(blocks);

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

          const shouldMeta = entry.isIntersecting;
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
    logLeadAttributionVisibility(blocks);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('wheel', () => tryRevealCaption(blocks), { passive: true });
  window.addEventListener('touchend', () => tryRevealCaption(blocks), { passive: true });

  const logTitleFont = (title: HTMLElement, label: string) => {
    const cs = getComputedStyle(title);
    const sampleChar = title.querySelector('.split-char');
    const charStyles = sampleChar ? getComputedStyle(sampleChar) : null;
    console.info('[title-font-debug:split]', {
      label,
      font: cs.fontFamily,
      weight: cs.fontWeight,
      variation: cs.fontVariationSettings,
      charFont: charStyles?.fontFamily ?? 'n/a',
      charWeight: charStyles?.fontWeight ?? 'n/a',
      charVariation: charStyles?.fontVariationSettings ?? 'n/a',
    });
  };

  document.querySelectorAll<HTMLElement>('[data-split-title]').forEach((title) => {
    logTitleFont(title, 'before-split');
    splitText(title);
    logTitleFont(title, 'after-split');
    requestAnimationFrame(() => {
      title.classList.add('is-revealed');
      logTitleFont(title, 'after-reveal');
    });
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
