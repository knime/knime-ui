type AnalyticEvents = {
  /**
   * node creation
   */
  "node_created::noderepo_dragdrop_": {
    nodeId: string;
    nodeType: string;
    nodeFactoryId: string;
  };
  "node_created::noderepo_doubleclick_": {
    nodeId: string;
    nodeType: string;
    nodeFactoryId: string;
  };
  "node_created::explorer_dragdrop_": {
    nodeId: string;
    nodeType: string;
    nodeFactoryId: string;
  };
  "node_created::quickactionmenu_click_": {
    nodeId: string;
    nodeType: string;
    nodeFactoryId: string;
  };
  /**
   * quick action menu
   */
  "qam_opened::port_dragdrop_fwd": {
    nodeId: string;
    nodeType: string;
    nodePortIndex: number;
    connectionType: string;
  };
  "qam_opened::port_dragdrop_bwd": {
    nodeId: string;
    nodeType: string;
    nodePortIndex: number;
    connectionType: string;
  };
  "qam_opened::keyboard_shortcut_": {
    nodeId?: string;
    nodeType?: string;
    nodePortIndex?: number;
    connectionType?: string;
  };
  "qam_opened::canvas_doubleclick_": never;
  "qam_opened::canvas_ctxmenu_quickaddnode": never;
  /**
   * Workflow saving
   */
  "workflow_saved::wftoolbar_button_save": {
    currentSyncState: string;
    isAutoSyncEnabled: boolean;
  };
  "workflow_saved::keyboard_shortcut_savewf": {
    currentSyncState: string;
    isAutoSyncEnabled: boolean;
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
