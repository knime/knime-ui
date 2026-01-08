import { onBeforeUnmount, onMounted } from "vue";
import { storeToRefs } from "pinia";

import { getMetaOrCtrlKey } from "@knime/utils";

import { isUIExtensionFocused } from "@/components/uiExtensions";
import { useSVGCanvasStore } from "@/store/canvas/canvas-svg";
import { useMovingStore } from "@/store/workflow/moving";
import { isInputElement } from "@/util/dom";

export const useCanvasMoveLocking = () => {
  const { isDragging } = storeToRefs(useMovingStore());
  const { setIsMoveLocked } = useSVGCanvasStore();

  const onDownShiftOrControl = (event: KeyboardEvent) => {
    if (isInputElement(event.target as HTMLElement) || isUIExtensionFocused()) {
      return;
    }

    if ((event.shiftKey || event[getMetaOrCtrlKey()]) && !isDragging.value) {
      setIsMoveLocked(true);
    }
  };

  onMounted(() => {
    document.addEventListener("keydown", onDownShiftOrControl);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", onDownShiftOrControl);
  });
};
