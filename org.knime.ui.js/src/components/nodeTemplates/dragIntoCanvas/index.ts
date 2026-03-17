import { useDragSource } from "./dragSource";
import { useDropTarget } from "./dropTarget";

export { KNIME_MIME } from "./constants";

export const useDragNodeIntoCanvas = {
  dragSource: useDragSource,
  dropTarget: useDropTarget,
};
