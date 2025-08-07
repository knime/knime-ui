import { toValue } from "vue";
import { type MaybeRefOrGetter, computed } from "vue";
import type { TextStyle } from "pixi.js";

import { measureText } from "../util/measureText";
import { nodeLabelText, nodeNameText } from "../util/textStyles";

type UseTextShorteningOptions = {
  text: MaybeRefOrGetter<string>;
  maxLines: number;
  styles: TextStyle | Partial<TextStyle>;
};

export const useTextShortening = (options: UseTextShorteningOptions) => {
  const rawMetrics = computed(() =>
    measureText(toValue(options.text), options.styles),
  );

  // manual ellipsis in pixi
  const shortenedText = computed(() => {
    if (rawMetrics.value.lines.length > options.maxLines) {
      let result: string = "";
      for (let i = 0; i < options.maxLines; i++) {
        const line = rawMetrics.value.lines[i];
        if (i === options.maxLines - 1) {
          // eslint-disable-next-line no-magic-numbers
          const withoutLast2Characters = line.slice(0, -2);
          result += `${withoutLast2Characters}…`;
        } else {
          result += `${line}\n`;
        }
      }
      return result;
    }
    return toValue(options.text);
  });

  // measure the shortened text again if we did shorten it
  const metrics = computed(() => {
    if (toValue(options.text) === shortenedText.value) {
      return rawMetrics.value;
    }
    return measureText(shortenedText.value, options.styles);
  });

  return { metrics, shortenedText };
};

export const useNodeNameShortening = (text: MaybeRefOrGetter<string>) => {
  return useTextShortening({
    text,
    maxLines: nodeNameText.maxLines,
    styles: nodeNameText.styles,
  });
};

export const useNodeLabelShortening = (text: MaybeRefOrGetter<string>) => {
  return useTextShortening({
    text,
    maxLines: nodeLabelText.maxLines,
    styles: nodeLabelText.styles,
  });
};
