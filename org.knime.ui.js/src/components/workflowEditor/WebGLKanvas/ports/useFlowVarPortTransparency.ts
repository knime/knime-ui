import { type ShallowRef, computed, ref } from "vue";

import {
  Node,
  type NodePort as NodePortType,
} from "@/api/gateway-api/generated-api";
import type { ContainerInst } from "@/vue3-pixi";
import { useAnimatePixiContainer } from "../common/useAnimatePixiContainer";
import { useNodeHoverListener } from "../common/useNodeHoverState";

type UseFlowVarPortTransparencyOptions = {
  nodeId: string;
  portContainer: ShallowRef<ContainerInst | null>;
  nodeKind: Node.KindEnum;
  port: NodePortType;
};

export const useFlowVarPortTransparency = (
  options: UseFlowVarPortTransparencyOptions,
) => {
  const { portContainer } = options;
  const isHovering = ref(false);

  // Transitions/animations cannot be applied at CSS level for canvas-rendered elements
  // therefore we need to take an imperative approach and do a tween animation instead.
  // For this, an initial alpha value is determined, but not made reactive; then further
  // visibility changes will be tracked in order to perform the tweens

  const initialAlpha =
    options.nodeKind === Node.KindEnum.Metanode ||
    options.port.connectedVia.length
      ? 1
      : // any port other than 0 will be alpha: 1
        Math.max(0, options.port.index > 0 ? 1 : 0);

  const isVisible = computed(() => {
    if (
      options.nodeKind === Node.KindEnum.Metanode ||
      options.port.connectedVia.length ||
      isHovering.value ||
      options.port.index >= 1
    ) {
      return true;
    }

    return false;
  });

  useAnimatePixiContainer<number>({
    initialValue: 0,
    targetValue: 1,
    targetDisplayObject: portContainer,
    changeTracker: isVisible,
    animationParams: { duration: 0.5 },
    onUpdate: (value) => {
      portContainer.value!.alpha = value;
    },
    animateOut: true,
  });

  useNodeHoverListener({
    nodeId: options.nodeId,
    onEnterCallback: () => {
      isHovering.value = true;
    },
    onLeaveCallback: () => {
      isHovering.value = false;
    },
  });

  return { initialAlpha };
};
