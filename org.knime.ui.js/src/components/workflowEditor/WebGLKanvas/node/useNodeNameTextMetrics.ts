/* eslint-disable no-magic-numbers */
import { toValue } from "vue";
import { type MaybeRefOrGetter, computed } from "vue";

import { measureText } from "../util/measureText";
import { nodeNameText } from "../util/textStyles";

type UseNodeNameBoundsOptions = {
  nodeName: MaybeRefOrGetter<string>;
  shortenName: MaybeRefOrGetter<boolean>;
};

export const useNodeNameTextMetrics = (options: UseNodeNameBoundsOptions) => {
  const rawMetrics = computed(() =>
    measureText(toValue(options.nodeName), nodeNameText.styles),
  );

  // manual two line ellipsis in pixi
  const shortenedNodeName = computed(() => {
    if (toValue(options.shortenName) && rawMetrics.value.lines.length > 2) {
      const [line1, line2] = rawMetrics.value.lines;
      return [line1, " ", line2.slice(0, -2), "…"].join("");
    }
    return toValue(options.nodeName);
  });

  // measure the shortened text again if we did shorten it
  const metrics = computed(() => {
    if (options.nodeName === shortenedNodeName.value) {
      return rawMetrics.value;
    }
    return measureText(shortenedNodeName.value, nodeNameText.styles);
  });

  return { metrics, shortenedNodeName };
};
