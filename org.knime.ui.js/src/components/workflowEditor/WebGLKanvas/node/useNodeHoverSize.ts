import { type Ref, computed } from "vue";

import { Node } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";

type UseNodeHoverSizeOptions = {
  isHovering: Ref<boolean>;
  nodeNameDimensions: Ref<{ width: number; height: number }>;
  dialogType: Node.DialogTypeEnum;
  isUsingEmbeddedDialogs: Ref<boolean>;
  allowedActions: NonNullable<Node["allowedActions"]>;
};

export const useNodeHoverSize = (options: UseNodeHoverSizeOptions) => {
  const {
    isHovering,
    nodeNameDimensions,
    dialogType,
    isUsingEmbeddedDialogs,
    allowedActions,
  } = options;

  const hoverSize = computed(() => {
    const hoverBounds = {
      top: -$shapes.nodeHoverMargin[0],
      left: -$shapes.nodeHoverMargin[1],
      bottom: $shapes.nodeSize + $shapes.nodeHoverMargin[2],
      right: $shapes.nodeSize + $shapes.nodeHoverMargin[3],
    };

    // adjust upper hover bounds to node name
    hoverBounds.top -= nodeNameDimensions.value.height;

    if (isHovering.value) {
      // buttons are shown as disabled if false, hidden if null
      let extraHorizontalSpace = 0;

      if (
        (dialogType === Node.DialogTypeEnum.Web &&
          isUsingEmbeddedDialogs.value) ||
        dialogType === Node.DialogTypeEnum.Swing
      ) {
        extraHorizontalSpace += $shapes.nodeActionBarButtonSpread;
      }

      if ("canOpenView" in allowedActions) {
        extraHorizontalSpace += $shapes.nodeActionBarButtonSpread;
      }

      hoverBounds.left -= extraHorizontalSpace / 2;
      hoverBounds.right += extraHorizontalSpace / 2;
    }

    // TODO: adjust hover area for connector hovering
    // if (this.isConnectorHovering || this.isHovering) {
    //   // enlarge hover area to include all ports

    //   const margin = this.$shapes.nodeHoverPortBottomMargin;

    //   // if portBarBottom + margin is larger, then extend hover bounds
    //   hoverBounds.bottom = Math.max(
    //     this.portBarBottom + margin,
    //     hoverBounds.bottom,
    //   );
    // }

    return {
      y: hoverBounds.top,
      x: hoverBounds.left,
      width: hoverBounds.right - hoverBounds.left,
      height: hoverBounds.bottom - hoverBounds.top,
    };
  });

  return { hoverSize };
};
