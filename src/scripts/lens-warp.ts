const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const initLensWarp = () => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-warp-target]'));
  if (!targets.length) return;

  const displacement = document.getElementById('warp-displace') as SVGFEDisplacementMapElement | null;
  const stripes = document.getElementById('warp-stripes') as SVGFETurbulenceElement | null;
  const stripeOffset = document.getElementById('warp-stripe-offset') as SVGFEOffsetElement | null;
  const redOffset = document.getElementById('warp-red-offset') as SVGFEOffsetElement | null;
  const blueOffset = document.getElementById('warp-blue-offset') as SVGFEOffsetElement | null;
  if (!displacement || !stripes || !stripeOffset || !redOffset || !blueOffset) return;

  let lastY = window.scrollY;
  let velocity = 0;
  let intensity = 0;

  const step = () => {
    const currentY = window.scrollY;
    const delta = currentY - lastY;
    lastY = currentY;

    // Smooth the instantaneous scroll delta into a usable velocity signal (linger while moving, soften when stopped).
    const moving = Math.abs(delta) > 0.3;
    if (moving) {
      velocity = velocity * 0.93 + delta * 0.07; // linger while scrolling
      const targetIntensity = clamp(Math.abs(velocity) * 0.9, 0, 12);
      intensity = intensity * 0.88 + targetIntensity * 0.12;
    } else {
      velocity *= 0.4;
      intensity *= 0.4;
    }

    const displacementScaleBase = clamp(intensity * 0.45, 0, 4);

    // Keep flow very wide and vertical: ultra-low Y frequency, minimal change with speed
    const xFreq = clamp(0.04 + intensity * 0.0001, 0.04, 0.06);
    const yFreq = clamp(0.00025 + intensity * 0.00002, 0.00025, 0.0007);
    stripes.setAttribute('baseFrequency', `${xFreq.toFixed(2)} ${yFreq.toFixed(4)}`);

    // Chromatic aberration offsets (RGB split) with vertical smear
    const chromaBase = clamp(Math.abs(velocity) * 0.5, 0, 10);
    const dir = velocity >= 0 ? 1 : -1;
    redOffset.setAttribute('dx', (chromaBase * 0.08).toFixed(2));
    redOffset.setAttribute('dy', (-chromaBase * dir * 0.9).toFixed(2));
    blueOffset.setAttribute('dx', (-chromaBase * 0.08).toFixed(2));
    blueOffset.setAttribute('dy', (chromaBase * dir * 0.9).toFixed(2));

    // Begin merging channels before full stop to smooth snap-back.
    const speed = Math.abs(velocity);
    const snapStart = 20.0; // px/frame threshold to start easing back
    const snapFactor = clamp(1 - speed / snapStart, 0, 1); // 0 = fast, 1 = almost stopped

    const easedDisplacement = displacementScaleBase * (1 - 0.5 * snapFactor);
    displacement.setAttribute('scale', easedDisplacement.toFixed(2));

    const easedChroma = chromaBase * (1 - 0.7 * snapFactor);
    redOffset.setAttribute('dx', (easedChroma * 0.08).toFixed(2));
    redOffset.setAttribute('dy', (-easedChroma * dir * 0.9).toFixed(2));
    blueOffset.setAttribute('dx', (-easedChroma * 0.08).toFixed(2));
    blueOffset.setAttribute('dy', (easedChroma * dir * 0.9).toFixed(2));

    // Shift the stripe map vertically to smear in scroll direction; reduce shift near stop.
    const stripeShift = velocity * 0.18 * (1 - 0.4 * snapFactor);
    stripeOffset.setAttribute('dy', stripeShift.toFixed(2));

    requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

if (typeof window !== 'undefined') {
  const start = () => initLensWarp();
  if ((window as any).__lensWarpInitialized) {
    start();
  } else {
    (window as any).__lensWarpInitialized = true;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start, { once: true });
    } else {
      start();
    }
  }
}
