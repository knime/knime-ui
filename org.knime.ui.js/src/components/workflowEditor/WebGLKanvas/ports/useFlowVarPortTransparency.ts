import { type ShallowRef, computed, ref, watch } from "vue";
import { gsap } from "gsap";
import type { ContainerInst } from "@/vue3-pixi";

import {
  Node,
  type NodePort as NodePortType,
} from "@/api/gateway-api/generated-api";

type UseFlowVarPortTransparencyOptions = {
  portContainer: ShallowRef<ContainerInst | undefined>;
  nodeKind: Node.KindEnum;
  port: NodePortType;
};

export const useFlowVarPortTransparency = (
  options: UseFlowVarPortTransparencyOptions,
) => {
  const { portContainer } = options;
  const isHovering = ref(false);

  // Transitions/animations cannot be applied at CSS level for canvas-rendered elements
  // therefore we need to take an imperative approach and animate using gsap instead.
  // For this, an initial alpha value is determined, but not made reactive; then further
  // visibility changes will be tracked in order to perform the gsap tweens

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

  watch(isVisible, () => {
    if (isVisible.value) {
      gsap.to(portContainer.value!, { alpha: 1, duration: 0.5 });
    } else {
      gsap.to(portContainer.value!, { alpha: 0, duration: 0.5, delay: 0.25 });
    }
  });

  const onPointerEnter = () => {
    isHovering.value = true;
  };

  const onPointerLeave = () => {
    isHovering.value = false;
  };

  return { initialAlpha, onPointerEnter, onPointerLeave };
};
