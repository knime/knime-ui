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

type Context = { jobId: string };
let __context: Context;

const track: TrackFn = (eventId, ...eventData) => {
  if (canvasRendererUtils.isSVGRenderer()) {
    return;
  }

  if (!__context) {
    consola.error("Analytics Service:: Invalid state, context was not set");
  }

  const data = eventData.length === 0 ? undefined : eventData.at(0);

  embeddingSDK.guest.dispatchGenericEventToHost({
    kind: "analytics",
    payload: {
      id: eventId,
      data: { ...data, jobId: __context.jobId },
    },
  });
};

export const setupAnalyticsService = (context: Context) => {
  __analyticsService = { track };
  __context = context;
};

export const useAnalytics = () => ({ track: __analyticsService.track });
