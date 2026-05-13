// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initGalleryNav } from '../keyboard-nav';

// ─── DOM helpers ──────────────────────────────────────────────────────────────

function buildDOM({
  stopCount = 3,
  hasDots = true,
  hasUpBtn = true,
  hasDownBtn = true,
}: {
  stopCount?: number;
  hasDots?: boolean;
  hasUpBtn?: boolean;
  hasDownBtn?: boolean;
} = {}) {
  document.body.innerHTML = '';

  const nav = document.createElement('div');
  nav.setAttribute('data-gallery-nav', '');

  if (hasDots) {
    const dotsContainer = document.createElement('div');
    dotsContainer.className = 'gallery-nav__dots';
    nav.appendChild(dotsContainer);
  }

  if (hasUpBtn) {
    const up = document.createElement('button');
    up.setAttribute('data-dir', 'up');
    nav.appendChild(up);
  }

  if (hasDownBtn) {
    const down = document.createElement('button');
    down.setAttribute('data-dir', 'down');
    nav.appendChild(down);
  }

  document.body.appendChild(nav);

  const stops: HTMLElement[] = [];
  for (let i = 0; i < stopCount; i++) {
    const el = document.createElement('div');
    el.className = 'project-hero';
    el.scrollIntoView = vi.fn();
    // Stagger stops vertically. window.innerHeight=0 in happy-dom → viewMid=0,
    // so stop[0] (top=0, center=200) is always nearest unless overridden.
    Object.defineProperty(el, 'getBoundingClientRect', {
      value: () => ({
        top: i * 600,
        height: 400,
        bottom: i * 600 + 400,
        left: 0,
        right: 800,
        width: 800,
      }),
      configurable: true,
    });
    document.body.appendChild(el);
    stops.push(el);
  }

  return { nav, stops };
}

// ─── No nav element ───────────────────────────────────────────────────────────

describe('initGalleryNav — no nav element', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('returns without throwing when no [data-gallery-nav] exists', () => {
    document.body.innerHTML = '';
    expect(() => initGalleryNav()).not.toThrow();
  });
});

// ─── Fewer than 2 stops ───────────────────────────────────────────────────────

describe('initGalleryNav — fewer than 2 stops', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('hides the nav when stopCount < 2', () => {
    const { nav } = buildDOM({ stopCount: 1 });
    initGalleryNav();
    expect(nav.style.display).toBe('none');
  });

  it('hides the nav when stopCount === 0', () => {
    const { nav } = buildDOM({ stopCount: 0 });
    initGalleryNav();
    expect(nav.style.display).toBe('none');
  });
});

// ─── Progress dots ────────────────────────────────────────────────────────────
// syncDots() is called synchronously on init — no performance.now involved.

describe('initGalleryNav — progress dots', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('creates one dot per stop', () => {
    buildDOM({ stopCount: 3 });
    initGalleryNav();
    const dots = document.querySelectorAll('.gallery-nav__dot');
    expect(dots.length).toBe(3);
  });

  it('sets correct aria-labels on dots', () => {
    buildDOM({ stopCount: 3 });
    initGalleryNav();
    const dots = document.querySelectorAll('.gallery-nav__dot');
    expect(dots[0].getAttribute('aria-label')).toBe('Go to item 1 of 3');
    expect(dots[2].getAttribute('aria-label')).toBe('Go to item 3 of 3');
  });

  it('sets data-active on the nearest stop dot after init', () => {
    buildDOM({ stopCount: 3 });
    // viewMid=0 → stop[0] center=200 is nearest
    initGalleryNav();
    const dots = document.querySelectorAll('.gallery-nav__dot');
    expect(dots[0].hasAttribute('data-active')).toBe(true);
    expect(dots[1].hasAttribute('data-active')).toBe(false);
    expect(dots[2].hasAttribute('data-active')).toBe(false);
  });

  it('does not throw when dots container is absent', () => {
    buildDOM({ stopCount: 3, hasDots: false });
    expect(() => initGalleryNav()).not.toThrow();
  });
});

// ─── Dot click ────────────────────────────────────────────────────────────────
// Dot clicks call scrollToStop() directly — no step(), no cooldown.

describe('initGalleryNav — dot click', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('calls scrollIntoView on the clicked stop', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    const dots = document.querySelectorAll<HTMLButtonElement>('.gallery-nav__dot');
    dots[1].click();
    expect(stops[1].scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  });

  it('calls scrollIntoView on last dot click', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    const dots = document.querySelectorAll<HTMLButtonElement>('.gallery-nav__dot');
    dots[2].click();
    expect(stops[2].scrollIntoView).toHaveBeenCalled();
  });
});

// ─── Arrow button clicks ──────────────────────────────────────────────────────
// These go through step() which has a cooldown check.
// Stub performance.now() to 1000 so 1000-0 >= COOLDOWN_MS(600).

describe('initGalleryNav — arrow button clicks', () => {
  beforeEach(() => { vi.spyOn(performance, 'now').mockReturnValue(1000); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('down button click scrolls to next stop', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    const downBtn = document.querySelector<HTMLButtonElement>('[data-dir="down"]')!;
    downBtn.click();
    // getLeadIndex()=0 → step(1) → scrollToStop(1)
    expect(stops[1].scrollIntoView).toHaveBeenCalled();
  });

  it('up button click at first stop clamps to stop 0', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    const upBtn = document.querySelector<HTMLButtonElement>('[data-dir="up"]')!;
    upBtn.click();
    // getLeadIndex()=0 → step(-1) → scrollToStop(-1) → clamped to 0
    expect(stops[0].scrollIntoView).toHaveBeenCalled();
  });

  it('works without up/down buttons present', () => {
    buildDOM({ stopCount: 3, hasUpBtn: false, hasDownBtn: false });
    expect(() => initGalleryNav()).not.toThrow();
  });
});

// ─── Keyboard navigation ──────────────────────────────────────────────────────

describe('initGalleryNav — keyboard navigation', () => {
  beforeEach(() => { vi.spyOn(performance, 'now').mockReturnValue(1000); });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('ArrowDown scrolls forward', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(stops[1].scrollIntoView).toHaveBeenCalled();
  });

  it('ArrowUp at first stop clamps to stop 0', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(stops[0].scrollIntoView).toHaveBeenCalled();
  });

  it('PageDown scrolls forward', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
    expect(stops[1].scrollIntoView).toHaveBeenCalled();
  });

  it('PageUp at first stop clamps to stop 0', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));
    expect(stops[0].scrollIntoView).toHaveBeenCalled();
  });

  it('Space scrolls forward', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(stops[1].scrollIntoView).toHaveBeenCalled();
  });

  it('unrelated key does nothing', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    stops.forEach((s) => expect(s.scrollIntoView).not.toHaveBeenCalled());
  });

  it('keydown on input element is ignored', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    stops.forEach((s) => expect(s.scrollIntoView).not.toHaveBeenCalled());
  });

  it('keydown on textarea element is ignored', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    stops.forEach((s) => expect(s.scrollIntoView).not.toHaveBeenCalled());
  });

  it('keydown on contentEditable element is ignored', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    div.focus();
    div.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    stops.forEach((s) => expect(s.scrollIntoView).not.toHaveBeenCalled());
  });
});

// ─── data-pressed on buttons ──────────────────────────────────────────────────
// data-pressed is set after step() returns, regardless of cooldown outcome.

describe('initGalleryNav — data-pressed on buttons', () => {
  afterEach(() => { document.body.innerHTML = ''; });

  it('sets data-pressed on down button for ArrowDown, clears on keyup', () => {
    buildDOM({ stopCount: 3 });
    initGalleryNav();
    const downBtn = document.querySelector<HTMLButtonElement>('[data-dir="down"]')!;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(downBtn.hasAttribute('data-pressed')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }));
    expect(downBtn.hasAttribute('data-pressed')).toBe(false);
  });

  it('sets data-pressed on up button for ArrowUp, clears on keyup', () => {
    buildDOM({ stopCount: 3 });
    initGalleryNav();
    const upBtn = document.querySelector<HTMLButtonElement>('[data-dir="up"]')!;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(upBtn.hasAttribute('data-pressed')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowUp', bubbles: true }));
    expect(upBtn.hasAttribute('data-pressed')).toBe(false);
  });

  it('clears down button on PageDown keyup', () => {
    buildDOM({ stopCount: 3 });
    initGalleryNav();
    const downBtn = document.querySelector<HTMLButtonElement>('[data-dir="down"]')!;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
    expect(downBtn.hasAttribute('data-pressed')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'PageDown', bubbles: true }));
    expect(downBtn.hasAttribute('data-pressed')).toBe(false);
  });

  it('clears up button on PageUp keyup', () => {
    buildDOM({ stopCount: 3 });
    initGalleryNav();
    const upBtn = document.querySelector<HTMLButtonElement>('[data-dir="up"]')!;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));
    expect(upBtn.hasAttribute('data-pressed')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'PageUp', bubbles: true }));
    expect(upBtn.hasAttribute('data-pressed')).toBe(false);
  });

  it('clears down button on Space keyup', () => {
    buildDOM({ stopCount: 3 });
    initGalleryNav();
    const downBtn = document.querySelector<HTMLButtonElement>('[data-dir="down"]')!;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(downBtn.hasAttribute('data-pressed')).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    expect(downBtn.hasAttribute('data-pressed')).toBe(false);
  });
});

// ─── Cooldown ─────────────────────────────────────────────────────────────────
// Use a controllable performance.now() mock. Start at 1000 so the first call
// passes the cooldown (1000 - 0 = 1000 >= COOLDOWN_MS=600).

describe('initGalleryNav — cooldown', () => {
  let now = 1000;

  beforeEach(() => {
    now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
  });
  afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; });

  it('suppresses a second keydown within 600ms', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    // First press: now=1000, lastScrollAt=0 → 1000>=600 → allowed
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(stops[1].scrollIntoView).toHaveBeenCalledTimes(1);
    // Second press 300ms later → 1300-1000=300 < 600 → blocked
    now = 1300;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(stops[1].scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('allows a second keydown after 600ms cooldown', () => {
    const { stops } = buildDOM({ stopCount: 3 });
    initGalleryNav();
    // First press: allowed, lastScrollAt = 1000
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(stops[1].scrollIntoView).toHaveBeenCalledTimes(1);
    // 700ms later → 1700-1000=700 >= 600 → allowed
    now = 1700;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    // getLeadIndex() still returns 0 (scrollIntoView is a no-op in happy-dom)
    expect(stops[1].scrollIntoView).toHaveBeenCalledTimes(2);
  });
});

// ─── Scroll sync (rAF) ────────────────────────────────────────────────────────
// Use vi.stubGlobal to replace requestAnimationFrame at the global level so
// keyboard-nav.ts's bare `requestAnimationFrame(...)` call is intercepted.

describe('initGalleryNav — scroll sync', () => {
  const rafQueue: FrameRequestCallback[] = [];

  beforeEach(() => {
    rafQueue.length = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });

  function flushRaf() {
    const cbs = [...rafQueue];
    rafQueue.length = 0;
    cbs.forEach((cb) => cb(0));
  }

  it('scroll event schedules a rAF callback', () => {
    buildDOM({ stopCount: 3 });
    initGalleryNav();
    window.dispatchEvent(new Event('scroll'));
    expect(rafQueue.length).toBeGreaterThan(0);
  });

  it('second scroll before rAF fires is debounced', () => {
    buildDOM({ stopCount: 3 });
    initGalleryNav();
    window.dispatchEvent(new Event('scroll'));
    const afterFirst = rafQueue.length;
    window.dispatchEvent(new Event('scroll')); // rafPending=true → no new rAF
    expect(rafQueue.length).toBe(afterFirst);
  });

  it('rAF callback updates data-active to the nearest stop', () => {
    buildDOM({ stopCount: 3 });
    initGalleryNav();

    // Position stop[1]'s center exactly at viewMid regardless of innerHeight,
    // and put others far away so getLeadIndex() returns 1.
    const viewMid = window.innerHeight / 2;
    const stopEls = Array.from(document.querySelectorAll<HTMLElement>('.project-hero'));
    stopEls.forEach((el, i) => {
      const top = i === 1 ? viewMid - 200 : viewMid + 2000 * (i + 1);
      Object.defineProperty(el, 'getBoundingClientRect', {
        value: () => ({ top, height: 400, bottom: top + 400, left: 0, right: 800, width: 800 }),
        configurable: true,
      });
    });

    window.dispatchEvent(new Event('scroll'));
    flushRaf();

    const dots = document.querySelectorAll('.gallery-nav__dot');
    expect(dots[1].hasAttribute('data-active')).toBe(true);
    expect(dots[0].hasAttribute('data-active')).toBe(false);
  });
});
