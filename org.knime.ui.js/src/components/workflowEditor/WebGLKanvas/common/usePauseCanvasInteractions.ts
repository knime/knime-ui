import { computed, onMounted, onUnmounted } from "vue";

import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";

/**
 * When used in a component, this composable will pause canvas interactions when
 * the components gets mounted, and restore them on unmount
 */
export const usePauseCanvasInteractions = () => {
  const canvasStore = useWebGLCanvasStore();
  const pixiApplication = computed(() => canvasStore.pixiApplication!.app);

  onMounted(() => {
    pixiApplication.value.stage.eventMode = "none";
  });

  onUnmounted(() => {
    pixiApplication.value.stage.eventMode = "passive";
  });
};
