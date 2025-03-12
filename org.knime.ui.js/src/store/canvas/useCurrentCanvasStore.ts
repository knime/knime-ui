import { computed } from "vue";

import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";

import { useSVGCanvasStore } from "./canvas-svg";
import { useWebGLCanvasStore } from "./canvas-webgl";

const { isSVGRenderer } = useCanvasRendererUtils();

export const useCurrentCanvasStore = (
  ...params: Parameters<typeof useSVGCanvasStore>
) => {
  return computed(() =>
    isSVGRenderer.value
      ? useSVGCanvasStore(...params)
      : useWebGLCanvasStore(...params),
  );
};
