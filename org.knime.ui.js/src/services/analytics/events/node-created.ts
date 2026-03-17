type NativeNodePayload = {
  nodeFactoryId: string;
  nodeHubId?: never;
};

type ComponentNodePayload = {
  nodeHubId: string;
  nodeFactoryId?: never;
};

type NodeOrComponentData = NativeNodePayload | ComponentNodePayload;

export type NodeCreationEvents = {
  "node_created::noderepo_dragdrop_": {
    nodeType: string;
  } & NodeOrComponentData;

  "node_created::noderepo_doubleclick_": {
    nodeType: string;
    connectedTo?: {
      nodeType: string;
      nodeFactoryId: string;
    };
  } & NodeOrComponentData;

  "node_created::noderepo_keyboard_enter": {
    nodeType: string;
    connectedTo?: {
      nodeType: string;
      nodeFactoryId: string;
    };
  } & NodeOrComponentData;

  "node_created::explorer_dragdrop_": {
    nodeType: string;
  } & NodeOrComponentData;

  "node_created::qam_click_": {
    nodeType: string;
    connectedTo?: {
      nodeType: string;
      nodeFactoryId: string;
      nodePortIndex: number;
      nodePortId: string;
    };
  } & NodeOrComponentData;

  "node_created::qam_keyboard_enter": {
    nodeType: string;
    connectedTo?: {
      nodeType: string;
      nodeFactoryId: string;
      nodePortIndex: number;
      nodePortId: string;
    };
  } & NodeOrComponentData;

  "node_created::kaiqa_dragdrop_": {
    nodeType: string;
  } & NodeOrComponentData;

  "node_created::kaiqa_keyboard_enter": {
    nodeType: string;
  } & NodeOrComponentData;
};
