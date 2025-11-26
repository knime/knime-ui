import { type ShallowRef, computed, ref } from "vue";
import { storeToRefs } from "pinia";

import {
  Node,
  type NodePort as NodePortType,
} from "@/api/gateway-api/generated-api";
import { useMovingStore } from "@/store/workflow/moving";
import { useNodeInteractionsStore } from "@/store/workflow/nodeInteractions";
import type { ContainerInst } from "@/vue3-pixi";
import { useNodeHoverListener } from "../common/useNodeHoverState";

type UsePortTransparencyOptions = {
  nodeId: string;
  portContainer: ShallowRef<ContainerInst | null>;
  nodeKind: Node.KindEnum;
  port: NodePortType;
};

export const usePortTransparency = (options: UsePortTransparencyOptions) => {
  const { portContainer } = options;
  const isParentNodeHovered = ref(false);
  const { nameEditorNodeId } = storeToRefs(useNodeInteractionsStore());
  const { isDragging } = storeToRefs(useMovingStore());

  // metanodes don't have default flow variable ports, so if their first port (index 0)
  // is a flow variable one that's still not considered a default one, which all the other
  // nodes have
  const isDefaultFlowVariablePort = computed(() => {
    if (options.nodeKind === Node.KindEnum.Metanode) {
      return false;
    }

    return options.port.index === 0;
  });

  const isConnected = computed(() => options.port.connectedVia.length > 0);

  // Transitions/animations cannot be applied at CSS level for canvas-rendered elements
  // therefore we need to take an imperative approach and do a tween animation instead.
  // For this, an initial alpha value is determined, but not made reactive; then further
  // visibility changes will be tracked in order to perform the tweens
  const initialAlpha =
    !isDefaultFlowVariablePort.value || isConnected.value
      ? 1
      : // any port other than 0 will have `alpha: 1`
        Math.max(0, options.port.index > 0 ? 1 : 0);

  const isVisible = computed(() => {
    if (!isDefaultFlowVariablePort.value || isConnected.value) {
      return true;
    }

    if (nameEditorNodeId.value === options.nodeId) {
      return false;
    }

    if (isParentNodeHovered.value && !isDragging.value) {
      return true;
    }

    return false;
  });

  // useAnimatePixiContainer<number>({
  //   initialValue: 0,
  //   targetValue: 1,
  //   targetDisplayObject: portContainer,
  //   changeTracker: isVisible,
  //   animationParams: { duration: 0.5 },
  //   onUpdate: (value) => {
  //     portContainer.value!.alpha = value;
  //   },
  //   animateOut: true,
  // });

  useNodeHoverListener({
    nodeId: options.nodeId,
    onEnterCallback: () => {
      isParentNodeHovered.value = true;
    },
    onLeaveCallback: () => {
      isParentNodeHovered.value = false;
    },
  });

  return { initialAlpha };
};
