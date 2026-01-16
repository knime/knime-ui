/* eslint-disable func-style */
import type { App } from "vue";
import { createGtm } from "@gtm-support/vue-gtm";

import {
  ANALYTIC_EVENT_CATEGORIES,
  type AnalyticEventNames,
  type AnalyticEvents,
  type AnalyticsConfig,
  type TrackFn,
} from "./types";

// Following types are taken from:
// https://github.com/SocialGouv/matomo-next/blob/master/src/types.ts

type HeatmapConfig = {
  /**
   * Enable/disable keystroke capture (default: false)
   * Since v3.2.0, keystrokes are disabled by default
   */
  captureKeystrokes?: boolean;

  /**
   * Enable/disable recording of mouse and touch movements (default: true)
   * Set to false to disable the "Move Heatmap" feature
   */
  recordMovements?: boolean;

  /**
   * Maximum capture time in seconds (default: 600 = 10 minutes)
   * Set to less than 29 minutes to avoid creating new visits
   */
  maxCaptureTime?: number;

  /**
   * Disable automatic detection of new page views (default: false)
   * Set to true if you track "virtual" page views for events/downloads
   */
  disableAutoDetectNewPageView?: boolean;

  /**
   * Custom trigger function to control when recording happens
   * Return true to record, false to skip
   * @param config - Configuration object with heatmap/session ID
   */
  trigger?: (config: { id?: number }) => boolean;

  /**
   * Manually add heatmap/session configuration
   * Use this to manually configure specific heatmaps or sessions
   */
  addConfig?: {
    heatmap?: { id: number };
    sessionRecording?: { id: number };
  };
};

/**
 * Custom Dimensions object that can be passed as the last argument of many tracking calls
 * (action-scoped dimensions).
 *
 * Examples:
 * - `["trackEvent", "Video", "Play", "Intro", 42, { dimension1: "Premium" }]`
 * - `["trackSiteSearch", "keyword", "category", 12, { dimension4: "Test" }]`
 * - `["trackPageView", "My title", { dimension7: "Value" }]`
 *
 * Note: keys are expected to be `"dimension1"`, `"dimension2"`, etc.
 * We intentionally keep this type compatible with older TS/ESLint parsers.
 */
type Dimensions = {
  dimension1?: string;
  dimension2?: string;
  dimension3?: string;
  dimension4?: string;
  dimension5?: string;
  dimension6?: string;
  dimension7?: string;
  dimension8?: string;
  dimension9?: string;
  dimension10?: string;
};

/**
 * A single value inside a Matomo command pushed to the queue.
 * Kept as a separate exported type for consumers that want to model custom commands.
 */
export type PushArg =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | readonly unknown[]
  | ((...args: any[]) => unknown);

/**
 * Strict Matomo `trackEvent` typing.
 *
 * Log an event with an event category (Videos, Music, Games...), an event action
 * (Play, Pause, Duration, Add Playlist, Downloaded, Clicked...), and an optional event name
 *
 * Notes:
 * - `name` and `value` are optional
 * - `value` (when present) must be numeric
 * - `value` requires `name` to be provided (no "hole" argument)
 */
type MatomoTrackEventCommand =
  | readonly ["trackEvent", string, string]
  | readonly ["trackEvent", string, string, Dimensions]
  | readonly ["trackEvent", string, string, string]
  | readonly ["trackEvent", string, string, string, Dimensions]
  | readonly ["trackEvent", string, string, string, number]
  | readonly ["trackEvent", string, string, string, number, Dimensions];

/**
 * Core commands used by this library (and/or documented in docs).
 * This list is intentionally limited: any unknown command is still allowed via `MatomoCustomCommand`.
 */
type MatomoCoreCommand =
  // Page view
  | readonly ["trackPageView"]
  | readonly ["trackPageView", string]
  | readonly ["trackPageView", Dimensions]
  | readonly ["trackPageView", string, Dimensions]
  // Standard setup / configuration
  | readonly ["enableLinkTracking"]
  | readonly ["disableCookies"]
  | readonly ["setTrackerUrl", string]
  | readonly ["setSiteId", string]
  | readonly ["setReferrerUrl", string]
  | readonly ["setCustomUrl", string]
  | readonly ["deleteCustomVariables", string]
  | readonly ["setDocumentTitle", string]
  // Site search (Matomo supports an optional dimensions object as last param)
  | readonly ["trackSiteSearch", string]
  | readonly ["trackSiteSearch", string, Dimensions]
  | readonly ["trackSiteSearch", string, string]
  | readonly ["trackSiteSearch", string, string, Dimensions]
  | readonly ["trackSiteSearch", string, string, number]
  | readonly ["trackSiteSearch", string, string, number, Dimensions]
  // Heartbeat
  | readonly ["enableHeartBeatTimer"]
  | readonly ["enableHeartBeatTimer", number]
  // Custom dimensions (global, persisted until changed)
  | readonly ["setCustomDimension", number, string]
  // Goals (Matomo supports an optional dimensions object as last param)
  | readonly ["trackGoal", number]
  | readonly ["trackGoal", number, Dimensions]
  | readonly ["trackGoal", number, number]
  | readonly ["trackGoal", number, number, Dimensions]
  // Links (Matomo supports an optional dimensions object as last param)
  | readonly ["trackLink", string, string]
  | readonly ["trackLink", string, string, Dimensions]
  // User
  | readonly ["setUserId", string];

/**
 * Heatmap & Session Recording plugin commands used by this library.
 */
type HeatmapSessionRecordingCommand =
  | readonly ["HeatmapSessionRecording::enableDebugMode"]
  | readonly ["HeatmapSessionRecording::disableCaptureKeystrokes"]
  | readonly ["HeatmapSessionRecording::disableRecordMovements"]
  | readonly ["HeatmapSessionRecording::setMaxCaptureTime", number]
  | readonly ["HeatmapSessionRecording::disableAutoDetectNewPageView"]
  | readonly [
      "HeatmapSessionRecording::setTrigger",
      NonNullable<HeatmapConfig["trigger"]>,
    ]
  | readonly [
      "HeatmapSessionRecording::addConfig",
      NonNullable<HeatmapConfig["addConfig"]>,
    ]
  | readonly ["HeatmapSessionRecording::enable"];

type MatomoKnownCommand =
  | MatomoTrackEventCommand
  | MatomoCoreCommand
  | HeatmapSessionRecordingCommand;

/**
 * Matomo also supports queueing functions executed once the tracker is ready.
 */
type MatomoCallbackCommand = readonly [(...args: any[]) => unknown];

export type PushArgs = MatomoKnownCommand | MatomoCallbackCommand;

function push(args: PushArgs): void {
  if (!(window as any)._paq) {
    (window as any)._paq = [];
  }

  (window as any)._paq.push(args);
}

type Mapper = {
  [K in AnalyticEventNames]: (payload: AnalyticEvents[K]) => void;
};

const mapper: Mapper = {
  "node.added": (payload) => {
    // TODO: the trackEvent only accepts a string for an event name. But the instrumentation
    // team needs more insights on this object. We need to figure out if they could work with a
    // stringified JSON
    push([
      "trackEvent",
      ANALYTIC_EVENT_CATEGORIES.Authoring,
      payload.via,
      "TODO:EVENT_DATA",
    ]);
  },
  "node.executed": (payload) => {
    // TODO: the trackEvent only accepts a string for an event name. But the instrumentation
    // team needs more insights on this object. We need to figure out if they could work with a
    // stringified JSON
    push([
      "trackEvent",
      ANALYTIC_EVENT_CATEGORIES.Execution,
      payload.via,
      "TODO:EVENT_DATA",
    ]);
  },
};

const track: TrackFn = (eventType, payload) => {
  mapper[eventType](payload);
};

const init = (app: App, config: AnalyticsConfig) => {
  // TODO: investigate
  /**
   * We use Matomo, but indirectly. Currently we fetch the analytics scripts
   * via google-tag-manager (gtm). However, the actual tracking tool used under the hood
   * is Matomo. We would need to check if the gtm integration can be used directly, but for this
   * impl, we just use gtm for init and then further tracking is made via the Matomo
   * global functions
   */

  const plugin = createGtm({ id: config.trackingAPIKey, defer: true });
  app.use(plugin);

  // eslint-disable-next-line no-magic-numbers
  push(["enableHeartBeatTimer", 30]);
};

export const matomoAdapter = { init, track };
