import type { LayoutEditorOpenedEvents } from "./events/layout-editor-opened";
import type { NodeCreationEvents } from "./events/node-created";
import type { QAMOpenedEvents } from "./events/qam-opened";
import type { SearchEvents } from "./events/search";
import type { UndoRedoEvents } from "./events/undo-redo";
import type { WorkflowSaved } from "./events/workflow-saved";

type AnalyticEvents = NodeCreationEvents &
  QAMOpenedEvents &
  LayoutEditorOpenedEvents &
  SearchEvents &
  WorkflowSaved &
  UndoRedoEvents;

export type AnalyticEventNames = keyof AnalyticEvents;

export type TrackFn = <K extends AnalyticEventNames>(
  type: K,
  ...args: AnalyticEvents[K] extends never ? [] : [payload: AnalyticEvents[K]]
) => void;

export interface AnalyticsService {
  track: TrackFn;
}
