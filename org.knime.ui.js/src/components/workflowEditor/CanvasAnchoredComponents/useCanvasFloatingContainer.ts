import { onBeforeUnmount, onMounted, watch } from "vue";
import { type MaybeElementRef, onKeyDown } from "@vueuse/core";
import { storeToRefs } from "pinia";

import type { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useMovingStore } from "@/store/workflow/moving";
import { useCanvasRendererUtils } from "../util/canvasRenderer";

/**
 * Common properties of a FloatingMenu implementation, regardless of which
 * canvas it's used in
 */
export type FloatingContainerProperties = {
  /**
   * When set to true will disable interactions on the workflow canvas when the menu is open
   */
  disableInteractions?: boolean;

  /**
   * Whether to enable the behavior that closes the menu by pressing the escape key. `true` by default
   */
  closeOnEscape?: boolean;

  /**
   * Keep focus inside of the FloatingMenu while it is open
   */
  focusTrap?: boolean;
};

type WebGlCanvasStore = ReturnType<typeof useWebGLCanvasStore>;
type SVGCanvasStore = ReturnType<typeof useSVGCanvasStore>;

type UseCanvasFloatingContainerOptions = {
  rootEl: MaybeElementRef<HTMLElement | undefined>;
  closeMenu: () => void;
  disableInteractions?: boolean;
  closeOnEscape?: boolean;
  canvasStore?: WebGlCanvasStore | SVGCanvasStore;
};

export const useCanvasFloatingContainer = (
  options: UseCanvasFloatingContainerOptions,
) => {
  const {
    closeMenu,
    disableInteractions = false,
    closeOnEscape = true,
    canvasStore,
  } = options;

  const { isDragging: isDraggingNodeInCanvas } = storeToRefs(useMovingStore());
  const { isDraggingNodeTemplate } = storeToRefs(useNodeTemplatesStore());

  watch(isDraggingNodeInCanvas, () => {
    if (isDraggingNodeInCanvas.value) {
      closeMenu();
    }
  });

  watch(
    isDraggingNodeTemplate,
    () => {
      if (isDraggingNodeTemplate.value) {
        closeMenu();
      }
    },
    { immediate: true },
  );

  onMounted(() => {
    if (disableInteractions && canvasStore) {
      if (useCanvasRendererUtils().isSVGRenderer.value) {
        (canvasStore as SVGCanvasStore).setInteractionsEnabled(false);
      } else {
        (canvasStore as WebGlCanvasStore).setInteractionsEnabled("none");
      }
    }
  });

  if (closeOnEscape) {
    onKeyDown(
      "Escape",
      () => {
        closeMenu();
      },
      { target: options.rootEl },
    );
  }

  onBeforeUnmount(() => {
    if (canvasStore) {
      if (useCanvasRendererUtils().isSVGRenderer.value) {
        (canvasStore as SVGCanvasStore).setInteractionsEnabled(true);
      } else {
        (canvasStore as WebGlCanvasStore).setInteractionsEnabled("all");
      }
    }
  });
};
