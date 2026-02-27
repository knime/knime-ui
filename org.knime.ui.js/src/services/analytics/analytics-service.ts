/* eslint-disable no-undefined */
import { snakeCase } from "lodash-es";

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

const objectKeysToSnakeCase = (object: Record<string, unknown>) =>
  Object.entries(object).reduce((acc, [k, v]) => {
    acc[snakeCase(k)] = v;
    return acc;
  }, {});

const track: TrackFn = (eventId, ...eventData) => {
  if (canvasRendererUtils.isSVGRenderer()) {
    return;
  }

  if (!__context) {
    consola.error("Analytics Service:: Invalid state, context was not set");
  }

  const uniqueEventId = window.crypto.randomUUID();

  const data = (() => {
    if (eventData.length === 0) {
      return undefined;
    }

    return objectKeysToSnakeCase(eventData.at(0) ?? {});
  })();

  embeddingSDK.guest.dispatchGenericEventToHost({
    kind: "analytics",
    payload: {
      id: `editor_${eventId}`,
      data: {
        ...data,
        // eslint-disable-next-line camelcase
        job_id: __context.jobId,
        // eslint-disable-next-line camelcase
        event_id: uniqueEventId,
        timestamp: new Date().toISOString(),
      },
    },
  });
};

export const setupAnalyticsService = (context: Context) => {
  __analyticsService = { track };
  __context = context;
};

export const useAnalytics = () => ({ track: __analyticsService.track });
