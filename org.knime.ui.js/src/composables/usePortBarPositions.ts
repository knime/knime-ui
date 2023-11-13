import { metaNodeBarWidth } from "@/style/shapes.mjs";
import { computed } from "vue";
import { useStore } from "./useStore";

export const usePortBarPositions = () => {
  const store = useStore();
  const workflow = computed(() => store.state.workflow.activeWorkflow);
  const calculatedBounds = computed(
    () => store.state.workflow.calculatedMetanodePortBarBounds,
  );

  const getPorts = (isOutgoing: boolean) => {
    return isOutgoing
      ? workflow.value.metaOutPorts.ports
      : workflow.value.metaInPorts.ports;
  };

  const getBounds = (isOutgoing: boolean) => {
    return isOutgoing
      ? {
          ...(workflow.value.metaOutPorts.bounds || {}),
          ...calculatedBounds.value.out,
          ...{ width: metaNodeBarWidth },
        }
      : {
          ...(workflow.value.metaInPorts.bounds || {}),
          ...calculatedBounds.value.in,
          ...{ width: metaNodeBarWidth },
        };
  };

  const portBarXPos = (isOutgoing: boolean) => {
    const bounds = getBounds(isOutgoing);
    return bounds.x;
  };

  const portBarYPos = (isOutgoing: boolean) => {
    const bounds = getBounds(isOutgoing);
    return bounds.y;
  };

  const portBarHeight = (isOutgoing: boolean) => {
    const bounds = getBounds(isOutgoing);
    return bounds.height;
  };

  const portBarWidth = (isOutgoing: boolean) => {
    const bounds = getBounds(isOutgoing);
    return bounds.width;
  };

  const getPortBarPortYPosition = (
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
    portBarWidth,
    portBarHeight,
    portBarYPos,
    portBarXPos,
    getBounds,
    getPortBarPortYPosition,
  };
};
