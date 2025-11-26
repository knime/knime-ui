import type { Application } from "pixi.js";

const RUN_TIME_MS = 5000;

const isCanvasPerfMode = () =>
  window.localStorage.getItem("CANVAS_PERF_MODE") === "true";

const trackSingleRender = (pixiApp: Application) => {
  if (!isCanvasPerfMode()) {
    return;
  }

  performance.mark("knime:render:start");
  pixiApp.ticker.addOnce(() => {
    performance.mark("knime:render:stop");

    performance.measure(
      "knime:render:complete",
      "knime:render:start",
      "knime:render:stop",
    );
    performance.measure(
      "knime:app:ready",
      "knime:app:start",
      "knime:render:stop",
    );
  });

  pixiApp.ticker.add(() => {
    performance.measure("knime:ticker:elapsedMS", {
      start: performance.now() - pixiApp.ticker.elapsedMS,
      duration: pixiApp.ticker.elapsedMS,
    });
  });

  setTimeout(() => {
    document.body.setAttribute("data-first-render", "done");
  }, RUN_TIME_MS);

  pixiApp.ticker.start();
};

export const performanceTracker = { trackSingleRender, isCanvasPerfMode };
