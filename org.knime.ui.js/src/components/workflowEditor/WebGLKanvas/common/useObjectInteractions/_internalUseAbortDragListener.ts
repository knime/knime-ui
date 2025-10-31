import { storeToRefs } from "pinia";

import { useMovingStore } from "@/store/workflow/moving";
import { markEscapeAsHandled } from "../../util/interaction";

/**
 * Sets up a one-time listener for aborting a drag operation. Once fired, will self-clean up.
 * Otherwise, the cleanup function *must* be run manually
 *
 * @returns A function to attach the listener. This function returns a cleanup callback
 */
export const useAbortDragListener = (options: { onAbort: () => void }) => {
  const movingStore = useMovingStore();
  const { isDragging, hasAbortedDrag } = storeToRefs(movingStore);

  const registerDragAbortListener = () => {
    const abort = (event: KeyboardEvent) => {
      if (isDragging.value && event.key === "Escape") {
        movingStore.abortDrag();
        markEscapeAsHandled(event, {
          initiator: "object-interaction::onEscape",
        });
        options.onAbort();
      }
    };

    const teardown = () => {
      if (hasAbortedDrag.value) {
        movingStore.resetAbortDrag();
      }

      window.removeEventListener("keydown", abort, { capture: true });
    };

    window.addEventListener("keydown", abort);

    return teardown;
  };

  return { registerDragAbortListener };
};
