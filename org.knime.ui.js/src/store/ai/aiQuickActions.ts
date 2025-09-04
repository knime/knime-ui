import { defineStore } from "pinia";
import { ref } from "vue";

type ActionName = "generateAnnotation";
type ActionStatus = "ready" | "processing";

type ActionsState = Partial<Record<ActionName, ActionStatus>>;

export const useAiQuickActionsStore = defineStore("aiQuickActions", () => {
  const actionsState = ref<ActionsState>({});

  const ensureStateFor = (actionName: ActionName) => {
    if (!actionsState.value[actionName]) {
      actionsState.value[actionName] = "ready";
    }
  };

  const isActionProcessing = (actionName: ActionName) => {
    return actionsState.value[actionName] === "processing";
  };

  async function generateAnnotation() {
    const actionName: ActionName = "generateAnnotation";
    ensureStateFor(actionName);

    if (isActionProcessing(actionName)) {
      return;
    }

    // TODO: replace with actual API call
    actionsState.value[actionName] = "processing";
    await new Promise((resolve) => setTimeout(resolve, 2000));
    actionsState.value[actionName] = "ready";
  }

  return {
    // state tracking
    isActionProcessing,

    // executable Quick AI Actions
    generateAnnotation,
  };
});
