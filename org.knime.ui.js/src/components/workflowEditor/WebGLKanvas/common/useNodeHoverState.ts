import { onUnmounted, ref, useId, watch } from "vue";

const hoveredNodeId = ref<string | null>(null);

type NodeId = "*" | Omit<string, "*">;
type Callback = (nodeId: string) => void;
const callbackRegistry = new Map<
  NodeId,
  Map<string, { onEnter?: Callback; onLeave?: Callback }>
>();

/**
 * Composable to be used *only* by the controller of the node state hover, who sets
 * up the listeners for enter and leave; aka the Node component instance
 */
export const useNodeHoverProvider = () => {
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

watch(hoveredNodeId, (nextId, prevId) => {
  if (prevId && prevId !== nextId) {
    const wildcardCallbacks = callbackRegistry.get("*");
    wildcardCallbacks?.forEach(({ onLeave }) => onLeave?.(prevId));

    const leaveCallbacks = callbackRegistry.get(prevId);
    leaveCallbacks?.forEach(({ onLeave }) => onLeave?.(prevId));
  }

  if (nextId) {
    const wildcardCallbacks = callbackRegistry.get("*");
    wildcardCallbacks?.forEach(({ onEnter }) => onEnter?.(nextId));

    const enterCallbacks = callbackRegistry.get(nextId);
    enterCallbacks?.forEach(({ onEnter }) => onEnter?.(nextId));
  }
});

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
export const useNodeHoverListener = (options: UseNodeHoveredStateListener) => {
  const listenerId = useId();

  if (!callbackRegistry.has(options.nodeId)) {
    callbackRegistry.set(options.nodeId, new Map());
  }

  if (callbackRegistry.has(options.nodeId)) {
    const current = callbackRegistry.get(options.nodeId)!;
    current.set(listenerId, {
      onEnter: options.onEnterCallback,
      onLeave: options.onLeaveCallback,
    });
  }

  onUnmounted(() => {
    const current = callbackRegistry.get(options.nodeId);

    if (!current) {
      consola.warn("Tried to clear hover callbacks but it's empty already");
      return;
    }

    current.delete(listenerId);
    if (current.size === 0) {
      callbackRegistry.delete(options.nodeId);
    }
  });
};
