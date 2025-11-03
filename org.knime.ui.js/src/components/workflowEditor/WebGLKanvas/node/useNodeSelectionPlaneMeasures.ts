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
      nodeSelectionPadding: [_top, right, bottom, left],
    } = $shapes;

    // override top for webgl as it is different with the name measurements
    const top = $shapes.webGlNodeSelectionPaddingTop;

    const extraHeight = toValue(options.extraHeight);
    const baseWidth = toValue(options.width);

    const hasStatusBar = !toValue(options.isMetanode);
    // the selection plane's height has to account for
    // (1) node's size plus the selection padding for top and bottom
    // (2) the height and margin of the node status bar if it's present
    // (3) the provided `extraHeight` prop on the component
    const height =
      top +
      nodeSize +
      bottom +
      (hasStatusBar ? nodeStatusHeight + nodeStatusMarginTop : 0) +
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
