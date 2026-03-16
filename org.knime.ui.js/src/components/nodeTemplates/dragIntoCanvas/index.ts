import { useDragSource } from "./dragSource";
import { useDropTarget } from "./dropTarget";

export { KNIME_MIME } from "./constants";

export const useDragNodeIntoCanvas = {
  dragSource: useDragSource,
  dropTarget: useDropTarget,
};

export type Callbacks = {
  onNodeAdded: (
    data: { type: "node"; newNodeId: string } | { type: "component" },
  ) => void;
};
export type CallbackKeys = keyof Callbacks;
