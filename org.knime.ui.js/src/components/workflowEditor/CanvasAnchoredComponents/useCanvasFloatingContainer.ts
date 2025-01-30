import { type Ref, nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { type MaybeElementRef, onClickOutside } from "@vueuse/core";
import { useFocusTrap } from "@vueuse/integrations/useFocusTrap.mjs";
import { storeToRefs } from "pinia";

import { useEscapeStack } from "@/composables/useEscapeStack";
import type { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import type { useWebGLCanvasStore } from "@/store/canvas/canvas-webgl";
import { useNodeTemplatesStore } from "@/store/nodeTemplates/nodeTemplates";
import { useMovingStore } from "@/store/workflow/moving";

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

type UseClickaway = {
  rootEl: MaybeElementRef<HTMLElement | undefined>;
  focusTrap: Ref<boolean>;
  onClickaway: () => void;
};

const useClickaway = (options: UseClickaway) => {
  const { rootEl, focusTrap } = options;
  const { activate: activateFocusTrap, deactivate: deactivateFocusTrap } =
    useFocusTrap(rootEl);

  onMounted(async () => {
    // wait once after first event loop run before registering the click outside handler,
    // to avoid closing immediately after opening
    await new Promise((r) => setTimeout(r, 0));

    onClickOutside(rootEl, () => {
      deactivateFocusTrap();
      options.onClickaway();
    });

    if (focusTrap.value) {
      await nextTick();
      activateFocusTrap();
    }
  });

  onBeforeUnmount(() => {
    deactivateFocusTrap();
  });
};

type UseCanvasFloatingContainerOptions = {
  rootEl: MaybeElementRef<HTMLElement | undefined>;
  focusTrap: Ref<boolean>;
  closeMenu: () => void;
  disableInteractions?: boolean;
  closeOnEscape?: boolean;
  canvasStore?: ReturnType<
    typeof useSVGCanvasStore | typeof useWebGLCanvasStore
  >;
};

export const useCanvasFloatingContainer = (
  options: UseCanvasFloatingContainerOptions,
) => {
  const {
    rootEl,
    closeMenu,
    focusTrap,
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

  useClickaway({
    rootEl,
    focusTrap,
    onClickaway: closeMenu,
  });

  onMounted(() => {
    if (disableInteractions && canvasStore) {
      canvasStore.setInteractionsEnabled(false);
    }
  });

  if (closeOnEscape) {
    useEscapeStack({ onEscape: closeMenu });
  }

  onBeforeUnmount(() => {
    if (canvasStore) {
      canvasStore.setInteractionsEnabled(true);
    }
  });
};
