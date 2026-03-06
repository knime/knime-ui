type Payload = {
  type: string;
  nodePortIndex: number;
  connectionType: string;
  nodeFactoryId: string;
};

export type QAMOpenedEvents = {
  "qam_opened::port_dragdrop_fwd": Payload;
  "qam_opened::port_dragdrop_bwd": Payload;
  "qam_opened::canvas_doubleclick_": never;
  "qam_opened::keyboard_shortcut_": Partial<Payload>;
  "qam_opened::canvas_ctxmenu_quickaddnode": never;
};
