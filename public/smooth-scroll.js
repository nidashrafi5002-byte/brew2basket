(() => {
  if (!window.Lenis) {
    console.warn("Lenis did not load; native scrolling remains enabled.");
    return;
  }

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
  });

  let frameId;

  function raf(time) {
    lenis.raf(time);
    frameId = requestAnimationFrame(raf);
  }

  frameId = requestAnimationFrame(raf);

  // Keep native scrolling behavior inside form controls.
  document.querySelectorAll("textarea, select, input").forEach((element) => {
    element.addEventListener("focus", () => lenis.stop());
    element.addEventListener("blur", () => lenis.start());
  });

  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(frameId);
    lenis.destroy();
  }, { once: true });
})();