import type { NodeCreationEvents } from "./events/node-created";
import type { QAMOpenedEvents } from "./events/qam-opened";

type AnalyticEvents = NodeCreationEvents &
  QAMOpenedEvents & {
    /**
     * Workflow saving
     */
    "workflow_saved::wftoolbar_button_save": {
      isAutosyncEnabled: boolean;
    };
    "workflow_saved::keyboard_shortcut_savewf": {
      isAutosyncEnabled: boolean;
    };
  };

export type AnalyticEventNames = keyof AnalyticEvents;

export type TrackFn = <K extends AnalyticEventNames>(
  type: K,
  ...args: AnalyticEvents[K] extends never ? [] : [payload: AnalyticEvents[K]]
) => void;

export interface AnalyticsService {
  track: TrackFn;
}
