import type { ApplicationInst } from "vue3-pixi";

const init = (pixiApp: ApplicationInst) => {
  if (!import.meta.env.CANVAS_PERF_MODE) {
    return;
  }

  pixiApp.app.ticker.stop();
};

// TODO
const trackSingleRender = () => {};

export const performanceTracker = { init, trackSingleRender };
