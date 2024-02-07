import { computed } from "vue";

import { useStore } from "@/composables/useStore";

import { gridSize } from "@/style/shapes.mjs";

export const useArrowKeyMoving = () => {
  const store = useStore();
  const isDragging = computed(() => store.state.workflow.isDragging);
  const isWritable = computed(() => store.getters["workflow/isWritable"]);

  const handleMovement = (event: KeyboardEvent) => {
    if (!isWritable.value) {
      return;
    }

    store.commit("workflow/setTooltip", null);

    const deltaY = {
      ArrowUp: -gridSize.y,
      ArrowDown: gridSize.y,
    }[event.key];

    const deltaX = {
      ArrowLeft: -gridSize.x,
      ArrowRight: gridSize.x,
    }[event.key];

    if (!isDragging.value) {
      store.commit("workflow/setIsDragging", true);
    }

    const { x = 0, y = 0 } = store.state.workflow.movePreviewDelta;

    store.commit("workflow/setMovePreview", {
      deltaX: (deltaX ?? 0) + x,
      deltaY: (deltaY ?? 0) + y,
    });

    const doMove = async (event: KeyboardEvent) => {
      if (["Control", "Shift"].includes(event.key)) {
        await store.dispatch("workflow/moveObjects");
        window.removeEventListener("keyup", doMove);
      }
    };
    window.addEventListener("keyup", doMove);
  };

  return { handleMovement };
};
