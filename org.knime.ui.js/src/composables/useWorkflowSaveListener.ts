import { onMounted, onUnmounted } from "vue";
import { useEventBus } from "@vueuse/core";

/**
 * A composable that listens for workflow save events and executes a callback.
 * @param handler - Function to execute when a workflow is saved
 */
export const onWorkflowSaved = (handler: () => void | Promise<void>) => {
  const savedBus = useEventBus("workflow-saved");

  onMounted(() => {
    savedBus.on(handler);
  });

  onUnmounted(() => {
    savedBus.off(handler);
  });
};
