type NativeNodePayload = {
  nodeFactoryId: string;
  componentId?: never;
};

type ComponentNodePayload = {
  componentId: string;
  nodeFactoryId?: never;
};

type NodeOrComponentData = NativeNodePayload | ComponentNodePayload;

export type NodeCreationEvents = {
  "node_created::noderepo_dragdrop_": {
    type: string;
  } & NodeOrComponentData;

  "node_created::noderepo_doubleclick_": {
    type: string;
    connectedTo?: {
      type: string;
      nodeFactoryId?: string;
    };
  } & NodeOrComponentData;

  "node_created::noderepo_keyboard_enter": {
    type: string;
    connectedTo?: {
      type: string;
      nodeFactoryId?: string;
    };
  } & NodeOrComponentData;

  "node_created::explorer_dragdrop_": {
    type: string;
  } & NodeOrComponentData;

  "node_created::qam_click_": {
    type: string;
    connectedTo?: {
      type: string;
      nodeFactoryId?: string;
    };
  } & NodeOrComponentData;

  "node_created::qam_keyboard_enter": {
    type: string;
    connectedTo?: {
      type: string;
      nodeFactoryId?: string;
    };
  } & NodeOrComponentData;

  "node_created::kaiqa_dragdrop_": {
    type: string;
  } & NodeOrComponentData;
};
