import { onBeforeUnmount, onMounted } from "vue";
import { storeToRefs } from "pinia";

import { navigatorUtils } from "@knime/utils";

import { isUIExtensionFocused } from "@/components/uiExtensions";
import { useCanvasStore } from "@/store/canvas";
import { useMovingStore } from "@/store/workflow/moving";
import { isInputElement } from "@/util/isInputElement";

export const useCanvasMoveLocking = () => {
  const { isDragging } = storeToRefs(useMovingStore());
  const { setIsMoveLocked } = useCanvasStore();

  const onDownShiftOrControl = (event: KeyboardEvent) => {
    if (isInputElement(event.target as HTMLElement) || isUIExtensionFocused()) {
      return;
    }

    const metaOrCtrlKey = navigatorUtils.getMetaOrCtrlKey();

    if ((event.shiftKey || event[metaOrCtrlKey]) && !isDragging.value) {
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
