import { computed } from "vue";

import { mergePortBarBounds } from "@/util/workflowUtil";

import { useStore } from "./useStore";

export const usePortBarPositions = () => {
  const store = useStore();
  const workflow = computed(() => store.state.workflow.activeWorkflow);
  const calculatedBounds = computed(
    () => store.state.workflow.calculatedMetanodePortBarBounds,
  );

  const getPorts = (isOutgoing: boolean) => {
    return isOutgoing
      ? workflow.value!.metaOutPorts?.ports
      : workflow.value!.metaInPorts?.ports;
  };

  const getBounds = (isOutgoing: boolean) => {
    return isOutgoing
      ? mergePortBarBounds(
          workflow.value!.metaOutPorts?.bounds || null,
          calculatedBounds.value.out!,
        )
      : mergePortBarBounds(
          workflow.value!.metaInPorts?.bounds || null,
          calculatedBounds.value.in!,
        );
  };

  const portBarXPos = (isOutgoing: boolean) => getBounds(isOutgoing).x;
  const portBarYPos = (isOutgoing: boolean) => getBounds(isOutgoing).y;
  const portBarHeight = (isOutgoing: boolean) => getBounds(isOutgoing).height;
  const portBarWidth = (isOutgoing: boolean) => getBounds(isOutgoing).width;

  const getPortBarPortYPosition = (
    index: number,
    isOutgoing: boolean,
    absolute: boolean,
  ) => {
    const ports = getPorts(isOutgoing);
    const height = portBarHeight(isOutgoing);

    const total = ports?.length ?? 0;
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
