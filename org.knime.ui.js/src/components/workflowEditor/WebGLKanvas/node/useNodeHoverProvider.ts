import { ref, watch } from "vue";
import type { FederatedPointerEvent } from "pixi.js";

const hoveredNodeId = ref<string | null>(null);

type UseNodeHoverProviderOptions = {
  listenerId?: string;
  onEnterCallback?: (nodeId: string) => void;
  onLeaveCallback?: (nodeId: string) => void;
};

export const useNodeHoverProvider = (
  options: UseNodeHoverProviderOptions = {},
) => {
  const onPointerEnter = (_event: FederatedPointerEvent, nodeId: string) => {
    if (hoveredNodeId.value !== nodeId) {
      hoveredNodeId.value = nodeId;
    }
  };

  const onPointerLeave = (_event: FederatedPointerEvent) => {
    if (hoveredNodeId.value !== null) {
      hoveredNodeId.value = null;
    }
  };

  watch(hoveredNodeId, (nextId, prevId) => {
    if (nextId && nextId === options.listenerId) {
      options.onEnterCallback?.(nextId);
    }

    if (prevId && prevId !== nextId && prevId === options.listenerId) {
      options.onLeaveCallback?.(prevId);
    }
  });

  return { hoveredNodeId, onPointerEnter, onPointerLeave };
};
