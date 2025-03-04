import { type ShallowRef, computed, ref, watch } from "vue";
import { type AnimationPlaybackControls, animate } from "motion";

import {
  Node,
  type NodePort as NodePortType,
} from "@/api/gateway-api/generated-api";
import type { ContainerInst } from "@/vue3-pixi";

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

  let activeAnimation: AnimationPlaybackControls;
  watch(isVisible, () => {
    if (isVisible.value) {
      activeAnimation?.stop();
      activeAnimation = animate(0, 1, {
        duration: 0.5,
        onUpdate: (value) => {
          if (portContainer.value) {
            portContainer.value!.alpha = value;
          }
        },
      });
    } else {
      activeAnimation?.stop();
      activeAnimation = animate(1, 0, {
        duration: 0.5,
        onUpdate: (value) => {
          if (portContainer.value) {
            portContainer.value!.alpha = value;
          }
        },
      });
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
