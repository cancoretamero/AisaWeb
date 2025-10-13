const parallaxLayers = Array.from(document.querySelectorAll('.parallax-layer'));
const gradientLayer = document.querySelector('.gradient-layer');

const layers = parallaxLayers
  .filter(layer => layer !== gradientLayer)
  .map(layer => ({
    element: layer,
    mouseXFactor: Number(layer.dataset.mouseX) || 0,
    mouseYFactor: Number(layer.dataset.mouseY) || 0,
    scrollFactor: Number(layer.dataset.scroll) || 0
  }));

let currentMouseX = 0;
let currentMouseY = 0;
let targetMouseX = 0;
let targetMouseY = 0;

let currentScroll = window.scrollY;
let targetScroll = window.scrollY;

let rafId = null;
let viewportHeight = window.innerHeight;

function getScrollableHeight() {
  return document.documentElement.scrollHeight - window.innerHeight;
}

function updateTargetsFromMouse(event) {
  const normalizedX = (event.clientX / window.innerWidth) * 2 - 1;
  const normalizedY = (event.clientY / window.innerHeight) * 2 - 1;

  targetMouseX = normalizedX;
  targetMouseY = normalizedY;
  requestTick();
}

function updateTargetsFromScroll() {
  targetScroll = window.scrollY;
  requestTick();
}

function requestTick() {
  if (rafId === null) {
    rafId = requestAnimationFrame(animate);
  }
}

function animate() {
  const easing = 0.08;

  currentMouseX += (targetMouseX - currentMouseX) * easing;
  currentMouseY += (targetMouseY - currentMouseY) * easing;
  currentScroll += (targetScroll - currentScroll) * easing;

  const scrollableHeight = getScrollableHeight();
  const scrollProgress = scrollableHeight > 0 ? currentScroll / scrollableHeight : 0;

  layers.forEach((layer, index) => {
    const depthIndex = index + 1;
    const translateX = currentMouseX * layer.mouseXFactor;
    const scrollOffset = currentScroll * layer.scrollFactor;
    const translateY = currentMouseY * layer.mouseYFactor - scrollOffset;
    const scale = 1.15 + depthIndex * 0.02;

    layer.element.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
  });

  if (gradientLayer) {
    const fadeStart = 0.55;
    const fadeEnd = 0.97;
    let fadeProgress = (scrollProgress - fadeStart) / (fadeEnd - fadeStart);
    fadeProgress = Math.min(1, Math.max(0, fadeProgress));

    const translateRange = viewportHeight * 0.6;
    const translateY = translateRange * (1 - fadeProgress);

    gradientLayer.style.opacity = fadeProgress;
    gradientLayer.style.transform = `translate3d(0, ${translateY}px, 0)`;
  }

  rafId = requestAnimationFrame(animate);
}

window.addEventListener('mousemove', updateTargetsFromMouse, { passive: true });
window.addEventListener('scroll', updateTargetsFromScroll, { passive: true });
window.addEventListener('resize', () => {
  viewportHeight = window.innerHeight;
  requestTick();
}, { passive: true });

requestTick();

