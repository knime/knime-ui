/* eslint-disable no-undefined */
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

const track: TrackFn = (eventId, ...eventData) => {
  if (canvasRendererUtils.isSVGRenderer()) {
    return;
  }

  const data = eventData.length === 0 ? undefined : eventData.at(0);

  embeddingSDK.guest.dispatchGenericEventToHost({
    kind: "analytics",
    payload: {
      id: eventId,
      data,
    },
  });
};

export const setupAnalyticsService = () => {
  __analyticsService = { track };
};

export const useAnalyticsService = () => ({ track: __analyticsService.track });
