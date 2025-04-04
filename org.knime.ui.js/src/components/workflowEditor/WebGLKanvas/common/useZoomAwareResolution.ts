/* eslint-disable no-magic-numbers */

import { computed } from "vue";
import { throttledRef } from "@vueuse/core";
import { storeToRefs } from "pinia";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

const round = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const useZoomAwareResolution = () => {
  const { zoomFactor, pixelRatio } = storeToRefs(useWebGLCanvasStore());
  const resolution = throttledRef(
    computed(() => {
      let resolution: number;
      if (zoomFactor.value > 3.5) {
        resolution = 5;
      } else if (zoomFactor.value > 2) {
        resolution = 3.5;
      } else if (zoomFactor.value > 1.5) {
        resolution = 2.5;
      } else if (zoomFactor.value > 0.3) {
        resolution = 1.5;
      } else {
        resolution = 1;
      }

      return round(resolution * pixelRatio.value);
    }),
    100,
  );

  return {
    resolution,
  };
};
