import { onMounted, onUnmounted } from "vue";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

/**
 * When used in a component, this composable will pause canvas interactions when
 * the components gets mounted, and restore them on unmount
 */
export const usePauseCanvasInteractions = () => {
  const canvasStore = useWebGLCanvasStore();

  onMounted(() => {
    canvasStore.setInteractionsEnabled("none");
  });

  onUnmounted(() => {
    canvasStore.setInteractionsEnabled("all");
  });
};
