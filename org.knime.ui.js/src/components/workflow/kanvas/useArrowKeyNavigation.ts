import { computed, onBeforeUnmount, onMounted } from "vue";
import throttle from "raf-throttle";

import { getMetaOrCtrlKey } from "webapps-common/util/navigator";

import { useStore } from "@/composables/useStore";

export const useArrowKeyNavigation = () => {
  const store = useStore();
  const isDragging = computed(() => store.state.workflow.isDragging);
  const isWritable = computed(() => store.getters["workflow/isWritable"]);

  const keyboardNavHandler = throttle((event: KeyboardEvent) => {
    const minDistance = 10;

    const deltaY = {
      ArrowUp: -minDistance,
      ArrowDown: minDistance,
    }[event.key];

    const deltaX = {
      ArrowLeft: -minDistance,
      ArrowRight: minDistance,
    }[event.key];

    const metaOrCtrlKey = getMetaOrCtrlKey();

    if (!event.shiftKey && !event[metaOrCtrlKey]) {
      return;
    }

    if (!isWritable.value) {
      return;
    }

    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight"
    ) {
      event.preventDefault();

      if (!isDragging.value) {
        store.commit("workflow/setIsDragging", true);
      }

      store.commit("workflow/setMovePreview", {
        deltaX: deltaX ?? 0,
        deltaY: deltaY ?? 0,
      });
      store.dispatch("workflow/moveObjects");
    }
  });

  onMounted(() => {
    document.addEventListener("keydown", keyboardNavHandler);
  });

  onBeforeUnmount(() => {
    document.removeEventListener("keydown", keyboardNavHandler);
  });
};
