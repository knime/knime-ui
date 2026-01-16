import { type App } from "vue";

import { matomoAdapter } from "./matomo-adapter";
import type { AnalyticsConfig, AnalyticsService } from "./types";

const noop = (...args: any[]) => {
  if (import.meta.env.DEV) {
    consola.trace("Analytics::DEV", ...args);
  }
};

const noopService: AnalyticsService = {
  track: noop,
};

let __analyticsService: AnalyticsService = noopService;

export const createAnalyticsService = async (
  app: App,
  config: AnalyticsConfig,
): Promise<void> => {
  // dummy async in case it's needed later
  await new Promise((r) => setTimeout(r, 0));

  matomoAdapter.init(app, config);

  __analyticsService = {
    track: matomoAdapter.track,
  };
};

export const useAnalyticsService = () => ({ track: __analyticsService.track });
