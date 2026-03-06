import { type MaybeRefOrGetter, computed, toValue } from "vue";

import * as $shapes from "@/style/shapes";

type UseNodeSelectionPlaneMeasuresOptions = {
  isMetanode: MaybeRefOrGetter<boolean>;
  extraHeight: MaybeRefOrGetter<number>;
  width: MaybeRefOrGetter<number>;
};

export const useNodeSelectionPlaneMeasures = (
  options: UseNodeSelectionPlaneMeasuresOptions,
) => {
  const nodeSelectionMeasures = computed(() => {
    const {
      nodeStatusHeight,
      nodeStatusMarginTop,
      nodeSize,
      nodePillWidth,
      nodePillHeight,
      nodeSelectionPadding: [_top, right, bottom, left],
    } = $shapes;

    const isMetanode = toValue(options.isMetanode);

    // For pill nodes the name is inside the pill → no top extra-height above the shape
    const top = $shapes.webGlNodeSelectionPaddingTop;

    // Pill nodes: name is inside pill, so extraHeight only applies for metanodes
    const extraHeight = isMetanode ? toValue(options.extraHeight) : 0;
    const baseWidth = toValue(options.width);

    const hasStatusBar = !isMetanode;

    const torsoHeight = isMetanode ? nodeSize : nodePillHeight;
    const torsoWidth = isMetanode ? nodeSize : nodePillWidth;

    const height =
      top +
      torsoHeight +
      bottom +
      (hasStatusBar ? nodeStatusHeight + nodeStatusMarginTop : 0) +
      extraHeight;

    const minWidth = isMetanode ? left + right + nodeSize : torsoWidth;
    const width = baseWidth > minWidth ? baseWidth : minWidth;

    // For metanodes: x centers the selection plane around the 32px torso
    // For pill nodes: the pill starts at x=0, so selection plane starts at x=0 (or slight negative padding)
    const x = isMetanode ? -((width - torsoWidth) / 2) : -left;

    // For metanodes: y starts above the metanode text (legacy behaviour)
    // For pill nodes: y starts just above the pill with a small padding
    const y = isMetanode ? -(top + extraHeight) : -$shapes.webGlNodeHoverAreaPadding;

    return {
      y,
      x,
      height,
      width,
    };
  });

  return {
    nodeSelectionMeasures,
  };
};
