/* eslint-disable no-magic-numbers */

import { ref } from "vue";
import { watchThrottled } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const zoomToResolution = (zoomFactor: number) => {
  if (zoomFactor > 3.5) {
    return 5;
  } else if (zoomFactor > 1.5) {
    return 3;
  } else {
    return 1.25;
  }
};

export const useZoomAwareResolution = () => {
  const { zoomFactor, pixelRatio } = storeToRefs(useWebGLCanvasStore());

  const resolution = ref(1);

  // random time offset to not update all Text element at the same time
  const randomTimeOffset = getRandomInt(100, 500);
  const throttleMs = 600 + randomTimeOffset;

  watchThrottled(
    [zoomFactor, pixelRatio],
    ([zoomFactor, pixelRatio]) => {
      const targetResolution = round(zoomToResolution(zoomFactor) * pixelRatio);

      // only update if we have a change
      if (targetResolution !== resolution.value) {
        consola.debug(
          "useZoomAwareResolution: update resolution from ",
          resolution.value,
          "to",
          targetResolution,
        );
        if (targetResolution > resolution.value) {
          resolution.value = targetResolution;
        } else {
          resolution.value = targetResolution;
        }
      }
    },
    { immediate: true, throttle: throttleMs },
  );

  return {
    resolution,
  };
};
