(() => {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const beanLayer = document.querySelector("#bean-layer");
  const scene = document.querySelector(".stockroom-scene");
  if (!beanLayer || motionPreference.matches) return;

  for (let index = 0; index < 16; index++) {
    const bean = document.createElement("span");
    bean.className = "coffee-bean";
    bean.style.setProperty("--bean-left", `${(index * 67 + 13) % 100}%`);
    bean.style.setProperty("--bean-delay", `${-(index * 2.8)}s`);
    bean.style.setProperty("--bean-duration", `${25 + (index % 7) * 3}s`);
    bean.style.setProperty("--bean-size", `${8 + (index % 4) * 2}px`);
    beanLayer.append(bean);
  }

  let framePending = false;
  window.addEventListener("pointermove", (event) => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(() => {
      const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
      const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
      if (scene) scene.style.transform = `translate(${-x * 18}px, ${-y * 18}px) scale(1.035)`;
      const surface = event.target.closest?.(".glass-surface, .tool-panel, .ingredient-row");
      if (surface) {
        const rect = surface.getBoundingClientRect();
        surface.style.setProperty("--glow-x", `${event.clientX - rect.left}px`);
        surface.style.setProperty("--glow-y", `${event.clientY - rect.top}px`);
      }
      framePending = false;
    });
  }, { passive: true });

  motionPreference.addEventListener?.("change", (event) => {
    if (event.matches) {
      beanLayer.replaceChildren();
      if (scene) scene.style.transform = "none";
    }
  });
})();
