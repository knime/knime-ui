import { embeddingSDK } from "@knime/hub-features";
import {
  type CreateEventFn,
  analyticsEvents,
} from "@knime/hub-features/analytics";

import { canvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";

const noop = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    consola.trace("Analytics::DEV", ...args);
  }
};

let __trackFn: CreateEventFn<void> = noop;

export const setupAnalyticsService = (
  ...context: Parameters<typeof analyticsEvents.eventBuilder>
) => {
  const { newEvent } = analyticsEvents.eventBuilder(...context);

  __trackFn = (...args) => {
    if (canvasRendererUtils.isSVGRenderer()) {
      return;
    }

    const event = newEvent(...args);

    embeddingSDK.guest.dispatchGenericEventToHost({
      kind: "analytics",
      payload: event,
    });
  };
};

export const useAnalytics = () => ({ track: __trackFn });
