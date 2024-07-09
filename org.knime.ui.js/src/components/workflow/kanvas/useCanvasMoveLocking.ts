import { computed, onBeforeUnmount, onMounted } from "vue";
import { useStore } from "vuex";

import { navigatorUtils } from "@knime/utils";
import { isInputElement } from "@/util/isInputElement";
import { isUIExtensionFocused } from "@/components/uiExtensions";

export const useCanvasMoveLocking = () => {
  const store = useStore();
  const isDragging = computed(() => store.state.workflow.isDragging);

  const onDownShiftOrControl = (event: KeyboardEvent) => {
    if (isInputElement(event.target as HTMLElement) || isUIExtensionFocused()) {
      return;
    }

    const metaOrCtrlKey = navigatorUtils.getMetaOrCtrlKey();

    if ((event.shiftKey || event[metaOrCtrlKey]) && !isDragging.value) {
      store.commit("canvas/setIsMoveLocked", true);
    }
  };

  onMounted(() => {
    document.addEventListener("keydown", onDownShiftOrControl);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", onDownShiftOrControl);
  });
};
