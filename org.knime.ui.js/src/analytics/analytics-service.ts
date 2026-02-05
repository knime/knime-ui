import { embeddingSDK } from "@knime/hub-features";

import { canvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";

import type { AnalyticsService, TrackFn } from "./types";

const noop = (...args: any[]) => {
  if (import.meta.env.DEV) {
    consola.trace("Analytics::DEV", ...args);
  }
};

const noopService: AnalyticsService = { track: noop };

let __analyticsService: AnalyticsService = noopService;

const track: TrackFn = (eventCategory, eventData) => {
  if (canvasRendererUtils.isSVGRenderer()) {
    return;
  }

  const { via, ...otherData } = eventData;

  embeddingSDK.guest.dispatchGenericEventToHost({
    kind: "analytics",
    payload: {
      category: eventCategory,
      name: via,
      data: otherData,
    },
  });
};

export const setupAnalyticsService = () => {
  __analyticsService = { track };
};

export const useAnalyticsService = () => ({ track: __analyticsService.track });
