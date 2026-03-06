type Payload = {
  fromNode: {
    nodeType: string;
    portIndex: number;
    portType: string;
    nodeFactoryId?: string;
  };

  toNode: {
    nodeType: string;
    portIndex: number;
    portType: string;
    nodeFactoryId?: string;
  };
};

export type ConnectionCreated = {
  "connection_created::port_dragdrop_fwd": Payload;
  "connection_created::port_dragdrop_bwd": Payload;
  "connection_created::keyboard_shortcut_connectnodes": never;
  "connection_created::keyboard_shortcut_connectflowvar": never;
  "connection_created::canvas_ctxmenu_connectnodes": never;
  "connection_created::canvas_ctxmenu_connectflowvar": never;
};
