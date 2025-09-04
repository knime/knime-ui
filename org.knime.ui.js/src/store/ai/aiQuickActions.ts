import { defineStore } from "pinia";
import { ref } from "vue";
import { useAnnotationInteractionsStore } from "../workflow/annotationInteractions";
import { useSelectionStore } from "../selection";

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

  const updateStateFor = ({
    actionName,
    newState,
  }: {
    actionName: ActionName;
    newState: ActionStatus;
  }) => {
    actionsState.value[actionName] = newState;
  };

  const isActionProcessing = (actionName: ActionName) => {
    return actionsState.value[actionName] === "processing";
  };

  const generateAnnotation = async () => {
    const actionName: ActionName = "generateAnnotation";
    ensureStateFor(actionName);

    if (isActionProcessing(actionName)) {
      return;
    }

    updateStateFor({ actionName, newState: "processing" });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    updateStateFor({ actionName, newState: "ready" });

    const selection = useSelectionStore();
    const annotationInteractions = useAnnotationInteractionsStore();
    await annotationInteractions.addWorkflowAnnotation({
      bounds: selection.getBoundsAroundNodeSelection,
      content: "<h5>Placeholder heading</h5><p>Placeholder text</p>",
    });
  };

  return {
    // state tracking
    isActionProcessing,

    // executable Quick AI Actions
    generateAnnotation,
  };
});
