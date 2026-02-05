export type AnalyticEvents = {
  node_created: {
    via:
      | "noderepo_dragdrop_"
      | "noderepo_doubleclick_"
      | "explorer_dragdrop_"
      | "quickactionmenu_click_";
    nodeId: string;
    nodeType: string;
    nodeFactoryId: string;
  };

  quickactionmenu_opened: {
    via:
      | "port_dragdrop_fwd"
      | "port_dragdrop_bwd"
      | "keyboard_shortcut_"
      | "canvas_doubleclick_"
      | "canvas_ctxmenu_quickaddnode";
    nodeId?: string;
    nodeType?: string;
    nodePortIndex?: number;
    connectionType?: string;
  };
};

export type AnalyticEventNames = keyof AnalyticEvents;

export type TrackFn = <K extends AnalyticEventNames>(
  type: K,
  payload: AnalyticEvents[K],
) => void;

export interface AnalyticsService {
  track: TrackFn;
}
