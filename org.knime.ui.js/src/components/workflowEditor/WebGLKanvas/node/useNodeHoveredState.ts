import { ref, watch } from "vue";

const hoveredNodeId = ref<string | null>(null);

/**
 * Composable to be used *only* by the controller of the node state hover, who sets
 * up the listeners for enter and leave; aka the Node component instance
 */
export const useNodeHoveredStateProvider = () => {
  const onPointerEnter = (nodeId: string) => {
    if (hoveredNodeId.value !== nodeId) {
      consola.trace("Node hover [ENTER] :>> ", {
        next: nodeId,
        prev: hoveredNodeId.value,
      });
      hoveredNodeId.value = nodeId;
    }
  };

  const onPointerLeave = () => {
    if (hoveredNodeId.value !== null) {
      consola.trace("Node hover [LEAVE] :>> ", {
        next: null,
        prev: hoveredNodeId.value,
      });
      hoveredNodeId.value = null;
    }
  };

  return { onPointerEnter, onPointerLeave, hoveredNodeId };
};

type UseNodeHoveredStateListener = {
  /**
   * The id of the node to listen to.
   */
  nodeId: string;
  onEnterCallback?: (nodeId: string) => void;
  onLeaveCallback?: (nodeId: string) => void;
};

/**
 * Composable that allows to listen to a node's hover enter/leave state
 */
export const useNodeHoveredStateListener = (
  options: UseNodeHoveredStateListener,
) => {
  watch(hoveredNodeId, (nextId, prevId) => {
    if (nextId && nextId === options.nodeId) {
      options.onEnterCallback?.(nextId);
    }

    if (prevId && prevId !== nextId && prevId === options.nodeId) {
      options.onLeaveCallback?.(prevId);
    }
  });
};
