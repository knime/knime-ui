import { type MaybeRefOrGetter, computed, toValue } from "vue";

import * as $shapes from "@/style/shapes";

type UseNodeSelectionPlaneMeasuresOptions = {
  isMetanode: MaybeRefOrGetter<boolean>;
  extraHeight: MaybeRefOrGetter<number>;
  width: MaybeRefOrGetter<number>;
  cardHeight?: MaybeRefOrGetter<number>;
};

export const useNodeSelectionPlaneMeasures = (
  options: UseNodeSelectionPlaneMeasuresOptions,
) => {
  const nodeSelectionMeasures = computed(() => {
    const {
      nodeStatusHeight,
      nodeStatusMarginTop,
      nodeSize,
      nodeCardWidth,
      nodeCardHeight,
      nodeSelectionPadding: [_top, right, bottom, left],
    } = $shapes;

    // override top for webgl as it is different with the name measurements
    const top = $shapes.webGlNodeSelectionPaddingTop;

    const extraHeight = toValue(options.extraHeight);
    const baseWidth = toValue(options.width);
    const cardH = options.cardHeight ? toValue(options.cardHeight) : nodeCardHeight;

    const isMetanode = toValue(options.isMetanode);

    if (!isMetanode) {
      // Card nodes: wrap the card with small padding
      const pad = 4;
      const height = cardH + extraHeight + pad * 2;
      const minWidth = nodeCardWidth + pad * 2;
      const width = baseWidth > minWidth ? baseWidth : minWidth;
      return {
        y: -(extraHeight + pad),
        x: -pad,
        height,
        width,
      };
    }

    // Metanodes: keep original layout
    const height =
      top +
      nodeSize +
      bottom +
      nodeStatusHeight +
      nodeStatusMarginTop +
      extraHeight;

    const minWidth = left + right + nodeSize;
    const width = baseWidth > minWidth ? baseWidth : minWidth;

    return {
      y: -(top + extraHeight),
      x: -((width - nodeSize) / 2),
      height,
      width,
    };
  });

  return {
    nodeSelectionMeasures,
  };
};
