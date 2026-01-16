export type AnalyticEvents = {
  "node.added": {
    nodeId: string;
    nodeType: string;
    via:
      | "node-repository-drag"
      | "node-repository-dbl-click"
      | "clipboard"
      | "quick-action";
  };
  "node.executed": {
    nodeId: string;
    nodeType: string;
    via: "actionbar" | "shortcut" | "context-menu";
  };
  // ...TODO: more TBD
};

export const ANALYTIC_EVENT_CATEGORIES = {
  Authoring: "Authoring",
  Execution: "Execution",
  // ...TODO: more TBD
} as const;

export type AnalyticEventNames = keyof AnalyticEvents;

export type TrackFn = <K extends AnalyticEventNames>(
  type: K,
  payload: AnalyticEvents[K],
) => void;

export type AnalyticsConfig = {
  trackingAPIKey: string;
  context: {
    userId: string;
    sessionId: string;
    jobId: string;
  };
};

export interface AnalyticsService {
  track: TrackFn;
}
