import { computed, onBeforeUnmount, onMounted } from "vue";
import { useStore } from "vuex";

import { getMetaOrCtrlKey } from "webapps-common/util/navigator";
import { isInputElement } from "@/util/isInputElement";
import { isDynamicViewFocused } from "@/components/uiExtensions";

export const useCanvasMoveLocking = () => {
  const store = useStore();
  const isDragging = computed(() => store.state.workflow.isDragging);

  const onDownShiftOrControl = (event: KeyboardEvent) => {
    if (isInputElement(event.target as HTMLElement) || isDynamicViewFocused()) {
      return;
    }

    const metaOrCtrlKey = getMetaOrCtrlKey();

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
