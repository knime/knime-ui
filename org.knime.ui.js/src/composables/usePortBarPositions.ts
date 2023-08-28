import { computed } from "vue";

import { metaNodeBarWidth } from "@/style/shapes.mjs";
import type { MetaPorts } from "@/api/gateway-api/generated-api";
import { useStore } from "./useStore";

export const usePortBarPositions = () => {
  const store = useStore();
  const workflowBounds = computed(
    () => store.getters["workflow/workflowBounds"],
  );
  const contentBounds = computed(() => store.getters["canvas/contentBounds"]);

  const portBarHeight = computed(() => contentBounds.value.height);
  const portBarYPos = computed(() => contentBounds.value.top);

  /**
   * Get the horizontal position of a metanode's port bar from the store.
   * @param  ports as returned from the API
   * @param isOutgoing `true` if the `ports` input represents the input ports, `false` for the output ports.
   * @returns  The horizontal position
   */
  const portBarXPos = (ports: MetaPorts, isOutgoing: boolean) => {
    if (ports.xPos) {
      return ports.xPos;
    }

    if (isOutgoing) {
      return workflowBounds.value.right - metaNodeBarWidth;
    }

    return workflowBounds.value.left + metaNodeBarWidth;
  };

  /**
   * Get the vertical position one of a metanode's port items, either relative to the port bar, or absolute.
   * @param  index Index of the port
   * @param  ports List of ports
   * @param  absolute `true` for absolute coordinate, `false` for relative.
   * @returns  The vertical position
   */
  const portBarItemYPos = (index: number, ports: any[], absolute: boolean) => {
    const total = ports.length;
    return (
      (portBarHeight.value * (index + 1)) / (total + 1) +
      (absolute ? contentBounds.value.top : 0)
    );
  };

  return {
    portBarHeight,
    portBarYPos,
    portBarXPos,
    portBarItemYPos,
  };
};
