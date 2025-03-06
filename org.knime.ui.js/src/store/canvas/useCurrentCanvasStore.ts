import { computed } from "vue";

import { useCanvasRendererUtils } from "@/components/workflowEditor/util/canvasRenderer";

import { useCanvasStore } from "./canvas-svg";
import { useWebGLCanvasStore } from "./canvas-webgl";

const { isSVGRenderer } = useCanvasRendererUtils();

export const useCurrentCanvasStore = (
  ...params: Parameters<typeof useCanvasStore>
) => {
  return computed(() =>
    isSVGRenderer.value
      ? useCanvasStore(...params)
      : useWebGLCanvasStore(...params),
  );
};
