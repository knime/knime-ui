import { computed } from "vue";

import { metaNodeBarWidth, defaultMetaNodeBarHeight } from "@/style/shapes.mjs";
import { useStore } from "./useStore";

export const usePortBarPositions = () => {
  const store = useStore();
  // do not update the bounds reactively as this makes the port bars moving around in some cases
  const workflowBounds = { value: store.getters["workflow/workflowBounds"] };
  const contentBounds = { value: store.getters["canvas/contentBounds"] };

  const workflow = computed(() => store.state.workflow.activeWorkflow);

  const getPorts = (isOutgoing: boolean) => {
    return isOutgoing
      ? workflow.value.metaOutPorts.ports
      : workflow.value.metaInPorts.ports;
  };

  const getBounds = (isOutgoing: boolean) => {
    return isOutgoing
      ? workflow.value.metaOutPorts.bounds
      : workflow.value.metaInPorts.bounds;
  };

  const portBarXPos = (isOutgoing: boolean) => {
    const bounds = getBounds(isOutgoing);

    if (!bounds?.x) {
      const offset = isOutgoing
        ? workflowBounds.value.right
        : workflowBounds.value.left;

      return offset + metaNodeBarWidth;
    }

    return bounds.x;
  };

  const portBarYPos = (isOutgoing: boolean) => {
    const bounds = getBounds(isOutgoing);

    return bounds?.y ?? contentBounds.value.top;
  };

  const portBarHeight = (isOutgoing: boolean) => {
    const bounds = getBounds(isOutgoing);
    return bounds?.height ?? defaultMetaNodeBarHeight;
  };

  const getPortbarPortYPosition = (
    index: number,
    isOutgoing: boolean,
    absolute: boolean,
  ) => {
    const ports = getPorts(isOutgoing);
    const height = portBarHeight(isOutgoing);

    const total = ports.length;
    return (
      (height * (index + 1)) / (total + 1) +
      (absolute ? portBarYPos(isOutgoing) : 0)
    );
  };

  return {
    portBarHeight,
    portBarYPos,
    portBarXPos,
    getPortbarPortYPosition,
  };
};
