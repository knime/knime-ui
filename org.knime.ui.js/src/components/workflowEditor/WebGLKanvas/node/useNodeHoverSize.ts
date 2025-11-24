import { type Ref, computed } from "vue";
import type { Graphics } from "pixi.js";

import { Node } from "@/api/gateway-api/generated-api";
import * as $shapes from "@/style/shapes";
import type { PortPositions } from "../../common/usePortPositions";

type UseNodeHoverSizeOptions = {
  isHovering: Ref<boolean>;
  portPositions: Ref<PortPositions>;
  nodeTopOffset: Ref<number>;
  dialogType: Node.DialogTypeEnum;
  isUsingEmbeddedDialogs: Ref<boolean>;
  allowedActions: Node["allowedActions"];
  isDebugModeEnabled?: Ref<boolean>;
};

export const useNodeHoverSize = (options: UseNodeHoverSizeOptions) => {
  const {
    isHovering,
    portPositions,
    nodeTopOffset,
    dialogType,
    isUsingEmbeddedDialogs,
    allowedActions,
  } = options;

  const portBarBottom = computed(() => {
    const lastInPort =
      portPositions.value.in[portPositions.value.in.length - 1];
    const lastOutPort =
      portPositions.value.out[portPositions.value.out.length - 1];

    // take y-position of last port in the list or default to 0 for an empty list
    const lastInPortY = lastInPort?.[1] || 0;
    const lastOutPortY = lastOutPort?.[1] || 0;

    return Math.max(lastInPortY, lastOutPortY) + $shapes.portSize / 2;
  });

  const hoverSize = computed(() => {
    const hoverBounds = {
      top: -($shapes.nodeHoverMargin[0] + $shapes.webGlNodeHoverAreaPadding),
      left: -($shapes.nodeHoverMargin[1] + $shapes.webGlNodeHoverAreaPadding),
      bottom: $shapes.nodeSize + $shapes.nodeHoverMargin[2],
      right:
        $shapes.nodeSize +
        $shapes.nodeHoverMargin[3] +
        $shapes.webGlNodeHoverAreaPadding,
    };

    // adjust upper hover bounds to node name
    hoverBounds.top -= nodeTopOffset.value;

    if (isHovering.value) {
      // buttons are shown as disabled if false, hidden if undefined
      let extraHorizontalSpace = 0;

      if (
        (dialogType === Node.DialogTypeEnum.Web &&
          isUsingEmbeddedDialogs.value) ||
        dialogType === Node.DialogTypeEnum.Swing
      ) {
        extraHorizontalSpace += $shapes.nodeActionBarButtonSpread;
      }

      if (allowedActions && "canOpenView" in allowedActions) {
        extraHorizontalSpace += $shapes.nodeActionBarButtonSpread;
      }

      hoverBounds.left -= extraHorizontalSpace / 2;
      hoverBounds.right += extraHorizontalSpace / 2;

      // enlarge hover area to include all ports
      const margin = $shapes.nodeHoverPortBottomMargin;
      // if portBarBottom + margin is larger, then extend hover bounds
      hoverBounds.bottom = Math.max(
        portBarBottom.value + margin,
        hoverBounds.bottom,
      );
    }

    return {
      x: hoverBounds.left,
      y: hoverBounds.top,
      width: hoverBounds.right - hoverBounds.left,
      height: hoverBounds.bottom - hoverBounds.top,
    };
  });

  const renderHoverArea = (graphics: Graphics) => {
    graphics.clear();

    graphics.rect(
      hoverSize.value.x,
      hoverSize.value.y,
      hoverSize.value.width,
      hoverSize.value.height,
    );

    if (options.isDebugModeEnabled?.value) {
      // eslint-disable-next-line no-magic-numbers
      graphics.fill(0xf1f1f1);
    }
  };

  return { hoverSize, renderHoverArea };
};
